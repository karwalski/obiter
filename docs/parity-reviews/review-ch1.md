# Parity Review — Obiter engine vs AGLC4 Chapter 1 (General Rules)

Reference: `/Users/matthew.watt/aglc/aglc4-rule-reference.md` (`## 1 General Rules`, lines 467–1208, plus the ch-1 rows of the Consolidated anomalies catalogue).
Engine reviewed: `src/engine/rules/v4/general/*`, `src/engine/resolver.ts`, `src/engine/validator.ts`, `src/engine/engine.ts`, `src/word/citationRefresher.ts`, `src/word/styles.ts`, `src/ui/views/Styling.tsx` (ch-1 quote tooling), `src/engine/data/latin-terms.ts`.
Tests: `tests/engine/chapter1.test.ts`, `tests/engine/signals.test.ts`.
Prior audit docs (`docs/aglc4-audit.md` CH1, `docs/aglc4-coverage.md` Ch 1) were spot-checked, not trusted — several PASS/Full claims are wrong (see notes at end).

## Summary table

| Rule | Verdict | Severity |
|---|---|---|
| 1.1.1 When to footnote | MANUAL-OK | — |
| 1.1.2 Position of footnote numbers | MATCH (heuristic validator; em-dash exception not modelled) | — |
| 1.1.3 Multiple sources in footnotes | MATCH | — |
| 1.1.4 Closing punctuation | MISMATCH (validator rejects legitimate `?`/`!` endings) | low |
| 1.1.5 Discursive text | MANUAL-OK (commentary fields; colon placement editorial) | — |
| 1.1.6 Pinpoint references | MATCH | — |
| 1.1.7 Spans of pinpoints | GAP (`nn` plural not modelled; span shortening is user-supplied → manual) | low |
| 1.2 Introductory signals | MATCH (table complete; but see 1.4.3 signal-drop finding) | — |
| 1.3 Sources referring to other sources | MATCH (extra phrases permitted by rule) | — |
| 1.4.1 Subsequent references — general | MISMATCH (disambiguation title always quoted, never italic) | med |
| 1.4.2 References within a text | MATCH | — |
| 1.4.3 Ibid | MISMATCH (signals silently dropped on ibid/short refs; "See ibid" impossible) | med |
| 1.4.4 Short titles | MISMATCH (introduction skipped when short title is substring of full cite — contradicts guide ex 81 'Pape') | med |
| 1.4.5 Abbreviations/defined terms | MATCH | — |
| 1.4.6 'at' within same footnote | MISMATCH (used even when source is not the immediately preceding one) | med |
| 1.5.1 Short/long quotations | MATCH (heuristic; JSDoc threshold off-by-one: says 3+ lines, rule says 4+) | low |
| 1.5.2 Introducing quotations | MANUAL-OK | — |
| 1.5.3 Ellipses | MISMATCH (engine mandates `. . .` and flags the correct `…`) | high |
| 1.5.4 Editing quotations | MANUAL-OK (bracket button) | — |
| 1.5.5 [sic] | MANUAL-OK / UNVERIFIED (UI italicises 'sic'; reference silent on italics) | — |
| 1.5.6 Closing punctuation of quotes | MANUAL-OK | — |
| 1.5.7 Omitting citations / adding emphasis | MISMATCH (two non-AGLC clauses offered; two of the five required clauses missing; ordering not enforced) | med |
| 1.6.1 Full stops | MATCH | — |
| 1.6.2 Commas | MANUAL-OK | — |
| 1.6.3 Dashes/hyphens/slashes | ANOMALY-RISK (blanket digit-hyphen-digit auto-fix corrupts CCH `¶82-091`-style pinpoints, US `Pub L No 108-201`, docket numbers) | med |
| 1.6.4 Parentheses | MANUAL-OK | — |
| 1.6.5 Square brackets | MANUAL-OK | — |
| 1.7 Capitalisation | MISMATCH (preposition list too narrow; invents last-word capitalisation; no hyphen/subtitle handling; fixed vocab lists unimplemented) | med |
| 1.8.1 Italics for emphasis | MANUAL-OK | — |
| 1.8.2 Italicisation of source titles | MATCH | — |
| 1.8.3 Italicisation of foreign words | MISMATCH (italicise-list directly contradicts the guide's own do-NOT-italicise list for ~15 terms; 4 of guide's 7 italicised terms missing) | high |
| 1.9.1–1.9.3 Spelling/grammar/inclusive language | MANUAL-OK | — |
| 1.10.1 Numbers | MISMATCH (comma rule inverted: engine strips/flags commas the rule requires; standalone-digit check false-positives on `5%`, series, citation elements) | high |
| 1.10.2 Currency | MANUAL-OK (not implemented) | — |
| 1.10.3 Units | MANUAL-OK (not implemented) | — |
| 1.11.1 Full date | MATCH | — |
| 1.11.2 Time | MANUAL-OK (not implemented) | — |
| 1.11.3 Point in time (h:mm:ss) | GAP (no formatter; validator mislabels 1.11.4 spans as "1.11.3") | low |
| 1.11.4 Spans of dates and times | MATCH (year/day/month spans correct; time spans unimplemented → manual) | — |
| 1.11.5 Decades and centuries | MANUAL-OK (no `1970's` check) | — |
| 1.12.1 Title and author | MATCH (bold centred title; small-caps centred author) | — |
| 1.12.2 Heading levels | MATCH (prefixes and typography per level; level V not validated) | — |
| 1.13 Bibliographies | MISMATCH/GAP (ordering cascade incomplete; leading 'The' not excluded from title sort) | med |

