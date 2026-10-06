/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Court preset provenance (COURT-106, COURT-115)
 *
 * Typed provenance for every toggle value in `COURT_PRESETS`, moved out of
 * the code comments in presets.ts so Settings and the generated
 * `docs/court-profiles.md` can show where each value comes from.
 *
 * The provenance describes the preset value AS IT IS, including values the
 * research found unsupported or contradicted. Those are marked "unsourced"
 * with a note naming the evidence and the story that will correct the value
 * (COURT-111 and others). Changing a preset value means updating its
 * provenance here and bumping the preset's `version` (an existing document
 * keeps its frozen values until the user accepts the "Update court profile"
 * prompt, DECISION-043 item 4).
 *
 * Source ids are those of the court-interop evidence register
 * (docs/research/court-interop/EVIDENCE-REGISTER.md, compiled 6 Oct 2026).
 * Every profile is experimental: no profile meets backlog decision rule 1
 * (a documented rule plus representative current examples of the same
 * document type).
 */

import type { CourtJurisdiction } from "./presets";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Where a toggle value comes from.
 *
 * - "official" — a court instrument states it or gives it as its example.
 * - "observed" — repeated practice in published court documents (evidence
 *   register decision rule 2); never a rule for submissions.
 * - "preference" — Obiter's own default where the instrument is silent
 *   (including falling back to the AGLC4 form).
 * - "unsourced" — no instrument supports the value, or the instrument
 *   contradicts it; the note says which.
 */
export type ProvenanceKind = "official" | "observed" | "preference" | "unsourced";

/** COURT-106: provenance for one toggle value of one preset. */
export interface FieldProvenance {
  /** Evidence-register ids (or "DECISION-043", "AGLC4"). */
  sourceIds: string[];
  /** Clause, rule or paragraph within the first source. */
  clause?: string;
  kind: ProvenanceKind;
  /** ISO date the value was checked against the source; null if never. */
  checked: string | null;
  /** Plain-language note shown beside the value. */
  note?: string;
}

/** The toggle keys a court profile freezes into the document. */
export type CourtToggleKey =
  | "parallelCitations"
  | "parallelOrder"
  | "reportedCaseMnc"
  | "pinpointStyle"
  | "pinpointConnector"
  | "reportStartingPage"
  | "authorisedReportHierarchy"
  | "unreportedGate"
  | "ibidSuppression"
  | "crossReferenceSuppression"
  | "subsequentForm"
  | "loaType";

/** COURT-115: one court instrument (or decision) a preset was checked against. */
export interface ProfileSource {
  id: string;
  /** Short instrument name, as shown in the experimental label. */
  title: string;
  /** Effective date or version, as recorded in the register. */
  effective: string;
  url?: string;
}

/** COURT-106 / COURT-115: provenance for a whole preset. */
export interface CourtPresetProvenance {
  /**
   * Preset data version. Bump it whenever any value of this preset
   * changes; documents frozen at an older version are offered the update.
   */
  version: string;
  /** Instruments the preset was checked against (register ids); empty if none was found. */
  checkedAgainst: string[];
  /** ISO date of the last check against those instruments. */
  reviewed: string | null;
  fields: Record<CourtToggleKey, FieldProvenance>;
  /** Known gaps and exceptions, listed in docs/court-profiles.md. */
  exceptions: string[];
}

// ─── Sources ────────────────────────────────────────────────────────────────

/** Date the evidence register was compiled and its sources retrieved. */
export const REGISTER_CHECKED = "2026-10-06";

/** Preset data version for every preset as at the COURT epic research. */
const V1 = "2026-10-06";

/**
 * COURT-111 / COURT-119: the same-day revision that applied the register
 * corrections (R02 §5) and DECISION-043 item 3. A preset at this version
 * changed at least one value from V1, or is new.
 */
const V2 = "2026-10-06.2";

/*
 * "2026-10-07" (COURT-113: WA later references by case name, PD 2.1 cl 14)
 * was WASC's version until COURT-117 moved it on; no preset is at it now.
 */

/**
 * COURT-117: List of Authorities layouts backed by the instrument (HCA, FCA,
 * NSWCA, WASC). A preset at this version changed its `loaType` from V1, V2
 * or V3; existing documents are offered the change (DECISION-043 item 4).
 */
const V4 = "2026-10-07.2";

/**
 * The instruments and decisions preset values cite. Titles, dates and URLs
 * are those of the evidence register (§2), retrieved 6 October 2026.
 */
