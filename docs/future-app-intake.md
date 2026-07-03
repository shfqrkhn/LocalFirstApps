# Future App Intake

This is the public-safe LocalFirstApps intake contract. Use it before adding any new app under `apps/<slug>/`.

## Fit

Add an app to LocalFirstApps only when it is:

- static and browser-only;
- local-first and privacy-first;
- narrow enough to be one launcher tile;
- useful without a backend, account, telemetry, OAuth, or API key;
- maintainable inside the shared suite shell.

Keep a separate repo when the app needs its own trust surface, release process, domain-specific evidence, regulated/high-stakes disclaimers, server-side processing, platform script metadata, or flagship positioning.

## Required App Shape

```text
apps/<slug>/
  index.html
  README.md
  screenshot.png
  manifest.webmanifest        # optional
  service-worker.js or sw.js   # optional
  app.js                      # optional
  styles.css                  # optional
  assets/                     # optional, product assets only
  data/                       # optional, public non-sensitive seed data only
```

Do not commit API keys, sample personal data, user exports, local scratch files, logs, private drafts, `node_modules`, `test-results`, or `playwright-report`.

## Required Integration

Every new module must:

- link `../../suite-shell.css`;
- load `../../suite-shell.js`;
- expose a `.lfa-suite-home` return link to the suite launcher;
- include a `.lfa-file-notice` or equivalent visible local-file limitation notice when needed;
- have a README with the Sponsor link and canonical Pages URL;
- have a screenshot referenced by the README and launcher;
- be listed in the root `README.md`;
- be listed in the root `index.html`;
- be added to `tests/static-regression.mjs`;
- avoid stale standalone Pages URLs and absolute old app paths;
- avoid `alert`, `confirm`, and `prompt`;
- avoid horizontal scrolling on supported viewports;
- support keyboard-only, mouse-only, and touch-only critical workflows.

## Required Checks

Run:

```bash
npm test
npm run test:visual
npm run test:file
npm run test:live
```

Also check:

- secret-like token patterns;
- broken README, manifest, icon, screenshot, and local HTML references;
- `file://` launcher behavior;
- mobile and desktop layout;
- storage corruption/import failure if the app stores user data;
- clean git status before commit.

## Promotion Rule

Start inside LocalFirstApps only for small low-risk utilities. Promote to a standalone repo only when the app becomes a flagship with its own audience, release cycle, trust surface, or domain evidence.

