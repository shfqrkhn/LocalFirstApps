# R3E LifeOS design convergence

Status: VERIFIED_LOCAL on 2026-07-23 at implementation commit `8e8b5a1`;
owner acceptance, manual AT, deployment, and publication remain `NOT_RUN`.

This bounded packet converges the HealthOS Focus, Noodle Nudge/Reflection, and
Flexx Files/Strength surfaces on the existing CommonGround design vocabulary.
The private MPES remains prime product authority. Workspace reference
`../docs/OmniOS_20260714.md` is private, supplementary assurance guidance under
the latest owner instruction;
it does not override accepted app, data, compatibility, or evidence boundaries.
The repository demonstrates doctrine-guided engineering, not an OmniOS runtime.

## Composition and safe-change boundary

| Surface | Preserved identity | Existing visual exception | R3E adapter boundary |
| --- | --- | --- | --- |
| Focus | HealthOS route, green focus workspace, top navigation and timer | Dark, low-pressure ambient canvas | `apps/healthos/styles.css` maps app roles to shared tokens |
| Reflection | Noodle route, Today/Assessments/Settings and Bootstrap behavior | Light blue reflective workspace | shared sheets load before Bootstrap/app overrides; app CSS maps Bootstrap roles |
| Strength | Flexx route, bottom navigation, workout phases and orange accent | Dark, dense touch-first training workspace | shared sheets load before app CSS; legacy variables map to shared roles |

The composition guarantee is visual only. Shared CSS receives no storage,
worker, event, domain, import/export, or mutation capability. Each app keeps its
own stylesheet, route, PWA manifest, cache scope, data, recovery, and rollback.
If shared CSS is unavailable, the complete-shell contract rejects the candidate
and retains the last-known-good shell. Rollback reverts code/styles only.

## Pre-change inventory

- Canonical roles: canvas, surface, raised/subtle surface, text, muted text,
  border, accent/contrast, success, warning, danger, info, focus and overlay.
- Type: one system sans family and monospace utility family; Noodle's serif
  headings are an app-local inconsistency, not a product requirement.
- Shape/elevation: 6/12/18 px families, pill, one low and one high shadow.
- Density: 4/8/12/16/24/32 px scale; 44 px minimum touch target.
- Controls/states: primary, secondary, quiet/destructive, disabled, hover,
  active, focus-visible, invalid, notice, card, modal, toast, timer and nav.
- Responsive envelopes: 320, 390, 768, 1440 and 3840 CSS px; 200% zoom;
  app-specific 374/620/768/820/1024/1440 and short-landscape breakpoints.
- Motion: shared fast/normal durations plus existing reduced-motion rules.
- Theme state: HealthOS and Flexx intentionally render dark; Noodle renders
  light. There is no accepted cross-app theme preference contract or owned
  storage key. Selectable light/dark/system persistence is therefore deferred.

## Acceptance matrix

1. All three documents load `shared/design-primitives.css`; Noodle and Flexx
   workers explicitly allow it and `shared/design-tokens.css`, and all three
   complete-shell manifests integrity-bind both files.
2. App styles consume canonical font, spacing, radius, elevation, focus, touch,
   semantic status, text, border, surface, accent, and motion roles while
   preserving recognizable app accents and workflows.
3. No route, DOM hook, compatibility name, store/key/schema/record, data format,
   domain output, content, manifest identity, worker scope, cache prefix or
   foreign storage/cache behavior changes.
4. Deterministic tests prove token/adoption/ownership/version boundaries.
   Browser tests prove semantic role resolution, contrast, focus, 44 px targets,
   reduced motion and representative light/dark surface identity.
5. Existing behavior, file, subpath, offline/update/last-known-good, visual,
   accessibility, multi-tab, import/export/backup/reset and foreign-survival
   gates remain passing.
6. Evidence is version-bound and reports manual assistive-technology, qualified
   content/domain review, real quota/eviction, owner acceptance, deployment and
   publication as `NOT_RUN`.

## Verification result

- `PASS`: shared design contract `1.1.0` is consumed through app-owned CSS by
  CommonGround, HealthOS, Noodle, and Flexx. The three LifeOS PWA manifests
  integrity-bind both shared stylesheets and use new shell versions.
- `PASS`: semantic-role contrast, accent-button contrast, visible focus,
  44 px targets, forced colors, reduced motion, light/dark identity, and
  200%-equivalent 320 px reflow pass on all three LifeOS surfaces.
- `PASS`: 35 visual envelopes span 320–3840 px; seven file routes, 39 browser
  behavior cases, seven accessibility baselines, and six R3E design cases cover
  the combined route/state, keyboard, pointer, touch/card-sort, modal/toast,
  timer/chart, multi-tab, recovery, offline, subpath, update, last-known-good,
  and foreign-scope contracts.
- `PASS`: `npm run ci:candidate` built the deterministic 160-file runtime;
  `npm audit --audit-level=moderate` found zero vulnerabilities and
  `git diff --check` passed.
- `PASS_WITH_LIMITATIONS`: manual assistive-technology testing, real
  browser-controlled quota/eviction, qualified content/domain review, owner
  acceptance, postdeploy verification, deployment, and publication are
  `NOT_RUN`.

Selectable light/dark/system persistence remains intentionally deferred. The
three apps have no accepted shared preference owner or storage contract; adding
one in a visual-only packet would violate the state and complexity boundaries.
This is explicit assurance debt, not a partial or hidden theme implementation.
