# Parity Review — AGLC4 Part IV (Chapters 8–14) vs Obiter engine

Reference: `/Users/matthew.watt/aglc/aglc4-rule-reference.md` (Part IV, lines 3536–5168, plus consolidated anomalies catalogue).
Engine: `/Users/matthew.watt/aglc/obiter/src/engine/rules/v4/international/*.ts`, `src/engine/engine.ts` (dispatch layer), `src/engine/data/eu-case-prefixes.ts`.
Tests: `/Users/matthew.watt/aglc/obiter/tests/engine/chapter8-14.test.ts` (39 tests, all passing as of this review).

Method note: every formatter in `international/` was read in full, together with its dispatcher in `engine.ts` (the dispatch layer materially changes reachable behaviour — three formatters are dead code) and every test in `chapter8-14.test.ts`. "MATCH" means the reachable engine output conforms to the rule's template for the elements the engine models; content-selection duties (title trimming, shortened party names, phase standardisation) are the user's and are noted as manual where relevant. UNVERIFIED is used for the seven short-title/subsequent-reference rules, which route through the resolver (`src/engine/resolver.ts`) — not examined in this review.

## Summary table

| Rule | Subject | Verdict | Severity |
|---|---|---|---|
| 8.1 | Treaty title | MATCH | — |
| 8.2 | Parties' names | MATCH | — |
| 8.3.1 | Opened for signature | MATCH | — |
| 8.3.2 | Signed / same-date compressed form | MISMATCH | Medium |
| 8.3.3 | Not yet in force | MATCH | — |
| 8.4 | Treaty series (year-organised / sequential forms) | GAP | Low |
| 8.5 | Reservations/declarations | MANUAL-OK | — |
| 8.6 | Memoranda of understanding | MISMATCH | Medium |
| 8.7 | Treaty pinpoints | MATCH | — |
| 8.8 | Short title / subsequent refs | UNVERIFIED | — |
| 9.1 | UN Charter | GAP | Low |
| 9.2 | Element order / separators | MATCH | — |
| 9.2.1 | Author | MATCH | — |
| 9.2.2 | Title (titleless resolutions) | MISMATCH | High |
| 9.2.3 | Resolution/decision number | MATCH | — |
| 9.2.4 | Official Records | MATCH | — |
| 9.2.5 | Committee number | GAP | Low |
| 9.2.6 | Session (SC-res exclusion; contradicts 9.2.7 ex 15) | ANOMALY-RISK | Low |
| 9.2.7 | Meeting number | MATCH | — |
| 9.2.8 | Agenda item (plural form) | GAP | Low |
| 9.2.9 | Supplement | MATCH | — |
| 9.2.10 | UN Doc number ('UN Docs' plural) | ANOMALY-RISK | Low |
| 9.2.11 | Full date | MATCH | — |
| 9.2.12 | Annex | GAP | Low |
| 9.2.13 | Pinpoints after date | MISMATCH | Medium |
| 9.2.14 | Documents of multiple organs | GAP | Low |
| 9.3.1 | UN treaty-committee decisions | MISMATCH | Medium |
| 9.3.2 | Parties' communications/submissions | GAP | Medium |
| 9.4 | UN yearbooks | MATCH | — |
| 9.5 | Short title / subsequent refs | UNVERIFIED | — |
| 9.6 | Commonly cited documents | MATCH (subject to 9.2.2 finding) | — |
| 10.1 | ICJ/PCIJ constitutive documents | MANUAL-OK | — |
| 10.2.1–10.2.8 | Reported ICJ/PCIJ decisions | MATCH | — |
| 10.2 (dispatch) | Default report series 'ICJ Reports' | MISMATCH | Low |
| 10.3 | Reported pleadings (PCIJ ser C form) | GAP | Low |
| 10.4.1–10.4.2 | Unreported ICJ materials (General List No) | GAP | Medium |
| 10.5 | Short title / subsequent refs | UNVERIFIED | — |
| 11.1.1 | State–state reported | MATCH | — |
| 11.1.2 | State–state unreported | MATCH | — |
| 11.2.1 | Individual–state reported | GAP | Medium |
| 11.2.2 | Individual–state unreported | MISMATCH | High |
| 11.3 | Short title / subsequent refs | UNVERIFIED | — |
| 12.1.1 | Constitutive documents | MANUAL-OK | — |
| 12.1.2 | Rules of tribunals | GAP | Low |
| 12.2.1–12.2.4, 12.2.6, 12.2.7 | Criminal tribunal cases | MATCH | — |
| 12.2.5 | Multiple case numbers ('Case Nos') | GAP | Low |
| 12.2.8 | Identifying judges | GAP | Low |
| 12.3 | Reports of cases (ILR/ILM form) | GAP | Medium |
| 12.4 | Short title / subsequent refs | UNVERIFIED | — |
| 13.1.1 | WTO constitutive documents | MANUAL-OK | — |
| 13.1.2 | Official WTO documents | GAP | Medium |
| 13.1.3 | WTO panel/AB/arbitrator decisions | MATCH (DSR ref: minor gap) | — |
| 13.2.1 | Official GATT documents | GAP | Medium |
| 13.2.2 | GATT panel reports | MATCH | — |
| 13.3 | Investment treaties / ISDS (referral) | MANUAL-OK (inherits 11.2.2 mismatch) | — |
| 13.4 | Short title / subsequent refs | UNVERIFIED | — |
| 14.1 | Constitutive documents | MANUAL-OK | — |
| 14.2.1 | EU Official Journal | MISMATCH | Medium |
| 14.2.2 | EU constitutive treaties | MANUAL-OK | — |
| 14.2.3 | EU courts — reported | MATCH | — |
| 14.2.3 | EU courts — unreported/ECLI | GAP | Medium |
| 14.2.3 (data) | eu-case-prefixes.ts 'P-' prefix | ANOMALY-RISK | Low |
| 14.3.1 | Council of Europe basic documents | MANUAL-OK | — |
| 14.3.2 | ECtHR decisions | MISMATCH | High |
| 14.3.3 | European Commission of Human Rights | MISMATCH | Medium |
| 14.4.1 | Other supranational decisions | MATCH | — |
| 14.4.2 | Advisory opinions | MATCH | — |
| 14.4.3 | Rules of procedure | GAP | Low |
| 14.4.4 | Pleadings and other documents | GAP | Low |
| 14.5 | Documents of supranational bodies | MISMATCH | Medium |
| 14.6 | Short title / subsequent refs | UNVERIFIED | — |

