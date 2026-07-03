
import { Storage } from '../js/core.js';
import * as CONST from '../js/constants.js';

// Setup Mock Environment
const localStorageMock = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, value) { this.store[key] = value; },
    removeItem(key) { delete this.store[key]; }
};
global.localStorage = localStorageMock;
global.window = global;
global.window.location = { pathname: '/test' };
global.console = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: () => {}
};

function assert(condition, message) {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
}

async function run() {
    console.log("=== Verify SaveDraft Correctness ===");

    const session1 = { id: 's1', val: 1 };
    const session2 = { id: 's2', val: 2 };

    // 1. Initial State
    assert(Storage._draftCache === null, 'Cache starts null');

    // 2. Save Draft 1
    Storage.saveDraft(session1);
    assert(Storage._draftCache === session1, 'Cache updated immediately');
    assert(!localStorageMock.store[Storage.KEYS.DRAFT], 'Storage not written yet (debounce)');

    // 3. Save Draft 2 (Rapid update)
    Storage.saveDraft(session2);
    assert(Storage._draftCache === session2, 'Cache updated to session 2');

    // 4. Flush
    Storage.flushDraft();
    const stored = JSON.parse(localStorageMock.store[Storage.KEYS.DRAFT]);
    assert(stored.id === 's2', 'Storage updated after flush');
    assert(Storage._pendingDraftWrite === null, 'Timer cleared after flush');

    // 5. Clear Draft
    Storage.saveDraft(session1); // Pending write
    assert(Storage._pendingDraftWrite !== null, 'Timer active');
    Storage.clearDraft();
    assert(Storage._draftCache === null, 'Cache cleared');
    assert(localStorageMock.store[Storage.KEYS.DRAFT] === undefined, 'Storage cleared');
    assert(Storage._pendingDraftWrite === null, 'Timer cancelled');

    console.log("PASS: All checks passed.");
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
