/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-002 — OSCOLA 4 expectation table (delta from OSCOLA 5).
 *
 * Rows cover the points where the 4th edition (2012, with the 2006
 * international-law supplement) differs from the 5th: lower-case `ibid`
 * for the immediately preceding footnote, short forms declared without
 * quotation marks, theses in single quotes, ECtHR/CJEU report forms,
 * websites with an access date, and the explicit comma before a page
 * pinpoint after a citation with no closing bracket. Points not listed here
 * are the same as in oscola5.ts. `expected` is the CORRECT form; `note`
 * records what the engine renders today. Generated from capture.json.
 */

import type { ExpectationTable } from "./types";

export const OSCOLA4_EXPECTATIONS: ExpectationTable = [
  {
    fixture: "fx-uk-corr",
    scenario: "first",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884",
    rule: "2.1.1: neutral citation, comma, law report; italic name with italic v",
    source:
      "OSCOLA 4 §2.1.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "first+page",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884, 42",
    rule: "2.1.6: where the court is not identified in brackets, insert a comma before a page pinpoint",
    source:
      "OSCOLA 4 §2.1.6 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "first+paragraph",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884 [42]",
    rule: "2.1.6: '[2001] 1 WLR 2112 [42], [45]'",
    source:
      "OSCOLA 4 §2.1.6 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-short",
    expected: "Corr (n 1)",
    rule: "1.2.1: 'Austin (n 1)'",
    source:
      "OSCOLA 4 §1.2.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-short+page",
    expected: "Corr (n 1) 42",
    rule: "1.2.1: 'Boulting (n 32) 638'",
    source:
      "OSCOLA 4 §1.2.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-ibid",
    expected: "ibid",
    rule: "1.2.1/1.2.3: 'ibid' (lower case, never italic, never capitalised) for the immediately preceding footnote; pinpoint follows with a space ('ibid 638', 'ibid [34]')",
    source:
      "OSCOLA 4 §1.2.3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-ibid+page",
    expected: "ibid 42",
    rule: "1.2.1/1.2.3: 'ibid' (lower case, never italic, never capitalised) for the immediately preceding footnote; pinpoint follows with a space ('ibid 638', 'ibid [34]')",
    source:
      "OSCOLA 4 §1.2.3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "subsequent-ibid+paragraph",
    expected: "ibid [42]",
    rule: "1.2.1/1.2.3: 'ibid' (lower case, never italic, never capitalised) for the immediately preceding footnote; pinpoint follows with a space ('ibid 638', 'ibid [34]') ('ibid [34] (Lord Hope)')",
    source:
      "OSCOLA 4 §1.2.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-corr",
    scenario: "bibliography-entry",
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884",
    rule: "1.6.2: table of cases, names not italicised",
    source:
      "OSCOLA 4 §1.6.2 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "first",
    expected: "AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, 2011 SC 158",
    rule: "2.2: Scottish reports carry no brackets round the year when it locates the case ('2006 SC (HL) [41]')",
    source:
      "OSCOLA 4 §2.2 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
    note: "currently renders: AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, (2011) SC 158 (‘AXA General Insurance Ltd’) — no AGLC 1.4.4 short-title introduction under OSCOLA (plan: appendFirstCitationSuffixes runs for every standard)",
  },
  {
    fixture: "fx-scot-axa",
    scenario: "subsequent-ibid",
    expected: "ibid",
    rule: "1.2.1/1.2.3: 'ibid' (lower case, never italic, never capitalised) for the immediately preceding footnote; pinpoint follows with a space ('ibid 638', 'ibid [34]')",
    source:
      "OSCOLA 4 §1.2.3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-ni-wilson",
    scenario: "first",
    expected: "Wilson v Commissioner of Valuation [2009] NICA 30, [2010] NI 48",
    rule: "2.3: guide example",
    source:
      "OSCOLA 4 §2.3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-ie-langan",
    scenario: "first",
    expected: "Langan v Health Service Executive [2024] IESC 1",
    rule: "2.8: other jurisdictions as at home (repo OSC-014 form)",
    source:
      "OSCOLA 4 §2.8 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22) + repo OSC-014",
    pending:
      "DECISION-040: OSCOLA 4 §2.8 (cases from other jurisdictions) was not extracted; the Irish form is taken from the repo OSC-014 notes",
    note: "currently renders: Langan v Health Service Executive [2024] IESC 1 (‘Langan’) — no AGLC 1.4.4 short-title introduction under OSCOLA (plan: appendFirstCitationSuffixes runs for every standard)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "first",
    expected: "Mabo v Queensland (1992) 175 CLR 1 (HCA)",
    rule: "2.8 as at home with the court in brackets (OSCOLA 5 §2.6.1 ex 3)",
    source:
      "OSCOLA 4 §2.8 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 4 §2.8 was not extracted; the foreign-case form is taken from OSCOLA 5 §2.6.1",
    note: "currently renders: Mabo v Queensland (1992) 175 CLR 1 (HCA) (‘Mabo’) — no AGLC 1.4.4 short-title introduction under OSCOLA (plan: appendFirstCitationSuffixes runs for every standard)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-short",
    expected: "Mabo (n 1)",
    rule: "1.2.1",
    source:
      "OSCOLA 4 §1.2.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-ibid",
    expected: "ibid",
    rule: "1.2.1/1.2.3: 'ibid' (lower case, never italic, never capitalised) for the immediately preceding footnote; pinpoint follows with a space ('ibid 638', 'ibid [34]')",
    source:
      "OSCOLA 4 §1.2.3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-mabo-reported",
    scenario: "subsequent-ibid+page",
    expected: "ibid 42",
    rule: "1.2.1/1.2.3: 'ibid' (lower case, never italic, never capitalised) for the immediately preceding footnote; pinpoint follows with a space ('ibid 638', 'ibid [34]')",
    source:
      "OSCOLA 4 §1.2.3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-brooker",
    scenario: "subsequent-ibid+page",
    expected: "ibid 42",
    rule: "1.2.1/1.2.3: 'ibid' (lower case, never italic, never capitalised) for the immediately preceding footnote; pinpoint follows with a space ('ibid 638', 'ibid [34]')",
    source:
      "OSCOLA 4 §1.2.3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-nz-taylor",
    scenario: "first+page",
    expected: "Taylor v New Zealand Poultry Board [1984] 1 NZLR 394 (CA) 42",
    rule: "2.1.6: page after a bracketed court identifier, no comma",
    source:
      "OSCOLA 4 §2.1.6 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "first",
    expected: "Human Rights Act 1998 (HRA 1998)",
    rule: "2.4.1: abbreviated form declared in round brackets without quotes and always with the year ('Nuclear Installations Act 1965 (NIA 1965) s 7(1)')",
    source:
      "OSCOLA 4 §2.4.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "first+section",
    expected: "Human Rights Act 1998 (HRA 1998) s 6",
    rule: "2.4.1: section follows the declaration with no comma",
    source:
      "OSCOLA 4 §2.4.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-short+section",
    expected: "HRA 1998, s 6",
    rule: "2.4.1: 'NIA 1965, s 12'",
    source:
      "OSCOLA 4 §2.4.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "subsequent-ibid",
    expected: "ibid",
    rule: "1.2.1/1.2.3: 'ibid' (lower case, never italic, never capitalised) for the immediately preceding footnote; pinpoint follows with a space ('ibid 638', 'ibid [34]')",
    source:
      "OSCOLA 4 §1.2.3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-hra",
    scenario: "bibliography-entry",
    expected: "Human Rights Act 1998",
    rule: "1.6.3: table of legislation",
    source:
      "OSCOLA 4 §1.6.3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "first",
    expected:
      "Russia (Sanctions) (EU Exit) Regulations 2019, SI 2019/855 (Russia Sanctions Regulations)",
    rule: "2.5.1: name, year, comma, SI number; abbreviated form declared without quotes (2.4.1 by reference)",
    source:
      "OSCOLA 4 §2.5.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-uk-si-russia",
    scenario: "subsequent-short+regulation",
    expected: "Russia Sanctions Regulations, reg 3",
    rule: "2.5.1/1.2.1: 'Working Time Directive, art 2'",
    source:
      "OSCOLA 4 §1.2.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "first",
    expected:
      "Harold Luntz, Assessment of Damages for Personal Injury and Death (4th edn, LexisNexis Butterworths 2002)",
    rule: "3.2.1: (edition, publisher year), 'edn', no place",
    source:
      "OSCOLA 4 §3.2.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-short+page",
    expected: "Luntz (n 1) 42",
    rule: "1.2.1: 'Stevens (n 1) 110'",
    source:
      "OSCOLA 4 §1.2.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "subsequent-ibid+page",
    expected: "ibid 42",
    rule: "1.2.1/1.2.3: 'ibid' (lower case, never italic, never capitalised) for the immediately preceding footnote; pinpoint follows with a space ('ibid 638', 'ibid [34]') ('ibid 271–78')",
    source:
      "OSCOLA 4 §1.2.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-book-luntz",
    scenario: "bibliography-entry",
    expected:
      "Luntz H, Assessment of Damages for Personal Injury and Death (4th edn, LexisNexis Butterworths 2002)",
    rule: "1.7: 'Fisher E, …', no terminal full stop",
    source:
      "OSCOLA 4 §1.7 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-chapter-gardner",
    scenario: "first",
    expected:
      "John Gardner, ‘The Purity and Priority of Private Law’ in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing 2009)",
    rule: "3.2.3: contributions to edited books — pages of the contribution are not given",
    source:
      "OSCOLA 4 §3.2.3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-article-young",
    scenario: "first+page",
    expected: "Alison L Young, ‘In Defence of Due Deference’ (2009) 72 MLR 554, 42",
    rule: "3.3.1: comma after the first page if there is a pinpoint",
    source:
      "OSCOLA 4 §3.3.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-article-young",
    scenario: "bibliography-entry",
    expected: "Young AL, ‘In Defence of Due Deference’ (2009) 72 MLR 554",
    rule: "1.7: initials only",
    source:
      "OSCOLA 4 §1.7 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "first",
    expected:
      "Javan Herberg, ‘Injunctive Relief for Wrongful Termination of Employment’ (DPhil thesis, University of Oxford 1989)",
    rule: "3.4.7: thesis title in single quotes (roman), then (type, university year) without a comma before the year",
    source:
      "OSCOLA 4 §3.4.7 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-thesis-herberg",
    scenario: "subsequent-ibid",
    expected: "ibid",
    rule: "1.2.1/1.2.3: 'ibid' (lower case, never italic, never capitalised) for the immediately preceding footnote; pinpoint follows with a space ('ibid 638', 'ibid [34]')",
    source:
      "OSCOLA 4 §1.2.3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-web-cyclefree",
    scenario: "first",
    expected:
      "Cyclefree, ‘Is This Really Necessary, Minister?’ (Legal Feminist, 27 April 2023) <https://perma.cc/3THK-P4AX> accessed 22 September 2026",
    rule: "3.4.8: author, quoted title, (site, date), URL in angle brackets, then 'accessed date'",
    source:
      "OSCOLA 4 §3.4.8 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 4 §3.4.8 requires an access date after the URL; the fixture stores none (the OSCOLA 5 persistent-link rule makes it unnecessary) — what should OSCOLA 4 render?",
    note: "currently renders: Cyclefree, ‘Is This Really Necessary, Minister?’, Legal Feminist (Blog Post, 27 April 2023) <https://perma.cc/3THK-P4AX> (‘Cyclefree’)",
  },
  {
    fixture: "fx-hansard-uk-hc",
    scenario: "first",
    expected: "HC Deb 3 February 1977, vol 389, col 973",
    rule: "3.4.2: same form as the 5th edition",
    source:
      "OSCOLA 4 §3.4.2 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "first",
    expected:
      "Rome Statute of the International Criminal Court (opened for signature 17 July 1998, entered into force 1 July 2002) 2187 UNTS 3 (Rome Statute)",
    rule: "2006 supplement §1: title, (opened for signature …, entered into force …), volume UNTS page, informal short title in parentheses without quotes",
    source:
      "OSCOLA 4 §2006 supp 1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
    note: "currently renders: Rome Statute of the International Criminal Court (adopted 17 July 1998, entered into force 1 July 2002) 2187 UNTS 3 (‘Rome Statute’)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "first+article",
    expected:
      "Rome Statute of the International Criminal Court (opened for signature 17 July 1998, entered into force 1 July 2002) 2187 UNTS 3 (Rome Statute) art 7",
    rule: "2006 supplement §1: '189 UNTS 137 (Refugee Convention) art 33' — no comma after the bracketed short title",
    source:
      "OSCOLA 4 §2006 supp 1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 4 (2006 supplement §1) shows article pinpoints only after a bracketed short title; whether a comma is required when no short form precedes 'art' is unconfirmed",
    note: "currently renders: Rome Statute of the International Criminal Court (adopted 17 July 1998, entered into force 1 July 2002) 2187 UNTS 3, 7 (‘Rome Statute’)",
  },
  {
    fixture: "fx-treaty-rome",
    scenario: "subsequent-short+article",
    expected: "Rome Statute, art 7",
    rule: "1.2.1: 'Working Time Directive, art 2'",
    source:
      "OSCOLA 4 §1.2.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "first",
    expected: "Balogh v Hungary App no 47940/99 (ECtHR, 20 July 2004)",
    rule: "2.7.1: unreported judgments give the application number then (ECtHR, date)",
    source:
      "OSCOLA 4 §2.7.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "first+paragraph",
    expected: "Balogh v Hungary App no 47940/99 (ECtHR, 20 July 2004), para 42",
    rule: "2.7.1: 'when pinpointing, use para or paras after a comma'",
    source:
      "OSCOLA 4 §2.7.1 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-echr-balogh",
    scenario: "subsequent-ibid",
    expected: "ibid",
    rule: "1.2.1/1.2.3: 'ibid' (lower case, never italic, never capitalised) for the immediately preceding footnote; pinpoint follows with a space ('ibid 638', 'ibid [34]')",
    source:
      "OSCOLA 4 §1.2.3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
  {
    fixture: "fx-cjeu-hellenic",
    scenario: "first",
    expected: "Case C-363/16 European Commission v Hellenic Republic [2018] ECR I-0",
    rule: "2.6.2: case number, italic name, [year] ECR page; the ECR ceased in 2012 and the fixture stores only an ECLI",
    source:
      "OSCOLA 4 §2.6.2 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
    pending:
      "DECISION-040: OSCOLA 4 §2.6.2 cites the ECR report (or the OJ notice / court and date when unreported); with only an ECLI stored, what should the OSCOLA 4 profile render?",
    note: "currently renders: Case C-363/16 European Commission v Hellenic Republic ECLI:EU:C:2018:12 (‘Commission v Hellenic Republic’)",
  },
  {
    fixture: "fx-un-res-1373",
    scenario: "first",
    expected: "UNSC Res 1373 (28 September 2001) UN Doc S/RES/1373 (SC Res 1373)",
    rule: "2006 supplement §3: 'UNSC Res 1373 (28 September 2001) UN Doc S/RES/1373'; short title in parentheses without quotes",
    source:
      "OSCOLA 4 §2006 supp 3 (docs/standards-rule-notes.md; OSCOLA_4_IntLaw2006.pdf text verified 2026-09-22)",
  },
];
