import { Logger } from '../js/observability.js';

// === MOCK ENVIRONMENT ===
const localStorageMock = {
    store: {},
    getItemCalls: 0,
    setItemCalls: 0,
    getItem(key) {
        this.getItemCalls++;
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.setItemCalls++;
        this.store[key] = value.toString();
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
        this.getItemCalls = 0;
        this.setItemCalls = 0;
    }
};

// Handle read-only navigator in Node
Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'Benchmark Agent' },
    writable: true,
    configurable: true
});

global.window = {
    location: { pathname: '/benchmark' },
    addEventListener: () => {},
    localStorage: localStorageMock
};
global.localStorage = localStorageMock;
global.document = {
    createElement: () => ({ textContent: '', innerHTML: '' }),
    querySelector: () => null
};

// Mock console to avoid noise during benchmark
const originalConsole = console;
const silentConsole = {
    log: () => {},
    warn: () => {},
    error: () => {},
    info: () => {}
};

// === BENCHMARK ===
async function runBenchmark() {
    originalConsole.log("Running Logger Benchmark...");

    // Warmup / Reset
    Logger.clearErrors();
    localStorageMock.clear();

    // Silence console during benchmark as Logger._log calls console.log
    // We want to measure the logic, not console I/O, although console I/O is part of the cost.
    // But since we are optimizing _persistError which is called AFTER console.log,
    // we can silence it or leave it. Leaving it might dominate the time.
    // However, the optimization is specific to _persistError logic (cloning).
    // Let's silence the Logger's internal console calls by swapping the global console if needed
    // OR we can just rely on the fact that we are comparing two implementations where console.log is constant.
    // To reduce noise, let's silence it.

    // Logger uses global `console`.
    const realConsole = global.console;
    global.console = silentConsole;

    const ITERATIONS = 2000; // Increase if needed
    const ERROR_MSG = "Test Error";
    const CONTEXT = {
        user: "test_user",
        stack: "Error: something\n at somewhere.js:1:1",
        details: {
            moreStack: "Error: inner\n at inner.js:1:1",
            data: "some data"
        }
    };

    // 1. Measure Error Logging (Persistent)
    const start = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        // Create a new context object each time to avoid reference sharing issues if implementation is buggy
        const ctx = JSON.parse(JSON.stringify(CONTEXT));
        Logger.error(ERROR_MSG, ctx);
    }
    const end = performance.now();
    const duration = end - start;

    // Force flush to ensure data is "persisted" (although we check memory cache)
    // and to verify flush logic works without errors
    Logger.flushErrors();

    global.console = realConsole;

    const setItemCalls = localStorageMock.setItemCalls;
    const getItemCalls = localStorageMock.getItemCalls;

    originalConsole.log(`\nResults (${ITERATIONS} iterations):`);
    originalConsole.log(`- Total time: ${duration.toFixed(2)}ms`);
    originalConsole.log(`- Time per op: ${(duration / ITERATIONS).toFixed(3)}ms`);
    originalConsole.log(`- localStorage.setItem calls: ${setItemCalls}`);
    originalConsole.log(`- localStorage.getItem calls: ${getItemCalls}`);

    // Validation
    // Check if stack traces were stripped
    const persistedErrors = Logger.getErrors();
    if (persistedErrors.length === 0) {
         originalConsole.error("FAIL: No errors persisted.");
         process.exit(1);
    }

    const lastError = persistedErrors[persistedErrors.length - 1];

    let valid = true;
    if (lastError.context && lastError.context.stack) {
        originalConsole.error("FAIL: Stack trace not stripped from context.");
        valid = false;
    }
    // Check nested structure if supported by implementation (current impl does specific checks)
    // The current impl checks context.error.stack but not arbitrary nesting deep.
    // Our test context had details.moreStack, which the current impl might NOT strip unless it's strictly `stack` or `error.stack`.
    // Let's check what the code does:
    // if (safeEntry.context.stack) delete safeEntry.context.stack;
    // if (safeEntry.context.error && ... error.stack) delete ...

    // It does NOT recursively strip stacks. So my test context should align with what is supported or expected.

    if (!valid) process.exit(1);

    originalConsole.log("PASS: Verification successful.");
}

runBenchmark();
