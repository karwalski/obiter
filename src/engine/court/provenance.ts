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
  | "pinpointStyle"
  | "pinpointConnector"
  | "authorisedReportHierarchy"
  | "unreportedGate"
  | "ibidSuppression"
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

/** Report-first where the instrument is silent (DECISION-043 item 3). */
const REPORT_FIRST_DEFAULT: FieldProvenance = {
  sourceIds: ["DECISION-043"],
  clause: "item 3",
  kind: "preference",
  checked: REGISTER_CHECKED,
  note: "Instrument silent on order; report first by default (DECISION-043 item 3).",
};

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

/** Every field not checked; used as the base for courts with no instrument. */
function allNotChecked(): Record<CourtToggleKey, FieldProvenance> {
  return {
    parallelCitations: notChecked(),
    parallelOrder: REPORT_FIRST_DEFAULT,
    pinpointStyle: notChecked(),
    pinpointConnector: AGLC_CONNECTOR,
    authorisedReportHierarchy: notChecked(),
    unreportedGate: notChecked(),
    ibidSuppression: IBID,
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
    version: V1,
    checkedAgainst: ["HCA-1", "HCA-2"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: unsourced(
        "HCA instruments are silent on parallel citation (register O-R4); value under review (open question Q3).",
        ["HCA-1", "HCA-2"]
      ),
      authorisedReportHierarchy: official(["HCA-1", "HCA-2"], "JBA Part C; Form 27A Part IV"),
      loaType: unsourced(
        "PD 2 of 2024 requires a five-part Joint Book of Authorities (Parts A to E), not Part A / Part B (register O-R3; COURT-117).",
        ["HCA-1"]
      ),
    },
    exceptions: [
      "Joint Book of Authorities Parts A to E and the legislation-version column are not modelled (COURT-117, COURT-118).",
    ],
  },
  FCA: {
    version: V1,
    checkedAgainst: ["FCA-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(["FCA-1"], "cl 2.4–2.5"),
      parallelOrder: unsourced(
        "GPN-AUTH cl 2.5 gives the MNC first (register O-R2); MNC-first is decided (DECISION-043 item 3) and pending COURT-111.",
        ["FCA-1"],
        "cl 2.5"
      ),
      pinpointStyle: official(["FCA-1"], "cl 2.4, 2.6"),
      pinpointConnector: official(["FCA-1"], "cl 2.6", "Instrument example: “at [29]”, “at 481”."),
      authorisedReportHierarchy: official(["FCA-1"], "Annexure"),
      loaType: unsourced(
        "GPN-AUTH (7 May 2025) has no Part A / Part B list; the 2022 version did (register O-R1; COURT-111).",
        ["FCA-1"]
      ),
    },
    exceptions: [
      "GPN-AUTH not re-checked live since the 5 Dec 2025 capture (open question 10).",
      "GPN-eBOOKS eBook layout not modelled (COURT-117).",
    ],
  },
  FCFCOA: {
    version: V1,
    checkedAgainst: ["FCF-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: unsourced(
        "FAM-APPEALS cl 5.8: the report replaces the MNC; the MNC is for unreported cases only (register O-R6; COURT-111).",
        ["FCF-1"],
        "cl 5.8"
      ),
      pinpointStyle: official(["FCF-1"], "cl 5.8"),
      authorisedReportHierarchy: unsourced(
        "FamCAFC is an MNC identifier, not a report series (register O-R6; COURT-111).",
        ["FCF-1"]
      ),
      loaType: official(["FCF-1"], "cl 5.8"),
    },
    exceptions: ["No FCFCOA documents were sampled (AustLII challenge not bypassed)."],
  },

  // ── New South Wales ─────────────────────────────────────────────────────
  NSWCA: {
    version: V1,
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
      loaType: unsourced(
        "SC CA 1 cl 37 sets four categories (legislation with version date; cases read; cited not read; secondary), not Part A / Part B (register O-R12; COURT-117).",
        ["NSW-2"],
        "cl 37"
      ),
    },
    exceptions: [
      "Report-plus-paragraph pinpoint form is open (DECISION-043 item 5).",
      "Record locators (SC CA 1 cl 31) are not modelled (COURT-129).",
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
      parallelCitations: unsourced(
        "No District or Local Court citation instrument found (register O-R18); values follow the Supreme Court preset.",
        ["NSW-4"]
      ),
      parallelOrder: REPORT_FIRST_NSW,
    },
    exceptions: ["No citation instrument found for the District or Local Court (register NSW-4)."],
  },

  // ── Victoria ────────────────────────────────────────────────────────────
  VSCA: {
    version: V1,
    checkedAgainst: ["VIC-1", "VIC-2"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: unsourced(
        "SC Gen 3 cl 5.2 and SC CA 3 cl 14.4: the report is cited instead of the unreported version (register O-R5; COURT-111).",
        ["VIC-1", "VIC-2"],
        "cl 5.2"
      ),
      pinpointStyle: official(["VIC-1"], "cl 5.5", "Example: “(2023) 72 VR 394, 410 [60]”."),
      authorisedReportHierarchy: official(["VIC-1"], "cl 5.2"),
      loaType: official(["VIC-2"], "cl 14.1–14.2"),
    },
    exceptions: [
      "“None” under an empty part and the amended-list mark-up (cl 14.2, 14.6) are not modelled.",
      "Record-locator wording in the 2026 reissue not yet re-read (open question 9).",
    ],
  },
  VSC: {
    version: V1,
    checkedAgainst: ["VIC-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: unsourced(
        "SC Gen 3 cl 5.2: the report is cited instead of the unreported version (register O-R5; COURT-111).",
        ["VIC-1"],
        "cl 5.2"
      ),
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
    version: V1,
    checkedAgainst: ["QLD-3"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: unsourced(
        "Magistrates PD 7 of 2024 cl 3 says “should, as far as possible” (register O-R11; COURT-111).",
        ["QLD-3"],
        "cl 3"
      ),
      pinpointStyle: official(["QLD-3"]),
      authorisedReportHierarchy: official(["QLD-3"]),
    },
    exceptions: ["No District Court citation instrument found (register O-R18)."],
  },

  // ── Other States/Territories ────────────────────────────────────────────
  WASC: {
    version: V1,
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
      loaType: official(
        ["WA-1"],
        "PD 2.1 cl 11–13",
        "A simple list approximates the combined outline; cases to be read are marked as key authorities."
      ),
    },
    exceptions: [
      "Later references by case name only (PD 2.1 cl 14) are not modelled (COURT-113).",
      "WASCSR sentencing remarks are not recognised (COURT-119).",
    ],
  },
  SASC: {
    version: V1,
    checkedAgainst: ["SA-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: unsourced(
        "r 217.8(3) and r 101.8(4): the authorised report and the MNC (post-1997) must both be given (register O-R7; COURT-111).",
        ["SA-1"],
        "r 217.8(3)"
      ),
      authorisedReportHierarchy: official(["SA-1"], "r 101.8(4)"),
      loaType: official(["SA-1"], "r 217.8; Form 91"),
    },
    exceptions: [
      "Hyperlink rules (r 217.8(4)–(10)) are not modelled (COURT-136).",
      "SA District and Magistrates (civil) courts have no preset (COURT-119).",
    ],
  },
  TASSC: {
    version: V1,
    checkedAgainst: ["TAS-1", "TAS-2"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: official(["TAS-1"], "cl 3(a), 3(d)"),
      parallelOrder: unsourced(
        "PD 3 of 2014 cl 3(a) gives the MNC first (register O-R8); MNC-first is decided (DECISION-043 item 3) and pending COURT-111.",
        ["TAS-1"],
        "cl 3(a)"
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
    exceptions: ["Doubted or not-followed treatment (cl 3(f)) is not prompted (COURT-119)."],
  },
  ACTSC: {
    version: V1,
    checkedAgainst: ["ACT-1"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: unsourced(
        "PD 2 of 2022 requires the authorised report and is silent on the MNC (register O-R10; COURT-111).",
        ["ACT-1"]
      ),
      authorisedReportHierarchy: official(["ACT-1"], "cl 3–4"),
    },
    exceptions: ["PD 2 of 2022 was read by OCR (open question 12)."],
  },
  NTSC: {
    version: V1,
    checkedAgainst: ["NT-1", "NT-2"],
    reviewed: REGISTER_CHECKED,
    fields: {
      ...allNotChecked(),
      parallelCitations: unsourced(
        "PD 2 of 2007 requires the authorised report and does not mention the MNC (register O-R10; COURT-111).",
        ["NT-1"]
      ),
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
