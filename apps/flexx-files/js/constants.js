/**
 * Application Constants
 * All magic numbers and configuration values centralized for maintainability
 */

// === WORKOUT TIMING ===
export const REST_PERIOD_HOURS = 24; // Minimum hours between workouts
export const WEEK_WARNING_HOURS = 168; // Warn if more than 1 week since last workout (7 days)
export const SESSIONS_PER_WEEK = 3; // Used for week number calculation
export const DEFAULT_REST_TIMER_SECONDS = 90; // Default rest between sets

// === PROGRESSION SYSTEM ===
export const WEIGHT_INCREMENT_LBS = 5; // Weight increase on successful completion
export const STEPPER_INCREMENT_LBS = 2.5; // Weight adjustment step in UI
export const DELOAD_WEEK_INTERVAL = 6; // Deload every N weeks
export const DELOAD_PERCENTAGE = 0.6; // 60% of max for deload week
export const STALL_DELOAD_PERCENTAGE = 0.9; // 90% of weight on stall detection
export const STALL_DETECTION_SESSIONS = 3; // Number of failed sessions to trigger stall
export const YELLOW_RECOVERY_MULTIPLIER = 0.9; // 90% weight on yellow recovery

// === BARBELL CALCULATIONS ===
export const OLYMPIC_BAR_WEIGHT_LBS = 45; // Standard Olympic barbell weight
export const AVAILABLE_PLATES = [45, 35, 25, 10, 5, 2.5, 1.25]; // Available plate weights
export const PLATE_CACHE_LIMIT = 300; // Max number of weight calculations to cache

// === AUTO-EXPORT ===
export const AUTO_EXPORT_INTERVAL = 5; // Auto-export every N sessions

// === DATA VERSIONING ===
export const APP_VERSION = '3.9.73';
export const STORAGE_VERSION = 'v3';
export const STORAGE_PREFIX = 'flexx_';

// === OBSERVABILITY ===
export const LOG_LEVEL = 'INFO'; // DEBUG, INFO, WARN, ERROR, CRITICAL
export const MAX_LOG_ENTRIES = 500;
export const MAX_ERROR_ENTRIES = 50;
export const PERFORMANCE_LONG_TASK_MS = 50;

// === SECURITY ===
export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
export const SESSION_DRAFT_AUTOSAVE_INTERVAL_MS = 30000; // 30 seconds
export const MAX_IMPORT_FILE_SIZE_MB = 10; // Maximum file size for data imports (DoS prevention)

// === ACCESSIBILITY ===
export const A11Y_ANNOUNCE_DELAY_MS = 100;
export const A11Y_FOCUS_TRAP_ENABLED = true;

// === I18N ===
export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en'];

// === SUSTAINABILITY ===
export const BATTERY_LOW_THRESHOLD = 0.2; // 20%
export const BATTERY_CRITICAL_THRESHOLD = 0.15; // 15%

// === DEBUG ===
export const DUMMY_DATA_SESSIONS = 8; // Number of sessions in dummy data
export const DUMMY_DATA_DAYS_BACK = 30; // How far back to generate dummy data
export const DEBUG_REST_UNLOCK_HOURS = 73; // Backdating time for rest unlock (3 days + 1 hour)

// === UI TIMING ===
export const CHART_RENDER_DELAY_MS = 100; // Delay before rendering chart to ensure DOM is ready
export const TIMER_TICK_INTERVAL_MS = 1000; // Timer update frequency
export const HISTORY_PAGINATION_LIMIT = 20; // Number of sessions to load per page
export const CARDIO_TIMER_SECONDS = 300; // Default duration for cardio timer (5 mins)

// === RECOVERY STATES ===
export const RECOVERY_STATES = {
    GREEN: 'green',
    YELLOW: 'yellow',
    RED: 'red'
};

// === WORKOUT PHASES ===
export const PHASES = {
    WARMUP: 'warmup',
    LIFTING: 'lifting',
    CARDIO: 'cardio',
    DECOMPRESSION: 'decompression'
};

// === ERROR MESSAGES ===
export const ERROR_MESSAGES = {
    SAVE_FAILED: 'Failed to save workout. Please try exporting your data.',
    DELETE_FAILED: 'Failed to delete session. Please try again.',
    IMPORT_INVALID_FORMAT: 'Invalid file format: sessions must be an array',
    IMPORT_MISSING_FIELDS: 'Invalid file: some sessions are missing required fields',
    IMPORT_PARSE_ERROR: 'Invalid file: Please ensure this is a valid Flexx Files backup file.',
    IMPORT_FILE_TOO_LARGE: 'File too large. Maximum size is 10MB.',
    EXPORT_FAILED: 'Failed to export data. Please try again.',
    LOAD_FAILED: 'Failed to load sessions data'
};
