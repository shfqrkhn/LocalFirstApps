import { performance } from 'perf_hooks';
import { EXERCISES } from '../js/config.js';

const iterations = 100000;

// Mock active session
const activeSession = {
    exercises: EXERCISES.map(e => ({
        id: e.id,
        weight: 100,
        setsCompleted: 1,
        completed: false
    })).reverse()
};

function runBaseline() {
    let dummy = 0;
    const start = performance.now();
    for (let k = 0; k < iterations; k++) {
        for (let j = 0; j < EXERCISES.length; j++) {
            const ex = EXERCISES[j];
            const activeEx = activeSession?.exercises?.find(e => e.id === ex.id);
            if (activeEx) dummy += activeEx.weight;
        }
    }
    const end = performance.now();
    return { time: end - start, dummy };
}

function runOptimized() {
    let dummy = 0;
    const start = performance.now();
    for (let k = 0; k < iterations; k++) {
        // Optimization: Create Map
        const activeMap = new Map();
        if (activeSession?.exercises) {
            for (const e of activeSession.exercises) {
                activeMap.set(e.id, e);
            }
        }

        for (let j = 0; j < EXERCISES.length; j++) {
            const ex = EXERCISES[j];
            const activeEx = activeMap.get(ex.id);
            if (activeEx) dummy += activeEx.weight;
        }
    }
    const end = performance.now();
    return { time: end - start, dummy };
}

console.log(`Items: ${EXERCISES.length}`);
console.log(`Iterations: ${iterations}`);

// Warmup
runBaseline();
runOptimized();

const resBaseline = runBaseline();
const resOptimized = runOptimized();

console.log(`Baseline: ${resBaseline.time.toFixed(2)}ms`);
console.log(`Optimized: ${resOptimized.time.toFixed(2)}ms`);
console.log(`Improvement: ${(resBaseline.time / resOptimized.time).toFixed(2)}x`);
