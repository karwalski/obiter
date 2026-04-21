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
    name: "High Court Practice Directions",
    url: "https://www.hcourt.gov.au/registry/practice-directions",
    lastVerified: "2026-04-21",
  },
  {
    jurisdiction: "FCA",
    name: "GPN-AUTH — Citation of Authorities and Provision of Lists of Authorities",
    url: "https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-auth",
    lastVerified: "2026-04-21",
  },
  {
    jurisdiction: "FCFCOA",
    name: "Federal Circuit and Family Court Practice Directions",
    url: "https://www.fcfcoa.gov.au/practice-directions",
    lastVerified: "2026-04-21",
  },

  // ── New South Wales ────────────────────────────────────────────────────────
  {
    jurisdiction: "NSWCA",
    name: "SC Gen 20 — Citation of Authority",
    url: "https://www.supremecourt.justice.nsw.gov.au/practice-and-procedure/practice-notes/practice-notes-sc-gen/sc-gen-20---citation-of-authority.html",
    lastVerified: "2026-04-21",
  },
  {
    jurisdiction: "NSWSC",
    name: "SC Gen 20 — Citation of Authority",
    url: "https://www.supremecourt.justice.nsw.gov.au/practice-and-procedure/practice-notes/practice-notes-sc-gen/sc-gen-20---citation-of-authority.html",
    lastVerified: "2026-04-21",
  },

  // ── Victoria ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "VSCA",
    name: "SC Gen 3 — Citation of Authorities in the Supreme Court",
    url: "https://www.supremecourt.vic.gov.au/law-and-practice/practice-notes/sc-gen-3-citation-of-authorities-in-the-supreme-court",
    lastVerified: "2026-04-21",
  },
  {
    jurisdiction: "VSC",
    name: "SC Gen 3 — Citation of Authorities in the Supreme Court",
    url: "https://www.supremecourt.vic.gov.au/law-and-practice/practice-notes/sc-gen-3-citation-of-authorities-in-the-supreme-court",
    lastVerified: "2026-04-21",
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
    name: "Supreme Court of Western Australia — Consolidated Practice Directions",
    url: "https://www.supremecourt.wa.gov.au/P/practice_directions.aspx",
    lastVerified: "2026-04-21",
  },

  // ── South Australia ────────────────────────────────────────────────────────
  {
    jurisdiction: "SASC",
    name: "Supreme Court of South Australia — Practice Directions",
    url: "https://www.courts.sa.gov.au/rules-and-practice-directions/practice-directions/supreme-court/",
    lastVerified: "2026-04-21",
  },

  // ── Tasmania ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "TASCSC",
    name: "Supreme Court of Tasmania — Practice Directions",
    url: "https://www.supremecourt.tas.gov.au/practice_directions/",
    lastVerified: "2026-04-21",
  },

  // ── Australian Capital Territory ───────────────────────────────────────────
  {
    jurisdiction: "ACTSC",
    name: "ACT Supreme Court — Practice Directions",
    url: "https://www.courts.act.gov.au/supreme/practice-and-procedure/practice-directions",
    lastVerified: "2026-04-21",
  },

  // ── Northern Territory ─────────────────────────────────────────────────────
  {
    jurisdiction: "NTSC",
    name: "PD 2/2007 — Citation of Unreported Cases",
    url: "https://www.supremecourt.nt.gov.au/practice-directions",
    lastVerified: "2026-04-21",
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
  jurisdictionId: string,
): PracticeDirectionLink[] {
  return PRACTICE_DIRECTION_LINKS.filter(
    (pd) => pd.jurisdiction === jurisdictionId,
  );
}

/**
 * Retrieve all practice direction links across every jurisdiction.
 */
export function getAllPracticeDirections(): PracticeDirectionLink[] {
  return PRACTICE_DIRECTION_LINKS;
}
