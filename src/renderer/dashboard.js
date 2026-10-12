import { action, onClick, report } from "./shared.js";
export function renderDashboard(root) {
  let archived = false,
    notes = [];
  const active = root.querySelector("#active-view");
  const archive = root.querySelector("#archive-view");
  onClick(active, () => {
    archived = false;
    draw();
  });
  onClick(archive, () => {
    archived = true;
    draw();
  });
  onClick(root.querySelector("#new-note"), () => action("create"));
  const template = document.querySelector("#note-card-template");
  const search = root.querySelector("#search"),
    sort = root.querySelector("#sort");
  search.oninput = draw;
  sort.onchange = draw;
  const format = (value) =>
    new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  function draw() {
    active.classList.toggle("selected", !archived);
    archive.classList.toggle("selected", archived);
    active.setAttribute("aria-pressed", String(!archived));
    archive.setAttribute("aria-pressed", String(archived));
    const q = search.value.toLowerCase();
    const filtered = notes.filter(
      (n) =>
        n.archived === archived &&
        `${n.title}\n${n.body}`.toLowerCase().includes(q),
    );
    const [field, direction] = sort.value.split("-");
    filtered.sort(
      (a, b) =>
        (field === "title"
          ? a.title.localeCompare(b.title)
          : a[field === "created" ? "createdAt" : "updatedAt"].localeCompare(
              b[field === "created" ? "createdAt" : "updatedAt"],
            )) * (direction === "asc" ? 1 : -1),
    );
    root.querySelector("#count").textContent =
      `${filtered.length} ${archived ? "ARCHIVED" : "ACTIVE"} NOTE${filtered.length === 1 ? "" : "S"}`;
    const cards = root.querySelector("#cards");
    cards.replaceChildren();
    const empty = root.querySelector("#empty-state");
    empty.hidden = filtered.length > 0;
    empty.textContent = q
      ? "No matching notes. Try another search."
      : archived
        ? "Your archive is empty. Archived notes can be restored here."
        : "Your next idea starts here. Create your first note.";
    for (const n of filtered) {
      // Clone the HTML template and fill data safely; never build HTML strings.
      const card = template.content.firstElementChild.cloneNode(true);
      const field = (name) => card.querySelector(`[data-field="${name}"]`);
      field("state").textContent = archived
        ? "ARCHIVED"
        : n.pinned
          ? "● ALWAYS ON TOP"
          : "NOTE";
      field("title").textContent = n.title || "Untitled note";
      field("body").textContent =
        n.body || "An empty page, ready when you are.";
      field("dates").textContent =
        `Created ${format(n.createdAt)}\nEdited ${format(n.updatedAt)}`;
      for (const control of card.querySelectorAll("[data-action]")) {
        const name = control.dataset.action;
        control.hidden =
          name === "restore"
            ? !archived
            : ["open", "hide", "archive", "pin"].includes(name) && archived;
        if (name === "pin") control.textContent = n.pinned ? "Unpin" : "Pin";
        onClick(control, () =>
          name === "pin"
            ? action("update", n.id, { pinned: !n.pinned })
            : action(name, n.id),
        );
      }
      cards.append(card);
    }
  }
  async function refresh() {
    try {
      notes = await window.notes.list();
      draw();
    } catch (error) {
      report(error);
    }
  }
  window.notes.onChanged(refresh);
  refresh();
}

renderDashboard(document.querySelector("#app"));
