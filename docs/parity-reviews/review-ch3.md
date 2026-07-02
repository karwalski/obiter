# Parity Review — AGLC4 Chapter 3 (Legislative Materials) vs Obiter Engine

Reference: `/Users/matthew.watt/aglc/aglc4-rule-reference.md` §`## 3 Legislative Materials` (lines 1952–2302, PDF pp 92–106).
Engine: `src/engine/rules/v4/domestic/legislation.ts`, `legislation-supplementary.ts`, dispatch in `src/engine/engine.ts`, subsequent-reference machinery in `src/engine/resolver.ts`.
Tests: `tests/engine/chapter3.test.ts`, `legislation-history.test.ts`, `legislative-history-validator.test.ts`, `bibliography-legislation-italics.test.ts`.
DECISION-008 (`docs/decisions.md:97`) respected as resolved; verified engine against it, not re-litigated.

## Summary table

| Rule | Subject | Verdict | Severity |
|------|---------|---------|----------|
| 3.1.1 | Statute title | MATCH | — |
| 3.1.2 | Year | MATCH | — |
| 3.1.3 | Jurisdiction | MATCH | — |
| 3.1.4 | Pinpoint references | MATCH | low (manual caveats, see notes) |
| 3.1.5 | Multiple pinpoints | MANUAL-OK | low |
| 3.1.6 | Definitions | GAP | medium |
| 3.1.7 | Individual parts w/ own short title | ANOMALY-RISK | high (same root cause as 3.5) |
| 3.2 | Bills | MATCH | — |
| 3.3 | Order of parallel statutes | MATCH | — |
| 3.4 | Delegated legislation | MATCH | — |
| 3.5 | Short title & subsequent refs | MISMATCH | high (+ medium bill-italics issue) |
| 3.6 | Australian constitutions | ANOMALY-RISK | medium |
| 3.7 | Explanatory memoranda | MISMATCH | medium |
| 3.8 | Legislative history | GAP | medium (formatter matches DECISION-008; not wired) |
| 3.9.1 | Gazettes | GAP | medium (basic form MATCHes; notice form missing) |
| 3.9.2 | Orders/rulings of instrumentalities | MISMATCH | high |
| 3.9.3 | Non-government delegated legislation | GAP | medium |
| 3.9.4 | Practice directions/notes | GAP | medium |

Counts: MATCH 7 · MANUAL-OK 1 · MISMATCH 3 · GAP 5 · ANOMALY-RISK 2 · UNVERIFIED 0.

Prior-audit spot-check: `docs/aglc4-audit.md` marks CH3-011 (3.5), CH3-013 (3.7), CH3-015–018 (3.9.1–3.9.4) all PASS — the findings below contradict five of those. `docs/aglc4-coverage.md:88–103` claims "Full" for 3.9.2–3.9.4 (overstated) and describes 3.8 as "Manual … not a citation type" (stale: `formatLegislativeHistory` now exists per DECISION-008).

---

## Detail blocks

### 3.5 / 3.1.7 — Short-title introduction silently suppressed when the short title is a substring of the full citation — MISMATCH/ANOMALY-RISK, HIGH

- **Status:** HANDOFF (engine wiring — engine.ts `appendFirstCitationSuffixes`; see scratchpad handoff `legislation.md` item H1).
- **Rule:** 3.5 (PDF p 100) and 3.1.7 (PDF p 98). The short title must be introduced in parentheses after the first full citation (examples 29, 45, 47). Example 47 introduces '*Migration Act*' for *Migration Act 1958* (Cth); example 29 introduces '*Criminal Code*' for *Criminal Code Act 1995* (Cth) sch 1.
- **Engine:** `src/engine/engine.ts:3261–3272` (`appendFirstCitationSuffixes`): `const isRedundant = fullText.startsWith(shortLower) || fullText.includes(shortLower);` — any short title that is a substring of the full citation text is dropped. That is the *normal* case for legislation ("Migration Act" ⊂ "Migration Act 1958 (Cth) ss 198, 198AB"; "Criminal Code" ⊂ "Criminal Code Act 1995 (Cth) sch 1"). The introduction is suppressed, yet `resolver.ts:227–233` still uses the never-introduced short title in later `(n X)` references — breaking the Rule 1.4.4/3.5 requirement that a short title be introduced before use, on AGLC4's own worked examples.
- **Proposed fix:** For legislation (and cases where the short title differs from the case name), only treat as redundant when the short title equals the full rendered citation (or the title element), not any substring. Pin with tests keyed to AGLC4 ch 3 examples 29, 45, 47.
- **Severity:** HIGH.

