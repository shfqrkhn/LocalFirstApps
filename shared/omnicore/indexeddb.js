export const OMNICORE_INDEXEDDB_VERSION = "1.0.0";

const transactionRequestErrors = new WeakMap();

export function requestResult(request, fallbackMessage = "IndexedDB request failed.") {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(fallbackMessage));
  });
}

export function trackTransactionRequest(transaction, request) {
  request.addEventListener("error", () => transactionRequestErrors.set(transaction, request.error), { once: true });
  return request;
}

export function transactionDone(transaction, {
  failureMessage = "IndexedDB transaction failed.",
  abortMessage = "IndexedDB transaction aborted."
} = {}) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || transactionRequestErrors.get(transaction) || new Error(failureMessage));
    transaction.onabort = () => reject(transaction.error || transactionRequestErrors.get(transaction) || new Error(abortMessage));
  });
}

export function abortTransaction(transaction) {
  if (transaction?.readyState !== "done") {
    try { transaction.abort(); } catch {}
  }
}
