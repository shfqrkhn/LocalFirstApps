import { EXERCISE_MAP } from './config.js';
import * as CONST from './constants.js';
import { Validator as SecurityValidator, Sanitizer } from './security.js';
import { Logger } from './observability.js';
import { createStrengthCalculator } from '../strength/calculations.js';
import { createStrengthReadiness } from '../strength/readiness.js';
import { buildStrengthBackup, validateStrengthBackup, validateStrengthDraft } from '../strength/recovery.js';
import { STRENGTH_STORAGE_KEYS } from '../strength/storage-contract.js';

export const Storage = {
    KEYS: STRENGTH_STORAGE_KEYS,

    // Performance Optimization: Cache parsed sessions to avoid repeated JSON.parse()
    _sessionCache: null,
    _cachedSessionsSize: null, // Optimization: Avoid repeated getItem() for large JSON
    _pendingWrite: null,
    _pendingWriteType: null, // 'timeout' or 'idle'
    _isCorrupted: false,

    // Draft Optimization: Debounce draft writes
    _draftCache: null,
    _pendingDraftWrite: null,
    _shouldClearDraft: false,

    invalidateSessionCache() {
        this._sessionCache = null;
    },

    /**
     * ATOMIC TRANSACTION SYSTEM
     * Provides rollback capability for safe data operations
     */
    Transaction: {
        inProgress: false,
        snapshot: null,

        begin() {
            if (this.inProgress) {
                Logger.warn('Transaction already in progress');
                return false;
            }

            try {
                // Create snapshot of current data
                // Sentinel: Use reference copy for performance (O(1)).
                // Rationale: usage patterns in saveSession guarantee that the sessions array
                // and its contained objects are effectively immutable during the transaction.
                // We trust the application not to mutate cache objects in-place.
                this.snapshot = Storage.getSessions();
                this.inProgress = true;
                Logger.debug('Transaction started', { sessionCount: this.snapshot.length });
                return true;
            } catch (e) {
                Logger.error('Failed to begin transaction:', { error: e.message });
                return false;
            }
        },

        commit() {
            if (!this.inProgress) {
                Logger.warn('No transaction in progress');
                return false;
            }

            try {
                // Transaction successful, clear snapshot
                this.snapshot = null;
                this.inProgress = false;
                Logger.debug('Transaction committed');
                return true;
            } catch (e) {
                Logger.error('Failed to commit transaction:', { error: e.message });
                this.rollback();
                return false;
            }
        },

        rollback() {
            if (!this.inProgress || !this.snapshot) {
                Logger.warn('No transaction to rollback');
                return false;
            }

            try {
                // Restore from snapshot
                localStorage.setItem(Storage.KEYS.SESSIONS, JSON.stringify(this.snapshot));
                Storage._sessionCache = null; // Invalidate cache
                this.snapshot = null;
                this.inProgress = false;
                Logger.warn('Transaction rolled back');
                return true;
            } catch (e) {
                Logger.critical('Failed to rollback transaction:', { error: e.message });
                return false;
            }
        }
    },

    /**
     * Save draft session for recovery
     */
    saveDraft(session) {
        // Update cache immediately
        this._draftCache = session;

        // Debounce: Clear previous timer
        if (this._pendingDraftWrite) {
            clearTimeout(this._pendingDraftWrite);
        }

        // Schedule write
        this._pendingDraftWrite = setTimeout(() => {
            this.flushDraft();
        }, 500); // 500ms debounce

        return true;
    },

    /**
     * Flush pending draft write immediately
     */
    flushDraft() {
        if (this._pendingDraftWrite) {
            clearTimeout(this._pendingDraftWrite);
            this._pendingDraftWrite = null;
        }

        if (this._draftCache) {
            try {
                localStorage.setItem(this.KEYS.DRAFT, JSON.stringify(this._draftCache));
                Logger.debug('Draft saved (flushed)', { sessionId: this._draftCache.id });
                return true;
            } catch (e) {
                Logger.error('Failed to flush draft:', { error: e.message });
                return false;
            }
        }
        return true;
    },

    /**
     * Load draft session
     */
    loadDraft() {
        try {
            const draft = localStorage.getItem(this.KEYS.DRAFT);
            const parsed = draft ? JSON.parse(draft) : null;

            if (parsed) {
                // SECURITY: Validate draft structure to prevent injection/corruption
                const validation = validateStrengthDraft(parsed, session => SecurityValidator.validateSession(session));
                if (!validation.valid) {
                    Logger.warn('Invalid draft session detected and discarded', { errors: validation.issues });
                    this.clearDraft();
                    return null;
                }
            }

            this._draftCache = parsed; // Populate cache
            return parsed;
        } catch (e) {
            Logger.error('Failed to load draft:', { error: e.message });
            return null;
        }
    },

    /**
     * Clear draft session
     */
    clearDraft() {
        try {
            if (this._pendingDraftWrite) {
                clearTimeout(this._pendingDraftWrite);
                this._pendingDraftWrite = null;
            }
            this._draftCache = null;

            localStorage.removeItem(this.KEYS.DRAFT);
            Logger.debug('Draft cleared');
            return true;
        } catch (e) {
            Logger.error('Failed to clear draft:', { error: e.message });
            return false;
        }
    },

    /**
     * Schema Migration System
     * Handles safe transitions between storage versions
     */
    getCurrentMigrationVersion() {
        return localStorage.getItem(this.KEYS.MIGRATION_VERSION) || 'v3';
    },

    setMigrationVersion(version) {
        localStorage.setItem(this.KEYS.MIGRATION_VERSION, version);
    },

    runMigrations() {
        const currentVersion = this.getCurrentMigrationVersion();
        Logger.info(`Current migration version: ${currentVersion}`);

        // If we're already on the latest version, no migration needed
        if (currentVersion === CONST.STORAGE_VERSION) {
            return;
        }

        try {
            // Run migrations in sequence
            if (currentVersion === 'v3' && CONST.STORAGE_VERSION === 'v4') {
                this.migrateV3toV4();
            }
            // Add more migration paths here as needed
            // if (currentVersion === 'v4' && CONST.STORAGE_VERSION === 'v5') {
            //     this.migrateV4toV5();
            // }

            // Update migration version after successful migration
            this.setMigrationVersion(CONST.STORAGE_VERSION);
            Logger.info(`Successfully migrated to ${CONST.STORAGE_VERSION}`);
        } catch (e) {
            Logger.error('Migration failed:', { error: e.message });
            throw new Error('Data migration failed. Your data is safe but may need manual export/import.');
        }
    },

    /**
     * Example migration: v3 to v4
     * Currently a no-op since we're still on v3
     * This demonstrates the pattern for future migrations
     */
    migrateV3toV4() {
        Logger.info('Running v3 -> v4 migration');
        const sessions = this.getSessions();

        // Example migration logic:
        // Add new fields, rename fields, transform data, etc.
        const migratedSessions = sessions.map(session => {
            // Future: Add any new required fields
            // if (!session.newField) {
            //     session.newField = defaultValue;
            // }
            return session;
        });

        localStorage.setItem(this.KEYS.SESSIONS, JSON.stringify(migratedSessions));
        Logger.info(`Migrated ${migratedSessions.length} sessions`);
    },

    getSessions() {
        if (this._sessionCache) return this._sessionCache;
        try {
            const data = localStorage.getItem(this.KEYS.SESSIONS);
            if (!data) {
                this._cachedSessionsSize = 0;
                return [];
            }
            // Optimization: Cache size to avoid reading large string again in getUsage()
            this._cachedSessionsSize = data.length;

            const sessions = JSON.parse(data);
            // Validate it's an array
            this._sessionCache = Array.isArray(sessions) ? sessions : [];
            return this._sessionCache;
        } catch (e) {
            Logger.error('Failed to load sessions:', { error: e.message });
            // Sentinel: Flag corruption to prevent overwriting raw data later
            this._isCorrupted = true;
            // Return empty array so UI can still render partial state (e.g. empty history)
            // but saving will be blocked.
            return [];
        }
    },

    saveSession(session) {
        // Ensure data is loaded to detect corruption state
        this.getSessions();

        // Sentinel: Prevent data loss if storage is corrupted
        if (this._isCorrupted) {
            const msg = 'Storage is corrupted. Cannot save to prevent data loss. Please export data immediately.';
            Logger.critical(msg);
            throw new Error(msg);
        }

        // Start atomic transaction
        if (!this.Transaction.begin()) {
            Logger.error('Could not start transaction for saveSession');
            throw new Error('Transaction failed to start');
        }

        try {
            // QUOTA GUARD: Check storage usage before saving
            // Prevent data loss by blocking saves when near capacity (Bolt Mode)
            const usage = this.getUsage();
            if (usage.percent > 96) { // Leave ~200KB buffer
                Logger.warn('Storage quota exceeded', { usage: usage.percent });
                throw new Error('STORAGE_FULL');
            }

            // SECURITY: Validate session structure before saving
            const validation = SecurityValidator.validateSession(session);
            if (!validation.valid) {
                const errorMsg = `Invalid session data: ${validation.errors.join(', ')}`;
                Logger.error(errorMsg, { sessionId: session?.id });
                throw new Error(errorMsg);
            }

            const sessions = this.getSessions();

            // IDEMPOTENCY CHECK: Prevent duplicate saves of the same session
            // If a session with this ID already exists, update it instead of creating a duplicate
            const existingIndex = sessions.findIndex(s => s.id === session.id);
            if (existingIndex !== -1) {
                Logger.warn(`Session ${session.id} already exists. Updating instead of creating duplicate.`);
                // Update existing session
                session.sessionNumber = sessions[existingIndex].sessionNumber;
                session.weekNumber = sessions[existingIndex].weekNumber;
            } else {
                // New session: assign numbers
                session.sessionNumber = sessions.length + 1;
                session.weekNumber = Math.ceil(session.sessionNumber / 3);
            }

            session.totalVolume = session.exercises.reduce((sum, ex) => {
                if (ex.skipped) return sum;
                // Look up the exercise config to get the prescribed reps
                // Optimization: O(1) lookup
                const cfg = EXERCISE_MAP.get(ex.id);
                const reps = cfg ? cfg.reps : 0;
                return sum + (ex.weight * ex.setsCompleted * reps);
            }, 0);

            // Sentinel: Enforce strict schema validation before persistence
            const cleanSession = Sanitizer.scrubSession(session);
            if (!cleanSession) {
                throw new Error('Session scrubbing failed');
            }

            // Create a new array instance to ensure cache invalidation for consumers
            // relying on array identity (like Calculator's WeakMap)
            let newSessions;
            if (existingIndex !== -1) {
                // Update existing session
                newSessions = [...sessions];
                newSessions[existingIndex] = cleanSession;
            } else {
                // Add new session
                newSessions = [...sessions, cleanSession];
            }

            // Update cache and storage with the new array
            this._sessionCache = newSessions;

            // Optimization: Non-blocking I/O (Async Persistence)
            // Defer strict persistence to allow UI thread to unblock immediately
            this.schedulePersistence();

            // Defer draft clearing until persistence is confirmed
            this._shouldClearDraft = true;

            Logger.info('Session saved successfully (async scheduled)', { id: session.id, number: session.sessionNumber });
            return session;
        } catch (e) {
            Logger.error('Failed to save session:', { error: e.message });
            // Rollback transaction on error
            this.Transaction.rollback();
            throw e; // Re-throw so caller knows it failed
        }
    },

    deleteSession(id) {
        // Sentinel: Prevent data loss if storage is corrupted
        if (this._isCorrupted) {
            const msg = 'Storage is corrupted. Cannot modify data.';
            Logger.critical(msg);
            throw new Error(msg);
        }

        if (!this.Transaction.begin()) {
            Logger.error('Could not start transaction for deleteSession');
            throw new Error('Transaction failed to start');
        }

        try {
            const sessions = this.getSessions();
            const index = sessions.findIndex(s => s.id === id);

            if (index === -1) {
                Logger.warn(`Session ${id} not found`);
                this.Transaction.commit(); // Close transaction cleanly
                return false;
            }

            // Optimization: Create new array via splice to avoid O(N) filter callbacks
            const newSessions = sessions.slice();
            newSessions.splice(index, 1);

            this._sessionCache = newSessions; // Update cache

            // Commit transaction after successful cache update
            this.Transaction.commit();

            // Optimization: Non-blocking I/O
            this.schedulePersistence();
            return true;
        } catch (e) {
            Logger.error('Failed to delete session:', { error: e.message });
            this.Transaction.rollback();
            throw new Error('Failed to delete session. Please try again.');
        }
    },

    exportData() {
        try {
            const sessions = this.getSessions();
            const data = buildStrengthBackup(sessions, {
                version: CONST.APP_VERSION,
                exportDate: new Date().toISOString()
            });
            // Windows Safe Filename (No colons)
            const safeDate = new Date().toISOString().replace(/:/g, '-').split('.')[0];
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `flexx-files-backup-${safeDate}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (e) {
            Logger.error('Export error:', { error: e.message });
            throw new Error(CONST.ERROR_MESSAGES.EXPORT_FAILED);
        }
    },

    autoExport(sessions) {
        try {
            const data = buildStrengthBackup(sessions, {
                version: CONST.APP_VERSION,
                type: 'auto'
            });
            const safeDate = new Date().toISOString().replace(/:/g, '-').split('.')[0];
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `flexx-files-auto-${safeDate}.json`;
            a.click();
        } catch (e) {
            Logger.error('Auto-export error:', { error: e.message });
            // Don't alert for auto-export failures, just log
        }
    },

    validateImport(jsonString) {
        const result = validateStrengthBackup(jsonString, {
            validateImportData: data => SecurityValidator.validateImportData(data),
            scrubSession: session => Sanitizer.scrubSession(session)
        }, CONST.ERROR_MESSAGES.IMPORT_PARSE_ERROR);
        if (!result.valid) Logger.error('Import validation failed', { errors: result.issues });
        return result.valid
            ? { valid: true, sessions: result.sessions }
            : { valid: false, error: result.error };
    },

    applyImport(sessions) {
        try {
            localStorage.setItem(this.KEYS.SESSIONS, JSON.stringify(sessions));
            this._sessionCache = null;
            window.location.reload();
        } catch (e) {
            Logger.error('Apply import error:', { error: e.message });
            throw new Error('Failed to apply import data');
        }
    },

    schedulePersistence() {
        if (this._pendingWrite) {
            if (this._pendingWriteType === 'idle' && typeof window.cancelIdleCallback === 'function') {
                window.cancelIdleCallback(this._pendingWrite);
            } else {
                clearTimeout(this._pendingWrite);
            }
        }

        // Use requestIdleCallback if available for better non-blocking behavior
        if (typeof window.requestIdleCallback === 'function') {
            this._pendingWriteType = 'idle';
            this._pendingWrite = window.requestIdleCallback(() => {
                this.flushPersistence();
            }, { timeout: 2000 }); // Force write after 2s if no idle time
        } else {
            this._pendingWriteType = 'timeout';
            // Defer to next tick to allow UI update
            this._pendingWrite = setTimeout(() => {
                this.flushPersistence();
            }, 0);
        }
    },

    flushPersistence() {
        if (this._pendingWrite) {
            if (this._pendingWriteType === 'idle' && typeof window.cancelIdleCallback === 'function') {
                window.cancelIdleCallback(this._pendingWrite);
            } else {
                clearTimeout(this._pendingWrite);
            }
            this._pendingWrite = null;
            this._pendingWriteType = null;
        }

        if (!this._sessionCache) return;
        try {
            const json = JSON.stringify(this._sessionCache);
            localStorage.setItem(this.KEYS.SESSIONS, json);
            // Optimization: Update cached size immediately after write
            this._cachedSessionsSize = json.length;

            if (this._shouldClearDraft) {
                this.clearDraft();
                this._shouldClearDraft = false;
            }

            // Commit transaction if in progress
            if (this.Transaction.inProgress) {
                this.Transaction.commit();
            }
        } catch (e) {
            Logger.error('Persistence failed:', { error: e.message });
            if (this.Transaction.inProgress) {
                this.Transaction.rollback();
            }
        }
        this._pendingWrite = null;
    },

    reset() {
        // Sentinel: Only clear Flexx Files data, preserving other apps on same origin
        const prefix = CONST.STORAGE_PREFIX || 'flexx_';
        const keys = Object.keys(localStorage);

        keys.forEach(key => {
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        });

        this._sessionCache = null;
        window.location.reload();
    },

    /**
     * Calculate storage usage
     * @returns {object} { bytes, percent, limit }
     */
    getUsage() {
        let total = 0;
        const prefix = CONST.STORAGE_PREFIX || 'flexx_';
        try {
            // Iterate using key() to support mocks and standard localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    // Optimization: Use cached size for large sessions key to avoid allocation
                    if (key === this.KEYS.SESSIONS && this._cachedSessionsSize !== null) {
                        total += (key.length + this._cachedSessionsSize) * 2;
                        continue;
                    }

                    const value = localStorage.getItem(key);
                    if (value) {
                        total += (key.length + value.length) * 2; // UTF-16 approximation (2 bytes per char)
                    }
                }
            }
        } catch (e) {
            Logger.warn('Storage usage calculation failed', { error: e.message });
        }

        const limit = 5 * 1024 * 1024; // 5MB typical limit
        return {
            bytes: total,
            percent: Math.min(100, (total / limit) * 100),
            limit
        };
    },

};

export const Calculator = createStrengthCalculator({
    getSessions: () => Storage.getSessions()
});

export const Validator = createStrengthReadiness({
    getSessions: () => Storage.getSessions(),
    onMissingDate: () => Logger.warn('Last session missing date')
});
