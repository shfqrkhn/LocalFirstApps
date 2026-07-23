# CommonGround design language

Status: R3E LifeOS convergence verified locally; WorkOS-wide adoption remains future parity-gated work.

CommonGround is the product name and shared design language. LifeOS and WorkOS are navigational groupings, not separate runtimes. Existing apps retain their routes, storage, file formats, and identities while converging visually.

## Contract

- `shared/design-tokens.css` is the canonical vocabulary for color, type, spacing, radii, elevation, motion, focus, and touch targets.
- `shared/design-primitives.css` supplies optional low-level controls. Apps may adopt it only with visual, behavior, keyboard, local-file, and offline parity evidence.
- Use semantic HTML before ARIA. Every control needs an accessible name, visible focus, a 44px-equivalent target, keyboard operation, and errors associated with the relevant field.
- Status must use text/iconography as well as color. Destructive actions require explicit naming and confirmation. Dialogs must trap focus, close predictably, and restore focus.
- Layouts use a compact default density, responsive reflow, zoom to 200%, no horizontal loss at 320 CSS px, and reduced-motion preferences.
- Navigation keeps the user inside the selected app; cross-app movement returns through the suite shell. No hidden shared runtime state.
- Dark and light modes share semantic roles and meet WCAG-oriented contrast checks. Apps must not infer user health, ability, identity, or readiness from theme or appearance.

CommonGround, HealthOS, Noodle, and Flexx are bounded consumers of design
contract `1.1.0`. Each loads the shared primitives and maps canonical type,
spacing, shape, surface, text, border, accent, semantic status, focus, touch,
elevation, overlay, and motion roles through its own stylesheet. Reflection
retains its calm light/blue identity, Focus its ambient dark/green identity, and
Strength its dense touch-first dark/orange identity. Membership grants no
runtime or data ownership.

R3E regenerated the three LifeOS screenshots and passes deterministic
adoption/PWA-integrity tests plus contrast, 44 px target, focus, forced-colors,
reduced-motion, 200%-equivalent reflow, 320–3840 px visual, keyboard, pointer,
touch/card-sort, file, subpath, offline, update/recovery, and existing behavior
gates. Selectable light/dark/system persistence is deferred because no accepted
cross-app preference store or owner exists; R3E does not invent one.
