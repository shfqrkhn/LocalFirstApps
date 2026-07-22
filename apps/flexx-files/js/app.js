import { EXERCISES, WARMUP, DECOMPRESSION, CARDIO_OPTIONS } from "./config.js";
import { StrengthStorage as Storage } from "../strength-adapter.js";
import { Observability, Logger, Metrics, Analytics } from "./observability.js";
import { Accessibility, ScreenReader } from "./accessibility.js";
import { Security, Sanitizer } from "./security.js";
import { I18n, DateFormatter } from "./i18n.js";
import * as CONST from "./constants.js";
import { activatePwaUpdate, registerPwaAssurance } from "../../../shared/pwa-assurance.js";
import { createStrengthControllerState } from "../controller/state.js";
import { createStrengthTimer } from "../controller/timer.js";
import { createStrengthModal } from "../controller/modal.js";
import { createStrengthViews } from "../controller/views.js";
import { createStrengthCommands } from "../controller/commands.js";
import { bindStrengthCompatibilityHandlers, bindStrengthDomEvents, bindStrengthStorageEvents } from "../controller/bindings.js";

const State = createStrengthControllerState({ historyLimit: CONST.HISTORY_PAGINATION_LIMIT });
const PwaState = { registration: null, health: null, updatePrompting: false };

const Haptics = {
  success: () => navigator.vibrate?.([10, 30, 10]),
  light: () => navigator.vibrate?.(10),
  heavy: () => navigator.vibrate?.(50)
};

const Modal = createStrengthModal({
  logger: Logger,
  announce: (message, priority) => ScreenReader.announce(message, priority)
});

const Timer = createStrengthTimer({
  defaultSeconds: CONST.DEFAULT_REST_TIMER_SECONDS,
  onComplete: () => {
    Haptics.success();
    ScreenReader.announce("Rest period complete. Ready for next set.");
  },
  onError: message => Logger.error(message)
});

const Views = createStrengthViews({
  state: State,
  modal: Modal,
  pwaState: PwaState,
  logger: Logger,
  screenReader: ScreenReader
});

const Commands = createStrengthCommands({
  state: State,
  render: Views.render,
  timer: Timer,
  modal: Modal,
  haptics: Haptics,
  logger: Logger,
  metrics: Metrics,
  analytics: Analytics,
  screenReader: ScreenReader,
  i18n: I18n,
  generateSessionCard: Views.generateSessionCard
});

bindStrengthCompatibilityHandlers(window, { ...Commands, drawChart: Views.drawChart });
bindStrengthDomEvents({
  state: State,
  render: Views.render,
  deleteSession: Commands.del,
  historyPageSize: CONST.HISTORY_PAGINATION_LIMIT
});
bindStrengthStorageEvents({ windowRef: window, storage: Storage, state: State, render: Views.render });

function preSanitizeConfig() {
  try {
    const sanitize = object => {
      if (object.video) object.video = Sanitizer.sanitizeURL(object.video);
      if (object.altLinks) {
        for (const key in object.altLinks) {
          if (Object.prototype.hasOwnProperty.call(object.altLinks, key)) object.altLinks[key] = Sanitizer.sanitizeURL(object.altLinks[key]);
        }
      }
    };
    EXERCISES.forEach(sanitize);
    WARMUP.forEach(sanitize);
    DECOMPRESSION.forEach(sanitize);
    CARDIO_OPTIONS.forEach(sanitize);
    Logger.info("Static configuration URLs pre-sanitized");
  } catch (error) {
    Logger.error("Failed to pre-sanitize config", { error: error.message });
  }
}

(async function initializeSystems() {
  Metrics.mark("app-init-start");
  Observability.init();
  Logger.info(`🚀 Flexx Files v${CONST.APP_VERSION} - Mission-Critical Mode`);

  Security.init(Logger);
  Logger.info("Security system active");
  preSanitizeConfig();

  Accessibility.init();
  Logger.info("Accessibility system active (WCAG 2.1 AA)");

  I18n.init();
  Logger.info("i18n system active", { locale: I18n.currentLocale });

  Storage.runMigrations();
  Logger.info("Database migrations complete");

  const draft = Storage.loadDraft();
  if (draft) {
    const restore = await Modal.show({
      type: "confirm",
      title: I18n.t("modal.recoverSession"),
      text: I18n.t("modal.recoverDraft", { time: DateFormatter.relative(draft.date) })
    });
    if (restore) {
      State.restoreDraft(draft);
      Logger.info("Draft session restored", { id: draft.id });
      ScreenReader.announce("Previous session recovered successfully");
    } else {
      Storage.clearDraft();
      Logger.info("Draft session discarded");
    }
  }

  const pwa = await registerPwaAssurance({
    appId: "flexx-files",
    scriptUrl: "./sw.js",
    scope: "./",
    currentDataSchema: CONST.STORAGE_VERSION,
    onUpdate: async ({ registration, compatible }) => {
      if (PwaState.updatePrompting) return;
      PwaState.updatePrompting = true;
      try {
        if (!compatible) {
          await Modal.show({ title: "Update held safely", text: "The staged shell is not compatible with this Flexx data schema and was not activated." });
          return;
        }
        const reload = await Modal.show({
          title: I18n.t("modal.updateAvailable"),
          text: `${I18n.t("modal.updateText")} Saved training data will be flushed before activation.`,
          type: "confirm",
          okText: I18n.t("modal.reloadNow")
        });
        if (reload) {
          Storage.flushDraft();
          Storage.flushPersistence();
          await activatePwaUpdate(registration, CONST.STORAGE_VERSION);
        }
      } finally {
        PwaState.updatePrompting = false;
      }
    },
    onControllerChange: () => {
      Storage.flushDraft();
      Storage.flushPersistence();
      window.location.reload();
    },
    onError: error => Logger.warn("Service worker assurance unavailable", { error: error.message })
  });
  PwaState.registration = pwa?.registration || null;
  await Views.refreshPwaHealth();

  Analytics.track("app_start", {
    version: CONST.APP_VERSION,
    platform: navigator.platform,
    online: navigator.onLine
  });
  const initTime = Metrics.measure("app-init", "app-init-start");
  Logger.info("App initialized", { duration: `${initTime?.toFixed(2)}ms`, sessions: Storage.getSessions().length });
  Views.render();

  const draftAutoSaveInterval = setInterval(() => {
    if (State.activeSession) {
      Storage.saveDraft(State.activeSession);
      Logger.debug("Draft auto-saved", { id: State.activeSession.id });
    }
  }, 30000);

  window.addEventListener("beforeunload", () => {
    clearInterval(draftAutoSaveInterval);
    Storage.flushPersistence();
    if (State.activeSession) {
      Storage.saveDraft(State.activeSession);
      Storage.flushDraft();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && State.activeSession) {
      Storage.saveDraft(State.activeSession);
      Storage.flushDraft();
      Storage.flushPersistence();
      Logger.debug("Draft saved on visibility change", { id: State.activeSession.id });
    }
  });

  window.addEventListener("pagehide", () => {
    if (State.activeSession) {
      Storage.saveDraft(State.activeSession);
      Storage.flushDraft();
      Storage.flushPersistence();
      Logger.debug("Draft saved on pagehide", { id: State.activeSession.id });
    }
  });
})().catch(error => {
  Logger.error("Fatal initialization error:", error);
  ScreenReader.announce(I18n.t("modal.initError"), "assertive");
  Modal.show({ title: I18n.t("modal.fatalError"), text: I18n.t("modal.initError") });
});
