import { REST_PERIOD_HOURS, WEEK_WARNING_HOURS } from "../js/constants.js";

export const STRENGTH_READINESS_VERSION = "1.0.0";

export function evaluateWorkoutReadiness(sessions, { now = Date.now() } = {}) {
  if (!Array.isArray(sessions) || sessions.length === 0) return { valid: true, isFirst: true };
  const lastSession = sessions[sessions.length - 1];
  if (!lastSession || !lastSession.date) return { valid: true, warning: true };

  const hours = (now - new Date(lastSession.date)) / 3600000;
  if (hours < REST_PERIOD_HOURS) {
    return {
      valid: false,
      hours: Math.ceil(REST_PERIOD_HOURS - hours),
      nextAvailable: new Date(now + ((REST_PERIOD_HOURS - hours) * 3600000))
    };
  }
  if (hours > WEEK_WARNING_HOURS) {
    return {
      valid: true,
      warning: true,
      days: Math.floor(hours / 24),
      message: "Long gap since last workout"
    };
  }
  return { valid: true };
}

export function createStrengthReadiness({ getSessions, now = () => Date.now(), onMissingDate = () => {} } = {}) {
  if (typeof getSessions !== "function") throw new TypeError("Strength readiness requires an app-owned session source.");
  return Object.freeze({
    canStartWorkout() {
      const sessions = getSessions();
      if (Array.isArray(sessions) && sessions.length > 0 && !sessions[sessions.length - 1]?.date) onMissingDate();
      return evaluateWorkoutReadiness(sessions, { now: now() });
    }
  });
}
