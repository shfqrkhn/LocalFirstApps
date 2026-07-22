
import { Calculator } from '../js/core.js';

// Mock localStorage and window if needed for core.js to load
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
        log: console.log,
        warn: () => {},
        error: console.error
    };
}

const weights = [40, 45, 135, 225, 315, 405, 495, 585];
const ITERATIONS = 1_000_000;

console.log('Starting Benchmark for getPlateLoad...');
console.log(`Iterations: ${ITERATIONS}`);
console.log(`Weights: ${weights.join(', ')}`);

const start = performance.now();

for (let i = 0; i < ITERATIONS; i++) {
    for (const w of weights) {
        Calculator.getPlateLoad(w);
    }
}

const end = performance.now();
const duration = end - start;

console.log(`Total Time: ${duration.toFixed(2)} ms`);
console.log(`Average Time per set of weights: ${(duration / ITERATIONS).toFixed(4)} ms`);
console.log(`Average Time per call: ${(duration / (ITERATIONS * weights.length)).toFixed(5)} ms`);
