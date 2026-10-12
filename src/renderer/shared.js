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
// Bind existing HTML controls and consistently report asynchronous failures.
export function onClick(element, handler) {
  element.addEventListener("click", () =>
    Promise.resolve().then(handler).catch(report),
  );
}
