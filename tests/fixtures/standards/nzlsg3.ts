/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-002 — NZLSG 3 expectation table.
 *
 * `expected` is the CORRECT rendering per the New Zealand Law Style Guide
 * (3rd ed) online chapters, docs/standards-rule-notes.md and the repo rule
 * quotes — not the current engine output; `note: "currently renders: …"`
 * shows today's delta. General style (academic, court submissions) is
 * assumed; commercial style (§2.3.1(b)) is out of scope for these rows.
 * Scenario `subsequent-ibid+…` is the footnote immediately after the full
 * citation of the same source: NZLSG renders only the capitalised pinpoint
 * (`At 42`), never ibid (§2.3.1(a) rule 1). Bibliography entries end with a
 * full stop (Appendix 7). Italics are not asserted. Generated from
 * capture.json by the STD-002 scratch script.
 */

import type { ExpectationTable } from "./types";

export const NZLSG3_EXPECTATIONS: ExpectationTable = [
  {
    fixture: "fx-mabo-reported",
    scenario: "first",
    expected: "Mabo v Queensland (1992) 175 CLR 1",
    rule: "8.2.1: no court identifier after CLR; 8.2.3: the AustLII [1992] HCA 23 is retrospective and not used; 3.2.3: round-bracket year for a volume-organised series",
    source:
      "NZLSG 3 §8.2.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "first+page",
    expected: "Mabo v Queensland (1992) 175 CLR 1 at 42",
    rule: "3.2.8: 'at' before every pinpoint; pages bare",
    source:
      "NZLSG 3 §3.2.8 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "first+paragraph",
    expected: "Mabo v Queensland (1992) 175 CLR 1 at [42]",
    rule: "3.2.8: 'at [29]' — paragraphs in square brackets after 'at'",
    source:
      "NZLSG 3 §3.2.8 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "parallel",
    expected: "Mabo v Queensland (1992) 175 CLR 1",
    rule: "3.2.10: neutral citation + best report only, and 8.2.3 excludes the retrospective MNC, so 'parallel' equals 'first'",
    source:
      "NZLSG 3 §3.2.10 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-short",
    expected: "Mabo, above n 1",
    rule: "2.3.1(a)(i): 'Rainy Sky SA v Kookmin Bank, above n 10' — identifier, comma, above n X",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-short+page",
    expected: "Mabo, above n 1, at 42",
    rule: "2.3.1(a)(i): 'R v Wang, above n 49, at 533'",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-short+paragraph",
    expected: "Mabo, above n 1, at [42]",
    rule: "2.3.1(a)(i) + 3.2.8",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-ibid+page",
    expected: "At 42",
    rule: "2.3.1(a) rule 1: when the source is obvious from context (immediately preceding footnote) give only the pinpoint, capitalised; ibid is never used",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-ibid+paragraph",
    expected: "At [42]",
    rule: "2.3.1(a) rule 1: 'At [52] per Tipping J'",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "bibliography-entry",
    expected: "Mabo v Queensland (1992) 175 CLR 1.",
    rule: "App 7 §V: footnote form minus pinpoints, ending with a full stop, under 'A Cases' subdivided by jurisdiction (New Zealand first)",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "first",
    expected: "Mabo v Queensland [1992] HCA 23",
    rule: "8.2.3: neutral citation form '[year] HCA n' — but AustLII retrospective citations are not used",
    source:
      "NZLSG 3 §8.2.3 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    pending:
      "DECISION-040: NZLSG 3 §8.2.3 says AustLII retrospective neutral citations 'should not be used'; what the engine should render for an MNC-only record of a 1992 HCA case (the stored MNC, or a validation warning) is unconfirmed",
    note: "currently renders: Mabo v Queensland [1992] HCA 23 (‘Mabo’) — no AGLC 1.4.4 short-title introduction under NZLSG (reference tags are square-bracketed and only for less obvious names, §2.3.2)",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "first+paragraph",
    expected: "Mabo v Queensland [1992] HCA 23 at [42]",
    rule: "3.3: 'Attorney-General v X [2007] NZCA 388 at [70]'",
    source:
      "NZLSG 3 §3.3 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    pending:
      "DECISION-040: NZLSG 3 §8.2.3 says AustLII retrospective neutral citations 'should not be used'; what the engine should render for an MNC-only record of a 1992 HCA case (the stored MNC, or a validation warning) is unconfirmed",
    note: "currently renders: Mabo v Queensland [1992] HCA 23 at [42] (‘Mabo’)",
  },
  {
    fixture: "fx-mabo-mnc",
    scenario: "subsequent-short+paragraph",
    expected: "Mabo, above n 1, at [42]",
    rule: "2.3.1(a)(i)",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "first",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884",
    rule: "8.4: England and Wales cases follow chapter 3 — neutral citation, comma, report ('[2009] EWHC 254 (Comm), [2010] 1 WLR 258'); 3.2.7: no court identifier after a neutral citation",
    source:
      "NZLSG 3 §8.4 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "first+page",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884 at 42",
    rule: "3.2.8",
    source:
      "NZLSG 3 §3.2.8 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "first+paragraph",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884 at [42]",
    rule: "3.2.8",
    source:
      "NZLSG 3 §3.2.8 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "parallel",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884",
    rule: "3.2.10: official neutral citation and the best report must both be given",
    source:
      "NZLSG 3 §3.2.10 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-short+paragraph",
    expected: "Corr, above n 1, at [42]",
    rule: "2.3.1(a)(i)",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-ibid+paragraph",
    expected: "At [42]",
    rule: "2.3.1(a) rule 1: pinpoint only; no ibid",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "bibliography-entry",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884.",
    rule: "App 7 §V: 'A Cases', jurisdiction subheading, full stop",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "first",
    expected: "AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, 2011 SC 158",
    rule: "8.5: Scottish reports take no brackets round a locating year ('2004 SLT 623 (OH)'); neutral citations 'CSIH'; 3.2.2 comma between neutral citation and report",
    source:
      "NZLSG 3 §8.5 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "subsequent-short+paragraph",
    expected: "AXA General Insurance Ltd, above n 1, at [42]",
    rule: "2.3.1(a)(i)",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "first",
    expected: "Wilson v Commissioner of Valuation [2009] NICA 30, [2010] NI 48",
    rule: "8.1: overseas cases follow chapter 3 where possible; official neutral citations preferred",
    source:
      "NZLSG 3 §8.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "first",
    expected: "Langan v Health Service Executive [2024] IESC 1",
    rule: "8.1 + 3.3: official neutral citation alone for an unreported case",
    source:
      "NZLSG 3 §8.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "first+paragraph",
    expected: "Langan v Health Service Executive [2024] IESC 1 at [42]",
    rule: "3.3",
    source:
      "NZLSG 3 §3.3 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "first",
    expected: "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91",
    rule: "3.2: neutral citation, comma, best report; 3.2.7 no court identifier after a neutral citation",
    source:
      "NZLSG 3 §3.2 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "first+page",
    expected: "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91 at 42",
    rule: "3.2.8: 'at 398'",
    source:
      "NZLSG 3 §3.2.8 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "first+paragraph",
    expected: "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91 at [42]",
    rule: "3.2.8: 'at [26]'",
    source:
      "NZLSG 3 §3.2.8 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "parallel",
    expected: "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91",
    rule: "3.2.10",
    source:
      "NZLSG 3 §3.2.10 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "subsequent-short",
    expected: "Brooker, above n 1",
    rule: "2.3.1(a)(i)",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "subsequent-short+paragraph",
    expected: "Brooker, above n 1, at [42]",
    rule: "2.3.1(a)(i)",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "subsequent-ibid+paragraph",
    expected: "At [42]",
    rule: "2.3.1(a) rule 1",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "bibliography-entry",
    expected: "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91.",
    rule: "App 7 §V: 'Erceg v Erceg [2016] NZCA 7, [2016] 2 NZLR 622.'",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "first",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 (CA)",
    rule: "3.2: report citation with the court identifier when there is no neutral citation ('[1984] 1 NZLR 394 (CA) at 398')",
    source:
      "NZLSG 3 §3.2 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "first+page",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 (CA) at 42",
    rule: "3.2.8: pinpoint follows the court identifier",
    source:
      "NZLSG 3 §3.2.8 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "subsequent-short+page",
    expected: "Taylor, above n 1, at 42",
    rule: "2.3.1(a)(i)",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "bibliography-entry",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 (CA).",
    rule: "App 7 §V",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "first",
    expected: "Pacey v Adlam – Matata Parish 39A 2B 2B 2A (2017) 178 Waiariki MB 32 (178 WAR 32)",
    rule: "3.5: name – block name (en dash), (year), volume, minute-book title, folio, (abbreviated citation)",
    source:
      "NZLSG 3 §3.5 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "first+page",
    expected:
      "Pacey v Adlam – Matata Parish 39A 2B 2B 2A (2017) 178 Waiariki MB 32 (178 WAR 32) at 42",
    rule: "3.5.6: pinpoint per 3.2.8",
    source:
      "NZLSG 3 §3.5.6 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "subsequent-short+page",
    expected: "Pacey v Adlam, above n 1, at 42",
    rule: "2.3.1(a)(i)",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-mlc-pacey",
    scenario: "bibliography-entry",
    expected: "Pacey v Adlam – Matata Parish 39A 2B 2B 2A (2017) 178 Waiariki MB 32 (178 WAR 32).",
    rule: "App 7 §V: full stop, no pinpoint",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
    pending:
      "DECISION-040: NZLSG 3 Appendix 7 does not say whether Māori Land Court decisions and Waitangi Tribunal reports go under 'Cases' or 'Reports' (Unresolved 9)",
    note: "currently renders:  (2017)",
  },
  {
    fixture: "fx-wai-262",
    scenario: "first",
    expected: "Waitangi Tribunal Ko Aotearoa Tēnei (Wai 262, 2011)",
    rule: "3.6: 'Waitangi Tribunal' as author with no comma, italic title, (Wai number, year)",
    source:
      "NZLSG 3 §3.6 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-wai-262",
    scenario: "first+page",
    expected: "Waitangi Tribunal Ko Aotearoa Tēnei (Wai 262, 2011) at 42",
    rule: "3.6: '(Wai 2190, 2010) at 51'",
    source:
      "NZLSG 3 §3.6 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-wai-262",
    scenario: "subsequent-short+page",
    expected: "Waitangi Tribunal, above n 1, at 42",
    rule: "2.3.1(a)(iii): author, above n X, at pinpoint",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    pending:
      "DECISION-040: NZLSG 3 §2.3.1(a)(iii) short-forms texts by author surname; whether an institutional author ('Waitangi Tribunal', 'Law Commission') is used as the identifier or the report title is, is not exemplified",
    note: "currently renders: Ko Aotearoa Tēnei, above n 1",
  },
  {
    fixture: "fx-wai-262",
    scenario: "bibliography-entry",
    expected: "Waitangi Tribunal Ko Aotearoa Tēnei (Wai 262, 2011).",
    rule: "App 7 §V: full stop; section placement unresolved",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
    pending:
      "DECISION-040: NZLSG 3 Appendix 7 does not say whether Waitangi Tribunal reports go under 'Cases' or 'Reports' (Unresolved 9)",
    note: "currently renders: Ko Aotearoa Tēnei (2011)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "first",
    expected: "Human Rights Act 1998 (UK)",
    rule: "4.1.1(a)/9.4: roman title; foreign Acts carry the jurisdiction after the year ('Counter-Terrorism Act 2008 (UK), s 92')",
    source:
      "NZLSG 3 §4.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "first+section",
    expected: "Human Rights Act 1998 (UK), s 6",
    rule: "4.1.1(d): comma then 's 6'",
    source:
      "NZLSG 3 §4.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-short+section",
    expected: "Human Rights Act, s 6",
    rule: "2.3.1(a)(ii): legislation is never cross-referenced with 'above n'; short title without year or jurisdiction unless needed ('Securities Act, s 63')",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "bibliography-entry",
    expected: "Human Rights Act 1998 (UK).",
    rule: "App 7 §V: 'B Legislation', jurisdiction subheadings, full stop",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "first",
    expected: "Russia (Sanctions) (EU Exit) Regulations 2019 (UK)",
    rule: "9.4 + 4.1.1(a): foreign instrument with the jurisdiction after the year",
    source:
      "NZLSG 3 §9.4 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    pending:
      "DECISION-040: NZLSG 3 §9.4 gives no UK statutory-instrument form; whether '(UK)' is appended and whether the SI number is given is unconfirmed (Unresolved 12)",
    note: "currently renders: Russia (Sanctions) (EU Exit) Regulations 2019 (‘Russia Sanctions Regulations’) — no AGLC 1.4.4 short-title introduction under NZLSG (reference tags are square-bracketed and only for less obvious names, §2.3.2)",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "first",
    expected: "Privacy Act 2020",
    rule: "4.1.1(a)–(c): roman short title and year, no (NZ) for domestic Acts",
    source:
      "NZLSG 3 §4.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "first+section",
    expected: "Privacy Act 2020, s 6",
    rule: "4.1.1(d): 'Crimes Act 1961, s 59'",
    source:
      "NZLSG 3 §4.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "subsequent-short+section",
    expected: "Privacy Act, s 6",
    rule: "2.3.1(a)(ii): short title without the year, no 'above n'",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-privacy-act",
    scenario: "bibliography-entry",
    expected: "Privacy Act 2020.",
    rule: "App 7 §V: 'B Legislation', New Zealand first, full stop, no jurisdiction identifier",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "first",
    expected: "Costs in Criminal Cases Regulations 1987",
    rule: "4.3.1: legislative instruments by title and year",
    source:
      "NZLSG 3 §4.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "first+regulation",
    expected: "Costs in Criminal Cases Regulations 1987, reg 3",
    rule: "4.3.1: 'Costs in Criminal Cases Regulations 1987, reg 3'",
    source:
      "NZLSG 3 §4.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "subsequent-short+regulation",
    expected: "Costs in Criminal Cases Regulations, reg 3",
    rule: "2.3.1(a)(ii): short title, no 'above n'",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nz-costs-regs",
    scenario: "bibliography-entry",
    expected: "Costs in Criminal Cases Regulations 1987.",
    rule: "App 7 §V: statutes, then subordinate legislation, then bills",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "first",
    expected: "Native Title Act 1993 (Cth)",
    rule: "9.2: jurisdiction in round brackets after the year ('Chaffey Dam Act 1974 (NSW)')",
    source:
      "NZLSG 3 §9.2 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "first+section",
    expected: "Native Title Act 1993 (Cth), s 6",
    rule: "9.2 + 4.1.1(d)",
    source:
      "NZLSG 3 §4.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "subsequent-short+section",
    expected: "Native Title Act, s 6",
    rule: "2.3.1(a)(ii)",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-cth-nta",
    scenario: "bibliography-entry",
    expected: "Native Title Act 1993 (Cth).",
    rule: "App 7 §V: 'Crimes Act 1990 (NSW).' — federal identifiers kept",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "first",
    expected:
      "Harold Luntz Assessment of Damages for Personal Injury and Death (4th ed, LexisNexis Butterworths, Sydney, 2002)",
    rule: "6.1.1: author, italic title (no comma between), (edition, publisher, place, year); 6.1.4 'ed'",
    source:
      "NZLSG 3 §6.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "first+page",
    expected:
      "Harold Luntz Assessment of Damages for Personal Injury and Death (4th ed, LexisNexis Butterworths, Sydney, 2002) at 42",
    rule: "6.1.8: 'at 164'",
    source:
      "NZLSG 3 §6.1.8 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "first+paragraph",
    expected:
      "Harold Luntz Assessment of Damages for Personal Injury and Death (4th ed, LexisNexis Butterworths, Sydney, 2002) at [42]",
    rule: "6.1.8: 'at [1206]'",
    source:
      "NZLSG 3 §6.1.8 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-short",
    expected: "Luntz, above n 1",
    rule: "2.3.1(a)(iii): 'Spiller, above n 21'",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-short+page",
    expected: "Luntz, above n 1, at 42",
    rule: "2.3.1(a)(iii): 'Spiller, above n 21, at 70'",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-ibid+page",
    expected: "At 42",
    rule: "2.3.1(a) rule 1: 'At 92.'",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "bibliography-entry",
    expected:
      "Harold Luntz Assessment of Damages for Personal Injury and Death (4th ed, LexisNexis Butterworths, Sydney, 2002).",
    rule: "App 7 §V: names not inverted, footnote form, full stop ('Andrew Butler and Petra Butler The New Zealand Bill of Rights Act … (2nd ed, LexisNexis, Wellington, 2015).')",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "first",
    expected:
      "John Gardner “The Purity and Priority of Private Law” in Andrew Robertson and Tang Hang Wu (eds) The Goals of Private Law (Hart Publishing, Oxford, 2009) 1",
    rule: "6.2: chapter title in double quotes, 'in' editor '(eds)' book citation with place, starting page ('… (Law Book Company, Sydney, 1987) 222 at 229')",
    source:
      "NZLSG 3 §6.2 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "first+page",
    expected:
      "John Gardner “The Purity and Priority of Private Law” in Andrew Robertson and Tang Hang Wu (eds) The Goals of Private Law (Hart Publishing, Oxford, 2009) 1 at 42",
    rule: "6.2.6: 'at' pinpoint after the starting page",
    source:
      "NZLSG 3 §6.2 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "subsequent-short+page",
    expected: "Gardner, above n 1, at 42",
    rule: "2.3.1(a)(iv): chapters follow the text rule ('Mullan, above n 40, at 152')",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "bibliography-entry",
    expected:
      "John Gardner “The Purity and Priority of Private Law” in Andrew Robertson and Tang Hang Wu (eds) The Goals of Private Law (Hart Publishing, Oxford, 2009) 1.",
    rule: "App 7 §V: 'C Books and Chapters in Books', footnote form (starting page kept, pinpoint dropped), full stop",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
  {
    fixture: "fx-article-young",
    scenario: "first",
    expected: "Alison L Young “In Defence of Due Deference” (2009) 72 MLR 554",
    rule: "6.4: author, double-quoted title, (year) volume journal first page",
    source:
      "NZLSG 3 §6.4 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-article-young",
    scenario: "first+page",
    expected: "Alison L Young “In Defence of Due Deference” (2009) 72 MLR 554 at 42",
    rule: "6.4.8: '(2005) 121 LQR 163 at 165'",
    source:
      "NZLSG 3 §6.4 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-article-young",
    scenario: "subsequent-short+page",
    expected: "Young, above n 1, at 42",
    rule: "2.3.1(a)(iii)",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-article-young",
    scenario: "subsequent-ibid+page",
    expected: "At 42",
    rule: "2.3.1(a) rule 1",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-article-young",
    scenario: "bibliography-entry",
    expected: "Alison L Young “In Defence of Due Deference” (2009) 72 MLR 554.",
    rule: "App 7 §V: 'D Journal Articles', full stop",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "first",
    expected:
      "Javan Herberg “Injunctive Relief for Wrongful Termination of Employment” (DPhil Thesis, University of Oxford, 1989)",
    rule: "6.7.1: title in double quotes (not italic), (degree type, university, year)",
    source:
      "NZLSG 3 §6.7.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    pending:
      "DECISION-040: NZLSG 3 §6.7.1 exemplifies only 'LLB (Hons) Dissertation'; the capitalisation of 'Thesis' for a DPhil is unconfirmed",
    note: "currently renders: Javan Herberg “Injunctive Relief for Wrongful Termination of Employment” (DPhil Thesis, University of Oxford, 1989) (‘Herberg’) — no AGLC 1.4.4 short-title introduction under NZLSG (reference tags are square-bracketed and only for less obvious names, §2.3.2)",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "subsequent-short+page",
    expected: "Herberg, above n 1, at 42",
    rule: "2.3.1(a)(iii)",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "bibliography-entry",
    expected:
      "Javan Herberg “Injunctive Relief for Wrongful Termination of Employment” (DPhil Thesis, University of Oxford, 1989).",
    rule: "App 7 §V: 'Dissertations' section, full stop",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
    pending:
      "DECISION-040: NZLSG 3 §6.7.1 exemplifies only 'LLB (Hons) Dissertation'; the capitalisation of 'Thesis' for a DPhil is unconfirmed",
    note: "currently renders: Herberg, Javan, Injunctive Relief for Wrongful Termination of Employment (1989)",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "first",
    expected:
      "Cyclefree “Is This Really Necessary, Minister?” (27 April 2023) Legal Feminist <https://perma.cc/3THK-P4AX>",
    rule: "7.1.1: author, double-quoted title, (date), site name, <URL>; no access date; 'http://' kept because the address does not start with www",
    source:
      "NZLSG 3 §7.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "subsequent-short",
    expected: "Cyclefree, above n 1",
    rule: "2.3.1(a)(iii)",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "bibliography-entry",
    expected:
      "Cyclefree “Is This Really Necessary, Minister?” (27 April 2023) Legal Feminist <https://perma.cc/3THK-P4AX>.",
    rule: "App 7 §V: 'Internet Resources', full stop",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "first",
    expected: "(3 February 1977) 389 GBPD HC 973",
    rule: "5.1.1: UK Hansard '(date) volume GBPD HC column' ('(1 November 1990) 178 GBPD HC 1088')",
    source:
      "NZLSG 3 §5.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "first",
    expected: "(6 April 2005) 624 NZPD 19676",
    rule: "5.1.1: '(date) volume NZPD page'",
    source:
      "NZLSG 3 §5.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-hansard-nz",
    scenario: "first+page",
    expected: "(6 April 2005) 624 NZPD 19676 at 42",
    rule: "5.1.1 + 2.4: 'at' before pinpoints",
    source:
      "NZLSG 3 §5.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-hansard-cth",
    scenario: "first",
    expected: "(12 March 2020) Commonwealth Parliamentary Debates House of Representatives 2345",
    rule: "5.1.1 shows NZPD and GBPD forms only",
    source:
      "NZLSG 3 §5.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    pending:
      "DECISION-040: NZLSG 3 §5.1.1 gives NZPD and UK (GBPD) Hansard forms only; the form for Australian Hansard is unconfirmed",
    note: "currently renders: Commonwealth, Parliamentary Debates, House of Representatives, 12 March 2020, 2345 (Anthony Albanese) (‘Hansard 12 March 2020’) — no AGLC 1.4.4 short-title introduction under NZLSG (reference tags are square-bracketed and only for less obvious names, §2.3.2)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "first",
    expected:
      "Rome Statute of the International Criminal Court 2187 UNTS 3 (opened for signature 17 July 1998, entered into force 1 July 2002)",
    rule: "10.1.1: roman title, series citation, then the dates parenthetical ('… 1582 UNTS 95 (opened for signature 20 December 1988, entered into force 11 November 1990), art 5')",
    source:
      "NZLSG 3 §10.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    note: "currently renders: Rome Statute of the International Criminal Court (1 July 2002) UNTS (‘Rome Statute’) — no AGLC 1.4.4 short-title introduction under NZLSG (reference tags are square-bracketed and only for less obvious names, §2.3.2)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "first+article",
    expected:
      "Rome Statute of the International Criminal Court 2187 UNTS 3 (opened for signature 17 July 1998, entered into force 1 July 2002), art 7",
    rule: "10.1.1: ', art 5' after the closing bracket",
    source:
      "NZLSG 3 §10.1.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    note: "currently renders: Rome Statute of the International Criminal Court (1 July 2002) UNTS at 7 (‘Rome Statute’) — no AGLC 1.4.4 short-title introduction under NZLSG (reference tags are square-bracketed and only for less obvious names, §2.3.2)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "subsequent-short+article",
    expected: "Rome Statute, above n 1, art 7",
    rule: "2.3.1 applied to a treaty",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    pending:
      "DECISION-040: NZLSG 3 §2.3.1 gives no subsequent-reference example for a treaty ('Rome Statute, above n 1, art 7'?)",
    note: "currently renders: Rome Statute, above n 1 — resolveNzlsgSubsequent reads the stored pinpoint, not the occurrence one (plan, Defects)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "bibliography-entry",
    expected:
      "Rome Statute of the International Criminal Court 2187 UNTS 3 (opened for signature 17 July 1998, entered into force 1 July 2002).",
    rule: "App 7 §V: 'Treaties' after legislation, full stop",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
    note: "currently renders: Rome Statute of the International Criminal Court",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "first",
    expected: "Balogh v Hungary ECHR 47940/99, 20 July 2004",
    rule: "10.5.3: unreported ECtHR — 'ECHR' then application number, comma, date ('Adyan v Armenia ECHR 75604/11, 12 October 2017')",
    source:
      "NZLSG 3 §10.5.3 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    note: "currently renders: Balogh v Hungary (European Court of Human Rights, Application No 47940/99, 20 July 2004) (‘Balogh’) — no AGLC 1.4.4 short-title introduction under NZLSG (reference tags are square-bracketed and only for less obvious names, §2.3.2)",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "first+paragraph",
    expected: "Balogh v Hungary ECHR 47940/99, 20 July 2004 at [42]",
    rule: "10.5.3 + 3.2.8",
    source:
      "NZLSG 3 §10.5.3 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    note: "currently renders: Balogh v Hungary (European Court of Human Rights, Application No 47940/99, 20 July 2004) [object Object] (‘Balogh’) — no AGLC 1.4.4 short-title introduction under NZLSG (reference tags are square-bracketed and only for less obvious names, §2.3.2)",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "subsequent-short+paragraph",
    expected: "Balogh, above n 1, at [42]",
    rule: "2.3.1(a)(i)",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "first",
    expected: "Case C-363/16 European Commission v Hellenic Republic ECLI:EU:C:2018:12",
    rule: "10.5.1: from 2012 the full 'ECLI:' identifier (unlike OSCOLA 5 §4.4.2)",
    source:
      "NZLSG 3 §10.5.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    note: "currently renders: European Commission v Hellenic Republic (Court of Justice of the European Union, C-363/16, ECLI:EU:C:2018:12, 17 January 2018) (‘Commission v Hellenic Republic’) — no AGLC 1.4.4 short-title introduction under NZLSG (reference tags are square-bracketed and only for less obvious names, §2.3.2)",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "first+paragraph",
    expected: "Case C-363/16 European Commission v Hellenic Republic ECLI:EU:C:2018:12 at [42]",
    rule: "10.5.1: 'ECLI:EU:C:2018:12 at [34]–[35]'",
    source:
      "NZLSG 3 §10.5.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    note: "currently renders: European Commission v Hellenic Republic (Court of Justice of the European Union, C-363/16, ECLI:EU:C:2018:12, 17 January 2018) [object Object] (‘Commission v Hellenic Republic’) — no AGLC 1.4.4 short-title introduction under NZLSG (reference tags are square-bracketed and only for less obvious names, §2.3.2)",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "first",
    expected: "SC Res 1373 (2001)",
    rule: "10.4.2: (italic title where one exists) SC Res number (year) — 'SC Res 2397 (2017), preamble'",
    source:
      "NZLSG 3 §10.4.2 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    note: "currently renders: UNSC S/RES/1373 (28 September 2001) (‘SC Res 1373’) — no AGLC 1.4.4 short-title introduction under NZLSG (reference tags are square-bracketed and only for less obvious names, §2.3.2)",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "subsequent-short",
    expected: "SC Res 1373, above n 1",
    rule: "2.3.1 applied to a UN resolution",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    pending: "DECISION-040: NZLSG 3 §2.3.1 gives no subsequent-reference example for UN materials",
  },
  {
    fixture: "fx-alrc-99",
    scenario: "first",
    expected:
      "Australian Law Reform Commission Genes and Ingenuity: Gene Patenting and Human Health (ALRC R99, 2004)",
    rule: "5.4: author, italic title, (publisher, official citation, date)",
    source:
      "NZLSG 3 §5.4 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    pending:
      "DECISION-040: NZLSG 3 §5.4 exemplifies NZ and UK reports only; the official-citation element for an ALRC report ('ALRC R99' / 'Report 99') is unconfirmed",
    note: "currently renders: Australian Law Reform Commission, Genes and Ingenuity: Gene Patenting and Human Health (Report No 99, 2004) (‘Genes and Ingenuity’) — no AGLC 1.4.4 short-title introduction under NZLSG (reference tags are square-bracketed and only for less obvious names, §2.3.2)",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "first",
    expected: "Law Commission Review of the Privacy Act 1993 (NZLC R123, 2011)",
    rule: "5.2.3: 'Law Commission' (no comma) italic title (NZLC type+number, year)",
    source:
      "NZLSG 3 §5.2.3 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "first+page",
    expected: "Law Commission Review of the Privacy Act 1993 (NZLC R123, 2011) at 42",
    rule: "5.2.3: '(NZLC PP12, 1990) at 2'",
    source:
      "NZLSG 3 §5.2.3 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "subsequent-short+page",
    expected: "Law Commission, above n 1, at 42",
    rule: "2.3.1(a)(iii): author, above n X, at pinpoint",
    source:
      "NZLSG 3 §2.3.1 (notes) (docs/standards-rule-notes.md; online chapter fetched 2026-09-22)",
    pending:
      "DECISION-040: NZLSG 3 §2.3.1(a)(iii) short-forms texts by author surname; whether an institutional author ('Waitangi Tribunal', 'Law Commission') is used as the identifier or the report title is, is not exemplified",
    note: "currently renders: Review of the Privacy Act, above n 1",
  },
  {
    fixture: "fx-nzlc-r123",
    scenario: "bibliography-entry",
    expected: "Law Commission Review of the Privacy Act 1993 (NZLC R123, 2011).",
    rule: "App 7 §V: 'Reports' section, full stop",
    source:
      "NZLSG 3 Appendix 7 (notes) (docs/standards-rule-notes.md; appendix-7.html fetched 2026-09-22)",
  },
];
