
import { Storage, Calculator, Validator } from '../js/core.js';
import * as CONST from '../js/constants.js';
import { EXERCISES, WARMUP, CARDIO_OPTIONS, DECOMPRESSION } from '../js/config.js';

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

global.setTimeout = (cb) => { cb(); return 1; };
global.clearTimeout = () => {};

global.window = {
    requestIdleCallback: (cb) => cb(),
    cancelIdleCallback: () => {},
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    location: { reload: () => {}, pathname: '/test', href: 'http://localhost/test' }
};

global.console = {
    ...console,
    log: console.log,
    info: () => {},
    debug: () => {},
    warn: console.warn,
    error: console.error
};

// Mock Date for simulation
const realDate = Date;
let mockNow = realDate.now();

global.Date = class extends realDate {
    constructor(...args) {
        if (args.length === 0) return new realDate(mockNow);
        return new realDate(...args);
    }
    static now() {
        return mockNow;
    }
};

// Mock crypto for UUIDs
Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        })
    },
    writable: true
});

// === SIMULATION CONSTANTS ===
const MONTHS_TO_SIMULATE = 24;
const SESSIONS_PER_WEEK = 3;
const TOTAL_WEEKS = MONTHS_TO_SIMULATE * 4.33;
const TARGET_SESSIONS = Math.ceil(TOTAL_WEEKS * SESSIONS_PER_WEEK);

// === HELPER FUNCTIONS ===
function createSession(date, recovery) {
    return {
        id: crypto.randomUUID(),
        date: date.toISOString(),
        recoveryStatus: recovery,
        exercises: [],
        warmup: WARMUP.map(w => ({ id: w.id, completed: false, altUsed: '' })),
        cardio: { type: CARDIO_OPTIONS[0].name, completed: false },
        decompress: DECOMPRESSION.map(d => ({ id: d.id, val: null, completed: false, altUsed: '' }))
    };
}

// Mimic a page reload by clearing the in-memory cache
function simulateReload() {
    Storage._sessionCache = null;
    // We don't clear localStorage, that's persistent
}

async function runSimulation() {
    console.log(`Starting Comprehensive ${MONTHS_TO_SIMULATE}-month Simulation...`);

    const startDate = new realDate();
    startDate.setFullYear(startDate.getFullYear() - 2);
    let currentDate = new Date(startDate);
    mockNow = currentDate.getTime();

    let completedSessions = 0;
    let attemptedSessions = 0;
    let errors = 0;

    // Reset storage
    Storage.reset();

    // We iterate by "opportunities" to workout, not fixed session count
    // Assuming 3 opportunities per week for 24 months
    const opportunities = TARGET_SESSIONS;

    for (let i = 0; i < opportunities; i++) {
        attemptedSessions++;

        // 1. Simulate Life Events (Gaps)
        // 5% chance of missing a week (vacation, busy, etc)
        if (Math.random() < 0.05) {
            // Skip 7 days
            currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            mockNow = currentDate.getTime();
            // console.log(`[${i}] Missed week due to life event.`);
            continue;
        }

        mockNow = currentDate.getTime();

        // 2. Determine Recovery
        // 10% Red (Skip), 20% Yellow (Reduced), 70% Green
        const rVal = Math.random();
        let recovery = 'green';
        if (rVal < 0.10) recovery = 'red';
        else if (rVal < 0.30) recovery = 'yellow';

        if (recovery === 'red') {
            // User skips workout, maybe walks. Time advances.
            // console.log(`[${i}] Red recovery. Resting.`);
            const hoursToAdd = 48; // Standard gap
            currentDate = new Date(currentDate.getTime() + hoursToAdd * 60 * 60 * 1000);
            continue;
        }

        // 3. Start Session
        // Check Validator (might flag long gap)
        const check = Validator.canStartWorkout();

        let session = createSession(currentDate, recovery);
        Storage.saveDraft(session);

        // 4. Simulate Context Loss (Reload) during Warmup
        if (Math.random() < 0.1) {
            simulateReload();
            const draft = Storage.loadDraft();
            if (!draft) {
                console.error(`FAIL: Draft lost after reload at warmup step ${i}`);
                errors++;
            } else {
                session = draft; // Resume
            }
        }

        // Complete Warmup
        session.warmup.forEach(w => w.completed = true);
        Storage.saveDraft(session);

        // 5. Lifting Phase
        const sessions = Storage.getSessions();
        session.exercises = EXERCISES.map(ex => {
            let weight = Calculator.getRecommendedWeight(ex.id, recovery, sessions);

            // Calibration Logic
            if (weight === 0) weight = 45;

            // Long Gap Logic applied by human if Validator warned?
            if (check.warning) {
                weight = Math.round((weight * 0.9) / 2.5) * 2.5;
            }

            const isSuccess = Math.random() > 0.1; // 90% success rate
            const setsCompleted = isSuccess ? ex.sets : Math.floor(Math.random() * ex.sets);

            return {
                id: ex.id,
                name: ex.name,
                weight: weight,
                setsCompleted: setsCompleted,
                completed: setsCompleted === ex.sets,
                usingAlternative: false,
                skipped: false
            };
        });
        Storage.saveDraft(session);

        // 6. Simulate Context Loss (Reload) mid-workout
        if (Math.random() < 0.1) {
            simulateReload();
            const draft = Storage.loadDraft();
            if (!draft || !draft.exercises || draft.exercises.length === 0) {
                console.error(`FAIL: Exercises lost after reload at step ${i}`);
                errors++;
            } else {
                session = draft;
            }
        }

        // 7. Cardio & Decompress
        session.cardio.completed = true;
        session.decompress.forEach(d => d.completed = true);

        // 8. Finish
        Storage.saveSession(session);
        completedSessions++;

        // Advance time: 48h + random small variance
        currentDate = new Date(currentDate.getTime() + (48 + Math.random() * 4) * 60 * 60 * 1000);
        mockNow = currentDate.getTime();
    }

    // Final Analysis
    const history = Storage.getSessions();
    console.log(`Simulation Complete.`);
    console.log(`Attempts: ${attemptedSessions}`);
    console.log(`Completed Sessions: ${completedSessions} (History Size: ${history.length})`);

    if (history.length !== completedSessions) {
        console.error(`FAIL: History mismatch. Storage=${history.length}, Tracker=${completedSessions}`);
        errors++;
    }

    // Check progression
    const firstHinge = history.find(s => s.exercises.some(e => e.id === 'hinge'))?.exercises.find(e => e.id === 'hinge');
    const lastHinge = history[history.length-1]?.exercises.find(e => e.id === 'hinge');

    if (firstHinge && lastHinge) {
        console.log(`Hinge Progress: ${firstHinge.weight}lbs -> ${lastHinge.weight}lbs`);
        if (lastHinge.weight <= firstHinge.weight) {
            console.warn(`WARNING: No progress made. Check logic.`);
        }
    } else {
        console.error("FAIL: Could not find hinge history.");
        errors++;
    }

    if (errors === 0) {
        console.log('SUCCESS: Comprehensive Simulation Passed.');
        process.exit(0);
    } else {
        console.error(`FAIL: ${errors} errors detected.`);
        process.exit(1);
    }
}

runSimulation();
