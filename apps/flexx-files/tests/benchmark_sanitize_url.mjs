
import { Sanitizer } from '../js/security.js';
import { performance } from 'perf_hooks';

// Mock Logger
global.console = {
    ...console,
    warn: () => {}, // Suppress warnings
    info: () => {},
    error: () => {},
    debug: () => {}
};

// Mock localStorage
const localStorageMock = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
};
global.localStorage = localStorageMock;

// Mock window and navigator using defineProperty
Object.defineProperty(global, 'window', {
    value: {
        crypto: {
            subtle: {
                digest: async () => new Uint8Array(32)
            }
        },
        addEventListener: () => {}
    },
    writable: true
});

Object.defineProperty(global, 'navigator', {
    value: {
        userAgent: 'Benchmark',
        platform: 'Node'
    },
    writable: true
});

const URLS = [
    'https://www.youtube.com/results?search_query=trap+bar+deadlift+form+tutorial',
    'https://www.youtube.com/results?search_query=barbell+romanian+deadlift+form',
    'https://www.youtube.com/results?search_query=dumbbell+romanian+deadlift+form',
    'https://www.youtube.com/results?search_query=dumbbell+goblet+squat+form',
    'https://www.youtube.com/results?search_query=dumbbell+front+squat+form',
    'https://www.youtube.com/results?search_query=bulgarian+split+squat+dumbbells+form',
    'https://www.youtube.com/results?search_query=dumbbell+bench+press+form',
    'https://www.youtube.com/results?search_query=barbell+bench+press+form',
    'https://www.youtube.com/results?search_query=hands+elevated+push+up+on+bench+form',
    'https://www.youtube.com/results?search_query=incline+dumbbell+press+form'
];

// Verification
console.log("Verifying correctness...");
const u1 = URLS[0];
const r1 = Sanitizer.sanitizeURL(u1); // First call (compute)
const r2 = Sanitizer.sanitizeURL(u1); // Second call (cache)
if (r1 !== r2) {
    console.error("Verification FAILED: Cached result differs from first result");
    console.error("First:", r1);
    console.error("Second:", r2);
    process.exit(1);
}
if (r1 !== u1) { // Assuming these specific URLs don't change after normalization/parsing
   // Actually new URL() might normalize, e.g. escaping.
   // But they should be stable.
}
console.log("Verification Passed.");


// Warmup
for (let i = 0; i < 100; i++) {
    Sanitizer.sanitizeURL(URLS[i % URLS.length]);
}

const ITERATIONS = 10000;
const start = performance.now();

for (let i = 0; i < ITERATIONS; i++) {
    for (const url of URLS) {
        Sanitizer.sanitizeURL(url);
    }
}

const end = performance.now();
const duration = end - start;
const opsPerSec = (ITERATIONS * URLS.length) / (duration / 1000);

console.log(`Total time: ${duration.toFixed(2)}ms`);
console.log(`Operations per second: ${opsPerSec.toFixed(0)}`);
console.log(`Average time per call: ${(duration / (ITERATIONS * URLS.length)).toFixed(4)}ms`);
