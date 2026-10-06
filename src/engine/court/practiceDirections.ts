/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-GUIDE-002: Practice Direction Source Links
 *
 * Curated database of links to current practice directions for each
 * Australian court and tribunal jurisdiction. Each entry includes the
 * governing court, the practice direction name, a direct URL, and the
 * date the link was last verified.
 *
 * Stored as typed data so links can be updated without code changes.
 * Links open in the user's default browser via Office.js or window.open.
 */

/**
 * COURT-114: what the last check of a link found.
 *
 * - "ok" — the URL resolved to the instrument (or the page that carries it).
 * - "index" — no stable direct link was found; the URL is the court's
 *   practice-direction index, which lists the instrument.
 * - "bot-challenge" — the site refuses automated checks (Cloudflare 403);
 *   the content was read from an Internet Archive capture (see `note`).
 * - "not-located" — no working page was found; `url` is the nearest
 *   working page and `note` says so.
 */
export type LinkStatus = "ok" | "index" | "bot-challenge" | "not-located";

export interface PracticeDirectionLink {
  /** Jurisdiction key: always a COURT-002 preset id (COURT-114). */
  jurisdiction: string;
  /** Human-readable name of the practice direction or practice note. */
  name: string;
  /** Direct URL to the practice direction on the court's website. */
  url: string;
  /**
   * ISO date the link was last checked and resolved, or null when it has
   * never been checked directly (COURT-114: set only for links actually
   * re-checked).
   */
  lastVerified: string | null;
  /** COURT-114: the result of the last check; absent reads as "ok". */
  status?: LinkStatus;
  /** COURT-114: why a link is an index, blocked or not located. */
  note?: string;
  /**
   * COURT-114: text the page is expected to contain (eg a version date),
   * reported by `npm run check-court-links` when it is missing.
   */
  expectText?: string;
  /** Evidence-register id of the instrument (docs/research/court-interop). */
  registerId?: string;
}

/** Date the links marked with it were re-checked (COURT-114). */
const CHECKED_2026_10_06 = "2026-10-06";

/** Note for sites that refuse automated checks. */
const BOT_NOTE =
  "The court's site refuses automated checks; the text was read from an Internet Archive capture (evidence register).";

/** COURT-114: Queensland Courts practice-direction index (re-checked 6 Oct 2026). */
const QLD_PD_INDEX =
  "https://www.courts.qld.gov.au/going-to-court/court-resources/practice-directions";

/** COURT-114: WA SC Consolidated Practice Directions page. */
const WA_CPD = "https://www.supremecourt.wa.gov.au/C/consolidated_practice_directions.aspx";

/** COURT-114: NSW SC generative AI page, which carries Practice Note SC Gen 23. */
const NSW_GENAI =
  "https://supremecourt.nsw.gov.au/practice-procedure/generative-artificial-intelligence.html";

/** COURT-114: Vic SC practice-notes index (the old /law-and-practice path redirects here). */
const VIC_PN_INDEX = "https://www.supremecourt.vic.gov.au/areas/legal-resources/practice-notes";

/** COURT-114: SA guidelines on generative AI in litigation (24 Dec 2025). */
const SA_GENAI =
  "https://www.courts.sa.gov.au/2025/12/24/guidelines-concerning-the-use-of-generative-artificial-intelligence-in-litigation-in-south-australian-courts/";

/** COURT-114: FCFCOA practice direction on artificial intelligence. */
const FCFCOA_PD_AI = "https://www.fcfcoa.gov.au/pd/pd-ai";

/** COURT-114: NSW District and Local Court practice-note indexes (register NSW-4). */
const NSW_DC_INDEX =
  "https://districtcourt.nsw.gov.au/practice-procedures-publications/practice-and-procedure/practice-notes.html";
const NSW_LC_INDEX = "https://localcourt.nsw.gov.au/practice-publications/practice-notes.html";

/** COURT-114: QCAT Practice Direction 10 of 2025 (PDF). */
const QCAT_PD_10 =
  "https://www.qcat.qld.gov.au/__data/assets/pdf_file/0006/884940/qcat-practice-direction-10-of-2025-accuracy-of-references-in-submissions.pdf";

/**
 * Curated practice direction links, ordered by court hierarchy.
 *
 * Source: COURT-GUIDE-002 acceptance criteria. COURT-114 (6 Oct 2026)
 * replaced the broken links with the URLs of the court-interop evidence
 * register (R02 §5) and re-checked each one; `lastVerified` is the date of
 * the last check that reached the page.
 */
