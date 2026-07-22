# HealthOS M3A Contract

Version `1.0.0` defines the bounded HealthOS foundation and focus-timer proof. The private MPES remains prime authority. This public contract adds no permission to implement later HealthOS modules.

## Topology and ownership

HealthOS Focus is an independently launchable static app and the seed runtime beneath the CommonGround LifeOS `1.0.0` shell label. Noodle Nudge remains canonical for reflection and self-inquiry. Flexx Files remains canonical for strength, readiness, drafts, progression, and backups. HealthOS does not read or mutate either app's browser storage; there is no central suite database, hidden synchronization, background business mutation, account, telemetry, external transmission, or AI dependency.

HealthOS owns only IndexedDB `healthos-focus` v1, the `healthos.preferences.v1` localStorage key, `healthos-` caches, and the exact worker scope under `apps/healthos/`. Cross-app movement uses explicit portable files.

HealthOS also owns the canonical record and timer modules under `apps/healthos/modules/`. The prior `shared/healthos.js` and `shared/focus-timer.js` URLs remain compatibility re-exports, not OmniCore domain contracts. HealthOS consumes only pure OmniCore completion, error, integrity, time, receipt, and design seams through its app-owned adapter; transaction scope and mutations remain here.

## Typed portable records

Both record types are dependency-free M1-compatible portable records with semantic version, namespaced type, collision-resistant ID, provenance/truth class, revision, ISO instants, IANA timezone, explicit units, assumptions, conflicts, relationships, tags, idempotency, and SHA-256 manifests.

`healthos/daily_state` keeps these independent fields: calendar date, life state, mood, energy, sleep quality, stress, soreness, pain flags, intended focus, recovery need, and notes. Optional observations use 1–5 ordinal units. No combined readiness, wellness, health, or productivity score exists.

`healthos/focus_session` records intention, mode, planned and completed minutes, interruptions, distraction notes, outcome, energy before/after, stopped reason, start/end instants, and observed life state.

Portable import validates before preview, shows exact selected content, requires confirmation, remaps to new IDs, and applies records plus a unique receipt atomically. Duplicate packages fail visibly. Receipt rollback removes only receipt-owned records while retaining replay protection. Unsupported majors, unknown record types, malformed/oversize input, hash failure, partial writes, and quota failures fail closed.

## Trustworthy timer

Modes are 25/5, 50/10, custom, 5-minute minimum, 10-minute minimum, and open stopwatch. Runtime state persists start, segment-start, update, pause/resume, and last-observed instants plus accumulated duration, revision, interruptions, and distraction notes. Elapsed time derives from instants rather than decrement-only intervals, so reload, suspension, sleep, and process termination reconcile on return.

Pause, resume, restart, finish, skip, cancel, and manual correction are explicit. A backward clock change freezes at the last trusted elapsed value and displays recovery guidance. Durations remain instant-based across timezone, daylight-saving, and leap-date boundaries while the original IANA timezone is retained. A target reaching zero writes nothing automatically: the user reviews and confirms the session. Session IDs make repeated completion idempotent. Expected revisions reject stale tabs and preserve the newer state.

Audio, vibration, system notification, and screen wake lock are capability-detected and opt-in. Unavailable/denied capabilities degrade to the visible in-app timer. Browser background delivery is never represented as real-time guaranteed, medical, emergency, or safety alarm behavior.

## Observation and recovery boundaries

Life states remain observations: READY, FOCUSED, STRETCHED, OVERLOADED, DEGRADED, RECOVERING, BLOCKED, and CRISIS. Guidance reduces scope and demands where appropriate; it does not diagnose, prescribe, shame, gamify, require streaks, force advancement, or replace qualified support.

Complete backup includes records, receipts, active timer, and cue preferences with SHA-256 integrity. Restore validates, then atomically replaces canonical IndexedDB stores while recording a durable `preferences-pending` recovery marker in the same transaction. It performs one preference commit afterward: failure is visible, never reported as success, and leaves an idempotent retry path that completes without restoring records again. Factory reset downloads a backup first and clears only HealthOS-owned state. The content-addressed PWA shell follows the M2 contract for explicit compatible activation, offline/subpath behavior, last-known-good recovery, scoped cache clear, honest storage health, and safe reduced `file://` fallback.

TS-Dash export is explicit deterministic CSV. It preserves source app, record ID, truth class, units, source precision, derivation labels, and the statement that observational correlation does not establish causation. TS-Dash remains generic and never reads HealthOS storage.

## Deferred modules

Meditation, breathing, C25K, mobility/recovery, sleep observation, rest events, and broader distraction/session modules remain inactive and unimplemented until separately accepted and gated.
