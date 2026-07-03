
import { Calculator } from '../js/core.js';

// Mock environment
if (typeof global !== 'undefined') {
    global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    global.window = { location: { href: '' } };
    // Keep console.log working
}

const testCases = [
    { weight: 40, expected: 'Use DBs / Fixed Bar' },
    { weight: 45, expected: 'Empty Bar' },
    { weight: 65, expected: '+ [ 10 ]' },      // (65-45)/2 = 10
    { weight: 95, expected: '+ [ 25 ]' },      // (95-45)/2 = 25
    { weight: 135, expected: '+ [ 45 ]' },     // (135-45)/2 = 45
    { weight: 185, expected: '+ [ 45, 25 ]' }, // (185-45)/2 = 70 -> 45 + 25
    { weight: 225, expected: '+ [ 45, 45 ]' }, // (225-45)/2 = 90 -> 45 + 45
    { weight: 315, expected: '+ [ 45, 45, 45 ]' }, // (315-45)/2 = 135 -> 45+45+45
    { weight: 47.5, expected: '+ [ 1.25 ]' }
];

let failed = false;

console.log('Verifying getPlateLoad correctness...');

for (const { weight, expected } of testCases) {
    const result = Calculator.getPlateLoad(weight);
    if (result !== expected) {
        console.error(`FAIL: Weight ${weight}`);
        console.error(`  Expected: '${expected}'`);
        console.error(`  Actual:   '${result}'`);
        failed = true;
    } else {
        console.log(`PASS: Weight ${weight} -> ${result}`);
    }
}

if (failed) {
    console.error('Verification FAILED');
    process.exit(1);
} else {
    console.log('Verification PASSED');
}
