
import { Calculator } from '../js/core.js';

console.log("Testing Calculator.getPlateLoad precision...");

const testCases = [
    { weight: 47.5, expected: "+ [ 1.25 ]" },
    { weight: 47.49999999999999, expected: "+ [ 1.25 ]" }, // Simulating precision loss
    { weight: 45.0, expected: "Empty Bar" },
    { weight: 135, expected: "+ [ 45 ]" },
    { weight: 49.999999, expected: "+ [ 2.5 ]" }
];

let errors = 0;
testCases.forEach(tc => {
    try {
        const res = Calculator.getPlateLoad(tc.weight);
        if (res !== tc.expected) {
             console.error(`FAIL: Weight ${tc.weight}. Expected "${tc.expected}", got "${res}"`);
             errors++;
        } else {
             console.log(`PASS: Weight ${tc.weight} -> ${res}`);
        }
    } catch (e) {
        console.error("Error: " + e.message);
        errors++;
    }
});

if (errors > 0) {
    console.log(`\nTEST FAILED with ${errors} errors.`);
    process.exit(1);
} else {
    console.log("\nTEST PASSED.");
    process.exit(0);
}
