/**
 * UK report series dataset — independently compiled from public domain sources.
 *
 * This data maps UK report series abbreviations to their full names, jurisdictions,
 * and classification. Compiled from the Cardiff Index to Legal Abbreviations,
 * BAILII catalogue, and court websites.
 *
 * Copyright (c) 2024-2026 Obiter contributors — GPLv3
 */

import { ReportSeriesEntry } from "./report-series";

export type UKJurisdiction = "E&W" | "Scot" | "NI" | "UK";

export interface UKReportSeriesEntry extends ReportSeriesEntry {
  jurisdiction: UKJurisdiction | string;
}

/**
 * ~100 UK report series entries compiled from public domain sources.
 *
 * Sources key:
 *   "Cardiff Index"  — Cardiff Index to Legal Abbreviations (Cardiff University)
 *   "BAILII"         — British and Irish Legal Information Institute
 *   "ICLR"           — Incorporated Council of Law Reporting (public catalogue)
 *   "Public domain"  — Widely published in multiple freely available references
 */
export const UK_REPORT_SERIES: UKReportSeriesEntry[] = [
  // =========================================================================
  // LAW REPORTS (AUTHORISED) — ICLR
  // =========================================================================
  {
    abbreviation: "AC",
    fullName: "Appeal Cases",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: true,
    source: "ICLR",
  },
  {
    abbreviation: "QB",
    fullName: "Queen's Bench",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: true,
    source: "ICLR",
  },
  {
    abbreviation: "KB",
    fullName: "King's Bench",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: true,
    source: "ICLR",
  },
  {
    abbreviation: "Ch",
    fullName: "Chancery",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: true,
    source: "ICLR",
  },
  {
    abbreviation: "Fam",
    fullName: "Family Division",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: true,
    source: "ICLR",
  },
  {
    abbreviation: "P",
    fullName: "Probate Division",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: true,
    source: "ICLR",
  },
  {
    // Confirmed by AGLC4 Appendix A (DATA-004, 2026-07-20): bare "Ex" is the
    // nominate series "Exchequer Reports" (UK, 1847–56). It is absent from the
    // rule 24.1.2 table (which lists only "Ex D" 1875–80 and "LR Ex" 1865–75)
    // but is a legitimate AGLC4 abbreviation — kept. See DECISION-026.
    abbreviation: "Ex",
    fullName: "Exchequer Reports",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "AGLC4 Appendix A",
  },
  {
    abbreviation: "CPD",
    fullName: "Common Pleas Division",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: true,
    source: "ICLR",
  },
  {
    abbreviation: "App Cas",
    fullName: "Appeal Cases (Law Reports)",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Nominate series (Clark) — distinct from "LR HL" below.
    abbreviation: "HL Cas",
    fullName: "House of Lords Cases (Clark)",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: false,
    source: "Cardiff Index",
  },

  // =========================================================================
  // LAW REPORTS — PREDECESSOR SERIES (rule 24.1.2 table, PDF pp.276–277)
  //
  // 1875–90 divisional series (Ch D, QBD, PD, Ex D) and the 1865–75
  // "LR"-prefixed series. Note the rule 24.1.2 volume-placement rule: where
  // an abbreviation contains 'LR', the volume number goes between 'LR' and
  // the remainder (eg 'LR 7 QB', not '7 LR QB'; illustration 5:
  // 'Skinner v Orde (1871) LR 4 PC 60').
  // =========================================================================
  {
    // Chancery, 1875–90.
    abbreviation: "Ch D",
    fullName: "Chancery Division",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Queen's and King's Bench, 1875–90.
    abbreviation: "QBD",
    fullName: "Queen's Bench Division",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Probate and Divorce, 1875–90.
    abbreviation: "PD",
    fullName: "Probate Division",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Exchequer, 1875–80.
    abbreviation: "Ex D",
    fullName: "Exchequer Division",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Admiralty and Ecclesiastical Cases, 1865–75.
    abbreviation: "LR Adm & Eccl",
    fullName: "Law Reports, Admiralty and Ecclesiastical Cases",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Chancery Appeal Cases, 1865–75.
    abbreviation: "LR Ch App",
    fullName: "Law Reports, Chancery Appeal Cases",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Common Pleas, 1865–75.
    abbreviation: "LR CP",
    fullName: "Law Reports, Common Pleas",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Crown Cases Reserved, 1865–75.
    abbreviation: "LR CCR",
    fullName: "Law Reports, Crown Cases Reserved",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // English and Irish Appeals and Peerage Claims, 1865–75. Distinct from
    // the nominate "HL Cas" above — not substitutes for one another.
    abbreviation: "LR HL",
    fullName: "Law Reports, English and Irish Appeals and Peerage Claims",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Equity, 1865–75.
    abbreviation: "LR Eq",
    fullName: "Law Reports, Equity",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Exchequer, 1865–75.
    abbreviation: "LR Ex",
    fullName: "Law Reports, Exchequer",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Privy Council, 1865–75 (illustration 5: 'LR 4 PC 60').
    abbreviation: "LR PC",
    fullName: "Law Reports, Privy Council",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Probate and Divorce, 1865–75 — no spaces around '&' per the table.
    abbreviation: "LR P&D",
    fullName: "Law Reports, Probate and Divorce",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Queen's Bench, 1865–75.
    abbreviation: "LR QB",
    fullName: "Law Reports, Queen's Bench",
    jurisdiction: "E&W",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Restrictive Practices, 1957–72.
    abbreviation: "LR RP",
    fullName: "Law Reports, Restrictive Practices",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },
  {
    // Scotch and Divorce Appeals, 1865–75.
    abbreviation: "LR Sc & Div",
    fullName: "Law Reports, Scotch and Divorce Appeals",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: false,
    source: "ICLR",
  },

  // =========================================================================
  // GENERALIST (UNAUTHORISED)
  // =========================================================================
  {
    abbreviation: "WLR",
    fullName: "Weekly Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "ICLR",
  },
  {
    abbreviation: "All ER",
    fullName: "All England Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "All ER (D)",
    fullName: "All England Law Reports (Digests)",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "TLR",
    fullName: "Times Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "LT",
    fullName: "Law Times Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Sol Jo",
    fullName: "Solicitors' Journal",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },

  // =========================================================================
  // SPECIALIST (UNAUTHORISED SUBJECT-SPECIFIC)
  // =========================================================================
  {
    abbreviation: "Cr App R",
    fullName: "Criminal Appeal Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Cr App R (S)",
    fullName: "Criminal Appeal Reports (Sentencing)",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "ICR",
    fullName: "Industrial Cases Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "IRLR",
    fullName: "Industrial Relations Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "FSR",
    fullName: "Fleet Street Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "RPC",
    fullName: "Reports of Patent Cases",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Lloyd's Rep",
    fullName: "Lloyd's Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Lloyd's Rep IR",
    fullName: "Lloyd's Law Reports: Insurance and Reinsurance",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Tax Cas",
    fullName: "Tax Cases",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "STC",
    fullName: "Simon's Tax Cases",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "BTC",
    fullName: "British Tax Cases",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "BCLC",
    fullName: "Butterworths Company Law Cases",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "BCC",
    fullName: "British Company Law Cases",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "FLR",
    fullName: "Family Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Fam Law",
    fullName: "Family Law",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "CMLR",
    fullName: "Common Market Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Env LR",
    fullName: "Environmental Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Con LR",
    fullName: "Construction Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "EG",
    fullName: "Estates Gazette",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "EGLR",
    fullName: "Estates Gazette Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "P & CR",
    fullName: "Property and Compensation Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "HLR",
    fullName: "Housing Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "EHRR",
    fullName: "European Human Rights Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "HRLR",
    fullName: "Human Rights Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Med LR",
    fullName: "Medical Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "PIQR",
    fullName: "Personal Injuries and Quantum Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "RTR",
    fullName: "Road Traffic Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "LRLR",
    fullName: "Landlord and Tenant Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "JPL",
    fullName: "Journal of Planning and Environment Law",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "ELR",
    fullName: "Education Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "BPIR",
    fullName: "Bankruptcy and Personal Insolvency Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Costs LR",
    fullName: "Costs Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "WTLR",
    fullName: "Wills and Trusts Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "ITELR",
    fullName: "International Trust and Estate Law Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "ETMR",
    fullName: "European Trade Mark Reports",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },

  // =========================================================================
  // SCOTTISH REPORTS
  // =========================================================================
  {
    abbreviation: "SC",
    fullName: "Session Cases",
    jurisdiction: "Scot",
    type: "authorised",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "SC (HL)",
    fullName: "Session Cases (House of Lords)",
    jurisdiction: "Scot",
    type: "authorised",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "SC (PC)",
    fullName: "Session Cases (Privy Council)",
    jurisdiction: "Scot",
    type: "authorised",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "SLT",
    fullName: "Scots Law Times",
    jurisdiction: "Scot",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "SCLR",
    fullName: "Scottish Civil Law Reports",
    jurisdiction: "Scot",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "SCCR",
    fullName: "Scottish Criminal Case Reports",
    jurisdiction: "Scot",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "GWD",
    fullName: "Green's Weekly Digest",
    jurisdiction: "Scot",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Macph",
    fullName: "Macpherson's Session Cases",
    jurisdiction: "Scot",
    type: "authorised",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Rettie",
    fullName: "Rettie's Session Cases",
    jurisdiction: "Scot",
    type: "authorised",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Adam",
    fullName: "Adam's Justiciary Cases",
    jurisdiction: "Scot",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },

  // =========================================================================
  // NORTHERN IRELAND REPORTS
  // =========================================================================
  {
    abbreviation: "NI",
    fullName: "Northern Ireland Law Reports",
    jurisdiction: "NI",
    type: "authorised",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "NIJB",
    fullName: "Northern Ireland Judgments Bulletin",
    jurisdiction: "NI",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "NILR",
    fullName: "Northern Ireland Legal Reports",
    jurisdiction: "NI",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Cardiff Index",
  },

  // =========================================================================
  // HISTORICAL NOMINATE REPORTS
  // =========================================================================
  {
    abbreviation: "Cox CC",
    fullName: "Cox's Criminal Cases",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Camp",
    fullName: "Campbell's Nisi Prius Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Bing",
    fullName: "Bingham's Common Pleas Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Bing NC",
    fullName: "Bingham's New Cases",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "B & Ald",
    fullName: "Barnewall and Alderson's King's Bench Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "B & C",
    fullName: "Barnewall and Cresswell's King's Bench Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Burr",
    fullName: "Burrow's King's Bench Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Co Rep",
    fullName: "Coke's Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Doug",
    fullName: "Douglas's King's Bench Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "East",
    fullName: "East's King's Bench Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Esp",
    fullName: "Espinasse's Nisi Prius Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Hare",
    fullName: "Hare's Chancery Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "M & W",
    fullName: "Meeson and Welsby's Exchequer Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Mood",
    fullName: "Moody's Crown Cases Reserved",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Plowd",
    fullName: "Plowden's Commentaries",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Str",
    fullName: "Strange's King's Bench Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Taunt",
    fullName: "Taunton's Common Pleas Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Term Rep",
    fullName: "Term Reports (Durnford and East)",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Ves",
    fullName: "Vesey's Chancery Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Ves Jr",
    fullName: "Vesey Junior's Chancery Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "WR",
    fullName: "Weekly Reporter",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "De G & J",
    fullName: "De Gex and Jones's Chancery Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "De G M & G",
    fullName: "De Gex, Macnaghten and Gordon's Chancery Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Sim",
    fullName: "Simons' Chancery Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Y & C Ex",
    fullName: "Younge and Collyer's Exchequer Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Beav",
    fullName: "Beavan's Rolls Court Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    // Rule 24.1.3: nominate reports must carry a parallel citation to the
    // English Reports ('ER') or, failing that, the Revised Reports ('RR').
    abbreviation: "ER",
    fullName: "English Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    // Rule 24.1.3: fallback parallel-citation series where a nominate
    // report is not reproduced in the English Reports.
    abbreviation: "RR",
    fullName: "Revised Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Leach",
    fullName: "Leach's Crown Cases",
    jurisdiction: "E&W",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Lofft",
    fullName: "Lofft's King's Bench Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Stark",
    fullName: "Starkie's Nisi Prius Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Wils KB",
    fullName: "Wilson's King's Bench Reports",
    jurisdiction: "E&W",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
];

/**
 * Search UK report series by abbreviation or full name (case-insensitive substring match).
 */
export function searchUKReportSeries(query: string): UKReportSeriesEntry[] {
  const lowerQuery = query.toLowerCase();
  return UK_REPORT_SERIES.filter(
    (entry) =>
      entry.abbreviation.toLowerCase().includes(lowerQuery) ||
      entry.fullName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Look up a UK report series by its exact abbreviation (case-sensitive).
 */
export function getUKReportSeriesByAbbreviation(abbrev: string): UKReportSeriesEntry | undefined {
  return UK_REPORT_SERIES.find((entry) => entry.abbreviation === abbrev);
}

/**
 * Filter UK report series by jurisdiction.
 */
export function getUKReportSeriesByJurisdiction(
  jurisdiction: UKJurisdiction
): UKReportSeriesEntry[] {
  return UK_REPORT_SERIES.filter((entry) => entry.jurisdiction === jurisdiction);
}
