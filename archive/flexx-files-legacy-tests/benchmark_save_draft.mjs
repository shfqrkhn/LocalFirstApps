
import { Storage } from '../js/core.js';
import * as CONST from '../js/constants.js';
import { Logger } from '../js/observability.js';

// Setup Mock Environment
const localStorageMock = {
    store: {},
    setItemCalls: [],
    getItemCalls: [],
    getItem(key) {
        this.getItemCalls.push({ time: performance.now(), key });
        return this.store[key] || null;
    },
    setItem(key, value) {
        // Simulate cost: 0.5ms per 1KB
        const json = value.toString();
        const blockingTime = json.length / 2000;
        const end = performance.now();
        while(performance.now() - end < blockingTime) {}

        this.store[key] = value;
        this.setItemCalls.push({ time: performance.now(), key, duration: blockingTime });
    },
    removeItem(key) { delete this.store[key]; },
    length: 0,
    key: (i) => null
};
global.localStorage = localStorageMock;

// Mock dependencies
global.window = global;
global.window.location = { pathname: '/test', href: 'http://localhost/test' };
global.console = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
};
// Prevent Logger from crashing or spamming
Logger.level = 4; // CRITICAL only

async function run() {
    console.log("=== SaveDraft Benchmark ===");
    console.log(`DRAFT KEY: ${Storage.KEYS.DRAFT}`);

    const session = {
        id: 'draft-session-uuid',
        date: new Date().toISOString(),
        recoveryStatus: 'green',
        exercises: Array(10).fill().map((_, i) => ({
            id: `ex-${i}`,
            name: `Exercise ${i}`,
            weight: 100 + i * 5,
            setsCompleted: 2,
            completed: false
        }))
    };

    // --- TEST: Rapid Interaction Loop ---
    console.log('\n--- Simulating 20 rapid updates (e.g., fast clicking + button) ---');

    // Reset metrics
    localStorageMock.setItemCalls = [];

    let start = performance.now();

    for (let i = 0; i < 20; i++) {
        // Modify session slightly to force new JSON
        session.exercises[0].weight += 2.5;
        Storage.saveDraft(session);
    }

    let end = performance.now();
    let duration = end - start;

    console.log(`20 saveDraft calls took: ${duration.toFixed(2)}ms`);

    console.log("Calls:", localStorageMock.setItemCalls.map(c => c.key));
    const writeCount = localStorageMock.setItemCalls.filter(c => c.key === Storage.KEYS.DRAFT).length;
    console.log(`Actual localStorage writes: ${writeCount}`);

    if (writeCount === 20) {
        console.log('FAIL: Every call triggered a synchronous write (Blocking I/O).');
    } else if (writeCount < 5) {
        console.log('PASS: Writes were debounced.');
    } else {
        console.log(`WARN: Partial debouncing? (${writeCount} writes)`);
    }

    // Wait for any pending debounce
    await new Promise(r => setTimeout(r, 600));

    const finalWriteCount = localStorageMock.setItemCalls.filter(c => c.key === Storage.KEYS.DRAFT).length;
    console.log(`Total writes after wait: ${finalWriteCount}`);
}

run();
