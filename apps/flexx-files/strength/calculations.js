import * as CONST from "../js/constants.js";

export const STRENGTH_CALCULATIONS_VERSION = "1.0.0";

function exerciseKey(exercise) {
  return exercise?.usingAlternative && exercise.altName ? exercise.altName : exercise?.id;
}

export function createStrengthCalculator({ getSessions = () => [] } = {}) {
  const calculator = {
    _cache: new WeakMap(),
    _plateCache: new Map(),
    _loadBuffer: [],
    _plateStrings: CONST.AVAILABLE_PLATES.map(String),

    _sessions(sessions) {
      const value = sessions === undefined ? getSessions() : sessions;
      return Array.isArray(value) ? value : [];
    },

    _ensureCache(sessions, targetId = null) {
      sessions = this._sessions(sessions);
      if (this._cache.has(sessions)) return this._cache.get(sessions);

      const lookup = new Map();
      for (let i = sessions.length - 1; i >= 0; i--) {
        const session = sessions[i];
        const week = Math.ceil(session.sessionNumber / CONST.SESSIONS_PER_WEEK);
        const isDeload = week % CONST.DELOAD_WEEK_INTERVAL === 0;
        for (const exercise of session.exercises || []) {
          if (exercise.skipped) continue;
          const key = exerciseKey(exercise);
          if (!lookup.has(key)) {
            lookup.set(key, { last: null, lastSession: null, lastCompleted: null, lastNonDeload: null, lastGreen: null, recent: [] });
          }
          const entry = lookup.get(key);
          if (entry.recent.length < CONST.STALL_DETECTION_SESSIONS) entry.recent.push(exercise);
          if (!entry.last) {
            entry.last = exercise;
            entry.lastSession = session;
          }
          if (!entry.lastCompleted && exercise.completed) entry.lastCompleted = exercise;
          if (!entry.lastNonDeload && !isDeload) entry.lastNonDeload = exercise;
          if (!entry.lastGreen && session.recoveryStatus === CONST.RECOVERY_STATES.GREEN && !isDeload) entry.lastGreen = exercise;
        }
      }
      this._cache.set(sessions, lookup);
      return lookup;
    },

    getRecommendedWeight(exerciseId, recoveryStatus, sessions) {
      sessions = this._sessions(sessions);
      if (sessions.length === 0) return 0;
      const base = this.getBaseRecommendation(exerciseId, sessions);
      const factor = recoveryStatus === CONST.RECOVERY_STATES.YELLOW ? CONST.YELLOW_RECOVERY_MULTIPLIER : 1;
      const weight = base * factor;
      return parseFloat((Math.round(weight / CONST.STEPPER_INCREMENT_LBS) * CONST.STEPPER_INCREMENT_LBS).toFixed(1));
    },

    isDeloadWeek(sessions) {
      sessions = this._sessions(sessions);
      const week = Math.ceil((sessions.length + 1) / CONST.SESSIONS_PER_WEEK);
      return week > 0 && week % CONST.DELOAD_WEEK_INTERVAL === 0;
    },

    getBaseRecommendation(exerciseId, sessions) {
      sessions = this._sessions(sessions);
      if (this.isDeloadWeek(sessions)) {
        if (sessions.length > 0) {
          const lastSession = sessions[sessions.length - 1];
          const currentWeek = Math.ceil((sessions.length + 1) / CONST.SESSIONS_PER_WEEK);
          const lastWeek = Math.ceil(lastSession.sessionNumber / CONST.SESSIONS_PER_WEEK);
          if (lastWeek === currentWeek) {
            const lastAttempt = this.getLastExercise(exerciseId, sessions);
            return lastAttempt ? lastAttempt.weight : CONST.OLYMPIC_BAR_WEIGHT_LBS;
          }
        }
        const last = this.getLastCompletedExercise(exerciseId, sessions);
        return last ? last.weight * CONST.DELOAD_PERCENTAGE : CONST.OLYMPIC_BAR_WEIGHT_LBS;
      }

      if (this.detectStall(exerciseId, sessions)) {
        const last = this.getLastExercise(exerciseId, sessions);
        return last ? last.weight * CONST.STALL_DELOAD_PERCENTAGE : CONST.OLYMPIC_BAR_WEIGHT_LBS;
      }

      const last = this.getLastExercise(exerciseId, sessions);
      if (!last) return CONST.OLYMPIC_BAR_WEIGHT_LBS;

      if (sessions.length > 0) {
        const lastSession = sessions[sessions.length - 1];
        const lastWeek = Math.ceil(lastSession.sessionNumber / CONST.SESSIONS_PER_WEEK);
        if (lastWeek % CONST.DELOAD_WEEK_INTERVAL === 0) {
          const preDeload = this.getLastNonDeloadExercise(exerciseId, sessions);
          if (preDeload) {
            const lastGreen = this.getLastGreenExercise(exerciseId, sessions);
            if (lastGreen && preDeload.completed && preDeload.weight < lastGreen.weight) return lastGreen.weight;
            return preDeload.completed ? preDeload.weight + CONST.WEIGHT_INCREMENT_LBS : preDeload.weight;
          }
        }
      }

      const lastRecovery = this.getLastRecoveryStatus(exerciseId, sessions);
      if (lastRecovery && lastRecovery !== CONST.RECOVERY_STATES.GREEN && last.completed) {
        const lastGreen = this.getLastGreenExercise(exerciseId, sessions);
        if (lastGreen && lastGreen.weight > last.weight) {
          return lastGreen.completed ? lastGreen.weight + CONST.WEIGHT_INCREMENT_LBS : lastGreen.weight;
        }
      }
      return last.completed ? last.weight + CONST.WEIGHT_INCREMENT_LBS : last.weight;
    },

    detectStall(exerciseId, sessions) {
      const entry = this._ensureCache(sessions, exerciseId).get(exerciseId);
      if (!entry || entry.recent.length < CONST.STALL_DETECTION_SESSIONS) return false;
      return entry.recent.every(exercise => !exercise.completed && exercise.weight === entry.recent[0].weight);
    },

    getLastExercise(exerciseId, sessions) {
      return this._ensureCache(sessions, exerciseId).get(exerciseId)?.last || null;
    },

    getLastCompletedExercise(exerciseId, sessions) {
      return this._ensureCache(sessions, exerciseId).get(exerciseId)?.lastCompleted || null;
    },

    getLastNonDeloadExercise(exerciseId, sessions) {
      return this._ensureCache(sessions, exerciseId).get(exerciseId)?.lastNonDeload || null;
    },

    getLastGreenExercise(exerciseId, sessions) {
      return this._ensureCache(sessions, exerciseId).get(exerciseId)?.lastGreen || null;
    },

    getLastRecoveryStatus(exerciseId, sessions) {
      return this._ensureCache(sessions, exerciseId).get(exerciseId)?.lastSession?.recoveryStatus || null;
    },

    getPlateLoad(weight) {
      if (this._plateCache.has(weight)) {
        const result = this._plateCache.get(weight);
        this._plateCache.delete(weight);
        this._plateCache.set(weight, result);
        return result;
      }

      let result;
      if (weight < CONST.OLYMPIC_BAR_WEIGHT_LBS) {
        result = "Use DBs / Fixed Bar";
      } else {
        const target = (weight - CONST.OLYMPIC_BAR_WEIGHT_LBS) / 2;
        const epsilon = 0.005;
        if (target <= epsilon) {
          result = "Empty Bar";
        } else {
          this._loadBuffer.length = 0;
          let remaining = target + epsilon;
          for (let index = 0; index < CONST.AVAILABLE_PLATES.length; index++) {
            const plate = CONST.AVAILABLE_PLATES[index];
            while (remaining >= plate) {
              this._loadBuffer.push(this._plateStrings[index]);
              remaining -= plate;
            }
          }
          result = this._loadBuffer.length ? `+ [ ${this._loadBuffer.join(", ")} ]` : "Empty Bar";
        }
      }

      if (this._plateCache.size > CONST.PLATE_CACHE_LIMIT) {
        this._plateCache.delete(this._plateCache.keys().next().value);
      }
      this._plateCache.set(weight, result);
      return result;
    }
  };
  return calculator;
}
