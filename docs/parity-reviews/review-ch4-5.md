# Parity Review — AGLC4 Chapters 4 and 5 vs Obiter Engine

Reference: `/Users/matthew.watt/aglc/aglc4-rule-reference.md` (ch 4 at line 2303, PDF p.108; ch 5 at line 2488, PDF p.116).
Engine: `/Users/matthew.watt/aglc/obiter/src/engine/rules/v4/secondary/{authors,journals,general}.ts`, dispatch in `src/engine/engine.ts`, short-title composition in `src/engine/resolver.ts`.
Tests: `tests/engine/chapter4-6.test.ts`, `tests/engine/law-reform-author-fallback.test.ts`.

## Summary table

| Rule | Subject | Verdict | Severity |
|---|---|---|---|
| 4.1.1 | Author — general rule | MISMATCH | Medium |
| 4.1.2 | Multiple authors | MATCH | — |
| 4.1.3 | Editors | MATCH | — |
| 4.1.4 | Body authors | GAP | Low |
| 4.1.5 | Judicial officers | ANOMALY-RISK | Medium |
| 4.2 | Title | GAP | Medium |
| 4.3 | Short title / subsequent refs | MISMATCH | Medium |
| 4.4 | URL | MATCH | — |
| 4.5 | Archived sources | MATCH (minor note) | Low |
| 5.1 | Article author | MATCH (note: unsigned articles manual) | — |
| 5.2 | Article title | MATCH | — |
| 5.3 | Year | GAP | High |
| 5.4 | Volume and issue | MISMATCH | Medium |
| 5.5 | Journal | GAP + ANOMALY-RISK | Low |
| 5.6 | Starting page | MATCH | — |
| 5.7 | Pinpoint | MATCH | — |
| 5.8 | Articles in parts | MISMATCH + GAP (unreachable) | High |
| 5.9 | Symposia | MISMATCH (invented rule; unreachable) | High |
| 5.10 | Online journals | MISMATCH | Medium |
| 5.11 | Forthcoming / advance | MISMATCH + GAP | High |

Not independently verified: `toTitleCase` (Rule 1.7 delegation inside 4.2) and `formatPinpoint` (Rules 1.1.6–1.1.7 delegation inside 5.7) were assumed correct — they belong to chapter 1 scope. Mark those internals UNVERIFIED here.

Prior-audit spot-check: `docs/aglc4-audit.md` marks CH5-001…CH5-011 all PASS and CH4-005 PASS — contradicted below (5.3, 5.4, 5.8, 5.9, 5.10, 5.11 all have defects; 4.1.5 is risk-laden). `docs/aglc4-coverage.md` claims "5.1–5.8 Full", mislabels 5.9 as "Articles in Parts" (that is 5.8; 5.9 is Symposia), and claims 5.10 includes "URL and access date" — an access date after the URL is expressly prohibited by rule 4.4 (PDF p.115); the engine does not actually emit one (doc wrong, engine right).

---

## Detail blocks

### 5.3 Year — GAP (High)
**Status:** FIXED (src/engine/rules/v4/secondary/journals.ts — `yearOrganised` + `[Year]`/span support, derived from missing volume) · dispatch/UI passthrough HANDOFF (engine wiring — handoff/secondary.md §2)
- **Rule (PDF p.117):** Year-organised journals take the year in square brackets `[Year]`; a year-organised volume spanning years takes `[1992–93]`. A journal is year-organised exactly when it lacks a volume number.
- **Engine:** `journals.ts:95` — `runs.push({ text: ` (${data.year})` })` unconditionally round-brackets the year in every journal formatter (also `:156`, `:276`). No `yearOrganised` concept exists anywhere in the engine, dispatch (`engine.ts:465–477`), types, or UI (grep for yearOrganised/square-bracket year: no hits). The chapter-5 template's second form (`[«Year»] («Issue») …`, eg Lord Woolf, 'Droit Public: English Style' [1995] (Spring) *Public Law* 57) is unproducible.
- **Fix:** Add `yearOrganised: boolean` (derive as `volume === undefined` per the Note band) to the journal data model; emit `[Year]` and, per 5.4, ` (Issue)` with a space. Support `[Year–Year]` spans per 1.11.4.
- **Severity:** High — an entire mandated citation form for a common class of journals (CLJ, Public Law, NZLJ) cannot be produced.

