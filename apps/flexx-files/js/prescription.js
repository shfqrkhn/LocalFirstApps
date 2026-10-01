import { EXERCISE_MAP } from './config.js';

export const PRESCRIPTION_VERSION = '1.0';

const MIN_SESSION_MINUTES = 15;
const MAX_SESSION_MINUTES = 90;

const ROTATIONS = [
    ['hinge', 'knee', 'push_horz', 'pull_vert', 'push_vert', 'pull', 'carry', 'calves', 'push_incline'],
    ['knee', 'hinge', 'push_vert', 'pull', 'push_horz', 'pull_vert', 'carry', 'calves', 'push_incline']
];

function clampMinutes(value) {
    const minutes = Number(value);
    if (!Number.isFinite(minutes)) return 45;
    return Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, Math.round(minutes)));
}

function exerciseLimit(minutes) {
    if (minutes < 25) return 4;
    if (minutes < 35) return 5;
    if (minutes < 45) return 6;
    if (minutes < 60) return 7;
    return 9;
}

function prescribedSets(minutes, rank) {
    if (minutes >= 60 && rank < 6) return 3;
    if (minutes >= 45 && rank < 4) return 3;
    return 2;
}

function isPush(id) {
    return id === 'push_horz' || id === 'push_vert' || id === 'push_incline';
}

function isPull(id) {
    return id === 'pull' || id === 'pull_vert';
}

export function buildStrengthPrescription({
    availableMinutes = 45,
    recoveryStatus = 'green',
    sessionIndex = 0
} = {}) {
    const minutes = clampMinutes(availableMinutes);
    const rotation = ROTATIONS[Math.abs(Number(sessionIndex) || 0) % ROTATIONS.length];
    let limit = exerciseLimit(minutes);

    // Readiness should change the dose conservatively without replacing observed
    // performance as the primary long-term progression signal.
    if (recoveryStatus === 'yellow' && limit > 4) limit -= 1;

    const ids = rotation.filter(id => EXERCISE_MAP.has(id)).slice(0, limit);

    // A compressed session must remain broadly full-body: hinge + knee plus at
    // least one push and one pull whenever the configured exercise pool permits it.
    const mandatory = ['hinge', 'knee'];
    for (const id of mandatory) {
        if (EXERCISE_MAP.has(id) && !ids.includes(id)) ids.unshift(id);
    }

    if (!ids.some(isPush)) {
        const push = rotation.find(id => isPush(id) && EXERCISE_MAP.has(id));
        if (push) ids.push(push);
    }
    if (!ids.some(isPull)) {
        const pull = rotation.find(id => isPull(id) && EXERCISE_MAP.has(id));
        if (pull) ids.push(pull);
    }

    const uniqueIds = [...new Set(ids)].slice(0, limit);

    const exercises = uniqueIds.map((id, rank) => {
        const config = EXERCISE_MAP.get(id);
        return {
            id,
            sets: prescribedSets(minutes, rank),
            reps: config.reps,
            reason: rank < 4 ? 'core full-body coverage' : 'added because time budget permits'
        };
    });

    return {
        version: PRESCRIPTION_VERSION,
        availableMinutes: minutes,
        recoveryStatus,
        exercises,
        rationale: 'Minimum effective full-body dose first; lower-priority work is added only when the time budget permits.'
    };
}

export default buildStrengthPrescription;