Counts: MATCH 34 · MISMATCH 11 (3 high, 7 medium, 1 low) · GAP 19 (5 medium, 14 low) · ANOMALY-RISK 3 · MANUAL-OK 8 · UNVERIFIED 7.

---

## Detail blocks — HIGH

### H1. Rule 9.2.2 (PDF p.169) — titleless resolutions get an italicised resolution number
**Requirement:** UN document titles are italicised; SC resolutions "generally do not" have a title. The resolution number is a separate, roman element (9.2.3): `SC Res 827, UN Doc S/RES/827 (25 May 1993)` — 'SC Res 827' unitalicised (9.6 ex 53).
**Engine:** `formatUnDocument` (`src/engine/rules/v4/international/un.ts:79-102`) makes `title` a required field and always italicises it (`un.ts:102`). There is no titleless path. The test at `tests/engine/chapter8-14.test.ts:185-197` works around this by passing `title: "SC Res 827"` and then **asserts** `italicSegments(runs)).toContain("SC Res 827")` — enshrining italic output the guide forbids. The meeting-record test (`chapter8-14.test.ts:216-230`) similarly stuffs 'UN GAOR' (a roman Official-Records element) into the italic title slot.
**Proposed fix:** make `title` optional in `formatUnDocument`; when absent, begin with the roman `resolutionNumber` (or officialRecords) element and drop the leading comma. Fix both tests to assert roman 'SC Res 827' / 'UN GAOR'.
**Severity:** High — every Security Council resolution and every meeting record cited through the engine renders with wrong italics.
**Status:** FIXED (src/engine/rules/v4/international/un.ts — title now optional, resolution number roman; both tests rewritten to exact ex 53/ex 54 assertions)