export const PROFILE_SOURCES: Record<string, ProfileSource> = {
  "HCA-1": {
    id: "HCA-1",
    title: "HCA Practice Direction No 2 of 2024 (Joint Book of Authorities)",
    effective: "20 Dec 2024",
    url: "https://www.hcourt.gov.au/sites/default/files/assets/registry/practice-directions/Practice_Direction_No_2_of_2024__Joint_Book_of_Authorities_20_December_2024.pdf",
  },
  "HCA-2": {
    id: "HCA-2",
    title: "HCA Form 27A",
    effective: "2024",
    url: "https://www.hcourt.gov.au/sites/default/files/assets/registry/Forms2024/FORM_27A_2024.pdf",
  },
  "FCA-1": {
    id: "FCA-1",
    title: "FCA Lists of Authorities and Citations Practice Note (GPN-AUTH)",
    effective: "7 May 2025",
    url: "https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-auth",
  },
  "FCA-2": {
    id: "FCA-2",
    title: "FCA eBooks Practice Note (GPN-eBOOKS)",
    effective: "11 Jun 2026",
    url: "https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-ebooks",
  },
  "FCF-1": {
    id: "FCF-1",
    title: "FCFCOA FAM-APPEALS Practice Direction",
    effective: "updated 10 Jun 2025",
    url: "https://www.fcfcoa.gov.au/fl/pd/fam-appeals",
  },
  "NSW-1": {
    id: "NSW-1",
    title: "NSW SC Practice Note SC Gen 20 (Citation of Authority)",
    effective: "1 Oct 2023",
    url: "https://supremecourt.nsw.gov.au/content/dam/dcj/ctsd/supreme-court/documents/Practice-and-Procedure/Practice-Notes/general/current/20230912_SC_Gen_20_Citation_of_Authority.pdf",
  },
  "NSW-2": {
    id: "NSW-2",
    title: "NSW Court of Appeal Practice Note SC CA 1",
    effective: "8 May 2023",
    url: "https://supremecourt.nsw.gov.au/content/dam/dcj/ctsd/supreme-court/documents/Practice-and-Procedure/Practice-Notes/court-of-appeal-practice-notes/current/2023_05_08_PN_SC_CA_1_-_Court_of_Appeal.pdf",
  },
  "NSW-3": {
    id: "NSW-3",
    title: "NSW Court of Criminal Appeal Practice Note SC CCA 1 (General)",
    effective: "22 Jul 2021",
    url: "https://supremecourt.nsw.gov.au/documents/Practice-and-Procedure/Practice-Notes/cca-practice-notes/current/2021_07_22_SC_CCA_1_General.pdf",
  },
  "NSW-4": {
    id: "NSW-4",
    title: "NSW District and Local Court practice-note indexes (no citation instrument found)",
    effective: "checked 6 Oct 2026",
    url: "https://districtcourt.nsw.gov.au/practice-procedures-publications/practice-and-procedure/practice-notes.html",
  },
  "VIC-1": {
    id: "VIC-1",
    title: "Vic SC Practice Note SC Gen 3 (Citation of authorities and legislation)",
    effective: "1 Dec 2025",
    url: "https://www.supremecourt.vic.gov.au/sites/default/files/2026-03/SC%20Gen%203%20-%20citation%20of%20authorities%20and%20legislation.pdf",
  },
  "VIC-2": {
    id: "VIC-2",
    title: "Vic Court of Appeal Practice Note SC CA 3",
    effective: "10 Mar 2026",
    url: "https://www.supremecourt.vic.gov.au/sites/default/files/2026-03/CA%203%20-%20Civil%20applications%20and%20appeals.pdf",
  },
  "QLD-1": {
    id: "QLD-1",
    title: "Qld SC Practice Direction 1 of 2024 (Citation of Authority)",
    effective: "29 Jan 2024",
    url: "https://www.courts.qld.gov.au/__data/assets/pdf_file/0007/786697/scpd-01-of-2024.pdf",
  },
  "QLD-2": {
    id: "QLD-2",
    title: "Qld SC Practice Direction 3 of 2013 (Court of Appeal)",
    effective: "2013",
    url: "https://www.courts.qld.gov.au/__data/assets/pdf_file/0003/177456/sc-pd3of2013.pdf",
  },
  "QLD-3": {
    id: "QLD-3",
    title: "Qld Magistrates Court Practice Direction 7 of 2024 (Citation of Authority)",
    effective: "7 Jun 2024",
    url: "https://www.courts.qld.gov.au/__data/assets/pdf_file/0005/800915/mcpd-07-of-2024.pdf",
  },
  "WA-1": {
    id: "WA-1",
    title: "WA SC Consolidated Practice Directions (PD 2.1, PD 8.2.2)",
    effective: "updated 23 Sep 2026",
    url: "https://www.supremecourt.wa.gov.au/C/consolidated_practice_directions.aspx",
  },
  "SA-1": {
    id: "SA-1",
    title: "SA Uniform Civil Rules 2020 (rr 101.8, 217.8; Form 91)",
    effective: "current to 15 Mar 2026",
    url: "https://www.courts.sa.gov.au/wp-content/uploads/wp-download-manager-files/court-rules/08-uniform-civil-rules/Uniform%20Civil%20Rules%202020.pdf",
  },
  "TAS-1": {
    id: "TAS-1",
    title: "Tas SC Practice Direction 3 of 2014 (Citation of Judgments)",
    effective: "21 Feb 2014",
    url: "https://supremecourt.tas.gov.au/wp-content/uploads/2018/11/Practice_Direction_3_of_2014_-_Citation_of_Judgments_.pdf",
  },
  "TAS-2": {
    id: "TAS-2",
    title: "Tas SC Practice Direction 3 of 2022 (Appeal Books, Lists of Authorities, Submissions)",
    effective: "24 Aug 2022",
    url: "https://www.supremecourt.tas.gov.au/wp-content/uploads/2022/08/3-of-2022-Practice-Direction-Appeal-Books-Lists-of-Authorities-Written-Submissions.pdf",
  },
  "ACT-1": {
    id: "ACT-1",
    title: "ACT SC Practice Direction 2 of 2022 (Citation of Authority)",
    effective: "26 May 2022",
    url: "https://www.courts.act.gov.au/__data/assets/pdf_file/0006/2008356/2a13102c6f1ab879a79145619cec0cb3abf2241d.pdf",
  },
  "NT-1": {
    id: "NT-1",
    title: "NT SC Practice Direction 2 of 2007 (Citation of Authorities)",
    effective: "25 May 2007",
    url: "https://supremecourt.nt.gov.au/_resources/documents/lawyers/practice-directions/citation-of-authorities-2-of-2007.pdf",
  },
  "NT-2": {
    id: "NT-2",
    title: "NT SC Practice Direction 1 of 2025 (Lists of Authorities)",
    effective: "1 Jan 2025",
    url: "https://supremecourt.nt.gov.au/_resources/documents/lawyers/practice-directions/practice-direction1of2025-lists-authorities-summaries-submissions.pdf",
  },
  "O-C5": {
    id: "O-C5",
    title: "Observed practice in published NSW and ACT judgments (evidence register O-C5)",
    effective: "Nov 2025 to Oct 2026 sample",
  },
  "DECISION-043": {
    id: "DECISION-043",
    title: "Obiter DECISION-043 (owner decision, court interoperability)",
    effective: "6 Oct 2026",
  },
  AGLC4: {
    id: "AGLC4",
    title: "Australian Guide to Legal Citation (4th ed, 2018)",
    effective: "2018",
  },
};

