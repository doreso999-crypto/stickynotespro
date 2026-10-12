import { action, onClick, report } from "./shared.js";
export async function renderNote(root, id) {
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
  const pin = root.querySelector("#pin-note");
  onClick(pin, async () => {
    await pending;
    const n = (await window.notes.list()).find((n) => n.id === id);
    await action("update", id, { pinned: !n.pinned });
  });
  onClick(root.querySelector("#new-note"), () => action("create"));
  for (const control of root.querySelectorAll("[data-action]")) {
    onClick(control, () => run(control.dataset.action));
  }
  onClick(root.querySelector("#dashboard"), () => action("dashboard"));
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

const id = new URLSearchParams(location.search).get("note");
renderNote(document.querySelector("#app"), id).catch(report);
