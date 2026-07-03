
import { Calculator } from '../js/core.js';
import * as CONST from '../js/constants.js';

// === MOCK ENV ===
const store = {};
global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null
};

// === TEST HELPER ===
function createSession(date, recovery, exercises = []) {
    return {
        id: crypto.randomUUID(),
        date: date.toISOString(),
        recoveryStatus: recovery,
        sessionNumber: 1,
        exercises: exercises
    };
}

// === VERIFICATION ===
async function runTest() {
    console.log('Verifying Calculator Optimization (O(N) -> O(1))...');

    // 1. Setup Data
    const sessions = [];
    const exerciseId = 'hinge';
    const numSessions = 50;

    for (let i = 0; i < numSessions; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (numSessions - i));

        const ex = {
            id: exerciseId,
            name: 'Deadlift',
            weight: 100 + i * 5,
            completed: true,
            usingAlternative: false,
            skipped: false
        };

        sessions.push(createSession(date, i % 2 === 0 ? 'green' : 'yellow', [ex]));
    }

    // Assign session numbers
    sessions.forEach((s, i) => {
        s.sessionNumber = i + 1;
        s.weekNumber = Math.ceil((i + 1) / 3);
    });

    console.log(`Created ${sessions.length} sessions.`);

    // 2. Measure Performance (Baseline)
    const start = process.hrtime();
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
        // Force lookup (ensure cache is used if available, or scan if not)
        // Note: Calculator uses WeakMap cache keyed by sessions array.
        // We reuse the same array instance here, so subsequent calls should hit cache.
        const status = Calculator.getLastRecoveryStatus(exerciseId, sessions);
        if (status !== (sessions[sessions.length - 1].recoveryStatus)) {
            throw new Error(`Correctness Check Failed: Expected ${sessions[sessions.length - 1].recoveryStatus}, got ${status}`);
        }
    }

    const end = process.hrtime(start);
    const timeInMs = (end[0] * 1000 + end[1] / 1e6).toFixed(2);
    console.log(`Performance (10k ops): ${timeInMs}ms`);

    // 3. Verify Rollback Logic (Cache Invalidation)
    console.log('Verifying Rollback Logic...');

    // Simulate removing last session (rollback)
    const originalLastSession = sessions[sessions.length - 1];
    const newSessions = sessions.slice(0, sessions.length - 1);

    // This should trigger _ensureCache with "Remove Last" logic
    // Before optimization, it might trigger full scan or partial scan.
    // After optimization, it should set lastSession = null and fallback to scan.

    const newStatus = Calculator.getLastRecoveryStatus(exerciseId, newSessions);
    const expectedStatus = sessions[sessions.length - 2].recoveryStatus; // The previous one

    if (newStatus !== expectedStatus) {
        throw new Error(`Rollback Check Failed: Expected ${expectedStatus}, got ${newStatus}`);
    }
    console.log('Rollback Logic Verified.');

    console.log('SUCCESS: All checks passed.');
}

// Mock crypto
Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        })
    },
    writable: true
});

runTest().catch(e => {
    console.error(e);
    process.exit(1);
});
