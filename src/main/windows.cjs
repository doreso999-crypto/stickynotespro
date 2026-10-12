const { BrowserWindow, dialog, screen } = require("electron");
const path = require("node:path");

class Windows {
  constructor(store, changed) {
    this.store = store;
    this.changed = changed;
    this.notes = new Map();
    this.dashboard = null;
  }

  create(options, query) {
    const win = new BrowserWindow({
      ...options,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "../preload/bridge.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event) => event.preventDefault());

    win.loadFile(
      path.join(
        __dirname,
        query.note ? "../renderer/note.html" : "../renderer/dashboard.html",
      ),
      { query },
    );

    win.once("ready-to-show", () => win.show());
    return win;
  }

  showDashboard() {
    if (!this.dashboard) {
      this.dashboard = this.create(
        {
          width: 1100,
          height: 760,
          minWidth: 640,
          minHeight: 480,
          title: "StickyNotesPro",
        },
        {},
      );

      this.dashboard.on("closed", () => {
        this.dashboard = null;
      });
    }

    this.dashboard.show();
    this.dashboard.focus();
  }

  open(id) {
    const note = this.store.get(id);
    if (note.archived) {
      throw new Error("Restore this note before opening it.");
    }

    const existingWindow = this.notes.get(id);
    if (existingWindow) {
      existingWindow.show();
      existingWindow.focus();
      return;
    }

    let bounds = note.bounds;
    const workArea = screen.getDisplayMatching({
      x: bounds.x ?? 0,
      y: bounds.y ?? 0,
      width: bounds.width,
      height: bounds.height,
    }).workArea;

    bounds = {
      width: Math.min(Math.max(260, bounds.width), workArea.width),
      height: Math.min(Math.max(200, bounds.height), workArea.height),
      x: Math.max(
        workArea.x,
        Math.min(bounds.x ?? workArea.x + 60, workArea.x + workArea.width - 260),
      ),
      y: Math.max(
        workArea.y,
        Math.min(bounds.y ?? workArea.y + 60, workArea.y + workArea.height - 200),
      ),
    };

    this.store.update(id, { visible: true });

    const win = this.create(
      {
        ...bounds,
        minWidth: 260,
        minHeight: 200,
        resizable: true,
        alwaysOnTop: note.pinned,
        title: note.title,
      },
      { note: id },
    );

    this.notes.set(id, win);

    let boundsTimer;
    const persistBounds = () => {
      clearTimeout(boundsTimer);

      try {
        this.store.update(id, { bounds: win.getBounds() });
      } catch (error) {
        dialog.showErrorBox("Could not save window position", error.message);
      }
    };

    for (const eventName of ["resize", "move"]) {
      win.on(eventName, () => {
        clearTimeout(boundsTimer);
        boundsTimer = setTimeout(persistBounds, 250);
      });
    }

    win.persistBounds = persistBounds;

    win.on("close", (event) => {
      event.preventDefault();
      this.hide(id).catch((error) => {
        dialog.showErrorBox("Could not hide note", error.message);
      });
    });

    win.on("closed", () => {
      clearTimeout(boundsTimer);
      this.notes.delete(id);
    });

    this.changed();
  }

  async close(id) {
    const win = this.notes.get(id);
    if (!win || win.isDestroyed()) return;

    await win.webContents.executeJavaScript(
      "window.flushNote ? window.flushNote() : Promise.resolve()",
    );

    if (win.isDestroyed()) return;

    win.persistBounds();
    win.destroy();
  }

  async hide(id, notify = true) {
    await this.close(id);
    this.store.update(id, { visible: false });
    if (notify) this.changed();
  }

  sync(id) {
    const note = this.store.get(id);
    const win = this.notes.get(id);

    if (!win) return;

    win.setAlwaysOnTop(note.pinned);
    win.setTitle(note.title);
  }
}

module.exports = { Windows };
