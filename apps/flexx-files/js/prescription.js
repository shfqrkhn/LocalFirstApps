import { EXERCISE_MAP } from './config.js';

export const PRESCRIPTION_VERSION = '1.1';
export const BASE_BUILDING_SESSIONS = 6;

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

function prescribedSets(minutes, rank, baseBuilding) {
    if (baseBuilding) return 2;
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

function preferredAlternative(config, varietyMode) {
    if (!config?.alternatives?.length || varietyMode === 'default') return null;
    if (varietyMode === 'fresh') return config.alternatives[0];
    if (varietyMode === 'different') return config.alternatives[1] || config.alternatives[0];
    return null;
}

function buildConditioning({ environment, minutes, recoveryStatus, baseBuilding }) {
    if (recoveryStatus === 'red') {
        return { mode: 'none', durationMinutes: 0, reason: 'low readiness' };
    }

    if (environment === 'home-bike') {
        if (!baseBuilding && recoveryStatus === 'green' && minutes >= 20) {
            return {
                type: 'Stationary Bike',
                mode: 'interval',
                durationMinutes: Math.min(24, minutes),
                intervals: '6 x 30s hard / 60s easy; not all-out',
                reason: 'time-efficient aerobic stimulus after base-building'
            };
        }
        return {
            type: 'Stationary Bike',
            mode: 'steady',
            durationMinutes: minutes,
            reason: 'base-building or lower-readiness aerobic work'
        };
    }

    if (minutes >= 45) {
        return {
            type: 'Stationary Bike',
            mode: baseBuilding ? 'steady' : 'optional-interval',
            durationMinutes: baseBuilding ? 5 : 6,
            reason: 'compact cardiorespiratory complement'
        };
    }

    return { mode: 'none', durationMinutes: 0, reason: 'strength work has higher marginal value in this time budget' };
}

export function buildStrengthPrescription({
    availableMinutes = 45,
    recoveryStatus = 'green',
    sessionIndex = 0,
    environment = 'gym',
    varietyMode = 'default',
    unavailableExerciseIds = []
} = {}) {
    const minutes = clampMinutes(availableMinutes);
    const baseBuilding = (Number(sessionIndex) || 0) < BASE_BUILDING_SESSIONS;
    const conditioning = buildConditioning({ environment, minutes, recoveryStatus, baseBuilding });

    if (environment === 'home-bike') {
        return {
            version: PRESCRIPTION_VERSION,
            availableMinutes: minutes,
            recoveryStatus,
            environment,
            baseBuilding,
            exercises: [],
            conditioning,
            rationale: 'Home bike complements aerobic fitness but does not replace required resistance-training coverage.'
        };
    }

    const rotation = ROTATIONS[Math.abs(Number(sessionIndex) || 0) % ROTATIONS.length];
    let limit = exerciseLimit(minutes);

    if (recoveryStatus === 'yellow' && limit > 4) limit -= 1;
    if (recoveryStatus === 'red') limit = 0;

    const ids = rotation.filter(id => EXERCISE_MAP.has(id)).slice(0, limit);

    const mandatory = ['hinge', 'knee'];
    for (const id of mandatory) {
        if (EXERCISE_MAP.has(id) && !ids.includes(id) && limit > 0) ids.unshift(id);
    }

    if (limit > 0 && !ids.some(isPush)) {
        const push = rotation.find(id => isPush(id) && EXERCISE_MAP.has(id));
        if (push) ids.push(push);
    }
    if (limit > 0 && !ids.some(isPull)) {
        const pull = rotation.find(id => isPull(id) && EXERCISE_MAP.has(id));
        if (pull) ids.push(pull);
    }

    const unavailable = new Set(unavailableExerciseIds);
    const uniqueIds = [...new Set(ids)].slice(0, limit);

    const exercises = uniqueIds.map((id, rank) => {
        const config = EXERCISE_MAP.get(id);
        const fallback = unavailable.has(id) ? (config.alternatives?.[0] || null) : preferredAlternative(config, varietyMode);
        return {
            id,
            sets: prescribedSets(minutes, rank, baseBuilding),
            reps: config.reps,
            preferredAlternative: fallback,
            supersetGroup: Math.floor(rank / 2) + 1,
            reason: rank < 4 ? 'core full-body coverage' : 'added because time budget permits'
        };
    });

    return {
        version: PRESCRIPTION_VERSION,
        availableMinutes: minutes,
        recoveryStatus,
        environment,
        baseBuilding,
        exercises,
        conditioning,
        rationale: baseBuilding
            ? 'Base-building phase: practice, tolerance and consistency before load/intensity progression.'
            : 'Minimum effective full-body dose first; lower-priority work is added only when the time budget permits.'
    };
}

export default buildStrengthPrescription;