### 5.4 Volume and issue — MISMATCH (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/journals.ts — space before non-numeric issues and year-organised issues; tests corrected to AGLC4 ex 6/ex 8)
- **Rule (PDF pp.117–18):** Numeric issue: `40(1)` — no space. Non-numeric issue (season/month): preceded by a space — `133 (January)`, `[1982] (Summer)`. Year-organised: `[2000] (1)` — space before parens.
- **Engine:** `journals.ts:27–39` `formatVolumeAndIssue` always emits `Volume(Issue)` with no space regardless of issue type. Test `chapter4-6.test.ts:436–452` asserts `"…(2017) 133(January) Law Quarterly Review 73"` — enshrining output that AGLC4 example 6 explicitly prints as `133 (January)`.
- **Fix:** In `formatVolumeAndIssue`, insert a space before the parenthesis when the issue is non-numeric (`!/^\d+([–-]\d+)?$/`); correct the test expectation. Combined issues `21(2–3)` already work if the user enters an en-dashed issue string (no validation of hyphen vs en-dash, minor).
- **Severity:** Medium — wrong output for month/season-issued journals; test locks in the error.

### 5.8 Articles published in parts — MISMATCH + GAP (High)
**Status:** FIXED (src/engine/rules/v4/secondary/journals.ts — `(Pt N)`, in-title part stripping; exact-match tests exx 15, 17) · dispatch routing HANDOFF (engine wiring — handoff/secondary.md §3)
- **Rule (PDF pp.119–20):** Insert `(Pt «Number»)` between title and year; strip part references from within the title.
- **Engine:** `journals.ts:153` — `runs.push({ text: ` (Part ${data.partNumber})` })` emits `(Part 1)`, not `(Pt 1)`. Test `chapter4-6.test.ts:511` is titled "should insert (Pt N)…" yet asserts `toContain("(Part 1)")` (line 525) — the test name and assertion contradict each other. No title-stripping of '— Part I' suffixes.
- **Also GAP:** `formatJournalArticlePart` is unreachable: no source type in the dispatch map (`engine.ts:1966–68` registers only `journal.article`, `journal.online`, `journal.forthcoming`) and no other src/ call site invokes it (grep confirms). Users cannot produce a parts citation at all.
- **Fix:** Change literal to `(Pt ${n})`; register a `partNumber` field on `journal.article` (rather than a separate type) and route through it; fix the test.
- **Severity:** High — wrong abbreviation and dead code; coverage doc claims 5.1–5.8 "Full".

### 5.9 Symposia — MISMATCH, invented rule (High)
**Status:** FIXED (src/engine/rules/v4/secondary/journals.ts — invented `formatSymposiumArticle` deleted; ex 20 covered end-to-end via `formatJournalArticle` with 'Symposium' author)
- **Rule (PDF p.120):** A symposium cited as a whole is cited as a journal article with 'Symposium' in the author position and the symposium title in inverted commas — `Symposium, 'Contemporary Human Rights in Australia' (2002) 26(2) Melbourne University Law Review 251`. Individual articles are cited as ordinary articles.
- **Engine:** `journals.ts:192–236` `formatSymposiumArticle` appends `' in {symposiumTitle}'` (plain, unquoted, unitalicised) after the article title (line 215). Its JSDoc asserts "the symposium title should be included after the article title, preceded by 'in'" — that rule appears nowhere in AGLC4; it is invented. Test `chapter4-6.test.ts:537–552` blesses the invented form and, to reach the AGLC output, must set `authors: [{surname: "Symposium"}]` *and* duplicate the title into `symposiumTitle`, producing a doubled title.
- **Mitigation:** the function is unreachable from the dispatch map (dead code); a user citing a symposium via `journal.article` with author surname "Symposium" gets the correct AGLC form.
- **Fix:** Delete `formatSymposiumArticle` (or rewrite as a thin wrapper that sets the author run to `Symposium`); replace the test with one that checks the AGLC example 20 output end-to-end.
- **Severity:** High as encoded behaviour (misdocumented rule + wrong test), practically mitigated by unreachability.

