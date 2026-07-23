import { Calculator, Storage, Validator } from "./js/core.js";
import { STRENGTH_CALCULATIONS_VERSION } from "./strength/calculations.js";
import {
  LIFEOS_STRENGTH_PREVIEW_VERSION,
  STRENGTH_RECOVERY_VERSION,
  createLifeOsStrengthPreview,
  normalizeStrengthBackup
} from "./strength/recovery.js";
import { STRENGTH_READINESS_VERSION } from "./strength/readiness.js";
import {
  STRENGTH_STORAGE_BOUNDARY,
  STRENGTH_STORAGE_CONTRACT_VERSION,
  STRENGTH_STORAGE_INVENTORY,
  validateStrengthStorageContract
} from "./strength/storage-contract.js";
import { Sanitizer, Validator as SecurityValidator } from "./js/security.js";

export const STRENGTH_ADAPTER_VERSION = "1.0.0";
export const STRENGTH_APP_OWNER = "flexx-files";

const recoveryDependencies = Object.freeze({
  validateImportData: data => SecurityValidator.validateImportData(data),
  scrubSession: session => Sanitizer.scrubSession(session)
});

export const StrengthStorage = Storage;
export const StrengthCalculator = Calculator;
export const StrengthReadiness = Validator;

export function normalizeFlexxBackup(input) {
  return normalizeStrengthBackup(input, recoveryDependencies);
}

export function createStrengthLifeOsPreview(input, { at } = {}) {
  return createLifeOsStrengthPreview(input, { at, dependencies: recoveryDependencies });
}

export function createStrengthFoundationSnapshot() {
  validateStrengthStorageContract();
  return {
    adapterVersion: STRENGTH_ADAPTER_VERSION,
    owner: STRENGTH_APP_OWNER,
    modules: {
      calculations: STRENGTH_CALCULATIONS_VERSION,
      readiness: STRENGTH_READINESS_VERSION,
      recovery: STRENGTH_RECOVERY_VERSION,
      storage: STRENGTH_STORAGE_CONTRACT_VERSION,
      preview: LIFEOS_STRENGTH_PREVIEW_VERSION
    },
    storage: { ...STRENGTH_STORAGE_BOUNDARY, inventory: structuredClone(STRENGTH_STORAGE_INVENTORY) },
    boundaries: {
      route: "apps/flexx-files/",
      canonicalUi: "flexx-files",
      lifeOsDataAccess: "none",
      migration: false,
      dualWrite: false,
      mutationFromPreview: false
    }
  };
}

export {
  LIFEOS_STRENGTH_PREVIEW_VERSION,
  STRENGTH_CALCULATIONS_VERSION,
  STRENGTH_READINESS_VERSION,
  STRENGTH_RECOVERY_VERSION,
  STRENGTH_STORAGE_BOUNDARY,
  STRENGTH_STORAGE_CONTRACT_VERSION,
  STRENGTH_STORAGE_INVENTORY,
  validateStrengthStorageContract
};
