
import { Calculator, Storage } from '../js/core.js';
import * as CONST from '../js/constants.js';

// Mock localStorage
const mockStorage = new Map();
global.localStorage = {
    getItem: (key) => mockStorage.get(key),
    setItem: (key, val) => mockStorage.set(key, val),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
    key: (i) => Array.from(mockStorage.keys())[i],
    length: 0
};
Object.defineProperty(global.localStorage, 'length', { get: () => mockStorage.size });

// Setup test data
const sessions = [
    {
        id: '1',
        date: new Date().toISOString(),
        recoveryStatus: 'green',
        exercises: [
            {
                id: 'hinge',
                name: 'Trap Bar Deadlift',
                weight: 200,
                setsCompleted: 3,
                completed: true,
                usingAlternative: false
            }
        ]
    },
    {
        id: '2',
        date: new Date().toISOString(),
        recoveryStatus: 'green',
        exercises: [
            {
                id: 'hinge',
                name: 'Trap Bar Deadlift',
                weight: 150,
                setsCompleted: 3,
                completed: true,
                usingAlternative: true,
                altName: 'Barbell RDL'
            }
        ]
    }
];

Storage._sessionCache = sessions;

// Test
console.log('Testing Calculator with alternative exercise...');

// 1. Check last exercise for 'hinge' (should be session 1)
const lastHinge = Calculator.getLastExercise('hinge', sessions);

if (lastHinge && lastHinge.weight === 200) {
    console.log('PASS: Main exercise correctly ignores alternative usage.');
} else {
    console.error('FAIL: Main exercise did not ignore alternative usage.');
    process.exit(1);
}

// 2. Check last exercise for 'Barbell RDL' (should be session 2)
// This is the new capability we added.
const lastAlt = Calculator.getLastExercise('Barbell RDL', sessions);

if (lastAlt && lastAlt.weight === 150) {
    console.log('PASS: Alternative exercise stats retrieved successfully.');
} else {
    console.error('FAIL: Alternative exercise stats NOT retrieved.');
    process.exit(1);
}

// 3. Check recommended weight for Alt
const recWeight = Calculator.getRecommendedWeight('Barbell RDL', 'green', sessions);
// Should be 150 + 5 = 155 (assuming simple progression)
if (recWeight === 155) {
    console.log('PASS: Recommended weight calculated correctly for alternative.');
} else {
    console.error(`FAIL: Recommended weight incorrect. Expected 155, got ${recWeight}`);
    process.exit(1);
}

// 4. Check stall detection for Alt (should be false, not enough history)
const stalled = Calculator.detectStall('Barbell RDL', sessions);
if (!stalled) {
    console.log('PASS: Stall detection correct (false).');
} else {
    console.error('FAIL: Stall detection incorrect.');
    process.exit(1);
}
