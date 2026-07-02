# Parity Review: Obiter Reference Data & Styling vs AGLC4 Derived Reference

Date: 2026-07-02
Reference: `/Users/matthew.watt/aglc/aglc4-rule-reference.md` (derived from AGLC4 PDF)
Engine: `/Users/matthew.watt/aglc/obiter/src/engine/`

**Scope caveats**
- AGLC4 appendices A–C are **absent from the source PDF**, so only in-chapter tables are comparable. Where a dataset's authority is an appendix (the bulk of `report-series.ts`, `uk-report-series.ts`, `nz-report-series.ts`, lower-court identifiers, and appendix-C pinpoints), entries beyond the in-chapter tables are marked **UNVERIFIED**, not wrong — unless they contradict an in-chapter row or illustration.
- There is **no `src/engine/formatter.ts`**. Chapter-1 styling is enforced in `src/engine/rules/v4/general/*.ts`, `src/engine/validator.ts`, `src/word/styles.ts`, and `src/word/inlineFormatter.ts`; those were audited instead.

## Summary table

| # | Area | Verdict | Severity |
|---|------|---------|----------|
| A1 | Court identifiers (r 2.3.1) vs `court-identifiers.ts` | GAP | high |
| A2 | Judicial office abbreviations (r 2.4.1/2.4.5) | GAP | high |
| A3 | Jurisdiction abbreviations (r 3.1.3) | MATCH | low |
| A4 | Report series (r 2.2.2/2.2.3) vs `report-series.ts` | MISMATCH | high |
| A5 | Pinpoint abbreviations (r 1.1.6/3.1.4) vs `pinpoint-abbrevs.ts` | GAP | high |
| A6 | UK report series (r 24.1.2–24.1.4) vs `uk-report-series.ts` | MISMATCH | high |
| A7 | UK court identifiers (r 24.1.5) vs `uk-court-identifiers.ts` | MISMATCH | medium |
| A8 | UK judicial titles (r 24.1.6) | GAP | medium |
| A9 | UK legislation abbreviations (r 24.2–24.3) | MISMATCH | high |
| A10 | NZ court identifiers (r 21.1.3–21.1.4) vs `nz-court-identifiers.ts` | MISMATCH | high |
| A11 | NZ report series (r 21.1.2) vs `nz-report-series.ts` | UNVERIFIED | medium |
| A12 | NZ legislation (r 21.2) | MATCH | low |
| A13 | Latin terms (r 1.8.3, 1.4.3, 2.1.8–2.1.11) vs `latin-terms.ts` | MISMATCH | high |
| B1 | 1.5 Quotations | MISMATCH | high |
| B2 | 1.6.3 Dashes | MISMATCH | medium |
| B3 | 1.7 Capitalisation | MISMATCH | high |
| B4 | 1.8 Italicisation | MISMATCH | high |
| B5 | 1.10 Numbers, currency, units | MISMATCH | high |
| B6 | 1.11 Dates and time | GAP | medium |

Counts: MATCH 2 · MISMATCH 11 · GAP 5 · UNVERIFIED 1 (area-level; per-row UNVERIFIED items noted inline).

---

# Part A — Data

## A1. Court identifiers (rule 2.3.1, PDF pp.79–81) — GAP, high

