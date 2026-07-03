import { EXERCISES, EXERCISE_MAP } from './config.js';
import * as CONST from './constants.js';
import { Validator as SecurityValidator, Sanitizer } from './security.js';
import { Logger } from './observability.js';

// Optimization: Create O(1) lookup map and Set for exercises
const EXERCISE_IDS = new Set(EXERCISE_MAP.keys());

export const Storage = {
    KEYS: {
        SESSIONS: `${CONST.STORAGE_PREFIX}sessions_v3`,
        PREFS: `${CONST.STORAGE_PREFIX}prefs`,
        MIGRATION_VERSION: `${CONST.STORAGE_PREFIX}migration_version`,
        BACKUP: `${CONST.STORAGE_PREFIX}backup_snapshot`,
        DRAFT: `${CONST.STORAGE_PREFIX}draft_session`
    },

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
                const validation = SecurityValidator.validateSession(parsed);
                if (!validation.valid) {
                    Logger.warn('Invalid draft session detected and discarded', { errors: validation.errors });
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
            const data = {
                version: CONST.APP_VERSION,
                exportDate: new Date().toISOString(),
                sessions
            };
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
            const data = {
                version: CONST.APP_VERSION,
                type: 'auto',
                sessions
            };
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
        try {
            const data = JSON.parse(jsonString);

            // Use Security Validator
            const validation = SecurityValidator.validateImportData(data);
            if (!validation.valid) {
                // SECURITY: Never expose validation details to user
                Logger.error('Import validation failed', { errors: validation.errors });
                return { valid: false, error: CONST.ERROR_MESSAGES.IMPORT_PARSE_ERROR };
            }

            const sessions = Array.isArray(data) ? data : data.sessions;

            // Sentinel: Scrub sessions to prevent schema pollution
            const cleanSessions = sessions.map(s => Sanitizer.scrubSession(s)).filter(s => s !== null);

            return { valid: true, sessions: cleanSessions };
        } catch (e) {
            Logger.error('Import error:', { error: e.message });
            return { valid: false, error: CONST.ERROR_MESSAGES.IMPORT_PARSE_ERROR };
        }
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

export const Calculator = {
    // Optimization: Cache expensive lookups keyed by sessions array instance
    _cache: new WeakMap(),
    _plateCache: new Map(),
    _loadBuffer: [],
    // Optimization: Pre-calculate plate strings to avoid repeated conversion
    _plateStrings: CONST.AVAILABLE_PLATES.map(String),
    _lastSessions: null,
    _lastLookup: null,

    _cloneLookup(lookup) {
        const newLookup = new Map();
        for (const [key, val] of lookup) {
            newLookup.set(key, {
                last: val.last,
                lastSession: val.lastSession,
                lastCompleted: val.lastCompleted,
                lastNonDeload: val.lastNonDeload,
                lastGreen: val.lastGreen,
                recent: [...val.recent] // Copy array to prevent shared mutation
            });
        }
        return newLookup;
    },

    _applySession(lookup, session) {
        const week = Math.ceil(session.sessionNumber / CONST.SESSIONS_PER_WEEK);
        const isDeload = (week % CONST.DELOAD_WEEK_INTERVAL === 0);

        for (const ex of session.exercises) {
            if (ex.skipped) continue;

            const key = (ex.usingAlternative && ex.altName) ? ex.altName : ex.id;
            if (!lookup.has(key)) {
                lookup.set(key, { last: null, lastSession: null, lastCompleted: null, lastNonDeload: null, lastGreen: null, recent: [] });
            }
            const entry = lookup.get(key);

            // Add to recent history (newest at start)
            entry.recent.unshift(ex);
            if (entry.recent.length > CONST.STALL_DETECTION_SESSIONS) {
                entry.recent.pop();
            }

            // Update last (this is the newest)
            entry.last = ex;
            entry.lastSession = session;

            // Update lastCompleted
            if (ex.completed) {
                entry.lastCompleted = ex;
            }

            // Update lastNonDeload
            if (!isDeload) {
                entry.lastNonDeload = ex;
            }

            // Update lastGreen
            if (session.recoveryStatus === 'green' && !isDeload) {
                entry.lastGreen = ex;
            }
        }
    },

    _rollbackSession(lookup, session, historySessions) {
        // Rollback is trickier because we need to undo state changes.
        // historySessions is the FULL history array from which we are removing the last session.
        // We use it to refill 'recent' buffer and find previous 'lastCompleted' if needed.

        // We need to know which exercises were in the session we are removing
        for (const ex of session.exercises) {
            if (ex.skipped) continue;

            const key = (ex.usingAlternative && ex.altName) ? ex.altName : ex.id;
            const entry = lookup.get(key);
            if (!entry) continue;

            // 1. Remove from 'recent'
            // The removed exercise should be at index 0 of recent
            if (entry.recent.length > 0 && entry.recent[0] === ex) {
                entry.recent.shift();

                // Refill 'recent' from history if it dropped below threshold
                if (entry.recent.length < CONST.STALL_DETECTION_SESSIONS) {
                    this._scanBackwardsForRecent(entry, key, historySessions, historySessions.length - 2);
                }
            }

            // 2. Update 'last'
            entry.last = entry.recent.length > 0 ? entry.recent[0] : null;
            entry.lastSession = null; // Invalidate cache to force fallback

            // 3. Update 'lastCompleted'
            if (entry.lastCompleted === ex) {
                const recentCompleted = entry.recent.find(e => e.completed);
                if (recentCompleted) {
                    entry.lastCompleted = recentCompleted;
                } else {
                    entry.lastCompleted = this._scanBackwardsForCompleted(key, historySessions, historySessions.length - 2);
                }
            }

            // 4. Update 'lastNonDeload'
            if (entry.lastNonDeload === ex) {
                entry.lastNonDeload = this._scanBackwardsForNonDeload(key, historySessions, historySessions.length - 2);
            }

            // 5. Update 'lastGreen'
            if (entry.lastGreen === ex) {
                entry.lastGreen = this._scanBackwardsForGreen(key, historySessions, historySessions.length - 2);
            }
        }
    },

    _scanBackwardsForGreen(key, sessions, startIndex) {
        for (let i = startIndex; i >= 0; i--) {
            const session = sessions[i];
            if (session.recoveryStatus !== 'green') continue;

            const week = Math.ceil(session.sessionNumber / CONST.SESSIONS_PER_WEEK);
            if (week % CONST.DELOAD_WEEK_INTERVAL === 0) continue;

            const ex = session.exercises.find(e => {
                const k = (e.usingAlternative && e.altName) ? e.altName : e.id;
                return k === key && !e.skipped;
            });

            if (ex) return ex;
        }
        return null;
    },

    _scanBackwardsForRecent(entry, key, sessions, startIndex) {
        for (let i = startIndex; i >= 0; i--) {
            if (entry.recent.length >= CONST.STALL_DETECTION_SESSIONS) break;

            const session = sessions[i];
            const ex = session.exercises.find(e => {
                const k = (e.usingAlternative && e.altName) ? e.altName : e.id;
                return k === key && !e.skipped;
            });

            if (ex) {
                if (!entry.recent.includes(ex)) {
                    entry.recent.push(ex);
                }
            }
        }
    },

    _scanBackwardsForCompleted(key, sessions, startIndex) {
        for (let i = startIndex; i >= 0; i--) {
            const session = sessions[i];
            const ex = session.exercises.find(e => {
                const k = (e.usingAlternative && e.altName) ? e.altName : e.id;
                return k === key && !e.skipped;
            });

            if (ex && ex.completed) {
                return ex;
            }
        }
        return null;
    },

    _scanBackwardsForNonDeload(key, sessions, startIndex) {
        for (let i = startIndex; i >= 0; i--) {
            const session = sessions[i];
            const week = Math.ceil(session.sessionNumber / CONST.SESSIONS_PER_WEEK);
            if (week % CONST.DELOAD_WEEK_INTERVAL === 0) continue;

            const ex = session.exercises.find(e => {
                const k = (e.usingAlternative && e.altName) ? e.altName : e.id;
                return k === key && !e.skipped;
            });

            if (ex) return ex;
        }
        return null;
    },

    _ensureCache(sessions, targetId = null) {
        if (this._cache.has(sessions)) {
            const lookup = this._cache.get(sessions);
            // If targetId is requested but missing, and the cache was built using a partial scan,
            // we must force a full scan to find the missing target.
            if (targetId && !lookup.has(targetId) && lookup._isPartial) {
                // Fall through to full scan logic (bypass return)
            } else {
                return lookup;
            }
        }

        // Optimization: Content Equality Check
        // If array identity differs but content is identical (same session objects in same order),
        // we can reuse the cached lookup.
        if (this._lastSessions && sessions.length === this._lastSessions.length) {
            let match = true;
            // Iterate backwards as changes are usually at the end
            for (let i = sessions.length - 1; i >= 0; i--) {
                if (sessions[i] !== this._lastSessions[i]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                // Check for partial cache validity with targetId
                if (targetId && !this._lastLookup.has(targetId) && this._lastLookup._isPartial) {
                    // Fall through to full scan
                } else {
                    this._cache.set(sessions, this._lastLookup);
                    this._lastSessions = sessions; // Update reference to newest array
                    return this._lastLookup;
                }
            }
        }

        // Optimization: Incremental Update
        if (this._lastSessions && this._lastLookup) {
            const oldLen = this._lastSessions.length;
            const newLen = sessions.length;

            // If the last lookup was partial and we need a target it doesn't have,
            // we cannot use incremental update safely without complex logic.
            // Simpler to just fall back to full scan.
            const forceFullScan = targetId && !this._lastLookup.has(targetId) && this._lastLookup._isPartial;

            if (!forceFullScan) {
                // Case 1: Append (newLen === oldLen + 1)
                if (newLen === oldLen + 1 &&
                    (oldLen === 0 || (sessions[0] === this._lastSessions[0] && sessions[oldLen - 1] === this._lastSessions[oldLen - 1]))) {

                    const newLookup = this._cloneLookup(this._lastLookup);
                    newLookup._isPartial = this._lastLookup._isPartial;
                    this._applySession(newLookup, sessions[newLen - 1]);

                    this._cache.set(sessions, newLookup);
                    this._lastSessions = sessions;
                    this._lastLookup = newLookup;
                    return newLookup;
                }

                // Case 2: Replace Last (newLen === oldLen)
                // e.g. User updated the current workout
                if (newLen === oldLen && oldLen > 0 &&
                    (sessions[0] === this._lastSessions[0] &&
                     (oldLen === 1 || sessions[oldLen - 2] === this._lastSessions[oldLen - 2]))) {

                    const newLookup = this._cloneLookup(this._lastLookup);
                    newLookup._isPartial = this._lastLookup._isPartial;
                    this._rollbackSession(newLookup, this._lastSessions[oldLen - 1], this._lastSessions);
                    this._applySession(newLookup, sessions[newLen - 1]);

                    this._cache.set(sessions, newLookup);
                    this._lastSessions = sessions;
                    this._lastLookup = newLookup;
                    return newLookup;
                }

                // Case 3: Remove Last (newLen === oldLen - 1)
                // e.g. User deleted the last workout
                if (newLen === oldLen - 1 && newLen > 0 &&
                     (sessions[0] === this._lastSessions[0] && sessions[newLen - 1] === this._lastSessions[newLen - 1])) {

                     const newLookup = this._cloneLookup(this._lastLookup);
                     newLookup._isPartial = this._lastLookup._isPartial;
                     this._rollbackSession(newLookup, this._lastSessions[oldLen - 1], this._lastSessions);

                     this._cache.set(sessions, newLookup);
                     this._lastSessions = sessions;
                     this._lastLookup = newLookup;
                     return newLookup;
                }

                // Case 4: Remove Last to Empty (1 -> 0)
                if (newLen === 0 && oldLen === 1) {
                     const newLookup = new Map();
                     newLookup._isPartial = false; // Empty is complete
                     this._cache.set(sessions, newLookup);
                     this._lastSessions = sessions;
                     this._lastLookup = newLookup;
                     return newLookup;
                }
            }
        }

        // Optimization: Iterate backwards and stop early once we found data for all current exercises.
        // NOTE: This assumes we primarily care about exercises in the current configuration (EXERCISES).
        // If the user has history for exercises no longer in EXERCISES, or if they haven't performed
        // one of the current exercises, we will scan the full history (falling back to O(N)).
        // This is acceptable as the app UI is driven by EXERCISES.
        const lookup = new Map(); // Map<exerciseId, { last, lastSession, lastCompleted, lastNonDeload, lastGreen, recent }>

        // Optimization: Use pre-calculated Set
        const requiredIds = EXERCISE_IDS;
        const fullyResolved = new Set();
        let brokeEarly = false;

        for (let i = sessions.length - 1; i >= 0; i--) {
            // Stop if we have found everything we need
            // AND if a specific target was requested, we found it too.
            const targetFound = !targetId || fullyResolved.has(targetId);
            if (fullyResolved.size >= requiredIds.size && targetFound) {
                brokeEarly = true;
                break;
            }

            const session = sessions[i];
            for (const ex of session.exercises) {
                if (ex.skipped) continue;

                const key = (ex.usingAlternative && ex.altName) ? ex.altName : ex.id;
                if (!lookup.has(key)) {
                    lookup.set(key, { last: null, lastSession: null, lastCompleted: null, lastNonDeload: null, lastGreen: null, recent: [] });
                }
                const entry = lookup.get(key);

                // Add to recent history if we haven't hit the limit yet
                if (entry.recent.length < CONST.STALL_DETECTION_SESSIONS) {
                    entry.recent.push(ex);
                }

                // Since iterating backwards, the first valid entry found is the latest
                if (!entry.last) {
                    entry.last = ex;
                    entry.lastSession = session;
                }

                if (ex.completed && !entry.lastCompleted) {
                    entry.lastCompleted = ex;
                }

                if (!entry.lastNonDeload) {
                    const week = Math.ceil(session.sessionNumber / CONST.SESSIONS_PER_WEEK);
                    if (week % CONST.DELOAD_WEEK_INTERVAL !== 0) {
                        entry.lastNonDeload = ex;
                    }
                }

                // Update lastGreen (first one encountered is the latest)
                if (!entry.lastGreen && session.recoveryStatus === 'green') {
                    const week = Math.ceil(session.sessionNumber / CONST.SESSIONS_PER_WEEK);
                    if (week % CONST.DELOAD_WEEK_INTERVAL !== 0) {
                        entry.lastGreen = ex;
                    }
                }

                // Check if this exercise is fully resolved (we have lastCompleted AND enough recent history)
                // Note: We need lastCompleted to calculate progression.
                // We need recent to detect stalls.
                // If we have both, we can stop searching for this exercise.
                const isRequired = requiredIds.has(key) || key === targetId;
                if (isRequired && !fullyResolved.has(key)) {
                    // We are resolved if:
                    // 1. We have found a completed entry (so we know the last successful weight)
                    // 2. We have filled the recent buffer (so we can detect stalls)
                    // 3. We have found the last non-deload entry
                    // 4. We have found the last green entry
                    // Note: If the user has NEVER completed the exercise, we will scan full history.
                    // This is expected and necessary to find the last completion (which doesn't exist).
                    if (entry.lastCompleted && entry.recent.length >= CONST.STALL_DETECTION_SESSIONS && entry.lastNonDeload && entry.lastGreen) {
                        fullyResolved.add(key);
                    }
                }
            }
        }

        lookup._isPartial = brokeEarly;
        this._cache.set(sessions, lookup);
        this._lastSessions = sessions;
        this._lastLookup = lookup;
        return lookup;
    },

    getRecommendedWeight(exerciseId, recoveryStatus, sessions) {
        if (!sessions) sessions = Storage.getSessions();
        if (sessions.length === 0) return 0;

        const base = this.getBaseRecommendation(exerciseId, sessions);
        const factor = recoveryStatus === CONST.RECOVERY_STATES.YELLOW ?
            CONST.YELLOW_RECOVERY_MULTIPLIER : 1.0;
        let w = base * factor;
        return parseFloat((Math.round(w / CONST.STEPPER_INCREMENT_LBS) * CONST.STEPPER_INCREMENT_LBS).toFixed(1));
    },

    isDeloadWeek(sessions) {
        if (!sessions) sessions = Storage.getSessions();
        const week = Math.ceil((sessions.length + 1) / CONST.SESSIONS_PER_WEEK);
        return (week > 0 && week % CONST.DELOAD_WEEK_INTERVAL === 0);
    },

    getBaseRecommendation(exerciseId, sessions) {
        // Deload every N weeks
        if (this.isDeloadWeek(sessions)) {
            // Check if we are already in the deload week (mid-week)
            if (sessions.length > 0) {
                const lastSession = sessions[sessions.length - 1];
                const currentWeek = Math.ceil((sessions.length + 1) / CONST.SESSIONS_PER_WEEK);
                const lastWeek = Math.ceil(lastSession.sessionNumber / CONST.SESSIONS_PER_WEEK);

                if (lastWeek === currentWeek) {
                    // Already deloaded. Return last attempt weight (maintain).
                    const lastAttempt = this.getLastExercise(exerciseId, sessions);
                    return lastAttempt ? lastAttempt.weight : CONST.OLYMPIC_BAR_WEIGHT_LBS;
                }
            }

            const last = this.getLastCompletedExercise(exerciseId, sessions);
            return last ? last.weight * CONST.DELOAD_PERCENTAGE : CONST.OLYMPIC_BAR_WEIGHT_LBS;
        }

        // Stall detection: reduce weight if failing repeatedly
        if (this.detectStall(exerciseId, sessions)) {
            const last = this.getLastExercise(exerciseId, sessions);
            return last ? last.weight * CONST.STALL_DELOAD_PERCENTAGE : CONST.OLYMPIC_BAR_WEIGHT_LBS;
        }

        // Normal progression: add weight on success
        const last = this.getLastExercise(exerciseId, sessions);
        if (!last) return CONST.OLYMPIC_BAR_WEIGHT_LBS;

        // Check if coming out of a deload week
        if (sessions.length > 0) {
            const lastSession = sessions[sessions.length - 1];
            const lastWeek = Math.ceil(lastSession.sessionNumber / CONST.SESSIONS_PER_WEEK);

            // If previous session was a deload week, resume from pre-deload weight
            if (lastWeek % CONST.DELOAD_WEEK_INTERVAL === 0) {
                const preDeloadEx = this.getLastNonDeloadExercise(exerciseId, sessions);
                if (preDeloadEx) {
                    // Check if pre-deload session was a transient dip (Yellow)
                    const lastGreen = this.getLastGreenExercise(exerciseId, sessions);
                    if (lastGreen && preDeloadEx.completed && preDeloadEx.weight < lastGreen.weight) {
                        return lastGreen.weight;
                    }
                    return preDeloadEx.completed ? preDeloadEx.weight + CONST.WEIGHT_INCREMENT_LBS : preDeloadEx.weight;
                }
            }
        }

        // Transient State Resilience:
        // If the last session was a constrained recovery day (Yellow/Red) and resulted in a
        // weight lower than our Green baseline, we should restore the Green baseline.
        // This prevents temporary constraints from permanently degrading progress.
        const lastRecovery = this.getLastRecoveryStatus(exerciseId, sessions);
        if (lastRecovery && lastRecovery !== 'green' && last.completed) {
            const lastGreen = this.getLastGreenExercise(exerciseId, sessions);
            // If we have a green baseline that is higher than what we just did
            if (lastGreen && lastGreen.weight > last.weight) {
                // Resume progression from the Green baseline
                // (Assuming we would have progressed if not constrained)
                return lastGreen.completed ? lastGreen.weight + CONST.WEIGHT_INCREMENT_LBS : lastGreen.weight;
            }
        }

        return last.completed ? last.weight + CONST.WEIGHT_INCREMENT_LBS : last.weight;
    },

    detectStall(exerciseId, sessions) {
        const cache = this._ensureCache(sessions, exerciseId);
        const entry = cache.get(exerciseId);

        // If we don't have enough history, it's not a stall
        if (!entry || entry.recent.length < CONST.STALL_DETECTION_SESSIONS) return false;

        const recent = entry.recent;
        // Stall detected if all recent attempts failed at same weight
        return recent.every(e => !e.completed && e.weight === recent[0].weight);
    },

    getLastExercise(exerciseId, sessions) {
        const cache = this._ensureCache(sessions, exerciseId);
        const entry = cache.get(exerciseId);
        return entry ? entry.last : null;
    },

    getLastCompletedExercise(exerciseId, sessions) {
        const cache = this._ensureCache(sessions, exerciseId);
        const entry = cache.get(exerciseId);
        return entry ? entry.lastCompleted : null;
    },

    getLastNonDeloadExercise(exerciseId, sessions) {
        const cache = this._ensureCache(sessions, exerciseId);
        const entry = cache.get(exerciseId);
        return entry ? entry.lastNonDeload : null;
    },

    getLastGreenExercise(exerciseId, sessions) {
        const cache = this._ensureCache(sessions, exerciseId);
        const entry = cache.get(exerciseId);
        return entry ? entry.lastGreen : null;
    },

    getLastRecoveryStatus(exerciseId, sessions) {
        const cache = this._ensureCache(sessions, exerciseId);
        const entry = cache.get(exerciseId);

        // Optimized Path: O(1)
        if (entry && entry.lastSession) {
            return entry.lastSession.recoveryStatus;
        }

        // Fallback Path: O(N)
        if (!entry || !entry.last) return null;

        // Find the session containing the last exercise object
        // Optimization: iterate backwards as it's likely recent
        for (let i = sessions.length - 1; i >= 0; i--) {
            const s = sessions[i];
            if (s.exercises.includes(entry.last)) {
                // Self-healing cache: Update lastSession if found
                entry.lastSession = s;
                return s.recoveryStatus;
            }
        }
        return null;
    },

    getPlateLoad(weight) {
        if (this._plateCache.has(weight)) {
            const result = this._plateCache.get(weight);
            // LRU: Move to end of cache by deleting and re-inserting
            this._plateCache.delete(weight);
            this._plateCache.set(weight, result);
            return result;
        }

        // Calculate plates needed for each side of barbell
        let result;
        if (weight < CONST.OLYMPIC_BAR_WEIGHT_LBS) {
            result = 'Use DBs / Fixed Bar';
        } else {
            const target = (weight - CONST.OLYMPIC_BAR_WEIGHT_LBS) / 2; // Each side gets half
            // Epsilon for floating point comparison (0.005 lbs precision is sufficient for 1.25 lbs plates)
            const EPSILON = 0.005;

            if (target <= EPSILON) {
                result = 'Empty Bar';
            } else {
                this._loadBuffer.length = 0;
                let rem = target + EPSILON; // Add epsilon to ensure we catch plates slightly below threshold due to FP error
                const plates = CONST.AVAILABLE_PLATES;
                const plateStrs = this._plateStrings;
                const len = plates.length;

                // Greedy algorithm: use largest plates first
                for (let i = 0; i < len; i++) {
                    const p = plates[i];
                    const pStr = plateStrs[i];
                    while (rem >= p) {
                        this._loadBuffer.push(pStr);
                        rem -= p;
                    }
                }
                result = this._loadBuffer.length ? `+ [ ${this._loadBuffer.join(', ')} ]` : 'Empty Bar';
            }
        }

        // Optimization: Memoize result
        // Limit cache size to prevent memory leaks (e.g. 300 entries)
        if (this._plateCache.size > CONST.PLATE_CACHE_LIMIT) {
            const firstKey = this._plateCache.keys().next().value;
            this._plateCache.delete(firstKey);
        }
        this._plateCache.set(weight, result);

        return result;
    },
};

export const Validator = {
    canStartWorkout() {
        const sessions = Storage.getSessions();
        if (sessions.length === 0) return { valid: true, isFirst: true };

        const lastSession = sessions[sessions.length - 1];
        if (!lastSession || !lastSession.date) {
            Logger.warn('Last session missing date');
            return { valid: true, warning: true };
        }

        const hours = (Date.now() - new Date(lastSession.date)) / 3600000;

        // Require minimum rest period
        if (hours < CONST.REST_PERIOD_HOURS) {
            return {
                valid: false,
                hours: Math.ceil(CONST.REST_PERIOD_HOURS - hours),
                nextAvailable: new Date(Date.now() + ((CONST.REST_PERIOD_HOURS - hours) * 3600000))
            };
        }

        // Warn if it's been more than a week
        if (hours > CONST.WEEK_WARNING_HOURS) {
            return {
                valid: true,
                warning: true,
                days: Math.floor(hours / 24),
                message: 'Long gap since last workout'
            };
        }

        return { valid: true };
    }
};