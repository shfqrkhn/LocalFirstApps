
const ITERATIONS = 1000;
const SESSION_COUNT = 10000;

// Setup Mock Data
const sessions = [];
for(let i=0; i<SESSION_COUNT; i++) {
    sessions.push({
        id: `session-${i}`,
        data: 'x'.repeat(100) // Payload
    });
}

function benchmark(name, fn) {
    const start = performance.now();
    for(let i=0; i<ITERATIONS; i++) {
        fn();
    }
    const end = performance.now();
    console.log(`${name}: ${(end - start).toFixed(2)}ms`);
    return end - start;
}

console.log(`\n=== Benchmark: Delete Session (Array Ops) ===`);
console.log(`Array Size: ${SESSION_COUNT}, Iterations: ${ITERATIONS}`);

// 1. Filter (Baseline)
benchmark('Filter (Baseline)', () => {
    // Delete a random element or fixed element (middle is best for average case)
    const idToDelete = `session-${Math.floor(SESSION_COUNT / 2)}`;
    const newSessions = sessions.filter(s => s.id !== idToDelete);
});

// 2. Spread + Splice (Current)
benchmark('Spread + Splice', () => {
    const idToDelete = `session-${Math.floor(SESSION_COUNT / 2)}`;
    const index = sessions.findIndex(s => s.id === idToDelete);
    if (index !== -1) {
        const newSessions = [...sessions];
        newSessions.splice(index, 1);
    }
});

// 3. Slice + Splice (Potential Optimization)
benchmark('Slice + Splice', () => {
    const idToDelete = `session-${Math.floor(SESSION_COUNT / 2)}`;
    const index = sessions.findIndex(s => s.id === idToDelete);
    if (index !== -1) {
        const newSessions = sessions.slice();
        newSessions.splice(index, 1);
    }
});
