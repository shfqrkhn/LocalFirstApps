import { EXERCISES, WARMUP, DECOMPRESSION, CARDIO_OPTIONS, EXERCISE_MAP, WARMUP_MAP, DECOMPRESSION_MAP } from "../js/config.js";
import { StrengthStorage, StrengthCalculator } from "../strength-adapter.js";
import * as CONST from "../js/constants.js";
import { clearOwnedPwaCaches } from "../../../shared/pwa-assurance.js";

export const STRENGTH_COMMANDS_VERSION = "1.0.0";

export function createStrengthCommands({
  state,
  render,
  timer,
  modal,
  haptics,
  logger,
  metrics,
  analytics,
  screenReader,
  i18n,
  storage = StrengthStorage,
  calculator = StrengthCalculator,
  documentRef = globalThis.document,
  navigatorRef = globalThis.navigator,
  locationRef = globalThis.location,
  FileReaderCtor = globalThis.FileReader,
  createId = () => globalThis.crypto.randomUUID(),
  nowIso = () => new Date().toISOString(),
  generateSessionCard,
  clearCaches = clearOwnedPwaCaches
}) {
  if (!state || !render || !timer || !modal || !generateSessionCard) throw new TypeError("Strength command dependencies are incomplete");

  const saveDraft = () => {
    if (state.activeSession) storage.saveDraft(state.activeSession);
  };

  const commands = {
    updateWarmup(id) {
      try {
        const element = documentRef.getElementById(`w-${id}`);
        if (!element) return;
        const item = state.activeSession?.warmup?.find(entry => entry.id === id);
        if (item) {
          item.completed = element.checked;
          saveDraft();
        }
      } catch (error) {
        logger.error("Error updating warmup:", error);
      }
    },

    updateCardio() {
      try {
        const type = documentRef.getElementById("cardio-type");
        const done = documentRef.getElementById("cardio-done");
        if (state.activeSession?.cardio) {
          if (type) state.activeSession.cardio.type = type.value;
          if (done) state.activeSession.cardio.completed = done.checked;
          saveDraft();
        }
      } catch (error) {
        logger.error("Error updating cardio:", error);
      }
    },

    updateDecompress(id) {
      try {
        const value = documentRef.getElementById(`val-${id}`);
        const done = documentRef.getElementById(`done-${id}`);
        const item = state.activeSession?.decompress?.find(entry => entry.id === id);
        if (item) {
          if (value) item.val = value.value;
          if (done) item.completed = done.checked;
          saveDraft();
        }
      } catch (error) {
        logger.error("Error updating decompress:", error);
      }
    },

    async setRec(recovery) {
      metrics.mark("recovery-select-start");
      if (recovery === "red") {
        logger.info("Red recovery selected - confirming override", { recovery });
        screenReader.announce(i18n.t("modal.lowRecovery"));
        const proceed = await modal.show({
          type: "confirm",
          title: i18n.t("modal.lowRecovery"),
          text: i18n.t("modal.restWarning"),
          danger: true,
          okText: i18n.t("modal.trainAnyway")
        });
        if (!proceed) {
          analytics.track("recovery_selected", { status: "red", action: "skipped" });
          return;
        }
        analytics.track("recovery_selected", { status: "red", action: "override" });
        logger.warn("Red recovery override - user chose to train anyway", { recovery });
      }

      const session = {
        id: createId(),
        date: nowIso(),
        recoveryStatus: recovery,
        exercises: [],
        warmup: WARMUP.map(item => ({ id: item.id, completed: false, altUsed: "" }))
      };
      state.beginSession(recovery, session);
      logger.info("Workout started", { recovery, sessionId: session.id });
      analytics.track("recovery_selected", { status: recovery });
      const label = recovery === "green" ? i18n.t("recovery.green") : recovery === "yellow" ? i18n.t("recovery.yellow") : i18n.t("recovery.red");
      screenReader.announce(`${label} selected. Starting warmup.`);
      haptics.success();
      metrics.measure("recovery-select", "recovery-select-start");
      render();
    },

    modW(id, delta) {
      try {
        const input = documentRef.getElementById(`w-${id}`);
        if (!input) {
          logger.error(`Weight input not found: w-${id}`);
          return;
        }
        const weight = Math.max(0, (parseFloat(input.value) || 0) + delta);
        input.value = weight;
        const exercise = state.activeSession?.exercises?.find(entry => entry.id === id);
        if (exercise) exercise.weight = weight;
        const plates = documentRef.getElementById(`pl-${id}`);
        if (plates) plates.textContent = `${calculator.getPlateLoad(weight)} / side`;
        saveDraft();
        haptics.light();
      } catch (error) {
        logger.error("Error modifying weight:", error);
      }
    },

    togS(exerciseId, index, maximum) {
      try {
        const button = documentRef.getElementById(`s-${exerciseId}-${index}`);
        if (!button) {
          logger.error(`Set button not found: s-${exerciseId}-${index}`);
          return;
        }
        const completed = button.classList.toggle("completed");
        button.setAttribute("aria-pressed", completed);
        if (completed) {
          haptics.success();
          timer.start();
        }
        const exercise = state.activeSession?.exercises?.find(entry => entry.id === exerciseId);
        if (exercise) {
          const card = documentRef.getElementById(`card-${exerciseId}`);
          if (card) {
            const count = card.querySelectorAll(".set-btn.completed").length;
            exercise.setsCompleted = count;
            exercise.completed = count >= maximum;
          }
          saveDraft();
        }
      } catch (error) {
        logger.error("Error toggling set:", error);
      }
    },

    swapAlt(id) {
      try {
        const selector = documentRef.getElementById(`alt-${id}`);
        if (!selector) {
          logger.error(`Alternative selector not found: alt-${id}`);
          return;
        }
        const selected = selector.value;
        const config = EXERCISE_MAP.get(id) || WARMUP_MAP.get(id) || DECOMPRESSION_MAP.get(id);
        if (!config) {
          logger.error(`Exercise config not found: ${id}`);
          return;
        }
        const video = documentRef.getElementById(`vid-${id}`);
        const name = documentRef.getElementById(`name-${id}`);
        if (video) {
          video.href = selected && config.altLinks[selected] ? config.altLinks[selected] : config.video;
          video.rel = "noopener noreferrer";
          video.setAttribute("aria-label", `Watch video for ${selected || config.name}`);
        }
        if (name) name.textContent = selected || config.name;

        if (state.activeSession) {
          if (state.phase === "lifting") {
            const exercise = state.activeSession.exercises.find(entry => entry.id === id);
            if (exercise) {
              exercise.usingAlternative = !!selected;
              exercise.altName = selected;
              const target = selected || exercise.id;
              const sessions = storage.getSessions();
              exercise.weight = calculator.getRecommendedWeight(target, state.recovery, sessions);
              const input = documentRef.getElementById(`w-${id}`);
              if (input) input.value = exercise.weight;
              const plates = documentRef.getElementById(`pl-${id}`);
              if (plates) plates.textContent = `${calculator.getPlateLoad(exercise.weight)} / side`;
              const last = documentRef.getElementById(`last-${id}`);
              if (last) {
                const previous = calculator.getLastCompletedExercise(target, sessions);
                last.textContent = previous ? `Last: ${previous.weight} lbs` : "First Session";
              }
            }
          } else if (state.phase === "warmup") {
            const warmup = state.activeSession.warmup.find(entry => entry.id === id);
            if (warmup) warmup.altUsed = selected;
          } else if (state.phase === "decompress") {
            const decompress = state.activeSession.decompress.find(entry => entry.id === id);
            if (decompress) decompress.altUsed = selected;
          }
          saveDraft();
        }
      } catch (error) {
        logger.error("Error swapping alternative:", error);
      }
    },

    swapCardioLink() {
      try {
        const selector = documentRef.getElementById("cardio-type");
        if (!selector) {
          logger.error("Cardio type selector not found");
          return;
        }
        const config = CARDIO_OPTIONS.find(option => option.name === selector.value);
        const video = documentRef.getElementById("cardio-vid");
        if (config && video) {
          video.href = config.video;
          video.rel = "noopener noreferrer";
          video.setAttribute("aria-label", `Watch video for ${config.name}`);
        }
      } catch (error) {
        logger.error("Error swapping cardio link:", error);
      }
    },

    async nextPhase(phase) {
      try {
        if (phase === "lifting") {
          state.activeSession.warmup = WARMUP.map(item => ({
            id: item.id,
            completed: documentRef.getElementById(`w-${item.id}`)?.checked || false,
            altUsed: documentRef.getElementById(`alt-${item.id}`)?.value || ""
          }));
          const sessions = storage.getSessions();
          state.activeSession.exercises = EXERCISES.map(exercise => ({
            id: exercise.id,
            name: exercise.name,
            weight: calculator.getRecommendedWeight(exercise.id, state.recovery, sessions),
            setsCompleted: 0,
            completed: false,
            usingAlternative: false,
            skipped: false
          }));
        }
        if (phase === "cardio") {
          state.activeSession.exercises = EXERCISES.map(exercise => {
            const weight = parseFloat(documentRef.getElementById(`w-${exercise.id}`)?.value) || 0;
            const sets = documentRef.querySelectorAll(`#card-${exercise.id} .set-btn.completed`).length;
            const alternative = documentRef.getElementById(`alt-${exercise.id}`)?.value || "";
            return {
              id: exercise.id,
              name: exercise.name,
              weight,
              setsCompleted: sets,
              completed: sets === exercise.sets,
              usingAlternative: !!alternative,
              altName: alternative
            };
          });
          if (!state.activeSession.cardio) state.activeSession.cardio = { type: CARDIO_OPTIONS[0].name, completed: false };
        }
        if (phase === "decompress") {
          state.activeSession.cardio = {
            type: documentRef.getElementById("cardio-type")?.value || "Unknown",
            completed: documentRef.getElementById("cardio-done")?.checked || false
          };
          if (!state.activeSession.decompress) {
            state.activeSession.decompress = DECOMPRESSION.map(item => ({ id: item.id, val: null, completed: false, altUsed: "" }));
          }
        }

        state.setPhase(phase);
        logger.info("Phase transition", { from: state.phase, to: phase });
        analytics.track("phase_transition", { phase });
        const phaseNames = {
          warmup: i18n.t("workout.warmup"),
          lifting: i18n.t("workout.lifting"),
          cardio: i18n.t("workout.cardio"),
          decompress: i18n.t("workout.decompress")
        };
        screenReader.announce(`Starting ${phaseNames[phase] || phase} phase`);
        saveDraft();
        render();
      } catch (error) {
        logger.error("Error transitioning phase", { phase, error: error.message });
        logger.error("Error transitioning phase:", error);
        screenReader.announce(i18n.t("modal.saveError"), "assertive");
        await modal.show({ title: i18n.t("modal.error"), text: i18n.t("modal.saveError") });
      }
    },

    async finish() {
      try {
        if (!await modal.show({ type: "confirm", title: i18n.t("modal.finish"), text: i18n.t("modal.saveSession") })) return;
        state.activeSession.decompress = DECOMPRESSION.map(item => ({
          id: item.id,
          val: documentRef.getElementById(`val-${item.id}`)?.value || null,
          completed: documentRef.getElementById(`done-${item.id}`)?.checked || false,
          altUsed: documentRef.getElementById(`alt-${item.id}`)?.value || ""
        }));
        metrics.mark("session-save-start");
        const saved = storage.saveSession(state.activeSession);
        logger.info("Session completed", {
          sessionId: saved.id,
          sessionNumber: saved.sessionNumber,
          totalVolume: saved.totalVolume,
          recovery: saved.recoveryStatus
        });
        analytics.track("session_completed", {
          sessionNumber: saved.sessionNumber,
          weekNumber: saved.weekNumber,
          recovery: saved.recoveryStatus,
          exercises: saved.exercises.length
        });
        const duration = metrics.measure("session-save", "session-save-start");
        logger.debug("Session save performance", { duration: `${duration?.toFixed(2)}ms` });
        screenReader.announce(`Workout completed successfully. Session ${saved.sessionNumber} saved.`, "assertive");
        timer.stop();
        haptics.success();
        state.completeSession();
        render();
      } catch (error) {
        logger.error("Failed to save session", { sessionId: state.activeSession?.id, error: error.message });
        logger.error("Error finishing session:", error);
        if (error.message === "STORAGE_FULL") {
          screenReader.announce(i18n.t("errors.storageFull"), "assertive");
          await modal.show({ title: i18n.t("modal.error"), text: i18n.t("errors.storageFull") });
          return;
        }
        screenReader.announce(i18n.t("errors.saveFailed"), "assertive");
        await modal.show({ title: i18n.t("modal.error"), text: i18n.t("errors.saveFailed") });
      }
    },

    skipTimer() {
      haptics.heavy();
      timer.stop();
    },

    skipRest() {
      state.skipRest();
      render();
    },

    startCardio() {
      timer.start(CONST.CARDIO_TIMER_SECONDS);
    },

    loadMoreHistory() {
      try {
        const current = state.historyLimit || CONST.HISTORY_PAGINATION_LIMIT;
        const next = current + CONST.HISTORY_PAGINATION_LIMIT;
        const sessions = storage.getSessions();
        const list = documentRef.getElementById("history-list");
        if (!list) {
          logger.warn("History list container not found, falling back to full render");
          state.resetHistoryLimit(next);
          render();
          return;
        }
        let html = "";
        const start = sessions.length - 1 - current;
        let count = 0;
        for (let index = start; index >= 0 && count < CONST.HISTORY_PAGINATION_LIMIT; index--, count++) html += generateSessionCard(sessions[index]);
        if (html) list.insertAdjacentHTML("beforeend", html);
        state.resetHistoryLimit(next);
        const button = documentRef.getElementById("load-more-btn");
        if (button) {
          if (state.historyLimit >= sessions.length) {
            button.remove();
            const summaries = documentRef.querySelectorAll("summary");
            summaries[summaries.length - 1]?.focus();
          } else {
            button.textContent = i18n.t("history.loadMore", { remaining: sessions.length - state.historyLimit });
            button.focus();
          }
        }
      } catch (error) {
        logger.error("Error loading more history:", error);
        render();
      }
    },

    viewProtocol() {
      state.setView("protocol");
      render();
    },

    closeProtocol() {
      state.setView("settings");
      render();
    },

    async del(id) {
      if (await modal.show({ type: "confirm", title: i18n.t("modal.delete"), danger: true })) {
        try {
          storage.deleteSession(id);
          render();
        } catch (error) {
          modal.show({ title: i18n.t("modal.error"), text: error.message });
        }
      }
    },

    async wipe() {
      if (!await modal.show({ type: "confirm", title: i18n.t("modal.reset"), text: "A complete Flexx backup will download before app-owned data, caches, and worker registration are cleared.", danger: true })) return;
      try {
        storage.flushDraft();
        storage.flushPersistence();
        storage.exportData();
        await clearCaches("flexx-");
        if ("serviceWorker" in navigatorRef) {
          const registrations = await navigatorRef.serviceWorker.getRegistrations();
          const appScope = new URL("./", locationRef.href).pathname;
          await Promise.all(registrations.filter(registration => new URL(registration.scope).pathname === appScope).map(registration => registration.unregister()));
        }
        storage.reset();
      } catch (error) {
        await modal.show({ title: i18n.t("modal.error"), text: `Reset stopped before deletion: ${error.message}` });
      }
    },

    imp(element) {
      const file = element.files[0];
      if (!file) return;
      const maximum = CONST.MAX_IMPORT_FILE_SIZE_MB * 1024 * 1024;
      if (file.size > maximum) {
        modal.show({ type: "error", title: "File Too Large", text: CONST.ERROR_MESSAGES.IMPORT_FILE_TOO_LARGE });
        element.value = "";
        return;
      }
      const reader = new FileReaderCtor();
      reader.onload = async event => {
        const result = storage.validateImport(event.target.result);
        if (!result.valid) {
          modal.show({ title: i18n.t("modal.invalidFile"), text: result.error || "Invalid file format." });
          return;
        }
        if (await modal.show({ type: "confirm", title: i18n.t("settings.restoreData"), text: i18n.t("modal.importConfirm", { count: result.sessions.length }) })) {
          try {
            storage.applyImport(result.sessions);
          } catch (error) {
            await modal.show({ title: i18n.t("modal.error"), text: error.message || i18n.t("errors.saveFailed") });
          }
        }
        element.value = "";
      };
      reader.readAsText(file);
    }
  };

  return Object.freeze(commands);
}
