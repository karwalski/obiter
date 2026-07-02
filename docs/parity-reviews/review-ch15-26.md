# Parity review — AGLC4 Part V (Chapters 15–26) vs Obiter engine

Reference: `/Users/matthew.watt/aglc/aglc4-rule-reference.md` lines 5169–7491 (+ consolidated anomalies catalogue lines 7492+).
Engine: `/Users/matthew.watt/aglc/obiter/src/engine/rules/v4/foreign/*.ts`, `src/engine/data/{uk,nz}-*.ts`, `irish-courts.ts`, `src/engine/engine.ts` (dispatchForeign).
Tests: `/Users/matthew.watt/aglc/obiter/tests/engine/chapter15-26.test.ts`.
Prior claims: `docs/aglc4-audit.md` (CH15+), `docs/aglc4-coverage.md`.

Verdict key: MATCH (engine output can reproduce the AGLC4 form when called correctly) · MISMATCH (engine cannot, or produces contrary output) · GAP (rule not implemented) · ANOMALY-RISK (implementation/docs/data teach or permit non-AGLC4 forms) · MANUAL-OK (guidance rule, correctly left manual) · UNVERIFIED.

## Cross-cutting findings (read first)

**X-1 (HIGH) — The chapter 15–26 formatters are dead code in the live engine.**
`src/engine/engine.ts:1889` `dispatchForeign` handles all twelve `foreign.*` source types with one generic passthrough. Its own comment (engine.ts:1883) claims "each foreign jurisdiction has its own formatters (src/engine/rules/v4/foreign/*)", but nothing in `src/` imports those modules — only the test file does. Consequences in live output:
- Foreign **legislation titles are not italicised** (engine.ts:1902–1905: `italic: isCase`, and `isCase` is true only when the name contains " v " or `foreignSubType === "case"`). Violates 17.2, 18.2, 19.2, 20.2, 22.2, 23.2, 26.3 (all require italic titles).
- Pinpoints are always comma-prefixed (engine.ts:1935), but legislation pinpoints in ch 15–26 follow a space (eg `(France) art 147`, `(Hong Kong) cap 8, s 4`).
- Everything else (report series, JO/BGBl gazettes, cap numbers, regnal years) is a raw `citationDetails` string typed by the user.
The coverage doc does disclose the passthrough design ("The user enters the citation in the format of the foreign jurisdiction; Obiter wraps it") but still labels all 12 chapters "Full", and the wrapper itself is wrong for legislation. Fix: either wire the `foreign/*` modules into `SOURCE_DISPATCH`, or fix `dispatchForeign` italics/pinpoint logic and downgrade the coverage doc.

**X-2 (MEDIUM) — Prior audit overstates.** `docs/aglc4-audit.md` marks PASS for rules that demonstrably fail: 16.1/16.2 (China), 17.1 (France cases), 18.1 (Germany cases), 24.1.3 (nominate parallel ER), 24.1.4 (Scottish bare year), 25.3 (session-law year omission), 25.7 (Restatements), 26.1.1 (translation marker), 26.2 (decisions). `docs/aglc4-coverage.md` claims "Full" for all 12 chapters. Rows marked AUDIT/FIX/IMPL in aglc4-audit.md (15.4, 15.5, 16.3, 16.4, 21.1.4, 21.3, 23.x FIX, 24.1.6, 24.4.3, 25.1.7, 25.1.8, 25.4 FIX, 25.6, 26.1.2, 26.4) are acknowledged gaps — noted per-rule below.

**X-3 — No anomaly leakage found (good).** Greps across `src/engine` for the Guide's own printed errors: `"DP"` (24.1.6 'Lord Hope DP' vs DPSC), `Assistant Justice` (25.1.8), `NY Stat` (25.3.5 ex 66), `Ji Cheng`/`Zhengrong` (16.2.1 pinyin errors), `Pa Con Stat` (25.2.2), and the 17.2.x wrong cross-ref `25.1.1` — all clean. Largely because the relevant tables (UK/US judicial titles, session-laws table, Chinese pinyin) are not implemented at all; if they are implemented later, use DPSC, 'Associate Justice', 'NY Laws', 'Ji Ceng', 'Shi Zhongrong', and cross-ref 26.1.1.

