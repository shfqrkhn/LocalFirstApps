import assert from 'node:assert/strict';
import {
    estimateDoorToDoorMinutes,
    getEnvironmentOverheadMinutes,
    getTrainingBudgetMinutes
} from '../js/logistics.js';

assert.equal(getEnvironmentOverheadMinutes({ environment: 'gym' }), 30);
assert.equal(getEnvironmentOverheadMinutes({ environment: 'home-bike' }), 3);

assert.equal(getTrainingBudgetMinutes({
    totalBudgetMinutes: 75,
    environment: 'gym'
}), 45);

assert.equal(getTrainingBudgetMinutes({
    totalBudgetMinutes: 30,
    environment: 'home-bike'
}), 27);

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
}), 70);

console.log('Logistics checks passed.');
