
import { performance } from 'perf_hooks';

// Mock data generation
function generateExercises(count) {
    const exercises = [];
    for (let i = 0; i < count; i++) {
        exercises.push({
            id: `ex_${i}`,
            name: `Exercise ${i}`,
            reps: 10
        });
    }
    return exercises;
}

function generateSession(exerciseCount, totalExercises) {
    const sessionExercises = [];
    // Randomly pick exercises
    for (let i = 0; i < exerciseCount; i++) {
        const id = `ex_${Math.floor(Math.random() * totalExercises)}`;
        sessionExercises.push({
            id: id,
            skipped: false,
            usingAlternative: false,
            weight: 100,
            setsCompleted: 3
        });
    }
    return { exercises: sessionExercises };
}

// O(N) Lookup Implementation (Current)
function calculateVolumeCurrent(session, exercisesArray) {
    return session.exercises.reduce((sum, ex) => {
        if (ex.skipped || ex.usingAlternative) return sum;
        const cfg = exercisesArray.find(e => e.id === ex.id);
        const reps = cfg ? cfg.reps : 0;
        return sum + (ex.weight * ex.setsCompleted * reps);
    }, 0);
}

// O(1) Lookup Implementation (Optimized)
function calculateVolumeOptimized(session, exercisesMap) {
    return session.exercises.reduce((sum, ex) => {
        if (ex.skipped || ex.usingAlternative) return sum;
        const cfg = exercisesMap.get(ex.id);
        const reps = cfg ? cfg.reps : 0;
        return sum + (ex.weight * ex.setsCompleted * reps);
    }, 0);
}

async function runBenchmark() {
    console.log('Running SaveSession Lookup Benchmark...');

    const EXERCISE_COUNTS = [10, 100, 1000, 10000];
    const SESSION_SIZE = 50; // Exercises per session
    const ITERATIONS = 1000;

    for (const N of EXERCISE_COUNTS) {
        console.log(`\n--- Scenario: ${N} Total Exercises, ${SESSION_SIZE} Exercises per Session ---`);

        const exercises = generateExercises(N);
        const session = generateSession(SESSION_SIZE, N);

        // Prepare Map
        const exercisesMap = new Map(exercises.map(e => [e.id, e]));

        // Benchmark Current
        const startCurrent = performance.now();
        for (let i = 0; i < ITERATIONS; i++) {
            calculateVolumeCurrent(session, exercises);
        }
        const endCurrent = performance.now();
        const timeCurrent = endCurrent - startCurrent;

        // Benchmark Optimized
        const startOpt = performance.now();
        for (let i = 0; i < ITERATIONS; i++) {
            calculateVolumeOptimized(session, exercisesMap);
        }
        const endOpt = performance.now();
        const timeOpt = endOpt - startOpt;

        console.log(`Current (Array.find): ${(timeCurrent).toFixed(3)}ms`);
        console.log(`Optimized (Map.get):  ${(timeOpt).toFixed(3)}ms`);
        console.log(`Improvement:          ${(timeCurrent / timeOpt).toFixed(2)}x faster`);
    }
}

runBenchmark();
