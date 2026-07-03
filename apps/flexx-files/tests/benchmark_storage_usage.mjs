
import { Storage } from '../js/core.js';
import * as CONST from '../js/constants.js';

// Mock localStorage
const store = new Map();
global.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    key: (i) => Array.from(store.keys())[i],
    get length() { return store.size; },
    clear: () => store.clear()
};

// Generate large data (4MB)
const largeData = Array(20000).fill({
    id: '12345678-1234-1234-1234-123456789012',
    date: '2024-01-01T00:00:00.000Z',
    recoveryStatus: 'green',
    exercises: Array(5).fill({ id: 'bench', weight: 225 })
});
const json = JSON.stringify(largeData);
localStorage.setItem(Storage.KEYS.SESSIONS, json);

// Populate cache
Storage.getSessions();

console.log(`Data size: ${(json.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`Cached size: ${Storage._cachedSessionsSize}`);

// Verify correctness
const usage = Storage.getUsage();
console.log(`Usage: ${(usage.bytes / 1024 / 1024).toFixed(2)} MB`);

// Benchmark
const start = performance.now();
for (let i = 0; i < 1000; i++) {
    Storage.getUsage();
}
const end = performance.now();

console.log(`getUsage x 1000: ${(end - start).toFixed(2)}ms`);
console.log(`Average: ${((end - start) / 1000).toFixed(4)}ms`);
