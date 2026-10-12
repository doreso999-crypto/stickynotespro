export function showError(error) {
  const element = document.querySelector("#error");
  if (!element) return;

  element.textContent = error?.message || String(error);
  element.hidden = false;
}

export function clearError() {
  const element = document.querySelector("#error");
  if (!element) return;

  element.textContent = "";
  element.hidden = true;
}

export async function performAction(name, id, patch) {
  try {
    clearError();
    return await window.notes.action(name, id, patch);
  } catch (error) {
    showError(error);
    throw error;
  }
}

export function bindAsyncClick(element, handler) {
  element.addEventListener("click", () => {
    Promise.resolve()
      .then(handler)
      .catch(showError);
  });
}

export function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
