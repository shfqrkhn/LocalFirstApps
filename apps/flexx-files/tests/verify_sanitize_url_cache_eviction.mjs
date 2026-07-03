
import { Sanitizer } from '../js/security.js';

// Mock Logger
global.console = {
    ...console,
    warn: () => {},
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

console.log("Testing Sanitizer URL Cache Eviction Strategy...");

// Spy on URL constructor
let urlConstructorCalls = 0;
const OriginalURL = global.URL;
global.URL = class MockURL extends OriginalURL {
    constructor(url) {
        super(url);
        urlConstructorCalls++;
    }
};

async function runTest() {
    let errors = 0;

    // 1. Fill cache to 100 items (0 to 99)
    console.log("Filling cache with 100 items...");
    for (let i = 0; i < 100; i++) {
        Sanitizer.sanitizeURL(`https://example.com/${i}`);
    }

    const baselineCalls = urlConstructorCalls;
    console.log(`Baseline calls: ${baselineCalls}`);

    // 2. Access Item 0 (should be oldest if FIFO, but become newest if LRU)
    console.log("Accessing Item 0 (refresh)...");
    Sanitizer.sanitizeURL(`https://example.com/0`);

    // Check calls - should be cached, so no increase
    if (urlConstructorCalls > baselineCalls) {
        console.error("FAIL: Item 0 was not cached even before eviction!");
        errors++;
    }

    // 3. Add Item 100 (trigger eviction)
    // If FIFO: Evicts Item 0 (oldest inserted).
    // If LRU: Evicts Item 1 (oldest accessed, since 0 was just accessed).
    console.log("Adding Item 100 (trigger eviction)...");
    Sanitizer.sanitizeURL(`https://example.com/100`);

    // 4. Check if Item 0 is still in cache
    const callsBeforeCheck0 = urlConstructorCalls;
    Sanitizer.sanitizeURL(`https://example.com/0`);
    const callsAfterCheck0 = urlConstructorCalls;

    if (callsAfterCheck0 > callsBeforeCheck0) {
        console.error("FAIL: Item 0 was EVICTED. (FIFO Behavior)");
        errors++;
    } else {
        console.log("PASS: Item 0 was PRESERVED. (LRU Behavior)");
    }

    // 5. Check if Item 1 is still in cache
    const callsBeforeCheck1 = urlConstructorCalls;
    Sanitizer.sanitizeURL(`https://example.com/1`);
    const callsAfterCheck1 = urlConstructorCalls;

    if (callsAfterCheck1 > callsBeforeCheck1) {
        console.log("PASS: Item 1 was EVICTED. (Correct for LRU)");
    } else {
        console.error("FAIL: Item 1 was PRESERVED. (Expected eviction)");
        errors++;
    }

    if (errors > 0) {
        console.log(`\nTEST FAILED with ${errors} errors.`);
        process.exit(1);
    } else {
        console.log("\nTEST PASSED: True LRU behavior verified.");
        process.exit(0);
    }
}

runTest();
