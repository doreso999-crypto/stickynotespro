import {
  bindAsyncClick,
  formatDate,
  performAction,
  showError,
} from "./shared.js";

const root = document.querySelector("#dashboard-app");
const activeViewButton = document.querySelector("#active-view");
const archiveViewButton = document.querySelector("#archive-view");
const newNoteButton = document.querySelector("#new-note");
const searchInput = document.querySelector("#search");
const sortSelect = document.querySelector("#sort");
const countElement = document.querySelector("#count");
const cardsElement = document.querySelector("#cards");
const emptyStateElement = document.querySelector("#empty-state");
const noteCardTemplate = document.querySelector("#note-card-template");

let notes = [];

function currentView() {
  return root.dataset.view === "archive" ? "archive" : "active";
}

function setView(view) {
  root.dataset.view = view;
  activeViewButton.setAttribute("aria-pressed", String(view === "active"));
  archiveViewButton.setAttribute("aria-pressed", String(view === "archive"));
  render();
}

function filteredNotes() {
  const view = currentView();
  const query = searchInput.value.trim().toLowerCase();
  const showArchived = view === "archive";

  const result = notes.filter((note) => {
    if (note.archived !== showArchived) return false;
    if (!query) return true;

    return `${note.title}\n${note.body}`.toLowerCase().includes(query);
  });

  const [field, direction] = sortSelect.value.split("-");
  const multiplier = direction === "asc" ? 1 : -1;

  result.sort((a, b) => {
    if (field === "title") {
      return a.title.localeCompare(b.title) * multiplier;
    }

    const property = field === "created" ? "createdAt" : "updatedAt";
    return a[property].localeCompare(b[property]) * multiplier;
  });

  return result;
}

function updateEmptyState(filtered) {
  const hasResults = filtered.length > 0;
  emptyStateElement.hidden = hasResults;

  if (hasResults) return;

  if (searchInput.value.trim()) {
    emptyStateElement.dataset.emptyReason = "search";
    return;
  }

  emptyStateElement.dataset.emptyReason = currentView();
}

function setTime(element, isoDate) {
  element.dateTime = isoDate;
  element.textContent = formatDate(isoDate);
}

function bindCardActions(card, note) {
  for (const button of card.querySelectorAll("[data-action]")) {
    bindAsyncClick(button, async () => {
      const actionName = button.dataset.action;

      if (actionName === "toggle-pin") {
        await performAction("update", note.id, { pinned: !note.pinned });
        return;
      }

      await performAction(actionName, note.id);
    });
  }
}

function createCard(note) {
  const card = noteCardTemplate.content.firstElementChild.cloneNode(true);
  card.dataset.archived = String(note.archived);
  card.dataset.pinned = String(note.pinned);
  card.dataset.visible = String(note.visible);

  card.querySelector('[data-field="title"]').textContent =
    note.title.trim() || "Untitled note";
  card.querySelector('[data-field="body"]').textContent =
    note.body.trim() || "This note is empty.";

  setTime(card.querySelector('[data-field="created"]'), note.createdAt);
  setTime(card.querySelector('[data-field="updated"]'), note.updatedAt);
  bindCardActions(card, note);

  return card;
}

function render() {
  const filtered = filteredNotes();
  const viewLabel = currentView() === "archive" ? "archived" : "active";
  countElement.textContent = `${filtered.length} ${viewLabel} note${filtered.length === 1 ? "" : "s"}`;

  cardsElement.replaceChildren(...filtered.map(createCard));
  updateEmptyState(filtered);
}

async function refresh() {
  try {
    notes = await window.notes.list();
    render();
  } catch (error) {
    showError(error);
  }
}

bindAsyncClick(activeViewButton, () => setView("active"));
bindAsyncClick(archiveViewButton, () => setView("archive"));
bindAsyncClick(newNoteButton, () => performAction("create"));
searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);

window.notes.onChanged(refresh);
refresh();
