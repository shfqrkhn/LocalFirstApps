
import { Calculator } from '../js/core.js';
import { EXERCISES } from '../js/config.js';

// Mock localStorage if needed (though we try to avoid using Storage directly if possible)
if (typeof global !== 'undefined') {
    global.localStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        length: 0,
        key: () => null
    };
    global.window = { location: { pathname: '/test', href: 'http://localhost/test' } };
    global.console = {
        ...console,
        // log: () => {}, // Silence logs
        warn: () => {},
        error: console.error
    };
}

function generateSession(id, sessionNumber, exercisesConfig) {
    // Only include the first exercise to force scanning for others
    const subset = exercisesConfig.slice(0, 1);

    const exercises = subset.map(ex => ({
        id: ex.id,
        completed: true,
        weight: 100 + (sessionNumber % 10) * 5,
        setsCompleted: 3,
        sets: 3,
        reps: 10,
        skipped: false,
        usingAlternative: false
    }));

    return {
        id: `session_${id}`,
        date: new Date().toISOString(),
        sessionNumber: sessionNumber,
        weekNumber: Math.ceil(sessionNumber / 3),
        exercises: exercises
    };
}

async function runBenchmark() {
    console.log("Starting Benchmark...");

    // Warmup
    const exercises = EXERCISES;
    let sessions = [];

    // Benchmark 1: Sequential Append (Incremental)
    Calculator._cache = new WeakMap();
    Calculator._lastSessions = null;
    Calculator._lastLookup = null;

    const COUNT = 2000;
    const sessionObjects = [];

    for (let i = 0; i < COUNT; i++) {
        sessionObjects.push(generateSession(i, i + 1, exercises));
    }

    const start = performance.now();

    for (let i = 0; i < COUNT; i++) {
        sessions = [...sessions, sessionObjects[i]];
        Calculator._ensureCache(sessions);
    }

    const end = performance.now();
    const duration = end - start;

    console.log(`Benchmark: Sequential Append of ${COUNT} sessions (Partial Exercises)`);
    console.log(`Total Time: ${duration.toFixed(2)} ms`);
    console.log(`Average Time per op: ${(duration / COUNT).toFixed(4)} ms`);

    // Benchmark 2: Full Rebuild (Simulate page reload with large history)
    Calculator._cache = new WeakMap();
    Calculator._lastSessions = null;
    Calculator._lastLookup = null;

    const startRebuild = performance.now();
    Calculator._ensureCache(sessions);
    const endRebuild = performance.now();

    console.log(`Benchmark: Full Rebuild of ${COUNT} sessions (Partial Exercises)`);
    console.log(`Total Time: ${(endRebuild - startRebuild).toFixed(2)} ms`);

    // Benchmark 3: Non-Incremental Update
    Calculator._cache = new WeakMap();
    Calculator._lastSessions = sessions.slice(0, 100);
    Calculator._ensureCache(sessions.slice(0, 100));

    const startJump = performance.now();
    Calculator._ensureCache(sessions);
    const endJump = performance.now();

    console.log(`Benchmark: Large Jump (100 -> ${COUNT} sessions) (Partial Exercises)`);
    console.log(`Total Time: ${(endJump - startJump).toFixed(2)} ms`);

    // Benchmark 4: Identity Change (Same Content)
    // This should be optimized by content equality check.
    Calculator._ensureCache(sessions); // Ensure hot
    const sessionsCopy = [...sessions]; // Shallow copy

    const startIdentity = performance.now();
    Calculator._ensureCache(sessionsCopy);
    const endIdentity = performance.now();

    console.log(`Benchmark: Identity Change (Same Content)`);
    console.log(`Total Time: ${(endIdentity - startIdentity).toFixed(2)} ms`);

    // Benchmark 5: Prefix Change (First session modified)
    // This MUST NOT be optimized (should do full scan or safe update).
    // The equality check should fail.

    const sessionsPrefixChange = [ { ...sessions[0], id: 'modified' }, ...sessions.slice(1) ];

    const startPrefix = performance.now();
    Calculator._ensureCache(sessionsPrefixChange);
    const endPrefix = performance.now();

    console.log(`Benchmark: Prefix Change (Should be slower / Correctness Check)`);
    console.log(`Total Time: ${(endPrefix - startPrefix).toFixed(2)} ms`);
}

runBenchmark().catch(console.error);