export const PRACTICE_DIRECTION_LINKS: PracticeDirectionLink[] = [
  // ── Federal ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "HCA",
    name: "Practice Direction No 2 of 2024 — Joint Book of Authorities (20 December 2024)",
    url: "https://www.hcourt.gov.au/sites/default/files/assets/registry/practice-directions/Practice_Direction_No_2_of_2024__Joint_Book_of_Authorities_20_December_2024.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "HCA-1",
  },
  {
    jurisdiction: "HCA",
    name: "High Court practice directions (index)",
    url: "https://www.hcourt.gov.au/court-procedures/filing-documents/practice-direction",
    lastVerified: CHECKED_2026_10_06,
    status: "index",
    registerId: "HCA-2",
  },
  {
    jurisdiction: "FCA",
    name: "GPN-AUTH — Lists of Authorities and Citations Practice Note (reissued 7 May 2025)",
    url: "https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-auth",
    lastVerified: "2026-07-21",
    status: "bot-challenge",
    note: BOT_NOTE + " Capture of 5 Dec 2025.",
    registerId: "FCA-1",
  },
  {
    jurisdiction: "FCFCOA",
    name: "FAM-APPEALS — Family Law Practice Direction: Appeals (updated 10 June 2025)",
    url: "https://www.fcfcoa.gov.au/fl/pd/fam-appeals",
    lastVerified: CHECKED_2026_10_06,
    registerId: "FCF-1",
  },

  // ── New South Wales ────────────────────────────────────────────────────────
  {
    jurisdiction: "NSWCA",
    name: "SC Gen 20 — Citation of Authority (issued 12 Sep 2023, commenced 1 Oct 2023)",
    // CRIT-004 (2026-07-22): the supremecourt.justice.nsw.gov.au host was retired
    // (expired TLS cert); the live PN is on supremecourt.nsw.gov.au.
    url: "https://supremecourt.nsw.gov.au/practice-procedure/practice-notes0/general-practice-notes/sc-gen-20.html",
    lastVerified: CHECKED_2026_10_06,
    registerId: "NSW-1",
  },
  {
    // CRIT-004 §4 sign-off (2026-07-23): the List of Authorities is sourced
    // from the Court of Appeal note SC CA 1, not SC Gen 20. COURT-114: the
    // old HTML page is a 404; the PDF is the register's copy.
    jurisdiction: "NSWCA",
    name: "SC CA 1 — Court of Appeal (list of authorities, cl 37; commenced 8 May 2023)",
    url: "https://supremecourt.nsw.gov.au/documents/Practice-and-Procedure/Practice-Notes/court-of-appeal-practice-notes/current/2023_05_08_PN_SC_CA_1_-_Court_of_Appeal.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "NSW-2",
  },
  {
    jurisdiction: "NSWCCA",
    name: "SC Gen 20 — Citation of Authority (issued 12 Sep 2023, commenced 1 Oct 2023)",
    url: "https://supremecourt.nsw.gov.au/practice-procedure/practice-notes0/general-practice-notes/sc-gen-20.html",
    lastVerified: CHECKED_2026_10_06,
    registerId: "NSW-1",
  },
  {
    // COURT-119: register NSW-3.
    jurisdiction: "NSWCCA",
    name: "SC CCA 1 — Court of Criminal Appeal: General (list of authorities, cl 27–29; 22 July 2021)",
    url: "https://supremecourt.nsw.gov.au/documents/Practice-and-Procedure/Practice-Notes/cca-practice-notes/current/2021_07_22_SC_CCA_1_General.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "NSW-3",
  },
  {
    jurisdiction: "NSWSC",
    name: "SC Gen 20 — Citation of Authority (issued 12 Sep 2023, commenced 1 Oct 2023)",
    url: "https://supremecourt.nsw.gov.au/practice-procedure/practice-notes0/general-practice-notes/sc-gen-20.html",
    lastVerified: CHECKED_2026_10_06,
    registerId: "NSW-1",
  },
  {
    // COURT-119: no citation instrument found (register NSW-4, O-R18).
    jurisdiction: "NSW_DISTRICT_LOCAL",
    name: "District Court practice notes (index; no citation practice note found)",
    url: NSW_DC_INDEX,
    lastVerified: CHECKED_2026_10_06,
    status: "index",
    registerId: "NSW-4",
  },
  {
    jurisdiction: "NSW_DISTRICT_LOCAL",
    name: "Local Court practice notes (index; no citation practice note found)",
    url: NSW_LC_INDEX,
    lastVerified: CHECKED_2026_10_06,
    status: "index",
    registerId: "NSW-4",
  },

  // ── Victoria ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "VSCA",
    name: "SC Gen 3 — Citation of Authorities and Legislation (reissued 1 December 2025)",
    url: "https://www.supremecourt.vic.gov.au/sites/default/files/2026-03/SC%20Gen%203%20-%20citation%20of%20authorities%20and%20legislation.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "VIC-1",
  },
  {
    jurisdiction: "VSCA",
    name: "SC CA 3 — Civil Applications and Appeals, third revision (lists of authorities cl 14; reissued 10 March 2026)",
    url: "https://www.supremecourt.vic.gov.au/areas/legal-resources/practice-notes/sc-ca-3-civil-applications-and-appeals-third-revision",
    lastVerified: CHECKED_2026_10_06,
    registerId: "VIC-2",
  },
  {
    jurisdiction: "VSC",
    name: "SC Gen 3 — Citation of Authorities and Legislation (reissued 1 December 2025)",
    url: "https://www.supremecourt.vic.gov.au/sites/default/files/2026-03/SC%20Gen%203%20-%20citation%20of%20authorities%20and%20legislation.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "VIC-1",
  },

  // ── Queensland ─────────────────────────────────────────────────────────────
  {
    jurisdiction: "QCA",
    name: "PD 1 of 2024 — Citation of Authority (commenced 29 January 2024)",
    url: "https://www.courts.qld.gov.au/__data/assets/pdf_file/0007/786697/scpd-01-of-2024.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "QLD-1",
  },
  {
    jurisdiction: "QCA",
    name: "PD 3 of 2013 — Court of Appeal (Part A / Part B list of authorities)",
    url: "https://www.courts.qld.gov.au/__data/assets/pdf_file/0003/177456/sc-pd3of2013.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "QLD-2",
  },
  {
    jurisdiction: "QSC",
    name: "PD 1 of 2024 — Citation of Authority (commenced 29 January 2024)",
    url: "https://www.courts.qld.gov.au/__data/assets/pdf_file/0007/786697/scpd-01-of-2024.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "QLD-1",
  },
  {
    // COURT-114: key unified with the preset id (was "QLD_DIST_MAG").
    jurisdiction: "QLD_DISTRICT_MAG",
    name: "Magistrates Courts PD 7 of 2024 — Citation of Authority (7 June 2024)",
    url: "https://www.courts.qld.gov.au/__data/assets/pdf_file/0005/800915/mcpd-07-of-2024.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "QLD-3",
  },

  // ── Western Australia ──────────────────────────────────────────────────────
  {
    jurisdiction: "WASC",
    name: "Consolidated Practice Directions (updated 23 September 2026) — PD 2.1 Outlines and Lists of Authorities; PD 8.2.2 Medium Neutral Citation",
    url: WA_CPD,
    lastVerified: CHECKED_2026_10_06,
    expectText: "as at 25 September 2026",
    registerId: "WA-1",
  },

  // ── South Australia ────────────────────────────────────────────────────────
  {
    jurisdiction: "SASC",
    name: "Uniform Civil Rules 2020 rr 101.8, 217.8 — citation and lists of authorities (Form 91; current to 15 March 2026)",
    url: "https://www.courts.sa.gov.au/wp-content/uploads/wp-download-manager-files/court-rules/08-uniform-civil-rules/Uniform%20Civil%20Rules%202020.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "SA-1",
  },
  {
    // COURT-119: the Uniform Civil Rules apply to the District and
    // Magistrates Courts' civil jurisdictions too (register SA-1).
    jurisdiction: "SA_DISTRICT_MAG_CIVIL",
    name: "Uniform Civil Rules 2020 rr 101.8, 217.8 — citation and lists of authorities (Form 91; current to 15 March 2026)",
    url: "https://www.courts.sa.gov.au/wp-content/uploads/wp-download-manager-files/court-rules/08-uniform-civil-rules/Uniform%20Civil%20Rules%202020.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "SA-1",
  },

  // ── Tasmania ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "TASSC",
    name: "PD 3 of 2014 — Citation of Judgments (21 February 2014)",
    url: "https://supremecourt.tas.gov.au/wp-content/uploads/2018/11/Practice_Direction_3_of_2014_-_Citation_of_Judgments_.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "TAS-1",
  },
  {
    jurisdiction: "TASSC",
    name: "PD 3 of 2022 — Appeal Books, Lists of Authorities and Written Submissions (24 August 2022)",
    url: "https://www.supremecourt.tas.gov.au/wp-content/uploads/2022/08/3-of-2022-Practice-Direction-Appeal-Books-Lists-of-Authorities-Written-Submissions.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "TAS-2",
  },

  // ── Australian Capital Territory ───────────────────────────────────────────
  {
    jurisdiction: "ACTSC",
    name: "PD 2 of 2022 — Citation of Authority (26 May 2022)",
    url: "https://www.courts.act.gov.au/__data/assets/pdf_file/0006/2008356/2a13102c6f1ab879a79145619cec0cb3abf2241d.pdf",
    lastVerified: CHECKED_2026_10_06,
    registerId: "ACT-1",
  },

  // ── Northern Territory ─────────────────────────────────────────────────────
  {
    // COURT-114: title corrected (was "Citation of Unreported Cases").
    jurisdiction: "NTSC",
    name: "PD 2 of 2007 — Citation of Authorities (25 May 2007)",
    url: "https://supremecourt.nt.gov.au/_resources/documents/lawyers/practice-directions/citation-of-authorities-2-of-2007.pdf",
    lastVerified: null,
    status: "bot-challenge",
    note: BOT_NOTE + " Capture of 18 Nov 2025.",
    registerId: "NT-1",
  },
  {
    jurisdiction: "NTSC",
    name: "PD 1 of 2025 — Lists of Authorities and Summaries of Submissions (1 January 2025)",
    url: "https://supremecourt.nt.gov.au/_resources/documents/lawyers/practice-directions/practice-direction1of2025-lists-authorities-summaries-submissions.pdf",
    lastVerified: null,
    status: "bot-challenge",
    note: BOT_NOTE + " Capture of 18 Nov 2025.",
    registerId: "NT-2",
  },

  // ── Tribunals ──────────────────────────────────────────────────────────────
  {
    jurisdiction: "ART",
    name: "Administrative Review Tribunal — Practice Directions and Other Guidance",
    // A5-CM-4: the old /practice-directions path returned 404 on 2026-09-24.
    url: "https://www.art.gov.au/help-and-resources/professionals-and-practitioners/practice-directions-and-other-guidance",
    lastVerified: CHECKED_2026_10_06,
  },
  {
    // COURT-114: the old /disputes-at-work/... path is a 404.
    jurisdiction: "FWC",
    name: "Fair Work Commission — Practice Notes",
    url: "https://www.fwc.gov.au/hearings-decisions/practice-notes",
    lastVerified: CHECKED_2026_10_06,
    status: "index",
  },
];