**X-4 (LOW) — Systematic rule-number mislabels in JSDoc.** canada.ts/china.ts/france.ts/germany.ts/hong-kong.ts headers say "Part IV — Foreign Cases and Legislation" (should be Part V — ironically mirroring the Guide's own wrong running header at PDF p.255). usa.ts labels USC as "Rule 25.4", session laws "25.5", Constitution "25.6", CFR/Cong Rec "25.7", Restatements "25.8" (actual: 25.2, 25.3, 25.4, 25.5/25.6, 25.7). canada.ts labels statutes "Rule 15.4" and constitution "15.5" (actual 15.2, 15.3). china.ts invents a "Rule 16.4: PRC abbreviation" (16.4 is secondary sources). Violates the project rule that JSDoc quotes the actual AGLC4 rule.

## Summary table

| Rule | Subject | Verdict | Severity |
|---|---|---|---|
| 15.1.1 | Canada cases general | MATCH | — |
| 15.1.2 | Canada report series (DLR round-bracket year) | MISMATCH | medium |
| 15.2.1–15.2.2, 15.2.4–15.2.5 | Canada statutes | MATCH | — |
| 15.2.3 | Year with session/supplement (`RSC 1985 (1st Supp), c 27`) | GAP | low |
| 15.3.1 | Federal constitution fixed forms | GAP | medium |
| 15.3.2 | Provincial constitutions | MATCH | — |
| 15.4.1–15.4.3 | Canadian regulations (CRC/SOR/provincial table) | GAP (ack'd: audit AUDIT; coverage says Full) | medium |
| 15.5 | Defer to Canadian Guide | MANUAL-OK | — |
| 16.1 | Chinese script/guillemets/translations | MISMATCH | high |
| 16.2.1 | Reported Chinese cases | MISMATCH | high |
| 16.2.2 | Chinese report series preference | GAP (unack'd — audit says PASS under 16.2) | low |
| 16.2.3 | Unreported Chinese judgments | GAP | medium |
| 16.3.1 | Chinese legislative acts | MISMATCH | high |
| 16.3.2 | Chinese constitutions | GAP (partially ack'd: audit 16.3 AUDIT) | low |
| 16.4.1–16.4.2 | Chinese secondary sources / author names | GAP (ack'd: audit AUDIT) | low |
| 17.1 | French cases (4 court patterns, 'reported in') | MISMATCH | high |
| 17.2.1 | French individual laws (JO, date) | MISMATCH | medium |
| 17.2.2 | French codes | MATCH (base form; translation roman not supported) | low |
| 17.2.3 | French Constitution | ANOMALY-RISK (translation italicised; wrong title in JSDoc) | medium |
| 18.1 | German cases | MISMATCH | high |
| 18.2.1 | German individual laws (date + BGBl) | MISMATCH | medium |
| 18.2.2 | German codes | MATCH (base; short-title mechanics manual) | — |
| 18.2.3 | Grundgesetz | MATCH (base; translation italics caveat) | low |
| 19.1 | Hong Kong cases | MATCH (series-implies-court set wrong: HKCA/HKCFA not series) | low |
| 19.2.1 | HK ordinances | ANOMALY-RISK (JSDoc teaches '(HK)'; AGLC4 requires '(Hong Kong)') | medium |
| 19.2.2 | HK Basic Law | MATCH | — |
| 20.1 / 20.1.1 | Malaysian cases / series preference | MATCH / MANUAL-OK (Sdn Bhd, Datuk/Haji omission unenforced) | low |
| 20.1.2 | Malaysian unreported (no MNC allowed) | MANUAL-OK (via generic 2.3.2; no guard against invented MNCs) | low |
| 20.2.1 / 20.2.2 | Malaysian legislation / Constitution | MATCH | — |
| 21.1.1 / 21.1.2 | NZ cases / series | MATCH | — |
| 21.1.3 | NZ unreported MNC — formatting | MATCH | — |
| 21.1.3 (data) | NZ identifier years in `nz-court-identifiers.ts` | MISMATCH | medium |
| 21.1.4 | Māori Land Court / Appellate Court minute books | GAP (ack'd: audit AUDIT; `specialCourt` field declared, never used) | medium |
| 21.1.5 | Waitangi Tribunal | MATCH | — |
| 21.2.1 / 21.2.2 | NZ statutes / delegated (SR) | MATCH | — |
| 21.3 | Defer to NZ Law Style Guide | MANUAL-OK | — |
| 22.1.1 / 22.1.3 | Singapore cases / MNC | MATCH | — |
| 22.1.2 | SLR(R)/SLR/MLJ year-based preference | MANUAL-OK (not enforced/validated) | low |
| 22.2.1 | Singapore statutes (cap / rev ed) | MATCH + ANOMALY-RISK (JSDoc teaches 'Cap'/'Rev Ed'; AGLC4: 'cap'/'rev ed') | medium |
| 22.2.2 | Singapore constitutional documents | MISMATCH | medium |
| 23.1.1 | SA cases general | MATCH + ANOMALY-RISK (JSDoc example is SA-native '1995 (3) SA 391 (CC)'; `division` param invites banned geographic forms) | medium |
| 23.1.2 | SA report series | MANUAL-OK | — |
| 23.2.1 | SA statutes | ANOMALY-RISK (`actNumber` path emits '*Act 4 of 2000*' style, contrary to ch 3 title-year form) | medium |
| 23.2.2 | SA constitutions | MATCH | — |
| 23.3 | TRC reports (cite as ch 6 book) | MISMATCH (formatCase isTRC hack, not book format) | low |
| 24.1.1 | UK cases general | MATCH | — |
| 24.1.2 | Law Reports preference + table | GAP (data missing LR-prefixed & 1875–90 series; 'LR 7 QB' volume-placement rule nowhere) | medium |
| 24.1.3 | Nominate reports + parallel ER/RR | GAP (unack'd — audit PASS) | medium |
| 24.1.4 | Scottish reports (bare year, no brackets) | MISMATCH (unack'd — audit PASS; test admits "simplified") | high |
| 24.1.5 | UK MNC formatting | MATCH | — |
| 24.1.5 (data) | `uk-court-identifiers.ts` | ANOMALY-RISK (no HCJT; no 'EWHC Admin' 2001–02 form; no year validity) | low |
| 24.1.6 | UK judicial titles (DPSC/PSC/JSC table) | GAP (ack'd: audit AUDIT; no 'DP' leakage) | medium |
| 24.2.1–24.2.2 | UK title/year, jurisdiction | MATCH (pre-1963 no-jurisdiction only via regnalYear branch) | low |
| 24.2.3 | Regnal year and chapter | MATCH + ANOMALY-RISK (JSDoc example '12 & 13 Will III' — AGLC4: 'Wm' + Arabic numeral) | medium |
| 24.2.4 | Pinpoints after regnal year | MATCH | — |
| 24.3 | Delegated legislation (SI / SR & O / NI SR) | MISMATCH (hardcodes 'SI'; table's SR & O and NI SR unreachable) | medium |
| 24.4.1 | Hansard modern / historical | MATCH / GAP (Cobbett's) | low |
| 24.4.2 | Command papers | MATCH | — |
| 24.4.3 | Parliamentary papers | GAP (ack'd: audit AUDIT) | medium |
| 24.5 | Defer to OSCOLA | MANUAL-OK | — |
| 25.1.1–25.1.2, 25.1.4–25.1.6 | US case elements | MATCH | — |
| 25.1.3 | Reporters; pre-1875 parallel form '17 US (4 Wheat) 316' | MATCH (base) / GAP (parallel form, caller workaround) | low |
| 25.1.7 | US unreported (docket, slip op) | GAP (ack'd: audit AUDIT) | medium |
| 25.1.8 | US judges (J/PJ/JAD) | GAP (ack'd; no 'Assistant Justice' leakage) | low |
| 25.2.x | USC/code citations | MATCH (year passed via misnamed `supplement` field; state code names/publishers via caller strings) | low |
| 25.3.x | Session laws | MISMATCH (25.3.7 year wrongly always emitted — test admits) + GAP (ch numbers, Priv L, state session laws, 25.3.8) | medium |
| 25.4 | Constitutions | MATCH (federal) / GAP (state constitutions — hardcoded title; test admits) | medium |
| 25.5.1 | CFR | MATCH / GAP (Fed Reg form) | medium |
| 25.5.2 | State delegated legislation | GAP (unack'd — audit lists only 25.5 CFR PASS) | low |
| 25.6.1 | Congressional Record | MISMATCH (unack'd in behaviour; audit 25.6 AUDIT) | high |
| 25.6.2 | Bills and resolutions | GAP (ack'd under 25.6 AUDIT) | medium |
| 25.7 | Restatements | MISMATCH (unack'd — audit PASS) | high |
| 25.8 | Defer to Bluebook | MANUAL-OK | — |
| 26.1.1 | Author translations ('[tr author]' / '[tr Name]') | MISMATCH (unack'd — audit PASS) | high |
| 26.1.2 | Published translations | GAP (ack'd: audit AUDIT) | medium |
| 26.2 | Other foreign decisions | MISMATCH (code bug: year dropped when volume present; no 'reported in' element order) | high |
| 26.3 | Other foreign legislation | MATCH (base) / GAP ('other information' elements) | low |
| 26.4 | Other non-English materials | GAP (ack'd: audit AUDIT) | low |
| Data: `nz-report-series.ts` | duplicate NZAR (l.50, l.246) and NZCPR (l.182, l.254) entries | ANOMALY-RISK | low |
| Data: `irish-courts.ts` | Ireland has no AGLC4 chapter; ch 26 territory | UNVERIFIED (no AGLC4 source to verify against; harmless as lookup data) | — |

Counts: MATCH 31 · MISMATCH 13 · GAP 19 · ANOMALY-RISK 8 · MANUAL-OK 8 · UNVERIFIED 1 (some rules carry two verdicts; counted once each per row above).

## Detail blocks

### X-1 dispatchForeign is the live path and mis-formats legislation (HIGH)
- **Rule:** all of Part V (esp. 17.2/18.2/19.2/20.2/22.2/23.2/26.3, PDF pp.253–320).
- **Requirement:** foreign legislation titles italicised; jurisdiction-specific elements per chapter.
- **Engine:** `src/engine/engine.ts:1889–1939`. Title italic only if `" v "` in name or subtype "case" (line 1902–1905); pinpoint always `", "`-prefixed (line 1935); no use of `rules/v4/foreign/*`.
- **Fix:** wire `foreign/*` formatters into `SOURCE_DISPATCH` keyed by `foreignSubType`, or minimally italicise legislation titles and use space-joined pinpoints for legislation subtypes. Update aglc4-coverage.md from "Full" to "Partial/Manual".
- **Severity:** high.

### 15.1.2 Canadian volume-organised series get square-bracket years (MEDIUM)
- **Rule:** 15.1.2 (PDF p.236) via 2.2.3–2.2.4; example 5: `Bangoura v Washington Post (2005) 258 DLR (4th) 341 (Ontario Court of Appeal)`.
- **Engine:** `foreign/canada.ts:49` hardcodes `[${data.year}]`. Test (chapter15-26.test.ts:86–96) masks with `toContain("(Ontario Court of Appeal)")` — the actual output is `... [2005] 258 DLR (4th) 341 ...`.
- **Fix:** add `yearType: "round" | "square"` as in nz/singapore/uk modules. (Superscript ordinal `4ᵗʰ` per 1.10.1 also unsupported — low.)
- **Severity:** medium.

### 15.3.1 / 15.4 Canadian constitution fixed forms and regulations (MEDIUM)
- **Rule:** 15.3.1 (PDF p.240) mandates exact forms `*Canada Act 1982* (UK) c 11, sch B ('*Constitution Act 1982*')` incl. mandatory italic short title; 15.4.1–15.4.3 (PDF pp.241–242) CRC / `SOR/98-580` / provincial table.
- **Engine:** `canada.ts:134` formatConstitution is generic italic-title+pinpoint (cannot emit roman/italic short-title mix). No regulations function; `formatLegislation` cannot emit `Title, CRC, c 289` because jurisdiction prints only when `year` is also present (canada.ts:101).
- **Coverage doc:** says "Full" — not acknowledged there; audit marks 15.4 AUDIT (acknowledged).
- **Severity:** medium.

### Chapter 16 China — wholesale divergence (HIGH)
- **Rule:** 16.1–16.3 (PDF pp.245–249). Chinese characters between guillemets « », never italicised; translations in square brackets after each element; reported case template `«Case Name» [Year] Issue Series Page, Pinpoint`; legislative acts `«Title» [translation] (Jurisdiction) Body, Order No X, Full Date, Pinpoint`.
- **Engine:** `foreign/china.ts:42–77` italicises the case name, uses round `(year)` instead of `[year]`, has no guillemet/translation support; `formatLegislation` (china.ts:98) emits `(jurisdiction, year)` parenthetical — a form appearing nowhere in ch 16. 16.2.3 unreported and 16.3.2 constitutions unimplemented.
- **Prior claims:** audit CH16-001/002 PASS — wrong; coverage "Full" — wrong.
- **Fix:** rewrite module around 16.1's script rules (guillemets when italics would apply, bracketed translations, pinyin for natural persons) or explicitly reclassify ch 16 as manual in the coverage doc and route to `dispatchForeign` with corrected italics rules.
- **Severity:** high.

### 17.1 French cases (HIGH)
- **Rule:** 17.1 (PDF pp.253–255): court-name-first patterns, eg `Cour de cassation [French Court of Cassation], 06-81968, 5 December 2006 reported in (2006) Bull crim nº 304, 1095`; court name roman, translation bracketed, 'reported in' dropped when unreported; ECLI after case number.
- **Engine:** `foreign/france.ts:42–72`: italic case name, court in parens after the name, `[year]`, series+page. No date, no 'reported in', no translations, no ECLI. Test (chapter15-26.test.ts:223 analogue for Germany; France cases untested) — audit CH17-001 PASS is wrong.
- **Fix:** new data shape `{ court, translation, caseNumber, ecli, date, reportedIn? }`; popular case name as optional italic prefix w/ roman comma.
- **Severity:** high.

### 17.2.1 French individual laws (MEDIUM)
- **Rule:** 17.2.1 (PDF pp.254–255): `*Loi nº 91-662 du 13 juillet 1991* [Law No 91-662 ...] (France) JO, 19 July 1991, 9521` — translation roman, JO + full date mandatory. (NB the Guide's own text miscites '25.1.1' here; correct cross-ref is 26.1.1 — do not copy '25.1.1' into JSDoc.)
- **Engine:** `france.ts:91–118`: `title year (France) pinpoint` — year between title and jurisdiction is not an AGLC4 element; no translation slot (a bracketed translation passed inside `title` becomes italic, violating 26.1.1); JO/date only via pinpoint hack.
- **Severity:** medium.

### 17.2.3 / 18.2.3 constitution translations italicised (MEDIUM)
- **Rule:** 26.1.1 (PDF p.315): translated titles never italicised. 17.2.3/18.2.3 fixed forms pair italic French/German title + roman bracketed translation.
- **Engine:** formatConstitution in france.ts:136/germany.ts:140 has a single italic `title` param; test chapter15-26.test.ts:204–208 passes the translation inside it → whole string italic. france.ts JSDoc also teaches a wrong title ("Constitution of the French Republic").
- **Fix:** add `translation` param emitted as roman ` [${translation}]`.
- **Severity:** medium.

### 18.1 German cases (HIGH)
- **Rule:** 18.1 (PDF pp.256–257): `Bundesgerichtshof [German Federal Court of Justice], VII ZR 110/83, 19 January 1984 reported in (1984) 89 BGHZ 376, 378` — court roman + translation, docket number, full date, 'reported in'.
- **Engine:** `foreign/germany.ts:44–75`: italic case name + `(year) vol series page`; court suppressed when series ∈ {BVerfGE, BGHZ, BGHSt} — but in 18.1 the court name is the mandatory leading element, never suppressed. Test (chapter15-26.test.ts:223–234) stuffs court+docket+date+"reported in" into `caseName`, silently italicising all of it, and asserts only `toContain`.
- **Severity:** high. (18.2.1 individual laws share France's 17.2.1 problem — engine emits `title year (Germany)`, cannot emit `(Germany) 27 April 2009, BGBl I, 2009, 951` except via pinpoint hack — medium.)

### 19.2.1 Hong Kong jurisdiction string (MEDIUM)
- **Rule:** 19.2.1 (PDF p.260): jurisdiction written `(Hong Kong)`; eg `*Evidence Ordinance* (Hong Kong) cap 8, s 4`.
- **Engine:** `foreign/hong-kong.ts:73–78` JSDoc prescribes `jurisdiction: "HK"` → output `(HK)`. Mechanically correct if callers pass "Hong Kong" (tests do), but the documented API contract teaches the wrong form. Also `hong-kong.ts:58` series set contains "HKCA"/"HKCFA", which are court identifiers not report series (authorised series are HKLRD, HKCFAR, HKLR; unauthorised HKC).
- **Fix:** default jurisdiction to "Hong Kong"; correct the series set to {HKLRD, HKCFAR, HKLR, HKC}.
- **Severity:** medium (docs), low (series set).

### 21.1.3 NZ court-identifier years contradict the AGLC4 table (MEDIUM)

**Status:** FIXED (src/engine/data/nz-court-identifiers.ts — NZSC 2005, NZCA 2007, NZHC 2012, NZEmpC 2010, NZEnvC 2010, NZFC 2012 per the 21.1.3 table; AGLC4-vs-NZLII divergence routed to docs/decisions.md via scratchpad handoff/datasets.md §7).
- **Rule:** 21.1.3 (PDF p.265) table: NZSC 2005–, NZCA 2007–, NZHC 2012–, NZEmpC 2010–, NZEnvC 2010–, NZFC 2012–. Decisions outside those ranges must use rule 2.3.2.
- **Engine:** `src/engine/data/nz-court-identifiers.ts` `neutralCitationFrom`: NZSC 2004 (l.44), NZCA 2003 (l.50), NZHC 2003 (l.56), NZFC 2004 (l.72), NZEnvC 2003 (l.87), NZEmpC 2003 (l.93). These look like real-world NZLII adoption dates, but AGLC4 is the project's absolute authority. Currently nothing consumes `neutralCitationFrom`, so the wrong years are latent — they will bite if used for MNC validation.
- **Fix:** align the six AGLC4-listed courts to the table (or store both values with the AGLC4 one authoritative); log the AGLC4-vs-reality divergence in docs/decisions.md for researchers.
- **Severity:** medium.

### 21.1.4 Māori Land Court unimplemented but interface pretends (MEDIUM)
- **Rule:** 21.1.4 (PDF pp.265–266): `*O'Rorke v Hohaia — Pukekohatu 7B Block* (2006) 173 Aotea MB 114, 117 [12]–[13] (Judge Harvey)` — em-dash block name, registry + MB/ACMB/CJMB minute-book abbreviations.
- **Engine:** `foreign/new-zealand.ts:40` declares `specialCourt?: "MaoriLandCourt" | "WaitangiTribunal"` on NZCaseData but `formatCase` never reads it; JSDoc (l.60–61) invents an abbreviation "NZ Maori LR" that appears nowhere in AGLC4. Audit marks 21.1.4 AUDIT (acknowledged); coverage says "Full" (not acknowledged).
- **Fix:** implement a `formatMaoriLandCourt` (parties, optional `— Block`, `(year) caseNo registry MB page`) or delete the dead field and JSDoc claim.
- **Severity:** medium.

### 22.2.1 / 22.2.2 Singapore capitalisation and constitutional parenthetical (MEDIUM)
- **Rule:** 22.2.1 (PDF p.270): `(Singapore, cap 4, 1985 rev ed)` — lowercase 'cap', 'rev ed'. 22.2.2 (PDF p.271): constitutional documents follow 22.2.1 with revision/reprint info in place of a chapter number: `*Constitution of the Republic of Singapore* (Singapore, 1999 reprint) ss 9–16`.
- **Engine:** `foreign/singapore.ts:119–121` JSDoc/params teach `capNumber: "Cap 224"`, `revisedEdition: "2008 Rev Ed"` (wrong case — tests at chapter15-26.test.ts:523 use the correct lowercase, so only the API docs mislead). `singapore.ts:158–176`: `isConstitution` suppresses the entire parenthetical, so example 14's `(Singapore, 1999 reprint)` is unreachable in that mode (workaround: don't set `isConstitution`).
- **Fix:** normalise or document lowercase; make `isConstitution` accept reprint/revision info instead of suppressing the parenthetical.
- **Severity:** medium.

### 23.1.1 / 23.2.1 South Africa native-style leakage (MEDIUM)
- **Rule:** 23.1.1 (PDF pp.272–273): AGLC4 form is `*S v Manamela* [2000] 3 SA 1 (Constitutional Court)`; geographic locations must be omitted from division names ('Local Division', not 'Witwatersrand Local Division'). 23.2.1 (PDF p.274): ch 3 style — `*Local Government Transition Act 1993* (South Africa)`.
- **Engine:** `foreign/south-africa.ts:101–107` JSDoc example is the SA-native `S v Makwanyane 1995 (3) SA 391 (CC)` — the function cannot even produce that shape (round yearType yields `(1995) 3 SA 391`), and '(CC)' contradicts the 23.1.1 court-name table. The `division` param (south-africa.ts:46, 140–141) invites 'A'/'T' letters, ie geographic division codes AGLC4 bans. `formatLegislation` (south-africa.ts:201–205) emits `*Title Act 4 of 2000*` when `actNumber` is set — an 'Act No of Year' style foreign to ch 3/23.2.1. Audit already marks 23.1.1/23.2.1/23.2.2 FIX (acknowledged). Tests use the correct square form, so MATCH is achievable; the risk is the API steering users to SA-native output.
- **Fix:** drop `division` and `actNumber` (or map actNumber → validation warning), correct JSDoc examples.
- **Severity:** medium.

### 23.3 TRC reports (LOW)
- **Rule:** 23.3 (PDF p.275): cite as a chapter 6 book — `Truth and Reconciliation Commission of South Africa, *Report* (1998–2003) vol 3, 155` (author roman, title italic).
- **Engine:** `south-africa.ts:113–117` isTRC branch of formatCase italicises the first field (the author) and appends `trcDetails` raw.
- **Fix:** route TRC to the ch 6 book formatter.
- **Severity:** low.

### 24.1.2 Law Reports data gaps (MEDIUM)

**Status:** FIXED (data: src/engine/data/uk-report-series.ts — Ex D added alongside flagged 'Ex'; Ch D/QBD/PD and all 12 LR-prefixed series + LR RP added) / HANDOFF ('LR «vol» QB' volume-placement rule is formatter work in uk.ts — handoff §6).
- **Rule:** 24.1.2 (PDF pp.276–277): table includes App Cas, Ch D, QBD, PD, Ex D and eleven 'LR'-prefixed 1865–75 series; volume goes inside 'LR x QB'.
- **Engine:** `src/engine/data/uk-report-series.ts` has AC/QB/KB/Ch/Fam/P/App Cas but 'Ex' instead of 'Ex D' (l.81) and none of Ch D, QBD, PD, CPD-era LR-prefixed series (LR QB, LR Ch App, LR Eq, LR HL, LR PC, LR CP, LR CCR, LR Ex, LR P&D, LR Adm & Eccl, LR RP, LR Sc & Div). No code implements the 'LR «vol» QB' volume-placement rule. Data feeds only the AbbreviationLookup UI (`src/ui/views/AbbreviationLookup.tsx`), so impact is lookup completeness, not formatting.
- **Severity:** medium.

### 24.1.3 Nominate reports — no parallel ER/RR (MEDIUM)
- **Rule:** 24.1.3 (PDF p.278): parallel citation mandatory: `*Russel v Lee* (1661) 1 Lev 86; 83 ER 310`.
- **Engine:** `foreign/uk.ts` formatCase has no parallel-citation support; test chapter15-26.test.ts:684–698 openly tests "the base nominate report portion" only. Audit CH24-003 PASS overstates.
- **Fix:** add `parallel?: { volume, series: "ER"|"RR", page, pinpoint? }` emitting `; 83 ER 310, 315`.
- **Severity:** medium.

### 24.1.4 Scottish bare-year unsupported (HIGH)
- **Rule:** 24.1.4 (PDF p.278): year-organised Scottish series take a bare year — `*Logan v Harrower* 2008 SLT 1049`, `*Brown v Hamilton District Council* 1983 SC (HL) 1`.
- **Engine:** `foreign/uk.ts:123–125` supports only `"round" | "square"` — output is `(1992) SC 385`, never `1992 SC 385`. Test chapter15-26.test.ts:701–718 admits it matches "in a simplified way" and asserts only `toContain("1992")`. Audit CH24-004 PASS is wrong.
- **Fix:** add `yearType: "none"` (or `scottish: true`) emitting ` ${year}`.
- **Severity:** high.

### 24.1.6 UK judicial titles table (MEDIUM, anomaly-sensitive)

**Status:** FIXED (dataset: new src/engine/data/judicial-titles.ts UK_JUDICIAL_TITLES — 21 rows, DPSC per the table (DECISION-012; 'DP' misprint not copied), before-name asterisked titles, LJ→LJJ) / HANDOFF (uk.ts wiring — handoff §1).
- **Rule:** 24.1.6 (PDF pp.281–282): DPSC/PSC/JSC/LJ/MR/V-C etc; asterisked titles precede the name. Guide's own example band misprints 'Lord Hope DP' (catalogue entry) — DPSC is correct.
- **Engine:** not implemented anywhere (`grep DPSC src/engine` → only NZ/Irish data files, unrelated). GAP acknowledged (audit CH24-006 AUDIT). When implementing, use DPSC — do not copy the 'DP' example.
- **Severity:** medium.

### 24.2.3 regnal JSDoc example wrong (MEDIUM, doc-level)
- **Rule:** 24.2.3 (PDF pp.283–284): monarch abbreviations table — William → 'Wm'; regnal numbers in Arabic ('2 & 3 Wm 4').
- **Engine:** `foreign/uk.ts:164,191–196` example: `regnalYear: "12 & 13 Will III"` — 'Will' and Roman 'III' both contradict the table. Output is caller-supplied so tests (which use correct 'Edw 7', 'Eliz 2', 'Vict', 'Hen 6') pass; the JSDoc misleads integrators. No monarch-abbreviation data/validation exists (latent GAP).
- **Severity:** medium (documentation), low (behaviour).

### 24.3 SR & O / NI SR instrument types unreachable (MEDIUM)
- **Rule:** 24.3 (PDF pp.285–286) table: UK 1890–1947 → 'SR & O'; NI → 'SR'; example 42 `*Work at Height Regulations (Northern Ireland) 2005* (NI) SR 2005/279`.
- **Engine:** `foreign/uk.ts:274` hardcodes `SI ${year}/${number}`.
- **Fix:** add `instrumentType?: "SI" | "SR" | "SR & O"` defaulting by jurisdiction/date.
- **Severity:** medium.

### 25.3 Session laws year logic (MEDIUM)
- **Rule:** 25.3.7 (PDF p.309): omit the parenthesised year when it already appears in the title or when a state session-laws year-volume is present. Also 25.3.2 chapter numbers ('ch'), Priv L No, and state session laws (25.3.4–25.3.5 table).
- **Engine:** `foreign/usa.ts:215–233` always appends `(${data.year})` — `*Detainee Treatment Act of 2005*, Pub L No 109-148, 119 Stat 2739 (2005)` is wrong. Test chapter15-26.test.ts:1107–1108 comments "implementation always includes it; test current behaviour" and asserts via `toContain` — acknowledged in test, not in the audit (CH25-010 PASS). No support for `ch`, `Priv L No`, original pinpoints, or state session laws (eg `1999 NJ Laws 1`).
- **Fix:** suppress year when `title.includes(String(year))`; add chapter/private-law/state fields. Do not adopt the Guide's own example-66 'NY Stat' — the table says 'NY Laws'.
- **Severity:** medium.

### 25.4 state constitutions unsupported (MEDIUM)
- **Rule:** 25.4 (PDF p.310): `*Texas Constitution* art 1 § 8`.
- **Engine:** `foreign/usa.ts:282` hardcodes "United States Constitution". Test chapter15-26.test.ts:1136–1139 acknowledges the hardcoding. (The Guide's Roman-vs-Arabic article-number inconsistency (ex 75 vs 77) is an open anomaly — engine passes numerals through, which is the safe behaviour; candidates for docs/decisions.md.)
- **Fix:** add optional `title` param defaulting to "United States Constitution".
- **Severity:** medium.

### 25.6.1 Congressional Record (HIGH)
- **Rule:** 25.6.1 (PDF pp.311–312): `156 *Congressional Record* H148 (Ann Kirkpatrick) (daily ed, 19 January 2010)` — title in full and italic, speaker parenthetical *before* the year/date parenthetical, daily-edition form `(daily ed, «Full Date»)`.
- **Engine:** `foreign/usa.ts:361–371` emits roman Bluebook-style `158 Cong Rec S6299 (2012) (Harry Reid)` — wrong series rendering, speaker after year, and the `edition` field (usa.ts:344) is declared but never used (daily ed impossible).
- **Fix:** emit `${volume} ` + italic run "Congressional Record" + ` ${page}` + optional ` (${speaker})` + ` (${edition==="daily" ? "daily ed, "+date : year})`.
- **Severity:** high.

### 25.7 Restatements (HIGH)
- **Rule:** 25.7 (PDF p.314): cite as a book authored by the Institute — `American Law Institute, *Restatement (Second) of Contracts* (1981) § 176`; comments as `§ 465 cmt (a)`.
- **Engine:** `foreign/usa.ts:414–433` omits the mandatory author "American Law Institute, " and orders section before year: `*Restatement (Second) of Contracts* § 402A (1965)`. Test chapter15-26.test.ts:1167–1178 masks with two `toContain`s. Audit CH25-014 PASS is wrong.
- **Fix:** prepend author run; emit ` (${year}) § ${section}${cmt}`.
- **Severity:** high.

### 26.1.1 translation attribution marker (HIGH)
- **Rule:** 26.1.1 (PDF pp.315–316): author-made translations flagged `[tr author]` at the **end of the citation**; third-party translations `[tr «Translator's Name»]` at the end. Eg `*Urheberrechtsgesetz* [Copyright Law] (Switzerland) 9 October 1992, SR 231.1, art 29(2)(a) [tr author]`.
- **Engine:** `foreign/other.ts:245–247` emits `[Author's trans]` (wrong text) after the jurisdiction and **before** the pinpoint (wrong position); no `[tr Name]` support at all. Audit CH26-001 PASS is wrong.
- **Fix:** replace with `translator?: "author" | string` emitting ` [tr author]` / ` [tr ${name}]` as the final run.
- **Severity:** high.

### 26.2 formatCase drops the year when a volume is present (HIGH — code bug)
- **Rule:** 26.2 (PDF pp.318–319): common-law decisions per ch 2 (`[1967] 1 All NLR 123`); other decisions comma-separated elements with `reported in`.
- **Engine:** `foreign/other.ts:107–119`: when `year`, `volume` and `reportSeries` are all set, line 115 executes `yearText = `, ${data.volume}``, **overwriting** (not appending to) the year text — the year vanishes from the output. Additionally there is no `reported in` connector, and elements are space- rather than comma-separated for non-common-law decisions.
- **Fix:** `yearText += ` ${data.volume}`` (mirror uk.ts:126–128); add `reportedIn` handling.
- **Severity:** high.

### Data hygiene (LOW)

**Status:** FIXED (nz-report-series.ts NZAR/NZCPR deduped; uk-court-identifiers.ts HCJT + 'EWHC Admin' (2001–02) added, HCJ annotated OSCOLA-only; irish-courts.ts untouched — remains non-AGLC supplementary data). Year-validity ranges for UK identifiers remain unmodelled (low).
- `src/engine/data/nz-report-series.ts`: NZAR defined twice (lines ~50 and ~246) and NZCPR twice (~182, ~254) — dedupe.
- `src/engine/data/uk-court-identifiers.ts`: missing HCJT (has non-AGLC4 'HCJ'); missing the 2001–02 'EWHC Admin' (no-parentheses) identifier; no year-validity ranges from the 24.1.5 table.
- `src/engine/data/irish-courts.ts`: Ireland has no AGLC4 chapter; as ch 26 supplementary lookup data it is UNVERIFIED against AGLC4 (nothing to verify) — keep clearly out of the "AGLC4-prescribed" datasets.

## Honest scope notes (UNVERIFIED)
- I did not run the Jest suite; verdicts are from source reading of the formatters, data and test expectations.
- `dispatchForeign`'s upstream data shapes (what the UI/LLM actually put in `citationDetails`/`foreignSubType`) were not traced beyond engine.ts; the X-1 italics finding assumes legislation arrives without " v " and without `foreignSubType:"case"`, which the code makes the only non-case path.
- uk-report-series.ts entries beyond the 24.1.2 table (WLR, All ER, Lloyd's Rep, nominates, Scottish/NI series, ~100 rows) were spot-checked for structure, not verified row-by-row against Appendix A.
- nzlsg (NZ Law Style Guide) rule modules under `src/engine/rules/nzlsg/` are outside AGLC4 ch 21 and were not reviewed.
