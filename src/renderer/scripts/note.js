import {
  bindAsyncClick,
  performAction,
  showError,
} from "./shared.js";

const noteId = new URLSearchParams(window.location.search).get("note");
const root = document.querySelector("#note-app");
const titleInput = document.querySelector("#title");
const bodyInput = document.querySelector("#body");
const pinButton = document.querySelector("#pin-note");
const newNoteButton = document.querySelector("#new-note");
const dashboardButton = document.querySelector("#dashboard");

let currentNote = null;
let editVersion = 0;
let savedVersion = 0;
let saveTimer = null;
let saveChain = Promise.resolve();

function hasUnsavedChanges() {
  return savedVersion !== editVersion;
}

function updateSaveState(state) {
  root.dataset.saveState = state;
}

function scheduleSave() {
  editVersion += 1;
  updateSaveState("saving");

  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    enqueueSave();
  }, 300);
}

function enqueueSave() {
  window.clearTimeout(saveTimer);
  saveTimer = null;

  const targetVersion = editVersion;
  const patch = {
    title: titleInput.value,
    body: bodyInput.value,
  };

  saveChain = saveChain
    .catch(() => undefined)
    .then(() => performAction("update", noteId, patch));

  const currentSave = saveChain;

  currentSave
    .then(() => {
      savedVersion = Math.max(savedVersion, targetVersion);
      updateSaveState(hasUnsavedChanges() ? "saving" : "saved");
    })
    .catch(() => {
      updateSaveState("error");
    });

  return currentSave;
}

async function flushPendingSave() {
  if (saveTimer !== null) {
    enqueueSave();
  }

  await saveChain;

  if (hasUnsavedChanges()) {
    throw new Error("The note still has unsaved changes.");
  }
}

async function runNoteAction(actionName) {
  await flushPendingSave();
  await performAction(actionName, noteId);
}

async function refresh() {
  try {
    const latest = (await window.notes.list()).find((note) => note.id === noteId);
    if (!latest) return;

    currentNote = latest;
    root.dataset.pinned = String(latest.pinned);
    pinButton.setAttribute("aria-pressed", String(latest.pinned));
    document.title = latest.title.trim() || "Untitled note";

    if (!hasUnsavedChanges()) {
      titleInput.value = latest.title;
      bodyInput.value = latest.body;
      updateSaveState("saved");
    }
  } catch (error) {
    showError(error);
  }
}

titleInput.addEventListener("input", scheduleSave);
bodyInput.addEventListener("input", scheduleSave);

bindAsyncClick(pinButton, async () => {
  await flushPendingSave();
  if (!currentNote) return;

  await performAction("update", noteId, { pinned: !currentNote.pinned });
});

bindAsyncClick(newNoteButton, async () => {
  await flushPendingSave();
  await performAction("create");
});

for (const button of document.querySelectorAll("[data-action]")) {
  bindAsyncClick(button, () => runNoteAction(button.dataset.action));
}

bindAsyncClick(dashboardButton, async () => {
  await flushPendingSave();
  await performAction("dashboard");
});

window.addEventListener("beforeunload", (event) => {
  if (!hasUnsavedChanges()) return;

  event.preventDefault();
  event.returnValue = "";
});

window.flushNote = flushPendingSave;
window.notes.onChanged(refresh);

if (!noteId) {
  showError(new Error("Missing note identifier."));
} else {
  refresh();
}
