# Parity review — AGLC4 Chapter 2 (Cases) vs Obiter engine

Reference: `/Users/matthew.watt/aglc/aglc4-rule-reference.md` `## 2 Cases` (lines 1210–1950, PDF pp 64–91) plus chapter-2 entries of the Consolidated anomalies catalogue (lines 7503–7507).
Engine reviewed: `src/engine/rules/v4/domestic/{case-names,cases,cases-supplementary,cases-unreported}.ts`, `src/engine/data/{court-identifiers,report-series}.ts`, `src/engine/court/reportHierarchy.ts`, `src/engine/engine.ts` (case dispatch), `src/engine/validator.ts` (2.2.7 checks).
Tests reviewed: `tests/engine/chapter2.test.ts`, `tests/engine/reported-formatting-bugs.test.ts` (case section).
All paths below relative to `/Users/matthew.watt/aglc/obiter/`.

Structural note affecting several verdicts: the party-name helpers `formatCrownParty`, `formatGovernmentParty`, `formatAttorneyGeneral`, `formatDPP`, `formatExParte`, `formatRe`, `formatAdmiraltyCase`, `formatCaseWithoutName` and the engine-side `suggestShortTitle` in `case-names.ts` are exported but never called from the dispatch pipeline (`engine.ts` only calls `formatCaseName` + the 2.2/2.3/2.4–2.8 formatters). Rules 2.1.3–2.1.10, 2.1.12 therefore operate as "user types the right thing"; the dead helpers only matter as future wiring and doc precedent.

Also pervasive: JSDoc rule numbers in `case-names.ts` are shifted against AGLC4 (Crown labelled 2.1.3, actual 2.1.4; Government 2.1.4→actual 2.1.6; A-G 2.1.5→2.1.7; DPP 2.1.6→2.1.7; Ex parte 2.1.8→2.1.9; Re 2.1.9→2.1.8; Admiralty 2.1.10→2.1.12). Low severity individually, but violates the project rule that every function traces to the correct numbered AGLC4 rule.
**Status:** FIXED (case-names.ts — all JSDoc rule numbers corrected; PARITY wave 1).

## Summary table

| Rule | Verdict | Severity |
|---|---|---|
| 2 (opener/template) | MATCH | — |
| 2.1.1 Parties' names — general | MISMATCH | High |
| 2.1.2 Corporations and firms | MISMATCH | Medium |
| 2.1.3 Commonwealth/States | MANUAL-OK | — |
| 2.1.4 The Crown | MISMATCH | Low |
| 2.1.5 Government entities | MANUAL-OK | — |
| 2.1.6 Ministers/officers/departments | MISMATCH | Low |
| 2.1.7 A-G and DPP | MATCH | — |
| 2.1.8 Re | MATCH | — |
| 2.1.9 Ex parte | MATCH | — |
| 2.1.10 ex rel | MANUAL-OK | — |
| 2.1.11 v | MISMATCH | High |
| 2.1.12 Admiralty | MISMATCH | Low |
| 2.1.13 Multiple proceedings | MANUAL-OK | — |
| 2.1.14 Short titles | MISMATCH | Medium |
| 2.1.15 Omitting case name | UNVERIFIED | — |
| 2.2.1 Year and volume | MATCH | — |
| 2.2.2 Report series preference | MISMATCH | Medium |
| 2.2.3 Series abbreviations | MISMATCH | Medium |
| 2.2.4 Starting page | GAP | Low |
| 2.2.5 Pinpoints | MATCH | — |
| 2.2.6 Identifying the court | MISMATCH | Medium |
| 2.2.7 Parallel citations | MISMATCH | High |
| 2.3.1 Unreported with MNC | GAP | Medium |
| 2.3.2 Unreported without MNC | MISMATCH | High |
| 2.3.3 Proceedings | MATCH | — |
| 2.3.4 Court orders | MISMATCH | High |
| 2.4.1 Judicial officers | MISMATCH | Medium |
| 2.4.2 Agreement/dissent | MISMATCH | Medium |
| 2.4.3 Joint/separate judgments | GAP | Medium |
| 2.4.4 During argument | MATCH | — |
| 2.4.5 Two or more officers | MISMATCH | Medium |
| 2.5 Case history | MATCH | — |
| 2.6.1 Administrative decisions | MISMATCH | Low |
| 2.6.2 Arbitration | MISMATCH | Low |
| 2.7.1 Transcripts — general | MISMATCH | Medium |
| 2.7.2 Transcripts — HCA | MATCH | — |
| 2.8 Submissions | MATCH | — |
| Anomaly leakage (TASCC / 2.1.14 x-ref / NSD1519 dup) | ANOMALY-RISK | Low |

