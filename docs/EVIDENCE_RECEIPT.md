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

- Mark this repo safe to publish only when the current pass proves a clean synced tree, no GitHub Releases, no protected tracked paths, no open secret/dependabot/code-scanning alerts or a documented code-scanning not-applicable/no-analysis state, passing required gates, and working live or repository-ZIP distribution surface.
- Runtime app code scanning uses `.github/workflows/codeql.yml` with CodeQL JavaScript analysis; missing or failed analysis must be reported as `PASS_WITH_LIMITATIONS`, `NOT_RUN`, or `NO_GO`.
- If any proof is missing, stale, or contradicted by GitHub/repo/app state, record the repo as `PASS_WITH_LIMITATIONS`, `NOT_RUN`, `BLOCKED`, or `NO_GO` instead of safe.
- The final status table must name remaining risks rather than implying safety from silence.

## Pages API Residue Evidence

- GitHub Pages API status is not sufficient by itself when it contradicts current-head workflow and live URL evidence.
- If `gh api repos/shfqrkhn/LocalFirstApps/pages` reports `errored` but the latest current-head `Deploy GitHub Pages` workflow succeeds, deployments list the same head SHA, and `https://shfqrkhn.github.io/LocalFirstApps/` returns HTTP 200, report the API summary as stale residue with `PASS_WITH_LIMITATIONS` instead of changing source.
- Treat it as a real blocker only when the latest current-head Pages workflow fails for a source/build reason, deployment SHA lags runtime payload changes, or the live URL fails.

## Input Accessibility Evidence

- After setup, critical suite workflows must remain fully usable with one available input mode: keyboard only, mouse/pointer only, touch only, or platform-limited input only.
- No critical workflow may require a combined keyboard-plus-pointer, keyboard-plus-touch, hover-plus-keyboard, drag-plus-keyboard, or browser-popup path.
- Accessibility claims require current evidence from static checks, visual/input-size checks, local-file checks, live checks, focus/label review, platform text-entry support, and tap-target/no-overflow checks where applicable.
- If keyboard-only, mouse-only, touch-only, or platform-limited operation is not directly covered for an app, label it `PASS_WITH_LIMITATIONS` or `NOT_RUN`; do not claim full accessibility from static presence alone.

## Design Language Evidence

- UI changes must preserve a modern minimalist, utilitarian, professional, joyful, responsive, local-first-suite-contextual design language with local CSS/tokens, semantic native controls, visible focus, reduced-motion-safe transitions, no horizontal overflow, and no component overlap.
- Signature Ecosystem Evidence: LocalFirstApps must look and feel like part of the shared `shfqrkhn` ecosystem while staying contextual to compact, privacy-first local utilities.
- MIT UI libraries/resources such as Uiverse, Open Props, Primer, Radix Colors, Pico CSS, Heroicons, Bootstrap Icons, Floating UI, or A11y Dialog are inspiration sources only unless a source-backed, license-checked, tested need justifies a dependency.
- Runtime third-party UI/chart dependencies must be vendored with license notices under `vendor/`; app shells and service workers must not reference runtime CDN, remote font, or remote icon URLs.
- Reject browser JS popups, blocking overlays, arbitrary component copy-paste, mixed visual systems, unbounded animation, external CDNs, or styling that hides file/live/privacy boundaries.

## Recovery And Data Safety Evidence

- App-specific import, export, reset, browser-storage, and recovery claims must remain user-triggered, local-first, and tied to current tests or explicit manual evidence.
- Each app README must state the app-specific data/recovery boundary, including export/import/reset behavior or an explicit limitation when no separate recovery workflow exists.
- Suite-wide recovery claims may cover local/file/live survivability only within tested paths; they must not imply shared cloud backup, accounts, OAuth, API keys, or silent upload.
- If an app lacks direct recovery-path coverage in the current pass, label it `PASS_WITH_LIMITATIONS` or `NOT_RUN` before public use.

## Mission-Critical Reliability Evidence