Verdict counts: MATCH 13 · MISMATCH 10 · GAP 2 · ANOMALY-RISK 1 · MANUAL-OK 16 (several rules carry a secondary low-severity note).

## Detail blocks

### HIGH-1 — Rule 1.8.3 (PDF p.52): Latin/foreign-word lists inverted
**Status:** FIXED (src/engine/data/latin-terms.ts — both rule lists encoded verbatim; 4 missing italicised terms added; 15 inverted terms + variants moved to exceptions; Macquarie-dependent extras kept provisional pending decisions.md entry, see wave-1 ch1 handoff)
**Rule requires:** italicise foreign words UNLESS they are in the Macquarie Dictionary. The guide's own "generally NOT italicised" list includes: ab initio, ad hoc, ad idem, amicus curiae, bona fide, caveat emptor, de facto, de jure, et al, ex gratia, ex parte, ex post facto, habeas corpus, inter alia, laissez-faire, non-refoulement, non est factum, obiter dictum, per se, prima facie, quid pro quo, raison d'être, ratio decidendi, res ipsa loquitur, sui generis, terra nullius, ultra vires, vice versa, vis-a-vis. Its "generally italicised" list is: contra proferentem, ex ante, jus ad bellum, lex fori, ne bis in idem, quantum meruit, stare decisis.
**Engine does:** `src/engine/data/latin-terms.ts:27-105` — `LATIN_TERMS_ITALICISED` includes at least 15 terms from the guide's NOT-italicise list (ab initio :28, amicus curiae :30, bona fide :32, de facto :38, de jure :39, ex parte :46, habeas corpus :48, inter alia :57, obiter dicta/dictum :75-76, per se :80, prima facie :81, ratio decidendi :91, res ipsa loquitur :92, sui generis :97, ultra vires :100). `checkLatinTermsItalicised` (`src/engine/validator.ts:642-701`) then tells users these "should be italicised per Rule 1.8.3". Of the guide's seven italicised examples, only lex fori (:62), quantum meruit (:88), stare decisis (:94) are present — contra proferentem, ex ante, jus ad bellum, ne bis in idem are missing. `LATIN_TERMS_EXCEPTIONS` (:117-133) contains only 15 entries, omitting most of the guide's list.
**Proposed fix:** rebuild both sets from the rule 1.8.3 tables: move the ~15 listed terms into `LATIN_TERMS_EXCEPTIONS`; add the four missing italicised terms. Terms not on either guide list (certiorari, mens rea, mandamus, etc.) need a Macquarie check — log to `decisions.md` per project policy rather than guessing.
**Severity:** high — the validator actively instructs users to violate the rule.
(Audit doc `docs/aglc4-audit.md:44` marks 1.8.3 "PASS — Advisory/editorial rule", missing this entirely.)