### 3.9.2 — Orders and rulings: output structure does not match the template — MISMATCH, HIGH

- **Status:** FIXED (src/engine/rules/v4/domestic/legislation-supplementary.ts — `formatQuasiLegislative` rewritten to `Body(, (Jurisdiction))?, *Title* (Number, Date) Pinpoint`, number optional; exact tests for exs 72–74 in tests/engine/chapter3.test.ts). Dispatch pass-through of the new fields: HANDOFF (engine wiring — scratchpad handoff `legislation.md` item H6).
- **Rule:** 3.9.2 (PDF p 104). Template: `«Instrumentality/Officer», «Instrument Title» («Document Number», «Full Date») «Pinpoint»` — italic instrument title, then number **and** date together in parentheses. Example 72: `Australian Taxation Office, *Income Tax: Carrying on a Business as a Professional Artist* (TR 2005/1, 12 January 2005).`
- **Engine:** `src/engine/rules/v4/domestic/legislation-supplementary.ts:460–482` (`formatQuasiLegislative`) emits `Body, DocType Number, *Title*, Date` (with title) or `Body, DocType Number, Date` (without) — no parentheses, elements in the wrong order, and the roman `documentType` label precedes the number instead of the italic title leading. `tests/engine/chapter3.test.ts:932–943` masks this by stuffing the instrument title into `documentType` and asserting only `toContain`. Also unsupported: jurisdiction parenthetical after a department/officer name (example 74), and a no-number form (number is a required string).
- **Proposed fix:** Rewrite `formatQuasiLegislative` to `Body(, (Jurisdiction))?, *Title* (Number, Date) Pinpoint` with number optional; add exact-match tests for examples 72 and 74; update `dispatchQuasiLegislative` (`engine.ts:897`) accordingly.
- **Severity:** HIGH.

### 3.7 — Explanatory memoranda: Bill citation italicised — MISMATCH, MEDIUM

- **Status:** FIXED (src/engine/rules/v4/domestic/legislation-supplementary.ts — bill title/year roman per rule 3.2; chapter3.test.ts now asserts exact exs 58–60 with `italicText === ""`).
- **Rule:** 3.7 (PDF p 102): "The Bill citation follows rule 3.2", and rule 3.2 prescribes **no italics** for a Bill's title and year. Example 58 renders the Bill roman.
- **Engine:** `src/engine/rules/v4/domestic/legislation-supplementary.ts:241` — `{ text: \`${data.billTitle} ${data.billYear}\`, italic: true }`. The test file acknowledges this: `tests/engine/chapter3.test.ts:809–812` ("known deviation that may need future correction") and deliberately avoids asserting italics. `aglc4-audit.md` CH3-013 nonetheless says PASS.
- **Proposed fix:** Remove `italic: true` from the bill-title run; add `italicText(runs)).toBe("")` assertions to the Rule 3.7 tests.
- **Severity:** MEDIUM (visible italics error on every EM citation).

### 3.5 — Bill short titles italicised in introductions and subsequent references — MISMATCH, MEDIUM

- **Status:** HANDOFF (engine wiring — resolver.ts:227,410; roman-title variants of `formatLegislationShortTitle`/`formatLegislationSubsequentRef` exported and tested; see scratchpad handoff `legislation.md` item H2).
- **Rule:** 3.5 (PDF p 100): short title "italicised according to this chapter's rules (ie italic for Acts/delegated legislation, **roman for Bills**)".
- **Engine:** `src/engine/resolver.ts:410–414` (`formatShortTitleIntroduction`) and `resolver.ts:227–232` (`formatShortReference`) italicise the short title for every `legislation.*` source type; `isLegislation` (`resolver.ts:31–33`) includes `legislation.bill`.
- **Proposed fix:** Branch on `sourceType === "legislation.bill"` (and quasi types as appropriate) to emit roman short titles.
- **Severity:** MEDIUM.

