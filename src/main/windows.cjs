const { BrowserWindow, screen } = require("electron");
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
    win.webContents.on("will-navigate", (e) => e.preventDefault());
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
    if (note.archived) throw new Error("Restore this note before opening it.");
    if (this.notes.has(id)) {
      this.notes.get(id).show();
      this.notes.get(id).focus();
      return;
    }
    let bounds = note.bounds;
    const area = screen.getDisplayMatching({
      x: bounds.x ?? 0,
      y: bounds.y ?? 0,
      width: bounds.width,
      height: bounds.height,
    }).workArea;
    bounds = {
      width: Math.min(Math.max(260, bounds.width), area.width),
      height: Math.min(Math.max(200, bounds.height), area.height),
      x: Math.max(
        area.x,
        Math.min(bounds.x ?? area.x + 60, area.x + area.width - 260),
      ),
      y: Math.max(
        area.y,
        Math.min(bounds.y ?? area.y + 60, area.y + area.height - 200),
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
    let timer;
    const persist = () => {
      clearTimeout(timer);
      try {
        this.store.update(id, { bounds: win.getBounds() });
      } catch (error) {
        require("electron").dialog.showErrorBox(
          "Could not save window position",
          error.message,
        );
      }
    };
    for (const event of ["resize", "move"])
      win.on(event, () => {
        clearTimeout(timer);
        timer = setTimeout(persist, 250);
      });
    win.on("close", (event) => {
      event.preventDefault();
      this.close(id).catch((error) =>
        require("electron").dialog.showErrorBox(
          "Could not close note",
          error.message,
        ),
      );
    });
    win.persistBounds = persist;
    win.on("closed", () => {
      clearTimeout(timer);
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
  sync(id) {
    const note = this.store.get(id),
      win = this.notes.get(id);
    if (win) {
      win.setAlwaysOnTop(note.pinned);
      win.setTitle(note.title);
    }
  }
}
module.exports = { Windows };
