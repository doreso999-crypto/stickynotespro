import { action, button, report } from "./app.js";
export function renderDashboard(root) {
  root.className = "dashboard";
  root.innerHTML = `<aside><div class="brand">▣ <strong>StickyNotesPro</strong></div><p class="eyebrow">YOUR WORKSPACE</p><nav id="views"></nav><p class="sidebar-foot">A little space for<br>everything on your mind.</p></aside><section class="workspace"><header><div><p class="eyebrow">CLEAR DESK. CLEAR MIND.</p><h1>Your notes<span>.</span></h1><p class="muted">Keep your thoughts close and your work in view.</p></div><div id="new"></div></header><div class="filters"><input id="search" aria-label="Search notes" placeholder="Search title or content…"><label>Sort <select id="sort"><option value="updated-desc">Last edited</option><option value="created-desc">Newest created</option><option value="created-asc">Oldest created</option><option value="title-asc">Title A–Z</option><option value="title-desc">Title Z–A</option></select></label></div><p id="count" class="eyebrow" aria-live="polite"></p><div id="cards" class="cards"></div></section>`;
  let archived = false,
    notes = [];
  const views = root.querySelector("#views");
  const active = button("Active notes", () => {
    archived = false;
    draw();
  });
  const archive = button("Archive", () => {
    archived = true;
    draw();
  });
  views.append(active, archive);
  root
    .querySelector("#new")
    .append(button("+ New note", () => action("create"), "primary"));
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
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = q
        ? "No matching notes. Try another search."
        : archived
          ? "Your archive is empty. Archived notes can be restored here."
          : "Your next idea starts here. Create your first note.";
      cards.append(empty);
    }
    for (const n of filtered) {
      const card = document.createElement("article");
      card.className = "card";
      const tag = document.createElement("span");
      tag.className = "eyebrow";
      tag.textContent = archived
        ? "ARCHIVED"
        : n.pinned
          ? "● ALWAYS ON TOP"
          : "NOTE";
      const heading = document.createElement("h2");
      heading.textContent = n.title || "Untitled note";
      const preview = document.createElement("p");
      preview.className = "preview";
      preview.textContent = n.body || "An empty page, ready when you are.";
      const dates = document.createElement("p");
      dates.className = "dates";
      dates.textContent = `Created ${format(n.createdAt)}\nEdited ${format(n.updatedAt)}`;
      const actions = document.createElement("div");
      actions.className = "card-actions";
      const items = archived
        ? [
            ["Restore", "restore"],
            ["Duplicate", "duplicate"],
          ]
        : [
            ["Open", "open"],
            ["Duplicate", "duplicate"],
            ["Hide", "hide"],
            ["Archive", "archive"],
          ];
      for (const [label, name] of items)
        actions.append(button(label, () => action(name, n.id)));
      if (!archived)
        actions.append(
          button(n.pinned ? "Unpin" : "Pin", () =>
            action("update", n.id, { pinned: !n.pinned }),
          ),
        );
      actions.append(button("Delete", () => action("delete", n.id), "danger"));
      card.append(tag, heading, preview, dates, actions);
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