/**
 * Retrieve all practice direction links for a given jurisdiction key.
 * Returns an empty array when no links are registered for the jurisdiction.
 */
export function getPracticeDirectionsForJurisdiction(
  jurisdictionId: string
): PracticeDirectionLink[] {
  return PRACTICE_DIRECTION_LINKS.filter((pd) => pd.jurisdiction === jurisdictionId);
}

/**
 * Retrieve all practice direction links across every jurisdiction.
 */
export function getAllPracticeDirections(): PracticeDirectionLink[] {
  return PRACTICE_DIRECTION_LINKS;
}

// ─────────────────────────────────────────────────────────────────────────────
// A5-CM-1: Court-mode AI-use reminders (practice-direction sourced)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * COURT-MODE / A5-CM-1: Jurisdiction-keyed generative-AI use reminders.
 *
 * IMPORTANT — these are **court-mode, practice-direction guidance**, NOT AGLC
 * citation rules. They surface the disclosure/verification obligations that
 * Australian courts imposed on the use of generative AI in litigation
 * (2024–2026). They must always be labelled as practice-direction guidance and
 * never presented as an AGLC4 citation rule (the guide has no AI rule).
 *
 * Two instrument families emerged (feedback package Part B.3 / CRIT-004):
 *
 * - **Family 1 — accuracy/verification.** A named human must verify the
 *   accuracy of every cited authority and legislation reference; no general
 *   disclosure mandate. (Qld, SA.)
 * - **Family 2 — disclosure + restriction.** The accuracy/verification duty
 *   PLUS disclosure duties and warnings that generative AI must not draft
 *   affidavit / witness / character content, and that AI cannot be used to
 *   verify other AI output. (NSW, Vic, Federal Court, FCFCOA, WA.)
 *
 * Each reminder cites its governing instrument (name, date, link). The
 * instruments themselves are also registered in AI_PRACTICE_DIRECTION_LINKS
 * with lastVerified "2026-07-23".
 */
