import { normalizeNoodleBackup, persistentNoodleBackupState } from "../reflection-adapter.js";

export const NOODLE_MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export function backupFilename(now = () => new Date().toISOString()) {
  return `noodle-nudge-backup-${now().split("T")[0]}.json`;
}

export function createBackupDownloader({
  document,
  URL,
  Blob,
  now = () => new Date().toISOString()
}) {
  return function downloadBackup(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = backupFilename(now);
    document.body.appendChild(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
      URL.revokeObjectURL(url);
    }
    return anchor.download;
  };
}

export async function readAndNormalizeBackup(file) {
  if (!file) throw new Error("Import failed: No file selected.");
  if (!file.name.toLowerCase().endsWith(".json")) throw new Error("Import failed: Please choose a .json backup file.");
  if (file.size > NOODLE_MAX_IMPORT_BYTES) throw new Error("Import failed: Backup is too large (max 2MB).");
  return normalizeNoodleBackup(JSON.parse(await file.text()));
}

export function createSettingsController({
  config,
  state,
  storage,
  session,
  logger,
  views,
  navigate,
  downloadBackup,
  reload = () => location.reload(),
  schedule = setTimeout,
  cancelSchedule = clearTimeout,
  now = () => new Date().toISOString()
}) {
  let pendingReset = false;
  let pendingResetTimer;

  async function exportData({ announce = true } = {}) {
    try {
      const filename = downloadBackup(state.snapshot());
      if (announce) views.showToast("📥 Data exported successfully!", "success");
      return filename;
    } catch (error) {
      logger.error("Export failed:", error);
      if (announce) views.showToast("Export failed. Your local data was not changed.", "danger");
      throw error;
    }
  }

  async function importFile(file) {
    try {
      const normalized = await readAndNormalizeBackup(file);
      await storage.replaceAppState(persistentNoodleBackupState(normalized));
      views.showToast("📤 Data imported successfully! The app will now reload.", "success");
      schedule(reload, 1500);
      return normalized;
    } catch (error) {
      logger.error("Import failed:", error);
      const message = error instanceof SyntaxError
        ? "Import failed: Invalid JSON."
        : (error.message.startsWith("Import failed:") ? error.message : `Import failed: ${error.message}`);
      views.showToast(message, "danger");
      throw error;
    }
  }

  async function resetData() {
    if (!pendingReset) {
      pendingReset = true;
      if (pendingResetTimer) cancelSchedule(pendingResetTimer);
      views.showToast("Click Reset All Data again within 5 seconds to permanently delete local data.", "warning");
      pendingResetTimer = schedule(() => { pendingReset = false; }, 5000);
      return { status: "confirmation-required" };
    }
    pendingReset = false;
    if (pendingResetTimer) cancelSchedule(pendingResetTimer);
    views.showLoader();
    try {
      await exportData({ announce: false });
      await storage.clear();
      views.showToast("Data reset complete.", "success");
      schedule(reload, 1500);
      return { status: "reset" };
    } catch (error) {
      logger.error("Reset canceled:", error);
      views.showToast("Reset canceled: a complete backup could not be started. Your local data was preserved.", "danger");
      views.hideLoader();
      return { status: "preserved", error };
    }
  }

  async function fillWithRandomData() {
    if (!config.featureFlags.enableDebugPanel) return;
    const current = state.get();
    const userAnswers = { ...current.userAnswers };
    const userResults = { ...current.userResults };
    const userHistory = { ...(current.userHistory || {}) };
    for (const assessment of Object.values(current.assessments)) {
      const answers = {};
      if ((assessment.interactionType || "likertScale") === "likertScale") {
        for (const question of assessment.questions) {
          const scale = assessment.responseScale;
          answers[question.id] = scale[Math.floor(Math.random() * scale.length)].value;
        }
      } else {
        for (const section of assessment.sections) {
          answers[section.id] = {};
          const available = [...section.items].sort(() => 0.5 - Math.random());
          for (const category of section.categories) {
            answers[section.id][category.id] = [];
            const limit = category.limit === null ? Math.floor(available.length / section.categories.length) : category.limit;
            while (answers[section.id][category.id].length < limit && available.length) answers[section.id][category.id].push(available.pop().id);
          }
        }
      }
      const timestamp = now();
      const results = session.calculateResults(assessment, answers);
      userAnswers[assessment.id] = { answers, timestamp };
      userResults[assessment.id] = results;
      userHistory[assessment.id] = [...(userHistory[assessment.id] || []), { timestamp, results, answers }].slice(-50);
    }
    await state.set({ userAnswers, userResults, userHistory });
    views.showToast("All assessments filled with random data.", "success");
    navigate("assessments");
  }

  return Object.freeze({ exportData, fillWithRandomData, importFile, resetData });
}
