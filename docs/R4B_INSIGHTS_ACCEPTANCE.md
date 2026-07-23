# R4B readable Insights acceptance

Status: acceptance and legacy characterization were defined before successor
runtime mutation; the bounded successor is `VERIFIED_LOCAL` at implementation
commit `0f5b455`.

The private MPES remains prime product authority. Private OmniOS material is
supplementary assurance guidance only. R4B builds a CommonGround-owned readable
successor in parallel; it does not activate Insights, change the frozen
TS-Dash runtime, read its database from CommonGround, or authorize cutover.

## Observed legacy contract

- Route `/apps/ts-dash/` loads the four hash-frozen generated artifacts.
- IndexedDB `TSDashDB` uses Dexie physical version 10 for v1 and 20 for v2.
  Stores are `datasets`, `points`, and additive `metric_settings`, with the
  exact keys/indexes recorded in the golden fixture.
- CSV mapping auto-detects date/time, weight/value, metric, and unit headers.
  Date-only values use explicit local or UTC interpretation. Duplicate
  timestamp/metric pairs use latest, first, or running pairwise average.
- Weight kilograms use factor `2.2046226218`; legacy metric/unit profiles,
  invalid-row counts, warnings, ordering, raw values, and normalized records are
  characterized in `tests/fixtures/r4b-ts-dash-golden.json`.
- Exports use `<name>_normalized.csv`, `<name>_package.json`,
  `<name>_chart.png`, and `<name>_view_summary.json`. JSON import requires
  `dataset` and `points`; invalid structure says `Invalid package format.`
- Analytics include fixed range presets, latest/7d/30d KPIs, range and
  distribution summaries, daily aggregation, nearest/interpolated probes,
  threshold crossings, bands, recurrence/plateau, outlier, extrema,
  downsampling, milestones, comparisons, a chart, and a visible table.

## Acceptance

1. Tests fail before successor modules exist, then freeze legacy/new parity.
2. Readable dependency-free modules define bounded CSV parsing, mapping,
   normalization, analytics, exports, package validation, and revisioned
   in-memory preview transactions.
3. The successor is CommonGround-owned but inactive: no active-app import,
   route, database, worker, cross-app read/write, hidden transfer, or mutation
   authority. A test-only harness is the sole preview surface.
4. Preview UI provides a semantic chart description plus equivalent table,
   metric/range controls, textual status, non-causal language, keyboard,
   pointer/touch, 44 px targets, focus, forced colors, reduced motion, and
   320 px/200%-equivalent reflow.
5. Frozen TS-Dash artifacts/hashes, route, TSDashDB v1/v2 upgrade, imports,
   exports, clear confirmation, install/offline behavior, and foreign scope
   remain unchanged.
6. CommonGround's integrity-bound shell contains every successor source asset;
   missing/corrupt candidates still fail closed under existing PWA assurance.
7. Malformed, oversized, stale, quota, partial, duplicate, and concurrent
   preview operations fail visibly and atomically.

## Limitations and rollback

Manual assistive-technology testing, real browser quota/eviction, owner
acceptance, cutover, migration, deployment, postdeploy verification, and
publication remain `NOT_RUN`. Rollback is code/test/document-only; no user data
or schema is mutated.

## Verification

- `npm run test:r4b`: deterministic contract plus four browser cases pass,
  including frozen-runtime normalization, legacy JSON round-trip, v1-to-v2
  database upgrade, 320-to-3840 px accessible preview, 200%-equivalent reflow,
  and offline inactive-source loading.
- `npm run ci:candidate`: all existing unit, app-native, governance, visual,
  file, behavior, accessibility, recovery, and PWA gates pass; the
  deterministic runtime contains 172 files.
- `npm audit --audit-level=moderate`: zero vulnerabilities.
- Runtime-contract sync, content governance, and `git diff --check` pass.
- The frozen TS-Dash artifacts retain their recorded hashes. No route, store,
  schema, cross-app access, activation, migration, or dependency changed.
