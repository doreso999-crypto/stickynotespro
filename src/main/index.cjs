const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("node:path");
const { NoteStore } = require("./note-store.cjs");
const { Windows } = require("./windows.cjs");

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app
    .whenReady()
    .then(() => {
      let store;

      try {
        store = new NoteStore(path.join(app.getPath("userData"), "notes.json"));
      } catch (error) {
        dialog.showErrorBox("Unable to load notes", error.message);
        app.quit();
        return;
      }

      const changed = () => {
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send("notes:changed");
        });
      };

      const windows = new Windows(store, changed);

      function authorize(event) {
        const win = BrowserWindow.fromWebContents(event.sender);
        const isKnownWindow =
          win === windows.dashboard || [...windows.notes.values()].includes(win);

        if (!win || event.senderFrame !== event.sender.mainFrame || !isKnownWindow) {
          throw new Error("Unauthorized window");
        }
      }

      ipcMain.handle("notes:list", (event) => {
        authorize(event);
        return store.list();
      });

      ipcMain.handle("notes:action", async (event, action, id, patch) => {
        authorize(event);

        let result;

        switch (action) {
          case "create":
            result = store.create();
            windows.open(result.id);
            break;

          case "duplicate":
            result = store.create(store.get(id));
            windows.open(result.id);
            break;

          case "update":
            if (
              !patch ||
              Object.keys(patch).some(
                (key) => !["title", "body", "pinned"].includes(key),
              )
            ) {
              throw new Error("Invalid update");
            }

            result = store.update(id, patch);
            windows.sync(id);
            break;

          case "open":
            windows.open(id);
            break;

          case "hide":
            await windows.hide(id, false);
            break;

          case "archive":
            await windows.close(id);
            result = store.update(id, { archived: true, visible: false });
            break;

          case "restore":
            result = store.update(id, { archived: false });
            windows.open(id);
            break;

          case "delete": {
            const note = store.get(id);
            const { response } = await dialog.showMessageBox(
              BrowserWindow.fromWebContents(event.sender),
              {
                type: "warning",
                buttons: ["Cancel", "Delete permanently"],
                defaultId: 0,
                cancelId: 0,
                message: `Permanently delete “${note.title || "Untitled note"}”?`,
                detail: "This cannot be undone.",
              },
            );

            if (response === 1) {
              await windows.close(id);
              store.remove(id);
            }
            break;
          }

          case "dashboard":
            windows.showDashboard();
            break;

          default:
            throw new Error("Unknown action");
        }

        changed();
        return result;
      });

      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
          {
            label: "File",
            submenu: [
              {
                label: "New note",
                accelerator: "CmdOrCtrl+N",
                click: () => {
                  const note = store.create();
                  windows.open(note.id);
                },
              },
              {
                label: "Dashboard",
                accelerator: "CmdOrCtrl+Shift+D",
                click: () => windows.showDashboard(),
              },
              { role: "quit" },
            ],
          },
          { role: "editMenu" },
          { role: "viewMenu" },
        ]),
      );

      let quitting = false;

      app.on("before-quit", (event) => {
        if (quitting) return;

        event.preventDefault();

        Promise.all([...windows.notes.keys()].map((id) => windows.close(id)))
          .then(() => {
            quitting = true;
            app.quit();
          })
          .catch((error) => {
            dialog.showErrorBox("Could not save notes", error.message);
          });
      });

      windows.showDashboard();

      for (const note of store.list()) {
        if (!note.archived && note.visible) {
          windows.open(note.id);
        }
      }

      app.on("activate", () => windows.showDashboard());
      app.on("second-instance", () => windows.showDashboard());
    })
    .catch((error) => {
      dialog.showErrorBox("Startup failed", error.message);
      app.quit();
    });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
