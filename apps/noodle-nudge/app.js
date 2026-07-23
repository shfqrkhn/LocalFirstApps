import { registerPwaAssurance } from "../../shared/pwa-assurance.js";
import { createNoodleBindings, createNoodleRouter, bindNoodleCompatibility } from "./controller/bindings.js";
import { NOODLE_ASSESSMENT_ORDER, NOODLE_CONFIG, createInitialNoodleState } from "./controller/config.js";
import { createContentController } from "./controller/content.js";
import { createAssessmentSessionController } from "./controller/session.js";
import { createBackupDownloader, createSettingsController } from "./controller/settings.js";
import { createLogger, createNoodleSelectors, createStateController, mergeSavedNoodleState } from "./controller/state.js";
import { createNoodleStorage } from "./controller/storage.js";
import { createNoodleViews } from "./controller/views.js";

const pwa = { registration: null, updateRegistration: null, compatible: false };
let loggerTarget = console;
const storage = createNoodleStorage({
  indexedDB,
  config: NOODLE_CONFIG,
  onError: (error) => loggerTarget.error("DB Error:", error)
});
const state = createStateController({
  initialState: createInitialNoodleState(),
  persistPatch: (patch) => storage.mergeAppState(patch),
  onPersistError: (error) => loggerTarget.error("Failed to persist state:", error)
});
const logger = createLogger({ enabled: NOODLE_CONFIG.featureFlags.enableDebugPanel, state });
loggerTarget = logger;
const selectors = createNoodleSelectors({ state, config: NOODLE_CONFIG });
const views = createNoodleViews({
  document,
  state,
  selectors,
  config: { ...NOODLE_CONFIG, assessmentOrder: NOODLE_ASSESSMENT_ORDER },
  chartCtor: globalThis.Chart,
  bootstrap: globalThis.bootstrap
});
const router = createNoodleRouter({ window, document, views, logger });
const session = createAssessmentSessionController({
  state,
  storage,
  logger,
  showToast: views.showToast,
  navigate: router.navigate
});
const settings = createSettingsController({
  config: NOODLE_CONFIG,
  state,
  storage,
  session,
  logger,
  views,
  navigate: router.navigate,
  downloadBackup: createBackupDownloader({ document, URL, Blob })
});
const content = createContentController({ config: NOODLE_CONFIG, state, logger });
const bindings = createNoodleBindings({
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
});

let initialized = false;

async function init() {
  if (initialized) return;
  initialized = true;
  views.showLoader();
  logger.info("Initializing Noodle Nudge PWA...");
  try {
    let savedState;
    try {
      savedState = await storage.getAppState();
    } catch (error) {
      logger.error("Storage unavailable:", error);
      views.showToast("Storage unavailable. Session only.", "warning");
    }
    state.init(mergeSavedNoodleState(createInitialNoodleState(), savedState));
    bindings.setup();
    router.navigate("dashboard");
    if (!Object.keys(state.get().assessments || {}).length) {
      void content.loadAllContent().then(() => router.refresh()).catch((error) => {
        logger.error("Content initialization failed:", error);
        views.showToast("Content could not be loaded. Existing local results remain available from Settings backups.", "danger");
      });
    }
    const pwaClient = await registerPwaAssurance({
      appId: "noodle-nudge",
      scriptUrl: "./service-worker.js",
      currentDataSchema: 1,
      onUpdate: ({ registration, compatible }) => {
        pwa.updateRegistration = registration;
        pwa.compatible = compatible;
        const notice = document.getElementById("pwa-update-notice");
        const message = document.getElementById("pwa-update-message");
        const button = notice.querySelector('[data-action="activate-update"]');
        message.textContent = compatible
          ? "A verified Noodle Nudge update is ready."
          : "A staged update is incompatible with this data schema and remains inactive.";
        button.hidden = !compatible;
        notice.classList.remove("d-none");
        notice.classList.add("d-flex");
      },
      onControllerChange: () => window.location.reload(),
      onError: (error) => logger.error("PWA assurance failed:", error)
    });
    pwa.registration = pwaClient?.registration || null;
    document.getElementById("app-version").textContent = NOODLE_CONFIG.version;
    logger.info("Noodle Nudge initialization complete.");
  } catch (error) {
    logger.error("Init failed:", error);
    views.showToast("Failed to initialize app. Please reload.", "danger");
  } finally {
    views.hideLoader();
  }
}

bindNoodleCompatibility(window, { init, navigate: router.navigate, settings, state, session });
document.addEventListener("DOMContentLoaded", init, { once: true });