### H2. Rule 11.2.2 (PDF p.199) — individual–state unreported arbitrations formatted wrongly
**Requirement:** `«Parties' Names» («Phase») («Name of Arbitral Body or Tribunal», Case No «Number», «Full Date») «Pinpoint»`, eg *Enron Corporation v Argentina (Jurisdiction)* (ICSID Arbitral Tribunal, Case No ARB/01/3, 14 January 2004) [39]. Phase is italicised in its own parentheses; the tribunal name appears as on the decision; pinpoints follow.
**Engine:** `dispatchArbitralIndividualState` (`src/engine/engine.ts:1703-1712`) routes *all* `arbitral.individual_state` citations to `formatIcsidCase` (`src/engine/rules/v4/international/arbitral.ts:148-165`), which emits `*Case Name* (ICSID Case No X, AwardType, Date)`: (a) hard-codes the literal 'ICSID', so NAFTA/UNCITRAL/ad-hoc tribunals are mislabelled; (b) puts the phase roman inside the tribunal parenthetical instead of italic after the parties; (c) has no pinpoint parameter; (d) element order contradicts the template. Note `formatStateArbitration` (`arbitral.ts:98-129`) already produces the correct 11.2.2 shape.
**Proposed fix:** point `dispatchArbitralIndividualState` at `formatStateArbitration` (phase → awardDetails, tribunal from data with 'ICSID Arbitral Tribunal' as default only when the case number matches `ARB/...`), and delete or rewrite `formatIcsidCase`. Add a reported path (see 11.2.1 gap below).
**Severity:** High — the entire investor–state category (also referenced by rule 13.3) produces non-conforming citations.
**Status:** FIXED (src/engine/rules/v4/international/arbitral.ts — formatIcsidCase rewritten to the 11.2.2 shape: italic phase parenthetical, tribunal param defaulting to 'ICSID Arbitral Tribunal', pinpoint); FIXED (engine wiring wave 2 — dispatchArbitralIndividualState gains the rule 11.2.1 reported branch and passes tribunal/pinpoint on the unreported path; Olguín dispatch test in tests/engine/parity-dispatch.test.ts)


### H3. Rule 14.3.2 (PDF p.227) — reported ECtHR decisions unreachable; dispatcher always emits the unreported form
**Requirement:** Reported decisions: pre-1996 `«Parties» («Year») «Volume» Eur Court HR (ser A) «Pinpoint»`; from 1996 `«Parties» [«Year»] «Volume» Eur Court HR «Starting Page», «Pinpoint»`. Unreported form (with 'European Court of Human Rights, Grand Chamber/Chamber, Application No, Date') only where not reported.
**Engine:** `formatEchrReportedCase` (`src/engine/rules/v4/international/supranational.ts:182-228`) implements the reported forms and is tested (`chapter8-14.test.ts:680-732`) — but it is **dead code**: `dispatchEchrDecision` (`src/engine/engine.ts:1802-1813`) calls only `formatEchrCase`, and if a `reportSeries` is supplied it is jammed inside the unreported parenthetical: `(European Court of Human Rights, Application No X, ECHR 2001-XI, date)` — a form appearing nowhere in AGLC4. Secondary bugs in the dead reported formatter, for when it is wired up: (i) a ser A pinpoint is emitted as `, 28` but ex 32 shows `… (ser A) 28` — no comma, because ser A citations have no starting page for the comma convention to attach to (`supranational.ts:218-220`); (ii) chamber accepts free text like 'Fourth Section' whereas the rule limits the element to 'Grand Chamber'/'Chamber' (test `chapter8-14.test.ts:735-748` encodes 'Fourth Section').
**Proposed fix:** in `dispatchEchrDecision`, route to `formatEchrReportedCase` when `reportSeries`/volume data is present; make ser A pinpoints space-separated; constrain or document the chamber element.
**Severity:** High — reported ECtHR citations (the preferred form under the rule) cannot be produced through the engine; audit doc already flags CH14-006 FIX, coverage doc wrongly claims "Full".
**Status:** FIXED (src/engine/rules/v4/international/supranational.ts — ser A pinpoint space-separated, chamber constraint documented, 'Application Nos' plural, test rewritten to ex 33); FIXED (engine wiring wave 2 — dispatchEchrDecision routes d.reportSeries → formatEchrReportedCase; series no longer jammed into the unreported parenthetical; ex 31 dispatch test)


---

## Detail blocks — MEDIUM

### M1. Rule 8.3.2 (PDF p.161) — compressed '(signed and entered into force …)' form missing
**Requirement:** When conclusion and entry-into-force dates are identical: `«Title», «Series» (signed and entered into force «Date»)` — never state the date twice (ex 8).
**Engine:** `formatTreaty` (`src/engine/rules/v4/international/treaties.ts:76-101`) always emits `signed X, … (entered into force X)` — the exact repetition the rule prohibits.
**Fix:** when `signedDate === entryIntoForceDate` (or a `sameDate` flag), suppress the post-title date element and emit `(signed and entered into force …)` after the series. Severity: Medium.
**Status:** FIXED (src/engine/rules/v4/international/treaties.ts — same-date '(signed and entered into force …)' form; exact ex 8 test)