// ─── Field builders ─────────────────────────────────────────────────────────

const official = (sourceIds: string[], clause?: string, note?: string): FieldProvenance => ({
  sourceIds,
  ...(clause ? { clause } : {}),
  kind: "official",
  checked: REGISTER_CHECKED,
  ...(note ? { note } : {}),
});

const unsourced = (note: string, sourceIds: string[] = [], clause?: string): FieldProvenance => ({
  sourceIds,
  ...(clause ? { clause } : {}),
  kind: "unsourced",
  checked: sourceIds.length > 0 ? REGISTER_CHECKED : null,
  note,
});

/** Not checked against any instrument. */
const notChecked = (): FieldProvenance => unsourced("Not checked against a court instrument.");

/**
 * Ibid suppression: no instrument read mentions ibid (register O-R14). Kept
 * unchanged as an Obiter default (DECISION-043 item 2).
 */
const IBID: FieldProvenance = {
  sourceIds: ["DECISION-043"],
  clause: "item 2",
  kind: "preference",
  checked: REGISTER_CHECKED,
  note: "No court instrument read mentions ibid (register O-R14); Obiter default kept by DECISION-043 item 2.",
};

/**
 * COURT-107: `(n X)` suppression. No court instrument read requires or
 * forbids the AGLC4 r 1.4.1 cross-reference (register R02; published
 * judgments do not use it, O-C2, O-C5); the court-mode
 * behaviour is kept unchanged as an Obiter default.
 */
const CROSS_REFERENCE_DEFAULT: FieldProvenance = {
  sourceIds: [],
  kind: "preference",
  checked: REGISTER_CHECKED,
  note: "No court instrument read requires or forbids (n X) cross-references (register R02); published judgments do not use them (O-C2, O-C5). Obiter court-mode default, unchanged.",
};

/**
 * COURT-113: the short-title subsequent form where the instrument states no
 * form for later references (court-mode behaviour before COURT-113).
 */
const SHORT_TITLE_DEFAULT: FieldProvenance = {
  sourceIds: [],
  kind: "preference",
  checked: REGISTER_CHECKED,
  note: "No court instrument read states a form for later references (register R02); Obiter court-mode default (short title and pinpoint).",
};

/** Report-first where the instrument is silent (DECISION-043 item 3). */
const REPORT_FIRST_DEFAULT: FieldProvenance = {
  sourceIds: ["DECISION-043"],
  clause: "item 3",
  kind: "preference",
  checked: REGISTER_CHECKED,
  note: "Instrument silent on order; report first by default (DECISION-043 item 3).",
};

