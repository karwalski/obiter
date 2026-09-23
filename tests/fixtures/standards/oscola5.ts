/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-002 — OSCOLA 5 expectation table.
 *
 * `expected` is the CORRECT rendering per the rule authority (OSCOLA 5 PDF,
 * docs/standards-rule-notes.md, repo rule quotes) — not the current engine
 * output. Where the engine renders something else today the row carries
 * `note: "currently renders: …"` so reviewers see the delta the Wave 2–3
 * fixes must close. Italics are not asserted in `expected` (plain text of
 * the runs); the rule note says where italics apply. Rows whose value could
 * not be confirmed carry `pending` (DECISION-040) and never fail.
 * Generated from capture.json by the STD-002 scratch script.
 */

import type { ExpectationTable } from "./types";

export const OSCOLA5_EXPECTATIONS: ExpectationTable = [
  {
    fixture: "fx-mabo-reported",
    scenario: "first",
    expected: "Mabo v Queensland (1992) 175 CLR 1 (HCA)",
    rule: "2.6.1: foreign case cited as at home with minimal punctuation and the court in brackets (ex 3: '(1988) 164 CLR 387 (HCA)'); 1.2.1/2.1.2: first-party short forms are not declared",
    source:
      "OSCOLA 5 §2.6.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "first+page",
    expected: "Mabo v Queensland (1992) 175 CLR 1 (HCA) 42",
    rule: "2.1.6: page pinpoint follows a bracketed court identifier with no comma",
    source:
      "OSCOLA 5 §2.1.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "first+paragraph",
    expected: "Mabo v Queensland (1992) 175 CLR 1 (HCA) [42]",
    rule: "2.1.6: paragraph pinpoint in square brackets at the very end, no comma; OSCOLA never writes 'at'",
    source:
      "OSCOLA 5 §2.1.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "parallel",
    expected: "Mabo v Queensland (1992) 175 CLR 1 (HCA)",
    rule: "2.1.3 + 2.6.1: an MNC is given only where one exists officially; the AustLII [1992] HCA 23 is retrospective and is not emitted, so 'parallel' equals 'first'",
    source:
      "OSCOLA 5 §2.1.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §1.1.1/§2.1.3 bar retrospective (pre-2001) MNCs for UK cases; whether the bar reaches a foreign AustLII MNC cited under §2.6.1 'as in its home jurisdiction' is unconfirmed",
    note: "currently renders: Mabo v Queensland (1992) 175 CLR 1 (HCA) (‘Mabo’)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-short",
    expected: "Mabo (n 1)",
    rule: "1.2.1/2.1.2: first-named party + (n X)",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-short+page",
    expected: "Mabo (n 1) 42",
    rule: "1.2.1: pinpoint after (n X) with no comma ('Stevens (n 1) 110')",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-short+paragraph",
    expected: "Mabo (n 1) [42]",
    rule: "1.2.1: 'Austin (n 1) [34]'",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-ibid",
    expected: "Mabo (n 1)",
    rule: "1.2.1/1.2.3: ibid is not used; the short form + (n X) is repeated",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-ibid+page",
    expected: "Mabo (n 1) 42",
    rule: "1.2.1/1.2.3: no ibid; short form + (n X) + pinpoint",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "bibliography-entry",
    expected: "Mabo v Queensland (1992) 175 CLR 1 (HCA)",
    rule: "1.6.2: table of cases entry in footnote form, case name not italicised, jurisdiction sections; primary sources never go in the bibliography (1.7)",
    source:
      "OSCOLA 5 §1.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "first",
    expected: "Mabo v Queensland [1992] HCA 23",
    rule: "2.6.1: as at home (AGLC 2.3.1 MNC form) — but the MNC is retrospective",
    source:
      "OSCOLA 5 §2.6.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §1.1.1/§2.1.3 bar retrospective (pre-2001) MNCs for UK cases; whether the bar reaches a foreign AustLII MNC cited under §2.6.1 'as in its home jurisdiction' is unconfirmed",
    note: "currently renders: Mabo v Queensland (‘Mabo’) — dispatchOscolaCase reads only neutralCitationYear/Court/Number (plan, Defects)",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "first+paragraph",
    expected: "Mabo v Queensland [1992] HCA 23 [42]",
    rule: "2.1.6: paragraph pinpoint after the MNC with no comma",
    source:
      "OSCOLA 5 §2.1.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §1.1.1/§2.1.3 bar retrospective (pre-2001) MNCs for UK cases; whether the bar reaches a foreign AustLII MNC cited under §2.6.1 'as in its home jurisdiction' is unconfirmed",
    note: "currently renders: Mabo v Queensland, [42] (‘Mabo’)",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "subsequent-short",
    expected: "Mabo (n 1)",
    rule: "1.2.1/2.1.2",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "subsequent-short+paragraph",
    expected: "Mabo (n 1) [42]",
    rule: "1.2.1",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "subsequent-ibid",
    expected: "Mabo (n 1)",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "bibliography-entry",
    expected: "Mabo v Queensland [1992] HCA 23",
    rule: "1.6.2: table of cases",
    source:
      "OSCOLA 5 §1.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §1.1.1/§2.1.3 bar retrospective (pre-2001) MNCs for UK cases; whether the bar reaches a foreign AustLII MNC cited under §2.6.1 'as in its home jurisdiction' is unconfirmed",
    note: "currently renders: Mabo v Queensland (1992) HCA 23",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "first",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884",
    rule: "2.1.1/2.1.3: italic name (including v), MNC, comma, best report; no court identifier after an MNC",
    source:
      "OSCOLA 5 §2.1.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "first+page",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884, 42",
    rule: "2.1.6: page pinpoint; comma per OSCOLA 4 §2.1.6 when no closing bracket precedes it",
    source:
      "OSCOLA 5 §2.1.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §2.1.6 states the no-comma rule only for citations ending in a bracketed court identifier; whether a page pinpoint after an MNC + report still takes the OSCOLA 4 §2.1.6 comma is unconfirmed (Unresolved 1)",
    note: "currently renders: Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884, 42 (‘Corr’)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "first+paragraph",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884 [42]",
    rule: "2.1.6: '[2001] 1 WLR 2112 [42], [45]' — no comma before a paragraph pinpoint",
    source:
      "OSCOLA 5 §2.1.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "parallel",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884",
    rule: "2.1.3: reported judgment with an MNC gives MNC then best report, comma separated (parallel form is mandatory, unlike AGLC 2.2.7)",
    source:
      "OSCOLA 5 §2.1.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-short",
    expected: "Corr (n 1)",
    rule: "1.2.1/2.1.2: 'Phelps (n 14)'",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-short+page",
    expected: "Corr (n 1) 42",
    rule: "1.2.1: 'Roberts (n 1) 410'",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-short+paragraph",
    expected: "Corr (n 1) [42]",
    rule: "1.2.1: 'Austin (n 1) [34]'",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-ibid",
    expected: "Corr (n 1)",
    rule: "1.2.1/1.2.3: ibid removed in the 5th edition (key changes ch 1)",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-ibid+page",
    expected: "Corr (n 1) 42",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "bibliography-entry",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884",
    rule: "1.6.2: table of cases keeps the full footnote citation including the MNC ('A v Bottrill [2002] UKPC 44, [2003] 1 AC 449'), name not italic",
    source:
      "OSCOLA 5 §1.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "first",
    expected: "AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, 2011 SC 158",
    rule: "2.2.1: Session Cases year takes no brackets when it locates the case ('[2023] CSIH 32, 2023 SLT 823'); no (IH)/(OH) needed after an MNC",
    source:
      "OSCOLA 5 §2.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders: AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, (2011) SC 158 (‘AXA General Insurance Ltd’) — no AGLC 1.4.4 short-title introduction under OSCOLA (plan: appendFirstCitationSuffixes runs for every standard)",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "first+paragraph",
    expected: "AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, 2011 SC 158 [42]",
    rule: "2.2.1: pinpoint as for England and Wales ('2006 JC 119 [23]–[24]')",
    source:
      "OSCOLA 5 §2.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders: AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, (2011) SC 158, [42] (‘AXA General Insurance Ltd’)",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "first+page",
    expected: "AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, 2011 SC 158, 42",
    rule: "2.2.1 + 2.1.6: page pinpoint; comma per OSCOLA 4 when no bracket precedes",
    source:
      "OSCOLA 5 §2.1.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §2.1.6 states the no-comma rule only for citations ending in a bracketed court identifier; whether a page pinpoint after an MNC + report still takes the OSCOLA 4 §2.1.6 comma is unconfirmed (Unresolved 1)",
    note: "currently renders: AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, (2011) SC 158, 42 (‘AXA General Insurance Ltd’)",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "parallel",
    expected: "AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, 2011 SC 158",
    rule: "2.2.1: MNC then Session Cases, comma separated",
    source:
      "OSCOLA 5 §2.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders: AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, (2011) SC 158 (‘AXA General Insurance Ltd’)",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "subsequent-short",
    expected: "AXA General Insurance Ltd (n 1)",
    rule: "2.1.2: the short form is the party that stands first in the full name; no further abbreviation is exemplified",
    source:
      "OSCOLA 5 §2.1.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "subsequent-ibid",
    expected: "AXA General Insurance Ltd (n 1)",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "bibliography-entry",
    expected: "AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, 2011 SC 158",
    rule: "1.6.2: table of cases (Scotland section)",
    source:
      "OSCOLA 5 §1.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders: AXA General Insurance Ltd v Lord Advocate (2011) SC 158",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "first",
    expected: "Wilson v Commissioner of Valuation [2009] NICA 30, [2010] NI 48",
    rule: "2.3.1: NI MNC on the E&W model, then the NI report; court identifier only without an MNC",
    source:
      "OSCOLA 5 §2.3.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "first+paragraph",
    expected: "Wilson v Commissioner of Valuation [2009] NICA 30, [2010] NI 48 [42]",
    rule: "2.1.6 (applied to NI per 2.3.1)",
    source:
      "OSCOLA 5 §2.1.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "first+page",
    expected: "Wilson v Commissioner of Valuation [2009] NICA 30, [2010] NI 48, 42",
    rule: "2.1.6: page pinpoint after a report with no closing bracket",
    source:
      "OSCOLA 5 §2.1.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §2.1.6 states the no-comma rule only for citations ending in a bracketed court identifier; whether a page pinpoint after an MNC + report still takes the OSCOLA 4 §2.1.6 comma is unconfirmed (Unresolved 1)",
    note: "currently renders: Wilson v Commissioner of Valuation [2009] NICA 30, [2010] NI 48, 42 (‘Wilson’)",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "parallel",
    expected: "Wilson v Commissioner of Valuation [2009] NICA 30, [2010] NI 48",
    rule: "2.3.1",
    source:
      "OSCOLA 5 §2.3.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "subsequent-short",
    expected: "Wilson (n 1)",
    rule: "1.2.1/2.1.2",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "subsequent-ibid",
    expected: "Wilson (n 1)",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "bibliography-entry",
    expected: "Wilson v Commissioner of Valuation [2009] NICA 30, [2010] NI 48",
    rule: "1.6.2: table of cases (NI section)",
    source:
      "OSCOLA 5 §1.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "first",
    expected: "Langan v Health Service Executive [2024] IESC 1",
    rule: "2.6.1: other jurisdictions cited as at home without full stops; repo OSC-014 Irish neutral citation form",
    source:
      "OSCOLA 5 §2.6.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22) + repo OSC-014",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "first+paragraph",
    expected: "Langan v Health Service Executive [2024] IESC 1 [42]",
    rule: "2.1.6 applied to a foreign MNC",
    source:
      "OSCOLA 5 §2.6.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §2.6.1 cites Irish cases as in their home jurisdiction; the Irish paragraph-pinpoint form ('[2024] IESC 1 [42]' versus ', para 42') is in neither the OSCOLA 5 text nor the repo OSC-014 notes",
    note: "currently renders: Langan v Health Service Executive [2024] IESC 1, [42] (‘Langan’)",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "subsequent-short",
    expected: "Langan (n 1)",
    rule: "1.2.1/2.1.2",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "subsequent-ibid",
    expected: "Langan (n 1)",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "bibliography-entry",
    expected: "Langan v Health Service Executive [2024] IESC 1",
    rule: "1.6.2: table of cases (Ireland section)",
    source:
      "OSCOLA 5 §1.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "first",
    expected: "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91",
    rule: "2.6.1: as at home (NZLSG 3.2: neutral citation, comma, best report); ex 4 shows OSCOLA re-punctuating an HCA MNC + report with a comma",
    source:
      "OSCOLA 5 §2.6.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "first+paragraph",
    expected: "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91 [42]",
    rule: "2.1.6 + 2.6.1: OSCOLA's own pinpoint punctuation (no 'at')",
    source:
      "OSCOLA 5 §2.1.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "parallel",
    expected: "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91",
    rule: "2.6.1 + 2.1.3",
    source:
      "OSCOLA 5 §2.6.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "subsequent-short",
    expected: "Brooker (n 1)",
    rule: "1.2.1/2.1.2",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "subsequent-ibid",
    expected: "Brooker (n 1)",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "bibliography-entry",
    expected: "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91",
    rule: "1.6.2: table of cases (New Zealand section)",
    source:
      "OSCOLA 5 §1.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "first",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 (CA)",
    rule: "2.6.1: court in brackets when the series does not show it ('[2018] 1 NZLR 245 (SC)')",
    source:
      "OSCOLA 5 §2.6.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "first+page",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 (CA) 42",
    rule: "2.1.6: page pinpoint after a bracketed court identifier, no comma",
    source:
      "OSCOLA 5 §2.1.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "first+paragraph",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 (CA) [42]",
    rule: "2.1.6",
    source:
      "OSCOLA 5 §2.1.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "subsequent-short+page",
    expected: "Taylor (n 1) 42",
    rule: "1.2.1: 'Witham (n 1) 576'",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "subsequent-ibid+page",
    expected: "Taylor (n 1) 42",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "bibliography-entry",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 (CA)",
    rule: "1.6.2: table of cases",
    source:
      "OSCOLA 5 §1.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "first",
    expected: "Pacey v Adlam – Matata Parish 39A 2B 2B 2A (2017) 178 Waiariki MB 32 (178 WAR 32)",
    rule: "2.6.1: foreign primary source as at home (NZLSG 3.5 minute-book form)",
    source:
      "OSCOLA 5 §2.6.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders:  (2017) (‘Pacey v Adlam’) — no AGLC 1.4.4 short-title introduction under OSCOLA (plan: appendFirstCitationSuffixes runs for every standard)",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "subsequent-short",
    expected: "Pacey v Adlam (n 1)",
    rule: "1.2.1/2.1.2: short case name + (n X)",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "bibliography-entry",
    expected: "Pacey v Adlam – Matata Parish 39A 2B 2B 2A (2017) 178 Waiariki MB 32 (178 WAR 32)",
    rule: "1.6.2: table of cases (New Zealand section)",
    source:
      "OSCOLA 5 §1.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders:  (2017)",
  },
  {
    fixture: "fx-wai-262",
    scenario: "first",
    expected: "Waitangi Tribunal, Ko Aotearoa Tēnei (Wai 262, 2011)",
    rule: "3.7.10/3.1: organisation as author, italic title, identifying information in brackets",
    source:
      "OSCOLA 5 §3.7.10 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 has no Waitangi Tribunal form; the §3.7.10 general-principles rendering ('Waitangi Tribunal, Title (Wai 262, 2011)') and its short form are unconfirmed",
    note: "currently renders: Waitangi Tribunal, Ko Aotearoa Tēnei (2011) (‘Ko Aotearoa Tēnei’)",
  },
  {
    fixture: "fx-wai-262",
    scenario: "first+page",
    expected: "Waitangi Tribunal, Ko Aotearoa Tēnei (Wai 262, 2011) 42",
    rule: "3.1.3: bare page after the bracket",
    source:
      "OSCOLA 5 §3.1.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 has no Waitangi Tribunal form; the §3.7.10 general-principles rendering ('Waitangi Tribunal, Title (Wai 262, 2011)') and its short form are unconfirmed",
    note: "currently renders: Waitangi Tribunal, Ko Aotearoa Tēnei (2011) 42 (‘Ko Aotearoa Tēnei’)",
  },
  {
    fixture: "fx-wai-262",
    scenario: "subsequent-short",
    expected: "Waitangi Tribunal (n 1)",
    rule: "1.2.1/3.1.1: organisational author + (n X)",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 has no Waitangi Tribunal form; the §3.7.10 general-principles rendering ('Waitangi Tribunal, Title (Wai 262, 2011)') and its short form are unconfirmed",
    note: "currently renders: Ko Aotearoa Tēnei (n 1)",
  },
  {
    fixture: "fx-wai-262",
    scenario: "bibliography-entry",
    expected: "Waitangi Tribunal, Ko Aotearoa Tēnei (Wai 262, 2011)",
    rule: "1.7: bibliography entry (organisation names are not inverted)",
    source:
      "OSCOLA 5 §1.7 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 has no Waitangi Tribunal form; the §3.7.10 general-principles rendering ('Waitangi Tribunal, Title (Wai 262, 2011)') and its short form are unconfirmed",
    note: "currently renders: Ko Aotearoa Tēnei (2011)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "first",
    expected: "Human Rights Act 1998 (‘HRA 1998’)",
    rule: "2.4.1: short title and year, roman, no comma; 1.2.1: a stored short form is declared at the end of the full citation in round brackets with single quotes ('(‘SARAH’)')",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "first+section",
    expected: "Human Rights Act 1998 (‘HRA 1998’) s 6",
    rule: "2.4.2: footnote form 'Act 1998, s 6'; with a declared short form the section follows the bracket with no comma ('Act 2015 (‘SARAH’) s 1')",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-short",
    expected: "HRA 1998",
    rule: "1.2.1: declared short form used alone, no (n X)",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-short+section",
    expected: "HRA 1998, s 6",
    rule: "1.2.1: 'SARAH, s 2' — comma then section",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-ibid",
    expected: "HRA 1998",
    rule: "1.2.1/1.2.3: no ibid; short form repeated",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-ibid+page",
    expected: "HRA 1998, 42",
    rule: "1.2.1: short form, comma, pinpoint",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §1.2.1 shows legislation short forms only with a section pinpoint ('SARAH, s 2'); a page pinpoint to an Act is not exemplified",
    note: "currently renders: HRA 1998 (n 1) 42",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "bibliography-entry",
    expected: "Human Rights Act 1998",
    rule: "1.6.3: table of legislation, roman, alphabetical by first significant word",
    source:
      "OSCOLA 5 §1.6.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "first",
    expected:
      "Russia (Sanctions) (EU Exit) Regulations 2019, SI 2019/855 (‘Russia Sanctions Regulations’)",
    rule: "2.5.1: name, year, comma, SI year/number; 1.2.1: declared short form at the end",
    source:
      "OSCOLA 5 §2.5.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "first+regulation",
    expected:
      "Russia (Sanctions) (EU Exit) Regulations 2019, SI 2019/855 (‘Russia Sanctions Regulations’) reg 3",
    rule: "2.5.2: 'SI 2009/2163, reg 7(2)'; with a declared short form the pinpoint follows the bracket without a comma (1.2.1)",
    source:
      "OSCOLA 5 §2.5.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "subsequent-short+regulation",
    expected: "Russia Sanctions Regulations, reg 3",
    rule: "1.2.1: declared short form, comma, provision",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "subsequent-ibid",
    expected: "Russia Sanctions Regulations",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "bibliography-entry",
    expected: "Russia (Sanctions) (EU Exit) Regulations 2019, SI 2019/855",
    rule: "1.6.3: statutory instruments listed separately after the statutes, with the SI number",
    source:
      "OSCOLA 5 §1.6.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "first",
    expected: "Privacy Act 2020 (NZ) (‘Privacy Act’)",
    rule: "2.6.2: foreign legislation as at home with the jurisdiction in brackets ('Accident Compensation Act 1972 (NZ)'); 1.2.1 declared short form",
    source:
      "OSCOLA 5 §2.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "first+section",
    expected: "Privacy Act 2020 (NZ) (‘Privacy Act’) s 6",
    rule: "2.6.2 + 2.4.2 + 1.2.1",
    source:
      "OSCOLA 5 §2.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §2.6.2 shows a foreign Act with its jurisdiction but no section; the order of '(NZ)'/'(Cth)' and ', s N' is unconfirmed",
    note: "currently renders: Privacy Act 2020, 6 (‘Privacy Act’)",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "subsequent-short+section",
    expected: "Privacy Act, s 6",
    rule: "1.2.1: declared short form, comma, section",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "bibliography-entry",
    expected: "Privacy Act 2020 (NZ)",
    rule: "1.6.3: table of legislation, separate list per jurisdiction",
    source:
      "OSCOLA 5 §1.6.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "first",
    expected: "Costs in Criminal Cases Regulations 1987 (NZ) (‘Costs Regulations’)",
    rule: "2.6.2 + 1.2.1",
    source:
      "OSCOLA 5 §2.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "first+regulation",
    expected: "Costs in Criminal Cases Regulations 1987 (NZ) (‘Costs Regulations’) reg 3",
    rule: "2.6.2 + 2.5.2",
    source:
      "OSCOLA 5 §2.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §2.6.2 shows a foreign Act with its jurisdiction but no section; the order of '(NZ)'/'(Cth)' and ', s N' is unconfirmed",
    note: "currently renders: Costs in Criminal Cases Regulations 1987, 3 (‘Costs Regulations’)",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "subsequent-short+regulation",
    expected: "Costs Regulations, reg 3",
    rule: "1.2.1",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "bibliography-entry",
    expected: "Costs in Criminal Cases Regulations 1987 (NZ)",
    rule: "1.6.3",
    source:
      "OSCOLA 5 §1.6.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "first",
    expected: "Native Title Act 1993 (Cth) (‘Native Title Act’)",
    rule: "2.6.2: 'Climate Change Act 2022 (Cth)' — jurisdiction kept for foreign Acts; 1.2.1 declared short form",
    source:
      "OSCOLA 5 §2.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "first+section",
    expected: "Native Title Act 1993 (Cth) (‘Native Title Act’) s 6",
    rule: "2.6.2 + 2.4.2",
    source:
      "OSCOLA 5 §2.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §2.6.2 shows a foreign Act with its jurisdiction but no section; the order of '(NZ)'/'(Cth)' and ', s N' is unconfirmed",
    note: "currently renders: Native Title Act 1993, 6 (‘Native Title Act’)",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "subsequent-short+section",
    expected: "Native Title Act, s 6",
    rule: "1.2.1",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "subsequent-ibid",
    expected: "Native Title Act",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "bibliography-entry",
    expected: "Native Title Act 1993 (Cth)",
    rule: "1.6.3",
    source:
      "OSCOLA 5 §1.6.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "first",
    expected:
      "Harold Luntz, Assessment of Damages for Personal Injury and Death (4th edn, LexisNexis Butterworths 2002)",
    rule: "3.2.1: author, comma, italic title, (edition, publisher year) — no place, no comma before the year, 'edn'; no short-form declaration for books",
    source:
      "OSCOLA 5 §3.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "first+page",
    expected:
      "Harold Luntz, Assessment of Damages for Personal Injury and Death (4th edn, LexisNexis Butterworths 2002) 42",
    rule: "3.1.3/3.2.1: bare page after the closing bracket ('(Federation Press 2005) 125–26')",
    source:
      "OSCOLA 5 §3.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "first+paragraph",
    expected:
      "Harold Luntz, Assessment of Damages for Personal Injury and Death (4th edn, LexisNexis Butterworths 2002) para 42",
    rule: "3.2.1: book paragraphs take 'para', never square brackets ('(OUP 2008) para 4.51')",
    source:
      "OSCOLA 5 §3.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-short",
    expected: "Luntz (n 1)",
    rule: "1.2.1/3.1.5: surname + (n X)",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-short+page",
    expected: "Luntz (n 1) 42",
    rule: "1.2.1: 'Stevens (n 1) 110'",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-ibid",
    expected: "Luntz (n 1)",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-ibid+page",
    expected: "Luntz (n 1) 42",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "bibliography-entry",
    expected:
      "Luntz H, Assessment of Damages for Personal Injury and Death (4th edn, LexisNexis Butterworths 2002)",
    rule: "1.7: surname then initials with no comma between, comma after the initials, no terminal full stop ('Fisher E, Risk Regulation … (Hart Publishing 2007)')",
    source:
      "OSCOLA 5 §1.7 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "first",
    expected:
      "John Gardner, ‘The Purity and Priority of Private Law’ in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing 2009)",
    rule: "3.2.4: author, quoted chapter title, 'in' editors '(eds),' italic book title, (publisher year); the start page is not given",
    source:
      "OSCOLA 5 §3.2.4 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "first+page",
    expected:
      "John Gardner, ‘The Purity and Priority of Private Law’ in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing 2009) 42",
    rule: "3.2.4: pinpoint after the bracket ('(OUP 2021) 325')",
    source:
      "OSCOLA 5 §3.2.4 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "subsequent-short",
    expected: "Gardner (n 1)",
    rule: "1.2.1/3.1.5",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "subsequent-ibid+page",
    expected: "Gardner (n 1) 42",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "bibliography-entry",
    expected:
      "Gardner J, ‘The Purity and Priority of Private Law’ in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing 2009)",
    rule: "1.7: author inverted to surname + initials; footnote form otherwise",
    source:
      "OSCOLA 5 §1.7 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §1.7 inverts the author's name in a bibliography entry; whether editors' names in a chapter entry are also inverted is not exemplified",
    note: "currently renders: Gardner, John (Oxford, Hart Publishing, 2009)",
  },
  {
    fixture: "fx-article-young",
    scenario: "first",
    expected: "Alison L Young, ‘In Defence of Due Deference’ (2009) 72 MLR 554",
    rule: "3.3: author, comma, quoted title, (year) volume journal first page; nothing italic but the case-name element",
    source:
      "OSCOLA 5 §3.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-article-young",
    scenario: "first+page",
    expected: "Alison L Young, ‘In Defence of Due Deference’ (2009) 72 MLR 554, 42",
    rule: "3.3: comma after the first page then the pinpoint ('(2001) 117 LQR 42, 64')",
    source:
      "OSCOLA 5 §3.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-article-young",
    scenario: "subsequent-short",
    expected: "Young (n 1)",
    rule: "1.2.1: 'Williams (n 1) 240'",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-article-young",
    scenario: "subsequent-short+page",
    expected: "Young (n 1) 42",
    rule: "1.2.1",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-article-young",
    scenario: "subsequent-ibid",
    expected: "Young (n 1)",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-article-young",
    scenario: "bibliography-entry",
    expected: "Young AL, ‘In Defence of Due Deference’ (2009) 72 MLR 554",
    rule: "1.7: initials instead of forenames ('Hart HLA, …'), no terminal full stop",
    source:
      "OSCOLA 5 §1.7 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "first",
    expected:
      "Javan Herberg, Injunctive Relief for Wrongful Termination of Employment (DPhil thesis, University of Oxford 1989)",
    rule: "3.7.6: italic thesis title (changed from OSCOLA 4 quotes), then (type, university year) with no comma before the year",
    source:
      "OSCOLA 5 §3.7.6 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "first+page",
    expected:
      "Javan Herberg, Injunctive Relief for Wrongful Termination of Employment (DPhil thesis, University of Oxford 1989) 42",
    rule: "3.1.3: bare page pinpoint at the end",
    source:
      "OSCOLA 5 §3.1.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "subsequent-short",
    expected: "Herberg (n 1)",
    rule: "1.2.1/3.1.5",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "subsequent-ibid",
    expected: "Herberg (n 1)",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "bibliography-entry",
    expected:
      "Herberg J, Injunctive Relief for Wrongful Termination of Employment (DPhil thesis, University of Oxford 1989)",
    rule: "1.7",
    source:
      "OSCOLA 5 §1.7 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "first",
    expected:
      "Cyclefree, ‘Is This Really Necessary, Minister?’ (Legal Feminist, 27 April 2023) <https://perma.cc/3THK-P4AX>",
    rule: "3.7.1: author (username), quoted title, (italic site name, date), link in angle brackets; a persistent link needs no access date",
    source:
      "OSCOLA 5 §3.7.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "subsequent-short",
    expected: "Cyclefree (n 1)",
    rule: "1.2.1/3.1.5",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "subsequent-ibid",
    expected: "Cyclefree (n 1)",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "bibliography-entry",
    expected:
      "Cyclefree, ‘Is This Really Necessary, Minister?’ (Legal Feminist, 27 April 2023) <https://perma.cc/3THK-P4AX>",
    rule: "1.7: footnote form; a single-word username has no initials to invert",
    source:
      "OSCOLA 5 §1.7 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "first",
    expected: "HC Deb 3 February 1977, vol 389, col 973",
    rule: "3.7.8: 'HC Deb date, vol N, col N' (guide example gives cols 973–76)",
    source:
      "OSCOLA 5 §3.7.8 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "subsequent-short",
    expected: "HC Deb 3 February 1977, vol 389, col 973",
    rule: "1.2.1 gives no short form for Hansard; the full citation is repeated",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §1.2.1 offers no short form for Hansard; whether a later footnote repeats the full citation or uses '(n X)' is unconfirmed",
    note: "currently renders: ‘HC Deb 3 February 1977’ (n 1)",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "first",
    expected: "(6 April 2005) 624 NZPD 19676",
    rule: "1.4: foreign primary sources are cited as in their home jurisdiction (NZLSG 5.1.1 form)",
    source:
      "OSCOLA 5 §1.4 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-hansard-cth",
    scenario: "first",
    expected:
      "Commonwealth, Parliamentary Debates, House of Representatives, 12 March 2020, 2345 (Anthony Albanese)",
    rule: "1.4: as at home (AGLC4 7.5.1 form) with full stops dropped",
    source:
      "OSCOLA 5 §1.4 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "first",
    expected:
      "Rome Statute of the International Criminal Court (opened for signature 17 July 1998, entered into force 1 July 2002) 2187 UNTS 3 (‘Rome Statute’)",
    rule: "4.1.1: roman title, (opened for signature …, entered into force …) for a multilateral treaty open for signature, volume UNTS page, declared short form in brackets with single quotes",
    source:
      "OSCOLA 5 §4.1.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders: Rome Statute of the International Criminal Court (adopted 17 July 1998, entered into force 1 July 2002) 2187 UNTS 3 (‘Rome Statute’)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "first+article",
    expected:
      "Rome Statute of the International Criminal Court (opened for signature 17 July 1998, entered into force 1 July 2002) 2187 UNTS 3 (‘Rome Statute’) art 7",
    rule: "4.1.1: article pinpoint preceded by a comma unless it follows a closing bracket ('(‘UNCLOS’) art 46')",
    source:
      "OSCOLA 5 §4.1.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders: Rome Statute of the International Criminal Court (adopted 17 July 1998, entered into force 1 July 2002) 2187 UNTS 3, 7 (‘Rome Statute’)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "subsequent-short",
    expected: "Rome Statute",
    rule: "4.1.1/1.2.1: declared short form used alone in later references",
    source:
      "OSCOLA 5 §4.1.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "subsequent-short+article",
    expected: "Rome Statute, art 7",
    rule: "4.1.1: 'UNCLOS, art 101'",
    source:
      "OSCOLA 5 §4.1.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "subsequent-ibid",
    expected: "Rome Statute",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "bibliography-entry",
    expected:
      "Rome Statute of the International Criminal Court (opened for signature 17 July 1998, entered into force 1 July 2002) 2187 UNTS 3",
    rule: "1.6.3: treaties go in a table of treaties after the table of legislation, not in the bibliography",
    source:
      "OSCOLA 5 §1.6.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders: Rome Statute of the International Criminal Court",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "first",
    expected: "Balogh v Hungary (Judgment) ECtHR App No 47940/99 (20 July 2004)",
    rule: "4.4.4: italic name, (decision type), [GC]/[Committee] if any, 'ECtHR App No', (date)",
    source:
      "OSCOLA 5 §4.4.4 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders: Balogh v Hungary App no 47940/99 (ECtHR, 20 July 2004) (‘Balogh’)",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "first+paragraph",
    expected: "Balogh v Hungary (Judgment) ECtHR App No 47940/99 (20 July 2004) [42]",
    rule: "4.4.4: paragraph pinpoint in square brackets after the date ('(25 January 2023) [826]')",
    source:
      "OSCOLA 5 §4.4.4 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders: Balogh v Hungary App no 47940/99 (ECtHR, 20 July 2004) [42] (‘Balogh’)",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "subsequent-short",
    expected: "Balogh (n 1)",
    rule: "1.2.1/2.1.2",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "subsequent-ibid",
    expected: "Balogh (n 1)",
    rule: "1.2.1/1.2.3: no ibid",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "bibliography-entry",
    expected: "Balogh v Hungary (Judgment) ECtHR App No 47940/99 (20 July 2004)",
    rule: "1.6.2: table of cases (ECtHR section)",
    source:
      "OSCOLA 5 §1.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders: ",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "first",
    expected: "Case C-363/16 European Commission v Hellenic Republic EU:C:2018:12",
    rule: "4.4.2: case number, italic name, ECLI without the 'ECLI:' prefix and without a report",
    source:
      "OSCOLA 5 §4.4.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders: Case C-363/16 European Commission v Hellenic Republic ECLI:EU:C:2018:12 — the ECLI prefix is kept: tests/engine/multi-standard-integration.test.ts (OSC-ENH-002) pins the prefixed form, so the §4.4.2 stripping is a rule question for DECISION-040, not a field mapping",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "first+paragraph",
    expected: "Case C-363/16 European Commission v Hellenic Republic EU:C:2018:12 [42]",
    rule: "4.4.2: 'EU:C:2005:446 [19]' — paragraph pinpoint, no comma",
    source:
      "OSCOLA 5 §4.4.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    note: "currently renders: Case C-363/16 European Commission v Hellenic Republic ECLI:EU:C:2018:12 [42] — ECLI prefix kept (see the first row)",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "subsequent-short",
    expected: "Commission v Hellenic Republic (n 1)",
    rule: "1.2.1/2.1.2: short case name + (n X)",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "bibliography-entry",
    expected: "European Commission v Hellenic Republic (Case C-363/16) EU:C:2018:12",
    rule: "1.6.2: EU cases alphabetical by name with the case number in round brackets then the ECLI ('Schempp v Finanzamt (Case C-403/03) EU:C:2005:446')",
    source:
      "OSCOLA 5 §1.6.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "first",
    expected: "UNSC Res 1373 (28 September 2001) UN Doc S/RES/1373 (‘SC Res 1373’)",
    rule: "4.2.2: body + resolution number (date) UN Doc symbol; a short title may be given at the end and used later",
    source:
      "OSCOLA 5 §4.2.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "subsequent-short",
    expected: "SC Res 1373",
    rule: "4.2.2: short title used in subsequent references",
    source:
      "OSCOLA 5 §4.2.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "first+paragraph",
    expected: "UNSC Res 1373 (28 September 2001) UN Doc S/RES/1373 (‘SC Res 1373’) para 2",
    rule: "4.2.2 gives no operative-paragraph pinpoint example; 3.1.3 'para' by analogy",
    source:
      "OSCOLA 5 §4.2.2 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §4.2.2 shows no pinpoint to an operative paragraph of a resolution ('para 2' after the declared short form?)",
    note: "currently renders: UNSC Res 1373 (28 September 2001) UN Doc S/RES/1373, [42] (‘SC Res 1373’)",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "bibliography-entry",
    expected: "UNSC Res 1373 (28 September 2001) UN Doc S/RES/1373",
    rule: "1.6.3: UN documents go in an 'other' table after legislation, not in the bibliography",
    source:
      "OSCOLA 5 §1.6.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "first",
    expected:
      "Australian Law Reform Commission, Genes and Ingenuity: Gene Patenting and Human Health (ALRC Report 99, 2004)",
    rule: "3.7.10/3.1: organisation as author, italic title, bracketed identifiers",
    source:
      "OSCOLA 5 §3.7.10 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §3.7.11 covers the UK, Scottish and NI Law Commissions only; the form for an ALRC report ('Australian Law Reform Commission, Title (ALRC Report 99, 2004)') and its short form are unconfirmed",
    note: "currently renders: , Genes and Ingenuity: Gene Patenting and Human Health (‘Genes and Ingenuity’)",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "subsequent-short",
    expected: "Australian Law Reform Commission (n 1)",
    rule: "1.2.1/3.1.1: organisational author + (n X)",
    source:
      "OSCOLA 5 §1.2.1 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §3.7.11 covers the UK, Scottish and NI Law Commissions only; the form for an ALRC report ('Australian Law Reform Commission, Title (ALRC Report 99, 2004)') and its short form are unconfirmed",
    note: "currently renders: Genes and Ingenuity (n 1)",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "bibliography-entry",
    expected:
      "Australian Law Reform Commission, Genes and Ingenuity: Gene Patenting and Human Health (ALRC Report 99, 2004)",
    rule: "1.7",
    source:
      "OSCOLA 5 §1.7 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §3.7.11 covers the UK, Scottish and NI Law Commissions only; the form for an ALRC report ('Australian Law Reform Commission, Title (ALRC Report 99, 2004)') and its short form are unconfirmed",
    note: "currently renders: Genes and Ingenuity: Gene Patenting and Human Health",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "first",
    expected: "Law Commission (NZ), Review of the Privacy Act 1993 (NZLC R123, 2011)",
    rule: "3.7.11 by analogy with the NZLC series number; the engine routes it to the UK 'Law Com No' form",
    source:
      "OSCOLA 5 §3.7.11 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §3.7.11 names only the UK, Scottish and NI commissions; whether a NZ Law Commission report keeps its home form ('Law Commission Title (NZLC R123, 2011)') or takes 'Law Commission (NZ), Title (NZLC R123, 2011)' is unconfirmed",
    note: "currently renders: Law Commission, Review of the Privacy Act 1993 (Law Com No 123, 2011) (‘Review of the Privacy Act’)",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "first+page",
    expected: "Law Commission (NZ), Review of the Privacy Act 1993 (NZLC R123, 2011) 42",
    rule: "3.1.3",
    source:
      "OSCOLA 5 §3.1.3 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §3.7.11 names only the UK, Scottish and NI commissions; whether a NZ Law Commission report keeps its home form ('Law Commission Title (NZLC R123, 2011)') or takes 'Law Commission (NZ), Title (NZLC R123, 2011)' is unconfirmed",
    note: "currently renders: Law Commission, Review of the Privacy Act 1993 (Law Com No 123, 2011) 42 (‘Review of the Privacy Act’)",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "bibliography-entry",
    expected: "Law Commission (NZ), Review of the Privacy Act 1993 (NZLC R123, 2011)",
    rule: "1.7",
    source:
      "OSCOLA 5 §1.7 (docs/standards-rule-notes.md; PDF text and italics verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 5 §3.7.11 names only the UK, Scottish and NI commissions; whether a NZ Law Commission report keeps its home form ('Law Commission Title (NZLC R123, 2011)') or takes 'Law Commission (NZ), Title (NZLC R123, 2011)' is unconfirmed",
    note: "currently renders: Review of the Privacy Act 1993 (2011), Report No 123",
  },
];
