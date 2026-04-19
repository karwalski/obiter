/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part II — Domestic Legislation: Supplementary Rules (Rules 3.3–3.9)
 *
 * Pure formatting functions for delegated legislation, short titles,
 * subsequent references, constitutions, explanatory memoranda,
 * legislative history, and quasi-legislative materials.
 */

import { Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatPinpoint } from "../general/pinpoints";
import { formatLegislationPinpoint } from "./legislation";

// ─── LEG-005: Order of Parallel Australian Statutes (Rule 3.3) — PLACEHOLDER ─

/**
 * AGLC4 Rule 3.3: When citing statutes from multiple Australian
 * jurisdictions in parallel, Commonwealth legislation is cited first,
 * followed by states and territories in alphabetical order.
 */
export const PARALLEL_STATUTE_ORDER_GUIDANCE =
  "Cth first, then alphabetical by state/territory: ACT, NSW, NT, Qld, SA, Tas, Vic, WA";

/** Canonical jurisdiction order per AGLC4 Rule 3.3. */
const JURISDICTION_ORDER: readonly string[] = [
  "Cth",
  "ACT",
  "NSW",
  "NT",
  "Qld",
  "SA",
  "Tas",
  "Vic",
  "WA",
];

/**
 * Validates whether a list of jurisdictions is in the correct AGLC4 order.
 *
 * AGLC4 Rule 3.3: Commonwealth legislation is cited first, followed by
 * states and territories in alphabetical order.
 *
 * @param jurisdictions - Array of jurisdiction abbreviations to check
 * @returns Object with `valid` flag and `suggested` reordering
 */
export function validateStatuteOrder(jurisdictions: string[]): {
  valid: boolean;
  suggested: string[];
} {
  const suggested = [...jurisdictions].sort((a, b) => {
    const indexA = JURISDICTION_ORDER.indexOf(a);
    const indexB = JURISDICTION_ORDER.indexOf(b);
    // Unknown jurisdictions sort to the end, preserving relative order
    const posA = indexA === -1 ? JURISDICTION_ORDER.length : indexA;
    const posB = indexB === -1 ? JURISDICTION_ORDER.length : indexB;
    return posA - posB;
  });

  const valid = jurisdictions.every((j, i) => j === suggested[i]);

  return { valid, suggested };
}

// ─── LEG-006: Delegated Legislation (Rule 3.4) ──────────────────────────────

/**
 * Formats a delegated legislation citation.
 *
 * AGLC4 Rule 3.4: Delegated legislation (regulations, rules, orders, etc.)
 * is cited in the same manner as statutes: title and year in italics,
 * followed by the jurisdiction abbreviation in parentheses (not italicised).
 *
 * @example
 *   formatDelegatedLegislation({ title: "Competition and Consumer Regulations", year: 2010, jurisdiction: "Cth" })
 *   => [{ text: "Competition and Consumer Regulations 2010", italic: true }, { text: " (Cth)" }]
 */
export function formatDelegatedLegislation(data: {
  title: string;
  year: number;
  jurisdiction: string;
}): FormattedRun[] {
  return [
    { text: `${data.title} ${data.year}`, italic: true },
    { text: ` (${data.jurisdiction})` },
  ];
}

// ─── LEG-007: Short Titles and Subsequent References (Rule 3.5) ──────────────

/**
 * Formats a legislation short title for use immediately after the first citation.
 *
 * AGLC4 Rule 3.5: A short title may be introduced in italicised parentheses
 * immediately after the first full citation of a legislative instrument.
 *
 * @example
 *   formatLegislationShortTitle("CCA")
 *   => [{ text: " ('", italic: true }, { text: "CCA", italic: true }, { text: "')", italic: true }]
 */
export function formatLegislationShortTitle(
  shortTitle: string
): FormattedRun[] {
  return [{ text: ` ('${shortTitle}')`, italic: true }];
}

/**
 * Formats a subsequent reference to legislation using a previously
 * introduced short title.
 *
 * AGLC4 Rule 3.5: Subsequent references use the italicised short title
 * followed by a cross-reference to the footnote in which the legislation
 * was first cited, in the form `(n X)`, plus an optional pinpoint.
 *
 * @example
 *   formatLegislationSubsequentRef("CCA", 1, { type: "section", value: "52" })
 *   => [{ text: "CCA", italic: true }, { text: " (n 1) s 52" }]
 *
 *   formatLegislationSubsequentRef("CCA", 1)
 *   => [{ text: "CCA", italic: true }, { text: " (n 1)" }]
 */
export function formatLegislationSubsequentRef(
  shortTitle: string,
  footnoteNumber: number,
  pinpoint?: Pinpoint
): FormattedRun[] {
  const runs: FormattedRun[] = [{ text: shortTitle, italic: true }];

  let refText = ` (n ${footnoteNumber})`;

  if (pinpoint) {
    refText += " ";
    runs.push({ text: refText });
    runs.push(...formatLegislationPinpoint(pinpoint));
  } else {
    runs.push({ text: refText });
  }

  return runs;
}

// ─── LEG-008: Australian Constitutions (Rule 3.6) ────────────────────────────

/**
 * Formats a reference to the Commonwealth Constitution.
 *
 * AGLC4 Rule 3.6: The Commonwealth Constitution is cited as
 * 'Australian Constitution' in italics, without a year or jurisdiction.
 * A pinpoint follows in non-italic text.
 *
 * @example
 *   formatCommonwealthConstitution({ type: "section", value: "51(i)" })
 *   => [{ text: "Australian Constitution", italic: true }, { text: " s 51(i)" }]
 *
 *   formatCommonwealthConstitution()
 *   => [{ text: "Australian Constitution", italic: true }]
 */
