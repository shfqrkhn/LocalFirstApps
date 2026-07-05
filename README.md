# LocalFirstApps

<p><a href="https://github.com/sponsors/shfqrkhn?o=esb"><strong>Sponsor this project</strong></a></p>

A focused suite of small, privacy-first browser apps that run as static local-first tools.

- **Live Demo:** [shfqrkhn.github.io/LocalFirstApps](https://shfqrkhn.github.io/LocalFirstApps/)
- **Repository ZIP:** [Download current main ZIP](https://github.com/shfqrkhn/LocalFirstApps/archive/refs/heads/main.zip)
- **License:** MIT
- **Runtime model:** static files, browser storage, no server-side processing
- **Maintainer handoff:** [`docs/AI_MAINTAINER_HANDOFF.md`](./docs/AI_MAINTAINER_HANDOFF.md)
- **Future app intake:** [`docs/future-app-intake.md`](./docs/future-app-intake.md)
- **Repository ZIP policy:** [`docs/REPO_ZIP_POLICY.md`](./docs/REPO_ZIP_POLICY.md)

## Screenshot

![LocalFirstApps suite launcher](./screenshot.png)

## Apps

| App | Purpose | Launch |
| --- | --- | --- |
| TS-Dash | CSV-based time-series analysis | [Open](https://shfqrkhn.github.io/LocalFirstApps/apps/ts-dash/) |
| PMQuiz | Project-management certification practice | [Open](https://shfqrkhn.github.io/LocalFirstApps/apps/pmquiz/) |
| Noodle Nudge | Private reflection and self-inquiry | [Open](https://shfqrkhn.github.io/LocalFirstApps/apps/noodle-nudge/) |
| LedgerSuite | Managerial judgment and decision workspace | [Open](https://shfqrkhn.github.io/LocalFirstApps/apps/ledgersuite/) |
| Flexx Files | Offline strength protocol tracker | [Open](https://shfqrkhn.github.io/LocalFirstApps/apps/flexx-files/) |
| CommonGround | Private facilitation and conflict-resolution workspace | [Open](https://shfqrkhn.github.io/LocalFirstApps/apps/commonground/) |

## Why This Exists

These apps share the same product shape: small, static, local-first utilities with narrow workflows. Keeping them together reduces repository sprawl, makes maintenance cheaper, and gives users one clear place to find related tools.

Flagship projects remain separate:

- [ModelTab](https://github.com/shfqrkhn/ModelTab) for BYOK AI chat.
- [FIFA-WC-Sim](https://github.com/shfqrkhn/FIFA-WC-Sim) for World Cup simulation.
- [nFIRE](https://github.com/shfqrkhn/nFIRE) for financial independence planning.

## Privacy

The apps are static browser apps. Data stays in the browser unless a specific app export/import workflow is used by the user. There is no shared backend in this suite.

## Local Use

Download the current main repository ZIP with **Code > Download ZIP** or the direct ZIP link above, extract it, and open `index.html` in a browser. Individual apps live under `apps/<app>/`.

The launcher works from `file://`. Some individual apps use browser modules, workers, or local `fetch`, so full app and PWA behavior requires serving the folder over `http://localhost` or GitHub Pages because browsers restrict those APIs from `file://`.

```bash
python -m http.server 8080
```

## Development

From a git checkout:

```bash
npm run qa
```

The tests check the suite shell, migrated app entry points, local-file launch, live Pages routes, responsive layout, stale old URLs, redirect-sensitive paths, media links, and unwanted non-product files.

The repository ZIP omits source-only test and package-management files where `.gitattributes` marks them `export-ignore`, so downloaded copies stay focused on running the apps.

Before adding a new module under `apps/<slug>/`, apply the intake contract in [`docs/future-app-intake.md`](./docs/future-app-intake.md).

## Migration

The original standalone repo surfaces have been retired. Canonical links, screenshots, and future development now live in this consolidated suite.