export type AiReminderFamily = "accuracy-verification" | "disclosure-restriction";

/** A single AI-use instrument citation (name, date, link). */
export interface AiInstrument {
  /** Human-readable instrument name (practice note / practice direction). */
  name: string;
  /** Commencement / issue date as published. */
  date: string;
  /** Direct URL to the instrument on the court's website. */
  url: string;
  /** COURT-114: set when `url` is an index or the nearest page, not the instrument. */
  linkNote?: string;
}

/** A jurisdiction-keyed AI-use reminder sourced from court practice directions. */
export interface AiUseReminder {
  /** Jurisdiction key matching the COURT-002 jurisdictional preset IDs. */
  jurisdiction: string;
  /** Instrument family: accuracy/verification vs disclosure + restriction. */
  family: AiReminderFamily;
  /**
   * Short label for the family, shown as court-mode guidance. Never an AGLC
   * citation rule.
   */
  label: string;
  /**
   * The reminder text surfaced in court mode. Family 1 carries the accuracy
   * reminder; Family 2 carries the accuracy reminder PLUS disclosure and
   * affidavit/witness-content warnings.
   */
  reminder: string;
  /** The governing AI instrument(s) for this jurisdiction (name, date, link). */
  instruments: AiInstrument[];
  /** ISO date string when the instrument links were last verified. */
  lastVerified: string;
}

