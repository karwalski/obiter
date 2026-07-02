# AGLC4 Derived Reference — Parity Assessment

**Created:** 2026-07-02
**Reference document:** `/Users/matthew.watt/aglc/aglc4-rule-reference.md` (not in repo — derived from the copyrighted guide, kept local)
**Source:** `AGLC4-with-Bookmarks-1.pdf` (official free PDF, law.unimelb.edu.au)

## What the reference is

A derived, structured restatement of every AGLC4 rule, produced 2026-07-02 by 20 parallel agents reading the PDF page-by-page under fixed authoring conventions. Each rule entry carries: a **Prescribes** summary, exhaustive **Details** bullets (requirements, conditions, exceptions, prohibitions — Rule and Note bands both), exact **format templates** (`«Element»` notation), complete **factual tables**, curated real **citation illustrations** keeping the guide's example numbers, **cross-references**, and a `<!-- PDF p.N | printed p.X -->` anchor. A verbatim transcription was not possible: the guide is copyrighted and its PDF carries a no-copy flag (see memory note and DECISION-001's copyright reasoning).

## Parity status — what is verified vs attested

| Dimension | Status |
|---|---|
| Rule-number coverage | **Machine-verified**: all 416 rule numbers in the guide's own table of contents appear in the reference (0 missing) |
| Requirement capture per rule | **Attested** by each authoring agent ("every rule number visible on the pages appears; nothing truncated"), not yet independently verified |
| Format templates | Copied exactly (functional patterns) |
| Factual tables | Reproduced in full; one authoring deviation (rules 4.1.1 / 4.1.5 tables were compressed) found and restored 2026-07-02 |
| Examples | **Deliberately curated** — 1–2 real citations per distinct format pattern, not the guide's full example lists |
| Appendices A–C | **Absent from the source PDF** (printed pp 297–333 not included). Story DATA-004 (physical scan, verification-only use) |
| Front matter / bibliography / index | Summarised or omitted — no normative citation content |

**Bottom line:** full parity at the rule level; near-parity at the requirement level with a residual paraphrase risk that is bounded by design — every entry anchors to its PDF page, and the working rule (per project policy) is that **the PDF remains the sole authority**: any implementation or review decision that hangs on exact wording is checked against the anchored page, not the restatement.

## Assumptions

1. The guide's Rule and Note bands are jointly normative; both are captured as requirements.
2. The guide's example lists demonstrate a finite set of format patterns; capturing each pattern once (with the example number preserved for traceability) loses no normative information.
3. Where a guide example contradicts its own rule text, the rule text is presumed to state the intended norm unless the 2019 Erratum (DATA-005) or a researcher decision says otherwise — see DECISION-012.
4. Printed page ≈ PDF page − 25 throughout the rules chapters (verified at multiple points).

## Contradictions and errors in the guide

Close reading surfaced **64 internal anomalies** — examples violating their own rule, wrong cross-references, typos, inconsistent parallel examples, factual errors (wrong weekdays, a non-existent US judicial title, transliteration errors). The consolidated catalogue is the final section of `aglc4-rule-reference.md`, each entry with rule number and PDF page. Notable classes:

- **Example contradicts rule** (eg 9.2.7 example uses a session number rule 9.2.6 prohibits; 25.3.5 examples use "NY Stat"/"c" against the rule's own "NY Laws"/"ch"; 5.5 converts "&"→"and" with no stated basis)
- **Wrong cross-references** (2.1.14→2.1.1 should be 2.1.2; 17.2.1/17.2.2→25.1.1 should be 26.1.1; wrong running header printed p 230)
- **Identifier/table mismatches** (2.3.1 worked example "TASCC" vs table "TASSC"; 24.1.6 "DP" vs table "DPSC"; 11.1.1 "Hag Crt Rep" vs "Hague Ct Rep")
- **Plain factual errors** ("Assistant Justice" in 25.1.8; "Thursday 6 March 1987" was a Friday; pinyin "Cheng" for 层 "ceng"; translation "Part 2" for 第一組 "Part 1")

Several may be resolved by the official Erratum (DATA-005). Until resolved, the engine follows the rule text over its contradicting example (DECISION-012), and any anomaly that a user could hit is treated as an ambiguity per the AGLC4-authority policy.

## Review outcomes (2026-07-02)

Nine automated parity reviews compared the engine against the reference (findings in `docs/parity-reviews/`). Aggregate over the eight chapter/data reviews: **~91 MISMATCH, ~65 GAP**, plus 68 defective sourceType metadata entries (41 mismatch / 27 gap) in `ruleExporter.ts`. Headline classes:

- **Inverted rules (P0):** Latin-terms italics list backwards (1.8.3); number-comma rule backwards (1.10.1); ellipsis form backwards (1.5.3); parallel-citation recommendation backwards (2.2.7).
- **Wrong output on common sources (P0):** single party names split on "and"/"&" (2.1.1); roman *v* (2.1.11); short-title introductions suppressed by a substring heuristic (1.4.4/2.1.14/3.5); signals dropped on ibid.
- **Dead code / unwired formatters:** the entire `foreign/` module (ch 15–26) never dispatches; multi-volume books, podcasts, reported ECtHR, state arbitrations, 3.8 legislative history, 3.1.6 definitions all implemented but unreachable.
- **Dataset defects:** fabricated "QR"; missing court identifiers (incl. bogus TASCSC); all six NZ adoption years wrong; 6/16 pinpoint abbreviations missing; UK series/judicial/monarch tables largely unencoded.
- **Tests enshrining errors:** italic "SC Res 827", roman *v*, `(Part 1)`, translator-in-parenthetical asserted as correct; `toContain` masking throughout.
- **Prior audit docs unreliable:** `aglc4-audit.md` and `aglc4-coverage.md` contradicted on dozens of rows (PARITY-120 rebases them).
- **Anomaly leakage: none found** — no guide-internal error (TASCC, "DP", NY Stat, transliterations, wrong cross-refs) was encoded into the engine.

Work is tracked in the **PARITY epic** (`footnote-backlog.md`): PARITY-001..009 triage reviews, PARITY-101..120 grouped fixes. New open decisions: DECISION-013 (em-dash spacing), DECISION-014 (5.5 ampersand), DECISION-015 (ACTR/appendix-dependent rows).

## Related work

- `aglc4-audit.md` — April 2026 chapter-by-chapter implementation audit (predates this reference)
- `aglc4-coverage.md` — coverage matrix, last audited 2026-06-30
- `erratum-audit.md` — inferred erratum mapping; to be replaced by DATA-005
- PARITY epic (footnote-backlog.md) — category-by-category reviews of the engine against this reference
