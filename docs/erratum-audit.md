# AGLC4 Erratum Audit

**Created:** 2026-04-18
**Research story:** RESEARCH-006
**Purpose:** Map the 17 pages identified in the AGLC4 Erratum (29 July 2019) to their corresponding rules, cross-reference against the chapter audit, and flag rules that may need re-examination.

**Note:** The full AGLC4 Erratum PDF should be obtained from the Melbourne University Law Review (MULR) to complete this audit. Without the actual erratum text, the rule mappings below are inferred from the AGLC4 page-to-rule correspondence and may not capture the precise nature of each correction. This document should be updated once the erratum is in hand.

---

## Erratum Overview

The AGLC4 Erratum, dated 29 July 2019, acknowledges errors on 17 pages of the 337-page guide:

> Pages 9, 12, 21, 30, 45, 50, 52-53, 60, 79, 93, 120, 124, 139, 159, 201, 239, 257

These corrections were issued approximately nine months after AGLC4's publication in 2018.

---

## Page-to-Rule Mapping and Audit Status

| # | Erratum Page | Likely Rule | Rule Title | Chapter Audit Status | Erratum Re-examination Needed? |
|---|-------------|-------------|------------|---------------------|-------------------------------|
| 1 | 9 | 1.1 | Footnotes | PASS (CH1-001 to CH1-005) | LOW RISK -- footnote rules are structural/advisory; engine conformance confirmed |
| 2 | 12 | 1.2 or 1.3 | Introductory signals / Sources referring to other sources | FIX (CH1-008) / PASS (CH1-009) | YES -- Rule 1.2 already required fixes (missing `See especially`, incorrect `See eg`); erratum may have corrected signal list or linking phrase rules |
| 3 | 21 | 1.4 | Subsequent references | PASS (CH1-010 to CH1-015) | MODERATE -- subsequent reference logic is complex and was a major source of CSL bugs; should verify against erratum corrections |
| 4 | 30 | 1.10 or 1.11 | Numbers / Dates | PASS (CH1-035 to CH1-041) | LOW RISK -- these rules passed audit, but erratum may have corrected examples |
| 5 | 45 | 2.1 | Case names | FIX (CH2-001, CH2-002) | YES -- case name rules already required fixes; erratum corrections may affect party name formatting or abbreviation lists |
| 6 | 50 | 2.2 | Reported decisions | PASS (CH2-016 to CH2-022) | MODERATE -- reported decision formatting passed audit but erratum may have corrected year/volume or report series rules |
| 7 | 52-53 | 2.2 or 2.3 | Reported / Unreported decisions | PASS (CH2-016 to CH2-024) | MODERATE -- spans the boundary between reported and unreported decision rules; may affect MNC formatting |
| 8 | 60 | 2.4 or 2.5 | Judicial officers / Case history | PASS (CH2-027 to CH2-032) | MODERATE -- judicial officer rules passed but CH2-031 (during argument) required a fix; erratum may relate |
| 9 | 79 | 3.1 | Legislation | FIX (CH3-004, CH3-005) | YES -- legislation pinpoint rules already required fixes; erratum corrections likely overlap |
| 10 | 93 | 4.1 | Author formatting | FIX (CH4-001) | YES -- author name formatting already required a fix; erratum may have corrected author name rules or examples |
| 11 | 120 | 6.3 | Book publication details | PASS (CH6-003, CH6-004) | LOW RISK -- publisher and edition rules passed audit |
| 12 | 124 | 6.6 or 6.7 | Chapters in edited books / Translated books | PASS (CH6-007, CH6-008) | LOW RISK -- both rules passed audit, but erratum may have corrected chapter/translation citation format |
| 13 | 139 | 7.1 | Reports | PASS (CH7-001 to CH7-005) | LOW RISK -- report rules passed audit |
| 14 | 159 | 7.9 or 7.10 | Intellectual property / Constitutive documents | PASS (CH7-020, CH7-021) | LOW RISK -- both rules passed audit |
| 15 | 201 | 10 or 11 | ICJ/PCIJ / International arbitration | FIX (CH10-002 to CH10-010) / FIX (CH11-001, CH11-002) | YES -- multiple ICJ and arbitration rules required fixes; erratum corrections may identify additional issues |
| 16 | 239 | 16 or 17 | China / France | PASS/AUDIT (CH16-001 to CH16-004) / PASS (CH17-001 to CH17-004) | MODERATE -- China rules have items still at AUDIT status (Chinese language materials, author names); erratum may affect these |
| 17 | 257 | 21 or 22 | New Zealand / Singapore | PASS/AUDIT/IMPL (CH21-001 to CH21-008) / PASS (CH22-001 to CH22-005) | MODERATE -- New Zealand has items at AUDIT and IMPL status (Maori courts, Waitangi Tribunal, delegated legislation); erratum corrections could affect these |