### M2. Rule 8.6 (PDF p.164) — MOU formatter deviates on three points
**Requirement:** Parties per rule 8.2 (en-dash joined, roman); omit '(Memorandum of Understanding)' descriptor when the phrase already appears in the title (then comma before pinpoint — ex 15); pinpoints per rule 8.7 (with designators, eg 's 2').
**Engine:** `dispatchTreatyMou` (`src/engine/engine.ts:533-572`): joins parties with `" and "` (`engine.ts:544`) not en-dashes; always appends the descriptor (`engine.ts:562`) even when the title begins 'Memorandum of Understanding…'; emits the raw `pinpoint.value` (`engine.ts:565`), dropping the designator ('2' instead of 's 2') instead of using `formatPinpoint`. Treaty-series insertion after the date (rule 8.6 bullet 2) also unsupported (low).
**Fix:** join parties with `–`; suppress descriptor when `/memorandum of understanding/i.test(title)` and use a comma before the pinpoint in that case; format the pinpoint through `formatPinpoint`. Severity: Medium.
**Status:** FIXED (src/engine/rules/v4/international/treaties.ts — new formatMou: en-dash parties, descriptor suppression with comma-pinpoint, formatPinpoint designators, treaty-series slot, URL; exact ex 15/16 tests); FIXED (engine wiring wave 2 — dispatchTreatyMou delegates to formatMou; dispatch test)


### M3. Rule 9.2.13 (PDF pp.177–178) — pinpoint preceded by a comma
**Requirement:** Elements after the UN document number "generally take no separating punctuation"; illustrations: `(13 October 2006) Preamble paras 3–4`; `(15 November 1999) 6 [3]–[4]`.
**Engine:** `formatUnDocument` (`un.ts:146-148`) emits `, ${pinpoint}` after the parenthesised date. Same comma bug in `formatUnCommitteeDecision` (`un.ts:196-198`) and `formatUnCommunication` (`un.ts:253-255`).
**Fix:** change separator to a single space in all three. Severity: Medium — affects every pinpointed UN citation.
**Status:** FIXED (src/engine/rules/v4/international/un.ts — space separator in formatUnDocument, formatUnCommitteeDecision and formatUnCommunication; exact ex 34/35 tests)


### M4. Rule 9.3.1 (PDF p.179) — treaty-committee decisions: session misplaced / missing
**Requirement:** Follows rule 9.2 order: `Human Rights Committee, *Views: Communication No 1011/2001*, 81st sess, UN Doc CCPR/C/81/D/1011/2001 (26 August 2004) 21 [9.8]` — session **before** the UN Doc number.
**Engine:** the reachable path, `dispatchUnCommunication` → `formatUnCommunication` (`engine.ts:1584-1612`, `un.ts:215-258`), has no session parameter at all; the unreachable `formatUnCommitteeDecision` (`un.ts:170-201`) places session **after** the document number. Both misordered/incomplete, plus the comma-pinpoint bug (M3).
**Fix:** add `session` to `formatUnCommunication` between title and doc number; delete or fix and wire `formatUnCommitteeDecision`. Severity: Medium.
**Status:** FIXED (src/engine/rules/v4/international/un.ts — session added to formatUnCommunication and moved before the UN Doc number in formatUnCommitteeDecision; exact ex 38 test); FIXED (engine wiring wave 2 — dispatchUnCommunication passes session; UN-form session field wave 3)


### M5. Rule 9.3.2 (PDF p.180) — parties' communications/submissions form not implemented
**Requirement:** `«Author», '«Title»' (single quotes, roman), «Document Type» to the «Committee» in «Case», «Full Date», «Pinpoint»` — date not parenthesised.
**Engine:** no formatter produces this shape; `formatUnCommunication` italicises the title, inserts `UN Doc`, and parenthesises the date. GAP. Severity: Medium.
**Status:** FIXED (src/engine/rules/v4/international/un.ts — new formatUnSubmission; exact ex 41 test); FIXED (engine wiring wave 2 — dispatchUnCommunication routes documentType Submission/Communication + caseName → formatUnSubmission; exact ex 41 dispatch test)