/** Shared accuracy/verification reminder text (Family 1 base; also in Family 2). */
const ACCURACY_REMINDER =
  "Court-mode guidance (practice direction, not an AGLC rule): a named " +
  "practitioner must verify the accuracy of every authority and legislation " +
  "reference before filing. Courts may refer citations of non-existent " +
  "authorities to the relevant legal-services regulator and make personal " +
  "costs orders.";

/**
 * Additional Family 2 obligations: disclosure duties plus affidavit/witness-
 * content restrictions on generative AI.
 */
const DISCLOSURE_RESTRICTION_ADDENDUM =
  " In addition, disclosure of the use of generative AI may be required, that " +
  "verification cannot itself be performed by AI (one AI tool cannot confirm " +
  "another's output), and generative AI must not be used to draft the content " +
  "of affidavits, witness statements or character references.";

/** Family 2 reminder = accuracy reminder + disclosure/restriction addendum. */
const DISCLOSURE_RESTRICTION_REMINDER = ACCURACY_REMINDER + DISCLOSURE_RESTRICTION_ADDENDUM;

const FAMILY_LABELS: Record<AiReminderFamily, string> = {
  "accuracy-verification": "Court-mode AI reminder — accuracy / verification",
  "disclosure-restriction": "Court-mode AI reminder — disclosure + restriction",
};

/** A5-CM-4: the ART generative AI practice direction (PDF). */
const ART_GENAI_PD_URL =
  "https://www.art.gov.au/sites/default/files/2026-08/Administrative%20Review%20Tribunal%20(Generative%20AI)%20Practice%20Direction.pdf";

/** A5-CM-5: the ART expert evidence practice direction (PDF, compiled 20 Aug 2026). */
const ART_EXPERT_EVIDENCE_PD_URL =
  "https://www.art.gov.au/sites/default/files/2024-12/Administrative%20Review%20Tribunal%20%28Expert%20Evidence%29%20Practice%20Direction.pdf";

/**
 * AI-use practice-direction instruments, registered as source links.
 * Each carries lastVerified "2026-07-23" per A5-CM-1.
 */
