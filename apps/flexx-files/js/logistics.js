export const DEFAULT_GYM_OVERHEAD_MINUTES = 20;
export const DEFAULT_HOME_SETUP_MINUTES = 5;

export function getEnvironmentOverheadMinutes({
    environment = 'gym',
    gymOverheadMinutes = DEFAULT_GYM_OVERHEAD_MINUTES,
    homeSetupMinutes = DEFAULT_HOME_SETUP_MINUTES
} = {}) {
    const raw = environment === 'home-bike' ? homeSetupMinutes : gymOverheadMinutes;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export function getTrainingBudgetMinutes({
    totalBudgetMinutes,
    environment = 'gym',
    gymOverheadMinutes = DEFAULT_GYM_OVERHEAD_MINUTES,
    homeSetupMinutes = DEFAULT_HOME_SETUP_MINUTES,
    minimumTrainingMinutes = 15,
    maximumTrainingMinutes = 90
} = {}) {
    const total = Number(totalBudgetMinutes);
    const safeTotal = Number.isFinite(total) ? Math.max(0, Math.round(total)) : 0;
    const overhead = getEnvironmentOverheadMinutes({
        environment,
        gymOverheadMinutes,
        homeSetupMinutes
    });

    const available = safeTotal - overhead;
    if (available < minimumTrainingMinutes) return 0;
    return Math.min(maximumTrainingMinutes, available);
}

export function estimateDoorToDoorMinutes({
    trainingMinutes,
    environment = 'gym',
    gymOverheadMinutes = DEFAULT_GYM_OVERHEAD_MINUTES,
    homeSetupMinutes = DEFAULT_HOME_SETUP_MINUTES
} = {}) {
    const training = Number(trainingMinutes);
    const safeTraining = Number.isFinite(training) ? Math.max(0, Math.round(training)) : 0;
    return safeTraining + getEnvironmentOverheadMinutes({
        environment,
        gymOverheadMinutes,
        homeSetupMinutes
    });
}
