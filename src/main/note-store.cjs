const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

// All persistence and note lifecycle rules live here; no UI dependencies.
class NoteStore {
  constructor(file) {
    this.file = file;
    this.notes = [];
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (
        data.version !== 1 ||
        !Array.isArray(data.notes) ||
        data.notes.some(
          (n) =>
            typeof n.id !== "string" ||
            typeof n.title !== "string" ||
            typeof n.body !== "string" ||
            typeof n.archived !== "boolean" ||
            typeof n.pinned !== "boolean" ||
            !Number.isFinite(Date.parse(n.createdAt)) ||
            !Number.isFinite(Date.parse(n.updatedAt)),
        )
      ) {
        throw new Error(
          "Invalid notes file. Original data has been preserved.",
        );
      }
      this.notes = data.notes;
    }
  }
  list() {
    return structuredClone(this.notes);
  }
  get(id) {
    const note = this.notes.find((n) => n.id === id);
    if (!note) throw new Error("Note not found");
    return structuredClone(note);
  }
  commit(next) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.tmp`;
    fs.writeFileSync(
      temp,
      JSON.stringify({ version: 1, notes: next }, null, 2),
      { mode: 0o600, flush: true },
    );
    fs.renameSync(temp, this.file);
    this.notes = next;
  }
  create(source) {
    const now = new Date().toISOString();
    const note = {
      id: randomUUID(),
      title: source ? `${source.title} (copy)` : "Untitled note",
      body: source?.body || "",
      pinned: source?.pinned ?? true,
      archived: false,
      visible: true,
      createdAt: now,
      updatedAt: now,
      bounds: { width: 360, height: 380 },
    };
    this.commit([...this.notes, note]);
    return structuredClone(note);
  }
  update(id, patch) {
    const note = this.get(id);
    for (const [key, value] of Object.entries(patch)) {
      if (["title", "body"].includes(key)) {
        if (
          typeof value !== "string" ||
          value.length > (key === "title" ? 200 : 1000000)
        )
          throw new Error("Invalid note text");
      } else if (["pinned", "archived", "visible"].includes(key)) {
        if (typeof value !== "boolean") throw new Error("Invalid note state");
      } else if (key === "bounds") {
        if (
          !value ||
          !["width", "height"].every(
            (k) => Number.isFinite(value[k]) && value[k] > 0,
          ) ||
          !["x", "y"].every(
            (k) => value[k] === undefined || Number.isFinite(value[k]),
          )
        )
          throw new Error("Invalid bounds");
      } else throw new Error("Unsupported note field");
      note[key] = value;
    }
    if ("title" in patch || "body" in patch)
      note.updatedAt = new Date().toISOString();
    this.commit(this.notes.map((n) => (n.id === id ? note : n)));
    return structuredClone(note);
  }
  remove(id) {
    this.get(id);
    this.commit(this.notes.filter((n) => n.id !== id));
  }
}
module.exports = { NoteStore };
