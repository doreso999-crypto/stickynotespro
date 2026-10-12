const { contextBridge, ipcRenderer } = require("electron");
// Explicit bridge: the interface never receives filesystem or unrestricted IPC access.
contextBridge.exposeInMainWorld("notes", {
  list: () => ipcRenderer.invoke("notes:list"),
  action: (action, id, patch) =>
    ipcRenderer.invoke("notes:action", action, id, patch),
  onChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("notes:changed", listener);
    return () => ipcRenderer.removeListener("notes:changed", listener);
  },
});
