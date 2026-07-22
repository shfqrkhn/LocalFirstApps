import { performance } from 'perf_hooks';

// === MOCK DATA GENERATOR ===
const EXERCISE_IDS = ['hinge', 'knee', 'push_horz', 'push_incline', 'push_vert', 'pull', 'pull_vert', 'carry', 'calves'];

function generateSessions(count) {
    const sessions = [];
    const startDate = new Date('2023-01-01');

    for (let i = 0; i < count; i++) {
        const exercises = EXERCISE_IDS.map(id => ({
            id,
            weight: 100 + Math.floor(Math.random() * 100),
            usingAlternative: Math.random() > 0.9 // 10% chance of alternative
        }));

        sessions.push({
            date: new Date(startDate.getTime() + i * 86400000).toISOString(),
            exercises
        });
    }
    return sessions;
}

// === ORIGINAL IMPLEMENTATION ===
const ChartCacheOriginal = {
    _cache: new WeakMap(),

    getData(sessions, exerciseId) {
        if (!this._cache.has(sessions)) {
            this._cache.set(sessions, new Map());
        }
        const sessionCache = this._cache.get(sessions);

        if (sessionCache.has(exerciseId)) {
            return sessionCache.get(exerciseId);
        }

        const data = [];
        let minVal = Infinity;
        let maxVal = -Infinity;

        for (let i = 0; i < sessions.length; i++) {
            const exercises = sessions[i].exercises;
            for (let j = 0; j < exercises.length; j++) {
                const ex = exercises[j];
                if (ex.id === exerciseId) {
                    if (!ex.usingAlternative) {
                        const v = ex.weight;
                        data.push({d: new Date(sessions[i].date), v});
                        if (v < minVal) minVal = v;
                        if (v > maxVal) maxVal = v;
                    }
                    break; // Stop looking in this session
                }
            }
        }

        const result = { data, minVal, maxVal };
        sessionCache.set(exerciseId, result);
        return result;
    }
};

// === OPTIMIZED IMPLEMENTATION ===
const ChartCacheOptimized = {
    _cache: new WeakMap(),

    getData(sessions, exerciseId) {
        if (!this._cache.has(sessions)) {
            // Index ALL exercises at once
            const index = new Map();

            // Single pass over all sessions
            for (let i = 0; i < sessions.length; i++) {
                const s = sessions[i];
                if (!s.exercises) continue;

                for (let j = 0; j < s.exercises.length; j++) {
                    const ex = s.exercises[j];

                    if (!index.has(ex.id)) {
                        index.set(ex.id, { data: [], minVal: Infinity, maxVal: -Infinity });
                    }

                    if (!ex.usingAlternative) {
                        const entry = index.get(ex.id);
                        const v = ex.weight;
                        entry.data.push({ d: new Date(s.date), v });
                        if (v < entry.minVal) entry.minVal = v;
                        if (v > entry.maxVal) entry.maxVal = v;
                    }
                }
            }
            this._cache.set(sessions, index);
        }

        const sessionCache = this._cache.get(sessions);

        if (!sessionCache.has(exerciseId)) {
            return { data: [], minVal: Infinity, maxVal: -Infinity };
        }

        return sessionCache.get(exerciseId);
    }
};

// === BENCHMARK ===
const SESSIONS_COUNT = 2000;
const ITERATIONS = 100;

console.log(`Generating ${SESSIONS_COUNT} sessions...`);
const sessions = generateSessions(SESSIONS_COUNT);
console.log('Sessions generated.');

function benchmark(name, cacheObj) {
    let totalTime = 0;

    for (let k = 0; k < ITERATIONS; k++) {
        // Reset cache to simulate "fresh load" or first view
        cacheObj._cache = new WeakMap();

        const start = performance.now();
        // Simulate rendering ALL charts (e.g. user browsing through them)
        for (const id of EXERCISE_IDS) {
            cacheObj.getData(sessions, id);
        }
        totalTime += (performance.now() - start);
    }

    console.log(`${name}: Average time to process all ${EXERCISE_IDS.length} exercises: ${(totalTime / ITERATIONS).toFixed(3)}ms`);
    return totalTime / ITERATIONS;
}

console.log('\n=== RUNNING BENCHMARK ===');
const t1 = benchmark('Original', ChartCacheOriginal);
const t2 = benchmark('Optimized', ChartCacheOptimized);

console.log(`\nImprovement: ${((t1 - t2) / t1 * 100).toFixed(1)}% faster`);

// === VERIFICATION ===
console.log('\n=== VERIFYING ACCURACY ===');
// Reset caches
ChartCacheOriginal._cache = new WeakMap();
ChartCacheOptimized._cache = new WeakMap();

let correct = true;
for (const id of EXERCISE_IDS) {
    const r1 = ChartCacheOriginal.getData(sessions, id);
    const r2 = ChartCacheOptimized.getData(sessions, id);

    if (r1.data.length !== r2.data.length || r1.minVal !== r2.minVal || r1.maxVal !== r2.maxVal) {
        console.error(`Mismatch for ${id}!`);
        console.error('Original:', r1.minVal, r1.maxVal, r1.data.length);
        console.error('Optimized:', r2.minVal, r2.maxVal, r2.data.length);
        correct = false;
    }

    // Check data points
    for(let i=0; i<r1.data.length; i++) {
        if (r1.data[i].v !== r2.data[i].v || r1.data[i].d.getTime() !== r2.data[i].d.getTime()) {
             console.error(`Data point mismatch for ${id} at index ${i}`);
             correct = false;
             break;
        }
    }
}

if (correct) {
    console.log('✅ Results match perfectly.');
} else {
    console.log('❌ Results mismatch.');
    process.exit(1);
}
