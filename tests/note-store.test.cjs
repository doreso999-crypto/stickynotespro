const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { NoteStore } = require("../src/main/note-store.cjs");
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "notes-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, "notes.json");
}
test("create, edit, duplicate, archive, restore and delete survive reload", (t) => {
  const file = fixture(t),
    store = new NoteStore(file),
    note = store.create();
  store.update(note.id, {
    title: "Client follow-up",
    body: "Call tomorrow",
    bounds: { x: 30, y: 50, width: 500, height: 300 },
  });
  const copy = store.create(store.get(note.id));
  assert.notEqual(copy.id, note.id);
  assert.equal(copy.body, "Call tomorrow");
  store.update(note.id, { archived: true, visible: false });
  const loaded = new NoteStore(file);
  assert.equal(loaded.get(note.id).archived, true);
  assert.equal(loaded.get(note.id).bounds.width, 500);
  loaded.update(note.id, { archived: false });
  loaded.remove(copy.id);
  assert.equal(new NoteStore(file).list().length, 1);
  assert.equal(loaded.get(note.id).createdAt, note.createdAt);
});
test("invalid update does not change persisted note", (t) => {
  const file = fixture(t),
    store = new NoteStore(file),
    n = store.create();
  assert.throws(() => store.update(n.id, { id: "changed" }));
  assert.throws(() => store.update(n.id, { title: 12 }));
  assert.deepEqual(new NoteStore(file).get(n.id), n);
});
test("invalid storage is preserved rather than overwritten", (t) => {
  const file = fixture(t);
  fs.writeFileSync(file, "invalid");
  assert.throws(() => new NoteStore(file));
  assert.equal(fs.readFileSync(file, "utf8"), "invalid");
});
test("failed disk writes leave memory unchanged", (t) => {
  const file = fixture(t),
    store = new NoteStore(file),
    n = store.create();
  store.file = path.join(file, "impossible.json");
  assert.throws(() => store.update(n.id, { body: "unsaved" }));
  assert.equal(store.get(n.id).body, "");
});