export const AI_PRACTICE_DIRECTION_LINKS: PracticeDirectionLink[] = [
  // ── Queensland (Family 1) ──────────────────────────────────────────────
  // COURT-114: the old courts.qld.gov.au/court-users/... paths are 404s; no
  // direct link to these directions was located, so each points to the
  // Queensland Courts practice-direction index.
  {
    jurisdiction: "QSC",
    name: "Supreme Court PD 5 of 2025 — Use of Generative AI (24 Sep 2025)",
    url: QLD_PD_INDEX,
    lastVerified: CHECKED_2026_10_06,
    status: "index",
    note: "Direct link not located; the index lists the court's practice directions.",
  },
  {
    // Preset ID QLD_DISTRICT_MAG. The Planning and Environment Court and QCAT
    // instruments are grouped here (Family 1) as they lack their own preset.
    jurisdiction: "QLD_DISTRICT_MAG",
    name: "District Court PD 12 of 2025 — Use of Generative AI",
    url: QLD_PD_INDEX,
    lastVerified: CHECKED_2026_10_06,
    status: "index",
    note: "Direct link not located; the index lists the court's practice directions.",
  },
  {
    jurisdiction: "QLD_DISTRICT_MAG",
    name: "Planning and Environment Court PD 7 of 2025 — Use of Generative AI",
    url: QLD_PD_INDEX,
    lastVerified: CHECKED_2026_10_06,
    status: "index",
    note: "Direct link not located; the index lists the court's practice directions.",
  },
  {
    // COURT-114: the instrument's own title (it was listed as "Use of
    // Generative AI").
    jurisdiction: "STATE_TRIBUNAL",
    name: "QCAT PD 10 of 2025 — Accuracy of references in submissions",
    url: QCAT_PD_10,
    lastVerified: CHECKED_2026_10_06,
  },
  // ── South Australia (Family 1) ─────────────────────────────────────────
  {
    jurisdiction: "SASC",
    name: "Guidelines concerning the use of generative AI in litigation in South Australian courts (24 Dec 2025)",
    url: SA_GENAI,
    lastVerified: CHECKED_2026_10_06,
  },
  // ── New South Wales (Family 2) ─────────────────────────────────────────
  // COURT-114: the sc-gen-23.html page is a 404; the Court's generative AI
  // page carries Practice Note SC Gen 23.
  {
    jurisdiction: "NSWSC",
    name: "PN SC Gen 23 — Use of Generative AI (commenced 3 Feb 2025); UCPR Amendment No 104 of 2025 (rr 31.4(3A)–(3C), 35.3B)",
    url: NSW_GENAI,
    lastVerified: CHECKED_2026_10_06,
  },
  {
    jurisdiction: "NSWCA",
    name: "PN SC Gen 23 — Use of Generative AI (commenced 3 Feb 2025)",
    url: NSW_GENAI,
    lastVerified: CHECKED_2026_10_06,
  },
  {
    jurisdiction: "NSWCCA",
    name: "PN SC Gen 23 — Use of Generative AI (commenced 3 Feb 2025)",
    url: NSW_GENAI,
    lastVerified: CHECKED_2026_10_06,
  },
  {
    jurisdiction: "NSW_DISTRICT_LOCAL",
    name: "District Court GPN (2 Feb 2025); Local Court PN (commenced 12 Jan 2026); Land and Environment Court, NCAT PD 7, PIC PD 13",
    url: NSW_DC_INDEX,
    lastVerified: CHECKED_2026_10_06,
    status: "index",
  },
  // ── Victoria (Family 2) ────────────────────────────────────────────────
  // A5-CM-3: the Supreme Court's May 2024 AI guidelines are SUPERSEDED by
  // PN SC Gen 25 (commenced 14 May 2026). The County Court's 2024 guidelines
  // remain current and are a separate entry (VIC_COUNTY_MAG).
  {
    jurisdiction: "VSC",
    name: "PN SC Gen 25 — Use of Generative AI (commenced 14 May 2026, replacing the May 2024 guidelines)",
    url: VIC_PN_INDEX,
    lastVerified: CHECKED_2026_10_06,
    status: "index",
  },
  {
    jurisdiction: "VSCA",
    name: "PN SC Gen 25 — Use of Generative AI (commenced 14 May 2026, replacing the May 2024 guidelines)",
    url: VIC_PN_INDEX,
    lastVerified: CHECKED_2026_10_06,
    status: "index",
  },
  {
    jurisdiction: "VIC_COUNTY_MAG",
    name: "County Court of Victoria — Guidelines on the Use of Generative AI (2024, current)",
    url: "https://www.countycourt.vic.gov.au/about-us/practice-notes",
    lastVerified: CHECKED_2026_10_06,
    status: "index",
  },
  // ── Federal Court (Family 2) ───────────────────────────────────────────
  {
    jurisdiction: "FCA",
    name: "GPN-AI — Use of Generative Artificial Intelligence (16 Apr 2026)",
    url: "https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-ai",
    lastVerified: "2026-07-23",
    status: "bot-challenge",
    note: "The court's site refuses automated checks.",
  },
  // ── FCFCOA (Family 2) ──────────────────────────────────────────────────
  {
    jurisdiction: "FCFCOA",
    name: "PD-AI — Use of Artificial Intelligence (May 2026)",
    url: FCFCOA_PD_AI,
    lastVerified: CHECKED_2026_10_06,
  },
  // ── Administrative Review Tribunal (Family 2) ──────────────────────────
  // A5-CM-4: signed 20 Aug 2026, adapted from FCA GPN-AI; verified 2026-09-24.
  {
    jurisdiction: "ART",
    name: "Administrative Review Tribunal (Use of Generative AI) Practice Direction 2026 (signed 20 Aug 2026)",
    url: ART_GENAI_PD_URL,
    lastVerified: "2026-09-24",
  },
  {
    // A5-CM-5: cll 3.5A–3.5D (added by Amendment 1 of 2026, 20 Aug 2026)
    // require an expert report to state whether it contains AI content,
    // identify it and the tools used, and certify that it was checked.
    jurisdiction: "ART",
    name: "Administrative Review Tribunal (Expert Evidence) Practice Direction 2026 (commenced 2 Mar 2026; AI clauses 3.5A–3.5D added 20 Aug 2026)",
    url: ART_EXPERT_EVIDENCE_PD_URL,
    lastVerified: "2026-09-25",
  },
  // ── Western Australia (Family 2) ───────────────────────────────────────
  {
    // COURT-114: now Consolidated Practice Direction 9.21 (inserted
    // 10 Dec 2025; register WA-1).
    jurisdiction: "WASC",
    name: "Consolidated Practice Direction 9.21 — Guidelines for the use of generative AI (inserted 10 Dec 2025)",
    url: WA_CPD,
    lastVerified: CHECKED_2026_10_06,
    registerId: "WA-1",
  },
];

