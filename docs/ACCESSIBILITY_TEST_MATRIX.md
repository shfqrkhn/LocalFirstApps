# Accessibility test matrix

Automated checks reduce regressions; they do not certify conformance. Manual assistive-technology rows remain `NOT_RUN` until performed on the named platform and build.

| Surface | Keyboard/focus | Semantics/name | Zoom/reflow | Reduced motion | Screen reader | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Suite shell | automated | automated | automated | automated | NVDA + Firefox | NOT_RUN |
| CommonGround | automated | automated | automated | automated | NVDA + Firefox | NOT_RUN |
| HealthOS | automated | automated | automated | automated | NVDA + Firefox | NOT_RUN |
| TS-Dash legacy | automated smoke | automated smoke | automated smoke | automated smoke | NVDA + Firefox | NOT_RUN |
| PMQuiz | automated | automated | automated | automated | NVDA + Firefox | NOT_RUN |
| Noodle Nudge | automated | automated | automated | automated | NVDA + Firefox | NOT_RUN |
| Flexx Files | automated | automated | automated | automated | NVDA + Firefox | NOT_RUN |

Manual completion records tester, OS/browser/AT versions, artifact hash, date, findings, and remediation. Also test high contrast/forced colors, touch, 200% zoom, error recovery, install/update/offline messaging, data import/export, and destructive confirmations.
