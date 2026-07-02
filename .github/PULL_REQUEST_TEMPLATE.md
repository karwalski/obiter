<!-- Thanks for contributing to Obiter. Please complete the sections below. -->

## What and why

<!-- Briefly describe the change and the problem it solves. Reference the AGLC4 rule
     number where applicable (e.g. Rule 1.4.3), or the WCAG success criterion for
     accessibility work (e.g. WCAG 2.1.1). -->

## Checks

- [ ] `npm run lint` passes (`jsx-a11y` clean)
- [ ] `npm run typecheck` introduces no new errors
- [ ] `npm test` passes (`jest-axe` clean for any UI change)

## Accessibility (Definition of Done — complete for any change touching UI or document output)

- [ ] Keyboard-operable; focus visible and not obscured
- [ ] Name, role, and value correct; checked with at least one screen reader
- [ ] Contrast ≥ AA; primary action targets ≥ 44×44 CSS px
- [ ] Reduced-motion and forced-colors respected
- [ ] Status and errors surfaced — no silent failure
- [ ] N/A — this change does not touch UI or document output
