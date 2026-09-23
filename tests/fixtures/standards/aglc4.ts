/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-002 — AGLC4 expectation table (byte-identical guard).
 *
 * Every `expected` string is the CURRENT engine output for the fixture under
 * `getStandardConfig("aglc4")`, captured on 2026-09-22 with the scenario
 * contexts described in README.md. These rows exist so that the OSCOLA,
 * NZLSG and court work in Waves 2–3 cannot change AGLC output: a diff here
 * is a regression unless an AGLC rule change is being made deliberately.
 * `note` marks pre-existing AGLC quirks that are recorded, not endorsed.
 * Bibliography rows are omitted for hansard, echr.decision and un.document
 * because generateBibliographyForStandard renders an empty entry for them
 * today (pre-existing AGLC defect, owned by STD-018).
 * Generated from capture.json by the STD-002 scratch script; hand edits are
 * fine but keep the strings identical to what the engine renders.
 */

import type { ExpectationTable } from "./types";

export const AGLC4_EXPECTATIONS: ExpectationTable = [
  {
    fixture: "fx-mabo-reported",
    scenario: "first",
    expected: "Mabo v Queensland (1992) 175 CLR 1 (‘Mabo’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "first+page",
    expected: "Mabo v Queensland (1992) 175 CLR 1, 42 (‘Mabo’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "first+paragraph",
    expected: "Mabo v Queensland (1992) 175 CLR 1 [42] (‘Mabo’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "first+section",
    expected: "Mabo v Queensland (1992) 175 CLR 1, 6 (‘Mabo’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-short",
    expected: "Mabo (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-short+page",
    expected: "Mabo (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-short+paragraph",
    expected: "Mabo (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-short+section",
    expected: "Mabo (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "bibliography-entry",
    expected: "Mabo v Queensland (1992) 175 CLR 1",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "parallel",
    expected: "Mabo v Queensland (1992) 175 CLR 1 (‘Mabo’)",
    rule: "AGLC4 2.2.7 parallel citations are never emitted in academic AGLC; identical to 'first'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "first",
    expected: "Mabo v Queensland [1992] HCA 23 (‘Mabo’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "first+page",
    expected: "Mabo v Queensland [1992] HCA 23, 42 (‘Mabo’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "first+paragraph",
    expected: "Mabo v Queensland [1992] HCA 23, [42] (‘Mabo’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "first+section",
    expected: "Mabo v Queensland [1992] HCA 23, s 6 (‘Mabo’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "subsequent-short",
    expected: "Mabo (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "subsequent-short+page",
    expected: "Mabo (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "subsequent-short+paragraph",
    expected: "Mabo (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "subsequent-short+section",
    expected: "Mabo (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "bibliography-entry",
    expected: "Mabo v Queensland (1992) HCA 23",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "parallel",
    expected: "Mabo v Queensland [1992] HCA 23 (‘Mabo’)",
    rule: "AGLC4 2.2.7 parallel citations are never emitted in academic AGLC; identical to 'first'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "first",
    expected: "Corr v IBC Vehicles Ltd [2008] 1 AC 884 (‘Corr’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "first+page",
    expected: "Corr v IBC Vehicles Ltd [2008] 1 AC 884, 42 (‘Corr’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "first+paragraph",
    expected: "Corr v IBC Vehicles Ltd [2008] 1 AC 884 [42] (‘Corr’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "first+section",
    expected: "Corr v IBC Vehicles Ltd [2008] 1 AC 884, 6 (‘Corr’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-short",
    expected: "Corr (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-short+page",
    expected: "Corr (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-short+paragraph",
    expected: "Corr (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-short+section",
    expected: "Corr (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "bibliography-entry",
    expected: "Corr v IBC Vehicles Ltd [2008] 1 AC 884",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "parallel",
    expected: "Corr v IBC Vehicles Ltd [2008] 1 AC 884 (‘Corr’)",
    rule: "AGLC4 2.2.7 parallel citations are never emitted in academic AGLC; identical to 'first'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "first",
    expected:
      "AXA General Insurance Ltd v Lord Advocate (2011) SC 158 (‘AXA General Insurance Ltd’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "first+page",
    expected:
      "AXA General Insurance Ltd v Lord Advocate (2011) SC 158, 42 (‘AXA General Insurance Ltd’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "first+paragraph",
    expected:
      "AXA General Insurance Ltd v Lord Advocate (2011) SC 158 [42] (‘AXA General Insurance Ltd’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "first+section",
    expected:
      "AXA General Insurance Ltd v Lord Advocate (2011) SC 158, 6 (‘AXA General Insurance Ltd’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "subsequent-short",
    expected: "AXA General Insurance Ltd (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "subsequent-short+page",
    expected: "AXA General Insurance Ltd (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "subsequent-short+paragraph",
    expected: "AXA General Insurance Ltd (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "subsequent-short+section",
    expected: "AXA General Insurance Ltd (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "bibliography-entry",
    expected: "AXA General Insurance Ltd v Lord Advocate (2011) SC 158",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "parallel",
    expected:
      "AXA General Insurance Ltd v Lord Advocate (2011) SC 158 (‘AXA General Insurance Ltd’)",
    rule: "AGLC4 2.2.7 parallel citations are never emitted in academic AGLC; identical to 'first'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "first",
    expected: "Wilson v Commissioner of Valuation [2010] NI 48 (‘Wilson’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "first+page",
    expected: "Wilson v Commissioner of Valuation [2010] NI 48, 42 (‘Wilson’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "first+paragraph",
    expected: "Wilson v Commissioner of Valuation [2010] NI 48 [42] (‘Wilson’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "first+section",
    expected: "Wilson v Commissioner of Valuation [2010] NI 48, 6 (‘Wilson’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "subsequent-short",
    expected: "Wilson (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "subsequent-short+page",
    expected: "Wilson (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "subsequent-short+paragraph",
    expected: "Wilson (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "subsequent-short+section",
    expected: "Wilson (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "bibliography-entry",
    expected: "Wilson v Commissioner of Valuation [2010] NI 48",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "parallel",
    expected: "Wilson v Commissioner of Valuation [2010] NI 48 (‘Wilson’)",
    rule: "AGLC4 2.2.7 parallel citations are never emitted in academic AGLC; identical to 'first'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "first",
    expected: "Langan v Executive [2024] IESC 1 (‘Langan’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "AGLC case-name given-name stripping (rule 2.1.1) removes 'Health Service' from the institutional party; recorded as current output, a pre-existing AGLC quirk outside STD",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "first+page",
    expected: "Langan v Executive [2024] IESC 1, 42 (‘Langan’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "AGLC case-name given-name stripping (rule 2.1.1) removes 'Health Service' from the institutional party; recorded as current output, a pre-existing AGLC quirk outside STD",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "first+paragraph",
    expected: "Langan v Executive [2024] IESC 1, [42] (‘Langan’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "AGLC case-name given-name stripping (rule 2.1.1) removes 'Health Service' from the institutional party; recorded as current output, a pre-existing AGLC quirk outside STD",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "first+section",
    expected: "Langan v Executive [2024] IESC 1, s 6 (‘Langan’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "subsequent-short",
    expected: "Langan (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "subsequent-short+page",
    expected: "Langan (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "subsequent-short+paragraph",
    expected: "Langan (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "subsequent-short+section",
    expected: "Langan (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "bibliography-entry",
    expected: "Langan v Health Service Executive (2024) IESC 1",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "AGLC case-name given-name stripping (rule 2.1.1) removes 'Health Service' from the institutional party; recorded as current output, a pre-existing AGLC quirk outside STD",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "parallel",
    expected: "Langan v Executive [2024] IESC 1 (‘Langan’)",
    rule: "AGLC4 2.2.7 parallel citations are never emitted in academic AGLC; identical to 'first'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "first",
    expected: "Brooker v Police [2007] 3 NZLR 91 (‘Brooker’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "first+page",
    expected: "Brooker v Police [2007] 3 NZLR 91, 42 (‘Brooker’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "first+paragraph",
    expected: "Brooker v Police [2007] 3 NZLR 91 [42] (‘Brooker’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "first+section",
    expected: "Brooker v Police [2007] 3 NZLR 91, 6 (‘Brooker’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "subsequent-short",
    expected: "Brooker (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "subsequent-short+page",
    expected: "Brooker (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "subsequent-short+paragraph",
    expected: "Brooker (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "subsequent-short+section",
    expected: "Brooker (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "bibliography-entry",
    expected: "Brooker v Police [2007] 3 NZLR 91",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "parallel",
    expected: "Brooker v Police [2007] 3 NZLR 91 (‘Brooker’)",
    rule: "AGLC4 2.2.7 parallel citations are never emitted in academic AGLC; identical to 'first'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "first",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 (CA) (‘Taylor’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "first+page",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394, 42 (CA) (‘Taylor’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "first+paragraph",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 [42] (CA) (‘Taylor’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "first+section",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394, 6 (CA) (‘Taylor’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "subsequent-short",
    expected: "Taylor (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "subsequent-short+page",
    expected: "Taylor (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "subsequent-short+paragraph",
    expected: "Taylor (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "subsequent-short+section",
    expected: "Taylor (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "bibliography-entry",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "parallel",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 (CA) (‘Taylor’)",
    rule: "AGLC4 2.2.7 parallel citations are never emitted in academic AGLC; identical to 'first'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "first",
    expected: " (2017) (‘Pacey v Adlam’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "AGLC4 has no Māori Land Court form (rule 21 cites NZ cases as reported cases); the fall-through output is recorded as-is",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "first+page",
    expected: " (2017), 42 (‘Pacey v Adlam’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "AGLC4 has no Māori Land Court form (rule 21 cites NZ cases as reported cases); the fall-through output is recorded as-is",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "first+paragraph",
    expected: " (2017), [42] (‘Pacey v Adlam’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "AGLC4 has no Māori Land Court form (rule 21 cites NZ cases as reported cases); the fall-through output is recorded as-is",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "first+section",
    expected: " (2017), s 6 (‘Pacey v Adlam’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "subsequent-short",
    expected: "Pacey v Adlam (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "subsequent-short+page",
    expected: "Pacey v Adlam (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "subsequent-short+paragraph",
    expected: "Pacey v Adlam (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "subsequent-short+section",
    expected: "Pacey v Adlam (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "bibliography-entry",
    expected: " (2017)",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "AGLC4 has no Māori Land Court form (rule 21 cites NZ cases as reported cases); the fall-through output is recorded as-is",
  },
  {
    fixture: "fx-wai-262",
    scenario: "first",
    expected: "Waitangi Tribunal, Ko Aotearoa Tēnei (2011) (‘Ko Aotearoa Tēnei’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-wai-262",
    scenario: "first+page",
    expected: "Waitangi Tribunal, Ko Aotearoa Tēnei (2011) 42 (‘Ko Aotearoa Tēnei’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-wai-262",
    scenario: "first+paragraph",
    expected: "Waitangi Tribunal, Ko Aotearoa Tēnei (2011) [42] (‘Ko Aotearoa Tēnei’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-wai-262",
    scenario: "first+section",
    expected: "Waitangi Tribunal, Ko Aotearoa Tēnei (2011) s 6 (‘Ko Aotearoa Tēnei’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-wai-262",
    scenario: "subsequent-short",
    expected: "Ko Aotearoa Tēnei (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-wai-262",
    scenario: "subsequent-short+page",
    expected: "Ko Aotearoa Tēnei (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-wai-262",
    scenario: "subsequent-short+paragraph",
    expected: "Ko Aotearoa Tēnei (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-wai-262",
    scenario: "subsequent-short+section",
    expected: "Ko Aotearoa Tēnei (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-wai-262",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-wai-262",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-wai-262",
    scenario: "bibliography-entry",
    expected: "Ko Aotearoa Tēnei (2011)",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "first",
    expected: "Human Rights Act 1998 (UK) (‘HRA 1998’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "first+page",
    expected: "Human Rights Act 1998 (UK) 42 (‘HRA 1998’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "first+paragraph",
    expected: "Human Rights Act 1998 (UK) para [42] (‘HRA 1998’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "first+section",
    expected: "Human Rights Act 1998 (UK) s 6 (‘HRA 1998’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-short",
    expected: "HRA 1998 (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-short+page",
    expected: "HRA 1998 (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-short+paragraph",
    expected: "HRA 1998 (n 1) para [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-short+section",
    expected: "HRA 1998 (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "bibliography-entry",
    expected: "Human Rights Act 1998 (UK)",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "first",
    expected: "Russia (Sanctions) (EU Exit) Regulations 2019 (UK) (‘Russia Sanctions Regulations’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "first+page",
    expected:
      "Russia (Sanctions) (EU Exit) Regulations 2019 (UK) 42 (‘Russia Sanctions Regulations’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "first+paragraph",
    expected:
      "Russia (Sanctions) (EU Exit) Regulations 2019 (UK) para [42] (‘Russia Sanctions Regulations’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "first+section",
    expected:
      "Russia (Sanctions) (EU Exit) Regulations 2019 (UK) s 6 (‘Russia Sanctions Regulations’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "subsequent-short",
    expected: "Russia Sanctions Regulations (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "subsequent-short+page",
    expected: "Russia Sanctions Regulations (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "subsequent-short+paragraph",
    expected: "Russia Sanctions Regulations (n 1) para [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "subsequent-short+section",
    expected: "Russia Sanctions Regulations (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "bibliography-entry",
    expected: "Russia (Sanctions) (EU Exit) Regulations 2019 (UK)",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "first",
    expected: "Privacy Act 2020 (NZ) (‘Privacy Act’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "first+page",
    expected: "Privacy Act 2020 (NZ) 42 (‘Privacy Act’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "first+paragraph",
    expected: "Privacy Act 2020 (NZ) para [42] (‘Privacy Act’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "first+section",
    expected: "Privacy Act 2020 (NZ) s 6 (‘Privacy Act’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "subsequent-short",
    expected: "Privacy Act (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "subsequent-short+page",
    expected: "Privacy Act (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "subsequent-short+paragraph",
    expected: "Privacy Act (n 1) para [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "subsequent-short+section",
    expected: "Privacy Act (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "bibliography-entry",
    expected: "Privacy Act 2020 (NZ)",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "first",
    expected: "Costs in Criminal Cases Regulations 1987 (NZ) (‘Costs Regulations’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "first+page",
    expected: "Costs in Criminal Cases Regulations 1987 (NZ) 42 (‘Costs Regulations’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "first+paragraph",
    expected: "Costs in Criminal Cases Regulations 1987 (NZ) para [42] (‘Costs Regulations’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "first+section",
    expected: "Costs in Criminal Cases Regulations 1987 (NZ) s 6 (‘Costs Regulations’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "subsequent-short",
    expected: "Costs Regulations (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "subsequent-short+page",
    expected: "Costs Regulations (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "subsequent-short+paragraph",
    expected: "Costs Regulations (n 1) para [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "subsequent-short+section",
    expected: "Costs Regulations (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "bibliography-entry",
    expected: "Costs in Criminal Cases Regulations 1987 (NZ)",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "first",
    expected: "Native Title Act 1993 (Cth) (‘Native Title Act’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "first+page",
    expected: "Native Title Act 1993 (Cth) 42 (‘Native Title Act’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "first+paragraph",
    expected: "Native Title Act 1993 (Cth) para [42] (‘Native Title Act’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "first+section",
    expected: "Native Title Act 1993 (Cth) s 6 (‘Native Title Act’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "subsequent-short",
    expected: "Native Title Act (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "subsequent-short+page",
    expected: "Native Title Act (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "subsequent-short+paragraph",
    expected: "Native Title Act (n 1) para [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "subsequent-short+section",
    expected: "Native Title Act (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "bibliography-entry",
    expected: "Native Title Act 1993 (Cth)",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "first",
    expected:
      "Harold Luntz, Assessment of Damages for Personal Injury and Death (LexisNexis Butterworths, 4th ed, 2002) (‘Luntz’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "first+page",
    expected:
      "Harold Luntz, Assessment of Damages for Personal Injury and Death (LexisNexis Butterworths, 4th ed, 2002) 42 (‘Luntz’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "first+paragraph",
    expected:
      "Harold Luntz, Assessment of Damages for Personal Injury and Death (LexisNexis Butterworths, 4th ed, 2002) [42] (‘Luntz’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "first+section",
    expected:
      "Harold Luntz, Assessment of Damages for Personal Injury and Death (LexisNexis Butterworths, 4th ed, 2002) s 6 (‘Luntz’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-short",
    expected: "Luntz (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-short+page",
    expected: "Luntz (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-short+paragraph",
    expected: "Luntz (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-short+section",
    expected: "Luntz (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "bibliography-entry",
    expected:
      "Luntz, Harold, Assessment of Damages for Personal Injury and Death (Sydney, LexisNexis Butterworths, 4 ed, 2002)",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "bibliography entry renders '4 ed' and leads with the place; from the simplified formatBibliographyEntry, STD-018 owns the fix",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "first",
    expected:
      "John Gardner, ‘The Purity and Priority of Private Law’ in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing, 2009) 1 (‘Gardner’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "first+page",
    expected:
      "John Gardner, ‘The Purity and Priority of Private Law’ in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing, 2009) 1, 42 (‘Gardner’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "first+paragraph",
    expected:
      "John Gardner, ‘The Purity and Priority of Private Law’ in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing, 2009) 1, [42] (‘Gardner’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "first+section",
    expected:
      "John Gardner, ‘The Purity and Priority of Private Law’ in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing, 2009) 1, s 6 (‘Gardner’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "subsequent-short",
    expected: "Gardner (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "subsequent-short+page",
    expected: "Gardner (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "subsequent-short+paragraph",
    expected: "Gardner (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "subsequent-short+section",
    expected: "Gardner (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "bibliography-entry",
    expected: "Gardner, John (Oxford, Hart Publishing, 2009)",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "bibliography entry for book.chapter comes from the simplified formatBibliographyEntry (bibliography.ts:363); STD-018 owns the fix",
  },
  {
    fixture: "fx-article-young",
    scenario: "first",
    expected: "Alison L Young, ‘In Defence of Due Deference’ (2009) 72 MLR 554 (‘Young’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-article-young",
    scenario: "first+page",
    expected: "Alison L Young, ‘In Defence of Due Deference’ (2009) 72 MLR 554, 42 (‘Young’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-article-young",
    scenario: "first+paragraph",
    expected: "Alison L Young, ‘In Defence of Due Deference’ (2009) 72 MLR 554, [42] (‘Young’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-article-young",
    scenario: "first+section",
    expected: "Alison L Young, ‘In Defence of Due Deference’ (2009) 72 MLR 554, s 6 (‘Young’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-article-young",
    scenario: "subsequent-short",
    expected: "Young (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-article-young",
    scenario: "subsequent-short+page",
    expected: "Young (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-article-young",
    scenario: "subsequent-short+paragraph",
    expected: "Young (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-article-young",
    scenario: "subsequent-short+section",
    expected: "Young (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-article-young",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-article-young",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-article-young",
    scenario: "bibliography-entry",
    expected: "Young, Alison L, ‘In Defence of Due Deference’ (2009) 72 MLR 554",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "first",
    expected:
      "Javan Herberg, ‘Injunctive Relief for Wrongful Termination of Employment’ (DPhil thesis, University of Oxford, 1989) (‘Herberg’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "first+page",
    expected:
      "Javan Herberg, ‘Injunctive Relief for Wrongful Termination of Employment’ (DPhil thesis, University of Oxford, 1989) (‘Herberg’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "first+paragraph",
    expected:
      "Javan Herberg, ‘Injunctive Relief for Wrongful Termination of Employment’ (DPhil thesis, University of Oxford, 1989) (‘Herberg’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "first+section",
    expected:
      "Javan Herberg, ‘Injunctive Relief for Wrongful Termination of Employment’ (DPhil thesis, University of Oxford, 1989) (‘Herberg’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "subsequent-short",
    expected: "Herberg (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "subsequent-short+page",
    expected: "Herberg (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "subsequent-short+paragraph",
    expected: "Herberg (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "subsequent-short+section",
    expected: "Herberg (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "bibliography-entry",
    expected: "Herberg, Javan, Injunctive Relief for Wrongful Termination of Employment (1989)",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "first",
    expected:
      "Cyclefree, ‘Is This Really Necessary, Minister?’, Legal Feminist (Blog Post, 27 April 2023) <https://perma.cc/3THK-P4AX> (‘Cyclefree’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "first+page",
    expected:
      "Cyclefree, ‘Is This Really Necessary, Minister?’, Legal Feminist (Blog Post, 27 April 2023) 42 <https://perma.cc/3THK-P4AX> (‘Cyclefree’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "first+paragraph",
    expected:
      "Cyclefree, ‘Is This Really Necessary, Minister?’, Legal Feminist (Blog Post, 27 April 2023) [42] <https://perma.cc/3THK-P4AX> (‘Cyclefree’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "first+section",
    expected:
      "Cyclefree, ‘Is This Really Necessary, Minister?’, Legal Feminist (Blog Post, 27 April 2023) s 6 <https://perma.cc/3THK-P4AX> (‘Cyclefree’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "subsequent-short",
    expected: "Cyclefree (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "subsequent-short+page",
    expected: "Cyclefree (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "subsequent-short+paragraph",
    expected: "Cyclefree (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "subsequent-short+section",
    expected: "Cyclefree (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "bibliography-entry",
    expected: "Cyclefree, ‘Is This Really Necessary, Minister?’",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "first",
    expected: "UK, Parliamentary Debates, HC, 3 February 1977, 973 (‘HC Deb 3 February 1977’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "first+page",
    expected: "UK, Parliamentary Debates, HC, 3 February 1977, 42 (‘HC Deb 3 February 1977’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "first+paragraph",
    expected: "UK, Parliamentary Debates, HC, 3 February 1977, [42] (‘HC Deb 3 February 1977’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "first+section",
    expected: "UK, Parliamentary Debates, HC, 3 February 1977, 6 (‘HC Deb 3 February 1977’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "subsequent-short",
    expected: "‘HC Deb 3 February 1977’ (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "subsequent-short+page",
    expected: "‘HC Deb 3 February 1977’ (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "subsequent-short+paragraph",
    expected: "‘HC Deb 3 February 1977’ (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "subsequent-short+section",
    expected: "‘HC Deb 3 February 1977’ (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "first",
    expected:
      "NZ, Parliamentary Debates, House of Representatives, 6 April 2005 (‘NZPD 6 April 2005’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "AGLC4 rule 21 (NZ Hansard) not implemented; fall-through output recorded as-is",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "first+page",
    expected:
      "NZ, Parliamentary Debates, House of Representatives, 6 April 2005, 42 (‘NZPD 6 April 2005’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "AGLC4 rule 21 (NZ Hansard) not implemented; fall-through output recorded as-is",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "first+paragraph",
    expected:
      "NZ, Parliamentary Debates, House of Representatives, 6 April 2005, [42] (‘NZPD 6 April 2005’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "AGLC4 rule 21 (NZ Hansard) not implemented; fall-through output recorded as-is",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "first+section",
    expected:
      "NZ, Parliamentary Debates, House of Representatives, 6 April 2005, 6 (‘NZPD 6 April 2005’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "subsequent-short",
    expected: "‘NZPD 6 April 2005’ (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "subsequent-short+page",
    expected: "‘NZPD 6 April 2005’ (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "subsequent-short+paragraph",
    expected: "‘NZPD 6 April 2005’ (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "subsequent-short+section",
    expected: "‘NZPD 6 April 2005’ (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-cth",
    scenario: "first",
    expected:
      "Commonwealth, Parliamentary Debates, House of Representatives, 12 March 2020, 2345 (Anthony Albanese) (‘Hansard 12 March 2020’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-cth",
    scenario: "first+page",
    expected:
      "Commonwealth, Parliamentary Debates, House of Representatives, 12 March 2020, 42 (Anthony Albanese) (‘Hansard 12 March 2020’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-cth",
    scenario: "first+paragraph",
    expected:
      "Commonwealth, Parliamentary Debates, House of Representatives, 12 March 2020, [42] (Anthony Albanese) (‘Hansard 12 March 2020’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-cth",
    scenario: "first+section",
    expected:
      "Commonwealth, Parliamentary Debates, House of Representatives, 12 March 2020, 6 (Anthony Albanese) (‘Hansard 12 March 2020’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-cth",
    scenario: "subsequent-short",
    expected: "‘Hansard 12 March 2020’ (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-cth",
    scenario: "subsequent-short+page",
    expected: "‘Hansard 12 March 2020’ (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-cth",
    scenario: "subsequent-short+paragraph",
    expected: "‘Hansard 12 March 2020’ (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-cth",
    scenario: "subsequent-short+section",
    expected: "‘Hansard 12 March 2020’ (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-cth",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-hansard-cth",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "first",
    expected:
      "Rome Statute of the International Criminal Court, opened for signature 17 July 1998, 2187 UNTS 3 (entered into force 1 July 2002) (‘Rome Statute’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "first+page",
    expected:
      "Rome Statute of the International Criminal Court, opened for signature 17 July 1998, 2187 UNTS 3 (entered into force 1 July 2002) 42 (‘Rome Statute’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "first+paragraph",
    expected:
      "Rome Statute of the International Criminal Court, opened for signature 17 July 1998, 2187 UNTS 3 (entered into force 1 July 2002) [42] (‘Rome Statute’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "first+section",
    expected:
      "Rome Statute of the International Criminal Court, opened for signature 17 July 1998, 2187 UNTS 3 (entered into force 1 July 2002) s 6 (‘Rome Statute’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "subsequent-short",
    expected: "Rome Statute (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "subsequent-short+page",
    expected: "Rome Statute (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "subsequent-short+paragraph",
    expected: "Rome Statute (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "subsequent-short+section",
    expected: "Rome Statute (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "bibliography-entry",
    expected: "Rome Statute of the International Criminal Court",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "first",
    expected:
      "Balogh v Hungary (European Court of Human Rights, Application No 47940/99, 20 July 2004) (‘Balogh’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "first+page",
    expected:
      "Balogh v Hungary (European Court of Human Rights, Application No 47940/99, 20 July 2004) [object Object] (‘Balogh’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "occurrence pinpoints on echr.decision render '[object Object]' (dispatcher passes data.pinpoint as a string) — pre-existing AGLC defect, recorded as-is",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "first+paragraph",
    expected:
      "Balogh v Hungary (European Court of Human Rights, Application No 47940/99, 20 July 2004) [object Object] (‘Balogh’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "occurrence pinpoints on echr.decision render '[object Object]' (dispatcher passes data.pinpoint as a string) — pre-existing AGLC defect, recorded as-is",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "first+section",
    expected:
      "Balogh v Hungary (European Court of Human Rights, Application No 47940/99, 20 July 2004) [object Object] (‘Balogh’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "subsequent-short",
    expected: "Balogh (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "subsequent-short+page",
    expected: "Balogh (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "subsequent-short+paragraph",
    expected: "Balogh (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "subsequent-short+section",
    expected: "Balogh (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "first",
    expected:
      "European Commission v Hellenic Republic (Court of Justice of the European Union, C-363/16, ECLI:EU:C:2018:12, 17 January 2018) (‘Commission v Hellenic Republic’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "first+page",
    expected:
      "European Commission v Hellenic Republic (Court of Justice of the European Union, C-363/16, ECLI:EU:C:2018:12, 17 January 2018) [object Object] (‘Commission v Hellenic Republic’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "occurrence pinpoints on eu.court render '[object Object]' (dispatcher passes data.pinpoint as a string) — pre-existing AGLC defect, recorded as-is",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "first+paragraph",
    expected:
      "European Commission v Hellenic Republic (Court of Justice of the European Union, C-363/16, ECLI:EU:C:2018:12, 17 January 2018) [object Object] (‘Commission v Hellenic Republic’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "occurrence pinpoints on eu.court render '[object Object]' (dispatcher passes data.pinpoint as a string) — pre-existing AGLC defect, recorded as-is",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "first+section",
    expected:
      "European Commission v Hellenic Republic (Court of Justice of the European Union, C-363/16, ECLI:EU:C:2018:12, 17 January 2018) [object Object] (‘Commission v Hellenic Republic’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "subsequent-short",
    expected: "Commission v Hellenic Republic (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "subsequent-short+page",
    expected: "Commission v Hellenic Republic (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "subsequent-short+paragraph",
    expected: "Commission v Hellenic Republic (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "subsequent-short+section",
    expected: "Commission v Hellenic Republic (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "bibliography-entry",
    expected: " (2018)",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "occurrence pinpoints on eu.court render '[object Object]' (dispatcher passes data.pinpoint as a string) — pre-existing AGLC defect, recorded as-is",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "first",
    expected: "1373, UN Doc S/RES/1373 (28 September 2001) (‘SC Res 1373’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "first+page",
    expected: "1373, UN Doc S/RES/1373 (28 September 2001) [object Object] (‘SC Res 1373’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "occurrence pinpoints on un.document render '[object Object]' (dispatcher passes data.pinpoint as a string) — pre-existing AGLC defect, recorded as-is",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "first+paragraph",
    expected: "1373, UN Doc S/RES/1373 (28 September 2001) [object Object] (‘SC Res 1373’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
    note: "occurrence pinpoints on un.document render '[object Object]' (dispatcher passes data.pinpoint as a string) — pre-existing AGLC defect, recorded as-is",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "first+section",
    expected: "1373, UN Doc S/RES/1373 (28 September 2001) [object Object] (‘SC Res 1373’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "subsequent-short",
    expected: "SC Res 1373, UN Doc S/RES/1373 (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "subsequent-short+page",
    expected: "SC Res 1373, UN Doc S/RES/1373 (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "subsequent-short+paragraph",
    expected: "SC Res 1373, UN Doc S/RES/1373 (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "subsequent-short+section",
    expected: "SC Res 1373, UN Doc S/RES/1373 (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "first",
    expected:
      "Australian Law Reform Commission, Genes and Ingenuity: Gene Patenting and Human Health (Report No 99, 2004) (‘Genes and Ingenuity’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "first+page",
    expected:
      "Australian Law Reform Commission, Genes and Ingenuity: Gene Patenting and Human Health (Report No 99, 2004) (‘Genes and Ingenuity’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "first+paragraph",
    expected:
      "Australian Law Reform Commission, Genes and Ingenuity: Gene Patenting and Human Health (Report No 99, 2004) (‘Genes and Ingenuity’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "first+section",
    expected:
      "Australian Law Reform Commission, Genes and Ingenuity: Gene Patenting and Human Health (Report No 99, 2004) (‘Genes and Ingenuity’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "subsequent-short",
    expected: "Genes and Ingenuity (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "subsequent-short+page",
    expected: "Genes and Ingenuity (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "subsequent-short+paragraph",
    expected: "Genes and Ingenuity (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "subsequent-short+section",
    expected: "Genes and Ingenuity (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "bibliography-entry",
    expected: "Genes and Ingenuity: Gene Patenting and Human Health",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "first",
    expected:
      "Law Commission, Review of the Privacy Act 1993 (Report No 123, 2011) (‘Review of the Privacy Act’)",
    rule: "AGLC4 1.1, 2.2/3.1/etc: full first citation; 1.4.4 short-title introduction appended when a short title is stored",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "first+page",
    expected:
      "Law Commission, Review of the Privacy Act 1993 (Report No 123, 2011) (‘Review of the Privacy Act’)",
    rule: "AGLC4 1.1.6 page pinpoint after the citation (', 42' for cases, ' 42' after a bracket)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "first+paragraph",
    expected:
      "Law Commission, Review of the Privacy Act 1993 (Report No 123, 2011) (‘Review of the Privacy Act’)",
    rule: "AGLC4 1.1.6/2.2.5 paragraph pinpoint '[42]'",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "first+section",
    expected:
      "Law Commission, Review of the Privacy Act 1993 (Report No 123, 2011) (‘Review of the Privacy Act’)",
    rule: "AGLC4 3.1.4 section pinpoint 's 6' for legislation; other types render the bare value",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "subsequent-short",
    expected: "Review of the Privacy Act (n 1)",
    rule: "AGLC4 1.4.1 short title / author surname + (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "subsequent-short+page",
    expected: "Review of the Privacy Act (n 1) 42",
    rule: "AGLC4 1.4.1 + 1.1.6 pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "subsequent-short+paragraph",
    expected: "Review of the Privacy Act (n 1) [42]",
    rule: "AGLC4 1.4.1 + 2.2.5 paragraph pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "subsequent-short+section",
    expected: "Review of the Privacy Act (n 1) s 6",
    rule: "AGLC4 1.4.1 + 3.1.4 legislation pinpoint after (n X)",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "subsequent-ibid",
    expected: "Ibid",
    rule: "AGLC4 1.4.3 ibid for the immediately preceding footnote",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "subsequent-ibid+page",
    expected: "Ibid 42",
    rule: "AGLC4 1.4.3 ibid with a new pinpoint",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "bibliography-entry",
    expected: "Review of the Privacy Act 1993 (2011), Report No 123",
    rule: "AGLC4 1.13 bibliography entry (generateBibliographyForStandard, structure 'aglc')",
    source:
      "engine output captured 2026-09-22 via formatCitation(getStandardConfig('aglc4')) — byte-identical guard",
  },
];
