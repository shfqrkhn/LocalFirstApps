
import { Storage } from '../js/core.js';
import * as CONST from '../js/constants.js';

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
        // Simulate cost: 0.5ms per 1KB (faster than before to be reasonable)
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

global.window = global;
global.window.location = { pathname: '/test', href: 'http://localhost/test' };
global.document = {
    createElement: () => ({ textContent: '', innerHTML: '' }),
    querySelector: () => null
};
Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'Node' },
    writable: true,
    configurable: true
});
global.alert = (msg) => console.log('ALERT:', msg);
global.confirm = () => true;

// Mock requestIdleCallback
global.requestIdleCallbackCalls = 0;
global.window.requestIdleCallback = (cb) => {
    global.requestIdleCallbackCalls++;
    return setTimeout(cb, 0); // Execute immediately (next tick) for test
};
global.window.cancelIdleCallback = (id) => clearTimeout(id);

async function run() {
    console.log("=== Storage Benchmark ===");

    // Create a large session history
    const sessions = [];
    for(let i=0; i<5000; i++) {
        sessions.push({
            id: `session-${i}`,
            date: new Date().toISOString(),
            recoveryStatus: 'green',
            sessionNumber: i,
            weekNumber: Math.floor(i/3),
            totalVolume: 1000,
            exercises: [
                { id: 'squat', name: 'Squat', weight: 100, setsCompleted: 3, completed: true },
                { id: 'bench', name: 'Bench Press', weight: 80, setsCompleted: 3, completed: true }
            ]
        });
    }

    // Initial save to store
    localStorageMock.store[`${CONST.STORAGE_PREFIX}sessions_v3`] = JSON.stringify(sessions);

    // Load cache
    Storage.getSessions();
    console.log(`Loaded ${sessions.length} sessions.`);

    // --- TEST 1: saveSession ---
    console.log('\n--- Testing saveSession ---');
    const newSession = {
        id: 'new-session-uuid',
        date: new Date().toISOString(),
        recoveryStatus: 'green',
        sessionNumber: 5001,
        weekNumber: 100,
        exercises: [{ id: 'squat', name: 'Squat', weight: 105, setsCompleted: 3, completed: true }]
    };
    newSession.id = '00000000-0000-0000-0000-000000000000';

    let start = performance.now();
    global.requestIdleCallbackCalls = 0;
    Storage.saveSession(newSession);
    let end = performance.now();
    let duration = end - start;

    console.log(`saveSession returned in ${duration.toFixed(2)}ms`);

    // Check for synchronous setItem
    let syncCall = localStorageMock.setItemCalls.find(c =>
        c.key.includes('sessions') && c.time >= start && c.time <= end
    );

    if (syncCall) {
        console.log('FAIL: saveSession blocked main thread!');
    } else {
        console.log('PASS: saveSession is non-blocking.');
    }

    if (global.requestIdleCallbackCalls > 0) {
        console.log('PASS: saveSession used requestIdleCallback.');
    } else {
        console.log('FAIL: saveSession DID NOT use requestIdleCallback.');
    }

    // Wait for async write
    await new Promise(r => setTimeout(r, 100));

    let asyncCall = localStorageMock.setItemCalls.find(c =>
        c.key.includes('sessions') && c.time > end
    );

    if (asyncCall) {
        console.log(`Async write occurred later (${asyncCall.duration.toFixed(2)}ms write time).`);
    } else {
        console.log('WARN: No async write for saveSession?');
    }

    // --- TEST 2: deleteSession ---
    console.log('\n--- Testing deleteSession ---');
    localStorageMock.setItemCalls = []; // Reset tracking
    global.requestIdleCallbackCalls = 0;

    start = performance.now();
    Storage.deleteSession('session-0');
    end = performance.now();
    duration = end - start;

    console.log(`deleteSession returned in ${duration.toFixed(2)}ms`);

    syncCall = localStorageMock.setItemCalls.find(c =>
        c.key.includes('sessions') && c.time >= start && c.time <= end
    );

    if (syncCall) {
        console.log(`FAIL: deleteSession blocked main thread for ${syncCall.duration.toFixed(2)}ms!`);
    } else {
        console.log('PASS: deleteSession is non-blocking.');
    }

    if (global.requestIdleCallbackCalls > 0) {
        console.log('PASS: deleteSession used requestIdleCallback.');
    } else {
        console.log('FAIL: deleteSession DID NOT use requestIdleCallback.');
    }
}

run();
