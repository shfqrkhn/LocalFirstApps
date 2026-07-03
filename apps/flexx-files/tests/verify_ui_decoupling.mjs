import fs from 'fs';
import path from 'path';

const CORE_PATH = 'js/core.js';

console.log(`Verifying UI decoupling in ${CORE_PATH}...`);

const content = fs.readFileSync(path.resolve(process.cwd(), CORE_PATH), 'utf8');

// Forbidden tokens
const FORBIDDEN = [
    /alert\(/,
    /confirm\(/,
    /prompt\(/,
    /window\.alert/,
    /window\.confirm/,
    /window\.prompt/
];

let failed = false;

FORBIDDEN.forEach(regex => {
    if (regex.test(content)) {
        console.error(`FAIL: Found forbidden UI token matching ${regex}`);
        // Print context
        const lines = content.split('\n');
        lines.forEach((line, i) => {
            if (regex.test(line)) {
                console.error(`Line ${i+1}: ${line.trim()}`);
            }
        });
        failed = true;
    }
});

if (failed) {
    console.error('Verification FAILED: js/core.js contains UI code.');
    process.exit(1);
} else {
    console.log('Verification PASSED: js/core.js is UI-decoupled.');
}
