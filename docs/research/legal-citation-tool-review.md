# Review: finnjones/legal-citation-tool, and what Obiter can learn from it

Reviewed 27 Sep 2026 against commit `c067149` (23 commits, single author Finn Jones, first commit 19 Sep 2026) and Obiter `src/` / `tests/` as on disk. This was a read-only review. Nothing in Obiter was modified. The throwaway probes are in `scratchpad/probe/lct*.test.ts`. They run against Obiter's real modules with `npx jest --rootDir <obiter> --roots <scratchpad>/probe`.

## 1. Summary

legal-citation-tool (LCT) is a Python pipeline. An LLM splits each .docx footnote into text and citation segments, deterministic formatters write AGLC4, and the output goes back into the .docx as OOXML tracked changes. Its most useful idea is **deterministic distrust of the LLM**, done three ways:

- **coverage:** every meaningful input token is still present after extraction.
- **grounding:** no number appears in the output unless it is in the input.
- **rendering:** every field value reaches the formatted text.

A footnote that fails coverage gets one targeted re-ask. If it still fails, the note is left verbatim.

Summary of the verification:

| # | Preliminary claim | Verdict |
|---|---|---|
| 1 | Obiter has no grounding check | **Confirmed, with a correction.** `corpusEnhancedParse` doesn't even surface a confidence value, and it always returns `warnings: []`. Only `parseCitation.ts` shows a confidence. Corpus neighbours are pasted into the prompt, so copying a number from a neighbour is a real risk. |
| 2 | No coverage/re-ask | Confirmed. This only matters once Obiter segments whole notes with an LLM. |
| 3 | Scan & Repair falls back to verbatim for mixed/multi notes | **Confirmed, and it is worse than stated.** It adopts **0 of 24** notes in LCT's test essay. Two deterministic bugs cause part of that: a medium neutral citation (MNC) with a pinpoint always goes verbatim, and so does `s 5B`. Structured adoption only exists for reported/MNC cases, statutes and Hansard. |
| 4 | No tracked changes | Confirmed: `changeTrackingMode` appears nowhere in `src/`. Obiter's baseline is WordApi 1.5 (manifest.xml:20). I believe `document.changeTrackingMode` is WordApi 1.4, but a spike should confirm that. |
| 5 | Rendering check as a test | **Confirmed, and it found real bugs.** A 10-minute sweep found 74 unrendered fields out of 323 across 64 source types. Several are schema drift between the LLM field schema and the engine (details below). |
| 6 | Normalisation heuristics / ibid / disambiguation | Mixed; see §2. **Ibid pinpoint edge case: Obiter is already correct.** **Same-author disambiguation (r 1.4.1): implemented in the resolver but never wired, so the live output is wrong.** New bug: a capitalised mid-footnote `Ibid`. The claims that `AC` is misread as an MNC, that Crown naming is wrong and that `(No 2)` stays round are all confirmed in Obiter. The duplicate start-page/pinpoint claim is **not a formatter bug**: AGLC4 r 2.2.5 repeats the page. |
| 7 | Test essay as a benchmark | Useful as an idea, but the file can't be copied because there is no licence. Obiter scores 0/24 on it (§2.7). |

## 2. Verified findings

### 2.1 Grounding (LCT `aglc/validate.py:55-61`, `:132-157`; used at `aglc/extract.py:485-487`)

- LCT: `numbers()` tokenises numbers and expands shortened spans, so `150–5` also yields `155` (`validate.py:42,58-60`). `remove_invented_numbers` blanks any numeric field or pinpoint whose numbers are not a subset of the numbers in the original. References that resolve to earlier notes are exempt (`extract.py:485`).
- Obiter:
  - `parseCitationText` in `src/llm/parseCitation.ts:190-230` returns `data` unchecked, apart from the source-type whitelist (`:210`) and clamping the confidence (`:215`). The UI shows that confidence (`src/ui/views/InsertCitation.tsx:1185,1606-1607`).
  - `multiTurnLlmParse` returns `warnings: []` unconditionally (`src/llm/corpusEnhancedParse.ts:1136-1142`). Turn 2 shows the model up to 3 corpus neighbours with their years and courts (`:970-982`), and the only guard is "Only populate fields you are confident about" (`:1013`). `parseCitation.ts`'s prompt (`:104-173`) has no "never invent" instruction at all.
  - The warnings plumbing already exists in `CitationPreview.tsx:264-268`, so a grounding warning costs almost nothing to surface.