### M6. Rules 10.4.1–10.4.2 (PDF pp.192–193) — unreported ICJ materials unsupported
**Requirement:** `«Case» («Parties») («Phase») (International Court of Justice, General List No «N», «Date») «Pinpoint»` (and the pleading variant).
**Engine:** no formatter/type; `formatIcjDecision` cannot omit the `[year] series` block (year is required, `icj.ts:75`). Coverage doc honestly says Partial. **Fix:** add an unreported branch (skip year/series, emit the parenthetical) keyed off a `generalListNumber` field. Severity: Medium.
**Status:** FIXED (src/engine/rules/v4/international/icj.ts — new formatIcjUnreported covering 10.4.1 and the 10.4.2 pleading variant; exact ex 30/32/34 tests); FIXED (engine wiring wave 2 — dispatchIcjDecision/dispatchIcjPleading branch to formatIcjUnreported when generalListNumber is present; dispatch test)


### M7. Rule 11.2.1 (PDF p.197) — reported individual–state decisions have no dispatch path
**Requirement:** `«Parties» («Phase») («Year») «Volume» «Report Series» «Page», «Pinpoint»` (eg 6 ICSID Rep 154; 40 ILM 1408).
**Engine:** `dispatchArbitralIndividualState` (`engine.ts:1703-1712`) never checks `reportSeries` and always uses `formatIcsidCase` (see H2). `formatStateArbitrationReported` would produce the right shape (parties passed as `caseName`) but is only reachable via `arbitral.state_state`.
**Fix:** mirror `dispatchArbitralStateState`'s reported/unreported branching. Severity: Medium.
**Status:** FIXED (engine wiring wave 2 — dispatchArbitralIndividualState reported branch calls formatStateArbitrationReported with the parties as caseName; Olguín dispatch test)


### M8. Rule 12.3 (PDF p.207) — reports of criminal tribunal cases unsupported
**Requirement:** `«Parties» («Phase») («Year») «Vol» «Series» «Page», «Pinpoint» («Tribunal», «Chamber»)` — eg (1997) 110 ILR 608, 693 [15] (ICTY, Appeals Chamber).
**Engine:** `formatIccCase` (`icc-tribunals.ts:43-72`) supports only the unreported 12.2 form; no report-series variant. Coverage doc admits Partial. **Fix:** add a reported branch (reuse `formatStateArbitrationReported`-style body plus trailing tribunal/chamber parenthetical). Severity: Medium.
**Status:** FIXED (src/engine/rules/v4/international/icc-tribunals.ts — new formatIccCaseReported with trailing tribunal/chamber parenthetical; exact ex 23/24 tests); FIXED (engine wiring wave 2 — dispatchIccTribunalCase branches on reportSeries → formatIccCaseReported (tribunal ← d.court); judge passed on both paths)


### M9. Rule 13.1.2 (PDF p.210) — WTO documents: no document description, no pinpoint
**Requirement:** `«Title», WTO Doc «No» («Date») («Document Description») «Pinpoint»` — eg `… (22 December 2005, adopted 18 December 2005) (Ministerial Declaration) para 50(1)`.
**Engine:** `formatWtoDocument` (`economic.ts:30-44`) has only title/number/date — the description and pinpoint elements cannot be rendered at all (dispatcher `engine.ts:1735-1742` passes nothing else). Audit CH13-002 'PASS' and coverage 'Full' are overclaims.
**Fix:** add optional `documentDescription` and `pinpoint` (space-separated, no comma). Severity: Medium.
**Status:** FIXED (src/engine/rules/v4/international/economic.ts — optional documentDescription and pinpoint on formatWtoDocument; exact ex 5/6 tests); FIXED (engine wiring wave 2 — dispatchWtoDocument passes documentDescription/pinpoint; dispatchWtoDecision passes dsrReference)


### M10. Rule 13.2.1 (PDF p.213) — GATT documents: no BISD reference, description or pinpoint
**Requirement:** `«Title», GATT Doc «No» («Date») («Description») «Pinpoint»`, with optional `GATT BISD «Vol»/«Page»` after the date and a comma before the pinpoint when BISD is cited; also the no-doc-number form (no comma after title).
**Engine:** `formatGattDocument` (`economic.ts:116-130`) supports only title/number/date; BISD exists only in `formatGattPanelReport`. Coverage note "Doc number, BISD volume" is wrong for this type. **Fix:** extend `formatGattDocument` with `documentDescription`, `bisdReference`, `pinpoint` using the same comma logic already correct in `formatGattPanelReport` (`economic.ts:176-188`). Severity: Medium.
**Status:** FIXED (src/engine/rules/v4/international/economic.ts — formatGattDocument gains optional documentNumber/description/bisdReference/pinpoint with the rule-text comma-before-pinpoint when BISD cited; exact ex 14/16 tests); FIXED (engine wiring wave 2 — dispatchGattDocument passes documentNumber/description/bisdReference/pinpoint and routes 'panel report' descriptions → formatGattPanelReport)


