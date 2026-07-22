# CommonGround design language

Status: R1 foundation; app-by-app adoption requires its own parity gate.

CommonGround is the product name and shared design language. LifeOS and WorkOS are navigational groupings, not separate runtimes. Existing apps retain their routes, storage, file formats, and identities while converging visually.

## Contract

- `shared/design-tokens.css` is the canonical vocabulary for color, type, spacing, radii, elevation, motion, focus, and touch targets.
- `shared/design-primitives.css` supplies optional low-level controls. Apps may adopt it only with visual, behavior, keyboard, local-file, and offline parity evidence.
- Use semantic HTML before ARIA. Every control needs an accessible name, visible focus, a 44px-equivalent target, keyboard operation, and errors associated with the relevant field.
- Status must use text/iconography as well as color. Destructive actions require explicit naming and confirmation. Dialogs must trap focus, close predictably, and restore focus.
- Layouts use a compact default density, responsive reflow, zoom to 200%, no horizontal loss at 320 CSS px, and reduced-motion preferences.
- Navigation keeps the user inside the selected app; cross-app movement returns through the suite shell. No hidden shared runtime state.
- Dark and light modes share semantic roles and meet WCAG-oriented contrast checks. Apps must not infer user health, ability, identity, or readiness from theme or appearance.

The tokens are deliberately unconnected in R1. A mass stylesheet switch would make regressions difficult to attribute and could break product contracts.
