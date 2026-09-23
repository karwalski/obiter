/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-002 — AGLC4 court-submission-mode expectation table.
 *
 * Rows are keyed `<PRESET>:<scenario>` for the HCA, NSWCA, WASC, QSC and
 * STATE_TRIBUNAL presets applied to Mabo stored with report + MNC
 * (fx-mabo-reported) and by MNC only (fx-mabo-mnc). The config is built
 * exactly as the refresher does: buildCourtConfig({...aglc4, writingMode:
 * "court"}, presetToggles). `expected` is the current engine output, which
 * the court presets, docs/court-practices-review.md and the existing court
 * suites (court-mode, court-practice-matrix, court-integration) pin as the
 * documented practice; the rule column names the practice direction.
 * Generated from capture.json by the STD-002 scratch script.
 */

import type { ExpectationTable } from "./types";

export const AGLC4_COURT_EXPECTATIONS: ExpectationTable = [
  {
    fixture: "fx-mabo-reported",
    scenario: "HCA:first",
    expected: "Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23 (‘Mabo’)",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: first citation with the auto-parallel MNC; AGLC 1.4.4 short-title introduction still appended after the parallel citation (engine convention, not addressed by the practice directions)",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "HCA:parallel",
    expected: "Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23 (‘Mabo’)",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: identical to 'first': court mode always composes report + MNC from a case that carries both (MULTI-003 / engine dispatchReportedCase)",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "HCA:first+page",
    expected: "Mabo v Queensland (1992) 175 CLR 1, 42; [1992] HCA 23 (‘Mabo’)",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: page pinpoint under the preset's pinpointStyle (para-only renders the page in place of the starting page — pinned by court-mode.test.ts)",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "HCA:first+paragraph",
    expected: "Mabo v Queensland (1992) 175 CLR 1, [42]; [1992] HCA 23 (‘Mabo’)",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: paragraph pinpoint under the preset's pinpointStyle",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "HCA:subsequent-short",
    expected: "Mabo",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: MULTI-014 court short form: short title only, no (n X), italic (formatCourtShortReference)",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "HCA:subsequent-short+page",
    expected: "Mabo 42",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: court short form + page pinpoint",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "HCA:subsequent-short+paragraph",
    expected: "Mabo [42]",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: court short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "HCA:subsequent-ibid",
    expected: "Mabo",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: ibidSuppression on: the immediately following footnote repeats the short form, never 'Ibid' (COURT-FIX-004)",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "HCA:subsequent-ibid+paragraph",
    expected: "Mabo [42]",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: ibid suppressed; short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "HCA:first",
    expected: "Mabo v Queensland [1992] HCA 23 (‘Mabo’)",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: first citation with the auto-parallel MNC; AGLC 1.4.4 short-title introduction still appended after the parallel citation (engine convention, not addressed by the practice directions)",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "HCA:first+page",
    expected: "Mabo v Queensland [1992] HCA 23, 42 (‘Mabo’)",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: page pinpoint under the preset's pinpointStyle (para-only renders the page in place of the starting page — pinned by court-mode.test.ts)",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "HCA:first+paragraph",
    expected: "Mabo v Queensland [1992] HCA 23, [42] (‘Mabo’)",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: paragraph pinpoint under the preset's pinpointStyle",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "HCA:subsequent-short",
    expected: "Mabo",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: MULTI-014 court short form: short title only, no (n X), italic (formatCourtShortReference)",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "HCA:subsequent-short+page",
    expected: "Mabo 42",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: court short form + page pinpoint",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "HCA:subsequent-short+paragraph",
    expected: "Mabo [42]",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: court short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "HCA:subsequent-ibid",
    expected: "Mabo",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: ibidSuppression on: the immediately following footnote repeats the short form, never 'Ibid' (COURT-FIX-004)",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "HCA:subsequent-ibid+paragraph",
    expected: "Mabo [42]",
    rule: "HCA PD 2 of 2024: authorised report (CLR) with the MNC as a parallel citation, report first; pinpointStyle para-and-page ('CLR 1, [42]'); ibid and (n X) suppressed; scenario: ibid suppressed; short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts HCA; tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "NSWCA:first",
    expected: "Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23 (‘Mabo’)",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: first citation with the auto-parallel MNC; AGLC 1.4.4 short-title introduction still appended after the parallel citation (engine convention, not addressed by the practice directions)",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "NSWCA:parallel",
    expected: "Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23 (‘Mabo’)",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: identical to 'first': court mode always composes report + MNC from a case that carries both (MULTI-003 / engine dispatchReportedCase)",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "NSWCA:first+page",
    expected: "Mabo v Queensland (1992) 175 CLR 42; [1992] HCA 23 (‘Mabo’)",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: page pinpoint under the preset's pinpointStyle (para-only renders the page in place of the starting page — pinned by court-mode.test.ts)",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "NSWCA:first+paragraph",
    expected: "Mabo v Queensland (1992) 175 CLR [42]; [1992] HCA 23 (‘Mabo’)",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: paragraph pinpoint under the preset's pinpointStyle",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "NSWCA:subsequent-short",
    expected: "Mabo",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: MULTI-014 court short form: short title only, no (n X), italic (formatCourtShortReference)",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "NSWCA:subsequent-short+page",
    expected: "Mabo 42",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: court short form + page pinpoint",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "NSWCA:subsequent-short+paragraph",
    expected: "Mabo [42]",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: court short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "NSWCA:subsequent-ibid",
    expected: "Mabo",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: ibidSuppression on: the immediately following footnote repeats the short form, never 'Ibid' (COURT-FIX-004)",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "NSWCA:subsequent-ibid+paragraph",
    expected: "Mabo [42]",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: ibid suppressed; short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "NSWCA:first",
    expected: "Mabo v Queensland [1992] HCA 23 (‘Mabo’)",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: first citation with the auto-parallel MNC; AGLC 1.4.4 short-title introduction still appended after the parallel citation (engine convention, not addressed by the practice directions)",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "NSWCA:first+page",
    expected: "Mabo v Queensland [1992] HCA 23, 42 (‘Mabo’)",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: page pinpoint under the preset's pinpointStyle (para-only renders the page in place of the starting page — pinned by court-mode.test.ts)",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "NSWCA:first+paragraph",
    expected: "Mabo v Queensland [1992] HCA 23, [42] (‘Mabo’)",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: paragraph pinpoint under the preset's pinpointStyle",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "NSWCA:subsequent-short",
    expected: "Mabo",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: MULTI-014 court short form: short title only, no (n X), italic (formatCourtShortReference)",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "NSWCA:subsequent-short+page",
    expected: "Mabo 42",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: court short form + page pinpoint",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "NSWCA:subsequent-short+paragraph",
    expected: "Mabo [42]",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: court short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "NSWCA:subsequent-ibid",
    expected: "Mabo",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: ibidSuppression on: the immediately following footnote repeats the short form, never 'Ibid' (COURT-FIX-004)",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "NSWCA:subsequent-ibid+paragraph",
    expected: "Mabo [42]",
    rule: "NSW SC Gen 20 (1 Oct 2023) + SC CA 1: MNC paragraph pinpoints sufficient, authorised report noted where possible (parallelCitations 'preferred'); pinpointStyle para-only ('CLR [42]', starting page dropped); ibid suppressed; scenario: ibid suppressed; short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts NSWCA (CRIT-004 §4 sign-off); tests/engine/court-practice-matrix.test.ts; docs/court-practices-review.md §1.1",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "WASC:first",
    expected: "Mabo v Queensland [1992] HCA 23; (1992) 175 CLR 1 (‘Mabo’)",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: first citation with the auto-parallel MNC; AGLC 1.4.4 short-title introduction still appended after the parallel citation (engine convention, not addressed by the practice directions)",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "WASC:parallel",
    expected: "Mabo v Queensland [1992] HCA 23; (1992) 175 CLR 1 (‘Mabo’)",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: identical to 'first': court mode always composes report + MNC from a case that carries both (MULTI-003 / engine dispatchReportedCase)",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "WASC:first+page",
    expected: "Mabo v Queensland [1992] HCA 23; (1992) 175 CLR 1, 42 (‘Mabo’)",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: page pinpoint under the preset's pinpointStyle (para-only renders the page in place of the starting page — pinned by court-mode.test.ts)",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "WASC:first+paragraph",
    expected: "Mabo v Queensland [1992] HCA 23; (1992) 175 CLR 1, [42] (‘Mabo’)",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: paragraph pinpoint under the preset's pinpointStyle",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "WASC:subsequent-short",
    expected: "Mabo",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: MULTI-014 court short form: short title only, no (n X), italic (formatCourtShortReference)",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "WASC:subsequent-short+page",
    expected: "Mabo 42",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: court short form + page pinpoint",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "WASC:subsequent-short+paragraph",
    expected: "Mabo [42]",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: court short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "WASC:subsequent-ibid",
    expected: "Mabo",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: ibidSuppression on: the immediately following footnote repeats the short form, never 'Ibid' (COURT-FIX-004)",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "WASC:subsequent-ibid+paragraph",
    expected: "Mabo [42]",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: ibid suppressed; short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "WASC:first",
    expected: "Mabo v Queensland [1992] HCA 23 (‘Mabo’)",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: first citation with the auto-parallel MNC; AGLC 1.4.4 short-title introduction still appended after the parallel citation (engine convention, not addressed by the practice directions)",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "WASC:first+page",
    expected: "Mabo v Queensland [1992] HCA 23, 42 (‘Mabo’)",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: page pinpoint under the preset's pinpointStyle (para-only renders the page in place of the starting page — pinned by court-mode.test.ts)",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "WASC:first+paragraph",
    expected: "Mabo v Queensland [1992] HCA 23, [42] (‘Mabo’)",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: paragraph pinpoint under the preset's pinpointStyle",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "WASC:subsequent-short",
    expected: "Mabo",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: MULTI-014 court short form: short title only, no (n X), italic (formatCourtShortReference)",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "WASC:subsequent-short+page",
    expected: "Mabo 42",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: court short form + page pinpoint",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "WASC:subsequent-short+paragraph",
    expected: "Mabo [42]",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: court short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "WASC:subsequent-ibid",
    expected: "Mabo",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: ibidSuppression on: the immediately following footnote repeats the short form, never 'Ibid' (COURT-FIX-004)",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "WASC:subsequent-ibid+paragraph",
    expected: "Mabo [42]",
    rule: "WA SC Consolidated PD 8.2.2 (20 Jun 2025): MNC first, then the report ('Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]'); pinpointStyle para-and-page; ibid suppressed; scenario: ibid suppressed; short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts WASC (parallelOrder mnc-first); tests/engine/court-practice-matrix.test.ts",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "QSC:first",
    expected: "Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23 (‘Mabo’)",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: first citation with the auto-parallel MNC; AGLC 1.4.4 short-title introduction still appended after the parallel citation (engine convention, not addressed by the practice directions)",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "QSC:parallel",
    expected: "Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23 (‘Mabo’)",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: identical to 'first': court mode always composes report + MNC from a case that carries both (MULTI-003 / engine dispatchReportedCase)",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "QSC:first+page",
    expected: "Mabo v Queensland (1992) 175 CLR 42; [1992] HCA 23 (‘Mabo’)",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: page pinpoint under the preset's pinpointStyle (para-only renders the page in place of the starting page — pinned by court-mode.test.ts)",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "QSC:first+paragraph",
    expected: "Mabo v Queensland (1992) 175 CLR [42]; [1992] HCA 23 (‘Mabo’)",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: paragraph pinpoint under the preset's pinpointStyle",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "QSC:subsequent-short",
    expected: "Mabo",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: MULTI-014 court short form: short title only, no (n X), italic (formatCourtShortReference)",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "QSC:subsequent-short+page",
    expected: "Mabo 42",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: court short form + page pinpoint",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "QSC:subsequent-short+paragraph",
    expected: "Mabo [42]",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: court short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "QSC:subsequent-ibid",
    expected: "Mabo",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: ibidSuppression on: the immediately following footnote repeats the short form, never 'Ibid' (COURT-FIX-004)",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "QSC:subsequent-ibid+paragraph",
    expected: "Mabo [42]",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: ibid suppressed; short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "QSC:first",
    expected: "Mabo v Queensland [1992] HCA 23 (‘Mabo’)",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: first citation with the auto-parallel MNC; AGLC 1.4.4 short-title introduction still appended after the parallel citation (engine convention, not addressed by the practice directions)",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "QSC:first+page",
    expected: "Mabo v Queensland [1992] HCA 23, 42 (‘Mabo’)",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: page pinpoint under the preset's pinpointStyle (para-only renders the page in place of the starting page — pinned by court-mode.test.ts)",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "QSC:first+paragraph",
    expected: "Mabo v Queensland [1992] HCA 23, [42] (‘Mabo’)",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: paragraph pinpoint under the preset's pinpointStyle",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "QSC:subsequent-short",
    expected: "Mabo",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: MULTI-014 court short form: short title only, no (n X), italic (formatCourtShortReference)",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "QSC:subsequent-short+page",
    expected: "Mabo 42",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: court short form + page pinpoint",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "QSC:subsequent-short+paragraph",
    expected: "Mabo [42]",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: court short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "QSC:subsequent-ibid",
    expected: "Mabo",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: ibidSuppression on: the immediately following footnote repeats the short form, never 'Ibid' (COURT-FIX-004)",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "QSC:subsequent-ibid+paragraph",
    expected: "Mabo [42]",
    rule: "Qld SC PD 1 of 2024: parallel citation 'should, as far as possible' (preferred); paragraph pinpoints sufficient (para-only); ibid suppressed; scenario: ibid suppressed; short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts QSC (CRIT-004 §4 sign-off); docs/court-practices-review.md §1.2",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "STATE_TRIBUNAL:first",
    expected: "Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23 (‘Mabo’)",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: first citation with the auto-parallel MNC; AGLC 1.4.4 short-title introduction still appended after the parallel citation (engine convention, not addressed by the practice directions)",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "STATE_TRIBUNAL:parallel",
    expected: "Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23 (‘Mabo’)",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: identical to 'first': court mode always composes report + MNC from a case that carries both (MULTI-003 / engine dispatchReportedCase)",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "STATE_TRIBUNAL:first+page",
    expected: "Mabo v Queensland (1992) 175 CLR 42; [1992] HCA 23 (‘Mabo’)",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: page pinpoint under the preset's pinpointStyle (para-only renders the page in place of the starting page — pinned by court-mode.test.ts)",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "STATE_TRIBUNAL:first+paragraph",
    expected: "Mabo v Queensland (1992) 175 CLR [42]; [1992] HCA 23 (‘Mabo’)",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: paragraph pinpoint under the preset's pinpointStyle",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "STATE_TRIBUNAL:subsequent-short",
    expected: "Mabo",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: MULTI-014 court short form: short title only, no (n X), italic (formatCourtShortReference)",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "STATE_TRIBUNAL:subsequent-short+page",
    expected: "Mabo 42",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: court short form + page pinpoint",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "STATE_TRIBUNAL:subsequent-short+paragraph",
    expected: "Mabo [42]",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: court short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "STATE_TRIBUNAL:subsequent-ibid",
    expected: "Mabo",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: ibidSuppression on: the immediately following footnote repeats the short form, never 'Ibid' (COURT-FIX-004)",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "STATE_TRIBUNAL:subsequent-ibid+paragraph",
    expected: "Mabo [42]",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: ibid suppressed; short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "STATE_TRIBUNAL:first",
    expected: "Mabo v Queensland [1992] HCA 23 (‘Mabo’)",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: first citation with the auto-parallel MNC; AGLC 1.4.4 short-title introduction still appended after the parallel citation (engine convention, not addressed by the practice directions)",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "STATE_TRIBUNAL:first+page",
    expected: "Mabo v Queensland [1992] HCA 23, 42 (‘Mabo’)",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: page pinpoint under the preset's pinpointStyle (para-only renders the page in place of the starting page — pinned by court-mode.test.ts)",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "STATE_TRIBUNAL:first+paragraph",
    expected: "Mabo v Queensland [1992] HCA 23, [42] (‘Mabo’)",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: paragraph pinpoint under the preset's pinpointStyle",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
    note: "MNC-only case: no report to pair, so no parallel citation; AGLC 2.3.1 form with a comma before the pinpoint",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "STATE_TRIBUNAL:subsequent-short",
    expected: "Mabo",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: MULTI-014 court short form: short title only, no (n X), italic (formatCourtShortReference)",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "STATE_TRIBUNAL:subsequent-short+page",
    expected: "Mabo 42",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: court short form + page pinpoint",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "STATE_TRIBUNAL:subsequent-short+paragraph",
    expected: "Mabo [42]",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: court short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "STATE_TRIBUNAL:subsequent-ibid",
    expected: "Mabo",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: ibidSuppression on: the immediately following footnote repeats the short form, never 'Ibid' (COURT-FIX-004)",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "STATE_TRIBUNAL:subsequent-ibid+paragraph",
    expected: "Mabo [42]",
    rule: "Tribunal preset: parallelCitations 'off' governs validation only — the engine still auto-emits the stored MNC (pinned by court-practice-matrix); pinpointStyle para-only; ibid suppressed; scenario: ibid suppressed; short form + paragraph pinpoint",
    source:
      "src/engine/court/presets.ts STATE_TRIBUNAL; tests/engine/court-practice-matrix.test.ts ('The MNC is always emitted in court mode')",
  },
];
