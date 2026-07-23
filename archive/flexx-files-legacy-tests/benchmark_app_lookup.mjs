
import { performance } from 'perf_hooks';

// Mock data
const EXERCISES = Array.from({ length: 100 }, (_, i) => ({ id: `ex_${i}`, name: `Exercise ${i}` }));
const WARMUP = Array.from({ length: 20 }, (_, i) => ({ id: `w_${i}`, name: `Warmup ${i}` }));
const DECOMPRESSION = Array.from({ length: 10 }, (_, i) => ({ id: `d_${i}`, name: `Decomp ${i}` }));

// Maps
const EXERCISE_MAP = new Map(EXERCISES.map(e => [e.id, e]));
const WARMUP_MAP = new Map(WARMUP.map(e => [e.id, e]));
const DECOMPRESSION_MAP = new Map(DECOMPRESSION.map(e => [e.id, e]));

function findCurrent(id) {
    return EXERCISES.find(e => e.id === id) || WARMUP.find(w => w.id === id) || DECOMPRESSION.find(d => d.id === id);
}

function findOptimized(id) {
    return EXERCISE_MAP.get(id) || WARMUP_MAP.get(id) || DECOMPRESSION_MAP.get(id);
}

const ITERATIONS = 100000;
const LOOKUP_ID = 'd_5'; // Item in the last array to trigger worst-case

console.log('Running App Lookup Benchmark...');

const startCurrent = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    findCurrent(LOOKUP_ID);
}
const endCurrent = performance.now();

const startOpt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    findOptimized(LOOKUP_ID);
}
const endOpt = performance.now();

console.log(`Current (Array.find chain): ${(endCurrent - startCurrent).toFixed(3)}ms`);
console.log(`Optimized (Map.get chain):  ${(endOpt - startOpt).toFixed(3)}ms`);
console.log(`Improvement:                ${((endCurrent - startCurrent) / (endOpt - startOpt)).toFixed(2)}x faster`);
