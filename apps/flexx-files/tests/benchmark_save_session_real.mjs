
import { performance } from 'perf_hooks';
import { Storage } from '../js/core.js';
import { EXERCISE_MAP } from '../js/config.js';

// === MOCK ENVIRONMENT ===
global.localStorage = {
    store: {},
    getItem(k) { return this.store[k]; },
    setItem(k, v) { this.store[k] = v; },
    removeItem(k) { delete this.store[k]; }
};
global.window = global;
global.window.location = { pathname: '/test', href: 'http://localhost/test', reload: () => {} };
// Sync execution for benchmark
global.window.requestIdleCallback = (cb) => cb();
global.window.cancelIdleCallback = (id) => {};
global.window.setTimeout = (cb) => cb();
global.window.clearTimeout = (id) => {};

// Mock Alert/Confirm
global.window.alert = () => {};
global.window.confirm = () => true;

// Mock Logger to suppress noise
const noop = () => {};
global.console = { ...console, warn: noop, info: noop, debug: noop, error: noop };

// Mock Security Audit Log
import { AuditLog } from '../js/security.js';
AuditLog.log = () => {};

// === BENCHMARK SETUP ===
console.log('Preparing SaveSession Benchmark...');

Storage._sessionCache = null;
global.localStorage.store['flexx_sessions_v3'] = '[]'; // Start empty

// Create a large session
const SESSION_SIZE = 5000;
const exercises = [];
const keys = Array.from(EXERCISE_MAP.keys());

for (let i = 0; i < SESSION_SIZE; i++) {
    const key = keys[i % keys.length];
    const cfg = EXERCISE_MAP.get(key);
    exercises.push({
        id: key,
        name: cfg.name,
        weight: 100,
        setsCompleted: 3,
        completed: true,
        usingAlternative: false,
        skipped: false
    });
}

const session = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    date: new Date().toISOString(),
    recoveryStatus: 'green',
    exercises: exercises,
    warmup: [],
    cardio: null,
    decompress: null
};

console.log(`Session created with ${SESSION_SIZE} exercises.`);

// === RUN BENCHMARK ===
const ITERATIONS = 100;
console.log(`Running ${ITERATIONS} iterations...`);

const start = performance.now();

for (let i = 0; i < ITERATIONS; i++) {
    try {
        Storage.saveSession(session);
        // Force commit/flush immediately to reset transaction state
        Storage.flushPersistence();
        // Also manually reset just in case flush failed or logic changed
        if (Storage.Transaction.inProgress) Storage.Transaction.rollback();
    } catch (e) {
        // Original console
        process.stdout.write(`Save failed: ${e.message}\n`);
        break;
    }
}

const end = performance.now();
const totalTime = end - start;
const avgTime = totalTime / ITERATIONS;

console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
console.log(`Average Time per saveSession: ${avgTime.toFixed(4)}ms`);