### M11. Rule 14.2.1 (PDF p.219) — OJ citations: extraneous roman 'instrument type' element; no pinpoint
**Requirement:** `«Document Title» [«Year»] OJ «Series» «Issue»/«Page», «Pinpoint»` — the instrument designation ('Regulation (EEC) No 2005/70 of the Commission …') is *part of the italic title*; there is no separate leading element. Pinpoints are comma-preceded.
**Engine:** `formatEuOfficialJournal` (`supranational.ts:33-52`) emits `«instrumentType», ` in roman before the italic title, and has no pinpoint parameter. The test (`chapter8-14.test.ts:751-764`) passes the *same string* as both `instrumentType` and `title` — producing the title twice — and only asserts the tail, masking the defect. No support for OJ Spec Ed parallel citations or the 'C … E/' electronic form (low).
**Fix:** drop `instrumentType` (or fold into the italic title), add comma-preceded pinpoint; tighten the test to assert full output. Severity: Medium.
**Status:** FIXED (src/engine/rules/v4/international/supranational.ts — instrumentType deprecated/ignored, comma-preceded pinpoint added; test rewritten to exact ex 6 plus ex 11); FIXED (engine wiring wave 2 — dispatchEuOfficialJournal drops instrumentType and passes pinpoint)


### M12. Rule 14.2.3 (PDF p.224) — unreported EU court decisions / ECLI unsupported
**Requirement:** `«Parties» («Court», «Case Number», ECLI…, «Full Date») «Pinpoint»` for decisions not in ECR/ECR-SC (since 2012 all reports are digital; recent CJEU cases will typically need this form).
**Engine:** `formatCjeuCase` (`supranational.ts:122-147`) supports only the reported `(«No») [«Year»] «Series» «Page»` form; `dispatchEuCourt` (`engine.ts:1787-1797`) defaults `reportSeries` to 'ECR' even when no report exists. The `parseECLI` helper in `data/eu-case-prefixes.ts:239-253` exists but nothing consumes it. Also the optional trailing `(«court»)` parenthetical (`supranational.ts:142-144`) corresponds to no element of rule 14.2.3.
**Fix:** add an unreported branch (court, case number, ECLI, date parenthetical); remove or repurpose the trailing court element. Severity: Medium.
**Status:** FIXED (src/engine/rules/v4/international/supranational.ts — new formatCjeuUnreportedCase with ECLI slot; trailing court parenthetical removed from formatCjeuCase; exact ex 23 test); FIXED (engine wiring wave 2 — dispatchEuCourt routes report-less citations → formatCjeuUnreportedCase with ECLI; deprecated court param no longer passed on the reported path; Huawei ex 23 dispatch test)


### M13. Rule 14.3.3 (PDF p.229) — European Commission of Human Rights: round-bracket year impossible
**Requirement:** `«Parties» («Year») «Volume» Eur Comm HR «Page», «Pinpoint»` — round brackets (ex 35: *X v Austria* (1979) 17 Eur Comm HR 80, 85–6).
**Engine:** the only plausible path is `formatEchrReportedCase`, whose bracket choice is `reportSeries.includes("(ser A)") ? round : square` (`supranational.ts:197-202`) — 'Eur Comm HR' gets square brackets `[1979]`. And per H3 that formatter isn't dispatched anyway. Coverage doc admits Partial.
**Fix:** decide brackets by series organisation (volume-organised → round), or add an explicit `yearBrackets` field. Severity: Medium.
**Status:** FIXED (src/engine/rules/v4/international/supranational.ts — brackets decided by series organisation (ser A / Eur Comm HR round, else square) plus explicit yearBrackets override; exact ex 35 test)


### M14. Rule 14.5 (PDF p.233) — supranational body documents: parenthesised date, no session, no pinpoint
**Requirement:** `«Organisation», «Body», «Title», «Doc No», «parl/sess/mtg», «Full Date», «Pinpoint»` — all comma-separated; the date is **not** parenthesised (ex 44: `…, Doc No Assembly/AU/Dec.578(XXV), 25th ord sess, 14–15 June 2015`).
**Engine:** `formatSupranationalDocument` (`supranational.ts:329-347`) emits `, «documentNumber» («date»)` — parenthesised date, no session element, no pinpoint; 'Doc No' prefix left to the caller; dispatcher (`engine.ts:1855-1864`) adds nothing. Audit CH14-008 'PASS' and coverage 'Full' are overclaims.
**Fix:** comma-separate the date, add optional `session` and `pinpoint` fields. Severity: Medium.
**Status:** FIXED (src/engine/rules/v4/international/supranational.ts — comma-separated date, 'Doc No' label, optional session/pinpoint, optional title; exact ex 44/49 tests); FIXED (engine wiring wave 2 — dispatchSupranationalDocument passes session/pinpoint and drops empty titles)