**Status:** FIXED (src/engine/data/court-identifiers.ts — HCASL/FamCA/FamCAFC/NTCCA/TASCCA added; `mncFrom`/`mncTo` year fields added and populated from the 2.3.1 table; header corrected. Wave 2: validator.ts `checkMncYearValidity` enforces `mncFrom` — flags MNC years predating the court's adoption year, wired into validateDocument. Low-severity fullName inversions unchanged; AAT retained UNVERIFIED pending Appendix B.)

Source: table at reference lines 1626–1654. Engine: `src/engine/data/court-identifiers.ts` (array lines 20–247).
Counts: 25 distinct reference identifiers; 20 matched; **5 missing**; 18 engine-only (17 appendix-B-plausible, UNVERIFIED).

Missing in-chapter identifiers (errors, not appendix items):
- **HCASL** — "High Court of Australia — Special Leave Dispositions | HCASL | 2008–" (PDF p.80). Absent. Fix: add. **high**
- **FamCA** — "Family Court of Australia | FamCA | 1998–" (PDF p.80). Absent from the identifier dataset (FamCAFC exists only in `report-series.ts:64` mis-shelved as a report series). Fix: add. **high**
- **FamCAFC** — "Family Court of Australia — Full Court | FamCAFC | 2008–" (PDF p.80). Absent. Fix: add. **high**
- **NTCCA** (2000–) and **TASCCA** (2010–) — absent (NT has only NTSC/NTCA at lines 170–181; Tas only TASSC/TASFC at 142–153). Fix: add. **medium**

Structural gap:
- The reference table's **Years column** (e.g. FCA 1999–, FCA Full Court 1999–2001, FCAFC 2002–) and the rule's prohibition on medium neutral citations predating those years are not modelled — `CourtIdentifier` (court-identifiers.ts:1–14) has no validity-year fields. Fix: add `mncFrom`/`mncTo` and populate. **medium**

Low-severity notes:
- fullName inversions vs the reference ("New South Wales Court of Appeal" vs engine "Court of Appeal of New South Wales", court-identifiers.ts:48; similarly ACTCA:164, NTCA:178, QCA:95, VSCA:80, WASCA:130, NSWCCA:54) — breaks name search (`searchCourtIdentifiers`, :252–259). **low**
- `AAT` (:185) coexists with `AATA` (:191); "AAT" as a citation identifier is doubtful — UNVERIFIED pending Appendix B. **low**
- File comment (:18) claims "Source: AGLC4 Appendix B" yet omits five in-chapter identifiers.
- Engine-only, appendix-plausible (UNVERIFIED): FCCA, NSWDC, NSWLEC, VCC, QDC, SADC, WADC, AATA, FWC, NCAT, VCAT, QCAT, SACAT, SAT, TASCAT, ACAT, NTCAT.

## A2. Judicial office abbreviations (rule 2.4.1 table, PDF pp.83–85; plurals r 2.4.5, PDF p.87) — GAP, high

**Status:** FIXED (dataset: new src/engine/data/judicial-titles.ts — AU_JUDICIAL_TITLES, all 30 rows, `titleBeforeName` + plurals incl AJ→AJJ/SJ→SJJ) / HANDOFF (engine wiring: cases-supplementary.ts formatJudicialOfficers branch, plural map replacement, JSDoc renumbering — see scratchpad handoff/datasets.md §1).

Source: 30-row table at reference lines 1740–1771. Engine: **no canonical dataset exists.** The only encoding is the plural map in `src/engine/rules/v4/domestic/cases-supplementary.ts:18–25` — `{ J: "JJ", JA: "JJA", AJA: "AJJA" }`; titles are otherwise free-form strings (`src/types/citation.ts:57`).
Counts: 30 reference rows; 6 represented (3 only as plural outputs); **24 with no engine presence** (ACJ, AJ, AJJ, AP, AsJ, AUJ, CJA, CJ at CL, CJ in Eq, CJ Comm D, CJ, Commissioner*, DCJ, FM, Judge*, JR, Magistrate*, Master*, P, SJA, SJ, SJJ, SPJ, V-P).

- **Asterisked offices actively contradicted** — the reference (line 1737, PDF p.84) requires Commissioner/Judge/Magistrate/Master to appear **in full before the name** (illustration 93: "(Commissioner Buss)"). `formatJudicialOfficers` always emits name-then-title (cases-supplementary.ts:122, 141), producing "(Buss Commissioner)". Fix: encode the 30-row table as typed data in `src/engine/data/` with a `titleBeforeName` flag and branch. **high**
- Plural map missing `AJ→AJJ` and `SJ→SJJ` (reference lines 1745–1746, 1768–1769) — two Acting Justices render "X and Y AJ". Fix: extend map. **medium**
- No validation table: nothing stops "VP" for `V-P` or "ASJ" for `AsJ`. Fix: normalise/validate against the table. **high**
- Agreement pinpoints ("Webb J agreeing at 591", r 2.4.2) and "for the Court" (r 2.4.3) have no representation in the `role` union (cases-supplementary.ts:70). **medium**
- JSDoc rule numbers wrong: pluralisation attributed to "2.4.2" (:15, actual 2.4.5); dissent to "2.4.3" (:52, actual 2.4.2); agreeing to "2.4.4" (:55, actual 2.4.2). Fix: renumber (traceability policy). **low**

## A3. Jurisdiction abbreviations (rule 3.1.3, PDF p.93) — MATCH, low

9/9 exact matches (Cth, ACT, NSW, NT, Qld, SA, Tas, Vic, WA) in `src/types/citation.ts:68–77` and `rules/v4/domestic/legislation-supplementary.ts:30–40`; emitted verbatim by `legislation.ts` (formatStatute :112/124, formatBill :248/260). No missing/extra rows.
Minor: `court-identifiers.ts` uses all-caps `"CTH"/"VIC"/"QLD"/"TAS"` jurisdiction values (e.g. :22, :75, :90, :145) — internal inconsistency that will break joins with `AustralianJurisdiction`; and formatStatute/formatBill take `jurisdiction: string` unvalidated. **low**

## A4. Report series (rules 2.2.2–2.2.3, PDF pp.75–76) — MISMATCH, high

**Status:** FIXED (src/engine/data/report-series.ts + src/engine/court/reportHierarchy.ts — QR deleted, Qd R authorised; SR (NSW) authorised/renamed; 7 historical series added; NTLR & WAR flipped to volume-organised (exx 60, 93); WASR & 'Fam CA' deleted; MNC identifiers flagged `mediumNeutral`; IR/BCLC duplicates disambiguated via getByAbbreviation jurisdiction param; SR (SA) renamed) / DEFERRED (NSWLR/VR/Tas R/ACTLR/ALJR yearOrganised flags — provisional, Appendix A / DATA-004; ACTR tier ambiguity routed to decisions.md via handoff §7) / FIXED (wave 2: reportHierarchy.ts preference logic now ranks `mediumNeutral`-flagged rows with the MNC tier, below subject-specific unauthorised series per rule 2.2.2 — getDefaultPreferenceRank + getRankInHierarchy, tests in court-report-hierarchy.test.ts) / HANDOFF (cases.ts SERIES_TO_COURT/tier sets; medium_neutral union migration incl AbbreviationLookup.tsx — handoff §§2–3).

Source: authorised table lines 1514–1533 (20 rows) + named unauthorised series (line 1535) + 2.2.2 examples. Engine: `src/engine/data/report-series.ts`.
Counts: 10/20 authorised rows matched; 5/5 named unauthorised matched; **7 missing**; **2 wrong status**; ~135 engine-only (UNVERIFIED, Appendix A) except two contradictions below.

- **Fabricated "QR" usurps Qd R** — reference "Queensland | Qd R | 1958–" (PDF p.76). Engine has `QR`/"Queensland Reports"/`authorised` (report-series.ts:88) — not an AGLC4 abbreviation — while `Qd R` (:538) is typed `unauthorised_generalist` with fullName "Queensland Reports (historical)". Fix: delete/aliase QR; make Qd R authorised. **high**
- **SR (NSW) wrong status** — in the authorised table (1901–59, PDF p.76); engine (:554) types it `unauthorised_generalist` and misnames it. Fix: `authorised`, fullName "State Reports (New South Wales)". **high**
- **7 authorised historical series missing**: NSWR, St R Qd, SALR, Tas LR, Tas SR, VLR, WALR (all rows of the 2.2.3 table, PDF p.76). Pre-1971 NSW / pre-1958 Qld etc citations cannot be classified. Fix: add as `authorised`. **high**
- **NTLR bracket style contradicts illustration 60** — "(2013) 33 NTLR 65" (PDF p.75) is volume-organised; engine (:148) has `yearOrganised: true`. Fix: `false`. **high**
- **Medium neutral identifiers mistyped "authorised"** — 2.2.2 ranks unreported MNCs *below* all report series, but the whole MNC section (:152–460) plus FCAFC (:56)/FamCAFC (:64) is typed `authorised` in a 3-value enum (:19). Preference logic keyed on type ranks an unreported HCA equal to CLR. Fix: add a `medium_neutral` type; retype. **high**
- **WASR** (:104, typed authorised) contradicts the in-chapter WA rows (WALR/WAR only; State Reports (WA) = "SR (WA)", separately at :530). Fix: delete. **medium**
- Duplicate abbreviation keys break `getByAbbreviation` (:1659, first-match): `BCLC` (:726 vs :906), `IR` (:590 vs :1402); `SR (SA)` fullName collides with SASR; `Fam CA` (:718) duplicates `FamCA` (:182) with a space. **medium**
- ACTR ambiguity: authorised/preferred table (line 1516) vs 2.2.2 unauthorised example (line 1491); engine (:546) follows 2.2.2 but types the analogous NTR authorised (:136). Reference itself ambiguous → **log to docs/decisions.md**. **low**
- Suspected `yearOrganised: true` errors on NSWLR (:76), VR (:84), WAR (:116), Tas R (:124), ACTLR (:132), ALJR (:478) — all volume-organised in practice; in-chapter table gives coverage years only. **UNVERIFIED, medium** — verify against Appendix A.

## A5. Pinpoint abbreviations (rules 1.1.6 / 3.1.4, PDF pp.29–31, 94–96) — GAP, high

**Status:** FIXED (src/engine/data/pinpoint-abbrevs.ts — sub-s/sub-ss, sub-para(s), sub-div(s), sub-cl(s), app(s), ord added; header re-attributed to rule 3.1.4 with the 1.1.6 para caveat; hyphen-variant normalisation in getPinpointAbbreviation; reg/col/ln tagged provisional.)

Source: 13-row table lines 2028–2040 + `ord`/`r` notes (lines 2049–2050) + `n`/`nn` (1.1.6/1.1.7). Engine: `src/engine/data/pinpoint-abbrevs.ts` (:11–25).
Counts: 16 checkable rows; 10 exact matches; **6 missing**; 3 engine-only (reg, col, ln — UNVERIFIED, appendix C).

Every present row is exactly correct; the gaps:
- **subsection `sub-s`/`sub-ss`** missing (line 2040; breaks 3.1.5's own example 'sub-ss (2)–(3)'); `getPinpointAbbreviation` (:37–39) falls through to the literal word. **high**
- **sub-paragraph `sub-para`/`sub-paras`** missing (line 2039). **high**
- **subdivision `sub-div`/`sub-divs`** missing (line 2038; illustration 'pt 7 div 3 sub-div 8'). **high**
- **sub-clause `sub-cl`/`sub-cls`** missing (line 2037). **medium**
- **appendix `app`/`apps`** missing (line 2028). **medium**
- **order `ord`** missing (notes lines 2049–2050 — note it is `ord`, not `O`). **medium**
- Header comment (:7–9) attributes the set to rule 1.1.6, but 1.1.6 reserves `para` for legislative materials; most rows are 3.1.4/appendix C. Risk of `para` being applied to case/journal paragraph pinpoints (which take square brackets). **low**

## A6. UK report series (rules 24.1.2–24.1.4, PDF pp.276–278) — MISMATCH, high

**Status:** FIXED (data: src/engine/data/uk-report-series.ts — Ch D/QBD/PD/Ex D + 12 LR-prefixed series (LR P&D unspaced) + LR RP + RR added; bare 'Ex' flagged likely-wrong/provisional) / HANDOFF (engine wiring: LR volume-placement rule and Scottish bare-year style in uk.ts — handoff §6).

Source: 25-row table (24 distinct), reference lines 6236–6262. Engine: `src/engine/data/uk-report-series.ts` (95 entries).
Counts: 9 rows / 8 distinct matched (AC, App Cas, Ch, CPD, Fam, P, QB×2, KB); **16 missing**; 87 engine-only (WLR, All ER, SLT, SC (HL), ER, M & W corroborated by illustrations; ~80 UNVERIFIED appendix/OSCOLA).

- **The entire Law Reports predecessor family is missing**: LR Adm & Eccl, Ch D, LR Ch App, LR CP, LR CCR, LR HL, LR Eq, Ex D, LR Ex, LR PC, PD, LR P&D (no spaces around &), QBD, LR QB, LR Sc & Div (all PDF pp.276–277) and LR RP (1957–72). `HL Cas` (:105) is a different nominate series, not a substitute for LR HL. Fix: add all 16. **high**
- **Bare `Ex` entry** (:81–87, `yearOrganised: true`) appears nowhere in the chapter; AGLC4 prescribes `Ex D` (1875–80). Fix: add Ex D; flag Ex UNVERIFIED/likely wrong. **high**
- **LR volume-placement rule unencoded** — "place the volume number between 'LR' and the remainder" ('LR 4 PC 60', illustration 5). `formatCase` (`rules/v4/foreign/uk.ts:126–137`) always emits volume before the whole series string → '4 LR PC 60'. Fix: special-case LR-prefixed series. **high**
- **Scottish bare-year style unsupported** — 24.1.4: year-organised Scottish series take no brackets ('2008 SLT 1049'); `formatCase` (uk.ts:23–24, 123–125) supports only `round | square`. Fix: add a bare/`none` year type. **medium**
- `RR` (Revised Reports, r 24.1.3) missing. **low**

## A7. UK court identifiers (rule 24.1.5, PDF pp.279–280) — MISMATCH, medium

**Status:** FIXED (src/engine/data/uk-court-identifiers.ts — HCJT added (2005–); unparenthesised 'EWHC Admin' (2001–02) added; HCJ annotated OSCOLA/BAILII-only. fullName variances unchanged — low.)

Source: 23-row table, reference lines 6306–6330. Engine: `src/engine/data/uk-court-identifiers.ts` (44 entries).
Counts: 21 matched exactly (incl. spacing/parentheses); **2 missing**; 21 engine-only UNVERIFIED (UKUT/UKFTT/EWCOP/EWHC (KB)/NIKB etc — post-2022 or OSCOLA/BAILII-plausible).

- **HCJT missing** — "Scotland High Court of Justiciary — Trial Court | HCJT | 2005–" (PDF p.279). Engine instead has non-AGLC `HCJ` (:262); and `UK_SERIES_IMPLIED_COURT` (uk.ts:66) already expects "HCJT" — dataset/rules-layer inconsistency. Fix: add HCJT; keep HCJ only for OSCOLA if needed. **medium**
- **`EWHC Admin` (2001–02 unparenthesised form) missing** — only `EWHC (Admin)` (:112) exists; '[2001] EWHC Admin 64' cannot be produced. Fix: add the year-dependent variant. **medium**
- fullName variances (e.g. "United Kingdom Supreme Court" vs ref "Supreme Court of the United Kingdom", :49). **low**

## A8. UK judicial titles (rule 24.1.6, PDF pp.281–282) — GAP, medium

**Status:** FIXED (dataset: judicial-titles.ts UK_JUDICIAL_TITLES — all 21 rows, DPSC per the table (not the 'DP' misprint, DECISION-012), asterisked before-name flags, LJ→LJJ) / HANDOFF (uk.ts wiring; JSC plural has no reference backing so none encoded — handoff §§1, 6).

Source: 21-row table, reference lines 6347–6369. Engine: **nothing** — 0/21 encoded anywhere (uk.ts has none; cases-supplementary.ts is rule 2.4 only; authors.ts:74 "Baroness" is the rule 4.1 list).
- No dataset, no before-name placement for asterisked titles (Baroness*, Judge*, Lord*, Lord Commissioner*, Master*, Recorder*, Registrar*). Fix: add `UK_JUDICIAL_TITLES` with `beforeName` flag. **medium**
- Plural map lacks `LJ→LJJ` (illustration "James, Baggallay and Bramwell LJJ", line 6374) and `JSC→JJSC`. **medium**
- Implementer note: reference anomaly at line 6377 ('Lord Hope DP' vs table's `DPSC`) — follow the table.

## A9. UK legislation abbreviations (rules 24.2–24.3, PDF pp.283–286) — MISMATCH, high

**Status:** HANDOFF (engine wiring — uk.ts is outside dataset scope; monarch and instrument-type tables transcribed for the implementing agent in handoff §6).

Source: 24.2.2 jurisdiction table (6 rows), 24.2.3 monarch table (14 rows), 24.3 instrument-type table (4 rows). Engine: `rules/v4/foreign/uk.ts` (no datasets).
Counts: ~4 of 24 rows matched by behaviour; **20 missing as data**; 2 engine-extras (SSI/WSI — OSCOLA-only, fine if the AGLC4 path never routes through `oscola/legislation.ts:66–71`).

- **Instrument type hardcoded to SI** — `formatStatutoryInstrument` (uk.ts:266–282, :274) always emits `SI`; the 24.3 table requires `SR & O` (UK 1890–1947) and `SR` (NI) — illustrations 40/42 unreproducible. Fix: add `instrumentType` field per table. **high**
- **Missing comma before SI pinpoint** — 24.3 requires 'SI 2001/2600, r 4'; engine emits ` ${data.pinpoint}` with no comma (uk.ts:277–279). Fix: prepend `, `. **high**
- **Monarch table (14 rows) unencoded**, and JSDoc examples contradict it: '39 & 40 Geo III' (uk.ts:164), '12 & 13 Will III' (:191, :195) — AGLC4 uses Arabic numerals and `Wm` ('12 & 13 Wm 3'). Fix: add table; correct examples. **medium**
- Pre-1963 omit-jurisdiction behaviour correct (uk.ts:203–212), but JSDoc example at :191 shows '(UK)' on a pre-1963 statute, contradicting the function's own output. **low**
- Rule-number drift throughout uk.ts JSDoc (24.3–24.4/24.5 instead of 24.2/24.3/24.4.x). **low**
- Adjacent findings (outside the tables): `formatHansard` (uk.ts:319–335) fails to italicise *Parliamentary Debates* (24.4.1 template, line 6512) — **high** for that formatter; no 24.4.3 Parliamentary Papers formatter — **medium**.

## A10. NZ court identifiers (rules 21.1.3–21.1.4, PDF pp.265–266) — MISMATCH, high

**Status:** FIXED (src/engine/data/nz-court-identifiers.ts — all six years aligned to the 21.1.3 table; NZ_MINUTE_BOOKS (MB/ACMB/CJMB) added; MAORI_LAND_COURT_BLOCKS documented NZLSG-only; NZDC tagged provisional; NZTRA/NZPSPLA labels corrected) / HANDOFF (21.1.4 formatter wiring; AGLC4-vs-NZLII divergence routed to decisions.md via handoff §7).

Source: 6-row identifier table + 3-row minute-book table. Engine: `src/engine/data/nz-court-identifiers.ts`.
Counts: 6 codes present but **0 rows fully match — every adoption year is wrong**; 3 minute-book rows missing; 18 identifiers + 8 block abbreviations engine-only (UNVERIFIED/NZLSG).

The years are load-bearing: 21.1.3 applies identifiers "only from the years indicated", else rule 2.3.2 applies.
- NZSC: ref 2005– vs engine `neutralCitationFrom: 2004` (:44). **high**
- NZCA: ref 2007– vs 2003 (:50). **high**
- NZHC: ref 2012– vs 2003 (:56) — engine would emit an MNC for the reference's own illustration 10 (2010 HC decision expressly "pre-dating NZHC identifiers"). **high**
- NZEmpC: ref 2010– vs 2003 (:94). **high**
- NZEnvC: ref 2010– vs 2003 (:88). **high**
- NZFC: ref 2012– vs 2004 (:72). **high**
- Minute-book table (MB, ACMB, CJMB — 21.1.4) unencoded in v4; `nzlsg/maori-land-court.ts:64` takes free text; ACMB/CJMB appear nowhere. **medium**
- `MAORI_LAND_COURT_BLOCKS` (:207–216) abbreviates registries ("AOT") where AGLC4 21.1.4 examples spell them out ("173 Aotea MB 114") and lacks "Hauraki" — keep NZLSG-scoped only. **medium**
- NZDC has `neutralCitationFrom: 2003` (:63) though the District Court is absent from the AGLC4 table entirely — UNVERIFIED, treat with caution. Internal oddities: NZTRA labelled "Tenancy Tribunal" (:150), NZPSPLA "Police Conduct Authority" (:168) — likely mislabelled. **low**

## A11. NZ report series (rule 21.1.2, PDF p.264) — UNVERIFIED, medium

**Status:** FIXED (src/engine/data/nz-report-series.ts — duplicate NZAR/NZCPR rows removed, survivors tagged provisional; NZPC/NZPCC and GLR tagged provisional) / HANDOFF (new-zealand.ts NZAR treatment and 21.1.4 path — engine wiring).

Chapter 21 names only NZLR (authorised/preferred) and shows NZBLC in illustration 3; both match (`nz-report-series.ts:29–36`, :133–140). The other 28 entries are appendix-authority UNVERIFIED. Defects found regardless of authority:
- Duplicate abbreviations: `NZAR` (:50 vs :246), `NZCPR` (:182 vs :254); `getNZReportSeriesByAbbreviation` (:294–296) silently returns the first. `NZPC` (:150) and `NZPCC` (:230) both claim "New Zealand Privy Council Cases" with different types. Fix: dedupe; verify vs Appendix A. **medium**
- `GLR` typed `authorised` (:38) with no chapter authority (only NZLR is authorised in-chapter). **UNVERIFIED**
- `rules/v4/foreign/new-zealand.ts:50` treats NZAR as a primary series (no in-chapter standing) and JSDoc :58–61 claims Maori Land Court uses "NZ Maori LR" — contradicts 21.1.4 minute-book citation; `specialCourt` field (:40) declared but unused, so 21.1.4 is unimplemented in the v4 path. **medium**

## A12. NZ legislation (rule 21.2, PDF p.267) — MATCH, low

`formatLegislation` (new-zealand.ts:255–271) and `formatDelegatedLegislation` (:196–220) reproduce illustrations 16 and 17 exactly (incl. 'SR 2003/288, reg 4').
- Doc-only: JSDoc :244–245 and banner :235 cite "Rule 21.3" for delegated legislation; correct number is 21.2.2 (21.3 is "Other"/NZLSG referral). **low**

## A13. Latin terms (rules 1.8.3, 1.4.3, 2.1.8–2.1.11) — MISMATCH, high

**Status:** FIXED (src/engine/data/latin-terms.ts — same fix as review-ch1 HIGH-1: 15 inverted terms moved to LATIN_TERMS_EXCEPTIONS; all 29 not-italicised rule terms encoded; 4 missing italicised terms added; 'obiter dicta'/'dicta'/'dictum'/'bona fides' moved as variants of listed forms; ~40 Macquarie-dependent engine-only terms kept provisional — DEFERRED to decisions.md entry via wave-1 ch1 handoff. 'ex rel' not added — 2.1.10 is a case-name element, out of this dataset's scope)

Source: 1.8.3 lists 29 terms NOT italicised + 7 italicised (PDF p.52). Engine: `src/engine/data/latin-terms.ts`; consumed by `validator.ts:642–701` and `src/word/inlineFormatter.ts` (which **applies** italics automatically).
Counts: 41 checkable reference rows; 7 matched; **15 inverted**; 16 missing (4 material); ~70 engine-only UNVERIFIED.

- **15 expressly-NOT-italicised terms are in `LATIN_TERMS_ITALICISED`**: ab initio (:28), amicus curiae (:30), bona fide (:32), de facto (:38), de jure (:39), ex parte (:46), habeas corpus (:48), inter alia (:57), obiter dictum (:76), per se (:80), prima facie (:81), ratio decidendi (:91), res ipsa loquitur (:92), sui generis (:97), ultra vires (:100). inlineFormatter actively italicises them — direct contravention ("obiter dictum" itself included). The file's own header (:112–114) names "de facto"/"bona fide" as exceptions while the data says italicise. Fix: move all 15 to `LATIN_TERMS_EXCEPTIONS`. **high**
- **4 of 7 must-italicise terms missing**: *contra proferentem*, *ex ante*, *jus ad bellum*, *ne bis in idem* (PDF p.52). Fix: add. **medium**
- "obiter dicta" (:75), "dicta" (:41), "dictum" (:42) italicised — same defect by parity; bare "dictum"/"dicta" also false-positive inside "obiter dictum". **medium**
- 11 not-italicised terms absent from the exceptions set (ad idem, caveat emptor, ex gratia, ex post facto, laissez-faire, non-refoulement, non est factum, quid pro quo, raison d'être, terra nullius, vis-a-vis) — benign (default roman) but incomplete. **low**
- "re" in exceptions (:127) is safe only if never applied inside case names (2.1.8 italicises *Re* there); "ex rel" (2.1.10) absent. **low**
- ~59 engine-only italicised entries (mens rea, actus reus, certiorari, mandamus, quasi, in camera, modus operandi, de novo, pro rata…) are Macquarie-dependent — **UNVERIFIED; per project policy route to docs/decisions.md**, don't guess. Header JSDoc (:9–11) misquotes the 1.8.3 list. **medium aggregate**

---

# Part B — Styling (chapter 1)

## B1. Rule 1.5 Quotations (PDF pp.40–46) — MISMATCH, high

**Status:** PARTIAL — ellipsis inversion FIXED (validator.ts, Styling.tsx, referenceGuide.ts); long-quote threshold/doc FIXED (four+ lines, ~360-char heuristic; Styling.tsx wording corrected); 1.5.7 clauses FIXED (checkQuotationClauses lint + five-clause dropdown in table order). GAPs remain WONTFIX (manual): nested quotation marks, 1.5.3 no-stop-after-ellipsis details, 1.5.6 closing-punctuation placement, 1.5.2 introductions, 1.5.5 [sic] lint

Implementation: `validator.ts:513–615` (ellipsis, long-quote checks), :440–478 (quote-mark typography); `src/word/styles.ts:117–125` (Block Quote style); `src/ui/views/Styling.tsx:271–320` (QUOTE-001).

- **Ellipsis rule inverted** — 1.5.3 (PDF p.43): omissions use '…' preceded and followed by a space. Engine (validator.ts:510–511, 540–551) mandates Bluebook '. . .' and **flags the correct '…' as an error**. Fix: invert — require ' … '; flag '...'/'. . .'. **high**
- **Long-quote threshold wrong/inconsistent** — 1.5.1: short = three lines or less; long = four+. validator.ts:562–571 docstring says "three or more lines" (styles.ts:118 says four — modules disagree); actual check is a 250-char proxy (:587); QUOTE-001 triggers on "3+ paragraphs" (Styling.tsx:270–273), unrelated to line count. Fix: correct docs; base heuristic on estimated lines (~4×90 chars). **medium**
- GAP: nested quotation marks (double-within-single for short; alternating single-first for long) — no nesting-aware logic (validator.ts:448–475). **medium**
- GAP: 1.5.3 details (no full stop after ellipsis; long quote ending mid-sentence takes ellipsis, also 1.5.6). **medium**
- GAP: 1.5.6 closing-punctuation placement (inside/outside). **medium**
- GAP: 1.5.7 fixed parenthetical clauses — '(emphasis added)', '(citations omitted)' etc., exact forms ("never '(citation omitted)'/'(emphases added)'") and ordering: zero implementation (grep-confirmed). Cheap lint available. **medium**
- GAP: 1.5.2 introducing quotations; 1.5.5 '[sic]' lint. **low**
- Positive: Block Quote style (10 pt, 0.5″ indent, no quote marks) matches 1.5.1; straight→curly single-quote flags correct.

## B2. Rule 1.6.3 Dashes (PDF p.48) — MISMATCH, medium

**Status:** FIXED (punctuation.ts — invented em-dash spacing ban removed per DECISION-013; `--` between digits now becomes an en-dash; hyphen→en-dash scoped to plausible spans, identifiers preserved). GAP (en-dash for concept tension) WONTFIX — needs semantics

Implementation: `rules/v4/general/punctuation.ts:89–159` (checkDashes/fixDashes), wired at validator.ts:444–445.

- **Invented em-dash spacing ban** — the rule band says nothing about spacing, and the Guide's own illustration (1.8.2, ref line 977) uses spaced em-dashes ("provision — s 39(1) — of"). Engine warns "Em-dashes should not have surrounding spaces" (punctuation.ts:106–118) and fixDashes (:153) strips the spaces, rewriting conformant text. Fix: drop or invert; **log to docs/decisions.md** (rule band silent). **medium**
- En-dash for numeric spans: MATCH (punctuation.ts:122, U+2013).
- `--` between digits becomes em-dash not en-dash (fix order, :102 vs number-span rule). **low**
- GAP: en-dash for concept tension ('tort–contract') vs slash — needs semantics. **low**

## B3. Rule 1.7 Capitalisation (PDF pp.49–51) — MISMATCH, high

**Status:** PARTIAL — preposition list, last-word rule, hyphen and subtitle handling FIXED (capitalisation.ts). validateCapitalisation remains an exported helper used by tests/consumers; not wired into validateDocument as an auto-suggester — WONTFIX for now (toTitleCase corrections on arbitrary titles false-positive on proper nouns). Vocabulary tables (Act, Crown, …/common law, …) and Court/State rules WONTFIX (body-text, manual)

Implementation: `rules/v4/general/capitalisation.ts:16–128` (toTitleCase, validateCapitalisation); validator.ts:934–1000 (heuristic only). Note `validateCapitalisation` is dead code — never wired into validateDocument.

- **Preposition rule narrower than the reference** — ref (line 919, PDF p.50) lowercases articles, conjunctions and prepositions with **no letter-count limit**, its own examples including six-letter 'before' and 'within'. Engine hardcodes a 10-word "4 or fewer letters" set (capitalisation.ts:19–33), so 'before', 'within', 'under', 'between', 'through', 'upon' etc get capitalised. Fix: full preposition list (at minimum the reference's examples); correct the JSDoc. **high**
- **Forced last-word capitalisation is not an AGLC4 rule** (capitalisation.ts:94–97) — Chicago/Bluebook import. Fix: remove; add subtitle handling (capitalise first word after ':'/'—') which 1.7 does require. **medium**
- GAP: capitalise the word after a hyphen in hyphenated words — toTitleCase splits on whitespace only ("Self-determination" never "Self-Determination"). **medium**
- GAP: the always-capitalised vocabulary table (Act, Attorney-General, Crown, Parliament, Prime Minister…) and lowercase list (common law, government, internet…), plus Court/State specific-vs-general rules — no data file, no check. **medium**
- GAP: foreign-language phrases keep their own conventions. **low**

## B4. Rule 1.8 Italicisation (PDF pp.51–52) — MISMATCH, high

**Status:** PARTIAL — 1.8.3 list inversion FIXED (see A13). Titles-inside-quotations skip: INVALID (did not reproduce — `isInsideQuotationMarks` is called only from the Latin-terms pass (`scanAndFormatLatinTerms`); the 1.8.2 title pass has never skipped quoted text, verified against pre-wave-1 history; clarifying comment added to src/word/inlineFormatter.ts). 1.8.1 emphasis-added tracking WONTFIX (manual; Styling.tsx Add Emphasis button covers the workflow)

Implementation: `rules/v4/general/italicisation.ts:24–127`; `data/latin-terms.ts`; validator.ts:642–701; `src/word/inlineFormatter.ts:131–240`.

- 1.8.2 source-title matrix: **MATCH** (cases/legislation/books/treaties/media italic; articles/chapters in single quotes — italicisation.ts:24–42).
- **1.8.3 Latin list inverted for 15 terms** — see A13 (same dataset). Validator flags e.g. "'prima facie' should be italicised per Rule 1.8.3" and inlineFormatter applies it. **high**
- **Titles inside quotations not italicised** — 1.8.2 applies "inside quotations, however the title appeared in the source". inlineFormatter (:85, isInsideQuotationMarks) skips everything inside quotes; defensible for Latin terms, wrong for titles. Fix: quote-skip only the Latin pass. **medium**
- 4 of 7 must-italicise terms missing (see A13). **medium**
- GAP: 1.8.1 added-emphasis must trigger '(emphasis added)' — untracked (ties to B1/1.5.7). **low**

## B5. Rule 1.10 Numbers, Currency and Units (PDF pp.54–55) — MISMATCH, high

**Status:** PARTIAL — comma inversion FIXED (numbers.ts checkNumberFormatting/formatNumber per rule; exceptions for years/pinpoints/IDs); numeral false positives FIXED (citation-element/percentage/ratio/series exclusions); span truncation helper FIXED (formatNumberSpan; engine emission sites to adopt it via handoff). Sentence-start numeral, millions-in-words, 1.10.2 currency, 1.10.3 units WONTFIX (manual)

Implementation: `rules/v4/general/numbers.ts:8–81`; wired via validator.ts:490–497 over footnote texts.

- **Comma rule exactly inverted** — 1.10.1: numbers of 4+ digits take commas ('4,150'; Guide's own footnote prints '65,131'), except years, page/para numbers, ID numbers. Engine claims the opposite (numbers.ts:27–31 "should not use comma separators"), `formatNumber` strips commas, `checkNumberFormatting` (:47–61) flags every comma-grouped number. The engine auto-suggests non-compliant output. Fix: invert; suppress for year-like/pinpoint/ID contexts. **high**
- Words-under-10 threshold: MATCH (numberToWords :17–22). Minor: zero → "0" not 'zero'. **low**
- **Numeral false positives in footnotes** — the words-for-1–9 check runs over footnotes where 1.10.1 explicitly requires numerals for citation elements ('s 5' flagged). Fix: whitelist after s/ss/pt/cl/ch/ed/brackets, or skip footnotes. **medium**
- GAP: **page/pinpoint span truncation** — '87–8', '436–62', but keep two digits when last two fall in 10–19 ('11–14', '215–19'): no implementation anywhere; affects every span the engine emits. **medium**
- GAP: never begin a sentence with a numeral. **medium**
- GAP: millions/billions in words; ordinals; 1.10.2 currency (no space, 'AUD1.3 million'); 1.10.3 units ('50 mg'). **low**

## B6. Rule 1.11 Dates and Time (PDF pp.56–58) — GAP, medium

**Status:** PARTIAL — checkDateSpans wired into validateDocument and renumbered to 1.11.4 (dates.ts, validator.ts); 1.11.5 decade-apostrophe lint added (checkDateFormatting). 1.11.2 time formats and 1.11.3 point-in-time WONTFIX (manual, no formatter demand yet); weekday form WONTFIX

Implementation: `rules/v4/general/dates.ts:51–137, 152–295`; only `checkDateFormatting` is wired (validator.ts:490–497).

- 1.11.1 full date: **MATCH** ('Day Month Year', cardinal, full month; flags US commas/ordinals/abbreviated months; en-dash constant is true U+2013, dates.ts:141).
- 1.11.4 year spans and date spans: **MATCH** ('2001–08'; '21–22 September 2018' unspaced; '21 September – 3 October 2018' spaced).
- **checkDateSpans is dead code** (exported :241, never imported by validator) and mislabels spans as "1.11.3" (:269, :285; formatYearSpan docstring likewise) — spans are 1.11.4. Fix: wire in (or delete) and renumber. **medium**
- GAP: 1.11.2 time formats ('12:01am', 24-hour '13:00', comma before time in citations) — none. **medium**
- GAP: 1.11.3 point-in-time ('0:43:00') — none, though media types exist. **medium**
- GAP: 1.11.4 time spans; 1.11.5 decades ('1970s' never "1970's") — trivial lint absent. **low**
- Minor GAP: weekday form ('Thursday 6 March 1987', no comma) unchecked. **low**

---

# Cross-cutting recommendations

1. Fix the three **inverted** rules first (B5 commas, B1 ellipsis, A13/B4 Latin italics) — these actively rewrite/flag correct text into non-compliance.
2. Fix the six NZ adoption years (A10) — single-file, mechanical, changes which rule applies.
3. Add the missing in-chapter rows: 5 AU court identifiers, 7 authorised report series + Qd R/SR (NSW) status, 6 pinpoint abbreviations, 16 UK LR-family series, HCJT.
4. Create typed datasets for the two judicial-title tables (2.4.1 with `titleBeforeName`; 24.1.6 with `beforeName`) and the UK monarch/instrument-type tables.
5. Route genuinely ambiguous items to `docs/decisions.md` per project policy: ACTR status, em-dash spacing, Macquarie-dependent Latin terms, `yearOrganised` flags pending Appendix A.
6. Dead code/wiring: `validateCapitalisation` and `checkDateSpans` are never invoked; duplicate-abbreviation keys (BCLC, IR, NZAR, NZCPR) silently shadow entries in first-match lookups.
7. Documentation drift: rule-number JSDoc errors in cases-supplementary.ts (2.4.x), uk.ts (24.x), new-zealand.ts (21.3), dates.ts (1.11.3), pinpoint-abbrevs.ts (1.1.6), latin-terms.ts header — this project requires rule-number traceability.
