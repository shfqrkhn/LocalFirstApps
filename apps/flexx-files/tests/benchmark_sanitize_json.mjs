
import { performance } from 'perf_hooks';

// Mock Logger
const Logger = {
    warn: () => {}
};

function originalSanitizeJSON(data) {
    try {
        const parsed = JSON.parse(JSON.stringify(data));
        return parsed;
    } catch (e) {
        return null;
    }
}

function recursiveSanitize(data) {
    if (data === undefined || typeof data === 'function' || typeof data === 'symbol') {
        return undefined;
    }

    if (data === null) {
        return null;
    }

    if (typeof data === 'bigint') {
        throw new TypeError('Do not know how to serialize a BigInt');
    }

    if (typeof data !== 'object') {
        if (typeof data === 'number') {
             if (Number.isNaN(data) || !Number.isFinite(data)) {
                return null;
            }
            return data;
        }
        return data;
    }

    if (typeof data.toJSON === 'function') {
        return recursiveSanitize(data.toJSON());
    }

    if (data instanceof Number) {
         const val = data.valueOf();
         if (Number.isNaN(val) || !Number.isFinite(val)) {
            return null;
        }
        return val;
    }
    if (data instanceof String) {
        return data.valueOf();
    }
    if (data instanceof Boolean) {
        return data.valueOf();
    }

    if (Array.isArray(data)) {
        const arr = new Array(data.length);
        for (let i = 0; i < data.length; i++) {
            const val = recursiveSanitize(data[i]);
            arr[i] = (val === undefined) ? null : val;
        }
        return arr;
    }

    const obj = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const val = recursiveSanitize(data[key]);
            if (val !== undefined) {
                obj[key] = val;
            }
        }
    }
    return obj;
}

// Generate complex test data
function generateData(depth = 0) {
    if (depth > 4) return "leaf";

    const obj = {
        id: Math.random().toString(36),
        value: Math.random() * 1000,
        text: "some text " + Math.random(),
        active: true,
        missing: undefined,
        func: () => { console.log("I should be removed"); },
        date: new Date(),
        nested: null,
        list: [],
        nan: NaN,
        infinity: Infinity,
        negInfinity: -Infinity,
        boxed: new String("boxed"),
        hasToJSON: { val: 1, toJSON: function() { return { val: this.val * 2 }; } }
    };

    obj.nested = generateData(depth + 1);
    for (let i = 0; i < 5; i++) {
        obj.list.push(generateData(depth + 1));
    }

    // Add some functions in array
    obj.list.push(() => {});

    return obj;
}

const testData = generateData();

// Verify correctness first
const jsonResult = JSON.stringify(originalSanitizeJSON(testData));
const recResult = JSON.stringify(recursiveSanitize(testData));

if (jsonResult !== recResult) {
    console.error("Mismatch in results!");
    console.log("JSON:", jsonResult.substring(0, 500));
    console.log("Rec: ", recResult.substring(0, 500));
    process.exit(1);
} else {
    console.log("Results match correctness check.");
}


const ITERATIONS = 10000;

console.log("Starting benchmark...");

const start1 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    originalSanitizeJSON(testData);
}
const end1 = performance.now();
const time1 = end1 - start1;
console.log(`JSON.parse(JSON.stringify): ${time1.toFixed(2)}ms`);

const start2 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    recursiveSanitize(testData);
}
const end2 = performance.now();
const time2 = end2 - start2;
console.log(`Recursive Sanitize: ${time2.toFixed(2)}ms`);

console.log(`Speedup: ${(time1 / time2).toFixed(2)}x`);