### HIGH-2 — Rule 1.10.1 (PDF pp.54-55): comma-grouping rule inverted
**Status:** FIXED (src/engine/rules/v4/general/numbers.ts — comma logic inverted per rule: 4+-digit numbers flagged when missing commas, with year/page/para/ID exceptions; words-for-1–9 check now skips %, ratios, decimals, series, citation elements; formatNumberSpan added for the span-shortening convention. Note: src/debug/testRunner.ts still asserts the old no-comma behaviour — see handoff)
**Rule requires:** numbers of four or more digits TAKE a comma per three-digit group (guide's own illustration: `4,150`); the no-comma exception applies only to years, page numbers, paragraph numbers, and identification numbers.
**Engine does:** `src/engine/rules/v4/general/numbers.ts:24-32` — `formatNumber` JSDoc claims "AGLC4 Rule 1.10.1: Numbers should not use comma separators (e.g. 10000 not 10,000)" and strips commas universally. `checkNumberFormatting` (:44-62) flags EVERY comma-grouped number in text (`10,000` → suggest `10000`), i.e. it flags the rule-compliant form and suggests the non-compliant one. Tests lock this in (`tests/engine/chapter1.test.ts` "no comma separators in numbers", "detects comma-separated numbers"). Secondary issue: the standalone 1-9 digit check (:66-80) does not exempt percentages (`5%`), ratios, series, or citation elements, all of which the rule requires as numerals.
**Proposed fix:** invert the comma logic — flag 4+-digit numbers WITHOUT commas in body text, and suppress the check for year/page/paragraph/ID contexts; add `%`, units, and adjacent-numeral exclusions to the words-for-1-9 check.
**Severity:** high — auto-suggestions systematically un-fix correct text.
(Audit doc `docs/aglc4-audit.md:48` marks 1.10.1 "PASS — no commas" — wrong.)

### HIGH-3 — Rule 1.5.3 (PDF p.43): ellipsis form inverted
**Status:** FIXED (src/engine/validator.ts checkEllipsisFormat now treats spaced '…' as canonical and flags '...'/'. . .'; src/ui/views/Styling.tsx inserts ' … '; src/ui/data/referenceGuide.ts GEN-015 rewritten to the rule)
**Rule requires:** omissions shown with an ellipsis `…`, preceded and followed by a space (no space before a footnote number; no full stop after an ellipsis; no leaders).
**Engine does:** `src/engine/validator.ts:513-554` — `checkEllipsisFormat` demands `. . .` (three spaced dots), flags `...` AND the correct `…` character as errors with suggestion `. . .`. `src/ui/views/Styling.tsx:346,355` inserts `" . . . "`; `src/ui/data/referenceGuide.ts:72` tells users NOT to use `…`. This is the reverse of the reference's prescription.
**Proposed fix:** treat ` … ` (spaced U+2026) as canonical: insert that from QUOTE-002, flag `...` and `. . .` with suggestion `…`, and keep the surrounding-space requirement. Also unimplemented (acceptable as manual): full-stop-before-ellipsis retention, no-stop-after-ellipsis, leader prohibition, no space before footnote marker.
**Severity:** high — validator and UI both enforce a non-AGLC form and flag the correct one.
(Coverage doc `docs/aglc4-coverage.md` line "1.5.3 … `. . .` with correct AGLC4 spacing" is wrong.)

### MED-1 — Rule 1.4.1 (PDF pp.34-35): disambiguation/short-title styling
**Status:** FIXED (src/engine/resolver.ts — disambiguation titles and the authorless short-title fallback styled per the source via shouldItaliciseTitle: italic for books/reports/Acts, inverted commas for articles; Bills roman. Exact-string tests for AGLC4 exs 55/61/62 in tests/engine/chapter1.test.ts. Full-name disambiguation for different authors sharing a surname remains unimplemented — low)
**Rule requires:** when several works by the same author are cited, surname + title/short title, "styled the same way the title appeared in the first citation (eg italics for a book title; inverted commas for a journal article)". Guide ex 61: `Rubenstein, *Australian Citizenship Law in Context* (n 59)`. Ex 55: `*Traditional Rights and Freedoms* (n 52)` (italic report short title standing in for a body author).
**Engine does:** `src/engine/resolver.ts:210-217` (and :275-281, :329-335) always renders the disambiguation title as plain text in straight single quotes (`'${title}'`), never italic — wrong for books/reports. The `getAuthorSurname` fallback to `citation.shortTitle` (:131-133) likewise renders report short titles non-italic. Test at `tests/engine/chapter1.test.ts:351-362` only asserts substrings, so the styling deviation is untested.
**Proposed fix:** route the disambiguation title through `wrapTitle(title, sourceType)` (italicisation.ts) so books/reports come out italic and articles/chapters in quotes; italicise the short-title fallback for title-italicised source types.
**Severity:** med.
Also unimplemented (low): full-name disambiguation for different authors sharing a surname.

### MED-2 — Rules 1.4.3/1.2: signals dropped on subsequent references
**Status:** FIXED (wave 2 — src/engine/engine.ts formatCitation applies applySignalAndCommentary to subsequent-reference runs and lowercases a leading 'Ibid' when a signal/commentary precedes it ('See ibid', guide ex 69); exact tests in tests/engine/parity-dispatch.test.ts)
**Rule requires:** "Introductory signals may accompany 'ibid'" (guide ex 69: `See ibid.`), and 'ibid' is capitalised only when it opens the footnote.
**Engine does:** `src/engine/engine.ts:3228-3247` — for subsequent references `formatCitation` returns the resolver's runs directly, never calling `applySignalAndCommentary` (:3138), so any signal on an ibid/short reference is silently discarded. The comment at `src/word/citationRefresher.ts:543` ("Signal and commentary are already applied by formatCitation") is false for this path. Additionally `resolveIbid` (`src/engine/resolver.ts:369-384`) always emits capital "Ibid", so even if the signal were applied the output would be "See Ibid", not "See ibid".
**Proposed fix:** apply signal/commentary to subsequent-reference runs in `formatCitation`, and lowercase "ibid" when a signal (or discursive text) precedes it.
**Severity:** med.

### MED-3 — Rule 1.4.4 (PDF pp.37-38): short-title introduction skipped when "redundant"
**Status:** FIXED (wave 2 — src/engine/engine.ts appendFirstCitationSuffixes: containment no longer suppresses the introduction; only strict equality of short title and full rendered citation does. Exact ch 3 ex 29 and ex 40 tests in tests/engine/parity-dispatch.test.ts)
**Rule requires:** the first citation introduces the short title in `('…')` before it may be used in subsequent references. The guide's own example 81 introduces `('*Pape*')` even though 'Pape' is contained in the full case name — containment does not excuse the introduction.
**Engine does:** `src/engine/engine.ts:3261-3273` (AUDIT2-015) — skips appending the introduction whenever `fullText.includes(shortLower)`. For virtually every case short title formed from the first-named party (the rule 2.1.14 default), the introduction is suppressed, yet `formatShortReference` still emits `Pape (n X)` later — an unintroduced short form.
**Proposed fix:** only skip when the short title is exactly the full rendered name (true redundancy), or drop the containment branch and keep `startsWith` equality; guide ex 81 shows containment alone is not redundancy.
**Severity:** med.

### MED-4 — Rule 1.4.6 (PDF p.39): 'at' beyond the immediately preceding source
**Status:** FIXED (src/word/citationRefresher.ts — isWithinSameFootnote now computed by isImmediatelyPrecedingInFootnote: 'at' only when the immediately preceding citation in the footnote is the same source; non-adjacent re-cites fall through to the rule 1.4.1 (n X) form. Identical-pinpoint repetition of 'at' retained deliberately: the rule's wording (PDF p 39, verified) is "it is not necessary to repeat", ie permissive, and auto-suppression would render an empty citation occurrence. Tests in tests/word/citationRefresher.test.ts)
**Rule requires:** with multiple sources in the footnote, 'at' may only refer to the immediately preceding source; a later pinpoint to an earlier source must use the rule 1.4.1 `(n …)` form. 'At' is also unnecessary when the pinpoint is identical to the one immediately beforehand.
**Engine does:** `src/word/citationRefresher.ts:486` sets `isWithinSameFootnote = currentFootnoteCitationIds.includes(child.citationId)` — true whenever the source appeared ANYWHERE earlier in the footnote; `src/engine/resolver.ts:601-604` then formats `at «pinpoint»` regardless of whether another source intervened. No suppression of `at` for identical consecutive pinpoints.
**Proposed fix:** track the immediately preceding source within the footnote; use `at` only when it matches, otherwise fall through to `formatShortReference` (self-referencing footnote number, per the guide's 'Brennan Jr (n 94) 430' example); skip `at` when pinpoints are identical.
**Severity:** med.

### MED-5 — Rule 1.5.7 (PDF p.46): parenthetical clause list wrong
**Status:** FIXED (src/ui/views/Styling.tsx ANNOTATIONS replaced with the rule's five clauses in table order; src/engine/validator.ts checkQuotationClauses lints non-AGLC variants and out-of-order adjacent clauses; referenceGuide.ts GEN-018 corrected)
**Rule requires:** a closed table of exactly five clauses — (emphasis in original), (emphasis added), (emphasis altered), (emphasis omitted), (citations omitted) — used in table order, each in its own parentheses, placed immediately after the relevant pinpoint.
**Engine/UI does:** no engine module exists for 1.5.7; the QUOTE-005 dropdown (`src/ui/views/Styling.tsx:96-100`) offers "(emphasis added)", "(emphasis in original)", "(citations omitted)", "(footnotes omitted)", "(translation modified)". The last two are not AGLC4 clauses; "(emphasis altered)" and "(emphasis omitted)" are missing; table ordering of multiple clauses is not enforced.
**Proposed fix:** replace the dropdown list with the five clauses in table order; if multiple are applied, insert in that order.
**Severity:** med.
(Coverage doc lists the wrong five clauses as "Full" coverage.)

### MED-6 / ANOMALY-RISK — Rule 1.6.3 (PDF p.48): blanket hyphen→en-dash conversion
**Status:** FIXED (src/engine/rules/v4/general/punctuation.ts — hyphen→en-dash check/fix scoped by isPlausibleNumberSpan: leading-zero seconds, ¶/§/No-prefixed identifiers, hyphen chains and descending pairs are skipped; em-dash spacing ban removed per DECISION-013; digit--digit now fixes to en-dash)
**Rule requires:** en-dash for spans between two numbers; hyphens join compound words; document identifiers keep their printed form (cf rule 1.6.1's document-number exception).
**Engine does:** `src/engine/rules/v4/general/punctuation.ts:135-146,166-170` — `checkDashes`/`fixDashes` flag and auto-replace EVERY digit-hyphen-digit sequence with an en-dash. This corrupts non-span identifiers: CCH looseleaf pinpoints (`¶82-091` — the guide's own illustration fn 151 under rule 1.10.1, also the rule 7.7 encyclopedia anomaly `[235-270]`), US session laws (`Pub L No 108-201`), docket/proceeding numbers, ISBNs, phone numbers. This is where the catalogued 1.10.1/7.7 anomalies interact with the engine: the guide's own example citations would be "fixed" into invalid forms.
**Proposed fix:** restrict the auto-fix to plausible span contexts (second number ≥ first, or preceded by page/pinpoint markers); never auto-fix inside `¶…`, `No …`, or bracketed identifier patterns; keep the check as a warning elsewhere.
**Severity:** med (auto-fix path); the check-only path is a noisy warning.
Related low: `checkNumberFormatting` would also flag the comma in CCH page `65,131` — that one the rule band supports (no exception stated), so acceptable; note it in decisions.md.

### MED-7 — Rule 1.7 (PDF pp.49-51): title-case algorithm deviates
**Status:** FIXED (src/engine/rules/v4/general/capitalisation.ts — full preposition list (no length limit), last-word rule removed, post-hyphen and post-colon/subtitle capitalisation added, internal capitals preserved. Fixed capitalise/lowercase vocabulary lists remain unimplemented — body-text concern, manual)
**Rule requires:** in titles/headings capitalise the first word (and first word of any subtitle), the word after a hyphen in a hyphenated word, and every other word EXCEPT articles, conjunctions, and prepositions (examples include 'before', 'within' — no length limit). There is no rule that the last word is always capitalised.
**Engine does:** `src/engine/rules/v4/general/capitalisation.ts` — (a) `SHORT_PREPOSITIONS` (:20-33) covers only ten ≤4-letter prepositions, so 'before', 'within', 'between', 'under', 'over', 'about', etc. get capitalised contrary to the rule; (b) `toTitleCase` (:88-98) force-capitalises the LAST word (test asserts `"the law of the"` → `"The Law of The"` — the guide would give `…of the`); (c) hyphenated words are not split, so the post-hyphen letter is never capitalised (`Twenty-first` should be `Twenty-First`); (d) no subtitle handling — the first word after a colon (eg `…Solution': The Australian…`) would be lowercased if minor; (e) the rule's fixed capitalise/lowercase vocabulary (Commonwealth, Attorney-General… / common law, government…) is not implemented anywhere (body-text concern — acceptable as manual, but the audit doc doesn't note it).
**Proposed fix:** extend the preposition set (or use a general preposition list), remove the last-word rule, capitalise after hyphens and after subtitle colons.
**Severity:** med (validateCapitalisation makes wrong "suggested" corrections).
(Audit `docs/aglc4-audit.md:41` claims "toTitleCase correct" and its note about acronym preservation not being handled is stale — `capitaliseWord` :53-57 does preserve acronyms.)

### MED-8 — Rule 1.13 (PDF pp.60-62): alphabetical-ordering cascade incomplete
**Status:** FIXED (src/engine/rules/v4/general/bibliography.ts — compareBibliographyOrder implements the six-step cascade incl fewer-authors-first, verbatim-identical-names quirk (middle initials differ), title/institution keys excluding leading 'the'; wired into generateBibliography. OSCOLA/NZLSG LoA sorts left on their existing keys)
**Rule requires:** six-step tie-break cascade — first author surname → first author first name → subsequent authors' names (single-author works precede multi-author) → title words excluding 'the' → institution name excluding 'the' → title (no author).
**Engine does:** `src/engine/rules/v4/general/bibliography.ts:186-221` — `getSortKey` returns only `authors[0].surname.toLowerCase()`; ties fall to insertion order, so two Rubenstein works or Hathaway-solo vs Hathaway-and-Macklin sort arbitrarily. Title fallback (:219-220) does not exclude a leading 'The'. `institutionalAuthor` is not consulted (falls through to title). Structure otherwise correct: A-E sections and renumbering (:496-545), first-author inversion only (:145-177), no trailing full stop (:460).
**Proposed fix:** build a composite sort key: surname \x00 givenNames \x00 (author2 surname…) \x00 normalised title (strip leading 'the'); works with fewer authors sort before those extending the same author list; add institutionalAuthor to key extraction. Note the rule's "verbatim identical names only" quirk for step 3.
**Severity:** med.
Note (manual): 1.13 requires listing all sources *relied upon*, not merely cited — inherently outside the engine's knowledge; fine as a documented limitation.

### LOW findings (brief)
**Status:** 1.1.4 FIXED (validator.ts accepts `.?!`) · 1.1.7 `nn` FIXED (pinpoints.ts emits `nn` for footnote spans/lists; span-shortening helper `formatNumberSpan` added in numbers.ts, validator for unshortened spans not added — WONTFIX, values user-supplied) · 1.11.3/1.11.4 labels FIXED (dates.ts renumbered to 1.11.4; checkDateSpans wired into validateDocument; 1.11.3 h:mm:ss formatter still a GAP — WONTFIX, manual) · 1.5.1 FIXED (JSDoc corrected to four+ lines; heuristic threshold ~4×90 chars) · 1.2 after-colon lowercase WONTFIX (unsupported context; decisions.md entry via wave-1 ch1 handoff) · 1.5.5 [sic] italics DEFERRED (PDF p 44 silent on italics; decisions.md entry via wave-1 ch1 handoff)
- **1.1.4** (`src/engine/validator.ts:318-328`): `checkFootnoteFormat` errors unless the footnote ends with `.`, but the rule (and the engine's own `ensureClosingPunctuation`, footnotes.ts:23-42) accepts `?`/`!` — false-positive "error" on discursive footnotes ending in a question mark. Fix: accept `.?!`.
- **1.1.7** (`pinpoints.ts` / test chapter1.test.ts:211-227): footnote-span pinpoints render `n 22–4` where the rule requires `nn 22–4`; known, documented limitation (Pinpoint type has no plurality). Fix: detect en-dash/comma in a footnote pinpoint value and emit `nn`. Span shortening (`121–7`) is neither generated nor validated — values are user-supplied → manual; a validator for unshortened page spans / shortened paragraph spans would be a worthwhile addition.
- **1.11.3/1.11.4 labels** (`dates.ts:220-289`): `checkDateSpans` reports year/date-span issues under ruleNumber "1.11.3" (point-in-time in recordings); should be "1.11.4". No `h:mm:ss` media-pinpoint formatter exists (1.11.3) — GAP low.
- **1.5.1** (`validator.ts:562-571`): JSDoc says "three or more lines" must be block-quoted; the rule says short = three lines or less, long = four or more. The 250-char heuristic is info-level so impact is minimal; fix the doc/threshold.
- **1.2**: signals are always rendered capitalised; the rule's after-colon usage (`…: see generally at 198–205`) needs lowercase — unsupported context, acceptable, but worth noting in decisions.md.
- **1.5.5**: Styling.tsx inserts `[sic]` with italic 'sic'; the reference is silent on italicisation — UNVERIFIED against PDF p.44; log to decisions.md.

## Chapter-1 anomaly leakage check (guide's own errors)
- **1.1.7** ('14–15 [18]' hybrid pattern): no leak — spans are user-supplied values; the engine imposes no page-span/paragraph pairing constraint.
- **1.5.2** (uncapitalised post-colon quote in guide example): no leak — no engine logic for quote openings.
- **1.6.3** ('en dash' typo): no leak.
- **1.8.3** ('vis-a-vis' diacritic): no leak — the term appears in neither engine list; the engine's 1.8.3 problem is independent (HIGH-1).
- **1.10.1** (page '65,131' comma in guide's fn 151): partially relevant — the engine's comma check follows the rule band (flags it), which is defensible; but the same example's `¶82-091` would be corrupted by `fixDashes` (see MED-6). No anomaly *adopted*; one anomaly-adjacent false-positive risk flagged.
- **1.11.1 / 1.11.2** (wrong weekdays in examples): no leak — engine never emits or validates weekdays.

## Prior-audit spot-check discrepancies
- `docs/aglc4-audit.md` CH1 table: all 45 rows PASS/FIX-resolved. Contradicted by this review at 1.8.3 (:44), 1.10.1 (:47), 1.5.3 (:31), 1.7 (:41 — stale acronym note, misses preposition/last-word bugs), 1.4.4 (:26 — misses AUDIT2-015 skip), 1.4.6 (:28), 1.13 (:57 — "alphabetical sort correct" overstated).
- `docs/aglc4-coverage.md` Ch 1: "1.5.3 Full — `. . .` with correct AGLC4 spacing" (wrong form); "1.5.7 Full" lists a clause set that doesn't match the rule's closed table; "1.10.1" implied full but inverted; "1.2 Full — all 6 signals" (there are 7 + no-signal; engine actually has all 7, doc is just miscounted).
