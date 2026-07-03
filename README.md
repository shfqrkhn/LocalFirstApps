# LocalFirstApps

<p><a href="https://github.com/sponsors/shfqrkhn?o=esb"><strong>Sponsor this project</strong></a></p>

A focused suite of small, privacy-first browser apps that run as static local-first tools.

- **Live Demo:** [shfqrkhn.github.io/LocalFirstApps](https://shfqrkhn.github.io/LocalFirstApps/)
- **Latest Release:** [GitHub latest release](https://github.com/shfqrkhn/LocalFirstApps/releases/latest)
- **License:** MIT
- **Runtime model:** static files, browser storage, no server-side processing

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

Download the latest release zip or the repo, extract it, and open `index.html` in a browser. Individual apps live under `apps/<app>/`.

The launcher works from `file://`. Some individual apps use browser modules, workers, or local `fetch`, so full app and PWA behavior requires serving the folder over `http://localhost` or GitHub Pages because browsers restrict those APIs from `file://`.

```bash
python -m http.server 8080
```

## Development

```bash
npm run test:all
```

The tests check the suite shell, migrated app entry points, local-file launch, live Pages routes, responsive layout, stale old URLs, redirect-sensitive paths, media links, and unwanted non-product files.

## Migration

The original standalone repos are retained only as redirects/archives so old links keep working while new development moves here.
