
// Verification test for LRU cache behavior in Calculator.getPlateLoad

// Mock environment first
if (typeof global !== 'undefined') {
    global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    global.window = { location: { href: '' } };
}

// Intercept Map constructor to expose cache state
const OriginalMap = Map;
let createdMaps = [];

class InstrumentedMap extends OriginalMap {
    constructor(entries) {
        super(entries);
        createdMaps.push(this);
    }
}

global.Map = InstrumentedMap;

// Now import Calculator and Constants
Promise.all([
    import('../js/core.js'),
    import('../js/constants.js')
]).then(([{ Calculator }, CONST]) => {

    const LIMIT = CONST.PLATE_CACHE_LIMIT;
    console.log(`Verifying LRU Cache Behavior in getPlateLoad (Limit: ${LIMIT})...`);

    // 1. Fill cache to capacity
    for (let i = 1; i <= LIMIT; i++) {
        Calculator.getPlateLoad(i);
    }

    // Find the cache map
    const cacheMap = createdMaps.find(m => m.size === LIMIT);
    if (!cacheMap) {
        console.error('FAIL: Could not instrument plate cache map');
        process.exit(1);
    }

    // 2. Access key 1 (the first inserted item)
    // In LRU, this should move it to the MRU position (end)
    Calculator.getPlateLoad(1);

    // 3. Insert key LIMIT + 1
    Calculator.getPlateLoad(LIMIT + 1);

    // 4. Insert key LIMIT + 2
    // Evicts the first key in insertion order.
    // If FIFO: evicts 1.
    // If LRU: evicts 2 (since 1 moved to end).
    Calculator.getPlateLoad(LIMIT + 2);

    // 5. Assertions
    let failed = false;

    if (!cacheMap.has(1)) {
        console.error('FAIL: Key 1 was evicted (FIFO behavior detected)');
        failed = true;
    } else {
        console.log('PASS: Key 1 preserved (LRU behavior)');
    }

    if (cacheMap.has(2)) {
        console.error('FAIL: Key 2 should have been evicted (cache overflow)');
        failed = true;
    } else {
        console.log('PASS: Key 2 correctly evicted');
    }

    if (cacheMap.has(LIMIT + 1) && cacheMap.has(LIMIT + 2)) {
        console.log('PASS: New keys inserted correctly');
    } else {
        console.error('FAIL: New keys missing');
        failed = true;
    }

    if (failed) {
        console.error('Verification FAILED');
        process.exit(1);
    } else {
        console.log('Verification PASSED');
        process.exit(0);
    }

}).catch(err => {
    console.error('Test Error:', err);
    process.exit(1);
});
