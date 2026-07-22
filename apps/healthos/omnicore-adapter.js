import { OmniCoreError, errorMessage, assertExpectedRevision, assertNoIssues, validationReport } from "../../shared/omnicore/errors.js";
import { canonicalJson, sha256 } from "../../shared/omnicore/integrity.js";
import { abortTransaction, requestResult as coreRequestResult, trackTransactionRequest, transactionDone as coreTransactionDone } from "../../shared/omnicore/indexeddb.js";
import { assertReceiptCanRollback, rolledBackReceipt } from "../../shared/omnicore/receipts.js";
import { isIsoInstant, nowIso, resolvedTimezone } from "../../shared/omnicore/time.js";

export const OMNICORE_ADAPTER_VERSION = "1.0.0";
export const OMNICORE_APP_OWNER = "healthos";

export function requestResult(request, fallbackMessage = "HealthOS storage request failed.") {
  return coreRequestResult(request, fallbackMessage);
}

export function transactionDone(transaction, options = {}) {
  return coreTransactionDone(transaction, {
    failureMessage: "HealthOS storage transaction failed.",
    abortMessage: "HealthOS storage transaction was aborted.",
    ...options
  });
}

export {
  abortTransaction,
  OmniCoreError,
  assertExpectedRevision,
  assertNoIssues,
  assertReceiptCanRollback,
  canonicalJson,
  errorMessage,
  isIsoInstant,
  nowIso,
  resolvedTimezone,
  rolledBackReceipt,
  sha256,
  trackTransactionRequest,
  validationReport
};
