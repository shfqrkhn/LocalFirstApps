import { activatePwaUpdate } from "../../../shared/pwa-assurance.js";

export const NOODLE_COMPATIBILITY_BINDINGS = Object.freeze([
  "App.init",
  "App.navigate",
  "State.get",
  "State.set",
  "Scoring.calculateResults",
  "SettingsManager.exportData",
  "SettingsManager.importData",
  "SettingsManager.resetData",
  "SettingsManager.fillWithRandomData"
]);

export function createNoodleRouter({ window, document, views, logger }) {
  let current = { path: "dashboard", params: {} };
  const routes = Object.freeze({
    dashboard: () => views.renderDashboard(),
    assessments: () => views.renderAssessments(),
    assessment: ({ id }) => views.renderAssessment(id),
    results: ({ id }) => views.renderResults(id),
    settings: () => views.renderSettings()
  });

  function focusHeading() {
    const root = document.getElementById("app-root");
    const heading = root.querySelector("h1, h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus();
    } else {
      root.focus();
    }
  }

  function navigate(path, params = {}, { focus = true } = {}) {
    const render = routes[path];
    if (!render) {
      logger.error(`Route not found: ${path}`);
      return false;
    }
    window.scrollTo(0, 0);
    current = { path, params: { ...params } };
    logger.info(`Navigating to ${path}`);
    render(current.params);
    if (focus) focusHeading();
    return true;
  }

  function refresh({ preserveAssessment = true } = {}) {
    if (preserveAssessment && current.path === "assessment") return false;
    return navigate(current.path, current.params, { focus: false });
  }

  return Object.freeze({ current: () => ({ path: current.path, params: { ...current.params } }), navigate, refresh });
}