export function formatCommonwealthConstitution(
  pinpoint?: Pinpoint
): FormattedRun[] {
  const runs: FormattedRun[] = [
    { text: "Australian Constitution", italic: true },
  ];

  if (pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatLegislationPinpoint(pinpoint));
  }

  return runs;
}

/**
 * Formats a reference to a state or territory constitution.
 *
 * AGLC4 Rule 3.6: State and territory constitutions are cited as
 * standard statutes: title and year in italics, jurisdiction in
 * parentheses (not italicised), followed by any pinpoint.
 *
 * @example
 *   formatStateConstitution({
 *     title: "Constitution Act",
 *     year: 1975,
 *     jurisdiction: "Vic",
 *     pinpoint: { type: "section", value: "85" }
 *   })
 *   => [{ text: "Constitution Act 1975", italic: true }, { text: " (Vic)" }, { text: " s 85" }]
 */
export function formatStateConstitution(data: {
  title: string;
  year: number;
  jurisdiction: string;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [
    { text: `${data.title} ${data.year}`, italic: true },
    { text: ` (${data.jurisdiction})` },
  ];

  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatLegislationPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── LEG-009: Explanatory Memoranda (Rule 3.7) ──────────────────────────────

/**
 * Formats an explanatory memorandum citation.
 *
 * AGLC4 Rule 3.7: Explanatory memoranda, explanatory statements, and
 * explanatory notes are cited with the document type (not italicised),
 * followed by a comma and space, then the bill title and year in italics,
 * followed by the jurisdiction in parentheses (not italicised), and an
 * optional pinpoint.
 *
 * @example
 *   formatExplanatoryMemorandum({
 *     type: "Explanatory Memorandum",
 *     billTitle: "Competition and Consumer Bill",
 *     billYear: 2010,
 *     jurisdiction: "Cth",
 *     pinpoint: { type: "page", value: "5" }
 *   })
 *   => [
 *     { text: "Explanatory Memorandum, " },
 *     { text: "Competition and Consumer Bill 2010", italic: true },
 *     { text: " (Cth)" },
 *     { text: " 5" }
 *   ]
 */
export function formatExplanatoryMemorandum(data: {
  type: string;
  billTitle: string;
  billYear: number;
  jurisdiction: string;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [
    { text: `${data.type}, ` },
    { text: `${data.billTitle} ${data.billYear}`, italic: true },
    { text: ` (${data.jurisdiction})` },
  ];

  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── LEG-010: Legislative History (Rule 3.8) — PLACEHOLDER ──────────────────

/**
 * AGLC4 Rule 3.8: Legislative history references indicate how a provision
 * has been amended, inserted, or repealed by subsequent legislation.
 */
export const LEGISLATIVE_HISTORY_GUIDANCE =
  "Use 'as amended by', 'as inserted by', 'as repealed by' to indicate legislative changes. Cite the amending act in full.";

// ─── LEG-011: Quasi-Legislative Materials (Rules 3.9.1–3.9.4) ───────────────

/**
 * Formats a government gazette citation.
 *
 * AGLC4 Rule 3.9.1: Government gazettes are cited with the jurisdiction,
 * gazette type, number (if applicable), date, and page (if applicable).
 * The gazette type is italicised.
 *
 * @example
 *   formatGazette({
 *     jurisdiction: "Commonwealth",
 *     gazetteType: "Government Gazette",
 *     number: "S 123",
 *     date: "5 March 2020",
 *     page: 42
 *   })
 *   => [
 *     { text: "Commonwealth, " },
 *     { text: "Government Gazette", italic: true },
 *     { text: ", No S 123, 5 March 2020, 42" }
 *   ]
 */
export function formatGazette(data: {
  jurisdiction: string;
  gazetteType: string;
  number?: string;
  date: string;
  page?: number;
}): FormattedRun[] {
  const runs: FormattedRun[] = [
    { text: `${data.jurisdiction}, ` },
    { text: data.gazetteType, italic: true },
  ];

  let suffix = "";
  if (data.number !== undefined) {
    suffix += `, No ${data.number}`;
  }
  suffix += `, ${data.date}`;
  if (data.page !== undefined) {
    suffix += `, ${data.page}`;
  }

  runs.push({ text: suffix });

  return runs;
}

/**
 * Formats a quasi-legislative material citation such as ASIC class orders,
 * ATO tax rulings, or practice directions.
 *
 * AGLC4 Rules 3.9.2–3.9.4: Quasi-legislative materials are cited with
 * the issuing body, document type and number, title (if applicable),
 * and date. The title is italicised when present.
 *
 * @example
 *   formatQuasiLegislative({
 *     issuingBody: "Australian Taxation Office",
 *     documentType: "Taxation Ruling",
 *     number: "TR 2010/1",
 *     date: "14 July 2010",
 *     title: "Income Tax: Residency Tests"
 *   })
 *   => [
 *     { text: "Australian Taxation Office, Taxation Ruling TR 2010/1, " },
 *     { text: "Income Tax: Residency Tests", italic: true },
 *     { text: ", 14 July 2010" }
 *   ]
 */
export function formatQuasiLegislative(data: {
  issuingBody: string;
  documentType: string;
  number: string;
  date: string;
  title?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.title) {
    runs.push({
      text: `${data.issuingBody}, ${data.documentType} ${data.number}, `,
    });
    runs.push({ text: data.title, italic: true });
    runs.push({ text: `, ${data.date}` });
  } else {
    runs.push({
      text: `${data.issuingBody}, ${data.documentType} ${data.number}, ${data.date}`,
    });
  }

  return runs;
}