/**
 * COURT-111: the order does not apply when the report replaces the MNC; the
 * value is the report-first default and has no effect.
 */
const notApplicable = (): FieldProvenance => ({
  sourceIds: ["DECISION-043"],
  clause: "item 3",
  kind: "preference",
  checked: REGISTER_CHECKED,
  note: "No parallel citation is given, so the order has no effect; report first by default (DECISION-043 item 3).",
});

/** Report-first observed in published NSW judgments (DECISION-043 item 3; O-C5). */
const REPORT_FIRST_NSW: FieldProvenance = {
  sourceIds: ["O-C5", "DECISION-043"],
  kind: "observed",
  checked: REGISTER_CHECKED,
  note: "Observed in published NSW judgments (register O-C5); adopted by DECISION-043 item 3.",
};

/** The AGLC4 pinpoint form where the instrument shows no connector. */
const AGLC_CONNECTOR: FieldProvenance = {
  sourceIds: ["AGLC4"],
  clause: "r 2.2.5",
  kind: "preference",
  checked: REGISTER_CHECKED,
  note: "Instrument shows no pinpoint connector; Obiter uses the AGLC4 form.",
};

/**
 * COURT-110 follow-up: every preset keeps the report starting page with a
 * paragraph pinpoint, as AGLC4 r 2.2.5 requires (COURT-110). No court
 * instrument read supports a report citation without it.
 */
const STARTING_PAGE_AGLC: FieldProvenance = {
  sourceIds: ["AGLC4"],
  clause: "r 2.2.5",
  kind: "preference",
  checked: REGISTER_CHECKED,
  note: "A page must always appear in a report pinpoint (COURT-110); no court instrument read supports a report citation without its starting page.",
};

/**
 * COURT-111: the MNC of a reported case is added (the behaviour of every
 * court document before COURT-111) unless an instrument says the report
 * replaces it.
 */
const MNC_INCLUDE_DEFAULT: FieldProvenance = {
  sourceIds: [],
  kind: "preference",
  checked: null,
  note: "Obiter default: the MNC is given with the report (court-mode behaviour before COURT-111).",
};

/** COURT-111: an instrument says the report is cited instead of the MNC. */
const mncOmitted = (sourceIds: string[], clause?: string, note?: string): FieldProvenance =>
  official(
    sourceIds,
    clause,
    note ??
      "The report replaces the MNC; the MNC is cited only for an unreported judgment (also AGLC4 r 2.2.7)."
  );

/** COURT-111: report first where the instrument requires both but states no order. */
const REPORT_FIRST_SILENT = (sourceIds: string[]): FieldProvenance => ({
  sourceIds: [...sourceIds, "DECISION-043"],
  kind: "preference",
  checked: REGISTER_CHECKED,
  note: "Instrument requires both but states no order; report first by default (DECISION-043 item 3).",
});

/** COURT-119: no instrument found for the court; values fall back. */
const noInstrument = (sourceIds: string[], note: string): FieldProvenance => ({
  sourceIds,
  kind: "unsourced",
  checked: sourceIds.length > 0 ? REGISTER_CHECKED : null,
  note,
});

/** Every field not checked; used as the base for courts with no instrument. */
function allNotChecked(): Record<CourtToggleKey, FieldProvenance> {
  return {
    parallelCitations: notChecked(),
    parallelOrder: REPORT_FIRST_DEFAULT,
    reportedCaseMnc: MNC_INCLUDE_DEFAULT,
    pinpointStyle: notChecked(),
    pinpointConnector: AGLC_CONNECTOR,
    reportStartingPage: STARTING_PAGE_AGLC,
    authorisedReportHierarchy: notChecked(),
    unreportedGate: notChecked(),
    ibidSuppression: IBID,
    crossReferenceSuppression: CROSS_REFERENCE_DEFAULT,
    subsequentForm: SHORT_TITLE_DEFAULT,
    loaType: notChecked(),
  };
}

// ─── Per-preset provenance ──────────────────────────────────────────────────

/**
 * Provenance for every preset value. Values marked "unsourced" with a
 * source id are ones the register found contradicted or overstated (R02 §5);
 * the note names the correcting story.
 */