---

## Detail blocks — ANOMALY-RISK

### A1. Rules 9.2.6 vs 9.2.7 (PDF p.171) — session numbers on SC resolutions (guide self-contradiction)
The guide's rule 9.2.6 forbids session numbers for SC resolutions, but its own 9.2.7 example 15 prints `SC Res 1546, UN SCOR, 59th sess, 4987th mtg, …`. **Engine behaviour:** `formatUnDocument` takes `session` as an opaque optional string and enforces nothing; the tests cite SC resolutions with no session (`chapter8-14.test.ts:185-197`), so the engine-as-tested encodes the **rule-text (9.2.6) behaviour**, not the anomalous example — the right call. Risk: nothing stops a user adding a session to an SC resolution; a validator warning (documentNumber starts `S/RES/` + session present) would close it. Already the right side of the anomaly; log in decisions.md per project policy. Severity: Low.
**Status:** FIXED (src/engine/rules/v4/international/un.ts — formatUnDocument now suppresses the session where the document number begins 'S/RES/', implementing the rule-9.2.6 text per DECISION-012; rule-conformant ex 15 test added)


### A2. Rule 9.2.10 (PDF p.173) — 'UN Docs' plural unsupported
The rule requires `UN Docs A/63/804 and Corr.1` for multiple numbers (its own example 23 anomalously prints singular 'UN Doc'). The engine hard-codes `UN Doc ` (`un.ts:135`), so it can only reproduce the anomalous example, never the rule form. The WTO test (`chapter8-14.test.ts:589-600`) shows the same pattern with 'WTO Doc WT/DS517/1 and G/L/1171' (rule 13.1.2 has no plural requirement, so that one is fine). Fix: pluralise to 'UN Docs' when the number contains ` and `. Severity: Low.
**Status:** FIXED (src/engine/rules/v4/international/un.ts — 'UN Docs' where the document number joins multiple numbers with 'and'; rule-text ex 23 test added)


### A3. `data/eu-case-prefixes.ts:53-58` — fabricated 'P-' case prefix; duplicate 'C-' entries
AGLC4 rule 14.2.3 (and CURIA practice) recognises prefixes 'C-', 'T-', 'F-' only; appeals are marked by a ' P' *suffix* (eg C-402/05 P), not a 'P-' prefix. The data file lists `prefix: "P-"` as an active CJEU prefix — factually wrong and could mislead any future validator/parser built on it. It also contains two entries with `prefix: "C-"`, so `getEUCasePrefixByPrefix("C-")` silently returns only the first. Fix: delete the 'P-' entry, merge the duplicate 'C-' rows. Severity: Low (data currently unused by formatters).
**Status:** FIXED (wave 1 datasets agent — EU_CASE_PREFIXES is exactly C-/T-/F-; fabricated 'P-' and the duplicate 'C-' row removed per handoff/datasets.md §8)


---

## Detail blocks — remaining GAPs (low unless noted)

_Wave-1 note: bullets without a **Status** annotation (8.4 series-form modelling, 9.2.14 multi-organ parallel citations, 10.3 PCIJ ser C pleadings, 12.1.2 tribunal rules, 14.4.3/14.4.4 supranational rules-of-procedure/pleadings) were not addressed in the PARITY wave-1 formatter pass — all Low severity, none in the wave's priority list; they remain open._