### 3.8 — Legislative history: formatter matches DECISION-008 but is not reachable from the dispatch — GAP, MEDIUM

- **Status:** HANDOFF (engine wiring — dispatchStatute/dispatchBill must consume `data.legislativeHistory` + UI opt-in field; formatter untouched per DECISION-008; chapter3.test.ts Rule 3.8 block refreshed with exact exs 62 and 67; see scratchpad handoff `legislation.md` item H3).
- **Rule:** 3.8 (PDF p 103); DECISION-008 (resolved): single-Act default, opt-in hybrid via `legislativeHistory` field, validator hint, UI opt-in section.
- **Engine (verified against the decision):** `formatLegislativeHistory` (`legislation-supplementary.ts:343–387`) is faithful — closed directional connector set (`:283–294`, correctly omits an "as"-less Bill "inserted by"), solo `as at`/`as enacted`, never synthesises a connector, do-no-harm on incomplete input. Unit tests pin fns 61–68 + the Patents/Raising-the-Bar pair (`tests/engine/legislation-history.test.ts`), and `checkLegislativeHistoryHint` (`src/engine/validator.ts:1080`, tests in `legislative-history-validator.test.ts`) nudges info-only on passive amendment connectors per the decision. **But** `formatLegislativeHistory` is imported nowhere in `src/` outside its own module: `dispatchStatute` (`engine.ts:443–460`) and `dispatchBill` (`engine.ts:793–809`) ignore `data.legislativeHistory`, and no UI component collects it (grep of `src/ui` finds nothing). So the validator hints on a field the renderer never displays, and mode (c) cannot be produced end-to-end. `chapter3.test.ts:861–870` still tests only the guidance placeholder string.
- **Proposed fix:** In `dispatchStatute`/`dispatchBill`, when `data.legislativeHistory` is present, pass the assembled lead through `formatLegislativeHistory` (parsing `relatedAct` per the DECISION-008 parser notes); add the opt-in UI section; refresh the stale `chapter3.test.ts` Rule 3.8 block and `aglc4-coverage.md:99`.
- **Severity:** MEDIUM (no wrong output today; decided feature half-wired).

### 3.1.6 — Definitions: formatter exists but is unreachable, and the paragraph form is missing — GAP, MEDIUM

- **Status:** FIXED (formatter: src/engine/rules/v4/domestic/legislation.ts — added `definitionParagraph` param for ex 26 and a `"portion"` pinpointType so ex 25 renders `Dictionary pt 1` verbatim, which the old test wrongly admitted as `pt Dictionary pt 1`; exact tests for exs 24–26). Wiring + `definedTerm` field: HANDOFF (engine wiring — scratchpad handoff `legislation.md` item H4).
- **Rule:** 3.1.6 (PDF p 97). Template `s «n» (definition of '«term»')`; where a definition paragraph is cited, append `para (a)(i)` inside the parenthetical with no comma (example 26: `s 9 (definition of 'administrator' para (a)(i))`).
- **Engine:** `formatLegislativeDefinition` (`src/engine/rules/v4/domestic/legislation.ts:202–227`) is correct for examples 24–25, but (a) it is not imported by `engine.ts` and no `definedTerm` field exists in any dispatch or UI form — grep finds it only in the module and its tests; (b) it has no parameter for the definition-paragraph reference, and the "example 26" test (`chapter3.test.ts:485–495`) simply omits the `para (a)(i)` element.
- **Proposed fix:** Add `definedTerm` (+ optional `definitionParagraph`) to statute citation data, wire into `dispatchStatute`, extend the formatter to emit `(definition of '«term»' para «p»)`, and pin example 26 exactly.
- **Severity:** MEDIUM.

### 3.6 — Constitution dispatch hijacks any Cth-jurisdiction constitution citation — ANOMALY-RISK, MEDIUM