- Critical launcher, app shell, file/live, import/export/reset, and per-app workflows must stay self-checking, crash-recoverable, state-explicit, modular, maintainable, simple, one-input accessible, and TDD/SDD-backed.
- Runtime failures must fail closed with visible in-app status, preserved local user control, no browser popup APIs, no hidden upload, and no OAuth/API-key/provider overlay unless intake explicitly approves it.
- New complexity is acceptable only when it directly improves resilience, usability, state clarity, privacy, or maintainability and is covered by current tests or explicit evidence.
- Autonomous AI-assisted development must start from current files, add or update tests before broad suite or app changes, keep claims inside evidence boundaries, and leave a reproducible recovery path.

## Per-App Membership Evidence

- A suite app is public-ready only when the current repo contains its `apps/<slug>/` folder, README, screenshot, launcher card, shared shell wiring, return link, file-mode notice, and app-specific privacy/input/recovery evidence.
- The canonical app registry, actual `apps/` directories, launcher cards, and README app links must match in the static regression gate; unexpected app folders are repo-sprawl blockers until intake and docs are updated.
- Deleted standalone surfaces, old screenshots, old README text, or portfolio memories are not evidence that an app still exists, remains supported, or should be restored.
- Userscripts, provider overlays, OAuth/API-key flows, or high-trust apps must stay out of the suite unless `docs/future-app-intake.md` approves the fit and the evidence receipt gets a new bounded claim row.

## Claim Boundaries

| Area | Class | Evidence | Limit |
| --- | --- | --- | --- |
| Static local-first suite | `PASS` | launcher, app folders, static tests | Individual browser capabilities can vary by local file mode. |
| No backend/telemetry/accounts/OAuth/API keys | `PASS` | static scan and app-provider pattern test | Future apps must pass intake before joining the suite. |
| Per-app launcher/README/screenshot/shared shell | `PASS_WITH_LIMITATIONS` | static regression tests, per-app membership evidence | Recheck after each app migration, screenshot change, or app-membership claim. |
| File/live behavior clarity | `PASS_WITH_LIMITATIONS` | shared shell, local-file and live tests | GitHub Pages and local file behavior should both be tested after runtime changes. |
| Pages API summary | `PASS_WITH_LIMITATIONS` | latest current-head Pages workflow, deployments API, live HTTP 200 | The Pages API `.status` field can lag or contradict successful workflow deployments; report the residue separately. |
| Repository ZIP safety | `PASS_WITH_LIMITATIONS` | `.gitattributes`, `git check-attr export-ignore`, `git archive`, `docs/REPO_ZIP_POLICY.md`, static tests | Recheck no tests, packages, exports, private notes, or retired provider overlays are bundled. |
| Input accessibility | `PASS_WITH_LIMITATIONS` | visual regression target-size checks, local-file/live smoke, static shell checks | Does not certify screen-reader behavior or every app-specific workflow. |
| Single input operation | `PASS_WITH_LIMITATIONS` | input accessibility evidence, static shell checks, no browser popup policy | Does not certify every OS assistive technology or unusual HID/browser pairing. |
| Design language/UI safety | `PASS_WITH_LIMITATIONS` | handoff/evidence docs, static tests, visual/local-file/live checks where run | Does not certify every viewport or assistive technology; each app may use contextual surfaces within the shared suite shell. |
| Signature ecosystem fit | `PASS_WITH_LIMITATIONS` | shared signature design system reference, design evidence, static/visual/live tests | Does not require identical UI components; each utility may keep its own task density and control style. |
| Recovery/data safety | `PASS_WITH_LIMITATIONS` | README, local-file/live tests, per-app README/static checks | App-specific export/import/reset behavior varies and must not be generalized without tests. |
| Mission-critical reliability | `PASS_WITH_LIMITATIONS` | mission-critical reliability evidence, static/visual/file/live tests | Does not make every app equally feature-complete; app-specific recovery must be tested before public claims. |

## Required Before Public-Facing Change

- `git status --short --ignored`
- `git rev-list --left-right --count 'HEAD...@{u}'`
- `gh release list --limit 5` returns no releases
- `npm run qa`
- `git diff --check`
- protected-path scan
- live Pages check after runtime or public-surface changes
