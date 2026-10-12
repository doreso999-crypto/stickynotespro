import { action, button, report } from "./app.js";
export async function renderNote(root, id) {
  document.body.classList.add("note-window");
  root.innerHTML = `<div class="note-toolbar"></div><label class="sr-only" for="title">Note title</label><input id="title" maxlength="200" placeholder="Note title"><label class="sr-only" for="body">Note content</label><textarea id="body" maxlength="1000000" placeholder="Make room for a thought…"></textarea><footer><span id="save-status" role="status">Saved</span><button id="dashboard">Dashboard ↗</button></footer>`;
  const title = root.querySelector("#title"),
    body = root.querySelector("#body"),
    status = root.querySelector("#save-status");
  let pending = Promise.resolve();
  let dirty = false;
  function save() {
    dirty = true;
    status.textContent = "Saving…";
    const patch = { title: title.value, body: body.value };
    pending = pending.catch(() => {}).then(() => action("update", id, patch));
    const current = pending;
    current
      .then(() => {
        if (current === pending) {
          dirty = false;
          status.textContent = "Saved";
        }
      })
      .catch(() => {
        status.textContent = "Save failed — edit to retry";
      });
  }
  title.addEventListener("input", save);
  body.addEventListener("input", save);
  // Prevent native window close from discarding a queued edit.
  window.addEventListener("beforeunload", (event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.flushNote = async () => {
    await pending;
    if (dirty) throw new Error("Note has unsaved changes");
  };
  const run = async (name) => {
    await pending;
    await action(name, id);
  };
  const toolbar = root.querySelector(".note-toolbar");
  const pin = button("Pinned", async () => {
    await pending;
    const n = (await window.notes.list()).find((n) => n.id === id);
    await action("update", id, { pinned: !n.pinned });
  });
  toolbar.append(
    button("+ New", () => action("create")),
    pin,
  );
  const menu = document.createElement("details"),
    summary = document.createElement("summary");
  summary.textContent = "More";
  const choices = document.createElement("div");
  choices.className = "note-menu";
  for (const [label, name] of [
    ["Duplicate", "duplicate"],
    ["Hide note", "hide"],
    ["Archive", "archive"],
    ["Delete permanently", "delete"],
  ])
    choices.append(
      button(label, () => run(name), name === "delete" ? "danger" : ""),
    );
  menu.append(summary, choices);
  toolbar.append(menu);
  root.querySelector("#dashboard").onclick = () =>
    action("dashboard").catch(report);
  async function refresh() {
    try {
      const n = (await window.notes.list()).find((n) => n.id === id);
      if (!n) return;
      if (!dirty) {
        title.value = n.title;
        body.value = n.body;
      }
      pin.textContent = n.pinned ? "● Pinned" : "○ Pin";
      pin.setAttribute("aria-pressed", String(n.pinned));
    } catch (error) {
      report(error);
    }
  }
  window.notes.onChanged(refresh);
  await refresh();
}
