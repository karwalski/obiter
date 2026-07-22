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
    // (expired TLS cert); the live PN is on supremecourt.nsw.gov.au. Note the
    // Part A/B list of authorities derives from SC CA 1, not SC Gen 20.
    url: "https://supremecourt.nsw.gov.au/practice-procedure/practice-notes0/general-practice-notes/sc-gen-20.html",
    lastVerified: "2026-07-22",
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