export function createNoodleBindings({
  window,
  document,
  state,
  storage,
  views,
  router,
  session,
  settings,
  content,
  logger,
  pwa
}) {
  let draggedItem;
  let refreshing;

  function moveCard(card) {
    const section = card.closest(".card-sort-section");
    if (!section) return false;
    const containers = [section.querySelector(".card-sort-source"), ...section.querySelectorAll(".card-sort-target")];
    const origin = containers.indexOf(card.parentElement);
    let index = (origin + 1) % containers.length;
    while (index !== origin) {
      const destination = containers[index];
      const limit = destination.classList.contains("card-sort-source")
        ? Infinity
        : (Number.parseInt(destination.dataset.limit, 10) || Infinity);
      if (destination.children.length - 1 < limit) {
        destination.append(card);
        card.focus();
        const heading = destination.querySelector("h4");
        const targetName = heading?.childNodes[0]?.textContent?.trim() || "Target";
        views.showToast(`Moved to ${targetName}`, "success");
        return true;
      }
      index = (index + 1) % containers.length;
    }
    views.showToast("No available category has room for this item.", "warning");
    return false;
  }

  async function handleAction(target) {
    if (target.dataset.action === "activate-update") {
      target.disabled = true;
      try {
        await activatePwaUpdate(pwa.updateRegistration, 1);
      } catch (error) {
        target.disabled = false;
        views.showToast(error.message, "danger");
      }
      return;
    }
    const currentDate = new Date(state.get().viewDate);
    if (target.dataset.action === "prev-day") currentDate.setDate(currentDate.getDate() - 1);
    else if (target.dataset.action === "next-day") currentDate.setDate(currentDate.getDate() + 1);
    else return;
    await state.set({ viewDate: currentDate.toISOString() });
    router.navigate("dashboard", {}, { focus: false });
  }

  async function handleCommand(target) {
    const command = target.dataset.command;
    if (command === "choose-import") {
      document.getElementById("import-file")?.click();
    } else if (command === "export-data") {
      await settings.exportData().catch(() => {});
    } else if (command === "reset-data") {
      await settings.resetData();
    }
  }

  async function handleDebug(target) {
    const action = target.dataset.debugAction;
    if (action === "force-reload") {
      try {
        await content.loadAllContent();
        router.refresh();
      } catch (error) {
        logger.error("Content reload failed:", error);
        views.showToast("Content reload failed. Existing content was preserved.", "danger");
      }
    } else if (action === "clear-state") {
      await settings.resetData();
    } else if (action === "toast-success") {
      views.showToast("This is a success test.", "success");
    } else if (action === "toast-danger") {
      views.showToast("This is a danger test.", "danger");
    } else if (action === "fill-random") {
      await settings.fillWithRandomData();
    }
  }

  async function onClick(event) {
    const navigation = event.target.closest("[data-nav]");
    if (navigation) {
      event.preventDefault();
      router.navigate(navigation.dataset.nav, { id: navigation.dataset.assessmentId });
      return;
    }
    const action = event.target.closest("[data-action]");
    if (action) {
      event.preventDefault();
      await handleAction(action);
      return;
    }
    const command = event.target.closest("[data-command]");
    if (command && command.tagName !== "INPUT") {
      event.preventDefault();
      await handleCommand(command);
      return;
    }
    const debug = event.target.closest("[data-debug-action]");
    if (debug) {
      event.preventDefault();
      await handleDebug(debug);
      return;
    }
    const card = event.target.closest(".sortable-card");
    if (card) {
      event.preventDefault();
      moveCard(card);
    }
  }

  function onKeydown(event) {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".sortable-card")) {
      event.preventDefault();
      moveCard(event.target);
    }
  }

  async function onChange(event) {
    if (!event.target.matches('[data-command="import-file"]')) return;
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await settings.importFile(file);
    } catch {
      event.target.value = "";
    }
  }

  async function onSubmit(event) {
    const form = event.target.closest("[data-assessment-form]");
    if (!form) return;
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      await session.submit(form.dataset.assessmentForm, form);
    } catch {
      if (submit) submit.disabled = false;
    }
  }

  function onDragStart(event) {
    const card = event.target.closest(".sortable-card");
    if (!card) return;
    draggedItem = card;
    queueMicrotask(() => card.classList.add("dragging"));
  }

  function onDragEnd(event) {
    const card = event.target.closest(".sortable-card");
    card?.classList.remove("dragging");
    draggedItem = undefined;
  }

  function onDragOver(event) {
    const target = event.target.closest(".card-sort-target");
    if (!target) return;
    event.preventDefault();
    target.classList.add("drag-over");
  }

  function onDragLeave(event) {
    const target = event.target.closest(".card-sort-target");
    if (target && !target.contains(event.relatedTarget)) target.classList.remove("drag-over");
  }

  function onDrop(event) {
    const target = event.target.closest(".card-sort-target");
    if (!target) return;
    event.preventDefault();
    target.classList.remove("drag-over");
    if (draggedItem && draggedItem.closest(".card-sort-section") !== target.closest(".card-sort-section")) {
      views.showToast("Items can only move within their assessment section.", "warning");
      return;
    }
    const limit = Number.parseInt(target.dataset.limit, 10) || Infinity;
    if (draggedItem && target.children.length - 1 < limit) {
      target.append(draggedItem);
      draggedItem.focus();
    } else {
      views.showToast(`'${target.querySelector("h4")?.childNodes[0]?.textContent?.trim() || "Selected"}' category is full.`, "warning");
    }
  }

  async function refreshFromStorage() {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const saved = await storage.getAppState();
        if (!saved) return;
        state.mergeExternal(saved, { silent: true });
        router.refresh({ preserveAssessment: true });
      } catch (error) {
        logger.error("Could not refresh external Noodle state:", error);
      }
    })().finally(() => { refreshing = undefined; });
    return refreshing;
  }

  function onVisibilityChange() {
    if (document.visibilityState === "visible") void refreshFromStorage();
  }

  function onPageShow(event) {
    if (event.persisted) void refreshFromStorage();
  }

  function onStorage() {
    // Noodle owns IndexedDB only. LocalStorage events, including sibling-app keys, are intentionally ignored.
  }

  function setup() {
    document.body.addEventListener("click", onClick);
    document.body.addEventListener("keydown", onKeydown);
    document.body.addEventListener("change", onChange);
    document.body.addEventListener("submit", onSubmit);
    document.body.addEventListener("dragstart", onDragStart);
    document.body.addEventListener("dragend", onDragEnd);
    document.body.addEventListener("dragover", onDragOver);
    document.body.addEventListener("dragleave", onDragLeave);
    document.body.addEventListener("drop", onDrop);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("storage", onStorage);
  }

  return Object.freeze({ moveCard, refreshFromStorage, setup });
}

export function bindNoodleCompatibility(window, { init, navigate, settings, state, session }) {
  const facade = {
    App: Object.freeze({ init, navigate }),
    State: Object.freeze({ get: state.get, set: state.set }),
    Scoring: Object.freeze({ calculateResults: session.calculateResults }),
    SettingsManager: Object.freeze({
      exportData: settings.exportData,
      importData: (event) => settings.importFile(event?.target?.files?.[0]),
      resetData: settings.resetData,
      fillWithRandomData: settings.fillWithRandomData
    })
  };
  Object.defineProperty(window, "NoodleNudge", {
    configurable: true,
    enumerable: true,
    writable: false,
    value: Object.freeze(facade)
  });
  return facade;
}