### 5.10 Online journal articles — MISMATCH (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/journals.ts — pinpoint + startingPage added, URL optional; exact-match tests exx 22, 24) · dispatch passthrough HANDOFF (engine wiring — handoff/secondary.md §4)
- **Rule (PDF p.121):** Cite like a printed article as far as possible; an article number/identifier replaces the starting page; pinpoints follow after a comma (`416:1–19, 8`); a URL is not an element of this rule (URLs are optional under 4.4).
- **Engine:** `journals.ts:254–294` `formatOnlineJournalArticle` (a) has **no pinpoint parameter** — pinpoints per 1.1.6–1.1.7 after the identifier are unproducible for `journal.online` (`engine.ts:912–924` passes none); (b) makes `url` a required field and always appends it — harmless when supplied but the citation cannot be produced without one; (c) the PDF-version form `Identifier:PageRange` works only if the user hand-types the whole string into `articleNumber` (test at `chapter4-6.test.ts:572–585` does exactly that).
- **Fix:** Add `pinpoint` to the data shape and emit `, «pinpoint»` after the identifier; make `url` optional.
- **Severity:** Medium — pinpointing an online article, a routine need, is impossible.

### 5.11 Forthcoming and advance articles — MISMATCH + GAP (High)
**Status:** FIXED (src/engine/rules/v4/secondary/journals.ts — year/volume/issue retained, `advance` flag; exact-match tests exx 26, 27) · dispatch passthrough HANDOFF (engine wiring — handoff/secondary.md §5)
- **Rule (PDF p.122):** `(forthcoming)` or `(advance)` replaces the starting page; include as much of the remaining citation data as is available — example 26 is `… 'European Consumer Protection …' (2017) 23 *Columbia Journal of European Law* (forthcoming)` with year and volume present.
- **Engine:** `journals.ts:310–334` `formatForthcomingArticle` accepts only `authors`, `title`, `journal` — year, volume and issue are dropped even when known (`engine.ts:930–937` passes none), so example 26's output is unproducible (engine yields `… 'Title' *Journal* (forthcoming)`). `(advance)` is entirely unsupported — no formatter, no source type. The JSDoc invents "No volume, issue, or page numbers are included", contradicting the rule's "include as much as is available" and its own cited example. Test `chapter4-6.test.ts:591–606` cites example 26 but only asserts `toContain`, never the full string, so the missing `(2017) 23` goes untested.
- **Fix:** Add optional `year`/`volume`/`issue` to the formatter, emitting them per 5.3–5.4; add an `advance` status flag (`(advance)` vs `(forthcoming)`); assert example 26 verbatim.
- **Severity:** High — both worked examples of the rule cannot be reproduced; a whole status form is missing.

### 4.1.1 Author general rule — MISMATCH (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/authors.ts — 'Associate/Assistant Professor', 'Ms/Mr/Mrs/Miss' (case-sensitive, so 'MS' initials survive), 'Reverend/Rev' added; stripping loops for stacked titles)
- **Rule (PDF pp.108–09):** Omit honorifics including 'Associate Professor', 'Professor', 'Dr', 'the Hon', and conventional titles 'Ms', 'Mr'; retain 'Sir', 'Dame' and peerage titles; strip post-nominals; run initials together.
- **Engine:** `authors.ts:80–92` `STRIPPED_TITLE_PREFIXES` lacks **'Ms', 'Mr', 'Mrs', 'Miss', 'Associate Professor'**. Because matching is start-anchored (`authors.ts:123`), 'Associate Professor Katy' matches nothing (the 'Professor' prefix is not at position 0) and survives into the citation — directly contra the rule's example table row 'Associate Professor Katy Barnett → Katy Barnett'. 'Ms Sharon Rodrick' likewise renders 'Ms Sharon Rodrick'. Additionally `stripHonorifics` `break`s after one prefix (line 127, despite the "then re-check" comment), so stacked titles ('The Hon Dr John Cockburn') strip only the first layer. Post-nominal stripping (`authors.ts:15–61`) is a fixed whitelist — reasonable, but unlisted post-nominals (eg 'FRSN', 'KStJ') pass through silently. Initial collapsing (`authors.ts:139–174`) verified correct against HLA Hart / RJ Ellicott / Ralph H Folsom tests.
- **Fix:** Add 'Associate Professor', 'Assistant Professor', 'Ms', 'Mr', 'Mrs', 'Miss', 'Reverend', 'Rev' to the prefix list; replace `break` with a loop until no prefix matches.
- **Severity:** Medium — two of the rule's own ten example rows produce wrong output.

