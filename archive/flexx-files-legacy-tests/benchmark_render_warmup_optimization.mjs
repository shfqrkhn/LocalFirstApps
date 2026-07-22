import { Sanitizer } from '../js/security.js';
import { WARMUP } from '../js/config.js';
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

const ITERATIONS = 50000;

console.log(`Starting benchmark with ${ITERATIONS} iterations over WARMUP items (${WARMUP.length} items)...`);

// --- Baseline: Calling sanitizeURL every time ---
const startBaseline = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    for (const w of WARMUP) {
        // Simulate renderWarmup loop accessing video and altLinks
        // Access main video
        const vidUrl = Sanitizer.sanitizeURL(w.video);

        // Access alternatives (renderWarmup iterates alternatives to populate select, but only sanitizes the *active* one)
        // In the loop, it does: const vidUrl = altUsed && w.altLinks?.[altUsed] ? w.altLinks[altUsed] : w.video;
        // Let's simulate accessing at least one URL per item, maybe checking an alt link too if present.
        if (w.altLinks) {
             for (const altName in w.altLinks) {
                 // The render loop doesn't sanitize *all* alt links every time, only the *active* one.
                 // But let's assume we toggle or check them.
                 // To be fair to the render loop, it only calls sanitizeURL ONCE per item for the <a> tag.
                 // So we just stick to one call per WARMUP item, which matches the loop:
                 // <a id="vid-${w.id}" href="${Sanitizer.sanitizeURL(vidUrl)}" ...
             }
        }
    }
}
const endBaseline = performance.now();
const baselineTime = endBaseline - startBaseline;

// --- Optimized: Pre-sanitized (Direct Access) ---
// First, perform the pre-sanitization (cost incurred once)
const preSanitizeStart = performance.now();
const preSanitizedWARMUP = WARMUP.map(w => {
    const newW = { ...w };
    newW.video = Sanitizer.sanitizeURL(w.video);
    if (w.altLinks) {
        newW.altLinks = {};
        for (const [key, val] of Object.entries(w.altLinks)) {
            newW.altLinks[key] = Sanitizer.sanitizeURL(val);
        }
    }
    return newW;
});
const preSanitizeTime = performance.now() - preSanitizeStart;

const startOptimized = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    for (const w of preSanitizedWARMUP) {
        // Simulate renderWarmup loop accessing video directly
        const vidUrl = w.video;
        // Accessing property directly, no function call
    }
}
const endOptimized = performance.now();
const optimizedTime = endOptimized - startOptimized;

console.log(`\nBaseline (Calling sanitizeURL): ${baselineTime.toFixed(2)}ms`);
console.log(`Optimized (Direct Access):      ${optimizedTime.toFixed(2)}ms`);
console.log(`Pre-sanitization (Once):        ${preSanitizeTime.toFixed(4)}ms`);

const improvement = baselineTime / optimizedTime;
console.log(`\nSpeedup: ${improvement.toFixed(2)}x`);

if (optimizedTime > baselineTime) {
    console.error("Optimized is slower!");
    process.exit(1);
}
