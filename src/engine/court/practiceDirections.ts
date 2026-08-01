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

export interface PracticeDirectionLink {
  /** Jurisdiction key matching the COURT-002 jurisdictional preset IDs. */
  jurisdiction: string;
  /** Human-readable name of the practice direction or practice note. */
  name: string;
  /** Direct URL to the practice direction on the court's website. */
  url: string;
  /** ISO date string when the link was last manually verified. */
  lastVerified: string;
}

/**
 * Curated practice direction links, ordered by court hierarchy.
 *
 * Source: COURT-GUIDE-002 acceptance criteria.
 * Each URL points to the publicly available practice direction on the
 * court or tribunal's official website.
 */
export const PRACTICE_DIRECTION_LINKS: PracticeDirectionLink[] = [
  // ── Federal ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "HCA",
    name: "Practice Direction No 2 of 2024 — Joint Books of Authorities",
    url: "https://www.hcourt.gov.au/registry/practice-directions",
    lastVerified: "2026-07-21",
  },
  {
    jurisdiction: "FCA",
    name: "GPN-AUTH — Citation of Authorities and Provision of Lists of Authorities (reissued 7 May 2025)",
    url: "https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-auth",
    lastVerified: "2026-07-21",
  },
  {
    jurisdiction: "FCFCOA",
    name: "FAM-APPEALS — Appeals (updated 10 June 2025)",
    url: "https://www.fcfcoa.gov.au/practice-directions",
    lastVerified: "2026-07-21",
  },

  // ── New South Wales ────────────────────────────────────────────────────────
  {
    jurisdiction: "NSWCA",
    name: "SC Gen 20 — Citation of Authority (issued 12 Sep 2023, commenced 1 Oct 2023)",
    // CRIT-004 (2026-07-22): the supremecourt.justice.nsw.gov.au host was retired
    // (expired TLS cert); the live PN is on supremecourt.nsw.gov.au.
    url: "https://supremecourt.nsw.gov.au/practice-procedure/practice-notes0/general-practice-notes/sc-gen-20.html",
    lastVerified: "2026-07-22",
  },
  {
    // CRIT-004 §4 sign-off (2026-07-23): the Part A/B List of Authorities is
    // sourced from the Court of Appeal note SC CA 1, not SC Gen 20.
    jurisdiction: "NSWCA",
    name: "SC CA 1 — Court of Appeal (Part A/B List of Authorities)",
    url: "https://supremecourt.nsw.gov.au/practice-procedure/practice-notes0/court-of-appeal-practice-notes/sc-ca-1.html",
    lastVerified: "2026-07-23",
  },
  {
    jurisdiction: "NSWSC",
    name: "SC Gen 20 — Citation of Authority (issued 12 Sep 2023, commenced 1 Oct 2023)",
    url: "https://supremecourt.nsw.gov.au/practice-procedure/practice-notes0/general-practice-notes/sc-gen-20.html",
    lastVerified: "2026-07-22",
  },

  // ── Victoria ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "VSCA",
    name: "SC Gen 3 — Citation of Authorities and Legislation (reissued 1 December 2025)",
    url: "https://www.supremecourt.vic.gov.au/sites/default/files/2026-03/SC%20Gen%203%20-%20citation%20of%20authorities%20and%20legislation.pdf",
    lastVerified: "2026-07-21",
  },
  {
    jurisdiction: "VSCA",
    name: "SC CA 3 — Court of Appeal lists of authorities (reissued 10 March 2026)",
    url: "https://www.supremecourt.vic.gov.au/law-and-practice/practice-notes",
    lastVerified: "2026-07-21",
  },
  {
    jurisdiction: "VSC",
    name: "SC Gen 3 — Citation of Authorities and Legislation (reissued 1 December 2025)",
    url: "https://www.supremecourt.vic.gov.au/sites/default/files/2026-03/SC%20Gen%203%20-%20citation%20of%20authorities%20and%20legislation.pdf",
    lastVerified: "2026-07-21",
  },

  // ── Queensland ─────────────────────────────────────────────────────────────
  {
    jurisdiction: "QCA",
    name: "PD 1/2024 — Citation of Authority",
    url: "https://www.courts.qld.gov.au/court-users/practitioners/practice-directions/supreme-court/pd-1-of-2024",
    lastVerified: "2026-04-21",
  },
  {
    jurisdiction: "QSC",
    name: "PD 1/2024 — Citation of Authority",
    url: "https://www.courts.qld.gov.au/court-users/practitioners/practice-directions/supreme-court/pd-1-of-2024",
    lastVerified: "2026-04-21",
  },
  {
    jurisdiction: "QLD_DIST_MAG",
    name: "PD 7/2024 — Citation of Authority (Magistrates Court)",
    url: "https://www.courts.qld.gov.au/court-users/practitioners/practice-directions/magistrates-court/pd-7-of-2024",
    lastVerified: "2026-04-21",
  },

  // ── Western Australia ──────────────────────────────────────────────────────
  {
    jurisdiction: "WASC",
    name: "Consolidated Practice Directions (updated 20 June 2025) — PD 2.1 Lists of Authorities; PD 8.2.2 Citation of Authorities",
    url: "https://www.supremecourt.wa.gov.au/P/practice_directions.aspx",
    lastVerified: "2026-07-21",
  },

  // ── South Australia ────────────────────────────────────────────────────────
  {
    jurisdiction: "SASC",
    name: "Uniform Civil Rules 2020 r 217.8 — Lists of Authorities (Form 91; current to 15 March 2026)",
    url: "https://www.courts.sa.gov.au/rules-and-practice-directions/",
    lastVerified: "2026-07-21",
  },

  // ── Tasmania ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "TASSC",
    name: "PD 3 of 2014 — Citation of Authorities",
    url: "https://www.supremecourt.tas.gov.au/practice_directions/",
    lastVerified: "2026-07-21",
  },
  {
    jurisdiction: "TASSC",
    name: "PD 3 of 2022 — Lists of Authorities",
    url: "https://www.supremecourt.tas.gov.au/practice_directions/",
    lastVerified: "2026-07-21",
  },

  // ── Australian Capital Territory ───────────────────────────────────────────
  {
    jurisdiction: "ACTSC",
    name: "PD 2 of 2022 — Citation of Authorities (26 May 2022)",
    url: "https://www.courts.act.gov.au/supreme/practice-and-procedure/practice-directions",
    lastVerified: "2026-07-21",
  },

  // ── Northern Territory ─────────────────────────────────────────────────────
  {
    jurisdiction: "NTSC",
    name: "PD 2/2007 — Citation of Unreported Cases",
    url: "https://www.supremecourt.nt.gov.au/practice-directions",
    lastVerified: "2026-07-21",
  },
  {
    jurisdiction: "NTSC",
    name: "PD 1 of 2025 — Lists of Authorities (1 January 2025)",
    url: "https://www.supremecourt.nt.gov.au/practice-directions",
    lastVerified: "2026-07-21",
  },

  // ── Tribunals ──────────────────────────────────────────────────────────────
  {
    jurisdiction: "ART",
    name: "Administrative Review Tribunal — Practice Directions",
    url: "https://www.art.gov.au/practice-directions",
    lastVerified: "2026-04-21",
  },
  {
    jurisdiction: "FWC",
    name: "Fair Work Commission — Practice Notes",
    url: "https://www.fwc.gov.au/disputes-at-work/how-the-commission-works/practice-notes",
    lastVerified: "2026-04-21",
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

/**
 * AI-use practice-direction instruments, registered as source links.
 * Each carries lastVerified "2026-07-23" per A5-CM-1.
 */
export const AI_PRACTICE_DIRECTION_LINKS: PracticeDirectionLink[] = [
  // ── Queensland (Family 1) ──────────────────────────────────────────────
  {
    jurisdiction: "QSC",
    name: "Supreme Court PD 5 of 2025 — Use of Generative AI (24 Sep 2025)",
    url: "https://www.courts.qld.gov.au/court-users/practitioners/practice-directions/supreme-court/pd-5-of-2025",
    lastVerified: "2026-07-23",
  },
  {
    // Preset ID QLD_DISTRICT_MAG. The Planning and Environment Court and QCAT
    // instruments are grouped here (Family 1) as they lack their own preset.
    jurisdiction: "QLD_DISTRICT_MAG",
    name: "District Court PD 12 of 2025 — Use of Generative AI",
    url: "https://www.courts.qld.gov.au/court-users/practitioners/practice-directions/district-court/pd-12-of-2025",
    lastVerified: "2026-07-23",
  },
  {
    jurisdiction: "QLD_DISTRICT_MAG",
    name: "Planning and Environment Court PD 7 of 2025 — Use of Generative AI",
    url: "https://www.courts.qld.gov.au/court-users/practitioners/practice-directions/planning-and-environment-court/pd-7-of-2025",
    lastVerified: "2026-07-23",
  },
  {
    jurisdiction: "STATE_TRIBUNAL",
    name: "QCAT PD 10 of 2025 — Use of Generative AI",
    url: "https://www.qcat.qld.gov.au/practice-directions",
    lastVerified: "2026-07-23",
  },
  // ── South Australia (Family 1) ─────────────────────────────────────────
  {
    jurisdiction: "SASC",
    name: "Supreme Court Guidelines on the Use of Generative AI (24 Dec 2025)",
    url: "https://www.courts.sa.gov.au/rules-and-practice-directions/",
    lastVerified: "2026-07-23",
  },
  // ── New South Wales (Family 2) ─────────────────────────────────────────
  {
    jurisdiction: "NSWSC",
    name: "PN SC Gen 23 — Use of Generative AI (commenced 3 Feb 2025); UCPR Amendment No 104 of 2025 (rr 31.4(3A)–(3C), 35.3B)",
    url: "https://supremecourt.nsw.gov.au/practice-procedure/practice-notes0/general-practice-notes/sc-gen-23.html",
    lastVerified: "2026-07-23",
  },
  {
    jurisdiction: "NSWCA",
    name: "PN SC Gen 23 — Use of Generative AI (commenced 3 Feb 2025)",
    url: "https://supremecourt.nsw.gov.au/practice-procedure/practice-notes0/general-practice-notes/sc-gen-23.html",
    lastVerified: "2026-07-23",
  },
  {
    jurisdiction: "NSW_DISTRICT_LOCAL",
    name: "District Court GPN (2 Feb 2025); Local Court PN (commenced 12 Jan 2026); Land and Environment Court, NCAT PD 7, PIC PD 13",
    url: "https://www.districtcourt.nsw.gov.au/practice-and-procedure/practice-notes.html",
    lastVerified: "2026-07-23",
  },
  // ── Victoria (Family 2) ────────────────────────────────────────────────
  // A5-CM-3: the Supreme Court's May 2024 AI guidelines are SUPERSEDED by
  // PN SC Gen 25 (commenced 14 May 2026). The County Court's 2024 guidelines
  // remain current and are a separate entry (VIC_COUNTY_MAG).
  {
    jurisdiction: "VSC",
    name: "PN SC Gen 25 — Use of Generative AI (commenced 14 May 2026, replacing the May 2024 guidelines)",
    url: "https://www.supremecourt.vic.gov.au/law-and-practice/practice-notes",
    lastVerified: "2026-07-23",
  },
  {
    jurisdiction: "VSCA",
    name: "PN SC Gen 25 — Use of Generative AI (commenced 14 May 2026, replacing the May 2024 guidelines)",
    url: "https://www.supremecourt.vic.gov.au/law-and-practice/practice-notes",
    lastVerified: "2026-07-23",
  },
  {
    jurisdiction: "VIC_COUNTY_MAG",
    name: "County Court of Victoria — Guidelines on the Use of Generative AI (2024, current)",
    url: "https://www.countycourt.vic.gov.au/about-us/practice-notes",
    lastVerified: "2026-07-23",
  },
  // ── Federal Court (Family 2) ───────────────────────────────────────────
  {
    jurisdiction: "FCA",
    name: "GPN-AI — Use of Generative Artificial Intelligence (16 Apr 2026)",
    url: "https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-ai",
    lastVerified: "2026-07-23",
  },
  // ── FCFCOA (Family 2) ──────────────────────────────────────────────────
  {
    jurisdiction: "FCFCOA",
    name: "PD-AI — Use of Generative Artificial Intelligence (May 2026)",
    url: "https://www.fcfcoa.gov.au/practice-directions",
    lastVerified: "2026-07-23",
  },
  // ── Western Australia (Family 2) ───────────────────────────────────────
  {
    jurisdiction: "WASC",
    name: "Supreme Court Guidelines on the Use of Generative AI (post-2025 consultation)",
    url: "https://www.supremecourt.wa.gov.au/P/practice_directions.aspx",
    lastVerified: "2026-07-23",
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
            url: "https://www.courts.qld.gov.au/court-users/practitioners/practice-directions/supreme-court/pd-5-of-2025",
          },
        ],
      },
      {
        jurisdiction: "QCA",
        instruments: [
          {
            name: "Supreme Court PD 5 of 2025 — Use of Generative AI",
            date: "24 September 2025",
            url: "https://www.courts.qld.gov.au/court-users/practitioners/practice-directions/supreme-court/pd-5-of-2025",
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
            url: "https://www.courts.qld.gov.au/court-users/practitioners/practice-directions/district-court/pd-12-of-2025",
          },
          {
            name: "Planning and Environment Court PD 7 of 2025 — Use of Generative AI",
            date: "2025",
            url: "https://www.courts.qld.gov.au/court-users/practitioners/practice-directions/planning-and-environment-court/pd-7-of-2025",
          },
          {
            name: "QCAT PD 10 of 2025 — Use of Generative AI",
            date: "2025",
            url: "https://www.qcat.qld.gov.au/practice-directions",
          },
        ],
      },
      {
        jurisdiction: "SASC",
        instruments: [
          {
            name: "Supreme Court Guidelines on the Use of Generative AI",
            date: "24 December 2025",
            url: "https://www.courts.sa.gov.au/rules-and-practice-directions/",
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
            url: "https://supremecourt.nsw.gov.au/practice-procedure/practice-notes0/general-practice-notes/sc-gen-23.html",
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
            url: "https://supremecourt.nsw.gov.au/practice-procedure/practice-notes0/general-practice-notes/sc-gen-23.html",
          },
        ],
      },
      {
        jurisdiction: "NSW_DISTRICT_LOCAL",
        instruments: [
          {
            name: "District Court General Practice Note — Use of Generative AI",
            date: "2 February 2025",
            url: "https://www.districtcourt.nsw.gov.au/practice-and-procedure/practice-notes.html",
          },
          {
            name: "Local Court Practice Note — Use of Generative AI",
            date: "commenced 12 January 2026",
            url: "https://localcourt.nsw.gov.au/practice-and-procedure/practice-notes.html",
          },
          {
            name: "NCAT PD 7; PIC PD 13; Land and Environment Court amendment",
            date: "2025–2026",
            url: "https://ncat.nsw.gov.au/about-ncat/legislation-and-decisions/practice-directions.html",
          },
        ],
      },
      {
        jurisdiction: "VSC",
        instruments: [
          {
            name: "PN SC Gen 25 — Use of Generative AI",
            date: "commenced 14 May 2026",
            url: "https://www.supremecourt.vic.gov.au/law-and-practice/practice-notes",
          },
        ],
      },
      {
        jurisdiction: "VSCA",
        instruments: [
          {
            name: "PN SC Gen 25 — Use of Generative AI",
            date: "commenced 14 May 2026",
            url: "https://www.supremecourt.vic.gov.au/law-and-practice/practice-notes",
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
            name: "PD-AI — Use of Generative Artificial Intelligence",
            date: "May 2026",
            url: "https://www.fcfcoa.gov.au/practice-directions",
          },
        ],
      },
      {
        jurisdiction: "WASC",
        instruments: [
          {
            name: "Supreme Court Guidelines on the Use of Generative AI",
            date: "post-2025 consultation",
            url: "https://www.supremecourt.wa.gov.au/P/practice_directions.aspx",
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
];

/**
 * Retrieve the AI-use reminder for a given jurisdiction key, or undefined
 * when the jurisdiction has no registered AI instrument.
 *
 * Court mode surfaces this as practice-direction guidance — never as an AGLC
 * citation rule.
 */
export function getAiUseReminderForJurisdiction(
  jurisdictionId: string
): AiUseReminder | undefined {
  return AI_USE_REMINDERS.find((r) => r.jurisdiction === jurisdictionId);
}

/** Retrieve all AI-use reminders across every jurisdiction. */
export function getAllAiUseReminders(): AiUseReminder[] {
  return AI_USE_REMINDERS;
}