export const COURT_PRESET_PROVENANCE: Record<CourtJurisdiction, CourtPresetProvenance> = {
  // ── Federal ─────────────────────────────────────────────────────────────
  HCA: {
    version: V4,
    checkedAgainst: ["HCA-1", "HCA-2"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: unsourced(
        "HCA instruments are silent on parallel citation (register O-R4); value under review (open question Q3).",
        ["HCA-1", "HCA-2"]
      ),
      authorisedReportHierarchy: official(["HCA-1", "HCA-2"], "JBA Part C; Form 27A Part IV"),
      loaType: official(
        ["HCA-1", "HCA-2"],
        "PD 2 of 2024; Form 27A annexure",
        "Joint Book of Authorities Parts A to E (principal legislation; other legislation; CLR cases; other report series; other materials), with the legislation version (register O-R3, O-R15)."
      ),
    },
    exceptions: [
      "The list gives the Joint Book parts and the legislation version; the volume index, page numbers and counsel's certificate are not generated.",
      "Principal legislation (Part A) is chosen by the user in Edit Citation; it cannot be inferred.",
    ],
  },
  FCA: {
    version: V4,
    checkedAgainst: ["FCA-1", "FCA-2"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(["FCA-1"], "cl 2.4–2.5"),
      parallelOrder: official(
        ["FCA-1", "DECISION-043"],
        "cl 2.5",
        "Instrument example: “D'Arcy v Myriad Genetics Inc [2014] FCAFC 115; (2014) 224 FCR 479” (register O-R2; DECISION-043 item 3)."
      ),
      pinpointStyle: official(["FCA-1"], "cl 2.4, 2.6"),
      pinpointConnector: official(["FCA-1"], "cl 2.6", "Instrument example: “at [29]”, “at 481”."),
      authorisedReportHierarchy: official(["FCA-1"], "Annexure"),
      loaType: official(
        ["FCA-2", "FCA-1"],
        "GPN-eBOOKS cl 7.2, 7.4",
        "Authorities, legislation, and bills and explanatory material, each alphabetical; legislation states the version in force. GPN-AUTH (7 May 2025) has no Part A / Part B list (register O-R1)."
      ),
    },
    exceptions: [
      "GPN-AUTH not re-checked live since the 5 Dec 2025 capture (open question 10).",
      "GPN-eBOOKS was read from a 29 Sep 2026 capture; the eBook bookmarks and hyperlinks are not generated.",
    ],
  },
  FCFCOA: {
    version: V2,
    checkedAgainst: ["FCF-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["FCF-1"],
        "cl 5.8",
        "The report replaces the MNC; the MNC is for unreported judgments only (register O-R6)."
      ),
      parallelOrder: notApplicable(),
      reportedCaseMnc: mncOmitted(["FCF-1"], "cl 5.8"),
      pinpointStyle: official(["FCF-1"], "cl 5.8"),
      authorisedReportHierarchy: unsourced(
        "FamCAFC removed: it is an MNC identifier, not a report series (register O-R6). The order of the remaining series is not checked against FAM-APPEALS.",
        ["FCF-1"]
      ),
      loaType: official(["FCF-1"], "cl 5.8"),
    },
    exceptions: ["No FCFCOA documents were sampled (AustLII challenge not bypassed)."],
  },

  // ── New South Wales ─────────────────────────────────────────────────────
  NSWCA: {
    version: V4,
    checkedAgainst: ["NSW-1", "NSW-2"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["NSW-1"],
        "cl 4",
        "“should, as far as possible, also be noted”."
      ),
      parallelOrder: REPORT_FIRST_NSW,
      pinpointStyle: official(["NSW-1"], "cl 4"),
      authorisedReportHierarchy: official(["NSW-1"], "cl 3"),
      loaType: official(
        ["NSW-2"],
        "cl 37",
        "Four categories: legislation with its version date; cases from which passages will be read (CLR and NSWLR, at most 10 without leave; up to five from other reports; other cases); cases cited but not read; secondary sources (register O-R12)."
      ),
    },
    exceptions: [
      "Report-plus-paragraph pinpoint form is open (DECISION-043 item 5).",
      "Record locators (SC CA 1 cl 31) are not modelled (COURT-129).",
      "The party's name and contact details at the foot of the list (SC CA 1 cl 38) are not generated.",
    ],
  },
  NSWCCA: {
    version: V2,
    checkedAgainst: ["NSW-1", "NSW-3"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["NSW-1"],
        "cl 4",
        "“should, as far as possible, also be noted”."
      ),
      parallelOrder: REPORT_FIRST_NSW,
      pinpointStyle: official(["NSW-1"], "cl 4"),
      authorisedReportHierarchy: official(["NSW-1"], "cl 3"),
      unreportedGate: unsourced(
        "The warning follows the NSW Supreme Court preset. SC CCA 1 cl 28 treats an authority on Caselaw with an MNC as unreported and asks for a copy, but sets no test for citing it.",
        ["NSW-3"],
        "cl 28"
      ),
      loaType: {
        sourceIds: ["NSW-3"],
        clause: "cl 27",
        kind: "preference",
        checked: REGISTER_CHECKED,
        note: "A single list of only the authorities expected to be referred to in oral argument; a simple list until its layout is added (COURT-117).",
      },
    },
    exceptions: [
      "SC CCA 1 cl 21(f) cites “Betts v The Queen [2016] HCA 25; 258 CLR 420 at [2]” (MNC first, “at”); the NSW order stays report first under DECISION-043 item 3 pending an owner decision.",
      "Report-plus-paragraph pinpoint form is open (DECISION-043 item 5).",
      "SC CCA 1 is a scan; it was re-read against the court's PDF on 6 Oct 2026. The owner's eye check (open question 12) is still pending.",
    ],
  },
  NSWSC: {
    version: V1,
    checkedAgainst: ["NSW-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["NSW-1"],
        "cl 4",
        "“should, as far as possible, also be noted”."
      ),
      parallelOrder: REPORT_FIRST_NSW,
      pinpointStyle: official(["NSW-1"], "cl 4"),
      authorisedReportHierarchy: official(["NSW-1"], "cl 3"),
    },
    exceptions: ["Report-plus-paragraph pinpoint form is open (DECISION-043 item 5)."],
  },
  NSW_DISTRICT_LOCAL: {
    version: V1,
    checkedAgainst: [],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: noInstrument(
        ["NSW-4"],
        "No instrument found; AGLC4 fallback. No District or Local Court citation instrument was found (register O-R18); the value follows the NSW Supreme Court preset."
      ),
      parallelOrder: REPORT_FIRST_NSW,
      pinpointStyle: noInstrument(
        ["NSW-4"],
        "No instrument found; AGLC4 fallback (register O-R18)."
      ),
      authorisedReportHierarchy: noInstrument(
        ["NSW-4"],
        "No instrument found; AGLC4 fallback (register O-R18)."
      ),
      unreportedGate: noInstrument(
        ["NSW-4"],
        "No instrument found; AGLC4 fallback (register O-R18)."
      ),
      loaType: noInstrument(["NSW-4"], "No instrument found; AGLC4 fallback (register O-R18)."),
    },
    exceptions: [
      "No instrument found; AGLC4 fallback. No citation instrument was found for the District or Local Court (register NSW-4).",
    ],
  },

  // ── Victoria ────────────────────────────────────────────────────────────
  VSCA: {
    version: V2,
    checkedAgainst: ["VIC-1", "VIC-2"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["VIC-1", "VIC-2"],
        "cl 5.2",
        "SC Gen 3 cl 5.2 and SC CA 3 cl 14.4: the report is cited instead of the unreported version (register O-R5)."
      ),
      parallelOrder: notApplicable(),
      reportedCaseMnc: mncOmitted(["VIC-1", "VIC-2"], "cl 5.2"),
      pinpointStyle: official(["VIC-1"], "cl 5.5", "Example: “(2023) 72 VR 394, 410 [60]”."),
      authorisedReportHierarchy: official(["VIC-1"], "cl 5.2"),
      loaType: official(["VIC-2"], "cl 14.1–14.2"),
    },
    exceptions: [
      "The amended-list mark-up and clean copy (cl 14.6) are not modelled; “None” under an empty part (cl 14.2) is.",
      "Record-locator wording in the 2026 reissue not yet re-read (open question 9).",
    ],
  },
  VSC: {
    version: V2,
    checkedAgainst: ["VIC-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["VIC-1"],
        "cl 5.2",
        "“that report must be included instead of the unreported version” (register O-R5)."
      ),
      parallelOrder: notApplicable(),
      reportedCaseMnc: mncOmitted(["VIC-1"], "cl 5.2"),
      pinpointStyle: official(["VIC-1"], "cl 5.5", "Example: “(2023) 72 VR 394, 410 [60]”."),
      authorisedReportHierarchy: official(["VIC-1"], "cl 5.2"),
    },
    exceptions: [],
  },
  VIC_COUNTY_MAG: {
    version: V1,
    checkedAgainst: [],
    reviewed: null,
    fields: allNotChecked(),
    exceptions: ["No County or Magistrates' Court instrument is in the evidence register."],
  },

  // ── Queensland ──────────────────────────────────────────────────────────
  QCA: {
    version: V1,
    checkedAgainst: ["QLD-1", "QLD-2"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["QLD-1"],
        "cl 3",
        "“should, as far as possible, also be noted”."
      ),
      pinpointStyle: official(["QLD-1"], "cl 4(a)–(b)"),
      authorisedReportHierarchy: official(["QLD-1"], "cl 3"),
      loaType: official(["QLD-2"], undefined, "Part A (relied on) and optional Part B."),
    },
    exceptions: ["Report-plus-paragraph pinpoint form is open (DECISION-043 item 5)."],
  },
  QSC: {
    version: V1,
    checkedAgainst: ["QLD-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["QLD-1"],
        "cl 3",
        "“should, as far as possible, also be noted”."
      ),
      pinpointStyle: official(["QLD-1"], "cl 4(a)–(b)"),
      authorisedReportHierarchy: official(["QLD-1"], "cl 3"),
    },
    exceptions: ["Report-plus-paragraph pinpoint form is open (DECISION-043 item 5)."],
  },
  QLD_DISTRICT_MAG: {
    version: V2,
    checkedAgainst: ["QLD-3"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["QLD-3"],
        "cl 3",
        "“should, as far as possible, also be noted” (register O-R11). Magistrates Court only."
      ),
      pinpointStyle: official(["QLD-3"]),
      authorisedReportHierarchy: official(["QLD-3"]),
    },
    exceptions: [
      "District Court: no instrument found; AGLC4 fallback. The values come from the Magistrates Court direction (register O-R18).",
    ],
  },

  // ── Other States/Territories ────────────────────────────────────────────
  WASC: {
    version: V4,
    checkedAgainst: ["WA-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(["WA-1"], "PD 2.1 cl 14; PD 8.2.2"),
      parallelOrder: official(
        ["WA-1"],
        "PD 8.2.2 cl 4",
        "Example: “Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15]”."
      ),
      pinpointStyle: official(["WA-1"], "PD 2.1 cl 7(a); PD 8.2.2"),
      authorisedReportHierarchy: official(["WA-1"], "PD 2.1 cl 14"),
      subsequentForm: official(
        ["WA-1"],
        "PD 2.1 cl 14",
        "Later references give the case name only, unless names are duplicated or popular. A case whose name is shared by another cited case keeps its short title."
      ),
      loaType: official(
        ["WA-1"],
        "PD 2.1 cl 11–13",
        "Cases and legislation listed separately and alphabetically; cases counsel intends to read from marked with an asterisk and the pages or paragraphs to be read; a statement when no case will be read."
      ),
    },
    exceptions: [
      "The popular-name exception to later references by case name (PD 2.1 cl 14) is not modelled; set the subsequent-reference form to short title where it applies.",
    ],
  },
  SASC: {
    version: V2,
    checkedAgainst: ["SA-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["SA-1"],
        "r 217.8(3)",
        "r 217.8(3) and r 101.8(4): the authorised report and the MNC (for a decision after 1997 available online) must both be given (register O-R7)."
      ),
      parallelOrder: REPORT_FIRST_SILENT(["SA-1"]),
      authorisedReportHierarchy: official(["SA-1"], "r 101.8(4)"),
      loaType: official(["SA-1"], "r 217.8; Form 91"),
    },
    exceptions: [
      "Hyperlink rules (r 217.8(4)–(10)) are not modelled (COURT-136).",
      "The MNC is required only for decisions after 1997; the validator does not yet check the year.",
    ],
  },
  SA_DISTRICT_MAG_CIVIL: {
    version: V2,
    checkedAgainst: ["SA-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["SA-1"],
        "r 101.8(4)",
        "The Uniform Civil Rules apply across the SA civil courts: the authorised report and the MNC (after 1997) must both be given (register O-R7)."
      ),
      parallelOrder: REPORT_FIRST_SILENT(["SA-1"]),
      authorisedReportHierarchy: official(["SA-1"], "r 101.8(4)"),
      loaType: official(["SA-1"], "r 217.8; Form 91", "Form 91 is the appeal list of authorities."),
    },
    exceptions: [
      "Hyperlink rules (r 217.8(4)–(10)) are not modelled (COURT-136).",
      "Criminal proceedings are outside the Uniform Civil Rules and are not covered.",
    ],
  },
  TASSC: {
    version: V2,
    checkedAgainst: ["TAS-1", "TAS-2"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(["TAS-1"], "cl 3(a), 3(d)"),
      parallelOrder: official(
        ["TAS-1", "DECISION-043"],
        "cl 3(a)",
        "Instrument example: “Jackson v Building Appeal Board [2010] TASSC 29; (2010) 20 Tas R 1” (register O-R8; DECISION-043 item 3)."
      ),
      pinpointStyle: official(["TAS-1"], "cl 3"),
      pinpointConnector: official(
        ["TAS-1"],
        "cl 3",
        "Instrument example: “[1997] TASSC 161 at [15]”."
      ),
      authorisedReportHierarchy: official(["TAS-1"], "cl 3"),
      unreportedGate: official(["TAS-1"], "cl 5"),
      loaType: official(["TAS-2"]),
    },
    exceptions: [
      "Paragraph pinpoints for reports with numbered paragraphs (cl 3) and page-and-line references in appeal submissions (PD 3 of 2022 cl 2.2.4) are not modelled.",
    ],
  },
  ACTSC: {
    version: V2,
    checkedAgainst: ["ACT-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["ACT-1"],
        "cl 3–4",
        "The authorised report “should be used”; the direction is silent on the MNC (register O-R10)."
      ),
      parallelOrder: notApplicable(),
      reportedCaseMnc: mncOmitted(["ACT-1"], "cl 3–4"),
      authorisedReportHierarchy: official(["ACT-1"], "cl 3–4"),
    },
    exceptions: [
      "PD 2 of 2022 is a scan; clauses 3 to 5 were re-read against the court's PDF on 6 Oct 2026. The owner's eye check (open question 12) is still pending.",
    ],
  },
  NTSC: {
    version: V2,
    checkedAgainst: ["NT-1", "NT-2"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(
        ["NT-1"],
        undefined,
        "The authorised report “is to be cited”; the direction does not mention the MNC (register O-R10)."
      ),
      parallelOrder: notApplicable(),
      reportedCaseMnc: mncOmitted(["NT-1"]),
      authorisedReportHierarchy: official(["NT-1"]),
      loaType: unsourced("The list format is in Supreme Court Rules r 82.10, which was not read.", [
        "NT-2",
      ]),
    },
    exceptions: ["List of Authorities format (r 82.10) not read (COURT-136)."],
  },

  // ── Tribunals ───────────────────────────────────────────────────────────
  ART: {
    version: V1,
    checkedAgainst: [],
    reviewed: null,
    fields: allNotChecked(),
    exceptions: ["No tribunal instrument is in the evidence register."],
  },
  FWC: {
    version: V1,
    checkedAgainst: [],
    reviewed: null,
    fields: allNotChecked(),
    exceptions: ["No tribunal instrument is in the evidence register."],
  },
  STATE_TRIBUNAL: {
    version: V1,
    checkedAgainst: [],
    reviewed: null,
    fields: allNotChecked(),
    exceptions: ["No tribunal instrument is in the evidence register."],
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** COURT-106: the current preset data version for a jurisdiction. */
export function getPresetVersion(jurisdictionId: string): string | undefined {
  return COURT_PRESET_PROVENANCE[jurisdictionId as CourtJurisdiction]?.version;
}

/** COURT-115: provenance for one toggle of one preset. */
export function getFieldProvenance(
  jurisdictionId: string,
  key: CourtToggleKey
): FieldProvenance | undefined {
  return COURT_PRESET_PROVENANCE[jurisdictionId as CourtJurisdiction]?.fields[key];
}

/**
 * B3 / COURT-110: a court instrument that shows a paragraph-only pinpoint
 * (no page) for the profile's citation form.
 */
export interface ParagraphPinpointEvidence {
  /** Register source id (developer reference). */
  sourceId: string;
  /** The profile's name as shown to the user. */
  profileName: string;
  /** Short instrument name as shown to the user. */
  instrument: string;
  clause: string;
  /** The instrument's own example, quoted. */
  example: string;
}

/**
 * Profiles whose instrument shows a paragraph-only pinpoint. Only courts
 * with register evidence are listed; every other profile keeps the AGLC4
 * r 2.2.5 warning (a page must appear in a report pinpoint).
 *
 * FCA: GPN-AUTH (7 May 2025, register FCA-1) cl 2.6 prefers paragraph
 * pinpoints ("at [29]") and uses a page only where there are no paragraphs
 * ("at 481"); cl 2.4 makes MNC paragraph references sufficient (register
 * R02 §3, O-R2).
 */
const PARAGRAPH_PINPOINT_EVIDENCE: Partial<Record<CourtJurisdiction, ParagraphPinpointEvidence>> = {
  FCA: {
    sourceId: "FCA-1",
    profileName: "Federal Court",
    instrument: "FCA GPN-AUTH",
    clause: "cl 2.6",
    example: "“at [29]”",
  },
};

/** B3: the paragraph-only pinpoint evidence for a profile, if any. */
export function getParagraphPinpointEvidence(
  jurisdictionId: string
): ParagraphPinpointEvidence | undefined {
  return PARAGRAPH_PINPOINT_EVIDENCE[jurisdictionId as CourtJurisdiction];
}

/** Human-readable label for a provenance kind (UI and docs). */
export const PROVENANCE_KIND_LABELS: Record<ProvenanceKind, string> = {
  official: "Court instrument",
  observed: "Observed practice",
  preference: "Obiter default",
  unsourced: "No supporting source",
};

/**
 * COURT-115: the experimental label every court shows.
 *
 * "Experimental: checked against <instrument> on <date>; not endorsed by
 * the court." Courts with no instrument in the register say so instead.
 */
export function experimentalLabel(jurisdictionId: string): string {
  const prov = COURT_PRESET_PROVENANCE[jurisdictionId as CourtJurisdiction];
  if (!prov || prov.checkedAgainst.length === 0 || !prov.reviewed) {
    return "Experimental: not checked against a court instrument (none found); not endorsed by the court.";
  }
  const titles = prov.checkedAgainst
    .map((id) => {
      const src = PROFILE_SOURCES[id];
      return src ? `${src.title} (${src.effective})` : id;
    })
    .join("; ");
  return `Experimental: checked against ${titles} on ${formatIsoDate(prov.reviewed)}; not endorsed by the court.`;
}

/** Format an ISO date (YYYY-MM-DD) as "6 Oct 2026". */
export function formatIsoDate(iso: string): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}
