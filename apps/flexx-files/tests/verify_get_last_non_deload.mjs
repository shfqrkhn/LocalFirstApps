
import assert from 'assert';
import { Calculator } from '../js/core.js';
import * as CONST from '../js/constants.js';

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
global.console = { ...console, warn: noop, info: noop, debug: noop };

function runTests() {
    process.stdout.write('Running getLastNonDeloadExercise correctness tests...\n');

    const exerciseId = 'squat';
    let sessions = [];

    // 1. Empty sessions
    process.stdout.write('Test 1: Empty sessions\n');
    assert.strictEqual(Calculator.getLastNonDeloadExercise(exerciseId, sessions), null);

    // 2. Single non-deload session
    process.stdout.write('Test 2: Single non-deload session\n');
    sessions = [...sessions, {
        sessionNumber: 1, // Week 1 (non-deload)
        exercises: [{ id: 'squat', weight: 100, completed: true, skipped: false }]
    }];
    let result = Calculator.getLastNonDeloadExercise(exerciseId, sessions);
    assert.ok(result);
    assert.strictEqual(result.weight, 100);

    // 3. Add a deload session
    process.stdout.write('Test 3: Add a deload session\n');
    sessions = [...sessions, {
        sessionNumber: CONST.SESSIONS_PER_WEEK * CONST.DELOAD_WEEK_INTERVAL, // Deload week (e.g. session 18)
        exercises: [{ id: 'squat', weight: 60, completed: true, skipped: false }]
    }];
    result = Calculator.getLastNonDeloadExercise(exerciseId, sessions);
    assert.ok(result);
    assert.strictEqual(result.weight, 100, 'Should skip deload session');

    // 4. Add another non-deload session
    process.stdout.write('Test 4: Add another non-deload session\n');
    sessions = [...sessions, {
        sessionNumber: CONST.SESSIONS_PER_WEEK * CONST.DELOAD_WEEK_INTERVAL + 1, // Next week (non-deload)
        exercises: [{ id: 'squat', weight: 105, completed: true, skipped: false }]
    }];
    result = Calculator.getLastNonDeloadExercise(exerciseId, sessions);
    assert.ok(result);
    assert.strictEqual(result.weight, 105, 'Should find latest non-deload session');

    // 5. Skipped exercise in non-deload session
    process.stdout.write('Test 5: Skipped exercise in non-deload session\n');
    sessions = [...sessions, {
        sessionNumber: 20,
        exercises: [{ id: 'squat', weight: 110, completed: false, skipped: true }]
    }];
    result = Calculator.getLastNonDeloadExercise(exerciseId, sessions);
    assert.ok(result);
    assert.strictEqual(result.weight, 105, 'Should skip skipped exercise');

    // 6. Alternative name
    process.stdout.write('Test 6: Alternative name\n');
    sessions = [...sessions, {
        sessionNumber: 21,
        exercises: [{ id: 'squat_alt', weight: 115, completed: true, skipped: false, usingAlternative: true, altName: 'squat' }]
    }];
    result = Calculator.getLastNonDeloadExercise('squat', sessions);
    assert.ok(result);
    assert.strictEqual(result.weight, 115, 'Should handle alternative names');

    process.stdout.write('All tests passed!\n');
}

try {
    runTests();
} catch (e) {
    process.stdout.write('Test failed!\n');
    console.error(e);
    process.exit(1);
}