- Recommendation: a pure `groundNumbers(input, data)` helper that **warns**, not blanks, in the interactive insert flow, where the user sees the form. It should blank only in any future unattended flow. Skip resolved or subsequent references.

### 2.2 Coverage + one targeted re-ask (LCT `validate.py:24-38,105-124`; `extract.py:367-422`)

- LCT keeps a `NOISE` list of citation furniture (signals, `at`, `ibid`, pinpoint labels). It also treats joined word pairs (`Web Page`/`Webpage`) as a match, and accepts an `omitted` field for text AGLC drops (for example a report's publisher: `prompts/extraction.md` ~l.145-150, `extract.py:65-73,401-405`). Missing tokens drive one re-ask that names them (`extract.py:408-422`). If they are still missing, the note stays verbatim and is flagged (`:386-390`). The batch-level re-ask (`:336-356`) and single-note retry (`:424-435`) handle skipped notes.
- Obiter: n/a today, because the LLM only ever sees one citation string that the user pasted. Adopt this together with LCT-004.

### 2.3 Segmentation and subsequent-reference resolution (LCT `extract.py:185-214,224-285,501-545`)

- LCT: the model returns a footnote number for `Ibid`/`(n x)`/`above n x`, and **code** resolves it to the stored source. It matches the short title first, then a substring of the display name, then an author surname, and accepts a single-citation note as unambiguous (`_match_citation`). Anything unresolved becomes an `other` source holding the original text. `_TextMapper` maps segment strings back onto the original runs so italics survive, tolerating differences in whitespace and quotes. `_recover_skipped`/`_dedupe_signal`/`_split_leading_commentary` repair signals and commentary around citations.
- Obiter `src/word/scanRepair.ts`:
  - Pass B is deterministic only (`:20-24`).
  - `PROSE_LEAD_RE` (`:152-153`) sends any note starting with a signal or with `above` to verbatim.
  - `PINPOINT_TAIL_RE` (`:160-161`) rejects any tail except a numeric pinpoint.
  - A verbatim note becomes **one** `custom` citation holding the whole note (`:236-247`). So `Ibid 42`, `Smith (n 3) 12` and multi-citation notes are all verbatim (probe confirmed).
- Keeping this offline is right. An opt-in "AI-assisted repair" would reuse the existing store as the resolution index. That is simpler than LCT's approach because Obiter already has structured sources.

### 2.4 Tracked changes (LCT `aglc/docx_io.py:299-460`)

- LCT writes `w:ins`/`w:del` directly, using a word-level `difflib` diff (`:313-360`) so only the changed words show as revisions, and marks deleted paragraph marks (`:400-421`).
- Obiter: no `changeTrackingMode`/`TrackedChange` anywhere in `src/`. Scan & Repair "managed" adoption rebuilds the note (`src/word/documentScanner.ts:178-340`), and then the refresher re-renders it, both silently. The Office.js route would be to set `context.document.changeTrackingMode = trackAll` around `applyScanPlan`, then restore the user's mode.
- **Risks (spike first):**
  - Revisions inside content controls, and later refreshes rewriting a range that still has pending revisions.
  - Word on the web behaviour.
  - Whole-note replace produces noisy revisions. A minimal diff would need range-level edits.
- The LCT diff code itself can't be copied (§5).

### 2.5 Rendering check as a test (LCT `validate.py:165-187`, run on every note at `pipeline.py:43-45`)

Probe `lct5.test.ts` fills every field in `getFieldSchemaForSourceType` (`src/llm/corpusEnhancedParse.ts:143`) with a unique sentinel, renders with `formatCitation`, and lists the sentinels that don't appear. Result: 74 missing out of 323. Some are legitimately conditional (for example treaty `signedDate`, `case.reported` `mnc`, `journal.online` `dateAccessed`) and need triage. These are verified defects where **the LLM schema names a field the AGLC engine never reads**, so AI-parsed data is silently dropped:

| Type | Schema field | Engine reads | Rendered with sentinels |
|---|---|---|---|
| `book.chapter` | `title` (`corpusEnhancedParse.ts:319`) | `bookTitle` (`engine.ts:1253`) | `… (ed),  (Publisher, 1942) 1949`, with the book title empty |
| `submission.government` | `inquiryName` (`:436`) | `inquiry` (`engine.ts:1946`) | `Submission to  (date)` |
| `report.parliamentary` | `body`, `parlPaperNumber` | `paperNumber` (`engine.ts:4522`) | `, Title (1921)` |
| `icj.pleading` | `caseTitle`, `documentType`, `party`, … | (different keys) | `'',  [0] ICJ Pleadings` |
| `wto.decision` | `complainant`, `respondent`, `docNumber` | (different keys) | `Panel Report, Title, WTO Doc  (date)` |

The same sweep also shows formatters emitting empty separators (`'', `, `(ed),  (`, `[0]`) when fields are absent. That is a second, cheap assertion to add.

### 2.6 Normalisation heuristics (LCT `aglc/normalise.py`) checked against Obiter

| Heuristic | LCT | Obiter today (probe `lct.test.ts`/`lct4.test.ts`) | AGLC4 support (derived `aglc4-rule-reference.md`) | Verdict |
|---|---|---|---|---|
| `[1932] AC 562` misread as MNC | `normalise.py:270-277` moves it to report/starting page when the "court" is a known report series | **Bug.** `MNC_RE` `[A-Z]{2,10}` (`src/api/citationParser.ts:56`) → `{type:"mnc", court:"AC", number:562}`. Scan & Repair adopts `Donoghue v Stevenson [1932] AC 562` as `case.unreported.mnc` with court `AC`. `CitationPreview.tsx:72` does the same for `Ch`/`QB`. | r 2.2 / 2.3 distinguish report series from court identifiers | Adopt (reimplement). Obiter already has `src/engine/data/court-identifiers.ts`, `uk-report-series.ts` and `appendix-a-series.ts` to decide deterministically. |
| MNC + pinpoint | n/a | **Bug found in this review.** `Kuhl v Zurich [2011] HCA 11, [20]` / `… at para 20` → verbatim. `scanRepair.ts:270` passes the whole text, pinpoint included, to `parseCitationText`. Its MNC regex is anchored `$` (`CitationPreview.tsx:72`), so it falls through to `reportSeries:"HCA", startingPage:11`, and `scanRepair.ts:281` then rejects it. The paste-parse flow stores the same wrong data. | r 2.3.1 | Fix (LCT-002) |
| Section pinpoint with a letter | n/a | **Bug.** `Civil Liability Act 2002 (NSW) s 5B` → verbatim. `PINPOINT_TAIL_RE` digit class (`scanRepair.ts:161`) | r 3.1.4 | Fix (LCT-002) |
| Lone chapter page = starting page | `normalise.py:520-532` (warns) | n/a to the engine, which is form-based. It matters only to LLM parse, where the schema has both `startingPage` and `pinpoint`. | Starting page is mandatory for chapters (r 6.6.1) | Only as a *warning* in the LLM parse path |
| Duplicate start page = pinpoint | `extract.py:146-155` drops the pinpoint when the number appears **once** in the source | Obiter renders `55, 55` when both are set | **Derived r 2.2.5 (PDF p.77) repeats the page when pinpointing the first page** (`24 CLR 21, 21`) | **Preliminary pass was wrong to treat this as a formatter fix.** It is only an extraction guard ("the number occurs once in the input"). Fold it into grounding (LCT-001). |
| Publisher company terms r 6.3.1 | Strips `Pty/Ltd/Limited/Co/Company/Inc/Incorporated/LLC/plc` (`normalise.py:362-368`) | Already implemented for `Pty/Ltd/Co/Inc` + a leading `The` (`src/engine/rules/v4/secondary/authors.ts:483-495`, `books.ts:140-172`). Keeps `Lawbook Company`, `… Australia Limited`. | Derived r 6.3.1: drop "corporate-status abbreviations ('Pty', 'Ltd', 'Co', etc)" and *generally* geographic designations ('Australia') | **Uncertain** whether unabbreviated `Limited`/`Company` fall under "abbreviations … etc". Raise a decision; don't guess. |
| Body as website author | Moves a body-like "author" to `website_name` using a keyword list (`normalise.py:433-460`) | Renders `High Court of Australia, 'Current Justices' (Web Page) <…>` | Derived r 7.15: an author only when the page indicates one. Ex 112 has the body as the web page title. | Keyword heuristic too guessy. At most a validator hint; raise a decision. |
| Report `– Final Report` split | `normalise.py:411-414` | Renders `Review of the Law of Negligence: Final Report (2002)` | Derived r 7.1.1: the type "**may** be dropped from the title and placed inside the parentheses" | Optional under AGLC4, so Obiter isn't wrong. Low value: a form suggestion at most. |
| Crown r 2.1.4 | `Rex/Regina/The King/Queen` → `R` if first-named; `The Queen/King` if respondent (`normalise.py:176-190`) | **Gap.** `formatCaseName` (`case-names.ts:184-217`) outputs `Regina v Smith`, `Smith v Regina`. `formatCrownParty` (`case-names.ts:299-307`) is dead code with no callers. | Derived r 2.1.4 (PDF p.66) matches LCT | Adopt: at least a validator warning. A silent rewrite of first-named `Regina`/`Rex`/`The Queen` → `R` looks rule-backed. For the respondent, which monarch applies needs the date, so warn. |
| `[No 2]` r 2.1.13 | `(No. 2)`/`No 2` → `[No 2]` (`normalise.py:146,192-195`) | **Gap.** `Queensland (No. 2)` renders `(No 2)`. Obiter itself *teaches* the round form in `src/ui/data/referenceGuide.ts:269,325`, the LLM prompt example (`src/llm/parseCitation.ts:125-126`) and the placeholders `InsertCitation.tsx:1588,1956,1965`, while its engine tests use `[No 2]`. | Derived r 2.1.13 (PDF p.71): square brackets | Adopt. LCT's regex is over-eager: a trailing bare `No 12` anywhere in a name is rewritten. Convert only a bracketed `(No n)`/`(Nos n and m)` at the end of a party name. |
| Ibid when prev had pinpoint, current none (r 1.4.3) | `document.py:152-157` | **Already correct.** `isIbidEligible` (`src/engine/resolver.ts:1152-1158`); probe → `Smith (n 1)` | r 1.4.3 | No action |
| Same-author disambiguation (r 1.4.1) | `document.py:207-216,221-264` | **Bug.** The resolver supports `disambiguate` (`resolver.ts:534-545`), but `CitationContext` has no such field (`src/engine/engine.ts:295-305`), `formatCitationWithFormat` never sets it (`engine.ts:5481-5491`), and the refresher doesn't compute it (`src/word/citationRefresher.ts:976-986`). Refresher probe, two Smith books: fn 5 `Smith (n 1)`, fn 6 `Smith (n 2)`, with no titles. | Derived r 1.4.1: same author → surname + title; *different* authors sharing a surname → full names | Fix (LCT-003). Don't copy LCT's grouping: it keys on the surname string, which conflates the two r 1.4.1 cases. |
| Ibid only as the first citation of a note | `document.py:144-148` (`j == 0`) | **New finding.** Refresher probe: fn 3 cites Jones; fn 4 cites Smith then Jones → `Smith (n 1); Ibid`. The second citation gets `Ibid` **capitalised mid-footnote**. `engine.ts:5500-5509` lower-cases only after a signal or commentary, and `citationRefresher.ts:971-974` ignores position in the note. | Derived r 1.4.3: capitalise when it *opens* a footnote (ex 69 `See ibid`). Whether ibid may follow another citation in the note is not explicit. | Fix the capitalisation. Route permissibility to `docs/decisions.md`. |

### 2.7 Test essay benchmark (LCT `examples/test_essay.docx`, generated by `examples/make_test_essay.py`)

- 24 deliberately messy notes: dotted abbreviations, `supra`, `op cit`, `hereafter`, signals with colons, mixed prose, multi-citation, `Ibid.`, `above n`, treaties, chapters, newspapers, web pages.
- Probe `lct3.test.ts` ran Obiter's `buildScanPlan` over the 24 extracted note texts: `{"adopt":0,"verbatim":24}`. Some of that is by design (signals, prose, secondary sources are never structured). Some is the §2.6 bugs: note 12 is MNC + `at para 20`, note 22 is `s 5B`, note 2 is `C.L.R.` with dots.
- Licence: the .docx and generator are unlicensed. Fn 9 and fn 20 also mirror AGLC4's own illustrations (r 7.1.1 ex 1, r 7.15 ex 112). **Don't commit it.** Write an Obiter-owned messy fixture on the same pattern, with its own sources and messiness categories, and track the adopt/verbatim/correct counts as a metric.

### 2.8 Things the preliminary pass missed

1. **Schema/engine field drift** in the LLM path (§2.5). This is the highest-value finding, and it is independent of LCT's code.
2. **The MNC + pinpoint and `s 5B` Scan & Repair bugs** (§2.6).
3. **The unwired `disambiguate`** and the **capitalised mid-footnote Ibid** (§2.6).
4. **`(No 2)` taught in Obiter's own UI and prompt** (§2.6).
5. **Replay-real-model-output regression tests** (LCT `tests/test_real_run_regressions.py`, via a fake provider `aglc/llm/providers/fake.py`). Each bug seen in a real run becomes a fixture of the exact JSON the model returned. Obiter's `tests/llm/corpusEnhancedParse.test.ts` could adopt the pattern for AI-parse regressions.
6. **The `omitted` accounting channel** (§2.2). This design detail stops a coverage check from false-flagging text that AGLC deliberately drops.
7. **An anti-invention prompt clause** ("never invent or guess a missing fact; leave it null"; "each number in the source goes in exactly one field": `prompts/extraction.md` l.10-16, ~l.135-140). Obiter's `parseCitation.ts` prompt lacks both. The clause should be restated in Obiter's own words.

## 3. Prioritised table

| P | Idea | Where in LCT | Obiter status (refs) | Value | Effort | Risk |
|---|---|---|---|---|---|---|
| 1 | Field-rendering sweep test across all source types + fix schema drift | `validate.py:165-187`, `pipeline.py:43-45` | Absent; 74/323 misses incl. real drift (`corpusEnhancedParse.ts:143,319,436` vs `engine.ts:1253,1946,4522`) | High: silent data loss in AI parse | S (test) + M (triage/fixes) | Low |
| 2 | Deterministic parser fixes: report series vs MNC, MNC+pinpoint, lettered sections | `normalise.py:270-277` | Bugs at `citationParser.ts:56`, `CitationPreview.tsx:72`, `scanRepair.ts:161,270` | High: wrong stored types; 0/24 adopt | S–M | Low |
| 3 | Wire r 1.4.1 same-author disambiguation; fix mid-footnote `Ibid` case | `document.py:104-264` | Unwired: `engine.ts:295-305,5481-5491`, `citationRefresher.ts:971-986` | High: visible AGLC4 errors in live docs | M | Medium (refresh-wide change; perf memory: keep it O(1) syncs) |
| 4 | Grounding warning for LLM parse (with span expansion) | `validate.py:42,55-61,132-157` | Absent: `parseCitation.ts:190-230`, `corpusEnhancedParse.ts:1136-1142` | High: prevents invented years/pages | S | Low |
| 5 | Crown (r 2.1.4) and `[No n]` (r 2.1.13) normalisation/validation; fix Obiter's own `(No 2)` examples | `normalise.py:142-198` | Gaps: `case-names.ts:184-217`, dead `:299`; `referenceGuide.ts:269,325`; `parseCitation.ts:125` | Medium | S | Low (respondent monarch needs the date → warn) |
| 6 | Obiter-owned messy-essay benchmark for Scan & Repair | `examples/make_test_essay.py` | None | Medium: measures progress | S | Low (write our own) |
| 7 | Tracked changes during Scan & Repair apply (opt-in) | `docx_io.py:299-460` | Absent (`documentScanner.ts:178-340`) | Medium: user trust | M (spike first) | Medium: content controls + revisions, web behaviour |
| 8 | Opt-in AI segmentation for Scan & Repair notes: code-side resolution of Ibid/(n x), coverage + one re-ask, verbatim fallback | `extract.py` whole; `prompts/extraction.md` | Deterministic-only by design (`scanRepair.ts:20-24,152-161,236-247`) | High, but only for users who opt in | L | Medium: privacy/cost; must stay opt-in, offline default |
| 9 | Prompt hardening: no-invention and one-number-one-field clauses | `prompts/extraction.md` l.10-16, ~135-140 | Missing in `parseCitation.ts:104-173`; weak in `corpusEnhancedParse.ts:1009-1014` | Low–Medium | XS | Low |
| 10 | Replay-real-output LLM regression fixtures | `tests/test_real_run_regressions.py`, `llm/providers/fake.py` | Partial mocks in `tests/llm/` | Medium | S | Low |
| 11 | Publisher `Limited`/`Company`/geographic designations; website body-as-author | `normalise.py:362-368,433-460` | Partial (`authors.ts:483-495`) | Low | XS once decided | **Rule uncertain → decisions.md first** |

## 4. Proposed backlog stories

### LCT-001: Grounding check for AI-parsed citations
**AGLC4 Rule:** n/a (data integrity)
**Type:** 🟢 FEATURE
- A pure `src/llm/grounding.ts` `groundedNumbers(input, data)` collects numeric tokens from the pasted text. It expands shortened spans (`150–5` → also `155`), strips leading zeros, and returns each numeric field and pinpoint whose numbers aren't all in the input.
- `parseCitationText` and `multiTurnLlmParse` append a warning per ungrounded field ("Year 1993 isn't in the text you pasted; check it") and never blank the field in the interactive flow. `CitationPreview.tsx` already renders `warnings`.
- An unattended caller (future AI Scan & Repair) passes `mode: "strip"` to blank the field instead.
- Prompts gain Obiter-worded clauses: "leave a field out if its value isn't in the text" and "each number in the text belongs to exactly one field".
**AC:**
- `150–5` grounds `155`. `(1992) 175 CLR 1` with an LLM `year: "1993"` yields one warning. A corpus-neighbour year not in the input yields a warning.
- Deterministic and corpus results are never checked. Tests cover spans, en dash/hyphen, leading zeros and Roman numerals (ignored).

### LCT-002: Deterministic parser: report series vs MNC, MNC with pinpoint, lettered sections
**AGLC4 Rule:** 2.2, 2.3.1, 3.1.4
**Type:** 🔴 BUG
- `parseCitation`/`tokeniseMNC` accept an MNC only when the court code is a known identifier (`court-identifiers.ts`, `uk-court-identifiers.ts`, NZ), and never when it is a known report series (`report-series.ts`, `uk-report-series.ts`, `appendix-a-series.ts`). Otherwise `[YYYY] Series Page` parses as a year-volume report.
- `proposeStructured` passes only the parsed core (text up to the end of `parsed.raw`) to `parseCitationText`, so a trailing pinpoint no longer defeats the anchored MNC regex. The same fix applies in `CitationPreview.parseCitationText`.
- `PINPOINT_TAIL_RE` accepts alphanumeric section and paragraph identifiers (`s 5B`, `s 5B(1)`, `pt IVA`).
**AC:**
- `Donoghue v Stevenson [1932] AC 562` adopts as `case.reported`, series `AC`, starting page 562, not as an MNC.
- `Kuhl v Zurich Financial Services Australia Ltd [2011] HCA 11, [20]` and `… at para 20` adopt as `case.unreported.mnc` with pinpoint `[20]`.
- `Civil Liability Act 2002 (NSW) s 5B` adopts with pinpoint `s 5B`.
- Existing `tests/word/scanRepair.test.ts` stays green.

### LCT-003: Same-author disambiguation and mid-footnote ibid in the refresher
**AGLC4 Rule:** 1.4.1, 1.4.3
**Type:** 🔴 BUG
- Add `disambiguate?: boolean` to `CitationContext`, pass it through `formatCitationWithFormat` to the resolver, and compute it once per refresh. Group secondary-source first citations by normalised author identity. Where two or more distinct sources share **the same author(s)**, set `disambiguate`. Where **different authors share a surname**, render full names per r 1.4.1. This is the open item in `docs/aglc4-audit.md` CH1-010. Do it in memory from the store, with no extra Office.js syncs (per the no-sync-in-loop perf rule).
- An ibid that is not the first rendered item in its footnote is lower-cased.
- Raise a decision on whether AGLC4 permits ibid after another citation in the same note (`Smith (n 1); ibid`) or requires the r 1.4.1 form. Until it is decided, keep the current eligibility and fix only the case.
**AC:**
- Two Smith books cited in fn 1 and fn 2, then again in fn 5 and fn 6, render with the surname and the styled title (italic book titles, quoted article titles).
- Works by J Smith and M Smith render with full names.
- fn 4 `Smith (n 1); ibid` has a lower-case `ibid`.
- The ibid-after-pinpoint rule is unchanged: previous pinpoint, current none → `(n X)`.

### LCT-004: Field-rendering sweep and LLM schema drift fixes
**Type:** 🔴 BUG
- `tests/engine/field-rendering-sweep.test.ts`: for every AGLC4 source type, fill each field named by `getFieldSchemaForSourceType` with a unique sentinel (numeric for numeric fields). Render, and assert every sentinel appears, except for fields on a reviewed per-type allowlist of conditional fields, each allowlist entry citing its rule.
- A second assertion: no output contains an empty element (`''`, `(ed),  (`, `[0]`, `,  (`).
- Fix each confirmed drift by renaming the schema field to the engine key (or adding a `fieldAliases` entry). Confirmed so far: `book.chapter.title` → `bookTitle`, `submission.government.inquiryName` → `inquiry`, `report.parliamentary.parlPaperNumber` → `paperNumber`, `icj.pleading.*`, `wto.decision.*`, and the rest of the probe's 74-field list after triage.
- Extend the sweep to OSCOLA and NZLSG configs.
**AC:**
- The sweep passes with a documented allowlist.
- AI-parse fixtures for `book.chapter` and `submission.government` render the book title and the inquiry.

### LCT-005: Crown and `[No n]` in case names
**AGLC4 Rule:** 2.1.4, 2.1.13
**Type:** 🔴 BUG
- In `formatCaseName`, a first-named party of exactly `Rex`/`Regina`/`The King`/`The Queen` renders `R`. A respondent `Rex`/`Regina` gets a validator warning offering `The King`/`The Queen`; there is no silent rewrite, because the monarch depends on the decision date.
- A trailing `(No n)` or `(Nos n and m)` in a party name renders `[No n]`/`[Nos n and m]`. A bare `No n` is not rewritten.
- Remove the dead-code status of `formatCrownParty` by using it, or delete it.
- Correct Obiter's own examples to `[No 2]`: `referenceGuide.ts:269,325`, `parseCitation.ts:125-126`, and the `InsertCitation.tsx` placeholders.
**AC:**
- `Regina v Smith` → `R v Smith`. `Smith v Regina` warns.
- `Mabo v Queensland (No. 2)` → `Mabo v Queensland [No 2]`. `Re Application No 12` is unchanged.
- The standards suite is unchanged apart from the corrected examples.

### LCT-006: Scan & Repair benchmark fixture
**Type:** 🟢 FEATURE
- An Obiter-authored `tests/fixtures/scan-repair/messy-essay.json`: about 30 notes, Obiter's own wording, covering LCT's messiness categories (dotted abbreviations, `supra`/`op cit`/`hereafter`, signals with colons, prose + citation, multi-citation, `Ibid.`/`above n`, lettered sections, MNC + pinpoint, square-year report series). No AGLC4 illustrations are transcribed.
- A test records `{adopt, verbatim}` and asserts a floor that is raised as LCT-002/LCT-008 land.
**AC:**
- After LCT-002, the floor is at least the count of plain case and statute notes.
- The test documents why each verbatim note is verbatim.

### LCT-007: Spike: tracked changes during Scan & Repair apply
**Type:** 🔵 SPIKE
- Behind a Scan & Repair checkbox ("Show changes as tracked revisions", default off): save `document.changeTrackingMode`, set `trackAll` around `applyScanPlan`, and restore it in `finally`.
- Measure the effect on desktop Word and Word on the web: content controls, the rebuild/refresh path afterwards, the undo stack, read-only docs (`documentAccess.ts`).
- Report whether a minimal-diff apply is feasible, for example by replacing only the changed spans via range search.
**AC:**
- A written go/no-go with screenshots from both hosts.
- No regressions in `tests/word/documentScanner.test.ts`.
- The user's tracking mode is restored even when apply throws.

### LCT-008: Opt-in AI-assisted repair of verbatim notes
**Type:** 🟢 FEATURE
- A separate "AI-assisted repair" action. It is never part of the offline scan. It is disabled unless an LLM provider is enabled, and shows "Send N notes to <provider>". It sends only the notes the user ticks from the verbatim list, in batches.
- The model returns text/citation segments plus `refersToFootnote` for `Ibid`/`(n x)`/`above n x`. **Code** resolves references against the store and the notes already processed, in this order: short title, then display-name substring, then author surname, then the target note's only citation. Anything unresolved stays verbatim.
- Checks:
  - coverage, with a noise list and an `omitted` channel;
  - one re-ask naming the missing tokens;
  - still missing → leave the note verbatim and flag it;
  - grounding in strip mode (LCT-001);
  - the rendering check (LCT-004).
- Italics are preserved by mapping segments back onto the note's runs.
**AC:**
- On the LCT-006 fixture, with a fake provider replaying recorded responses: every note is either adopted with coverage clean, or left byte-identical and flagged.
- No note loses a meaningful token. `Ibid 42` after a single-source note resolves to that source with pinpoint 42.
- Nothing is sent when the provider is disabled.

### LCT-009: Replay-real-output regression fixtures for AI parse
**Type:** 🟢 FEATURE
- `tests/llm/fixtures/real-run/*.json` capture exact model responses that caused defects, replayed through a stub `callLlm`/`callLlmMultiTurn`. Each fixture names the model and date.
**AC:**
- At least the LCT-004 drift cases and one LCT-001 invented-year case are captured and asserted.

Decisions to raise in `docs/decisions.md` (next free id after DECISION-041):
- (a) Does r 6.3.1 drop unabbreviated `Limited`/`Company` and geographic designations like `Australia` in publisher names?
- (b) r 7.15: when a body publishes its own site, is the body the author or the web page title (cf ex 112)?
- (c) r 1.4.3: may ibid follow another citation within the same footnote?

### LCT-010: Parse-verification feedback loop (built 27 Sep 2026; extends LCT-001 and LCT-009)
**AGLC4 Rule:** rr 1.1.6-1.1.7 (pinpoints), 1.2 (signals), 2.2.5 (repeated first page); per-type rules via the engine contract
**Type:** 🟢 FEATURE
- `src/llm/grounding.ts` is LCT-001's grounding helper: numbers are expanded across shortened spans, and a number that is written once but fills two fields is flagged.
- `src/llm/parseVerification.ts` runs at least one verification round on every AI parse, in both the paste path and the corpus multi-turn path:
  - **Deterministic checks:** fields outside the engine contract; missing required fields; ungrounded or double-used numbers; fields the formatter never renders (this catches the §2.5 schema drift at runtime); empty elements in the output; pinpoint form; a report series stored as a court identifier (or the reverse); input text that reached no field, signal, commentary or `omitted` entry.
  - **Feedback turn:** the model gets the type's contract (required and optional fields, aliases, layout template, Obiter's own rule notes), its record, Obiter's rendering and the numbered issues. It returns a corrected record plus its decisions on the pinpoint, signal and commentary, the text AGLC4 drops, explanations for expected issues, and notes for the user. It may switch source type, and the next round then briefs it on that type.
  - **Stopping and ranking:** the loop ends once the model confirms and no blocking warning is left, or after 2 rounds. The best-ranked record wins.
  - **Interactive behaviour:** nothing is blanked. Remaining issues become form warnings. Only coverage, rendering, empty-element and double-use issues can be explained away; grounding, missing-field and pinpoint-form issues can't. Fields outside the contract are dropped, with a note.
