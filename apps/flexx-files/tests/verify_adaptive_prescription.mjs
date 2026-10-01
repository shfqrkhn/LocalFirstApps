import assert from 'node:assert/strict';
import { buildStrengthPrescription } from '../js/prescription.js';

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

const normal = buildStrengthPrescription({ availableMinutes: 45, recoveryStatus: 'green', sessionIndex: 0 });
assert.equal(normal.exercises.length, 7);
assert(normal.exercises.slice(0, 4).every(ex => ex.sets === 3));
assert(normal.exercises.slice(4).every(ex => ex.sets === 2));

const yellow = buildStrengthPrescription({ availableMinutes: 45, recoveryStatus: 'yellow', sessionIndex: 0 });
assert.equal(yellow.exercises.length, 6);

const a = buildStrengthPrescription({ availableMinutes: 30, sessionIndex: 0 });
const b = buildStrengthPrescription({ availableMinutes: 30, sessionIndex: 1 });
assert.notDeepEqual(ids(a), ids(b));
assert(hasPush(a) && hasPull(a) && hasPush(b) && hasPull(b));

const clamped = buildStrengthPrescription({ availableMinutes: 1 });
assert.equal(clamped.availableMinutes, 15);
assert.equal(clamped.exercises.length, 4);

console.log('Adaptive prescription checks passed.');
