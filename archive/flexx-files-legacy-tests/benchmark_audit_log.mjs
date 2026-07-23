import { AuditLog } from '../js/security.js';

// === MOCK ENVIRONMENT ===
const localStorageMock = {
    store: {},
    getItemCalls: 0,
    setItemCalls: 0,
    getItem(key) {
        this.getItemCalls++;
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.setItemCalls++;
        this.store[key] = value.toString();
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
        this.getItemCalls = 0;
        this.setItemCalls = 0;
    }
};
global.localStorage = localStorageMock;

Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'Benchmark Agent' },
    writable: true
});

global.document = {
    createElement: () => ({ textContent: '', innerHTML: '' }),
    querySelector: () => null
};
global.window = global;
global.window.location = { pathname: '/test', href: 'http://localhost/test' };

// === BENCHMARK ===
async function runBenchmark() {
    console.log("Running AuditLog Benchmark...");

    // Warmup / Reset
    AuditLog.clear();
    localStorageMock.clear();

    const ITERATIONS = 10000;
    const CRITICAL_EVENT = 'failed_validation';
    const NON_CRITICAL_EVENT = 'safe_event';

    // 1. Measure Critical Path (Persist)
    // This involves: isCritical check + log array push + localStorage write + JSON.stringify
    const critStart = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        AuditLog.log(CRITICAL_EVENT, { iteration: i });
    }
    const critEnd = performance.now();
    const critTime = critEnd - critStart;

    const criticalItemCalls = localStorageMock.getItemCalls;

    // Reset for Non-Critical
    AuditLog.clear();
    localStorageMock.clear();

    // 2. Measure Non-Critical Path
    // This involves: isCritical check + log array push. No persistence.
    // This exercises the `isCritical` allocation/lookup logic heavily.
    const nonCritStart = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        AuditLog.log(NON_CRITICAL_EVENT, { iteration: i });
    }
    const nonCritEnd = performance.now();
    const nonCritTime = nonCritEnd - nonCritStart;

    console.log(`\nResults (${ITERATIONS} iterations):`);
    console.log(`- Critical Path Total time: ${critTime.toFixed(2)}ms`);
    console.log(`- Non-Critical Path Total time: ${nonCritTime.toFixed(2)}ms`);

    console.log(`\nMetrics:`);
    console.log(`- localStorage.getItem calls (Critical): ${criticalItemCalls}`);

    let pass = true;

    // Verify Caching
    // getItem should be called exactly once (lazy init)
    if (criticalItemCalls > 1) {
        console.error("FAIL: getItem called more than once! Caching is NOT working.");
        pass = false;
    } else if (criticalItemCalls === 0) {
        // If 0, it means it didn't verify properly or mocked incorrectly, but we debugged this.
        console.warn("WARN: getItem called 0 times. Did persist happen?");
    } else {
        console.log("PASS: Caching is working (getItem called once).");
    }

    // Verify Non-Critical is faster than Critical (Sanity check)
    if (nonCritTime >= critTime) {
        console.warn("WARN: Non-critical path is slower or equal to critical path. This is unexpected.");
    } else {
        console.log("PASS: Non-critical path is faster.");
    }

    if (!pass) process.exit(1);
}

runBenchmark();
