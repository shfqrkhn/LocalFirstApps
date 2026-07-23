import { OmniCoreError } from "./errors.js";
import { nowIso } from "./time.js";

export const OMNICORE_RECEIPTS_VERSION = "1.0.0";

export function assertReceiptCanRollback(receipt, {
  missingMessage = "Import receipt not found.",
  alreadyRolledBackMessage = "This import was already rolled back."
} = {}) {
  if (!receipt) throw new OmniCoreError("RECEIPT_NOT_FOUND", missingMessage);
  if (receipt.status !== "applied") throw new OmniCoreError("RECEIPT_ALREADY_ROLLED_BACK", alreadyRolledBackMessage);
  return receipt;
}

export function rolledBackReceipt(receipt, { at = nowIso() } = {}) {
  return { ...structuredClone(receipt), status: "rolled-back", rolledBackAt: at };
}