- **Status:** HANDOFF (engine wiring — dispatchConstitution alias-guard; see scratchpad handoff `legislation.md` item H5).
- **Rule:** 3.6 (PDF p 101). Self-government Acts (examples 50–51) and the *Commonwealth of Australia Constitution Act 1900* (Imp) 63 & 64 Vict, c 12 form are cited as ordinary statutes, not as "*Australian Constitution*".
- **Engine:** `dispatchConstitution` (`src/engine/engine.ts:843–856`): `if (jurisdiction === "Cth") return formatCommonwealthConstitution(pinpoint);` — a user who enters *Australian Capital Territory (Self-Government) Act 1988* (Cth) as `legislation.constitution` gets "*Australian Constitution* s 22(1)", silently discarding title and year. Jurisdiction also defaults to "Cth" when absent. (The chapter3 tests for examples 50–51 call `formatStateConstitution` directly, bypassing the dispatch trap.) The Imp enactment form and the alternative accepted names ("*Commonwealth Constitution*", "*Constitution*") are not offered — acceptable, since "*Australian Constitution*" is one of the sanctioned forms.
- **Proposed fix:** Only collapse to `formatCommonwealthConstitution` when no title is supplied (or when the title matches a Constitution alias); otherwise fall through to `formatStateConstitution` regardless of jurisdiction.
- **Severity:** MEDIUM (data-loss trap on plausible input; correct output achievable via `legislation.statute`).

### 3.9.1 — Gazettes: individual-notice form unsupported — GAP, MEDIUM

- **Status:** FIXED (src/engine/rules/v4/domestic/legislation-supplementary.ts — `formatGazette` gains `noticeAuthor`/`noticeTitle` (roman, quoted, `in`), `page: number | string` starting page and `pinpoint` string; exact tests for exs 69–71). Dispatch pass-through: HANDOFF (engine wiring — scratchpad handoff `legislation.md` item H6).
- **Rule:** 3.9.1 (PDF p 104). Second template: `«Author», '«Title of Notice»' in «Jurisdiction», «Gazette Title», No «n», «Date», «Starting Page», «Pinpoint»` (example 71, incl. starting page 1142 + pinpoint 1143).
- **Engine:** `formatGazette` (`legislation-supplementary.ts:412–436`) supports only the basic form (which MATCHes example 69 exactly, incl. italic gazette title); no author/notice-title fields, and `page` is a single `number` (`engine.ts:887–893` uses `toOptionalNumber`), so `1142, 1143` (start page + pinpoint) cannot be rendered.
- **Proposed fix:** Add optional `noticeAuthor`/`noticeTitle` (roman, single quotes, `in` connector) and change page handling to starting page + optional pinpoint string.
- **Severity:** MEDIUM.

### 3.9.3 — Non-government delegated legislation: `(at «Full Date»)` form and name-trimming absent — GAP, MEDIUM

- **Status:** FIXED (src/engine/rules/v4/domestic/legislation-supplementary.ts — `atDate` variant renders `(at «Full Date»)` with no number/date faking, and `trimIssuingBodyName` strips Pty/Ltd/Co/Inc/NL and a leading 'The' on that path; exact tests for exs 75–77). Validator hint for the numbered form + dispatch pass-through: HANDOFF (engine wiring — scratchpad handoff `legislation.md` item H6).
- **Rule:** 3.9.3 (PDF p 105). Template `«Issuing Body», «Title» (at «Full Date») «Pinpoint»`; omit 'Pty'/'Ltd'/'Inc' etc and leading 'the' from the body name (example 77).
- **Engine:** No dedicated formatter. `tests/engine/chapter3.test.ts:980–992` shoehorns example 75 through `formatQuasiLegislative` by passing `number: "at 19 December 2016"`, which actually renders `ASX, Listing Rules at 19 December 2016, 19 December 2016` (date duplicated, title roman) — the test's `toContain` assertions hide this. No company-designator trimming anywhere (could be a validator hint).
- **Proposed fix:** Add an `(at date)` variant to the 3.9.2 formatter (title italic, parenthesised `at` date, no number) plus a validator hint for 'Pty/Ltd/Inc/The' in `issuingBody`; pin examples 75 and 77 exactly.
- **Severity:** MEDIUM.

### 3.9.4 — Practice directions/notes: neither template implemented — GAP, MEDIUM

