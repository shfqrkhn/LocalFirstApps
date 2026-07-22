import {
  LIFEOS_MODULES,
  LIFEOS_SHELL_CONTRACT_VERSION,
  LIFEOS_SHELL_ID,
  LIFEOS_SHELL_NAME,
  validateLifeOsShellModules
} from "./modules/lifeos-shell.js";
import { assertReceiptCanRollback, errorMessage, nowIso, validationReport } from "./omnicore-adapter.js";

export const LIFEOS_ADAPTER_VERSION = "1.0.0";
export const LIFEOS_APP_OWNER = "healthos";

export function createLifeOsShellSnapshot({ at = nowIso() } = {}) {
  const report = validationReport(validateLifeOsShellModules());
  return {
    contractVersion: LIFEOS_SHELL_CONTRACT_VERSION,
    id: LIFEOS_SHELL_ID,
    name: LIFEOS_SHELL_NAME,
    owner: LIFEOS_APP_OWNER,
    generatedAt: at,
    modules: structuredClone(LIFEOS_MODULES),
    validation: report,
    boundaries: {
      storage: "app-owned",
      transfer: "explicit-preview-only",
      crossAppRead: false,
      crossAppWrite: false,
      hiddenSync: false
    }
  };
}

export function lifeOsReceiptCapability(receipt) {
  try {
    assertReceiptCanRollback(receipt);
    return { canRollback: true, issues: [] };
  } catch (error) {
    return { canRollback: false, issues: [errorMessage(error)] };
  }
}

export {
  LIFEOS_MODULES,
  LIFEOS_SHELL_CONTRACT_VERSION,
  LIFEOS_SHELL_ID,
  LIFEOS_SHELL_NAME,
  validateLifeOsShellModules
};