/**
 * Jurisdiction-keyed AI-use reminders. Family 1 jurisdictions surface the
 * accuracy/verification reminder; Family 2 jurisdictions additionally surface
 * disclosure duties and affidavit/witness-content warnings.
 */
export const AI_USE_REMINDERS: AiUseReminder[] = [
  // ── Family 1 — accuracy / verification ─────────────────────────────────
  ...(
    [
      {
        jurisdiction: "QSC",
        instruments: [
          {
            name: "Supreme Court PD 5 of 2025 — Use of Generative AI",
            date: "24 September 2025",
            url: QLD_PD_INDEX,
            linkNote: "Direct link not located; Queensland Courts practice-direction index.",
          },
        ],
      },
      {
        jurisdiction: "QCA",
        instruments: [
          {
            name: "Supreme Court PD 5 of 2025 — Use of Generative AI",
            date: "24 September 2025",
            url: QLD_PD_INDEX,
            linkNote: "Direct link not located; Queensland Courts practice-direction index.",
          },
        ],
      },
      {
        // Preset ID QLD_DISTRICT_MAG covers the Qld District and Magistrates
        // courts; the P&E Court and QCAT AI instruments are carried here too
        // since they share the Family 1 accuracy/verification posture.
        jurisdiction: "QLD_DISTRICT_MAG",
        instruments: [
          {
            name: "District Court PD 12 of 2025 — Use of Generative AI",
            date: "2025",
            url: QLD_PD_INDEX,
            linkNote: "Direct link not located; Queensland Courts practice-direction index.",
          },
          {
            name: "Planning and Environment Court PD 7 of 2025 — Use of Generative AI",
            date: "2025",
            url: QLD_PD_INDEX,
            linkNote: "Direct link not located; Queensland Courts practice-direction index.",
          },
          {
            name: "QCAT PD 10 of 2025 — Accuracy of references in submissions",
            date: "2025",
            url: QCAT_PD_10,
          },
        ],
      },
      {
        jurisdiction: "SASC",
        instruments: [
          {
            name: "Guidelines concerning the use of generative AI in litigation in South Australian courts",
            date: "24 December 2025",
            url: SA_GENAI,
          },
        ],
      },
      {
        // COURT-119: the guidelines cover litigation in all South Australian
        // courts (their title), including the District and Magistrates Courts.
        jurisdiction: "SA_DISTRICT_MAG_CIVIL",
        instruments: [
          {
            name: "Guidelines concerning the use of generative AI in litigation in South Australian courts",
            date: "24 December 2025",
            url: SA_GENAI,
          },
        ],
      },
    ] as const
  ).map(
    (e): AiUseReminder => ({
      jurisdiction: e.jurisdiction,
      family: "accuracy-verification",
      label: FAMILY_LABELS["accuracy-verification"],
      reminder: ACCURACY_REMINDER,
      instruments: e.instruments.map((i) => ({ ...i })),
      lastVerified: "2026-07-23",
    })
  ),

  // ── Family 2 — disclosure + restriction ────────────────────────────────
  ...(
    [
      {
        jurisdiction: "NSWSC",
        instruments: [
          {
            name: "PN SC Gen 23 — Use of Generative AI",
            date: "commenced 3 February 2025",
            url: NSW_GENAI,
          },
          {
            name: "UCPR Amendment No 104 of 2025 (rr 31.4(3A)–(3C), 35.3B)",
            date: "2025",
            url: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2005-0418",
          },
        ],
      },
      {
        jurisdiction: "NSWCA",
        instruments: [
          {
            name: "PN SC Gen 23 — Use of Generative AI",
            date: "commenced 3 February 2025",
            url: NSW_GENAI,
          },
        ],
      },
      {
        jurisdiction: "NSWCCA",
        instruments: [
          {
            name: "PN SC Gen 23 — Use of Generative AI",
            date: "commenced 3 February 2025",
            url: NSW_GENAI,
          },
        ],
      },
      {
        jurisdiction: "NSW_DISTRICT_LOCAL",
        instruments: [
          {
            name: "District Court General Practice Note — Use of Generative AI",
            date: "2 February 2025",
            url: NSW_DC_INDEX,
            linkNote: "District Court practice-note index.",
          },
          {
            name: "Local Court Practice Note — Use of Generative AI",
            date: "commenced 12 January 2026",
            url: NSW_LC_INDEX,
            linkNote: "Local Court practice-note index.",
          },
          {
            name: "NCAT PD 7; PIC PD 13; Land and Environment Court amendment",
            date: "2025–2026",
            url: "https://ncat.nsw.gov.au/",
            linkNote: "Link not located; NCAT home page.",
          },
        ],
      },
      {
        jurisdiction: "VSC",
        instruments: [
          {
            name: "PN SC Gen 25 — Use of Generative AI",
            date: "commenced 14 May 2026",
            url: VIC_PN_INDEX,
          },
        ],
      },
      {
        jurisdiction: "VSCA",
        instruments: [
          {
            name: "PN SC Gen 25 — Use of Generative AI",
            date: "commenced 14 May 2026",
            url: VIC_PN_INDEX,
          },
        ],
      },
      {
        // A5-CM-3: the County Court's 2024 guidelines remain current and are
        // kept as a separate entry (the Supreme Court's May 2024 guidelines
        // were superseded by PN SC Gen 25).
        jurisdiction: "VIC_COUNTY_MAG",
        instruments: [
          {
            name: "County Court of Victoria — Guidelines on the Use of Generative AI",
            date: "2024 (current)",
            url: "https://www.countycourt.vic.gov.au/about-us/practice-notes",
          },
        ],
      },
      {
        jurisdiction: "FCA",
        instruments: [
          {
            name: "GPN-AI — Use of Generative Artificial Intelligence",
            date: "16 April 2026",
            url: "https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-ai",
          },
        ],
      },
      {
        jurisdiction: "FCFCOA",
        instruments: [
          {
            name: "PD-AI — Use of Artificial Intelligence",
            date: "May 2026",
            url: FCFCOA_PD_AI,
          },
        ],
      },
      {
        jurisdiction: "WASC",
        instruments: [
          {
            name: "Consolidated Practice Direction 9.21 — Guidelines for the use of generative AI",
            date: "inserted 10 December 2025",
            url: WA_CPD,
          },
        ],
      },
    ] as const
  ).map(
    (e): AiUseReminder => ({
      jurisdiction: e.jurisdiction,
      family: "disclosure-restriction",
      label: FAMILY_LABELS["disclosure-restriction"],
      reminder: DISCLOSURE_RESTRICTION_REMINDER,
      instruments: e.instruments.map((i) => ({ ...i })),
      lastVerified: "2026-07-23",
    })
  ),

  // A5-CM-4: the ART practice direction (Family 2). It requires verification
  // of GenAI-assisted material (cl 2.4(d), 3.6), bars relying on a tool to
  // verify its own output (cl 2.4(f)), bars GenAI making up or changing a
  // person's evidence (cl 3.9) and requires disclosure where the Tribunal asks
  // and for evidentiary material (cll 2.4(c), 3.11–3.13).
  {
    jurisdiction: "ART",
    family: "disclosure-restriction",
    label: FAMILY_LABELS["disclosure-restriction"],
    reminder: DISCLOSURE_RESTRICTION_REMINDER,
    instruments: [
      {
        name: "Administrative Review Tribunal (Use of Generative AI) Practice Direction 2026",
        date: "signed and commenced 20 August 2026",
        url: ART_GENAI_PD_URL,
      },
      {
        // A5-CM-5: expert reports must disclose, identify and certify AI
        // content (cll 3.5A–3.5D).
        name: "Administrative Review Tribunal (Expert Evidence) Practice Direction 2026, cll 3.5A–3.5D",
        date: "AI clauses in force 20 August 2026",
        url: ART_EXPERT_EVIDENCE_PD_URL,
      },
    ],
    lastVerified: "2026-09-24",
  },
];

/**
 * Retrieve the AI-use reminder for a given jurisdiction key, or undefined
 * when the jurisdiction has no registered AI instrument.
 *
 * Court mode surfaces this as practice-direction guidance — never as an AGLC
 * citation rule.
 */
export function getAiUseReminderForJurisdiction(jurisdictionId: string): AiUseReminder | undefined {
  return AI_USE_REMINDERS.find((r) => r.jurisdiction === jurisdictionId);
}

/** Retrieve all AI-use reminders across every jurisdiction. */
export function getAllAiUseReminders(): AiUseReminder[] {
  return AI_USE_REMINDERS;
}
