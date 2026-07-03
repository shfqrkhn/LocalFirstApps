
import { performance } from 'perf_hooks';
import { Calculator } from '../js/core.js';

// === MOCK ENVIRONMENT ===
global.localStorage = {
    store: {},
    getItem(k) { return this.store[k]; },
    setItem(k, v) { this.store[k] = v; },
    removeItem(k) { delete this.store[k]; }
};
global.window = global;
global.window.location = { pathname: '/test', href: 'http://localhost/test', reload: () => {} };

// Mock Logger to suppress noise
const noop = () => {};
global.console = { ...console, warn: noop, info: noop, debug: noop, error: noop };

const NUM_SESSIONS = 1000;
const sessions = [];
const exerciseId = 'non_existent';

for (let i = 1; i <= NUM_SESSIONS; i++) {
    sessions.push({
        sessionNumber: i,
        exercises: [
            { id: 'squat', weight: 100 + i, completed: true, skipped: false },
            { id: 'bench', weight: 80 + i, completed: true, skipped: false }
        ]
    });
}

console.log(`Generated ${NUM_SESSIONS} sessions.`);

const ITERATIONS = 10000;
console.log(`Running ${ITERATIONS} iterations of getLastNonDeloadExercise (worst case)...`);

const start = performance.now();
let lastEx;
for (let i = 0; i < ITERATIONS; i++) {
    lastEx = Calculator.getLastNonDeloadExercise(exerciseId, sessions);
}
const end = performance.now();
const totalTime = end - start;

process.stdout.write(`Total Time: ${totalTime.toFixed(2)}ms\n`);
process.stdout.write(`Average Time: ${(totalTime / ITERATIONS).toFixed(6)}ms\n`);
process.stdout.write(`Result weight: ${lastEx ? lastEx.weight : 'null'}\n`);
