export const STRENGTH_BINDINGS_VERSION = "1.0.0";

export const STRENGTH_COMPATIBILITY_HANDLERS = Object.freeze([
  "updateWarmup", "updateCardio", "updateDecompress", "setRec", "modW", "togS", "swapAlt",
  "swapCardioLink", "nextPhase", "finish", "skipTimer", "skipRest", "startCardio", "loadMoreHistory",
  "viewProtocol", "closeProtocol", "del", "wipe", "imp", "drawChart"
]);

export function bindStrengthCompatibilityHandlers(target, handlers) {
  if (!target || !handlers) throw new TypeError("target and handlers are required");
  for (const name of STRENGTH_COMPATIBILITY_HANDLERS) {
    if (typeof handlers[name] !== "function") throw new TypeError(`Missing Strength compatibility handler: ${name}`);
  }
  for (const name of STRENGTH_COMPATIBILITY_HANDLERS) target[name] = handlers[name];
  return () => {
    for (const name of STRENGTH_COMPATIBILITY_HANDLERS) {
      if (target[name] === handlers[name]) delete target[name];
    }
  };
}

export function bindStrengthDomEvents({ documentRef = globalThis.document, state, render, deleteSession, historyPageSize }) {
  const removers = [];
  documentRef?.querySelectorAll?.(".nav-item").forEach(button => {
    const listener = event => {
      const target = event.target.closest(".nav-item");
      if (!target) return;
      if (target.dataset.view === "history" && state.view !== "history") state.resetHistoryLimit(historyPageSize);
      state.setView(target.dataset.view);
      render();
    };
    button.addEventListener("click", listener);
    removers.push(() => button.removeEventListener?.("click", listener));
  });

  const main = documentRef?.getElementById?.("main-content");
  if (main) {
    const listener = event => {
      const button = event.target.closest(".btn-delete-session");
      const id = button?.getAttribute("data-session-id");
      if (id) deleteSession(id);
    };
    main.addEventListener("click", listener);
    removers.push(() => main.removeEventListener?.("click", listener));
  }

  return () => removers.forEach(remove => remove());
}

export function bindStrengthStorageEvents({ windowRef = globalThis.window, storage, state, render }) {
  const listener = event => {
    if (event.storageArea !== globalThis.localStorage || event.key !== storage.KEYS.SESSIONS) return;
    storage.invalidateSessionCache();
    if (!state.activeSession && ["history", "progress"].includes(state.view)) render();
  };
  windowRef.addEventListener("storage", listener);
  return () => windowRef.removeEventListener?.("storage", listener);
}