---

## Summary of Risk Levels

### High priority -- re-examine against erratum

These rules already required fixes during the chapter audit, suggesting our implementation may have been working from incorrect AGLC4 text:

| Page | Rule | Reason |
|------|------|--------|
| 12 | 1.2 (Signals) | Signal list already had errors (CH1-008 FIX) |
| 45 | 2.1 (Case names) | Case name formatting already had errors (CH2-001, CH2-002 FIX) |
| 79 | 3.1 (Legislation) | Pinpoint rules already had errors (CH3-004, CH3-005 FIX) |
| 93 | 4.1 (Authors) | Author name formatting already had errors (CH4-001 FIX) |
| 201 | 10/11 (ICJ/Arbitration) | Multiple rules required fixes (CH10-002 to CH10-010, CH11-001, CH11-002 FIX) |

### Moderate priority -- verify against erratum

These rules passed audit but the erratum may have corrected examples or edge cases:

| Page | Rule | Reason |
|------|------|--------|
| 21 | 1.4 (Subsequent references) | Complex rule family; major source of tool bugs across the ecosystem |
| 30 | 1.10/1.11 (Numbers/Dates) | Passed audit but erratum may correct examples |
| 50 | 2.2 (Reported decisions) | Core citation format; any correction could affect output |
| 52-53 | 2.2/2.3 (Reported/Unreported) | Boundary between two rule sets |
| 60 | 2.4/2.5 (Judicial officers) | One sub-rule already required a fix (CH2-031) |
| 239 | 16/17 (China/France) | China rules have AUDIT items outstanding |
| 257 | 21/22 (NZ/Singapore) | NZ rules have AUDIT and IMPL items outstanding |

### Low risk -- likely no impact

These rules passed audit cleanly and the erratum corrections were likely typographical or example-level:

| Page | Rule | Reason |
|------|------|--------|
| 9 | 1.1 (Footnotes) | Structural/advisory rules |
| 120 | 6.3 (Publication details) | Passed audit |
| 124 | 6.6/6.7 (Chapters/Translations) | Passed audit |
| 139 | 7.1 (Reports) | Passed audit |
| 159 | 7.9/7.10 (IP/Constitutive docs) | Passed audit |

---

## Action Items

1. **Obtain the full AGLC4 Erratum PDF from MULR.** Without the actual corrections, this audit is based on page-to-rule inference only. The erratum may be available from the Melbourne University Law Review website or by contacting the MULR editors directly.

2. **Once obtained, review each correction against the engine implementation.** Priority order:
   - High priority pages: 12, 45, 79, 93, 201
   - Moderate priority pages: 21, 30, 50, 52-53, 60, 239, 257
   - Low priority pages: 9, 120, 124, 139, 159

3. **Cross-reference with existing FIX items.** Where the chapter audit already found and fixed discrepancies, verify whether the fix aligns with the erratum correction or whether the erratum reveals a different issue.

4. **Update the chapter audit table** with erratum-specific findings once the full text is reviewed.

---

## Observations

- The fact that 17 pages required correction within nine months of publication reinforces the case (made in the research document) that software-first review during AGLC5 drafting would catch errors earlier.

- Five of the 17 erratum pages correspond to rules where the Obiter engine already found and fixed discrepancies during the chapter audit. This may indicate that the engine was inadvertently implementing the *corrected* form (from common usage or secondary sources) rather than the original printed text -- or conversely, that the engine's fixes addressed different issues from the erratum's.

- The erratum's coverage spans the full breadth of the guide: general rules (Ch 1), cases (Ch 2), legislation (Ch 3), secondary sources (Chs 4, 6, 7), and international materials (Chs 10-11, 16-17, 21-22). No chapter cluster is disproportionately affected.
