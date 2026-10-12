import { renderDashboard } from "./dashboard.js";
import { renderNote } from "./note.js";
const app = document.querySelector("#app");
export function report(error) {
  const el = document.querySelector("#error");
  el.textContent = error.message || String(error);
  el.hidden = false;
}
export async function action(name, id, patch) {
  try {
    return await window.notes.action(name, id, patch);
  } catch (error) {
    report(error);
    throw error;
  }
}
export function button(label, handler, className = "") {
  const el = document.createElement("button");
  el.textContent = label;
  el.className = className;
  el.addEventListener("click", () =>
    Promise.resolve().then(handler).catch(report),
  );
  return el;
}
const id = new URLSearchParams(location.search).get("note");
if (id) renderNote(app, id);
else renderDashboard(app);