### 4.1.4 Body authors — GAP (Low)
**Status:** FIXED (src/engine/rules/v4/secondary/authors.ts — `normaliseBodyName` strips Pty/Ltd/Co/Inc tokens and a leading 'The'; Commonwealth/no-author left to data entry as proposed)
- **Rule (PDF pp.110–11):** Beyond `Subdivision, Body (Jurisdiction)` (which `authors.ts:357–376` implements correctly, verified against example 10 in `chapter4-6.test.ts:252–262`), the rule also prescribes: render Commonwealth-authored works as 'Commonwealth'; strip 'Pty', 'Ltd', 'Co', 'Inc' and a leading 'the' from company names; use only the English title of bilingual bodies; cite with *no author* when none is prominently credited.
- **Engine:** None of these normalisations exist; the body string is passed through verbatim. All are achievable by careful data entry (MANUAL-OK in practice), but the company-designator strip is a mechanical transformation the engine could and should perform.
- **Fix:** Post-process `data.body`: strip `/\b(Pty|Ltd|Co|Inc)\b/` designators and a leading 'The '; leave Commonwealth/no-author to UI guidance.
- **Severity:** Low — input-side; no wrong output when data is entered per the rule.

### 4.1.5 Judicial officers — ANOMALY-RISK (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/authors.ts — JSDoc corrected to rule 4.1.5 (omit unless on source); omit/retain/former tests added for exx 18–20) · UI copy note HANDOFF (handoff/secondary.md §26)
- **Rule (PDF pp.111–12):** Extra-curial writing: **omit** the judicial title unless it appears on the source itself; former judicial officers: omit the former title; 'Sir'/'Dame'/peerage always retained; honorifics ('the Hon') never in citations.
- **Engine:** `authors.ts:387–407` `formatJudicialAuthor` unconditionally prepends `author.judicialTitle` whenever set, and its JSDoc states the opposite of the rule: "Where a judge is cited as the author of a secondary source, the judicial title **should be included** before the name." There is no curial/extra-curial/former distinction, and the sole test (`chapter4-6.test.ts:276–288`) only covers the include case. Correct output is achievable if the user populates `judicialTitle` only when the title is printed on the source (data-driven MANUAL-OK), but the misdocumented rule invites UI copy and future code that fills the field for every serving judge — which would wrongly title works like Edelman & Bant's *Unjust Enrichment* (AGLC's own counter-example 18).
- **Fix:** Correct the JSDoc to quote 4.1.5; rename the field or add `titleOnSource: boolean` gating the prefix; add a test asserting the omit case (Edelman/Bant, example 18) and the retain case (Justice Michael Kirby, example 19).
- **Severity:** Medium — behavioural correctness currently rests entirely on the user knowing a rule the code documents backwards.

### 4.2 Title — GAP (Medium)
**Status:** FIXED (src/engine/rules/v4/secondary/general.ts — dash→colon normalisation, first-subtitle truncation with date-span exception, rule-1.7 casing via the repaired toTitleCase) · embedded italics DEFERRED (titles are plain strings with no markup; needs data-model + UI change — handoff/secondary.md, cross-cutting notes)
- **Rule (PDF p.113):** Standardise a colon between title and subtitle whatever the source uses (example 25: em-dash → colon); keep only the first subtitle (except date-span second subtitles); for old comma-separated short/long titles keep only the short title; italicise words within a title only if italic in the original.
- **Engine:** `general.ts:26–43` `formatSecondaryTitle` only (a) deletes all full stops and (b) title-cases via `toTitleCase` (Rule 1.7, unverified here). No dash→colon conversion, no subtitle truncation, and `FormattedRun` output is a single run so mixed italics inside an article title (eg '*IceTV*' in example 2 under 5.2) are unrepresentable through this path. Blanket full-stop deletion also mangles legitimate non-abbreviation stops (rule 1.6 governs abbreviation stops, not every '.').
- **Fix:** Normalise ' — '/' – ' between title and subtitle to ': '; truncate after the second ': ' unless the tail is a date span; accept `FormattedRun[]` (or markup) for titles to allow embedded italics.
- **Severity:** Medium — mostly input-side today, but the single-run title model makes some correct citations (example 2, ch 5) impossible to render.