Counts: MATCH 11 · MANUAL-OK 4 · UNVERIFIED 1 · GAP 3 · MISMATCH 19 · ANOMALY-RISK 1 (row).

---

## Detail blocks

### 2.1.1 Parties' Names — General (PDF p.64) — MISMATCH, High
**Requirement:** Include parties' names as they appear on the decision, citing only the first plaintiff/defendant. Nothing authorises rewriting a *single* party's name that happens to contain "and" or "&" (guide's own examples keep *Herald & Weekly Times Ltd*, ex 66, and *Minister for Immigration and Ethnic Affairs*, ex 110, intact).
**Engine:** `src/engine/rules/v4/domestic/case-names.ts:122-142` `firstPartyOnly()` unconditionally splits each party on `/\s+and\s+/i` and on `&` (unless the next word is `Co|Sons|Partners`). Consequences: `formatCaseName("Theophanous", "Herald & Weekly Times Ltd")` → *Theophanous v Herald*; a party "Minister for Immigration and Ethnic Affairs" → "Minister for Immigration". Additionally `stripGivenNames()` (lines 31–108) treats any two capitalised words as forename+surname (`"Hot Holdings"` → `"Holdings"` when no corporate indicator word is present).
**Fix:** Only split multi-party strings on `;` (the form the guide actually uses for multiple actions, ex 3) or require explicit structured input for additional parties; never split a single party field on "and"/"&". Gate `stripGivenNames` behind an explicit "individual" flag or a much stricter heuristic.
**Severity:** High — silently corrupts common corporate/ministerial party names in the live `case.reported` path (`engine.ts:361`).
**Status:** FIXED (case-names.ts — `firstPartyOnly` now splits only on `;` (keeping Ex parte/Re continuations intact); "and"/"&" splitting removed; `stripGivenNames` requires initials or ≥3 name-like words, so 'Hot Holdings' survives. Tests: exs 66, 110, 29 + Hot Holdings in chapter2.test.ts).

### 2.1.11 v (PDF p.70) — MISMATCH, High
**Requirement:** "'v' should not be followed by a full stop and should be italicised" (reference line 1389; it is part of the italicised case name).
**Engine:** `case-names.ts:188-192` emits `{ text: " v ", italic: false }`, and the JSDoc (line 154) asserts the opposite rule reading. Test `tests/engine/chapter2.test.ts:102-108` locks in the roman 'v'. `docs/aglc4-audit.md` CH2-011 claims "FIX — v now rendered italic per AGLC4" — false against current code (either the fix regressed or was never landed).
**Fix:** `italic: true` for the separator run; update the test to assert italics; correct the audit row.
**Severity:** High — every generated case name is visibly wrong under AGLC4.
**Status:** FIXED (case-names.ts — separator run now `italic: true`; JSDoc corrected; chapter2.test.ts rewritten to assert the italic 'v'. The stale `docs/aglc4-audit.md` CH2-011 row is flagged in the wave-1 handoff, not edited here).

### 2.2.7 Parallel Citations (PDF p.79) — MISMATCH, High

**Status (validator half):** FIXED (src/engine/validator.ts — checkParallelCitations inverted: academic/AGLC mode now warns when a case.reported citation carries parallelCitations, per rule 2.2.7/ex 80, and no longer recommends adding parallels or MNCs; court-mode behaviour (checkParallelCitationEnforcement, validateCourtMode) unchanged. The formatReportedCase half (cases.ts appending parallels in AGLC mode) is PARITY-105's scope.)
**Requirement:** "Parallel citations should never be used for Australian cases" — cite only the single most authoritative version (ex 80 explicitly rejects `(1999) 198 CLR 180; 164 ALR 606; [1999] HCA 36`).
**Engine:** Inverted in two places. (1) `src/engine/validator.ts:1436-1481` `checkParallelCitations` — run in **academic (AGLC) mode** (`validator.ts:195-197`, only skipped in court mode) — emits Rule 2.2.7 warnings telling the user to *add* a parallel citation or MNC. (2) `cases.ts:301-347,409-412` `formatReportedCase` happily appends `; parallel…` runs in AGLC mode whenever data contains them, with a JSDoc ("parallel citations are provided, separated by semicolons") attributing this to AGLC4 Rule 2.2.7. `docs/aglc4-coverage.md:74` documents the inverted validator as "Full" coverage. (Court mode emitting parallels per practice directions is fine; the AGLC4-mode behaviour is not.)
**Fix:** In academic mode, `checkParallelCitations` should warn when parallels ARE present (rule violation), not when absent; suppress parallel emission in `formatReportedCase` unless writingMode is court/OSCOLA-UK context; fix both JSDoc and coverage doc.
**Severity:** High — the validator actively coaches users into breaching the rule.
**Status:** FIXED (cases.ts — `formatParallelCitations`/`formatReportedCase` JSDoc and data contract now state the Rule 2.2.7 prohibition; parallels documented as court-mode/foreign-style only) + HANDOFF (engine wiring: gate `parallelCitations` on `writingMode === "court"` in `dispatchReportedCase`, handoff item 2). The validator.ts inversion is owned by the validator agent.

### 2.3.2 Unreported without MNC (PDF pp.81–2) — MISMATCH, High
**Requirement:** Template `«Case Name» («Court», «Judge(s)», «Full Date») «Pinpoint»` — judge(s) per 2.4.1 are a template element; pinpoint follows the closing parenthesis with no intervening punctuation (ex 84: *Ross v Chambers* (Supreme Court of the Northern Territory, **Kriewaldt J**, 5 April 1956) **77–8**).
**Engine:** `cases-unreported.ts:75-98` `formatUnreportedNoMnc` has no judge parameter and no pinpoint parameter; instead it inserts an optional `proceedingNumber` (an element belonging to 2.3.3/2.3.4, not 2.3.2). Test `chapter2.test.ts:613-630` "Example 84" silently drops Kriewaldt J and the 77–8 pinpoint from the guide's example. `docs/aglc4-audit.md` CH2-024 says PASS.
**Fix:** Add `judges: string` (or officer array reused from 2.4.1) between court and date; add pinpoint appended after `)` with no comma; remove proceedingNumber from this form.
**Severity:** High — the mandated citation form cannot be produced.
**Status:** FIXED (cases-unreported.ts — `judges` + `pinpoint` (post-parenthesis, no comma) added; `proceedingNumber` deprecated and never emitted. Tests assert exs 84 and 95 verbatim) + HANDOFF (engine wiring for `d.judges`/pinpoint, handoff item 3).

### 2.3.4 Court Orders (PDF pp.82–3) — MISMATCH, High
**Requirement:** Template `Order of «Judicial Officer(s)» in «Case Name» («Court», «Proceeding Number», «Full Date of Court Order»)`; every issuing officer named per 2.4.1; proceeding number included if on the order.
**Engine:** `cases-unreported.ts:141-155` `formatCourtOrder` emits only `Case Name (Court, Date)` — no `Order of … in` prefix, no judicial officer, no proceeding number. Test `chapter2.test.ts:650-663` "Example 88" only `toContain`-checks court and date, so the missing template head passes. Audit CH2-026 says PASS.
**Fix:** Add `judicialOfficers` and optional `proceedingNumber` params; prepend roman text `Order of {officers} in ` before the italic case name.
**Severity:** High — output is not a valid 2.3.4 citation.
**Status:** FIXED (cases-unreported.ts — roman 'Order of «officers» in ' head, optional `proceedingNumber`. Tests assert exs 88 and 89 verbatim) + HANDOFF (engine wiring, handoff item 4).

### 2.1.2 Business Corporations and Firms (PDF p.65) — MISMATCH, Medium
**Requirement:** Mandatory abbreviations are exactly: and→&, Company→Co, Limited→Ltd, Proprietary→Pty, Incorporated→Inc, plus status phrases (in liq), (in prov liq), (admin apptd), (mgr apptd), (rec apptd). "Corporation", "Department", "Commission" etc are NOT abbreviated — the guide's own examples keep *Kuwait Airlines Corporation* (ex 39), *Seiko Epson Corporation* (ex 88), *Department of Industrial Relations…* (ex 22) in full.
**Engine:** `case-names.ts:10-21` adds invented mappings Corporation→Corp, Association→Assn, Department→Dept, Authority→Auth, Commission→Cmmn, University→Univ, applied automatically in `abbreviateCorporateNames` (line 227-229), which runs on every party in the live path. `Cmmn` in particular is not an AGLC abbreviation anywhere. Meanwhile the table's "and→&" row is not implemented (and could not be, since `firstPartyOnly` treats "&" as a party separator — see 2.1.1).
**Fix:** Trim `CORPORATE_ABBREVIATIONS` to the five AGLC words; drop the extra six (or move them behind a non-AGLC option); status-phrase handling (lines 232-241) is correct and should stay.
**Severity:** Medium — silently rewrites party names into non-AGLC forms.
**Status:** FIXED (case-names.ts — `CORPORATE_ABBREVIATIONS` trimmed to Co/Ltd/Pty/Inc; Corp/Assn/Dept/Auth/Cmmn/Univ removed; the table's and→& row implemented, gated on corporate-indicator presence so non-corporate 'and's survive. Tests: exs 39, 22, Herald & Weekly Times, Judiciary and Navigation Acts).

### 2.1.14 Shortened and Popular Case Names (PDF pp.71–2) — MISMATCH, Medium
**Requirement:** Short title in italics, single quotes, parentheses after the first citation (via 1.4.4); the default short title is the *first-named party* (or second where Crown first) — so the short title will normally be a substring of the case name (ex 40: … ('*McGinty*')).
**Engine:** `engine.ts:3261-3273` (AUDIT2-015) suppresses the short-title introduction whenever `fullText.includes(shortLower)` — i.e. precisely the rule's default case. `McGinty v Western Australia` with shortTitle "McGinty" gets no ('*McGinty*') parenthetical, yet the resolver will later use the never-introduced short title. Popular names (*Tasmanian Dam Case*) still work because they are not substrings.
**Anomaly check:** the guide's wrong cross-reference in 2.1.14 (says 2.1.1 for corporate-status indicators; should be 2.1.2) has NOT leaked into the engine — `suggestShortTitle` (`case-names.ts:372-393`) cites neither.
**Fix:** Restrict the redundancy check to `fullText === shortLower` (or first-run equality), not `includes`.
**Severity:** Medium — omits a required introduction for the guide's default short-title style.
**Status:** HANDOFF (engine wiring — `engine.ts` is wave-2 scope; precise fix (replace `includes` with strict equality at engine.ts:3261–3273) written up as handoff item 9).

### 2.2.2 Law Report Series preference (PDF p.75) — MISMATCH, Medium

**Status (data half):** FIXED (report-series.ts: Qd R authorised, QR deleted, MNC identifiers flagged `mediumNeutral`; reportHierarchy.ts getDefaultPreferenceRank: FLR→generalist, IR→subject-specific, FCAFC/FamCAFC→MNC tier) / HANDOFF (cases.ts getReportSeriesPreference + SERIES_TO_COURT — see scratchpad handoff/datasets.md §3).
**Requirement:** Preference tiers: authorised (CLR, FCR, VR, NSWLR) → generalist unauthorised (ALR, ALJR, **FLR**, ACTR) → subject-specific (A Crim R, ACSR, **IR**, IPR) → MNC → no MNC.
**Engine:** `cases.ts:130-160` `getReportSeriesPreference` puts **FLR** and **FCAFC** in the authorised set (FLR is expressly a generalist unauthorised example; FCAFC is a court identifier, not a report series) and **IR** in the generalist set (guide: subject-specific). The authorised set uses `"QR"`, so the real AGLC abbreviation `"Qd R"` ranks 3 (subject-specific). Same defects mirrored in `court/reportHierarchy.ts:262-287` (`getDefaultPreferenceRank`, though that one does include "Qd R"). `data/report-series.ts` compounds it: MNC court identifiers (HCA at :158-162, FCA, NSWSC, VCAT, QDC, …) are all typed `"authorised"` report series, and `"Qd R"` (:537-544) is typed `"unauthorised_generalist"` / "Queensland Reports (historical)" — the authorised Queensland series 1958– per the 2.2.3 table.
**Fix:** Move FLR, IR out of their wrong tiers; delete FCAFC/court-IDs from series sets (or type them as `mnc`); make `"Qd R"` the authorised Queensland entry.
**Severity:** Medium — drives wrong "preferred report" suggestions and validation prompts.
**Status:** FIXED for the formatter half (cases.ts — `getReportSeriesPreference` authorised set now the full 2.2.3 table incl `Qd R` and historical series ('QR' kept as tolerated legacy alias); FLR/ACTR generalist, IR/FLC/MVR subject-specific, FCAFC removed) + DEFERRED for `report-series.ts`/`reportHierarchy.ts` (datasets agent owns `src/engine/data` and `src/engine/court`; mirroring noted in handoff item 11, incl the ACTR 2.2.2-vs-2.2.3 in-guide table conflict).

### 2.2.3 Abbreviations for Report Series (PDF p.76) — MISMATCH, Medium

**Status (data half):** FIXED (report-series.ts: 'Qd R' replaces fabricated 'QR'; NTLR and WAR flipped to volume-organised per exx 60/93; reportHierarchy.ts NT hierarchy now NTLR > NTR) / DEFERRED (Tas R/ACTLR/ALJR/NSWLR/VR yearOrganised — provisional pending Appendix A, DATA-004; NSWLR/VR switched systems, boolean cannot represent) / HANDOFF (cases.ts QR→Qd R rename).
**Requirement:** Abbreviations per appendix A; Queensland is `Qd R` (1958–), NT current series `NTLR` (1990–); WAR, Tas R, ACTLR, NTLR, ALJR are volume-organised (guide examples: (1995) 14 WAR 373; (2013) 33 NTLR 65).
**Engine:** `cases.ts:32,137` and `data/report-series.ts:88` use non-AGLC `"QR"`; `reportHierarchy.ts:74` prefers `NTR` (ceased 1991) over `NTLR` for NT; `report-series.ts` `yearOrganised` flags are wrong for WAR (:116 true), Tas R (:124 true), ACTLR (:132 true), NTLR (:148 true), ALJR (:474 true) — all volume-organised. The single boolean also cannot represent series that switched systems (VR pre/post-1997, NSWLR pre/post-1990), which 2.2.1 requires per-volume. Currently only UI lookup/ruleExporter consume the flag, so formatting is unaffected — but any future bracket validation would inherit the errors.
**Fix:** Rename QR→Qd R everywhere (incl. `SERIES_TO_COURT`), correct the flags, consider a year-range structure.
**Severity:** Medium (data correctness; low immediate formatting impact).
**Status:** FIXED for cases.ts (`Qd R` added to `SERIES_TO_COURT` and the authorised set; `NTLR` added alongside `NTR`; 'QR' retained only as a documented legacy alias) + DEFERRED for `report-series.ts` flags and `reportHierarchy.ts` NTR/NTLR preference (datasets agent; handoff item 11).

### 2.2.6 Identifying the Court (PDF p.78) — MISMATCH, Medium
**Requirement:** Court named only when important and not otherwise apparent; the parenthetical takes the court's *name* with jurisdiction suppressed when apparent (ex 77: '(Court of Appeal)', NOT '(Queensland Court of Appeal)'); position: after pinpoints and other parenthetical clauses, before a short title.
**Engine:** `cases.ts:289-299` emits the raw identifier code — `" (QCA)"`, `" (HCA)"` — not a court name; no jurisdiction-suppression logic. Ordering: `formatReportedCase` (cases.ts:400-412) appends the court parenthetical immediately after the pinpoint, then parallels; `engine.ts:413-427` appends the judicial-officer parenthetical *after* the court — reversed against the rule (judges are "other parenthetical clauses" that precede the court). Short title lands last (`engine.ts:3270-3272`), which is correct. `SERIES_TO_COURT` (cases.ts:24-38) omits `Qd R` (has `QR`) and maps `ALJR→HCA` (fine), so Qd R citations always show a redundant court code.
**Fix:** Map courtId→display name for this parenthetical; emit it after the judicial-officer runs; add Qd R to `SERIES_TO_COURT`.
**Severity:** Medium.
**Status:** FIXED (cases.ts — `COURT_DISPLAY` maps identifiers to court names with `unqualifiedName` jurisdiction-suppressed forms; `SERIES_JURISDICTION` drives suppression (ex 77: '(Court of Appeal)' with Qd R); unknown ids pass through as names; `formatReportedCase` gains `judicialOfficers` runs emitted before the court parenthetical, asserted against ex 79) + HANDOFF (engine must pass officers into `formatReportedCase` instead of appending after — handoff item 1).

### 2.3.1 Decisions with MNC (PDF pp.79–81) — GAP, Medium (+ anomaly check: clean)

**Status (data half):** FIXED (court-identifiers.ts: HCASL/FamCA/FamCAFC/NTCCA/TASCCA added with rule 2.3.1 years; `mncFrom`/`mncTo` fields added for year-threshold validation; reportHierarchy.ts: TASCSC documented as legacy preset-key alias only, TASSC/TASCCA/NTCCA/HCASL resolve) / HANDOFF (validator year-threshold check + TASCSC preset-key rename across presets/validator/UI — handoff §§4–5).
**Requirement:** Identifier table incl. HCA, HCASL (2008–), FCA/FCAFC, FamCA/FamCAFC, ACTSC/ACTCA, NSW×3, NTSC/NTCA/NTCCA, QSC/QCA, SASC/SASCFC, **TASSC**/TASCCA/TASFC, VSC/VSCA, WASC/WASCA; MNC only where allocated by the court itself (year thresholds).
**Engine:** Format itself is correct (`cases-unreported.ts:27-57`, tests exs 82–83 pass verbatim). `data/court-identifiers.ts` gaps vs the rule's table: **HCASL, FamCA, FamCAFC, NTCCA, TASCCA** absent (FamCAFC exists only as a *report series* in report-series.ts, and FCAFC likewise absent from court-identifiers). These feed `COURT_ID_SET` in validator.ts:1417 and UI lookup, so eg a `[2012] FamCAFC 9` citation is not recognised as carrying an MNC. No enforcement of the year thresholds (a `[1995] HCA 1` is accepted silently) — the rule's Note forbids retrospective MNCs.
**Anomaly (TASCC):** the guide's worked-example typo 'TASCC' has **not** leaked — `court-identifiers.ts:143` correctly has `TASSC`, and no `TASCC` exists anywhere in src or tests. However `reportHierarchy.ts:123` contains `TASCSC: "TAS"` — an identifier that exists in no AGLC table (apparent typo, probably intended TASCCA); harmless today but a wrong-code time bomb.
**Fix:** Add the five missing identifiers; delete/fix `TASCSC`; optionally validate year ≥ allocation year per court.
**Severity:** Medium.
**Status:** DEFERRED (datasets agent — `court-identifiers.ts` and `reportHierarchy.ts` are outside wave-1 case-formatter scope; the 2.3.1 format functions themselves verified correct).

### 2.4.1 Identifying Judicial Officers (PDF pp.83–5) — MISMATCH, Medium

**Status (data half):** FIXED (new src/engine/data/judicial-titles.ts — full 2.4.1 table with `titleBeforeName` for Commissioner/Judge/Magistrate/Master and plurals incl AJ→AJJ, SJ→SJJ) / HANDOFF (cases-supplementary.ts formatJudicialOfficers before-name branch, plural map replacement — handoff §1).
**Requirement:** Abbreviation table (ACJ … V-P); offices marked * (Commissioner, Judge, Magistrate, Master) must appear **in full before** the name (ex 93: '(Commissioner Buss)'); no 'Per'; no honorifics.
**Engine:** `cases-supplementary.ts:66-145` always renders `name title` — a Commissioner entered as `{name:"Buss", title:"Commissioner"}` renders "(Buss Commissioner)". No table of valid abbreviations, so no validation of titles; plural map (`pluraliseTitle`, :18-25) covers only J/JA/AJA — AJ→AJJ and SJ→SJJ from the guide's table are missing (rule 2.4.5 requires the plural where the table gives one).
**Fix:** Add a pre-name title set {Commissioner, Judge, Magistrate, Master, plus AUJ-style full titles per table}; extend the plural map from the 2.4.1 table; optionally validate titles against the table.
**Severity:** Medium.
**Status:** FIXED (cases-supplementary.ts — `PRE_NAME_TITLES` {Commissioner, Judge, Magistrate, Master} render before the name (exs 93, 117); `PLURAL_TITLES` completed per the 2.4.1 table {JJ, JJA, AJJA, AJJ, SJJ}; titles without a plural repeat the singular per 2.4.5. Note: the PDF table's asterisked offices are exactly those four — 'AUJ' is a normal post-name abbreviation. Full-table validation dataset proposed to datasets agent, handoff item 10).

### 2.4.2 Agreement or Dissent (PDF p.85) — MISMATCH, Medium
**Requirement:** Agreement recorded *inside* the parentheses of the judgment agreed with, comma-separated, with optional 'at' pinpoint: '(Kitto J, Webb J agreeing at 591)'; each agreeing officer separately with their own pinpoint (ex 98).
**Engine:** `cases-supplementary.ts:108-136` renders agreeing officers as separate groups joined with `"; "` → "(Kitto J; Webb J agreeing)" and has no 'at «pinpoint»' support at all (no field on the officer object, engine.ts:414-420). Test `chapter2.test.ts:727-734` only exercises a lone agreeing judge, hiding the separator and pinpoint defects.
**Fix:** Join officer segments with ", "; add optional `agreeingAt` pinpoint per officer.
**Severity:** Medium.
**Status:** FIXED (cases-supplementary.ts — segments join with ', '; `agreeingAt` renders 'agreeing at «pinpoint»'; agreeing officers sharing a joint agreeing judgment group with a plural title. Tests assert exs 96, 97, 98 and 99 verbatim).

### 2.4.3 Joint and Separate Judgments (PDF p.86) — GAP, Medium
**Requirement:** 'for the Court' after the deliverer's name (ex 100: '(Hudson AJ for the Court)'); 'for «names»' where delivered on behalf of specific judges (ex 101).
**Engine:** No representation anywhere — the officer role union (`engine.ts:418`) has no 'for the Court'/'for' variant; `formatJudicialOfficers` cannot emit it. (The test file's "Rule 2.4.3 — Dissenting" block actually tests 2.4.2 subject matter; real 2.4.3 is untested and unimplemented.) Only workaround is stuffing "Hudson AJ for the Court" into `name` with empty title, which emits a stray space.
**Fix:** Add `role: "for_the_court"` and `onBehalfOf: string[]` handling.
**Severity:** Medium.
**Status:** FIXED (cases-supplementary.ts — `JudicialOfficerRef` gains `role: "for_the_court"` and `onBehalfOf: Array<{name; title}>` (grouped/pluralised per 2.4.5). Tests assert exs 100 and 101 verbatim; empty-title officers no longer emit a stray space, asserted via ex 79) + HANDOFF (engine inline officer type widening, handoff item 6).

### 2.4.5 Two or More Judicial Officers (PDF p.87) — MISMATCH, Medium
**Requirement:** Plural abbreviation only for a *joint* judgment; officers who wrote separate judgments keep the singular after each name even when they agree ('Heydon J, Kirby J and Crennan J', NOT 'Heydon, Kirby and Crennan JJ').
**Engine:** `cases-supplementary.ts:98-111` auto-groups every 'majority' officer sharing a title into one plural group — the data model cannot express "same title, separate judgments", so it always produces the guide's rejected form. Mixed-title output also joins groups with "; " (test chapter2.test.ts:712-714 expects "(Maxwell P; Buchanan, … JJA)") where the guide's ex 94 style uses commas within a single joint-judgment listing ('Maxwell P, Buchanan, Nettle, Neave and Redlich JJA').
**Fix:** Add a `judgmentGroup` key (group only officers sharing a judgment); join groups with ", ".
**Severity:** Medium.
**Status:** FIXED (cases-supplementary.ts — `judgmentGroup` added (same-title officers group only when in the same joint judgment; default preserves joint grouping for stored data, fn 106 asserted verbatim). Main listing now joins all name units with commas and a single 'and' before the last unit of the whole listing, per PDF exs 94/95 — ex 94 asserted verbatim, replacing the old '; '-joined test).

### 2.7.1 Transcripts of Proceedings (PDF p.90) — MISMATCH, Medium
**Requirement:** Template `Transcript of Proceedings, «Case Name» («Court», «Proceeding Number», «Judicial Officer(s)», «Full Date») «Pinpoint»`; proceeding number only if on the transcript; all judicial officers named; pinpoint then optional speaker (per 2.4), never '(during argument)'. Ex 116 has *no* proceeding number but does have Croft J.
**Engine:** `cases-supplementary.ts:264-277` — no judicial-officer element, `proceedingNumber` is required (empty string yields "(Court, , date)"), no pinpoint/speaker parameters. Ex 116 is unproducible except by smuggling "Croft J" into the proceedingNumber field (which the test at chapter2.test.ts:806-817 effectively does by never asserting the judge).
**Fix:** Add optional proceedingNumber, required judicialOfficers, optional pinpoint + speaker runs.
**Severity:** Medium. (2.7.2 HCATrans is correct for exs 118; line-number pinpoint + speaker also unsupported there — Low, folded here.)
**Status:** FIXED (cases-supplementary.ts — `formatTranscript` gains optional `proceedingNumber` (empty string no longer emits a dangling comma), `judicialOfficers`, and `pinpoints: TranscriptPinpoint[]` with speakers; `formatHcaTranscript` gains the same pinpoints array. Tests assert exs 116, 117 and 119 verbatim) + HANDOFF (engine wiring, handoff item 5).

### Low-severity mismatches (brief)
- **2.1.4 Crown (PDF p.66):** `formatCrownParty` (`case-names.ts:261-267`, dead code) returns 'R' unconditionally and its JSDoc asserts "always cited as R regardless" — wrong for Crown-as-respondent ('*The King*'/'*The Queen*' in full, ex 12). Fix JSDoc/behaviour before wiring. Low (unwired).
  **Status:** FIXED (case-names.ts — `formatCrownParty(position, monarch)` returns 'The Queen'/'The King' for respondents; JSDoc renumbered to 2.1.4; exs 11–12 tested).
- **2.1.6 (PDF p.67):** `formatGovernmentParty` (dead code) abbreviates Department→Dept via 2.1.2 machinery, contradicting ex 22 which keeps 'Department' in full. Low.
  **Status:** FIXED (case-names.ts — resolved by the 2.1.2 abbreviation-table trim; ex 22 asserted in chapter2.test.ts; JSDoc renumbered to 2.1.6).
- **2.1.12 Admiralty (PDF p.70):** rule says 'The' *should be included* in vessel names; `formatAdmiraltyCase` JSDoc (`case-names.ts:351`) says the opposite ("without The; it will not be added"). Dead code. Low.
  **Status:** FIXED (case-names.ts — JSDoc corrected to require 'The' in vessel names and renumbered to 2.1.12).
- **2.2.4 (PDF p.77):** `startingPage` is `number` throughout (`cases.ts:360`), so unique-reference citations ('(2002) EOC ¶93-198', ATPR '¶41-703, 43,014') cannot be represented. GAP Low.
  **Status:** FIXED (cases.ts — `startingPage: number | string` in `formatStartingPageAndPinpoint`/`ReportedCaseData`; exs 67 and 75 asserted verbatim) + HANDOFF (engine coerces via `toNumber` — pass raw non-numeric strings through, handoff item 7).
- **2.6.1 (PDF p.88):** `formatAdministrativeDecision` (`cases-supplementary.ts:186-229`) force-prepends '*Re*' unless the user typed it — wrong for number/code-titled decisions (ex 109 '*AAT Case 7422*' has no Re); Member/Senior Member titles and 'render separator as it appears' not modelled. Low.
  **Status:** FIXED (cases-supplementary.ts — 'Re' prepended only for the two-party 'Re X and Y' form; `separator` param renders as it appears; `pinpoint` added. Exs 109–110 asserted verbatim. Member/Senior Member are pre-name by convention and can be typed into the officer string; a dedicated dataset is left to the datasets agent).
- **2.6.2 (PDF p.89):** `formatArbitration` (`cases-supplementary.ts:240-251`) emits `parties (type) awardDetails` — template wants one parenthetical `(«Award Description», «Forum», «Case/Award No», «Date»)` then pinpoint, and a 'reported in' tail for reproduced awards; neither is modelled (achievable only by field-stuffing). Low.
  **Status:** FIXED (cases-supplementary.ts — full template fields incl no-parties variant (no parentheses, comma before pinpoint) and 'reported in' tail; legacy fields preserved for stored data. Exs 112, 113, 115 asserted verbatim) + HANDOFF (engine/UI wiring, handoff item 8).

### UNVERIFIED
- **2.1.15 Omitting the Case Name:** `formatCaseWithoutName` (`case-names.ts:411-428`) produces the right shape, but it has no callers; whether the resolver/formatter actually omits the name when it appears in the accompanying sentence (and retains it for subsequent references) was not traced through `resolver.ts`. Marked UNVERIFIED.

### Anomaly-catalogue leakage checks (ANOMALY-RISK row)
- **TASCC (2.3.1 worked example typo):** clean — no `TASCC` in src or tests; `TASSC` used correctly (`court-identifiers.ts:143`, `cases.ts:34`, `reportHierarchy.ts:124`). But note the engine's own novel typo `TASCSC` at `reportHierarchy.ts:123` and the *missing* `TASCCA`.
  - **Status:** FIXED (data) — TASCCA added to court-identifiers.ts and reportHierarchy.ts; `TASCSC` removed from citation-identifier space and retained only as the court-mode preset-key alias pending the coordinated rename (HANDOFF §4).
- **2.1.14 wrong cross-reference (2.1.1 vs 2.1.2):** clean — engine cites neither for corporate-status exclusion.
- **2.3.4 ex 88 duplicated proceeding number NSD1519/2004:** clean-ish — `chapter2.test.ts:651-662` reproduces ex 88 *without* any proceeding number (so the guide's copy-paste error was not imported); the submission test (chapter2.test.ts:849) uses NSD1519/2004 correctly for ex 120.
- **2.1.11 'Example' band label / bracket punctuation anomalies:** cosmetic in the guide; no engine relevance.

### Prior-audit reliability notes
- `docs/aglc4-audit.md` CH2-011 ("v now rendered italic") is contradicted by `case-names.ts:190` and by test chapter2.test.ts:102-108 — do not trust.
- CH2-024, CH2-026, CH2-028/029/030 marked PASS despite the 2.3.2/2.3.4/2.4.2/2.4.3/2.4.5 defects above.
- `docs/aglc4-coverage.md:74` describes the inverted 2.2.7 validator as intended behaviour ("validator warns when MNC present without parallels").
