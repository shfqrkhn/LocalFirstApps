import {
  REFLECTION_ASSESSMENT_DEFINITIONS,
  REFLECTION_ASSESSMENT_URLS,
  REFLECTION_DEFINITIONS_VERSION,
  validateReflectionAssessmentDefinition,
  validateReflectionCatalog
} from "./reflection/definitions.js";
import {
  LIFEOS_REFLECTION_PREVIEW_VERSION,
  NOODLE_BACKUP_COMPAT_VERSION,
  createLifeOsReflectionPreview,
  normalizeNoodleBackup,
  persistentNoodleBackupState
} from "./reflection/backup.js";

export * from "./reflection/scoring.js";

export const REFLECTION_ADAPTER_VERSION = "1.0.0";
export const REFLECTION_APP_OWNER = "noodle-nudge";

export {
  LIFEOS_REFLECTION_PREVIEW_VERSION,
  NOODLE_BACKUP_COMPAT_VERSION,
  REFLECTION_ASSESSMENT_DEFINITIONS,
  REFLECTION_ASSESSMENT_URLS,
  REFLECTION_DEFINITIONS_VERSION,
  createLifeOsReflectionPreview,
  normalizeNoodleBackup,
  persistentNoodleBackupState,
  validateReflectionAssessmentDefinition,
  validateReflectionCatalog
};
