function transactionError(transaction, fallback = "IndexedDB transaction failed.") {
  return transaction.error || new Error(fallback);
}

export function createNoodleStorage({ indexedDB, config, onError = () => {} }) {
  const { dbName, dbVersion, dbStoreName } = config.database;
  let databasePromise;

  function open() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(dbStoreName)) database.createObjectStore(dbStoreName);
      };
      request.onsuccess = (event) => {
        const database = event.target.result;
        database.onversionchange = () => {
          database.close();
          databasePromise = undefined;
        };
        resolve(database);
      };
      request.onerror = () => {
        databasePromise = undefined;
        onError(request.error);
        reject(request.error);
      };
    });
    return databasePromise;
  }

  async function getAppState() {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([dbStoreName], "readonly");
      const request = transaction.objectStore(dbStoreName).get("appState");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onabort = () => reject(transactionError(transaction));
    });
  }

  async function mutate(mutator) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([dbStoreName], "readwrite");
      const store = transaction.objectStore(dbStoreName);
      const request = store.get("appState");
      let result;
      let settled = false;
      const fail = (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      request.onerror = () => fail(request.error);
      request.onsuccess = () => {
        try {
          result = mutator(request.result || {});
          store.put(structuredClone(result), "appState");
        } catch (error) {
          try { transaction.abort(); } catch {}
          fail(error);
        }
      };
      transaction.oncomplete = () => {
        if (settled) return;
        settled = true;
        resolve(structuredClone(result));
      };
      transaction.onerror = () => fail(transactionError(transaction));
      transaction.onabort = () => fail(transactionError(transaction, "IndexedDB transaction was aborted."));
    });
  }

  function mergeAppState(patch) {
    return mutate((current) => ({ ...current, ...structuredClone(patch) }));
  }

  function replaceAppState(nextState) {
    return mutate(() => structuredClone(nextState));
  }

  function commitAssessment({ assessmentId, answerRecord, results, historyEntry }) {
    return mutate((current) => {
      const userAnswers = { ...(current.userAnswers || {}), [assessmentId]: structuredClone(answerRecord) };
      const userResults = { ...(current.userResults || {}), [assessmentId]: structuredClone(results) };
      const userHistory = {
        ...(current.userHistory || {}),
        [assessmentId]: [...(current.userHistory?.[assessmentId] || []), structuredClone(historyEntry)].slice(-50)
      };
      return { ...current, userAnswers, userResults, userHistory };
    });
  }

  async function clear() {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([dbStoreName], "readwrite");
      transaction.objectStore(dbStoreName).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transactionError(transaction));
      transaction.onabort = () => reject(transactionError(transaction, "IndexedDB clear was aborted."));
    });
  }

  return Object.freeze({ clear, commitAssessment, getAppState, mergeAppState, replaceAppState });
}
