# CommonGround LifeOS Reflection R3A–R3D Contract

Version `1.0.0` defines the Noodle-owned Reflection domain and controller boundary. The private MPES remains prime authority. R3A–R3D do not migrate user data, approve assessment/health content, or grant CommonGround LifeOS access to Noodle storage.

## Ownership and compatibility

Noodle Nudge `1.2.31` remains independently launchable at `apps/noodle-nudge/`. It alone owns IndexedDB `NoodleNudgeDB` version 1, object store `appState`, record key `appState`, its `noodle-nudge-` caches and worker scope, route, content, backups, reset, results, and history. HealthOS only links to Noodle.

The runtime state keys are `assessments`, `dailyContent`, `userAnswers`, `userResults`, `userHistory`, `viewDate`, `appConfig`, `settings`, and `debugLog`. Only the latter seven are persisted; assessment definitions and daily content remain inert local shell assets. R3D adds, renames, migrates, dual-writes, or deletes no database, store, record key, result shape, history entry, or backup field.

## Domain and controller modules

`reflection/definitions.js`, `scoring.js`, `backup.js`, and `reflection-adapter.js` retain the ten definitions, 42 scoring outputs, bounded expression grammar, backup compatibility, and mutation-forbidden LifeOS preview. The old `scoring.js` URL remains a compatibility re-export.

`controller/config.js`, `state.js`, `storage.js`, `content.js`, `session.js`, `settings.js`, `views.js`, and `bindings.js` own configuration, selectors, transactional IndexedDB access, content activation, assessment orchestration, backup/reset commands, safe DOM/chart rendering, routing, input modes, and lifecycle bindings. `app.js` is a 119-line composition root; `index.html` is a 65-line shell. Views do not use dynamic HTML injection, inline handlers are absent, and the script CSP no longer permits `unsafe-inline`.

The only compatibility bindings are:

```text
App.init
App.navigate
State.get
State.set
Scoring.calculateResults
SettingsManager.exportData
SettingsManager.importData
SettingsManager.resetData
SettingsManager.fillWithRandomData
```

## Mutation, recovery, and concurrency

Ordinary persistence shallow-merges only changed app-state fields inside an IndexedDB transaction. Assessment completion atomically reads the latest record and commits its answer, result, and capped 50-entry history together, preventing a stale tab from erasing unrelated assessment sets. Visible-page and restored-page lifecycle events re-read app-owned state without interrupting an assessment in progress. LocalStorage events are explicitly ignored because Noodle owns no localStorage.

Legacy backups without `userHistory` and current backups remain accepted after size, extension, JSON, structure, and unsafe-key validation. Import is one atomic record replacement; failures remain visible and preserve prior data. Reset still requires two actions and now starts a complete JSON backup before clearing the Noodle store; backup failure cancels deletion. Foreign databases, localStorage, caches, HealthOS, and Flexx remain untouched.

## Evidence and rollback

`tests/r3d-noodle-controller-regression.mjs` and `tests/fixtures/noodle-controller-v1.json` freeze the database, state, routes, compatibility, input, render, event, import, history, scoring, CSP, isolation, and offline-shell contracts. Browser gates complete all ten assessments, both interaction types, keyboard/pointer/drag paths, reload/history, legacy/current/malformed/quota imports, multi-tab refresh, foreign events/data, reset cancellation/failure/success, offline/update/last-known-good recovery, responsive/file behavior, and automated accessibility.

Rollback is code-only: revert R3D implementation commit `0d8634c`. No data downgrade or migration reversal is required.
