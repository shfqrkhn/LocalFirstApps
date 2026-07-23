export const STRENGTH_CONTROLLER_STATE_VERSION = "1.0.0";

export const STRENGTH_VIEWS = Object.freeze(["today", "history", "progress", "settings", "protocol"]);
export const STRENGTH_PHASES = Object.freeze(["warmup", "lifting", "cardio", "decompress"]);

const requireMember = (value, allowed, label) => {
  if (!allowed.includes(value)) throw new TypeError(`Unknown Strength ${label}: ${value}`);
  return value;
};

export function createStrengthControllerState({ historyLimit = 20 } = {}) {
  if (!Number.isInteger(historyLimit) || historyLimit < 1) throw new TypeError("historyLimit must be a positive integer");

  return {
    view: "today",
    phase: null,
    recovery: null,
    activeSession: null,
    historyLimit,
    forceRestSkip: false,

    setView(view) {
      this.view = requireMember(view, STRENGTH_VIEWS, "view");
      return this.view;
    },

    setPhase(phase) {
      this.phase = requireMember(phase, STRENGTH_PHASES, "phase");
      return this.phase;
    },

    beginSession(recovery, session) {
      if (!["green", "yellow", "red"].includes(recovery)) throw new TypeError(`Unknown recovery status: ${recovery}`);
      if (!session || typeof session !== "object") throw new TypeError("session is required");
      this.recovery = recovery;
      this.activeSession = session;
      this.phase = "warmup";
      return session;
    },

    restoreDraft(draft, phase = "lifting") {
      if (!draft || typeof draft !== "object") throw new TypeError("draft is required");
      this.activeSession = draft;
      this.recovery = draft.recoveryStatus;
      this.phase = requireMember(phase, STRENGTH_PHASES, "phase");
      return draft;
    },

    completeSession() {
      this.view = "history";
      this.phase = null;
      this.recovery = null;
      this.activeSession = null;
      this.forceRestSkip = false;
    },

    skipRest() {
      this.forceRestSkip = true;
    },

    resetHistoryLimit(limit = historyLimit) {
      if (!Number.isInteger(limit) || limit < 1) throw new TypeError("history limit must be a positive integer");
      this.historyLimit = limit;
      return this.historyLimit;
    },

    extendHistoryLimit(amount = historyLimit) {
      if (!Number.isInteger(amount) || amount < 1) throw new TypeError("history increment must be a positive integer");
      this.historyLimit = (this.historyLimit || historyLimit) + amount;
      return this.historyLimit;
    },

    snapshot() {
      return Object.freeze({
        view: this.view,
        phase: this.phase,
        recovery: this.recovery,
        activeSession: this.activeSession,
        historyLimit: this.historyLimit,
        forceRestSkip: this.forceRestSkip
      });
    }
  };
}

export function selectTodaySurface(state) {
  if (!state?.recovery) return "recovery";
  return STRENGTH_PHASES.includes(state.phase) ? state.phase : "decompress";
}

export function selectHistoryWindow(sessions, limit) {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  const start = Math.max(0, safeSessions.length - safeLimit);
  return Object.freeze({
    sessions: safeSessions.slice(start).reverse(),
    shown: safeSessions.length - start,
    remaining: start,
    hasMore: start > 0
  });
}
