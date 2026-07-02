# Accessibility

Obiter treats **WCAG 2.2** and **ATAG 2.0** as the authority for accessibility, in the
same way the Australian Guide to Legal Citation is the authority for citation. The AGLC4
working-memory and fine-motor load Obiter removes is itself a barrier under tremor,
fatigue, low vision, or cognitive strain — so accessibility is central to what the tool is
for, not an afterthought.

The public-facing statement lives at
[obiter.com.au/accessibility](https://obiter.com.au/accessibility.html); this file is the
contributor-facing companion.

## Conformance target

- **WCAG 2.2 Level AA** across all four surfaces: the task-pane add-in UI, the documents
  Obiter writes, the website, and the documentation.
- Selected **Level AAA** criteria adopted deliberately for our audience: 2.5.5 Target Size
  (Enhanced) on primary actions, 2.3.3 Animation from Interactions (reduced motion), and
  2.4.13 Focus Appearance.
- **ATAG 2.0** Part A (the tool is operable by authors with disabilities) **and** Part B
  (the footnotes, bibliography, and styles Obiter writes are themselves accessible).

## How accessibility is enforced

- **`eslint-plugin-jsx-a11y`** runs over `src/ui/**/*.tsx` via `npm run lint`.
- **`jest-axe`** gives every interactive component an axe assertion (`npm test`). Budget:
  **zero critical/serious violations.**
- Accessibility regressions block merge in CI (`.github/workflows/ci.yml`).

## Definition of Done (any change touching UI or document output)

- Keyboard-operable; focus visible and not obscured.
- Name, role, and value correct; verified with at least one screen reader.
- Contrast ≥ AA; primary action targets ≥ 44×44 CSS px.
- Reduced-motion and forced-colors respected.
- Status and errors surfaced — no silent failure.
- `jsx-a11y` clean; `jest-axe` passes.

## Key building blocks

| Concern | Where |
|---|---|
| Accessibility design tokens (focus ring, target/type floors, motion) | `src/ui/styles/global.css`, governed by `../obiter-style-guide.md` |
| Keyboard combobox (ARIA APG) | `src/ui/components/TypeaheadInput.tsx` |
| Persistent status log (no silent failures) | `src/ui/context/StatusContext.tsx`, `src/ui/components/StatusLog.tsx` |
| Comfort mode | `src/ui/hooks/useComfortMode.ts` |
| Reduced-motion / forced-colors / focus | `src/ui/styles/global.css` |
| Document accessibility check (ATAG B.3) | `src/engine/documentAccessibility.ts` |
| Accessible help affordance | `src/ui/components/FieldHelp.tsx` |

## Standards decisions

Where an accessibility need and an AGLC4 rule appear to tension, or a brand token must
change to meet contrast, the call is logged in `docs/decisions.md` (see DECISION-009 for
the focus-ring/type tokens and DECISION-010 for named-style document output).

## Commit convention

Accessibility work uses `feat(a11y):` / `fix(a11y):`, referencing the WCAG success
criterion where applicable, e.g. `fix(a11y): keyboard-operable typeahead combobox (WCAG 2.1.1)`.

## Reporting an accessibility issue

Open an issue using the **Accessibility** template, or email
`accessibility@obiter.com.au`. All support is text-based and asynchronous — no phone call
or voice is ever required.
