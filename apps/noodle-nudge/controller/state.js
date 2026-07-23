const HTML_ENTITIES = Object.freeze({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
});

const PERSISTED_KEYS = Object.freeze([
  "userAnswers",
  "userResults",
  "userHistory",
  "viewDate",
  "appConfig",
  "settings",
  "debugLog"
]);

function clone(value) {
  return structuredClone(value);
}

export function persistentStatePatch(patch) {
  return Object.fromEntries(
    PERSISTED_KEYS.filter((key) => Object.hasOwn(patch, key)).map((key) => [key, clone(patch[key])])
  );
}

export function mergeSavedNoodleState(initialState, savedState, now = () => new Date().toISOString()) {
  const merged = clone(initialState);
  if (savedState && typeof savedState === "object" && !Array.isArray(savedState)) {
    for (const key of PERSISTED_KEYS) {
      if (key !== "viewDate" && Object.hasOwn(savedState, key)) merged[key] = clone(savedState[key]);
    }
  }
  merged.appConfig = { ...initialState.appConfig, ...(merged.appConfig || {}), version: initialState.appConfig.version };
  merged.settings = merged.settings && typeof merged.settings === "object" && !Array.isArray(merged.settings) ? merged.settings : {};
  merged.userHistory = merged.userHistory && typeof merged.userHistory === "object" && !Array.isArray(merged.userHistory) ? merged.userHistory : {};
  merged.viewDate = now();
  return merged;
}

export function createStateController({ initialState, persistPatch = async () => {}, onPersistError = () => {} }) {
  let state = clone(initialState);
  const subscribers = new Set();

  function get() {
    return { ...state };
  }

  function snapshot() {
    return clone(state);
  }

  function subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  function notify() {
    for (const callback of [...subscribers]) callback(get());
  }

  function init(nextState, { silent = true } = {}) {
    state = clone(nextState);
    if (!silent) notify();
  }

  function set(patch, { silent = false, persist = true } = {}) {
    state = { ...state, ...clone(patch) };
    if (!silent) notify();
    if (!persist) return Promise.resolve();
    const persisted = persistentStatePatch(patch);
    if (Object.keys(persisted).length === 0) return Promise.resolve();
    return Promise.resolve(persistPatch(persisted)).catch((error) => {
      onPersistError(error);
      throw error;
    });
  }

  function mergeExternal(savedState, { silent = false } = {}) {
    const patch = {};
    for (const key of ["userAnswers", "userResults", "userHistory", "appConfig", "settings"]) {
      if (savedState && Object.hasOwn(savedState, key)) patch[key] = clone(savedState[key]);
    }
    state = { ...state, ...patch };
    if (!silent) notify();
    return get();
  }

  return Object.freeze({ get, init, mergeExternal, set, snapshot, subscribe });
}

export function createLogger({ enabled, state, now = () => new Date().toISOString() }) {
  function log(level, ...args) {
    if (!enabled) return;
    const message = args.map((argument) => {
      if (argument instanceof Error) return String(argument);
      return typeof argument === "object" ? JSON.stringify(argument) : String(argument);
    }).join(" ");
    console[level](`[${now()}] [${level.toUpperCase()}] ${message}`);
    const current = state.get();
    void state.set({
      debugLog: [...(current.debugLog || []), { timestamp: now(), level, message }].slice(-100)
    }, { silent: true }).catch(() => {});
  }

  return Object.freeze({
    log: (...args) => log("log", ...args),
    info: (...args) => log("info", ...args),
    warn: (...args) => log("warn", ...args),
    error: (...args) => log("error", ...args)
  });
}

export function createNoodleSelectors({ state, config }) {
  return Object.freeze({
    getString(key) {
      return config.localization.strings.en[key] || `[${key}]`;
    },
    getDayOfYear(value) {
      const date = new Date(value);
      return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 864e5);
    },
    getDailyContent(value) {
      const day = this.getDayOfYear(value);
      const daily = state.get().dailyContent || {};
      const item = (collection) => collection?.[day] || null;
      return {
        quote: item(daily.quotes),
        reflection: item(daily.reflections),
        meditation: item(daily.meditations),
        bias: item(daily.cognitiveBiases)
      };
    },
    orderedAssessments(order) {
      const positions = new Map(order.map((id, index) => [id, index]));
      return Object.values(state.get().assessments || {}).sort(
        (left, right) => (positions.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(right.id) ?? Number.MAX_SAFE_INTEGER)
      );
    }
  });
}

export function sanitizeHTML(value) {
  if (value == null) return "";
  return String(value).replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
}

export const NOODLE_PERSISTED_STATE_KEYS = PERSISTED_KEYS;