- **8.4 (PDF p.162):** year-organised (`[1994] ATS 27`) and sequential (`CETS No 207`) series only achievable by embedding brackets/'No' in the `treatySeries` string (the NAFTA test does exactly this, `chapter8-14.test.ts:131-146`); `seriesVolume:number` cannot model them natively. The rule's abbreviation table (ATS/ATNIF/CETS/ETS/ConTS/PITS/UTS/CTS) is not encoded as data.
- **9.1 (PDF p.167):** `formatUnCharter` (`un.ts:30-32`) is correct and tested but has **no dispatcher type** (`engine.ts` maps no `un.charter`), so it is unreachable from the engine; it also hard-codes `art` so a Charter cite without a pinpoint or to a chapter is impossible. **Status:** FIXED in part (un.ts — article now optional so a pinpoint-less Charter cite is possible); FIXED (engine wiring wave 2 — dispatchUnDocument routes isCharter/'Charter of the United Nations' titles → formatUnCharter; a dedicated un.charter SourceType needs a UI label map entry and is deferred to wave 3 — see engine-leftovers.md).
- **9.2.5:** no committee-number element in `formatUnDocument`; only workaround is smuggling '4th Comm' into `officialRecords`. **Status:** FIXED (un.ts — committeeNumber element added between Official Records and session; rule-conformant ex 12 test).
- **9.2.8:** 'Agenda Items X and Y' (plural) cannot be produced — `Agenda Item ` is hard-coded (`un.ts:126`). **Status:** FIXED (un.ts — 'Agenda Items' plural where the value lists several; ex 12 test).
- **9.2.12:** annex designator is hard-coded `annex ${n}` (`un.ts:141-143`): a bare 'annex' pinpoint, '2nd annex', or the first-reference `annex ('«Title»')` form are unrepresentable. **Status:** FIXED (un.ts — annex values already containing 'annex' (eg 'annex I', '2nd annex', bare 'annex', "annex ('…')") pass through verbatim; bare numbers still get the 'annex' prefix).
- **9.2.14:** parallel Official Records + dual document numbers (semicolon form) unsupported.
- **10.2 dispatch:** `dispatchIcjDecision` defaults `reportSeries` to `"ICJ Reports"` (`engine.ts:1642`) — AGLC abbreviation is `ICJ Rep`; wrong output whenever the caller omits the series. One-line fix. (Counted as the low MISMATCH in the table.) **Status:** FIXED (engine wiring wave 2 — default reportSeries is now 'ICJ Rep').
- **10.3:** PCIJ ser C pleadings (`[1928] PCIJ (ser C) No 14 pt II, 20, 25–7`) unsupported — `ICJ Pleadings` is hard-coded (`icj.ts:157`).
- **12.1.2:** tribunal rules (`ICC, *Rules of Procedure and Evidence*, Doc No ICC-ASP/1/3 (adopted 9 September 2002) r 74`) have no formatter.
- **12.2.5:** `Case No ` hard-coded (`icc-tribunals.ts:63`); multiple case numbers need 'Case Nos'. **Status:** FIXED (icc-tribunals.ts — 'Case Nos' where numbers are joined with 'and'; exact ex 18 test).
- **12.2.8:** no judge parameter in `formatIccCase`; judges can only be appended inside the pinpoint string. **Status:** FIXED (icc-tribunals.ts — optional judge parameter after pinpoints; exact ex 22 test).
- **13.1.3:** DSR parallel reference (`DSR 1998:IX, 3797, [4.49]` with comma-before-pinpoint switch) unsupported; 'unadopted'/adoption dates work via the free-text date field. **Status:** FIXED (economic.ts — optional dsrReference on formatWtoDecision with the comma-before-pinpoint switch; exact ex 13 test).
- **14.4.3 / 14.4.4:** no formatter for rules of procedure of non-EU supranational courts or for pleadings before them (14.4.1's decision formatter plus dispatcher pinpoint covers decisions and advisory opinions adequately — phase can ride inside the italic case name).

## Notes on prior audit claims (spot-checks)

- `docs/aglc4-audit.md` CH9-002 (9.2 PASS), CH13-002 (13.1.2 PASS), CH13-004 (13.2.1 PASS), CH14-002 (14.2.1 PASS), CH14-008 (14.5 PASS) are **contradicted** by findings H1/M3, M9, M10, M11, M14 respectively.
- `docs/aglc4-audit.md` CH14-006 (14.3.2 FIX) — confirmed still broken (H3).
- `docs/aglc4-coverage.md` overclaims: 9.2/9.3 "Full" (H1, M3–M5), 8.3.2 "Full" (M1), 8.6 "Full" (M2), 13.2 "Full … BISD volume" (M10 — BISD only on panel reports), 11.2 "Full" (H2, M7), 14.3.2 "Full" (H3). Its "Manual"/"Partial" rows (9.1 charter-as-treaty note is itself wrong advice — the Charter has a fixed 9.1 form, not a treaty form — but the manual disposition is harmless; 10.4, 12.3, 14.3.3) are broadly honest.
- Coverage doc numbers EU rules as 14.1.1–14.1.3; they are 14.2.1–14.2.3 in AGLC4 (doc hygiene).
