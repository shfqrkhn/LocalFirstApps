
import { Storage } from '../js/core.js';
import { EXERCISE_MAP } from '../js/config.js';

// Mock localStorage and window
global.localStorage = {
    store: {},
    getItem(k) { return this.store[k]; },
    setItem(k, v) { this.store[k] = v; },
    removeItem(k) { delete this.store[k]; }
};
global.window = global;
global.window.location = { pathname: '/test', href: 'http://localhost/test', reload: () => {} };
global.window.requestIdleCallback = (cb) => setTimeout(cb, 0);
global.window.cancelIdleCallback = (id) => clearTimeout(id);

// Mock audit log stuff to avoid security errors or side effects if needed
// but likely not needed since we mock localStorage

// Setup
Storage._sessionCache = null;
global.localStorage.store['flexx_sessions_v3'] = '[]'; // Start empty

// Create a session with known exercises
// Note: We depend on 'hinge' and 'push_horz' existing in EXERCISES/EXERCISE_MAP
const hinge = EXERCISE_MAP.get('hinge'); // Trap Bar Deadlift, usually 8 reps in config
const push = EXERCISE_MAP.get('push_horz'); // DB Bench Press, usually 10 reps in config

if (!hinge || !push) {
    console.error('FAIL: Test dependencies missing in EXERCISE_MAP');
    process.exit(1);
}

const session = {
    id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
    date: new Date().toISOString(),
    recoveryStatus: 'green',
    exercises: [
        {
            id: 'hinge',
            name: hinge.name,
            weight: 100,
            setsCompleted: 3,
            completed: true,
            usingAlternative: false,
            skipped: false
        },
        {
            id: 'push_horz',
            name: push.name,
            weight: 50,
            setsCompleted: 3,
            completed: true,
            usingAlternative: false,
            skipped: false
        }
    ],
    warmup: [],
    cardio: null,
    decompress: null
};

// Expected volume calculation:
// Formula: sum + (ex.weight * ex.setsCompleted * reps)
// Hinge: 100 * 3 * 8 = 2400
// Push: 50 * 3 * 10 = 1500
// Total: 3900

try {
    const saved = Storage.saveSession(session);
    console.log(`Calculated Volume: ${saved.totalVolume}`);

    if (saved.totalVolume === 3900) {
        console.log('PASS: Volume calculation correct');
    } else {
        console.error(`FAIL: Expected 3900, got ${saved.totalVolume}`);
        process.exit(1);
    }
} catch (e) {
    console.error('FAIL: Exception during save', e);
    process.exit(1);
}
