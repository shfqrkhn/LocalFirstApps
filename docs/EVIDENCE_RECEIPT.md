# Evidence Receipt

This public-safe receipt keeps LocalFirstApps claims tied to evidence instead of chat history.

## Evidence Classes

- `PASS`: directly covered by current files, tests, or checks.
- `PASS_WITH_LIMITATIONS`: true only within the stated scope.
- `NOT_RUN`: not checked in the current pass.
- `BLOCKED`: cannot be checked until an external condition changes.
- `NO_GO`: failed or unsafe; do not publish until fixed.

## Claim Firewall Invariant

- Every public technical, security, privacy, download, app-membership, file/live, or support claim must map to a `Claim Boundaries` row or be added with evidence before publication.
- Public claims may not exceed `PASS` or `PASS_WITH_LIMITATIONS`; `NOT_RUN`, `BLOCKED`, and `NO_GO` items must stay unpublished or be labeled as unavailable.
- Volatile app membership, links, screenshots, file/live behavior, and GitHub settings must be rechecked from current repo state before reliance.

## Currentness Watchdog

- Recheck claim evidence before public-facing changes, not on a fixed calendar.
- If current evidence is stale, missing, inaccessible, or contradicted by app/repo/GitHub state, downgrade the affected claim to `NOT_RUN`, `BLOCKED`, or `NO_GO`.
- Do not preserve old status snapshots as proof after app membership, screenshots, shared shell behavior, links, workflows, or public privacy wording changes.

## Safe-To-Publish Receipt

- Mark this repo safe to publish only when the current pass proves a clean synced tree, no GitHub Releases, no protected tracked paths, no open security/dependabot alerts, passing required gates, and working live or repository-ZIP distribution surface.
- If any proof is missing, stale, or contradicted by GitHub/repo/app state, record the repo as `PASS_WITH_LIMITATIONS`, `NOT_RUN`, `BLOCKED`, or `NO_GO` instead of safe.
- The final status table must name remaining risks rather than implying safety from silence.

## Input Accessibility Evidence

- Critical suite workflows must remain usable by keyboard-only, mouse/pointer-only, and touch-only users.
- Accessibility claims require current evidence from static checks, visual/input-size checks, local-file checks, live checks, focus/label review, and tap-target/no-overflow checks where applicable.
- If an app lacks direct input-mode coverage, label it `PASS_WITH_LIMITATIONS` or `NOT_RUN`; do not claim full accessibility from static presence alone.

## Recovery And Data Safety Evidence

- App-specific import, export, reset, browser-storage, and recovery claims must remain user-triggered, local-first, and tied to current tests or explicit manual evidence.
- Suite-wide recovery claims may cover local/file/live survivability only within tested paths; they must not imply shared cloud backup, accounts, OAuth, API keys, or silent upload.
- If an app lacks direct recovery-path coverage in the current pass, label it `PASS_WITH_LIMITATIONS` or `NOT_RUN` before public use.

## Per-App Membership Evidence

- A suite app is public-ready only when the current repo contains its `apps/<slug>/` folder, README, screenshot, launcher card, shared shell wiring, return link, file-mode notice, and app-specific privacy/input/recovery evidence.
- Deleted standalone surfaces, old screenshots, old README text, or portfolio memories are not evidence that an app still exists, remains supported, or should be restored.
- Userscripts, provider overlays, OAuth/API-key flows, or high-trust apps must stay out of the suite unless `docs/future-app-intake.md` approves the fit and the evidence receipt gets a new bounded claim row.

## Claim Boundaries

| Area | Class | Evidence | Limit |
| --- | --- | --- | --- |
| Static local-first suite | `PASS` | launcher, app folders, static tests | Individual browser capabilities can vary by local file mode. |
| No backend/telemetry/accounts/OAuth/API keys | `PASS` | static scan and app-provider pattern test | Future apps must pass intake before joining the suite. |
| Per-app launcher/README/screenshot/shared shell | `PASS_WITH_LIMITATIONS` | static regression tests, per-app membership evidence | Recheck after each app migration, screenshot change, or app-membership claim. |
| File/live behavior clarity | `PASS_WITH_LIMITATIONS` | shared shell, local-file and live tests | GitHub Pages and local file behavior should both be tested after runtime changes. |
| Repository ZIP safety | `PASS_WITH_LIMITATIONS` | `.gitattributes`, `docs/REPO_ZIP_POLICY.md`, static tests | Recheck no tests, packages, exports, private notes, or retired provider overlays are bundled. |
| Input accessibility | `PASS_WITH_LIMITATIONS` | visual regression target-size checks, local-file/live smoke, static shell checks | Does not certify screen-reader behavior or every app-specific workflow. |
| Recovery/data safety | `PASS_WITH_LIMITATIONS` | README, local-file/live tests, per-app README/static checks | App-specific export/import/reset behavior varies and must not be generalized without tests. |

## Required Before Public-Facing Change

- `git status --short --ignored`
- `git rev-list --left-right --count HEAD..."@{u}"`
- `npm run qa`
- `git diff --check`
- protected-path scan
- live Pages check after runtime or public-surface changes