- **Status:** FIXED (src/engine/rules/v4/domestic/legislation-supplementary.ts — new `formatPracticeDirection` with report-series and dated forms, italic designation+identifier+title unit, numeric-identifier 'No' insertion, identifier-less form for ex 81; exact tests for exs 78–81 replace the old `formatQuasiLegislative` abuse). Dispatch routing: HANDOFF (engine wiring — scratchpad handoff `legislation.md` item H6).
- **Rule:** 3.9.4 (PDF p 106). Two forms: report-series (`«Court», *Practice Direction/Note «No»: «Title»* «Report citation», «Pinpoint»`, example 78 `… (2010) 30 VR 693`) and dated (`…, «Full Date», «Pinpoint»`, examples 79–80); the words 'Practice Direction/Note', identifier and title are all italic; insert 'No' only for genuinely numeric identifiers (example 79 rejects 'No SC Gen 10').
- **Engine:** No formatter. The sole test (`chapter3.test.ts:999–1014`) abuses `formatQuasiLegislative` (title duplicated into `documentType` and `number`), yielding `Supreme Court of Victoria, Practice Note No 8 of 2010 Management of Group Proceedings, *Management of Group Proceedings*, 2010` — wrong italics, duplicated title, no report-series form. `aglc4-audit.md` CH3-018 claims PASS.
- **Proposed fix:** Dedicated `formatPracticeDirection` with `court`, `designation` ('Practice Direction'/'Practice Note'), `identifier` (+ numeric detection for 'No'), `title`, and either `reportCitation` or `date`; italicise designation+identifier+title as one unit; pin examples 78–80.
- **Severity:** MEDIUM.

---

## Minor notes (no detail block warranted)

- **3.1.4/3.1.5 manual caveats (LOW):** Plural promotion (`isPluralPinpoint`, `legislation.ts:83–85`) triggers only on en-dash/em-dash/comma — a hyphen-typed range (`5-6`) stays singular (`s 5-6`). This is a deliberate trade-off (taxation pinpoints like `s 26-52(6)(c)` legitimately contain hyphens, example 15 passes), but a validator hint on hyphen-only ranges in section values would help. Highest-level-abbreviation choice, decimal lowest-level rule, span shortening per 1.10.1 (`26–9`), alphanumeric spans written in full (`2A–2D`), and no-'and'-before-last are all left to the author — none is enforced or hinted.
- **Ibid pinpoints (LOW ANOMALY-RISK):** `resolveIbid` (`resolver.ts:373–383`) uses the general `formatPinpoint`, which has no plural forms — `Ibid ss 5–6` would render `Ibid s 5–6`. `formatShortReference` already special-cases legislation (`resolver.ts:243–247`); `resolveIbid` should too.
- **Dead code divergence (LOW):** `formatLegislationShortTitle`/`formatLegislationSubsequentRef` (`legislation-supplementary.ts:105–142`) are exported and tested but unused in production (resolver has its own implementations). The dead pair italicises the parentheses/quotes and uses straight quotes, contradicting example 45's roman parens (reference shows `('*Property Act*')`); the production resolver path is correct (curly quotes, roman parens, italic title). Delete or align the dead pair to avoid future misuse. **Status:** FIXED (legislation-supplementary.ts — pair aligned to the production form: roman parens, curly quotes, italic title, plus a roman `italicTitle = false` variant for Bills usable by the resolver wiring).
- **3.3:** `validateStatuteOrder` (`legislation-supplementary.ts:51–67`) matches the rule (Cth → ACT → NSW → NT → Qld → SA → Tas → Vic → WA); actual footnote ordering remains authorial, which the rule contemplates ("unless there is good reason not to").
- **3.1.3:** No jurisdiction-abbreviation table is enforced at format time (free string). UI presumably constrains; not re-verified — treated as part of the 3.1.3 MATCH since output for valid abbreviations is exact.
- **Reference anomalies catalogue (ch 3 entries, reference lines 7508–7510):** the '(n 66)/(n 67)' back-reference slip (3.1.7), the 2005-vs-2015 Supreme Court Rules discrepancy (3.4), and the 'Rules' band label (3.9.3) are all guide-internal typos with no engine implications; none is (or should be) encoded in the engine.
- **Bibliography italics (3.1.1):** `bibliography-legislation-italics.test.ts` passes title+year italic / jurisdiction roman, though it casts a nonexistent `"legislation.act"` source type — harmless but worth tidying to `legislation.statute`. **Status:** FIXED (tests/engine/bibliography-legislation-italics.test.ts — now `legislation.statute`, cast removed).
