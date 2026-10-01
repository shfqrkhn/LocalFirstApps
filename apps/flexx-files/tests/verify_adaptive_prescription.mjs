import assert from 'node:assert/strict';
import { BASE_BUILDING_SESSIONS, buildStrengthPrescription } from '../js/prescription.js';

function ids(plan) {
    return plan.exercises.map(ex => ex.id);
}

function hasPush(plan) {
    return ids(plan).some(id => id.startsWith('push_'));
}

function hasPull(plan) {
    return ids(plan).some(id => id === 'pull' || id === 'pull_vert');
}

const short = buildStrengthPrescription({ availableMinutes: 20, recoveryStatus: 'green', sessionIndex: 0 });
assert.equal(short.exercises.length, 4);
assert(ids(short).includes('hinge'));
assert(ids(short).includes('knee'));
assert(hasPush(short));
assert(hasPull(short));
assert(short.exercises.every(ex => ex.sets === 2));
assert.equal(short.baseBuilding, true);

const base = buildStrengthPrescription({ availableMinutes: 60, recoveryStatus: 'green', sessionIndex: BASE_BUILDING_SESSIONS - 1 });
assert(base.exercises.every(ex => ex.sets === 2));
assert.equal(base.conditioning.mode, 'steady');

const trained = buildStrengthPrescription({ availableMinutes: 45, recoveryStatus: 'green', sessionIndex: BASE_BUILDING_SESSIONS });
assert.equal(trained.exercises.length, 7);
assert(trained.exercises.slice(0, 4).every(ex => ex.sets === 3));
assert(trained.exercises.slice(4).every(ex => ex.sets === 2));
assert.equal(trained.baseBuilding, false);

const yellow = buildStrengthPrescription({ availableMinutes: 45, recoveryStatus: 'yellow', sessionIndex: BASE_BUILDING_SESSIONS });
assert.equal(yellow.exercises.length, 6);

const a = buildStrengthPrescription({ availableMinutes: 30, sessionIndex: BASE_BUILDING_SESSIONS });
const b = buildStrengthPrescription({ availableMinutes: 30, sessionIndex: BASE_BUILDING_SESSIONS + 1 });
assert.notDeepEqual(ids(a), ids(b));
assert(hasPush(a) && hasPull(a) && hasPush(b) && hasPull(b));

const varied = buildStrengthPrescription({
    availableMinutes: 30,
    sessionIndex: BASE_BUILDING_SESSIONS,
    varietyMode: 'fresh'
});
assert(varied.exercises.some(ex => ex.preferredAlternative));

const unavailable = buildStrengthPrescription({
    availableMinutes: 30,
    sessionIndex: BASE_BUILDING_SESSIONS,
    unavailableExerciseIds: ['hinge']
});
assert(unavailable.exercises.find(ex => ex.id === 'hinge')?.preferredAlternative);

const homeBase = buildStrengthPrescription({
    availableMinutes: 20,
    environment: 'home-bike',
    recoveryStatus: 'green',
    sessionIndex: 0
});
assert.equal(homeBase.exercises.length, 0);
assert.equal(homeBase.conditioning.type, 'Stationary Bike');
assert.equal(homeBase.conditioning.mode, 'steady');

const homeReady = buildStrengthPrescription({
    availableMinutes: 20,
    environment: 'home-bike',
    recoveryStatus: 'green',
    sessionIndex: BASE_BUILDING_SESSIONS
});
assert.equal(homeReady.conditioning.mode, 'interval');
assert.match(homeReady.conditioning.intervals, /not all-out/);

const red = buildStrengthPrescription({
    availableMinutes: 45,
    recoveryStatus: 'red',
    sessionIndex: BASE_BUILDING_SESSIONS
});
assert.equal(red.exercises.length, 0);
assert.equal(red.conditioning.mode, 'none');

const clamped = buildStrengthPrescription({ availableMinutes: 1 });
assert.equal(clamped.availableMinutes, 15);
assert.equal(clamped.exercises.length, 4);

console.log('Adaptive prescription checks passed.');
