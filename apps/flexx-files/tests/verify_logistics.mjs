import assert from 'node:assert/strict';
import {
    estimateDoorToDoorMinutes,
    getEnvironmentOverheadMinutes,
    getTrainingBudgetMinutes
} from '../js/logistics.js';

assert.equal(getEnvironmentOverheadMinutes({ environment: 'gym' }), 20);
assert.equal(getEnvironmentOverheadMinutes({ environment: 'home-bike' }), 5);

assert.equal(getTrainingBudgetMinutes({
    totalBudgetMinutes: 75,
    environment: 'gym'
}), 55);

assert.equal(getTrainingBudgetMinutes({
    totalBudgetMinutes: 30,
    environment: 'home-bike'
}), 25);

assert.equal(getTrainingBudgetMinutes({
    totalBudgetMinutes: 40,
    environment: 'gym'
}), 0);

assert.equal(getTrainingBudgetMinutes({
    totalBudgetMinutes: 180,
    environment: 'gym'
}), 90);

assert.equal(estimateDoorToDoorMinutes({
    trainingMinutes: 40,
    environment: 'gym'
}), 60);

console.log('Logistics checks passed.');
