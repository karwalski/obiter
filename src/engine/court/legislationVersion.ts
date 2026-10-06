/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Legislation version ("as at") for court Lists of Authorities (COURT-118)
 *
 * Several court instruments ask a list of authorities to state which
 * version of the legislation applies (register O-R15):
 *   - HCA Form 27A annexure (HCA-2): a legislation table with the version,
 *     the provisions, the reason for that version and the applicable date;
 *     HCA PD 2 of 2024 (HCA-1) asks for a legislation-version column in the
 *     Joint Book of Authorities index.
 *   - NSW SC CA 1 cl 37(1) (NSW-2, 8 May 2023): each piece of legislation
 *     with the date at which, or the version of which, it is to be applied,
 *     eg "as at <date>" or "as commenced on <date>".
 *   - FCA GPN-AUTH cl 2.3 (FCA-1, 7 May 2025) and GPN-eBOOKS cl 7.4 (FCA-2,
 *     11 Jun 2026): legislation extracts state the date they are in force.
 *
 * The fields are optional citation data (`versionDate`, `versionKind`,
 * `versionNote`). They are emitted ONLY by the court list layouts that need
 * them (COURT-117: "hca-jba-five-part", "nswca-four-category",
 * "fca-ebook-sections"). AGLC4 footnotes and bibliographies never use them:
 * AGLC4 r 3.1 cites a statute by title, year, jurisdiction and pinpoint, with
 * no version date.
 *
 * Values cross the Custom XML Part boundary, so they are read with
 * `toText()` (a digit-only value can come back as a number).
 */

import { toText } from "../rules/v4/general/coerce";

/** Data keys for the version fields (stored in `Citation.data`). */
export const LEGISLATION_VERSION_FIELDS = {
  date: "versionDate",
  kind: "versionKind",
  note: "versionNote",
} as const;

/**
 * Which version of the legislation the date refers to.
 *
 * - "point-in-time" — the law as at a date (NSW SC CA 1 cl 37(1) "as at")
 * - "compilation" — a compilation (consolidated reprint) in force at a date
 * - "as-enacted" — the Act as made, before any amendment
 */
export type LegislationVersionKind = "point-in-time" | "compilation" | "as-enacted";

export const LEGISLATION_VERSION_KINDS: ReadonlyArray<{
  value: LegislationVersionKind;
  label: string;
}> = [
  { value: "point-in-time", label: "Point in time (as at a date)" },
  { value: "compilation", label: "Compilation in force at a date" },
  { value: "as-enacted", label: "As enacted" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Formats an ISO date (YYYY-MM-DD, as a date input stores it) as
 * "15 December 2019", the day-month-year form of the NSW SC CA 1 cl 37(1)
 * example. Any other text is returned trimmed and unchanged, so a date the
 * user typed by hand is kept as typed.
 */
export function formatVersionDate(raw: unknown): string {
  const text = toText(raw);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return text;
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return text;
  return `${day} ${MONTHS[month - 1]} ${m[1]}`;
}

/** True when the citation data records a version date or an as-enacted version. */
export function hasLegislationVersion(data: Record<string, unknown>): boolean {
  return (
    toText(data[LEGISLATION_VERSION_FIELDS.date]).length > 0 ||
    toText(data[LEGISLATION_VERSION_FIELDS.kind]) === "as-enacted"
  );
}

/**
 * COURT-118: the version statement for a list-of-authorities entry, or ""
 * when none is recorded.
 *
 * - point in time (the default when only a date is given): "as at 15 December 2019"
 *   (NSW SC CA 1 cl 37(1) example form)
 * - compilation: "compilation as at 15 December 2019"
 * - as enacted: "as enacted", or "as enacted on 15 December 2019" with a date
 *
 * With `includeNote`, the reason note follows after a semicolon (HCA Form 27A
 * records the reason for the version).
 *
 * @param data - the citation's data bag.
 * @param includeNote - whether to add the reason note.
 */
export function formatLegislationVersion(
  data: Record<string, unknown>,
  includeNote = false
): string {
  const date = formatVersionDate(data[LEGISLATION_VERSION_FIELDS.date]);
  const kind = toText(data[LEGISLATION_VERSION_FIELDS.kind]) as LegislationVersionKind | "";
  let statement = "";
  if (kind === "as-enacted") {
    statement = date ? `as enacted on ${date}` : "as enacted";
  } else if (date) {
    statement = kind === "compilation" ? `compilation as at ${date}` : `as at ${date}`;
  }
  if (!statement) return "";
  const note = includeNote ? toText(data[LEGISLATION_VERSION_FIELDS.note]) : "";
  return note ? `${statement}; ${note}` : statement;
}