### 4.3 Short titles — MISMATCH (Medium)
**Status:** HANDOFF (engine wiring — resolver.ts `formatShortTitleIntroduction` must delegate to the already-correct `formatSecondaryShortTitle`; handoff/secondary.md §1)
- **Rule (PDF p.114, via 1.4.4):** The short title is "italicised according to this Guide's rules" — so a report/book short title is italic (example 27: `('*ISDS 2016 Review*')`); an article short title is roman in quotes.
- **Engine:** Two implementations exist. `general.ts:61–76` `formatSecondaryShortTitle` gets it right (italic iff `shouldItaliciseTitle(sourceType)`), but it has **no call site in composition**; the engine actually uses `resolver.ts:402–418` `formatShortTitleIntroduction` (`engine.ts:3270`), which italicises cases and legislation but renders **all secondary sources non-italic** (line 417). Book/report short-title introductions therefore lose their mandated italics; journal articles happen to be correct.
- **Fix:** In `formatShortTitleIntroduction`, delegate the secondary-source branch to `shouldItaliciseTitle` (as `formatSecondaryShortTitle` already does), or call the latter from `engine.ts:3270`.
- **Severity:** Medium — wrong formatting on first citation for every italic-titled secondary source; within ch-5 scope alone the effect is nil.

### 5.5 Journal — GAP + ANOMALY-RISK (Low)
**Status:** FIXED (src/engine/rules/v4/secondary/journals.ts — leading 'The' stripped from journal titles; '&' preserved as-is per DECISION-014 with regression test; subtitle omission stays manual/MANUAL-OK)
- **Rule (PDF p.118):** Full journal title italicised, as on the journal's title page, with exactly two stated exceptions: drop a leading 'The'; omit subtitles where unambiguous.
- **Engine:** `journals.ts:101` emits `data.journal` verbatim in italics. No leading-'The' strip, no subtitle omission — GAP, input-side (Low). Note the engine's own 5.10 test (`chapter4-6.test.ts:565`) passes `"eLaw Journal: Murdoch University Electronic Journal of Law"` with its subtitle intact — which is actually correct per AGLC example 24, so no error there.
- **Anomaly (catalogue, reference lines 2584–86):** Example 10 converts '*Yale Journal of Law & the Humanities*' → 'and' with no basis in the rule band. **The engine encodes neither behaviour explicitly: it preserves '&' exactly as the user typed it**, ie it follows the rule band ('as it appears on the title page') rather than example 10. There is no '&'-handling code and no test on either side. Per project policy this ambiguity should be logged in `docs/decisions.md` for researcher review; if the example is later ruled authoritative, a `&→and` normalisation (journal titles only) is a one-line fix.
- **Severity:** Low — no wrong output for correctly entered data; unresolved anomaly documented.

### 4.5 Archived sources — minor note (Low)
**Status:** WONTFIX (noting only — the fixed comma matches ex 34 and no current composition path misfires)
- `general.ts:119–121` hard-codes the leading `", "` before 'archived at', matching the both-URL-and-permalink form (example 34). When a permalink is used *instead of* a URL the rule states no comma treatment; the engine's fixed comma would follow a pinpoint acceptably, but if composed directly after a title element the comma may be unwanted. Not observed to misfire in any current path — noting only.

## Wave-1 fix addendum (secondary-sources agent)

- The rule 1.7 title-casing defects this review deferred as "chapter 1 scope" (all-preposition lowercasing, hyphen capitalisation, subtitle first words) were fixed concurrently by the chapter-1 agent in `src/engine/rules/v4/general/capitalisation.ts`; `formatSecondaryTitleText` (rule 4.2) delegates to it, so the chapters 4–7 exact-match tests depend on that change landing in the same wave.
- All dispatch/UI wiring items are specified in the wave-1 handoff file (`handoff/secondary.md`).