- The paste flow now keeps the decided signal and commentary instead of clearing them, and shows the warnings and notes.
- Prompt hardening from §2.8 item 7, and the `[No 2]` example fixed to follow r 2.1.13.
- Tests: `tests/llm/parseVerification.test.ts`, which replays scripted model output in the LCT-009 style.
**Follow-ups:**
- ~~The Preview editor path doesn't surface the signal, commentary or notes.~~ Done: `CitationPreview` passes the loop's extras to the Insert and Edit forms and shows its notes.
- Unattended use (AI Scan & Repair) should add a strip mode.
- The loop has not yet been exercised against a live model.

## 5. What not to adopt, and why

- **Any LCT code, verbatim or translated.** The README says "MIT", but there is no LICENSE file, no `license` field in `pyproject.toml`, and GitHub detects none. Treat it as all-rights-reserved until the author adds a licence. Reimplement the ideas in Obiter's own code.
- **`tests/aglc4_examples/*.json` and `tests/test_aglc4_golden.py` data.** They transcribe AGLC4 examples verbatim, which is forbidden in Obiter. Obiter's derived rule reference and standards suite are the right source.
- **`examples/test_essay.docx` in the repo.** It is unlicensed and partly mirrors AGLC4 illustrations. Build LCT-006 instead.
- **The keyword heuristic for website bodies** (`normalise.py:433-440`) and **the broad `No n` regex** (`normalise.py:146`). Both guess, and the second rewrites bare `No 12` in names.
- **Dropping the pinpoint when it equals the starting page, as a formatter rule.** AGLC4 r 2.2.5 repeats the page. The heuristic is only valid as an extraction guard.
- **LCT's surname-string grouping for r 1.4.1.** It conflates the same author with different authors sharing a surname.
- **LCT's OOXML-level docx rewriting.** Obiter works through Office.js with managed content controls. Only the review-as-tracked-changes idea transfers.
- **Automatic LLM use in Scan & Repair.** Scan & Repair stays offline by default. LCT-008 is a separate opt-in action.

## 6. Credit and licence notes

- Credit "legal-citation-tool by Finn Jones (github.com/finnjones/legal-citation-tool)" in LCT-001/-004/-008 story text and commit messages as the inspiration for coverage, grounding and rendering checks and for code-side reference resolution. Ideas aren't copyrightable, but attribution is good practice.
- If the author adds an MIT licence, MIT code can be incorporated into GPLv3 Obiter with the MIT notice retained. Even then, reimplementing in TypeScript is simpler than porting Python.
- Consider opening an issue on the repo asking the author to add a `LICENSE` file matching the README.
- Nothing in this review transcribes AGLC4 text. Rule content is cited from Obiter's derived `aglc4-rule-reference.md` with rule numbers and PDF pages.
