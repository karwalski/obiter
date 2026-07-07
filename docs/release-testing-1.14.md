# v1.14 Release Test Plan

Manual verification before promoting v1.14.0 to production. Three phases:

1. **Phase 1 — Sideloaded desktop Word** (this checklist, performed by Matthew)
2. **Phase 2 — Word on the web** via headed Chrome Playwright session (M365 trial tenant); issues become stories
3. **Phase 3 — Copilot skill** (full "Obiter with Copilot" package) in the same Word-online tenant

Scope: v1.14 changed the engine heavily (PARITY-101..122), fixed field bugs BUG-001..005,
added Scan & Repair, and landed the A11Y uplift. Unit tests (72 suites, 2948 tests) cover
pure-engine output; this plan covers what Jest cannot — Office.js document mutation, XML-part
persistence, UI flows, and real rendering in footnotes.

## Setup (Phase 1)

- [ ] `npm run build:prod` && `npm run deploy:beta` → staged at `https://obiter.com.au/app/beta/`
- [ ] Version changed since last sideload, so full reset: kill Word, clean the `wef` cache, re-sideload `manifest.beta.xml` (appears as "Obiter (Beta)")
- [ ] Confirm beta coexists with the installed production Obiter (both visible, distinct names)
- [ ] Task pane loads from `/app/beta/`, no console errors, ribbon buttons and icons present

## A. Core regression smoke (unchanged features that the PARITY rewiring could have broken)

- [ ] Insert citation — one each of: reported case, medium-neutral case, legislation, journal article, book → footnote created with correct italics/formatting applied in Word (not just in the pane preview)
- [ ] Ibid: same source in consecutive footnotes → `Ibid` / `Ibid [pinpoint]`
- [ ] Subsequent reference: same source non-consecutive → short title + `(n X)`; cross-reference field renumbers after inserting a footnote earlier in the doc
- [ ] Linking phrases (quoting / cited in) between two sources in one footnote
- [ ] Bibliography generation — grouped, legislation year italic (v1.13.18 fix still holds)
- [ ] Validation panel runs clean on a well-formed doc; flags a deliberately broken one (incl. heading-order accessibility check, A11Y-028)
- [ ] Set Up Document: heading styles apply, title capitalised, author small caps with large initial, cursor advances (v1.13.15–.17 fixes still hold)
- [ ] Save → close → reopen document: library intact, citations still linked

## B. v1.14 field-bug verification (the reason this release exists)

### BUG-001 — party names with `&`/`and`
- [ ] `Smith v Land & House Property Corporation (1884) 28 Ch D 7` renders untruncated — test on both a domestic case and a UK case

### BUG-002 — edit-directly / paste parsing
- [ ] Paste a citation containing line breaks → whitespace normalised, parses
- [ ] `[Year] Court No` medium-neutral form recognised
- [ ] A citation the parser rejects still offers **Insert as manual citation** with non-blocking warnings
- [ ] Ebook source: no dead "Platform" input; renders as book + URL (DECISION-019)

### BUG-003 — library un-linking / data destruction
- [ ] Build a library of ~10 citations, save, reopen repeatedly → never silently empties
- [ ] Diagnostics banner appears when something is wrong (if simulable); debug-log part selection works
- [ ] Save As a copy of the document → both copies keep independent, working libraries

### BUG-004 — Scan & Repair
- [ ] Reachable from all three entry points: library diagnostics, import bar, command palette
- [ ] Damage a document (manually delete/edit a citation content control; or paste footnoted text into a fresh doc) → scan finds orphans
- [ ] Preview-before-apply shows what will change; nothing mutates until confirmed
- [ ] Relink restores citations to the library; plain-text adoption is deterministic; verbatim fallback preserves text it can't parse
- [ ] Run Scan & Repair on a *healthy* document → no-op, no damage

### BUG-005 — reported-case edit
- [ ] Edit the parties of an existing reported case in Edit Citation → updated citation re-renders correctly
- [ ] No `0` placeholder appears anywhere in output when optional numeric fields are empty

## C. PARITY spot checks (new/changed formatting — verify exact strings in real footnotes)

- [ ] Embedded italics (PARITY-122): a title with `*asterisk*` markup renders the marked span italic (roman-in-italic where the surrounding run is italic); an unmarked title is byte-for-byte unchanged; short-title/subsequent path honours the markup
- [ ] International subsequent references (new module): cite a treaty, a UN document, and an ICJ case twice each → correct short forms on second use
- [ ] US Constitution source type (DECISION-027): fields present, Roman-numeral guidance shown, output matches rule
- [ ] US: a CFR reference and a Federal Register reference route to correct formats; US judge title renders
- [ ] UK parliamentary paper renders
- [ ] Published translation / translated title (ch 26) — new fields wired through Insert + Edit
- [ ] Latin terms (RESEARCH-009): a provisional term renders per the updated dataset
- [ ] A document created under v1.13 opens and its medium-neutral citations migrate cleanly (resolver `medium_neutral` migration)

## D. Accessibility bar (A11Y uplift shipped in v1.14)

- [ ] Keyboard-only pass: Insert Citation → Edit Citation → Scan & Repair, no traps, visible focus ring throughout
- [ ] VoiceOver quick pass over the task pane: form labels announced, banners announced
- [ ] High-contrast / dark check of the pane against the style-guide tokens

## E. Release hygiene

- [ ] Manifest reports 1.14.0.0; `npx office-addin-manifest validate manifest.prod.xml` passes
- [ ] AppSource listing copy (docs/appstore-listing.md) matches what the build actually does — classic listing carries no Copilot claims (two-product split)
- [ ] `npm test`, `npm run typecheck`, `npm run lint` clean on the release commit

## Phase 2 — Word on the web (Playwright, M365 trial tenant)

Repeat sections A–D in Word online via sideloaded beta manifest (Add-ins → Upload My Add-in).
Watch specifically for: webview persistence quirks (Custom XML parts over the online session),
MemoryRouter navigation, focus handling in the online task pane, and content-control behaviour
differences. Every failure becomes a story before release.

## Phase 3 — Copilot skill (Obiter with Copilot package)

Build the beta Copilot package (`BETA=1 npm run package:skill` on the copilot/v* branch),
validate with the M365 Agents Toolkit, upload to the trial tenant, and exercise the skill
contract end-to-end against `/app/beta/`. Findings become stories; note the Copilot package
is versioned ahead (v1.15.0) and ships on its own track.

## Promotion

When all phases pass: `npm run build:prod && npm run deploy:app`, zip, tag `v1.14.0`, push
(per the deploy checklist), then proceed with the AppSource/Copilot submissions.
