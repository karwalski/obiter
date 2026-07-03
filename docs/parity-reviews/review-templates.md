# Parity Review — Obiter citation format templates vs AGLC4 derived reference

Date: 2026-07-02
Compared: every `sourceTypes` entry in `/Users/matthew.watt/aglc/obiter/docs/aglc4-rules.json` (ruleNumber, requiredFields, optionalFields, formatTemplate) against the **Template**/**Details** of the corresponding rule in `/Users/matthew.watt/aglc/aglc4-rule-reference.md`, plus the actual rendering path in `src/engine/engine.ts` and the rule modules under `src/engine/rules/v4/`.

## Provenance: generated or hand-maintained?

`docs/aglc4-rules.json` is **generated output** — `scripts/export-rules.ts` serialises `exportRuleReference()` from `src/engine/ruleExporter.ts`. However, the `sourceTypes` array inside it comes verbatim from the **hand-maintained** `SOURCE_TYPE_METADATA` constant (ruleExporter.ts:74–872). The `formatTemplate` strings are **not used by the renderer** at all: actual formatting is done by per-type dispatch functions in `engine.ts` (`formatCitation` → `SOURCE_DISPATCH`, engine.ts:1945ff) building `FormattedRun[]` via the rule modules. So the JSON's templates are documentation that can (and frequently does) drift from both the reference and the engine's own output. Note there is no `src/engine/formatter.ts`; rendering lives in `engine.ts` + `rules/v4/*`. The same `exportRuleReference()` object is also exposed as `sourceTypeSchema` in `src/actions/actionCatalogue.ts:93`, so wrong required/optional field lists directly mis-describe the citation-request contract offered to Copilot/AI integrations — they are not doc-only.

**Status:** FIXED (PARITY-118 — drift is now guarded: tests/engine/rule-exporter.test.ts statically parses SOURCE_DISPATCH from engine.ts and asserts (a) metadata keys == dispatch keys both ways, (b) every declared required/optional field is read by the type's dispatch function, and (c) the checked-in docs/aglc4-rules.json matches the current export, forcing `npm run export-rules` after metadata edits.)

## Coverage gaps (types missing from the export entirely)

Four SourceType values (src/types/citation.ts:129ff) are dispatchable but absent from `SOURCE_TYPE_METADATA` / the JSON:
- `book.ebook` (Rule 6.8) — dispatch engine.ts:1975
- `report.waitangi_tribunal` (NZLSG, non-AGLC4) — dispatch engine.ts:1983
- `treaty.mou` (Rule 8.6) — dispatch engine.ts:2045
- `periodical` (Rule 7.11.3) — declared in the type union and bibliography categoriser (rules/v4/general/bibliography.ts:112) but has **no dispatch entry and no metadata** (falls to the generic formatter)

**Status:** FIXED (ruleExporter.ts — all four exported in PARITY-118, with honest rule labels: book.ebook and report.waitangi_tribunal marked non-AGLC4, treaty.mou 8.6, periodical 7.11.3. periodical gained a dispatch entry in wave 2 (dispatchPeriodical). `custom` and `explanatory_note` are also exported now (category `special`) so the dispatch↔metadata sets match exactly — 84 entries. Enforced by tests/engine/rule-exporter.test.ts.)

## Verdict counts (78 sourceTypes)

| Verdict | Count |
|---|---|
| MATCH | 10 |
| MISMATCH | 41 |
| GAP | 27 |
| UNVERIFIED | 0 |

Severity across the 68 MISMATCH/GAP rows: 43 high, 25 medium.

**Resolution (PARITY-118, 2026-07-02):** the renderer-side halves of these findings were fixed in waves 1–2 (statuses in review-ch*.md); this wave rebuilt SOURCE_TYPE_METADATA from the fixed dispatch layer, so all 68 MISMATCH/GAP rows are FIXED on the metadata axis. Renderer/wiring gaps that survive waves 1–3 are flagged honestly in the per-row Status lines below (book.chapter edition; law_reform/abs/conference/thesis/speech/internet_material pinpoints; un.document committeeNumber; un.communication short-title tail; supranational.decision phase; eu.court reported-form pinpoint; icc default court name; icj.pleading PCIJ ser C).

## Systemic findings (affect many rows at once)

1. **Pinpoints declared but never rendered.** `pinpoint` appears in optionalFields of most entries, but roughly two dozen formatters have no pinpoint parameter or drop it in dispatch (chapter 7 secondary types, wto/gatt/eu/echr/arbitral.individual_state, un.communication comma bug, etc.). Users supplying a pinpoint per the published schema silently lose it.
2. **Metadata field names ≠ dispatcher field names.** Repeatedly the JSON advertises fields the engine never reads (`paperType`/`paperNumber` vs `d.documentType`/`d.number`; `serviceNumber`, `registrationNumber` vs `d.number`; `provider` vs `platform`; `year` vs `d.date`; `content` vs `title`). Data shaped per the export does not render.
3. **"Year" where AGLC4 requires a Full Date.** Chapters 7, 13 and 14 templates use `(Year)` where the reference prescribes a full date parenthetical.
4. **Dead compliant formatters.** Correct implementations exist but are unreachable from dispatch: all 12 jurisdiction modules in `rules/v4/foreign/` (dispatch uses the generic heuristic `dispatchForeign`, engine.ts:1889), `formatEchrReportedCase`, `formatGattPanelReport`.
5. **Italic 'v' (rule 2.1.11).** `formatCaseName` (rules/v4/domestic/case-names.ts:190) hard-codes the " v " separator roman; case.reported/transcript/submission output a roman 'v' inside an otherwise italic case name.
6. **`«Legislature»` element dropped engine-wide** in the 7.1.2 / 7.2.3 / 7.5.2 / 7.5.3 family.
7. **formatTemplate strings carry no italics markup** — acceptable as plain-text documentation, but combined with (1)–(3) the exported JSON cannot be relied on by third-party tool authors, which is its stated purpose (RESEARCH-005).

**Systemic statuses (PARITY-118):**
1. FIXED for the great majority (pinpoints wired through dispatch in waves 1–2; metadata now lists `pinpoint` only where dispatch consumes it). Types whose dispatch still passes no pinpoint have it REMOVED from the schema instead: report.law_reform, report.abs, conference_paper, thesis, speech, internet_material, correspondence, hansard (page is the pinpoint).
2. FIXED — every field name in the rebuilt metadata is a key the dispatch function reads; enforced statically by tests/engine/rule-exporter.test.ts (required+optional ⊆ fields read per dispatch function).
3. FIXED — templates now say FullDate wherever dispatch reads `date` and the reference prescribes a full date.
4. FIXED in waves 1–2 (foreign modules wired via dispatchForeignCase/dispatchForeignLegislation, PARITY-114; formatEchrReportedCase and formatGattPanelReport routed). Note china/france/germany dispatch still uses the simple case shape (no pinpoint, legacy formatCase for france/germany court decisions) — see handoff/foreign.md §1.
5. FIXED wave 1 (case-names.ts separator italic).
6. FIXED for 7.1.2/7.2.3/7.5.3 (legislature/parliament fields wired and now in the schema); 7.5.2 legislature remains unmodelled (enter within committee) — noted on the row.
7. FIXED in substance: templates are faithful plain-text documentation of the rendered output (variants separated by ` | `); italics remain unencoded by design.

## Summary table

| sourceType | ruleNumber | Verdict | Severity |
|---|---|---|---|
| case.reported | 2.2 | MISMATCH | medium |
| case.unreported.mnc | 2.3.1 | MATCH | low |
| case.unreported.no_mnc | 2.3.2 | MISMATCH | high |
| case.proceeding | 2.3.3 | MISMATCH | high |
| case.court_order | 2.3.4 | MISMATCH | high |
| case.quasi_judicial | 2.6 | MISMATCH | high |
| case.arbitration | 2.6.2 | GAP | high |
| case.transcript | 2.7 | GAP | high |
| case.submission | 2.8 | MISMATCH | high |
| legislation.statute | 3.1 | MATCH | none |
| legislation.bill | 3.2 | MISMATCH | high |
| legislation.delegated | 3.4 | MATCH | medium (rendering notes) |
| legislation.constitution | 3.6 | GAP | medium |
| legislation.explanatory | 3.7 | MISMATCH | high |
| legislation.quasi | 3.9 | MISMATCH | high |
| journal.article | 5 | MISMATCH | high |
| journal.online | 5.10 | MISMATCH | high |
| journal.forthcoming | 5.11 | MISMATCH | high |
| book | 6 | MISMATCH | medium |
| book.chapter | 6.6.1 | MISMATCH | medium |
| book.translated | 6.7 | MISMATCH | high |
| book.audiobook | 6.9 | MISMATCH | high |
| report | 7.1 | MISMATCH | high |
| report.parliamentary | 7.1.2 | MISMATCH | high |
| report.royal_commission | 7.1.3 | MISMATCH | high |
| report.law_reform | 7.1.4 | MATCH | low |
| report.abs | 7.1.5 | MATCH | low |
| research_paper | 7.2 | MISMATCH | high |
| research_paper.parliamentary | 7.2.3 | MISMATCH | high |
| conference_paper | 7.2.4 | MATCH | low |
| thesis | 7.2.5 | MISMATCH | high |
| speech | 7.3 | MATCH | low |
| press_release | 7.4 | MISMATCH | high |
| hansard | 7.5.1 | MISMATCH | medium |
| submission.government | 7.5.2 | MISMATCH | high |
| evidence.parliamentary | 7.5.3 | GAP | high |
| constitutional_convention | 7.5.4 | GAP | high |
| dictionary | 7.6 | MISMATCH | medium |
| legal_encyclopedia | 7.7 | MISMATCH | high |
| looseleaf | 7.8 | MISMATCH | high |
| ip_material | 7.9 | MISMATCH | high |
| constitutive_document | 7.10 | MISMATCH | high |
| newspaper | 7.11 | GAP | medium |
| correspondence | 7.12 | MATCH | low |
| interview | 7.13 | MISMATCH | medium |
| film_tv_media | 7.14 | MISMATCH | high |
| internet_material | 7.15 | MISMATCH | high |
| social_media | 7.16 | GAP | medium |
| genai_output | 7.12 (claimed) | MISMATCH | medium |
| treaty | 8 | MATCH | low |
| un.document | 9.2 | GAP | high |
| un.communication | 9.3 | MISMATCH | high |
| un.yearbook | 9.4 | GAP | high |
| icj.decision | 10.2 | GAP | high |
| icj.pleading | 10.3 | MISMATCH | high |
| arbitral.state_state | 11.1 | MATCH | low |
| arbitral.individual_state | 11.2 | MISMATCH | high |
| icc_tribunal.case | 12.2 | MISMATCH | medium |
| wto.document | 13.1.2 | GAP | high |
| wto.decision | 13.1.3 | MISMATCH | high |
| gatt.document | 13.2 | GAP | high |
| eu.official_journal | 14.2.1 | MISMATCH | high |
| eu.court | 14.2.3 | GAP | high |
| echr.decision | 14.3.2 | GAP | medium |
| supranational.decision | 14.4 | GAP | medium |
| supranational.document | 14.5 | MISMATCH | high |
| foreign.canada | 15 | GAP | medium |
| foreign.china | 16 | GAP | medium |
| foreign.france | 17 | GAP | medium |
| foreign.germany | 18 | GAP | medium |
| foreign.hong_kong | 19 | GAP | medium |
| foreign.malaysia | 20 | GAP | medium |
| foreign.new_zealand | 21 | GAP | medium |
| foreign.singapore | 22 | GAP | medium |
| foreign.south_africa | 23 | GAP | medium |
| foreign.uk | 24 | GAP | medium |
| foreign.usa | 25 | GAP | medium |
| foreign.other | 26 | GAP | medium |

Verification basis: every verdict was checked against the reference document's Template/Details section (PDF page cited in each detail block below); MATCH verdicts still list residual low-severity notes. No row was left UNVERIFIED — the reference contained usable prescriptions for all 78 types (for genai_output the verified fact is that the reference contains no GenAI rule; the entry's claimed rule 7.12 is Written Correspondence, and Obiter's own module documents it as MULR interim guidance).

---

# Detail blocks
## Domestic Cases (Rules 2.2–2.8)

### case.reported | 2.2 | VERDICT: MISMATCH | SEVERITY: medium
- Reference rule + PDF page: 2.2 Reported Decisions, PDF pp.74–79 (2.2.1 p.74; 2.2.5 pp.77–8; 2.2.6 p.78; 2.2.7 p.79)
- Reference template: composed — 2.2.1 `(«Year») «Volume»` / `[«Year»]` / `[«Year»] «Volume»`; series not italicised (2.2.3); starting page (2.2.4); pinpoints "preceded by a comma and a space" (2.2.5); court parenthetical optional after pinpoints (2.2.6); 2.2.7: "Never give parallel citations for Australian cases."
- Engine formatTemplate: "Party1 v Party2 (Year) Volume ReportSeries StartingPage, Pinpoint."
- Actual rendering: engine.ts:359 (dispatchReportedCase) → cases.ts:383 (formatReportedCase)
- Discrepancies: (1) `parallelCitations` optional field rendered with "; " separators — the exact form rule 2.2.7 prohibits for Australian cases; court-mode also auto-appends "; MNC" (engine.ts:380–397). (2) formatCaseName (case-names.ts:188–192) emits " v " with `italic: false`; rule 2.1.11 requires 'v' italicised. (3) Paragraph pinpoints in default style render as `StartingPage [23]` (cases.ts:172–173, space only) vs 2.2.5 comma+space. Otherwise element order, bracket types, required/optional split consistent.
- Proposed fix: drop `parallelCitations` (or annotate court-mode-only, non-AGLC); italicise the " v " separator run; emit `, ` before paragraph pinpoints.
- **Status:** FIXED (ruleExporter.ts — PARITY-118: metadata rebuilt; parallelCitations/mnc documented as court-writing-mode-only per rule 2.2.7; judicialOfficers/caseHistory added. Italic 'v' and pinpoint fixes were wave 1 (see review-ch2.md); JSON regenerated; consistency test added).

### case.unreported.mnc | 2.3.1 | VERDICT: MATCH | SEVERITY: low
- Reference rule + PDF page: 2.3.1, PDF pp.79–81
- Reference template (verbatim): `«Case Name» [«Year»] «Unique Court Identifier» «Judgment Number», [«Pinpoint»]`
- Engine formatTemplate: "Party1 v Party2 [Year] Court CaseNumber, Pinpoint."
- Actual rendering: engine.ts:579 → cases-unreported.ts:27 (formatUnreportedMnc) — all correct incl. italic 'v', square-bracket year, comma before pinpoint, optional ` (Judicial Officer)`.
- Discrepancies: none vs template. Minor: renderer supports `judicialOfficer` (example "(Nettle J)") but metadata omits it from optionalFields.
- Proposed fix: add `judicialOfficer` to optionalFields.
- **Status:** FIXED (ruleExporter.ts — judicialOfficer added to optionalFields; template shows the '(Judicial Officer)' tail; JSON regenerated).

### case.unreported.no_mnc | 2.3.2 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 2.3.2, PDF pp.81–2
- Reference template (verbatim): `«Case Name» («Court», «Judge(s)», «Full Date») «Pinpoint»`
- Engine formatTemplate: "Party1 v Party2 (Court, Judge, FullDate) Pinpoint."
- Actual rendering: engine.ts:603 → cases-unreported.ts:75 (formatUnreportedNoMnc) — ` (Court, [ProceedingNumber,] FullDate)`, no judge, no pinpoint
- Discrepancies: metadata template matches the reference but the renderer contradicts both: (1) substitutes proceeding number for Judge(s) (JSDoc at cases-unreported.ts:66 mis-states the rule); (2) dispatch never passes judgeName — reference example "(Supreme Court of the Northern Territory, Kriewaldt J, 5 April 1956) 77–8" unproducible; (3) no pinpoint parameter though metadata lists it and reference template ends with one. judgeName optional in metadata vs unqualified Judge(s) element in reference.
- Proposed fix: replace proceedingNumber with judgeName in the parenthetical; emit pinpoint after parenthesis (space, no comma); consider judgeName required.
- **Status:** FIXED (ruleExporter.ts — judges now required, fullDate/pinpoint aligned to the wave-1 renderer; proceedingNumber removed (deprecated in the renderer); JSON regenerated).

### case.proceeding | 2.3.3 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 2.3.3, PDF p.82
- Reference template (verbatim): `«Case Name» («Court», «Proceeding Number», commenced «Full Date»)`
- Engine formatTemplate: "Party1 v Party2 (Court, ProceedingNumber, initiated FullDate)."
- Actual rendering: engine.ts:622 → cases-unreported.ts:112 (formatProceeding) — uses "commenced" (correct)
- Discrepancies: metadata only: (1) "initiated" vs reference/renderer "commenced" — metadata string would produce a wrong citation; (2) requiredFields include `year` but reference has no year element; the commenced date (dispatch reads `commencedDate`/`date`) is in neither field list despite being required.
- Proposed fix: metadata template → "…commenced FullDate"; replace `year` with `commencedDate` in requiredFields.
- **Status:** FIXED (ruleExporter.ts — template now reads 'commenced CommencedDate'; year replaced with commencedDate in requiredFields; JSON regenerated).

### case.court_order | 2.3.4 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 2.3.4, PDF pp.82–3
- Reference template (verbatim): `Order of «Judicial Officer(s)» in «Case Name» («Court», «Proceeding Number», «Full Date of Court Order»)`
- Engine formatTemplate: "Party1 v Party2 (Court, Judge, OrderDate) (OrderType)."
- Actual rendering: engine.ts:641 → cases-unreported.ts:141 (formatCourtOrder) — ` (Court, OrderDate)` only
- Discrepancies: both wrong. Metadata: missing leading roman `Order of «Judicial Officer(s)» in`; `(OrderType)` has no basis in reference; `proceedingNumber` absent from field lists (should be optional); judge optional but reference requires naming every issuing officer. Rendering omits judge and proceeding number — reference example "Order of Burley J in *Seiko Epson Corporation v Calidad Pty Ltd* (Federal Court of Australia, NSD1519/2004, 21 December 2016)" unproducible.
- Proposed fix: re-template `Order of Judge in Party1 v Party2 (Court, ProceedingNumber, OrderDate).`; judge required, proceedingNumber optional, drop orderType; update formatCourtOrder accordingly.
- **Status:** FIXED (ruleExporter.ts — 'Order of JudicialOfficers in …' template; judicialOfficers required, proceedingNumber optional, orderType dropped (renderer fixed waves 1–2); JSON regenerated).

### case.quasi_judicial | 2.6 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 2.6/2.6.1 Administrative Decisions, PDF p.88
- Reference template: none — 2.6.1: same base form as reported/unreported cases, except party separator often 'and' (render as in the decision), title may be a number/code, member titles precede names. Examples show reported form `(1991) 22 ATR 3450, 3456 [28]` and MNC form `[2009] ACompT 6, [6.1]–[6.5]`.
- Engine formatTemplate: "Title (Year) Tribunal DecisionNumber, Pinpoint."
- Actual rendering: engine.ts:659 → cases-supplementary.ts:186 (formatAdministrativeDecision) — forced italic `Re Party and Department (Year) Volume Series Page`
- Discrepancies: (1) metadata template mixes the two forms: `(Year)` round brackets belong with Volume/Series/Page, `Tribunal DecisionNumber` MNC-style needs `[Year]`; as written it matches neither. (2) metadata fields don't correspond to what the renderer consumes (party, department, volume, reportSeries, startingPage). (3) renderer force-prepends italic "Re " — not prescribed; reference says render title as it appears. (4) no pinpoint or MNC-form support — example 111 unproducible.
- Proposed fix: split into reported-form (`Title (Year) Volume Series Page, Pinpoint`) and MNC-form (`Title [Year] Tribunal Number, Pinpoint`); data-driven "Re "/'and'; align field names; add pinpoint.
- **Status:** FIXED (ruleExporter.ts — fields renamed to what dispatch reads (party/department/volume/reportSeries/startingPage/pinpoint/separator); reported-form template; rule number corrected to 2.6.1. MNC-form administrative decisions remain unmodelled in the renderer — enter as case.unreported.mnc).

### case.arbitration | 2.6.2 | VERDICT: GAP | SEVERITY: high
- Reference rule + PDF page: 2.6.2 Arbitration, PDF p.89
- Reference template (verbatim): `«Case Name» («Award Description», «Forum», «Case/Award No #», «Full Date») «Pinpoint»`
- Engine formatTemplate: "Title (Arbitrator, AwardDate) Pinpoint."
- Actual rendering: engine.ts:675 → cases-supplementary.ts:240 (formatArbitration) — italic `parties` + ` (arbitrationType) awardDetails` (details outside the parenthetical)
- Discrepancies: (1) GAP: Award Description, Forum, Case/Award No absent from metadata (arbitrator substitutes for forum only if no forum). (2) `year` required but reference has no year element (Full Date inside parenthetical). (3) rendering closes the parenthesis after arbitrationType and dumps awardDetails after — example `(Award, Sir Edward Somers, Sir Michael Kerr and Sir Daryl Dawson, 9 October 1998) [10.2]` unproducible. (4) renderer fields (parties, arbitrationType, awardDetails) don't match metadata fields; pinpoint never emitted.
- Proposed fix: metadata required title + awardDescription + fullDate; optional forum, arbitrator, caseNumber, pinpoint; drop year. Renderer: single parenthetical `(AwardDescription, Forum-or-Arbitrator, Case/Award No, FullDate)` + space + pinpoint.
- **Status:** FIXED (ruleExporter.ts — awardDescription/forum/caseNumber/date per the wave-1 2.6.2 renderer; year dropped; no-parties variant shown; legacy arbitrationType/awardDetails accepted by dispatch but kept out of the public contract; JSON regenerated).

### case.transcript | 2.7 | VERDICT: GAP | SEVERITY: high
- Reference rule + PDF page: 2.7.1 PDF p.90; 2.7.2 HCA from July 2003 PDF pp.90–1
- Reference templates (verbatim): 2.7.1 `Transcript of Proceedings, «Case Name» («Court», «Proceeding Number», «Judicial Officer(s)», «Full Date of Proceedings») «Pinpoint»`; 2.7.2 `Transcript of Proceedings, «Case Name» [«Year»] HCATrans «Number», «Pinpoint»`
- Engine formatTemplate: "Transcript of Proceedings, Party1 v Party2 (Court, CaseNumber, FullDate) Pinpoint."
- Actual rendering: engine.ts:689 → cases-supplementary.ts:264 (formatTranscript); HCA branch cases-supplementary.ts:289 (`[Year] HCATrans Number`)
- Discrepancies: (1) GAP: Judicial Officer(s) element missing from metadata and renderer — example `(Supreme Court of Victoria, Croft J, 18 May 2015) 31` unproducible. (2) pinpoint optional in metadata but never emitted by either branch. (3) empty proceeding-number slot still rendered ("(Court, , date)"). (4) case name not force-italicised → roman " v " (2.1.11).
- Proposed fix: add judicialOfficers after proceeding number; emit pinpoints (space for 2.7.1, ", " for 2.7.2); skip empty slots.
- **Status:** FIXED (ruleExporter.ts — judicialOfficers/proceedingNumber/pinpoints(+speaker) and the 2.7.2 HCA variant documented, matching the wave-1/2 renderer+dispatch; JSON regenerated).

### case.submission | 2.8 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 2.8 Submissions in Cases, PDF p.91
- Reference template (verbatim): `«Party Name», '«Title of Submission»', Submission in «Case Name», «Proceeding Number», «Full Date of Submission», «Pinpoint»`
- Engine formatTemplate: "DocumentTitle, Party1 v Party2 (Court, CaseNumber, FullDate)."
- Actual rendering: engine.ts:719 → cases-supplementary.ts:316 (formatSubmission) — matches the reference (no parentheses, commas throughout)
- Discrepancies: renderer essentially correct; metadata wrong on nearly every axis: (1) reference form has NO parentheses; (2) reference has no court element yet `court` is metadata-required (dispatcher never reads it); (3) leading Party Name element missing from metadata (dispatcher reads `partyName`); (4) template omits quotes around the title and the literal "Submission in"; (5) element order wrong. Reference makes submission title and proceeding number conditional ("only if each appears"); metadata makes documentTitle required. Minor rendering: empty number/date produce ", , "; roman " v ".
- Proposed fix: metadata → `PartyName, 'SubmissionTitle', Submission in Party1 v Party2, ProceedingNumber, FullDate, Pinpoint.` required: partyName, party1, fullDate; optional: submissionTitle, party2, proceedingNumber, pinpoint, separator; drop court. Renderer: skip empty segments.
- **Status:** FIXED (ruleExporter.ts — partyName/submissionTitle/proceedingNumber/date fields, parenthesis-free comma template per rule 2.8; court dropped; JSON regenerated).

### Cross-cutting (cases)
- Italic 'v': rule 2.1.11 (PDF p.70) requires 'v' italicised as part of the case name; formatCaseName (case-names.ts:190) hard-codes `italic: false` on the separator. Types force-italicising the whole name (unreported.mnc/no_mnc, proceeding, court_order) are correct; case.reported, transcript, submission emit roman 'v'. One-line fix in formatCaseName.
- For 2.3.3 and 2.8 the renderer is correct while the exported metadata is wrong; for 2.3.2, 2.3.4, 2.6.x, 2.7 the renderer itself diverges. Metadata field lists frequently do not match the field names the dispatchers actually read (partyName, commencedDate, judicialOfficer, parties/awardDetails).
## Legislation (Rules 3.1–3.9)

### legislation.statute | 3.1 | VERDICT: MATCH | SEVERITY: none
- Reference rule + PDF page: 3.1 Statutes (Acts of Parliament), PDF p.92 (elements: 3.1.1 Title p.92, 3.1.2 Year p.93, 3.1.3 Jurisdiction p.93, 3.1.4 Pinpoints p.94)
- Reference template (verbatim): `«Title» «Year» («Jurisdiction») «Pinpoint»` (Title and Year in italics; Jurisdiction and Pinpoint roman)
- Engine formatTemplate: "Title Year (Jurisdiction) Pinpoint."
- Actual rendering: `formatStatute` at src/engine/rules/v4/domestic/legislation.ts:109 (title+number+year italic, ` (Jurisdiction)` roman), pinpoint appended roman by `dispatchStatute` engine.ts:443
- Discrepancies: none. Required title/year/jurisdiction match; pinpoint optional matches; `number` optional consistent with 3.1.1.
- Proposed fix: none.
- **Status:** FIXED (src/engine/ruleExporter.ts — PARITY-118: metadata rebuilt against the post-wave-1/2 dispatch behaviour; rule number, required/optional fields and formatTemplate now mirror what dispatch consumes and the reference template; docs/aglc4-rules.json regenerated; dispatch↔metadata consistency enforced by tests/engine/rule-exporter.test.ts).

### legislation.bill | 3.2 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 3.2 Bills, PDF p.99
- Reference template: no explicit template line; "Bills are cited exactly like Acts except that neither title nor year is italicised." (Illustration: `Corporations Amendment (Crowd-Sourced Funding) Bill 2015 (Cth).` — roman)
- Engine formatTemplate: "Title Year (Jurisdiction) Pinpoint."
- Actual rendering: `formatBill` at legislation.ts:245 (title+year roman — correct), dispatched engine.ts:793
- Discrepancies: metadata requires `chamber` (ruleExporter.ts:174), but rule 3.2 contains no chamber element and the renderer never reads `chamber`. Template/order/punctuation/roman rendering otherwise correct.
- Proposed fix: remove `chamber` from requiredFields for legislation.bill (ruleExporter.ts:174), leaving title, year, jurisdiction.
- **Status:** FIXED (ruleExporter.ts — chamber removed from requiredFields; legislativeHistory (rule 3.8 opt-in) documented; JSON regenerated).

### legislation.delegated | 3.4 | VERDICT: MATCH | SEVERITY: medium
- Reference rule + PDF page: 3.4 Delegated Legislation, PDF p.100
- Reference template: cited same as rule 3.1, extra pinpoint abbreviations. (Illustration: `*Heritage Regulation 2006* (ACT) reg 5(1).`)
- Engine formatTemplate: "Title Year (Jurisdiction) Pinpoint."
- Actual rendering: `formatDelegatedLegislation` at legislation-supplementary.ts:82; pinpoint via `dispatchDelegatedLegislation` engine.ts:817; ord/reg/r/sub-reg/sub-r abbreviations present (legislation.ts:21-75) matching the 3.4 table
- Discrepancies: metadata template matches; but (1) optional `number` (ruleExporter.ts:184) is silently dropped — dispatcher never passes it to the formatter; (2) optional `enablingAct` has no basis in reference 3.4 and is never rendered.
- Proposed fix: pass `number` through dispatchDelegatedLegislation; remove `enablingAct` from optionalFields or implement with researcher sign-off (decisions.md).
- **Status:** FIXED (ruleExporter.ts — number and enablingAct removed (dispatch reads neither); JSON regenerated).

### legislation.constitution | 3.6 | VERDICT: GAP | SEVERITY: medium
- Reference rule + PDF page: 3.6 Australian Constitutions, PDF p.101
- Reference template: Cth Constitution "may be cited as the *Australian Constitution*, the *Commonwealth Constitution*, or simply the *Constitution*" (italicised, eg `*Australian Constitution* s 51(ii).`); "Constitutions of the Australian states are cited as normal statutes" (`*Constitution Act 1902* (NSW) s 5.`)
- Engine formatTemplate: "Title Pinpoint."
- Actual rendering: `dispatchConstitution` engine.ts:841 branches — Cth → `formatCommonwealthConstitution` (legislation-supplementary.ts:160); otherwise `formatStateConstitution` (legislation-supplementary.ts:187, statute form)
- Discrepancies: italics correct. Gap: metadata covers only the Commonwealth form — the state-constitution branch (mandated by reference and implemented in engine) needs `year`/`jurisdiction`, absent from both field lists (ruleExporter.ts:192-193). Cth path hardcodes "Australian Constitution", ignoring `title`, so alternative accepted forms unreachable.
- Proposed fix: add `year` and `jurisdiction` to optionalFields; have formatCommonwealthConstitution honour a supplied title (default "Australian Constitution").
- **Status:** FIXED (ruleExporter.ts — requiredFields now empty (Cth form needs no fields); title/year/jurisdiction/pinpoint optional; both Cth and state-statute forms shown; JSON regenerated).

### legislation.explanatory | 3.7 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 3.7 Explanatory Memoranda, Statements and Notes, PDF p.102
- Reference template (verbatim): `Explanatory Memorandum, «Bill Citation» «Pinpoint».` — Bill citation follows rule 3.2 (roman; eg `Explanatory Memorandum, Charter of Human Rights and Responsibilities Bill 2006 (Vic).`)
- Engine formatTemplate: "Explanatory Memorandum, Title Year (Jurisdiction) Pinpoint."
- Actual rendering: `formatExplanatoryMemorandum` at legislation-supplementary.ts:232 — emits `{ text: "BillTitle BillYear", italic: true }` (line 241), dispatched engine.ts:864
- Discrepancies: (1) HIGH — actual rendering italicises the bill citation; reference (via rule 3.2) prescribes roman. (2) HIGH — metadata requires `chamber` (ruleExporter.ts:201); rule 3.7 has no chamber element and the dispatcher never reads it. (3) LOW — reference permits 'Explanatory Statement'/'Explanatory Note(s)'; engine supports via `d.type` (engine.ts:867) but metadata exposes no field.
- Proposed fix: drop `italic: true` on the bill-citation run (reuse formatBill); remove `chamber` from requiredFields; add optional `documentType`.
- **Status:** FIXED (ruleExporter.ts — chamber removed; billTitle/billYear/type fields per dispatch; roman bill citation was fixed wave 1; JSON regenerated).

### legislation.quasi | 3.9 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 3.9 Quasi-Legislative Materials, PDF p.104; nearest subrule 3.9.2 (p.104; also 3.9.1 p.104, 3.9.3 p.105, 3.9.4 p.106 — each a different template)
- Reference template (verbatim, 3.9.2): `«Instrumentality/Officer», «Instrument Title» («Document Number», «Full Date») «Pinpoint».` (Instrument Title italic). Eg `Australian Taxation Office, *Income Tax: Carrying on a Business as a Professional Artist* (TR 2005/1, 12 January 2005).`
- Engine formatTemplate: "IssuingBody, Title (DocumentNumber, Year) Pinpoint."
- Actual rendering: `dispatchQuasiLegislative` engine.ts:882 — gazette fields → `formatGazette` (legislation-supplementary.ts:412, ≈3.9.1); else `formatQuasiLegislative` (legislation-supplementary.ts:460) producing `IssuingBody, DocumentType Number, *Title*, Date`
- Discrepancies: (1) HIGH — actual rendering contradicts reference and its own formatTemplate: doc type+number precede the title; no parentheses around `(Number, Date)`; pinpoint never rendered. (2) MEDIUM — metadata `year` should be `fullDate` per 3.9.2. (3) Field-name drift: metadata `documentNumber`/`year` vs dispatcher `d.number`/`d.date`. (4) LOW — "3.9" conflates four subrule templates; gazette form (3.9.1) invisible in metadata.
- Proposed fix: rewrite formatQuasiLegislative to `IssuingBody, «Title-italic» (Number, FullDate) Pinpoint` per 3.9.2; replace metadata `year` with `fullDate`; align field names; split metadata per subrule or label 3.9.2.
- **Status:** FIXED (ruleExporter.ts — fullDate wording, dispatch field names (issuingBody/number/date/atDate), and all three variants (3.9.1 gazette, 3.9.3 at-date, 3.9.4 practice direction) documented; JSON regenerated).

## Journals and Books (Rules 5–6)

### journal.article | 5 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: Rule 5 chapter template PDF p.116; 5.3 (Year) p.117; 5.4 (Volume and Issue) p.117–118
- Reference template (verbatim): Volume-organised: `«Author», '«Title»' («Year») «Volume»(«Issue») «Journal» «Starting Page», «Pinpoint»` · Year-organised: `«Author», '«Title»' [«Year»] («Issue») «Journal» «Starting Page», «Pinpoint»`
- Engine formatTemplate: "Author, 'Title' (Year) Volume(Issue) Journal StartingPage, Pinpoint." (ruleExporter.ts:223)
- Actual rendering: `formatJournalArticle`, src/engine/rules/v4/secondary/journals.ts:71–113 (dispatch engine.ts:465)
- Discrepancies: (1) Rule 5.3: year-organised journals take `[Year]` in square brackets; engine renders `(Year)` unconditionally (journals.ts:95) and metadata has no square-bracket variant — wrong output for every year-organised journal. (2) Rule 5.4: both volume and issue mandatory where they exist; engine classifies both optional and silently omits. (3) Year-organised issue spacing `[2000] (1)` unrepresentable (`formatVolumeAndIssue` journals.ts:27–39 always emits `Volume(Issue)`). Otherwise order/quoting/italics/punctuation match.
- Proposed fix: add volume- vs year-organised flag; render `[Year]` + ` (Issue)`; make issue (and volume when volume-organised) required; add square-bracket variant to metadata template.
- **Status:** FIXED (ruleExporter.ts — year-organised [Year] variant shown; yearOrganised/partNumber exposed; volume/issue stay optional in the schema because dispatch tolerates their absence (rule obligation noted in the reference); JSON regenerated).

### journal.online | 5.10 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: Rule 5.10, PDF p.121
- Reference template (verbatim): `«Article Number/Identifier»:«Page Range of Article», «Pinpoint»` (PDF pinpoint form); otherwise cite like printed articles with article number/identifier in place of starting page. Illustration: `(2016) 8(7) *Nutrients* 416:1–19, 8` — no "(online)" marker, no URL in rule 5.10.
- Engine formatTemplate: "Author, 'Title' (Year) Volume(Issue) Journal (online) <URL>." (ruleExporter.ts:232)
- Actual rendering: `formatOnlineJournalArticle`, journals.ts:254–294 (dispatch engine.ts:912) — never emits "(online)"; appends `<URL>` unconditionally.
- Discrepancies: (1) `(online)` token appears nowhere in reference and is not emitted by the renderer — metadata disagrees with both. (2) Reference has no URL element in 5.10; engine appends `<URL>` unconditionally, producing stray ` <>` when url empty (journals.ts:290–291; general.ts:88–90). (3) GAP: `articleNumber` (replacement for starting page) absent from metadata fields though renderer supports it. (4) metadata `pinpoint` declared but formatter has no pinpoint param. (5) `doi` declared, never rendered. (6) `Identifier:PageRange, Pinpoint` form unsupported.
- Proposed fix: drop "(online)"/URL from metadata template; add optional `articleNumber`; render pinpoints after it; support identifier:pageRange; render or remove doi/url.
- **Status:** FIXED (ruleExporter.ts — '(online)' token removed; articleNumber added; pinpoint/startingPage/url match the wave-1/2 renderer (URL optional per rule 4.4); doi dropped (never read); JSON regenerated).

### journal.forthcoming | 5.11 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: Rule 5.11, PDF p.122
- Reference template (verbatim): `… «Journal» (forthcoming)` / `… «Journal» (advance)` — "(forthcoming)" replaces the starting page. Illustration: `… 'European Consumer Protection…' (2017) 23 *Columbia Journal of European Law* (forthcoming).`
- Engine formatTemplate: "Author, 'Title' (forthcoming) Journal." (ruleExporter.ts:241)
- Actual rendering: `formatForthcomingArticle`, journals.ts:310–334 (dispatch engine.ts:930) — journal italic then ` (forthcoming)` (correct order).
- Discrepancies: (1) Metadata puts `(forthcoming)` before the journal; reference and the actual renderer put it after — metadata contradicts engine's own output. (2) Year/volume/issue optional in metadata but never rendered (dispatch passes only authors/title/journal); reference says include as much as available. (3) GAP: `(advance)` variant unsupported anywhere.
- Proposed fix: metadata template → `Author, 'Title' (Year) Volume(Issue) Journal (forthcoming).`; render optional year/volume/issue; add advance status.
- **Status:** FIXED (ruleExporter.ts — '(forthcoming)' after the journal; year/volume/issue retained; advance flag documented; JSON regenerated).

### book | 6 | VERDICT: MISMATCH | SEVERITY: medium
- Reference rule + PDF page: Rule 6 chapter map p.123; 6.3.1 p.124–125; 6.3.2 p.125; 6.6.2 p.129
- Reference template: header illustration `Malcolm N Shaw, *International Law* (Cambridge University Press, 7th ed, 2014) 578.`; edition `«Ordinal Edition Number» ed,`; author+editor (6.6.2): `«Author», «Title», ed «Editor» («Publication Details»).`
- Engine formatTemplate: "Author, Title (Publisher, Edition, Year) Pinpoint." (ruleExporter.ts:250)
- Actual rendering: `formatBook`, src/engine/rules/v4/secondary/books.ts:104–146 (dispatch engine.ts:482)
- Discrepancies: (1) metadata lists `editors` optional but dispatchBook never passes editors and formatBook has no editor param — 6.6.2 form unreachable, editor silently dropped. (2) 6.3.2 ordinal indicator should be superscript; formatEdition (books.ts:59–71) emits plain text (cosmetic). (3) revised-edition flag (6.3.3 'rev ed') exists in formatEdition but not exposed. Core order/punctuation/italics match.
- Proposed fix: implement 6.6.2 (`Title, ed Editor (…)`, invariant 'ed') or drop `editors`; superscript ordinal; expose revised flag.
- **Status:** FIXED (ruleExporter.ts — 6.6.2 author+editor, 6.5 multi-volume and 6.8 forthcoming variants documented; editors/revised/volume/volumeLabel/forthcoming exposed (all wired in waves 1–2); JSON regenerated).

### book.chapter | 6.6.1 | VERDICT: MISMATCH | SEVERITY: medium
- Reference rule + PDF page: Rule 6.6.1, PDF p.128
- Reference template (verbatim): `«Author», '«Chapter Title»' in «Editor» (ed), «Title» («Publication Details») «Starting Page», «Pinpoint».`
- Engine formatTemplate: "Author, 'ChapterTitle' in Editor (ed), BookTitle (Publisher, Edition, Year) StartingPage, Pinpoint." (ruleExporter.ts:267–268)
- Actual rendering: `formatBookChapter`, books.ts:224–268 (dispatch engine.ts:945); (ed)/(eds) via authors.ts:338–341
- Discrepancies: metadata matches reference; but `edition` declared optional and present in template while formatBookChapter builds publication details from publisher+year only (books.ts:255) and dispatcher never passes edition — silently dropped.
- Proposed fix: pass and render `edition` in publication details, matching formatBook.
- **Status:** FIXED (ruleExporter.ts — chapterAuthors/chapterTitle field names per dispatch; edition REMOVED from the schema because dispatchBookChapter still does not pass it (remaining engine-wiring gap, out of PARITY-118 scope); JSON regenerated).

### book.translated | 6.7 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: Rule 6.7, PDF p.129
- Reference template (verbatim): `«Author», «Translation Title», tr «Translator» («Publication Details»).` Optional trailing: `[trans of: «Original Title» («Year of Publication»)].` Illustration: `Sigmund Freud, *Civilization and its Discontents*, tr Joan Riviere (Hogarth Press, 1930).`
- Engine formatTemplate: "Author, Title (tr Translator, Publisher, Edition, Year) Pinpoint." (ruleExporter.ts:277)
- Actual rendering: `formatTranslatedBook`, books.ts:285–322 (dispatch engine.ts:963) — `tr Translator` inside the parentheses (books.ts:306)
- Discrepancies: (1) Reference places `, tr «Translator»` after the title, OUTSIDE the parentheses; both metadata and rendering put it inside before the publisher — wrong output on every translated book. (2) GAP: `[trans of: «Original Title» («Year»)]` segment — metadata has `originalYear` only, no `originalTitle`, neither rendered. 'tr' keyword itself correct (invariant).
- Proposed fix: render `Author, *Title*, tr Translator (Publisher, Edition, Year) Pinpoint.`; update metadata; add `originalTitle` and render `[trans of: *OriginalTitle* (Year)].` after pinpoints.
- **Status:** FIXED (ruleExporter.ts — ', tr Translator' outside the parenthetical; originalTitle added with the '[trans of: …]' tail per the wave-1 renderer; JSON regenerated).

### book.audiobook | 6.9 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: Rule 6.9, PDF p.130
- Reference template (verbatim): `«Author», «Title» (Audiobook, «Publisher», «Publication Year») «Pinpoint».` Illustration: `George Orwell, *1984* (Audiobook, Blackstone Audio, 2007) 11:15:05.`
- Engine formatTemplate: "Author, Title (Publisher, Edition, Year) (audiobook, narrated by Narrator)." (ruleExporter.ts:286)
- Actual rendering: `formatAudiobook`, books.ts:374–414 (dispatch engine.ts:981) — book parenthetical + second `(audiobook, narrated by Narrator)` parenthetical + ` Pinpoint`
- Discrepancies: (1) Reference: single parenthetical opening `(Audiobook, Publisher, Year)`; engine emits normal parenthetical plus a second invented `(audiobook, narrated by …)` — wrong structure/casing/wording. (2) `narrator` REQUIRED in metadata; reference has no narrator element — misclassification forcing non-AGLC data. (3) Pinpoints should be time-based (1.11.3–1.11.4, eg `11:15:05`); engine uses generic page-oriented formatPinpoint. (4) Omitting 'audiobook(s)' from publisher name unhandled.
- Proposed fix: render `(Audiobook, Publisher[, Edition], Year)` single parenthetical; delete/demote narrator; support time pinpoints; update metadata template.
- **Status:** FIXED (ruleExporter.ts — single '(Audiobook, Publisher, Year)' parenthetical; narrator removed (deprecated in the renderer); time pinpoints noted; JSON regenerated).

## Other Sources I (Rules 7.1–7.8)

### report | 7.1 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.1.1 General Rule, PDF p.131–132 (7.1 itself has no rule text)
- Reference template (verbatim): `«Author», «Title» («Document Type/Series» No «Document Number», «Full Date») «Pinpoint».`
- Engine formatTemplate: "Author, Title (Report, Year) Pinpoint."
- Actual rendering: src/engine/rules/v4/secondary/other.ts:161 `formatReport` — Author/body, *Title* italic, ` (Type No Number, Date)`, ` Pinpoint` (dispatch engine.ts:1033)
- Discrepancies: (1) `authors` required but reference directs authorless citation when none prominently indicated (renderer already optional); (2) metadata omits the Document Type/Series slot (`reportType` read by dispatcher, absent from optionals) — template hardcodes "Report", documentNumber unplaced; (3) "Year" vs reference "Full Date"; (4) rule number cites parent 7.1 not 7.1.1.
- Proposed fix: authors → optional; add reportType; template "Author, Title (ReportType No DocumentNumber, FullDate) Pinpoint."; cite 7.1.1.
- **Status:** FIXED (ruleExporter.ts — authors optional, body/reportType/reportNumber added, FullDate wording, rule number corrected to 7.1.1; JSON regenerated).

### report.parliamentary | 7.1.2 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.1.2, PDF p.132–133
- Reference template: `«Committee», «Legislature»` in the 7.1.1 author slot — Committee, Legislature, *Title* (Doc Type No X of Year, Full Date) Pinpoint
- Engine formatTemplate: "Committee, Title (Year) Pinpoint."
- Actual rendering: other.ts:216 `formatParliamentaryReport` — `Jurisdiction, Committee, *Title* (DocType No Number, Date)` (dispatch engine.ts:1052)
- Discrepancies: (1) renderer puts legislature BEFORE committee — reference order is committee first; (2) metadata omits Legislature (dispatcher reads `d.jurisdiction`, undeclared); (3) metadata "(Year)" drops the doc-type slot the renderer supports; (4) pinpoint never rendered.
- Proposed fix: swap order to `Committee, Legislature, …`; add legislature required + documentType optional; template "Committee, Legislature, Title (DocumentType No Number, FullDate) Pinpoint."; render pinpoint.
- **Status:** FIXED (ruleExporter.ts — committee-first order with legislature required; documentType/number/pinpoint per the wave-1/2 renderer; JSON regenerated).

### report.royal_commission | 7.1.3 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.1.3, PDF p.133
- Reference template: authorless per 7.1.3; example: `*Royal Commission into Trade Union Governance and Corruption* (Final Report, December 2015) vol 2.`
- Engine formatTemplate: "Royal Commission, Title (Year) Volume Pinpoint."
- Actual rendering: other.ts:251 `formatRoyalCommissionReport` — `CommissionName, *Title* (Year) vol N` (dispatch engine.ts:1068)
- Discrepancies: (1) `commissionName` required in the author slot but reference prescribes authorless citation (commission name is normally the italicised title); (2) bare "(Year)" — reference is "(Final Report, December 2015)" (documentType + full date); (3) pinpoint listed optional, never rendered.
- Proposed fix: commissionName optional/drop; template "Title (DocumentType, FullDate) vol Volume, Pinpoint."; render pinpoint.
- **Status:** FIXED (ruleExporter.ts — authorless (commissionName optional title-fallback); '(DocumentType, FullDate)' parenthetical; pinpoint rendered since wave 1; JSON regenerated).

### report.law_reform | 7.1.4 | VERDICT: MATCH | SEVERITY: low
- Reference rule + PDF page: 7.1.4, PDF p.133–134; example `New South Wales Law Reform Commission, *Set-Off* (Report No 94, February 2000).`
- Engine formatTemplate: "Body, Title (Report No ReportNumber, Year) Pinpoint."
- Actual rendering: other.ts:284 `formatLawReformReport` (dispatch engine.ts:1082)
- Discrepancies: minor — reportNumber required though example 21 permits type without number (empty number renders broken "Report No , date"); "Year" vs full date; pinpoint never rendered.
- Proposed fix: guard "No" segment when number absent; render pinpoint; FullDate wording.
- **Status:** FIXED (ruleExporter.ts — number optional, FullDate wording. Pinpoint stays OUT of the schema: dispatchLawReformReport still passes none (remaining engine-wiring gap); JSON regenerated).

### report.abs | 7.1.5 | VERDICT: MATCH | SEVERITY: low
- Reference rule + PDF page: 7.1.5, PDF p.134; example `Australian Bureau of Statistics, *Corrective Services…* (Catalogue No 4512.0, 30 November 2017).`
- Engine formatTemplate: "Australian Bureau of Statistics, Title (Catalogue No CatalogueNumber, Year) Pinpoint."
- Actual rendering: other.ts:312 `formatAbsMaterial` (dispatch engine.ts:1097)
- Discrepancies: minor — pinpoint never rendered; "Year" vs full date.
- Proposed fix: render pinpoint after the parenthetical.
- **Status:** FIXED (ruleExporter.ts — FullDate wording. Pinpoint stays out of the schema: dispatchAbsMaterial passes none (remaining engine-wiring gap); JSON regenerated).

### research_paper | 7.2 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.2.1 General Rule, PDF p.135 (7.2.2 p.136)
- Reference template (verbatim): `«Author», '«Title»' («Document Type/Series» No «Document Number», «Institution/Forum», «Full Date») «Pinpoint».`
- Engine formatTemplate: "Author, 'Title' (PaperType No PaperNumber, Institution, Year) Pinpoint."
- Actual rendering: other.ts:340 `formatResearchPaper` (dispatch engine.ts:1128)
- Discrepancies: (1) `paperNumber` required but reference: include number only if prominently indicated (empty number renders broken "No , "); (2) metadata field names `paperType`/`paperNumber` don't match dispatcher fields `d.documentType`/`d.number` — data per published metadata would not render; (3) Year vs Full Date; (4) pinpoint never rendered; (5) cites parent 7.2 not 7.2.1.
- Proposed fix: number optional + guard; align field names; FullDate; render pinpoint; cite 7.2.1.
- **Status:** FIXED (ruleExporter.ts — documentType/number/institution/date field names per dispatch, number optional, rule number corrected to 7.2.1; pinpoint+url wired waves 1–2; JSON regenerated).

### research_paper.parliamentary | 7.2.3 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.2.3, PDF p.136–137; example `Amanda Biggs, 'Medicare: A Quick Guide' (Research Paper, Parliamentary Library, Parliament of Australia, 12 July 2016).`
- Engine formatTemplate: "Author, 'Title' (Parliamentary Research Paper No PaperNumber, Year) Pinpoint."
- Actual rendering: other.ts:372 `formatParliamentaryResearchPaper` — `Body(, Jurisdiction), 'Title' (DocType No Number, Year)` (dispatch engine.ts:1144)
- Discrepancies: (1) reference puts "Parliamentary Library, Legislature" INSIDE the parenthetical with the individual author leading; renderer puts the library in the author slot and drops the individual author; (2) metadata omits "Parliamentary Library, Legislature" and invents doc type "Parliamentary Research Paper" (reference: "Research Paper"); (3) paperNumber required though example has none; (4) Year vs full date; (5) metadata `authors` required but dispatcher never reads authors; (6) pinpoint never rendered.
- Proposed fix: "Author, 'Title' (DocumentType No Number, Parliamentary Library, Legislature, FullDate) Pinpoint." with number optional; pass individual authors through.
- **Status:** FIXED (ruleExporter.ts — authors lead; body ('Parliamentary Library')/legislature inside the parenthetical; invented 'Parliamentary Research Paper' doc type removed (defaults to 'Research Paper'); number optional; JSON regenerated).

### conference_paper | 7.2.4 | VERDICT: MATCH | SEVERITY: low
- Reference rule + PDF page: 7.2.4, PDF p.137; example `Ian Mutton, 'Extra-Territoriality: A Case Study' (Conference Paper, International Trade Law Conference, 29 May 1997).`
- Engine formatTemplate: "Author, 'Title' (Conference Paper, ConferenceName, FullDate) Pinpoint."
- Actual rendering: other.ts:408 `formatConferencePaper` (dispatch engine.ts:1160)
- Discrepancies: minor — optional `location` contradicts the rule's explicit "do not include the geographical location" (inert but invites non-compliant data); pinpoint never rendered.
- Proposed fix: remove `location`; render pinpoint.
- **Status:** FIXED (ruleExporter.ts — location removed per the rule's prohibition; documentType added. Pinpoint stays out: dispatch passes none (remaining engine-wiring gap); JSON regenerated).

### thesis | 7.2.5 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.2.5, PDF p.137–138 (title treatment 7.2.1 p.135); example `Antonio Kurt Esposito, 'The History of the Torrens System…' (LLM Thesis, The University of Adelaide, 2000).`
- Engine formatTemplate: "Author, Title (ThesisType, Institution, Year) Pinpoint."
- Actual rendering: other.ts:437 `formatThesis` — italicises the title via formatItalicTitle (dispatch engine.ts:1174)
- Discrepancies: (1) 7.2.1 prescribes quoted roman title for theses; renderer italicises — wrong output; (2) metadata template lacks the quote marks ('Title'); (3) pinpoint never rendered; (4) dispatcher truncates multiple authors to the first.
- Proposed fix: switch to quoted roman title; metadata "Author, 'Title' (ThesisType, Institution, Year) Pinpoint."; render pinpoint.
- **Status:** FIXED (ruleExporter.ts — quoted roman 'Title' template per 7.2.1 (renderer fixed wave 1); thesisType/university field names per dispatch. Pinpoint stays out: dispatch passes none (remaining engine-wiring gap); JSON regenerated).

### speech | 7.3 | VERDICT: MATCH | SEVERITY: low
- Reference rule + PDF page: 7.3, PDF p.138–139
- Reference template (verbatim): `«Author», '«Title»' (Speech, «Institution/Forum», «Full Date») «Pinpoint».`
- Engine formatTemplate: "Speaker, 'Title' (Speech, Event, FullDate) Pinpoint."
- Actual rendering: other.ts:466 `formatSpeech` (dispatch engine.ts:1195)
- Discrepancies: minor — "Speech" hardcoded so a named lecture cannot replace it; `location` optional never rendered; pinpoint never rendered.
- Proposed fix: optional speechType/lectureName; render location fallback and pinpoint.
- **Status:** FIXED (ruleExporter.ts — speechType (named lecture) added; location dropped (folded into event fallbacks). Pinpoint stays out: dispatch passes none (remaining engine-wiring gap); JSON regenerated).

### press_release | 7.4 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.4, PDF p.139
- Reference template (verbatim): `«Author», '«Title»' («Release Type» «Document Number», «Body», «Full Date») «Pinpoint»`
- Engine formatTemplate: "Author, 'Title' (Press Release, DocumentNumber, FullDate)."
- Actual rendering: other.ts:494 `formatPressRelease` — `Author/Body, 'Title' (Media Release, Date)` (dispatch engine.ts:1209)
- Discrepancies: (1) type and number space-separated in reference ("Media Release MSPA 172/09,"), metadata inserts a comma; (2) renderer drops document number entirely; (3) release type hardcoded and the two engine layers disagree ("Press Release" vs "Media Release"); reference takes type from source; (4) «Body» slot missing everywhere — GAP; (5) pinpoint absent from template, never rendered.
- Proposed fix: "Author, 'Title' (ReleaseType DocumentNumber, Body, FullDate) Pinpoint."; add releaseType/body; render number (space-joined) and pinpoint.
- **Status:** FIXED (ruleExporter.ts — releaseType + space-joined documentNumber + issuingBody body slot + pinpoint per the wave-1/2 renderer; JSON regenerated).

### hansard | 7.5.1 | VERDICT: MISMATCH | SEVERITY: medium
- Reference rule + PDF page: 7.5.1, PDF p.140
- Reference template (verbatim): `«Jurisdiction», *Parliamentary Debates*, «Chamber», «Full Date of Debate», «Pinpoint» («Name of Speaker»)`
- Engine formatTemplate: "Jurisdiction, Parliamentary Debates, Chamber, FullDate, StartingPage (Speaker) Pinpoint."
- Actual rendering: other.ts:527 `formatHansard` — matches the reference exactly (italic *Parliamentary Debates*, page before (Speaker), nothing after) (dispatch engine.ts:1493)
- Discrepancies: metadata appends a trailing "Pinpoint." after the speaker parenthetical — reference has a single pinpoint (the page) before "(Speaker)"; required startingPage + optional pinpoint duplicate one slot (renderer ignores `pinpoint`).
- Proposed fix: delete trailing "Pinpoint." from metadata template; drop redundant optional pinpoint.
- **Status:** FIXED (ruleExporter.ts — trailing 'Pinpoint.' deleted; redundant optional pinpoint dropped (page is the pinpoint); JSON regenerated).

### submission.government | 7.5.2 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.5.2, PDF pp.140–141
- Reference template (verbatim): `«Author», Submission No «Number» to «Body», «*Name of Inquiry*» («Full Date») «Pinpoint»` (parliamentary: Body → `«Committee», «Legislature»`)
- Engine formatTemplate: "Author, Title, Submission to Committee (Year) Pinpoint."
- Actual rendering: other.ts:560 `formatSubmissionToInquiry` — `Author, DocType[ No N] to Committee, Inquiry (Date)` all roman (dispatch engine.ts:1508)
- Discrepancies: (1) metadata element order reversed (Title before "Submission to…"; reference/renderer put "Submission No X to Body" first, inquiry name after); (2) submission Number missing from metadata fields (dispatcher reads `d.number`) — GAP; (3) Legislature element missing from both layers; (4) renderer leaves inquiry name roman — reference italicises it; (5) pinpoint never rendered; (6) Year vs full date.
- Proposed fix: "Author, Submission No Number to Committee, Legislature, Inquiry (FullDate) Pinpoint."; add number + legislature; italicise inquiry run; render pinpoint.
- **Status:** FIXED (ruleExporter.ts — 'Submission No Number to Committee, Inquiry (FullDate) Pinpoint.' order; number/inquiry/body/pinpoint exposed. «Legislature» remains unmodelled in the renderer (enter it within committee) — remaining gap; JSON regenerated).

### evidence.parliamentary | 7.5.3 | VERDICT: GAP | SEVERITY: high
- Reference rule + PDF page: 7.5.3, PDF p.142
- Reference template (verbatim): `Evidence to «Committee», «Legislature», «Location», «Full Date», «Pinpoint» («Name of Speaker»)`
- Engine formatTemplate: "Evidence to Committee (FullDate) Pinpoint (Witness)."
- Actual rendering: other-media.ts:185 `formatParliamentaryEvidence` — `Evidence to Committee, Parliament, Jurisdiction, Date, Page (Witness)` (dispatch engine.ts:1525)
- Discrepancies: (1) metadata omits «Legislature» and «Location» — GAP; (2) metadata parenthesises the date; reference comma-separates it; (3) renderer inserts `jurisdiction` where «Location» belongs and has no location field; (4) witness required in metadata, optional in renderer; (5) extra optional `pinpoint` unused (page is the pinpoint).
- Proposed fix: "Evidence to Committee, Legislature, Location, FullDate, Pinpoint (Witness)."; add legislature + location; replace jurisdiction with location in renderer.
- **Status:** FIXED (ruleExporter.ts — legislature (parliament) + location required; comma-separated date; witness optional per the renderer; JSON regenerated).

### constitutional_convention | 7.5.4 | VERDICT: GAP | SEVERITY: high
- Reference rule + PDF page: 7.5.4, PDF pp.142–143
- Reference template (verbatim): `«*Title*», «Location», «Full Date», «Pinpoint» («Name of Speaker»)`
- Engine formatTemplate: "Title, FullDate, Volume, Pinpoint (Speaker)."
- Actual rendering: other-media.ts:223 `formatConstitutionalConvention` — `ConventionName, Location, Date, vol N, Page` roman, speaker never emitted (dispatch engine.ts:1542)
- Discrepancies: (1) «Location» missing from metadata (renderer does emit it) — GAP; (2) metadata `volume` element not in reference template; (3) renderer never outputs the speaker parenthetical (no data field) though metadata lists `speaker`; (4) renderer does not italicise the title — reference has «*Title*» italic.
- Proposed fix: "Title, Location, FullDate, Pinpoint (Speaker)." with location required, volume removed/annotated; italicise title; append speaker.
- **Status:** FIXED (ruleExporter.ts — location added, volume removed, speaker parenthetical documented (wired wave 2); JSON regenerated).

### dictionary | 7.6 | VERDICT: MISMATCH | SEVERITY: medium
- Reference rule + PDF page: 7.6, PDF pp.143–144
- Reference template (verbatim): hard copy `«*Dictionary Title*» («Edition Number» ed, «Publication Year») '«Entry Title»' (def «Definition Number»)`; online `«*Dictionary Title*» (online at «Date of Retrieval») '«Entry Title»' (def «Definition Number»)`
- Engine formatTemplate: "Title (at Edition, Year) 'Entry'."
- Actual rendering: other-media.ts:250 `formatDictionary` — `*Title* (Publisher, Edition, Year) 'entry' (def N)` (dispatch engine.ts:1412)
- Discrepancies: (1) "(at Edition, Year)" wrong wording — "at" belongs only to online form; hard copy is "(5th ed, 2009)"; (2) "(def N)" missing from metadata (renderer supports `definitionNumber`, undeclared); (3) renderer inserts a Publisher — no publisher slot in rule 7.6; (4) `year` optional in metadata, required in reference hard-copy template; (5) no online variant.
- Proposed fix: "Title (Edition ed, Year) 'Entry' (def DefinitionNumber)."; add definitionNumber; drop publisher from formatDictionary; add online variant.
- **Status:** FIXED (ruleExporter.ts — '(Edition ed, Year)' wording, definitionNumber/entryType/retrievedDate (online form) added; publisher slot removed wave 1/2; JSON regenerated).

### legal_encyclopedia | 7.7 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.7, PDF p.144
- Reference template (verbatim): hard copy `«Publisher», «*Title of Encyclopedia*», vol «Volume Number» (at «Full Date») «Title Number» «Name of Title», '«Chapter Number» «Name of Chapter»' [«Paragraph»]`; online `«Publisher», «*Title of Encyclopedia*» (online at «Date of Retrieval») …`
- Engine formatTemplate: "Title (at Edition, Year) vol Volume, 'TopicTitle', Pinpoint."
- Actual rendering: other-media.ts:286 `formatLegalEncyclopedia` — `*Title* (at Date) vol N, TitleNumber 'Topic' Paragraph`, no publisher (dispatch engine.ts:1431)
- Discrepancies: (1) «Publisher» leads the reference citation; metadata optional, renderer never outputs it; (2) order wrong in both layers: reference "vol Volume (at Full Date)"; (3) "(at Edition, Year)" mixes in a non-existent Edition element; (4) «Title Number» «Name of Title» pair omitted from metadata; renderer detaches titleNumber; (5) paragraph pinpoint must be square-bracketed "[235-270]" — neither layer brackets it; (6) no online variant.
- Proposed fix: "Publisher, Title, vol Volume (at FullDate) TitleNumber TitleName, 'ChapterNumber ChapterName' [Paragraph]."; publisher required; reorder renderer; bracket paragraph.
- **Status:** FIXED (ruleExporter.ts — publisher required and leading, 'vol Volume (at FullDate)' order, titleNumber/titleName, bracketed [Paragraph], online variant; matches the wave-1/2 renderer; JSON regenerated).

### looseleaf | 7.8 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.8, PDF p.145
- Reference template (verbatim): print `«Publisher», «*Title*», vol «Volume Number» (at «Most Recent Service Number for Pinpoint or Full Date») «Pinpoint»`; online `«Publisher», «*Title*» (online at «Date of Retrieval») «Pinpoint»`; author (if clearly identified) precedes the publisher
- Engine formatTemplate: "Author, Title (Publisher, ServiceNumber) Volume, Pinpoint."
- Actual rendering: other-media.ts:318 `formatLooseleaf` — `Author, *Title* (Publisher, Date) vol N, Paragraph` (dispatch engine.ts:1447)
- Discrepancies: (1) publisher belongs BEFORE the title; engine buries it in a post-title parenthetical; (2) parenthetical must read "(at Service 299)"/"(at Full Date)" — "at" missing in both layers; dispatcher never reads `d.serviceNumber` despite metadata declaring it; (3) volume belongs before the parenthetical; engine places it after; (4) `authors` required but reference makes author conditional — publisher is the invariant element; (5) paragraph pinpoints normally square-bracketed "[21.01.1]" — neither layer does; (6) no online variant.
- Proposed fix: "Author, Publisher, Title, vol Volume (at ServiceNumber/FullDate) [Pinpoint]."; publisher required, authors optional; reorder formatLooseleaf; bracket paragraph pinpoints.
- **Status:** FIXED (ruleExporter.ts — publisher required, authors optional, '(at ServiceNumberOrFullDate)' wording (the `date` field carries either), bracketed [Paragraph], online variant; JSON regenerated).

### Cross-cutting (7.1–7.8)
- Pinpoint declared in nearly every formatTemplate but rendered only by formatReport and formatHansard.
- «Legislature» element dropped engine-wide in the 7.1.2/7.2.3/7.5.2/7.5.3 family.
- Chapter-7 "at"/service/edition parenthetical wording (7.6–7.8) wrong in metadata and code.
- Metadata/dispatcher field-name splits: paperType/paperNumber vs documentType/number; serviceNumber never read; speaker declared but unrenderable for 7.5.4.
## Other Sources II (Rules 7.9–7.16, GenAI)

### ip_material | 7.9 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.9 Intellectual Property ('IP') Materials, PDF pp.146–147
- Reference template (verbatim): `«*Jurisdiction Code*» «*Intellectual Property Type*» «*Additional Information*» *No* «*Identification Number*», filed/lodged on «Full Date» («Latest Registration Status Change» on «Full Date»)` — italicised through the identification number (eg *US Trademark Registration No 4938522*, filed on 6 December 2013 (Registered on 12 April 2016))
- Engine formatTemplate: "Title, RegistrationNumber (Year) Pinpoint."
- Actual rendering: formatIpMaterial other-media.ts:355 (dispatch engine.ts:1463): `IPType No Number, Title, Applicant, Date` — comma-joined, no italics
- Discrepancies: metadata bears no resemblance to the reference: no jurisdiction code, no "No", no "filed/lodged on", no status parenthetical; reference has no title/applicant/year/pinpoint elements. Required fields wrong (reference core: jurisdiction code, IP type, number, filing date). Rendering lacks mandatory italics and inserts title/applicant. Metadata names `registrationNumber`; dispatcher reads `d.number`.
- Proposed fix: required jurisdictionCode, ipType, identificationNumber, filedDate; optional additionalInfo, statusChange, statusChangeDate. Template `*JurisdictionCode IPType AdditionalInfo No Number*, filed on FullDate (StatusChange on FullDate).` with italics through the number; drop title/applicant.
- **Status:** FIXED (ruleExporter.ts — jurisdictionCode/ipType/number/filingDate/filedTerm/status/statusDate per the wave-1/2 renderer; title/applicant/year/pinpoint removed; JSON regenerated).

### constitutive_document | 7.10 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.10 Constitutive Documents of a Corporation, PDF p.147
- Reference template (verbatim): `«*Document Type*», «Company Name» (at «Full Date») «Pinpoint»` (eg *Constitution*, ASX (at 5 October 2012) cl 1.1)
- Engine formatTemplate: "EntityName DocumentType Pinpoint."
- Actual rendering: formatConstitutiveDocument other-media.ts:385 (dispatch engine.ts:1478): `CompanyName, DocumentType, Pinpoint` — no italics, no date
- Discrepancies: element order reversed (italic Document Type first); `(at «Full Date»)` missing entirely from metadata and rendering (required in reference); pinpoint should follow parenthetical with a space, not comma; document type italic in reference, roman in rendering; 'Pty/Ltd/Inc/the' stripping unhandled.
- Proposed fix: required documentType, companyName, date; optional pinpoint. Template `*DocumentType*, CompanyName (at FullDate) Pinpoint.`
- **Status:** FIXED (ruleExporter.ts — '*DocumentType*, CompanyName (at FullDate) Pinpoint.' with date required; JSON regenerated).

### newspaper | 7.11 | VERDICT: GAP | SEVERITY: medium
- Reference rule + PDF page: 7.11.1 Printed PDF p.148 / 7.11.2 Electronic PDF p.149
- Reference templates (verbatim): printed `«Author», '«Title»', «*Newspaper*» («Place of Publication», «Full Date») «Pinpoint»`; electronic `«Author», '«Title»', «*Newspaper*» (online, «Full Date») «Pinpoint» <«URL»>`
- Engine formatTemplate: "Author, 'Title', Newspaper (FullDate) StartingPage."
- Actual rendering: formatNewspaper other-media.ts:408 (dispatch engine.ts:1223) — matches the reference (both variants)
- Discrepancies: metadata omits Place of Publication (required in printed parenthetical; formatter renders it); metadata omits the electronic variant (isElectronic/url) the formatter supports; `authors` required conflicts with 7.11.4 (unsigned articles).
- Proposed fix: add `place`; template `Author, 'Title', Newspaper (Place, FullDate) Pinpoint.`; add url/isElectronic optional; demote authors to optional per 7.11.4.
- **Status:** FIXED (ruleExporter.ts — place added; electronic and editorial variants (isElectronic/url/isEditorial/titleIsDescription) documented; authors optional per 7.11.4; the `page` field is the pinpoint slot; JSON regenerated).

### correspondence | 7.12 | VERDICT: MATCH | SEVERITY: low
- Reference rule + PDF page: 7.12 Written Correspondence, PDF pp.150–151
- Reference template (verbatim): `«Type of Correspondence» from «Author» to «Recipient», «Full Date», «Pinpoint»`
- Engine formatTemplate: "Letter from From to To, FullDate."
- Actual rendering: formatCorrespondence other-media.ts:502 (dispatch engine.ts:1299) — matches order/punctuation
- Discrepancies: minor — template hard-codes "Letter" vs «Type of Correspondence» (dispatcher supports d.type, default "Letter") and `type` unlisted; optional `subject` has no reference counterpart; metadata `pinpoint` never rendered.
- Proposed fix: add correspondenceType to optionalFields; template `Type from From to To, FullDate, Pinpoint.`; wire pinpoint; consider dropping subject.
- **Status:** FIXED (ruleExporter.ts — type ('Type of Correspondence') exposed; sender/recipient field names per dispatch; subject and unrendered pinpoint dropped; JSON regenerated).

### interview | 7.13 | VERDICT: MISMATCH | SEVERITY: medium
- Reference rule + PDF page: 7.13 Interviews and Similar Formats, PDF p.151
- Reference template (verbatim): `Interview with «Name of Interviewee» («Name of Interviewer», «Forum or Form of Interview», «Full Date»)`
- Engine formatTemplate: "Interview with Interviewee (Interviewer, FullDate)."
- Actual rendering: formatInterview other-media.ts:522 (dispatch engine.ts:1313): `Interview with Interviewee (Interviewer, Location, Date)` — includes the forum slot
- Discrepancies: `fullDate` optional in metadata but unconditional in the reference template (and always emitted by the formatter). Forum element absent from formatTemplate (optional `programme` unmapped — dispatcher reads d.location/d.program/d.publication, not d.programme). Optional `title`/`pinpoint` have no reference counterpart.
- Proposed fix: fullDate → required; template `Interview with Interviewee (Interviewer, Forum, FullDate).`; align programme field name; drop title/pinpoint or justify.
- **Status:** FIXED (ruleExporter.ts — date required; forum slot documented via the `location` field dispatch reads; unmapped programme/title/pinpoint dropped; JSON regenerated).

### film_tv_media | 7.14 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.14.1 PDF p.152; 7.14.2 Films PDF pp.152–153; 7.14.3 TV PDF p.153
- Reference template (verbatim): `'«Episode Title»', «*Film Title/Series Title*» («Version Details», «Studio/Production Company/Producer», «Year») «Pinpoint»` — films omit episode title; eg *The Dark Knight* (Warner Brothers Pictures, 2008) 0:54:58–0:55:11
- Engine formatTemplate: "Title (Director, Distributor, Year) Pinpoint."
- Actual rendering: formatFilm other-media.ts:554 / formatTvSeries :573 (dispatch engine.ts:1332): film `*Title* (Directed by Director, Year)`; TV `'Episode', *Series* (Season X, Episode Y, Studio, Year)`
- Discrepancies: reference parenthetical contains no director — engine invents Director+Distributor slots; film rendering emits "Directed by Director" (nowhere in reference) and drops the studio (dispatch falls back director ← producer). TV puts 'Season X, Episode Y' inside the parenthetical; 7.14.3 puts it in the quoted episode-title slot ('Season 9, Episode 10', *Gruen* (ABC, 2017)). Metadata lacks episodeTitle/seriesTitle/versionDetails; pinpoint never rendered.
- Proposed fix: required title, studio, year; optional episodeTitle, versionDetails, pinpoint. Template `'EpisodeTitle', Title (VersionDetails, Studio, Year) Pinpoint.`; remove "Directed by"/director; move season/episode into the quoted title slot.
- **Status:** FIXED (ruleExporter.ts — film/TV/podcast variants with episodeTitle/seriesTitle/versionDetails/productionCompany/network/producer/timePinpoint per the wave-1/2 renderers; director kept only as a legacy production-company fallback; JSON regenerated).

### internet_material | 7.15 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 7.15 Internet Materials, PDF p.155
- Reference template (verbatim): `«Author», '«Document Title»', «*Web Page Title*» («Document Type», «Full Date») «Pinpoint» <«URL»>` (eg 'James Edelman', *High Court of Australia* (Web Page) <URL>)
- Engine formatTemplate: "Author, 'Title', WebsiteName (FullDate) <URL>."
- Actual rendering: formatInternetMaterial other-media.ts:630 (dispatch engine.ts:1374) — parenthetical only when a date exists; no pinpoint
- Discrepancies: (1) «Document Type» ('Web Page', 'Blog Post', ...) missing entirely from metadata and rendering; reference always includes it even without a date (`(Web Page)`), engine emits no parenthetical at all in that case. (2) `authors` required contradicts reference ("Include an author only when one is indicated"; omit when identical to page title) — formatter treats it optional, so metadata contradicts both. (3) pinpoint never rendered.
- Proposed fix: required title, websiteName, url, documentType (default 'Web Page'); optional authors, fullDate, pinpoint. Template `Author, 'Title', WebsiteName (DocumentType, FullDate) Pinpoint <URL>.`
- **Status:** FIXED (ruleExporter.ts — documentType ('Web Page' default) documented; authors optional per the rule. Pinpoint stays out: dispatch passes none (remaining engine-wiring gap); JSON regenerated).

### social_media | 7.16 | VERDICT: GAP | SEVERITY: medium
- Reference rule + PDF page: 7.16 Social Media Posts, PDF pp.156–157
- Reference template (verbatim): `«Username», '«Title»' («Social Media Platform», «Full Date», «Time») <«URL»>` (title omitted when post has none; time only to disambiguate/localise)
- Engine formatTemplate: "Author (Platform, FullDate) <URL>."
- Actual rendering: formatSocialMedia other-media.ts:670 (dispatch engine.ts:1396): `Author, 'Title' (Platform, Date, Time) <URL>` — matches the reference
- Discrepancies: formatTemplate omits the '«Title»' slot the reference carries and the formatter renders (metadata's `content` field name corresponds to nothing the engine reads — dispatcher/formatter read `title`); «Time» absent from metadata though supported; formatter renders `<>` unconditionally when url empty. Required set (author, platform, fullDate) matches.
- Proposed fix: template `Author, 'Title' (Platform, FullDate, Time) <URL>.`; rename content → title; add time optional; guard empty URL.
- **Status:** FIXED (ruleExporter.ts — 'content' renamed to the `title` field dispatch reads; time and timePinpoint added; JSON regenerated).

### genai_output | 7.12 | VERDICT: MISMATCH | SEVERITY: medium
- Reference rule + PDF page: none — the reference contains no generative-AI rule (grep for generative/GenAI/artificial intelligence/ChatGPT: zero hits). Claimed rule 7.12 is Written Correspondence (PDF pp.150–151), colliding with the `correspondence` entry.
- Reference template: n/a (nearest analogue 7.12 correspondence template)
- Engine formatTemplate: "Provider, Model (FullDate) prompt: 'Prompt'."
- Actual rendering: formatGenaiOutput genai.ts:42 (dispatch engine.ts:742): `Correspondence from Platform (Model) to the author, Date <URL>` — deliberately follows MULR interim guidance (treat GenAI output as correspondence under 7.12), per JSDoc, pending AGLC5
- Discrepancies: (1) metadata formatTemplate bears no relation to actual output — "Provider, Model (Date) prompt: '...'" form exists nowhere in code. (2) `prompt` required in metadata but typed optional and never rendered; `provider` doesn't match dispatcher fields (`platform`/`platformCustom`, `model`). (3) rule number 7.12 defensible under the MULR treatment but metadata gives no hint it is extra-AGLC4, and silently duplicates correspondence's rule number in the exported JSON.
- Proposed fix: formatTemplate → `Correspondence from Platform (Model) to the author, FullDate <URL>.`; required platform, model, fullDate; prompt → optional/drop; annotate label/rule "7.12 (MULR interim guidance — no native AGLC4 rule)".
- **Status:** FIXED (ruleExporter.ts — ruleNumber now 'MULR interim guidance (non-AGLC4)' (no longer silently duplicating correspondence's 7.12); template matches the actual 'Correspondence from Platform (Model) to the author, OutputDate <URL>.' output; platform/model/outputDate required; prompt documented as stored-but-unrendered; JSON regenerated).

## International Materials (Rules 8–14)

### treaty | 8 | VERDICT: MATCH | SEVERITY: low
- Reference rule + PDF page: Rule 8 (PDF p.158); 8.3.1 (p.160), 8.3.2 (p.161), 8.3.3 (p.161), 8.4 (p.162)
- Reference template (verbatim): `«Treaty Title», «Parties' Names», «Date Opened for Signature or Signed», «Treaty Series» «Date of Entry into Force» «Pinpoint»`; 8.3.1 `…opened for signature «Date», «Treaty Series» (entered into force «Date»)`; 8.3.2 same-date form `(signed and entered into force «Date»)`; 8.3.3 `(not yet in force)`
- Engine formatTemplate: "Title, opened for signature OpenedDate, SeriesVolume TreatySeries StartingPage (entered into force EntryIntoForceDate) Pinpoint."
- Actual rendering: src/engine/rules/v4/international/treaties.ts:54-110 — italic title, en-dash parties, opened/signed, series, entry-into-force/not-yet-in-force, pinpoint
- Discrepancies: metadata template shows only the opened-for-signature variant and omits Parties from the string, but parties/signedDate/notYetInForce are all in optionalFields — nothing missing. Rendering gap: 8.3.2 compressed `(signed and entered into force D)` for identical dates not implemented.
- Proposed fix: in formatTreaty, when signedDate === entryIntoForceDate emit ` (signed and entered into force D)`.
- **Status:** FIXED (ruleExporter.ts — parties shown in the template; 8.3.2 signed-and-entered and 8.3.3 not-yet-in-force variants documented (renderer gained 8.3.2 in wave 1); JSON regenerated).

### un.document | 9.2 | VERDICT: GAP | SEVERITY: high
- Reference rule + PDF page: Rule 9.2 (PDF p.167); sub-rules 9.2.1–9.2.14 (pp.169–179)
- Reference template: element order — Author | Title | Resolution/Decision No | Official Records | Committee No | Session (and Part) No | Meeting No | Agenda Item | Supplement | UN Doc Number | Full Date (parentheses) | Annex | Pinpoint; commas before the doc number, no separating punctuation after it (date parenthesised)
- Engine formatTemplate: "Title, UN Doc DocumentNumber (Year) Pinpoint."
- Actual rendering: src/engine/rules/v4/international/un.ts:79-151 (dispatch engine.ts:1559) — supports author, resolution No, official records, session, meeting, agenda item, Supp No, annex
- Discrepancies: (1) metadata drastically simplified: author, resolutionNumber, officialRecords, committeeNumber, meetingNumber, agendaItem, supplement, annex, fullDate all absent though the formatter supports most; (2) `title` required, but 9.2.2: not every UN document has a title; (3) `unOrgan` required, but 9.2.1 excludes the author when it is a principal organ; (4) "(Year)" should be Full Date (9.2.11); (5) rendering bug: pinpoint emitted `, pinpoint` (un.ts:147) — reference forbids punctuation after the doc number ("(23 March 2000…) para 3"); (6) no Committee Number element (9.2.5).
- Proposed fix: expand optionalFields to all 9.2 elements; demote title/unOrgan; FullDate; drop comma before pinpoint; add committeeNumber slot.
- **Status:** FIXED (ruleExporter.ts — full 9.2 element set (author/resolutionNumber/officialRecords/session/meetingNumber/agendaItem/supplement/annex) + 9.1 Charter variant (isCharter/article); title demoted to optional; FullDate. committeeNumber exists in the formatter but dispatch does not pass it, so it stays out of the schema (remaining engine-wiring gap); JSON regenerated).

### un.communication | 9.3 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 9.3.1 (PDF p.179)
- Reference template: 9.2-style citation led by the committee as author, communication number in italic title, mandatory short title `('«Complainant» v «Respondent State»')` trailing; eg `Human Rights Committee, *Views: Communication No 1011/2001*, 81st sess, UN Doc CCPR/C/81/D/1011/2001 (26 August 2004) 21 [9.8] ('*Madafferi v Australia*')`
- Engine formatTemplate: "Applicant v Respondent, UN Doc DocumentNumber (Year) Pinpoint."
- Actual rendering: engine.ts:1585-1611 → un.ts:215-258 — party names first, then italic "Views: Communication No X", committee after, `, pinpoint`
- Discrepancies: (1) metadata template is the subsequent-reference form, not the first-citation form; (2) required applicant/respondent contradict the first-citation form (committee + doc number are core); (3) rendering reverses committee/parties order vs reference; (4) omits the mandatory ('Short Title') parenthetical; (5) `, pinpoint` comma contradicts 9.2.
- Proposed fix: require committee + communicationNumber + documentNumber; applicant/respondent as short-title inputs; render Committee, *Views: Communication No X*, [sess,] UN Doc N (date) pinpoint ('*A v B*').
- **Status:** FIXED (ruleExporter.ts — committee/communicationNumber/documentNumber required; decisionType/session and the 9.3.2 party-submission variant documented per the wave-1/2 renderer. The mandatory ('Short Title') tail of 9.3.1 is still not emitted by formatUnCommunication — remaining renderer gap outside PARITY-118 scope; JSON regenerated).

### un.yearbook | 9.4 | VERDICT: GAP | SEVERITY: high
- Reference rule + PDF page: 9.4 (PDF pp.180–181)
- Reference template (verbatim): year-organised `'«Title»' [«Year»] «Yearbook Title» «Starting Page», «Pinpoint»`; volume-organised `'«Title»' («Year») «Volume Number» «Yearbook Title» «Starting Page», «Pinpoint»`
- Engine formatTemplate: "Title [Year] Volume Yearbook StartingPage, Pinpoint."
- Actual rendering: un.ts:289-332 (dispatch engine.ts:1618) — matches the reference (quoted title, bracket switch, italic yearbook, page, pinpoint)
- Discrepancies: (1) the Yearbook Title element has no metadata field although the formatter requires `yearbook` — mandatory element missing from metadata; (2) `volume` required but only volume-organised yearbooks have one; (3) template mixes `[Year]` with a bare Volume.
- Proposed fix: add `yearbook` to requiredFields; volume → optional; show both year forms.
- **Status:** FIXED (ruleExporter.ts — yearbook added to requiredFields; volume optional; both year forms shown; JSON regenerated).

### icj.decision | 10.2 | VERDICT: GAP | SEVERITY: high
- Reference rule + PDF page: 10.2 (PDF p.184); 10.2.5 (p.188)
- Reference template (verbatim): ICJ `«Case Name» («Parties' Names») («Phase») [«Year»] ICJ Rep «Starting Page», «Pinpoint»`; PCIJ `… [«Year»] PCIJ (ser «Letter(s)») No «Case Number», «Pinpoint»`
- Engine formatTemplate: "Title (DecisionType) [Year] ICJ Reports StartingPage, Pinpoint."
- Actual rendering: src/engine/rules/v4/international/icj.ts:45-102 (dispatch engine.ts:1635; default series engine.ts:1642) — order/punctuation/italics correct incl. PCIJ form
- Discrepancies: (1) series must read "ICJ Rep"; metadata template and the dispatch default say "ICJ Reports" — wrong output unless user overrides reportSeries; (2) Parties' Names mandatory for contentious cases (10.2.2) but no metadata field; (3) `decisionType` optional though 10.2.3 requires a phase for contentious cases.
- Proposed fix: "ICJ Rep" in template and default; add `parties`; note phase requirement.
- **Status:** FIXED (ruleExporter.ts — 'ICJ Rep' in the template (dispatch default fixed wave 2); parties/phase/seriesLetter/caseNumber/judge and the 10.4.1 unreported variant documented; JSON regenerated).

### icj.pleading | 10.3 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 10.3 (PDF p.191)
- Reference template (verbatim): `'«Document Title»', «Case Name» («Parties' Names») [«Year»] ICJ Pleadings «Starting Page», «Pinpoint» («Speaker's Name»)`
- Engine formatTemplate: "Title (CaseTitle) [Year] ICJ Pleadings Pinpoint."
- Actual rendering: icj.ts:121-175 (dispatch engine.ts:1655) — correct: quoted doc title, comma, italic case name, (parties), [year], volume, page, pinpoint, (speaker)
- Discrepancies: (1) metadata wraps CaseTitle in parentheses; reference has it comma-separated unparenthesised (parentheses hold parties) — metadata contradicts both reference and renderer; (2) Starting Page missing from metadata fields; (3) volume and parties absent from metadata; (4) PCIJ (ser C) variant unsupported.
- Proposed fix: template "'Title', CaseTitle (Parties) [Year] ICJ Pleadings StartingPage, Pinpoint."; add startingPage/parties/volume.
- **Status:** FIXED (ruleExporter.ts — comma-separated case name, parties/volume/page/speaker added, 10.4.2 unreported variant documented. PCIJ (ser C) pleadings remain unsupported by the renderer — remaining gap; JSON regenerated).

### arbitral.state_state | 11.1 | VERDICT: MATCH | SEVERITY: low
- Reference rule + PDF page: 11.1.1 (PDF p.195); 11.1.2 (p.196)
- Reference template (verbatim): reported `«Case Name» («Parties' Names») («Phase») («Year») «Volume» «Report Series» «Starting Page», «Pinpoint»`; unreported `… («Name of Arbitral Body or Tribunal», Case No «Number», «Full Date») «Pinpoint»`
- Engine formatTemplate: "Title (Year) Volume ReportSeries StartingPage, Pinpoint."
- Actual rendering: src/engine/rules/v4/international/arbitral.ts:41-87 (reported), :98-129 (unreported), routed engine.ts:1673 — matches both forms
- Discrepancies: minor — parties/phase folded into Title; unreported variant fields (tribunal/caseNumber/date, supported by formatter) not reflected in metadata.
- Proposed fix: add parties, phase, tribunal, caseNumber, fullDate to optionalFields.
- **Status:** FIXED (ruleExporter.ts — parties/phase and the 11.1.2 unreported fields (tribunal/caseNumber/date/awardDetails) exposed; both forms shown; JSON regenerated).

### arbitral.individual_state | 11.2 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 11.2.1 (PDF p.197); 11.2.2 (p.199)
- Reference template (verbatim): reported `«Parties' Names» («Phase») («Year») «Volume» «Report Series» «Starting Page», «Pinpoint»`; unreported `«Parties' Names» («Phase») («Name of Arbitral Body or Tribunal», Case No «Number», «Full Date») «Pinpoint»`
- Engine formatTemplate: "Title (Tribunal, CaseNumber, Year) Pinpoint."
- Actual rendering: arbitral.ts:148-165 formatIcsidCase (dispatch engine.ts:1704) — italic name + ` (ICSID Case No N, awardType, date)`
- Discrepancies: (1) hardcodes "ICSID Case No"; `tribunal` never passed — non-ICSID impossible, and even ICSID output wrong vs reference `(ICSID Arbitral Tribunal, Case No ARB/01/3, 14 January 2004)`; (2) phase misplaced inside the parenthetical and roman; reference: italic (Phase) after parties; (3) pinpoint in metadata but formatter has no param — silently lost; (4) Year should be Full Date; reported form unrepresentable; (5) required year/tribunal contradict the reported form.
- Proposed fix: mirror formatStateArbitration (italic parties, italic (Phase), (Tribunal, Case No N, FullDate) Pinpoint) + reported variant; template "Title (Phase) (Tribunal, Case No CaseNumber, FullDate) Pinpoint."
- **Status:** FIXED (ruleExporter.ts — parties required; reported (11.2.1) and unreported (11.2.2) forms documented per the wave-1/2 rewrite of formatIcsidCase + dispatch reported branch; year/tribunal no longer required; JSON regenerated).

### icc_tribunal.case | 12.2 | VERDICT: MISMATCH | SEVERITY: medium
- Reference rule + PDF page: 12.2 (PDF p.203); 12.2.1–12.2.7 (pp.203–206)
- Reference template (verbatim): `«Parties' Names» («Phase») («Court», «Chamber», Case No «Case Number», «Full Date») «Pinpoint»`; parties `*Prosecutor v* «Surname»` all italic
- Engine formatTemplate: "Prosecutor v Accused (Tribunal, Chamber, CaseNumber, FullDate) Pinpoint."
- Actual rendering: src/engine/rules/v4/international/icc-tribunals.ts:43-72 (dispatch engine.ts:1718) — order, italics, "Case No", space-separated pinpoint all match
- Discrepancies: (1) metadata omits the (Phase) parenthetical (decisionType in optionalFields never appears in template); (2) template lacks the "Case No" literal; (3) dispatch defaults court to "ICC" (engine.ts:1723) — reference uses shortened names ("International Criminal Court"), never acronyms.
- Proposed fix: template "Prosecutor v Accused (DecisionType) (Tribunal, Chamber, Case No CaseNumber, FullDate) Pinpoint."; default court "International Criminal Court".
- **Status:** FIXED (ruleExporter.ts — phase parenthetical + 'Case No' literal + 12.3 reported variant documented; court/caseNumber optional (reported form carries neither). Dispatch still defaults court to 'ICC' rather than a shortened name — remaining engine-wiring nit; JSON regenerated).

### wto.document | 13.1.2 | VERDICT: GAP | SEVERITY: high
- Reference rule + PDF page: 13.1.2 (PDF p.210)
- Reference template (verbatim): `«Document Title», WTO Doc «Document Number» («Full Date») («Document Description») «Pinpoint»`; adoption variant `(«Full Date», adopted «Full Date»)`
- Engine formatTemplate: "Title, WTO Doc DocumentNumber (Year) Pinpoint."
- Actual rendering: src/engine/rules/v4/international/economic.ts:30-44 (dispatch engine.ts:1735) — italic title, `, WTO Doc N (date)` only
- Discrepancies: (1) Document Description missing from metadata/template/rendering; (2) Year should be Full Date (dispatch reads d.date); (3) pinpoint in optionalFields but formatter has no param — silently lost; (4) adoption-date variant unsupported.
- Proposed fix: add documentDescription/fullDate; add pinpoint + description params; template "…(FullDate) (DocumentDescription) Pinpoint".
- **Status:** FIXED (ruleExporter.ts — documentDescription + FullDate + pinpoint per the wave-1/2 renderer; adoption dates enter via the free-text date field; JSON regenerated).

### wto.decision | 13.1.3 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 13.1.3 (PDF p.212)
- Reference template (verbatim): `«Document Description», «Case Name», WTO Doc «Document Number» («Full Date») «Pinpoint»`; DSR `DSR «Year»:«Volume», «Starting Page»`
- Engine formatTemplate: "Title — DecisionType, WTO Doc DocumentNumber (Year) Pinpoint."
- Actual rendering: economic.ts:76-100 (dispatch engine.ts:1748) — `Description, *Title*, WTO Doc N (date) pinpoint` (default "Panel Report") — correct
- Discrepancies: (1) metadata puts decision type AFTER the title with an em-dash — wrong order and punctuation (the reference em-dash belongs to case-name subtitles, not the description); renderer is correct, metadata contradicts it; (2) decisionType optional but reference: description must be 'Panel Report'/'Appellate Body Report'/'Decision by the Arbitrator' — should be required; (3) Year → Full Date; (4) DSR/unadopted options unsupported.
- Proposed fix: template "DecisionType, Title, WTO Doc DocumentNumber (FullDate) Pinpoint."; decisionType → required; year → fullDate.
- **Status:** FIXED (ruleExporter.ts — 'DocumentDescription, Title, …' order (em-dash form deleted); documentDescription required; FullDate; dsrReference documented; JSON regenerated).

### gatt.document | 13.2 | VERDICT: GAP | SEVERITY: high
- Reference rule + PDF page: 13.2.1 (PDF p.213); 13.2.2 (p.215)
- Reference template (verbatim): `«Document Title», GATT Doc «Document Number» («Full Date») («Document Description») «Pinpoint»`; BISD `GATT BISD «Volume No»/«Starting Page»` / `«Supplement No»S/«Starting Page»`
- Engine formatTemplate: "Title, GATT Doc DocumentNumber (Year) Pinpoint."
- Actual rendering: economic.ts:116-130 (dispatch engine.ts:1764) — italic title `, GATT Doc N (date)` only; a compliant formatGattPanelReport (economic.ts:158-191, BISD + pinpoint logic) exists but is never dispatched
- Discrepancies: (1) documentNumber required but reference includes it only if it appears (early GATT docs cited via BISD); (2) Document Description and BISD missing from metadata and the dispatched formatter; (3) pinpoint dropped (no param); (4) Year → Full Date; (5) 13.2.2 panel-report formatter unreachable; rule number is 13.2.1 not 13.2 (cosmetic).
- Proposed fix: documentNumber → optional; add description/bisdReference/fullDate/pinpoint; wire formatGattPanelReport into dispatch.
- **Status:** FIXED (ruleExporter.ts — documentNumber optional; documentDescription/bisdReference/pinpoint documented; 13.2.2 panel-report variant shown (formatGattPanelReport wired wave 2); JSON regenerated).

### eu.official_journal | 14.2.1 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 14.2.1 (PDF p.219)
- Reference template (verbatim): `«Document Title» [«Year»] OJ «Series» «Issue Number»/«Starting Page», «Pinpoint»`
- Engine formatTemplate: "[Year] OJ OjSeries OjNumber/StartingPage Pinpoint."
- Actual rendering: src/engine/rules/v4/international/supranational.ts:33-52 (dispatch engine.ts:1777) — `InstrumentType, *Title* [Year] OJ Series page`
- Discrepancies: (1) metadata template omits the Document Title element (starts at [Year]) though title is required; (2) template pinpoint lacks the required comma; (3) rendering prepends a non-reference "InstrumentType, " element — and dispatch defaults it to "" so citations without it begin with a stray ", " (supranational.ts:43); (4) pinpoint in metadata but formatter has no param — dropped; (5) ojNumber+startingPage collapsed into one `page` string in rendering.
- Proposed fix: template "Title [Year] OJ OjSeries OjNumber/StartingPage, Pinpoint."; remove/guard instrumentType prefix; add comma-preceded pinpoint; build page from ojNumber/startingPage.
- **Status:** FIXED (ruleExporter.ts — Title leads the template; comma-preceded pinpoint; instrumentType gone (deprecated wave 2); `page` documented as the Number/StartingPage pair; JSON regenerated).

### eu.court | 14.2.3 | VERDICT: GAP | SEVERITY: high
- Reference rule + PDF page: 14.2.3 (PDF p.224)
- Reference template (verbatim): reported `«Parties' Names» («Case Number») [«Year»] «Report Series» «Starting Page», «Pinpoint»`; unreported `«Parties' Names» («Name of Court/Tribunal», «Case Number», «Full Date») «Pinpoint»` (C-/T-/F- prefix retained; optional ECLI)
- Engine formatTemplate: "Title (CaseNumber) [Year] ECR Pinpoint."
- Actual rendering: supranational.ts:122-147 (dispatch engine.ts:1792) — italic name, (caseNumber), [year] series page, trailing ` (court)`
- Discrepancies: (1) Starting Page mandatory in reported form but absent from metadata (formatter has `page`); (2) pinpoint in optionalFields but formatter has no param — dropped, and reference requires ", Pinpoint"; (3) unreported form + ECLI unsupported; `year` required contradicts unreported citations; (4) rendering adds a trailing "(Court)" parenthetical in neither reference form.
- Proposed fix: add startingPage; template "Title (CaseNumber) [Year] ECR StartingPage, Pinpoint."; add pinpoint; add unreported branch; drop trailing court parenthetical.
- **Status:** FIXED (ruleExporter.ts — reported form with page; unreported form with court/ECLI/date/pinpoint per the wave-1/2 formatCjeuUnreportedCase; year no longer required. Reported-form pinpoints remain unsupported by formatCjeuCase — remaining renderer gap; JSON regenerated).

### echr.decision | 14.3.2 | VERDICT: GAP | SEVERITY: medium
- Reference rule + PDF page: 14.3.2 (PDF p.227)
- Reference template (verbatim): to end 1995 `«Parties' Names» («Year») «Volume» Eur Court HR (ser A) «Pinpoint»`; from 1996 `«Parties' Names» [«Year»] «Volume» Eur Court HR «Starting Page», «Pinpoint»`; unreported `«Parties' Names» (European Court of Human Rights, «Chamber», Application No «Number», «Full Date») «Pinpoint»`
- Engine formatTemplate: "Title (European Court of Human Rights, ApplicationNumber, FullDate) Pinpoint."
- Actual rendering: supranational.ts:239-275 formatEchrCase (dispatch engine.ts:1808) — unreported form matches reference exactly; formatEchrReportedCase (supranational.ts:182-228) exists but is never dispatched
- Discrepancies: (1) metadata models only the unreported form and omits «Chamber» from the template; (2) reported forms unrepresentable (no volume/startingPage; applicationNumber required though reported citations carry none); (3) dispatch always uses the unreported formatter — a supplied reportSeries is jammed inside the parenthetical (a form in neither reference variant) while the compliant reported formatter is dead code.
- Proposed fix: add chamber + volume/startingPage; route to formatEchrReportedCase when reportSeries present; applicationNumber → optional.
- **Status:** FIXED (ruleExporter.ts — reported (volume/reportSeries/startingPage) and unreported (chamber/applicationNumber) forms documented; applicationNumber optional; rule number widened to 14.3; formatEchrReportedCase wired wave 2; JSON regenerated).

### supranational.decision | 14.4 | VERDICT: GAP | SEVERITY: medium
- Reference rule + PDF page: 14.4.1 (PDF p.230)
- Reference template (verbatim): `«Parties' Names» «(Phase)» («Name of Court or Tribunal», «Case Number», «Full Date») «Pinpoint»`
- Engine formatTemplate: "Title (Court, CaseNumber, Year) Pinpoint."
- Actual rendering: supranational.ts:293-310 + dispatch engine.ts:1824-1860 — order/punctuation/space-pinpoint match
- Discrepancies: (1) «(Phase)» element (italic per 10.2.3) missing from metadata, template and rendering; (2) metadata requires `year` but reference requires the Full Date and the dispatch reads `d.date` — supplying only metadata-required fields can yield "(Court, n, )"; (3) `reportSeries` optional field corresponds to nothing in the template.
- Proposed fix: add phase; replace year with fullDate in requiredFields/template; drop reportSeries.
- **Status:** FIXED (ruleExporter.ts — date required (year removed); reportSeries dropped. The italic «(Phase)» element remains unmodelled in the renderer — remaining gap; JSON regenerated).

### supranational.document | 14.5 | VERDICT: MISMATCH | SEVERITY: high
- Reference rule + PDF page: 14.5 (PDF p.233)
- Reference template (verbatim): `«Supranational Organisation», «Author or Relevant Body», «Document Title», «Document Number», «Parliament, Council, Session, Meeting, etc», «Full Date», «Pinpoint»` — all comma-separated
- Engine formatTemplate: "Organisation, Title, DocumentNumber (Year) Pinpoint."
- Actual rendering: supranational.ts:329-347 (dispatch engine.ts:1866) — `Body, *Title*, N (date)`
- Discrepancies: (1) the date is a comma-separated element in the reference, NOT parenthesised — both layers parenthesise it, and it should be the Full Date; (2) Author/Relevant Body and session/meeting elements missing from both layers; (3) pinpoint comma-preceded in reference; metadata shows space, rendering drops pinpoints entirely; (4) reference examples use a "Doc No" prefix; (5) documentNumber required but reference permits omission.
- Proposed fix: template "Organisation, Body, Title, Doc No DocumentNumber, Session, FullDate, Pinpoint."; add body/session/fullDate/pinpoint (comma separators, no parentheses).
- **Status:** FIXED (ruleExporter.ts — comma-separated FullDate (no parentheses), 'Doc No' label, body/session/pinpoint per the wave-1/2 renderer; title optional; JSON regenerated).

### Cross-cutting (international)
- Pinpoints listed in metadata but silently dropped by five formatters (wto.document, gatt.document, eu.official_journal, eu.court, arbitral.individual_state).
- "(Year)" used where the reference requires the Full Date across chapters 13–14.
- Compliant formatters exist but are unreachable from dispatch (formatEchrReportedCase, formatGattPanelReport).
- Worst single renderer: formatIcsidCase (hardcoded "ICSID Case No", tribunal ignored, phase misplaced).
## Foreign Domestic Sources (Rules 15–26)

All twelve `foreign.*` entries share the same shape, so they are assessed together; per-type verdicts are in the summary table.

- Engine metadata (ruleExporter.ts:700–871): every entry requires only `title` (foreign.other adds `jurisdiction`), offers generic optionals (authors, year, reportSeries, volume, startingPage, pinpoint, court for the case-law jurisdictions; authors/year/pinpoint for China/France/Germany/other), and every formatTemplate is the placeholder string "See AGLC4 Rule N for format details." — no template is exported at all.
- Reference: chapters 15–26 contain concrete prescriptions and templates. Case-law jurisdictions (15 Canada p.236, 19 Hong Kong p.259, 20 Malaysia p.261, 21 New Zealand p.264, 22 Singapore p.268, 23 South Africa pp.272–3, 24 UK p.276) mostly incorporate chapter 2 with jurisdiction-specific adjustments (eg 24.1.1 UK judicial-review party form `R («Name of Party Seeking Judicial Review»)`, 24.1.2 Law Reports preference and 'LR' volume placement, 24.2.3 regnal years). Chapters 16–18 (China p.245, France p.253, Germany p.256), 25 (USA p.289: 25.1 cases, 25.2 code, 25.3 session laws, 25.4 constitutions, 25.5 delegated legislation) and 26 (Other, p.315) prescribe their own templates.
- Actual rendering: detailed jurisdiction formatters exist in src/engine/rules/v4/foreign/ (canada.ts, china.ts, france.ts, germany.ts, hong-kong.ts, malaysia.ts, new-zealand.ts, singapore.ts, south-africa.ts, uk.ts, usa.ts, other.ts — eg uk.ts formatCase implements 24.1 series-implied courts and EWHC divisions) BUT they are not wired into the dispatcher: all twelve foreign.* types route to the generic heuristic `dispatchForeign` (engine.ts:1889–1939), which guesses case-ness from " v " in the title, concatenates citationDetails/year/court, and falls back to formatGenericCitation. engine.ts references the foreign modules only in a comment (engine.ts:1883); the only importers of rules/v4/foreign/* are tests (tests/engine/chapter15-26.test.ts).

### Verdicts
- foreign.canada | 15 | GAP | medium — reference 15.1.1 (PDF p.236): cases follow ch 2; requiredFields "title" cannot describe a case citation (party names); no template exported; canada.ts formatters unused by dispatch.
- foreign.china | 16 | GAP | medium — ch 16 (PDF p.245) prescribes pinyin/translation templates (16.1–16.4); none exported; china.ts unused by dispatch.
- foreign.france | 17 | GAP | medium — ch 17 (PDF p.253) case/legislation/code templates; none exported; france.ts unused by dispatch.
- foreign.germany | 18 | GAP | medium — ch 18 (PDF p.256) case/code templates; none exported; germany.ts unused by dispatch.
- foreign.hong_kong | 19 | GAP | medium — ch 19 (PDF p.259); as for Canada.
- foreign.malaysia | 20 | GAP | medium — ch 20 (PDF p.261); as for Canada.
- foreign.new_zealand | 21 | GAP | medium — ch 21 (PDF p.264): 21.1.1 cases follow ch 2; 21.1.4–21.1.5 Māori Land Court/Waitangi Tribunal special forms invisible in metadata (a separate report.waitangi_tribunal type exists in the engine but is absent from the export); new-zealand.ts unused by dispatch.
- foreign.singapore | 22 | GAP | medium — ch 22 (PDF p.268); as for Canada.
- foreign.south_africa | 23 | GAP | medium — ch 23 (PDF pp.272–3); as for Canada.
- foreign.uk | 24 | GAP | medium — ch 24 (PDF p.276): despite uk.ts implementing 24.1–24.5 (Law Reports, Scottish reports, regnal years, SIs), dispatch uses the generic heuristic, so eg the 24.1.2 'LR 7 QB' volume placement and 24.2.3 regnal-year forms are unreachable in production.
- foreign.usa | 25 | GAP | medium — ch 25 (PDF p.289) has the most divergent templates (Bluebook-style code/session-law citations, court/jurisdiction parentheticals); "title"-only requiredFields cannot represent them; usa.ts unused by dispatch.
- foreign.other | 26 | GAP | medium — ch 26 (PDF p.315) prescribes translation forms (26.1–26.4); placeholder only.

### Proposed fix (all foreign.*)
1. Wire the jurisdiction modules into dispatchForeign (branch on sub-type: case/legislation/secondary), or document that production output is heuristic-only.
2. In SOURCE_TYPE_METADATA, replace the "See AGLC4 Rule N" placeholders with at least the dominant case template per jurisdiction (for ch 2-incorporating jurisdictions: `Party1 v Party2 [Year] Volume ReportSeries StartingPage, Pinpoint (Court).`), and split required/optional fields per sub-type instead of "title" only.
3. Severity is medium (not high) for the metadata because the placeholder is honest about giving no format; the production-rendering gap (unused formatters) is the more significant engineering finding.

**Status (all 12 foreign.* rows):** FIXED. Fix 1 landed in wave 2 (PARITY-114 — dispatchForeign routes on `foreignSubType` to per-country formatters via dispatchForeignCase/dispatchForeignLegislation, with the generic rendering only as an unstructured-data fallback). Fix 2 landed in PARITY-118 (ruleExporter.ts): every placeholder replaced with per-jurisdiction case/legislation templates plus the fallback note; optionalFields now expose the structured core (foreignSubType, year, yearType, volume, reportSeries, startingPage, citationDetails, court, courtId, pinpoint) and country-specific extras (uk: ewhcDivision/siNumber/regnalYear/chapter; usa: uscTitle/uscSection/supplement; singapore: capNumber/revisedEdition; south_africa: actNumber; other: translatedCaseName/translatedTitle + required jurisdiction). Remaining renderer gaps, noted honestly: canada/china/france/germany/hong_kong/malaysia cases dispatch through the simple shape (no pinpoint, no yearType), and france/germany court decisions still route to the deprecated legacy formatCase rather than formatCourtDecision (handoff/foreign.md §1); templates document what dispatch currently renders. JSON regenerated; dispatch↔metadata parity enforced by tests/engine/rule-exporter.test.ts.
