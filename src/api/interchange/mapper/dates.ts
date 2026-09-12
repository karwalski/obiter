/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * dates.ts — date forms used by the interchange formats, both ways.
 *
 * Inputs: RIS "YYYY/MM/DD/other", ISO "YYYY-MM-DD" / "YYYY-MM" / "YYYY",
 * CSL date-parts, EndNote free text ("21 October 2020", "October 21, 2020",
 * "21/10/2020"), BibLaTeX "YYYY-MM-DD". Output to Obiter is the AGLC rule
 * 1.11.1 string produced by the engine's own formatDate ("21 October 2020").
 */

import { formatDate } from "../../../engine/rules/v4/general/dates";
import type { InterchangeDate } from "../model";

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function monthIndex(text: string): number | undefined {
  const lower = text.toLowerCase().replace(/\.$/, "");
  const full = MONTH_NAMES.indexOf(lower);
  if (full >= 0) return full + 1;
  const abbrev = MONTH_NAMES.findIndex((m) => m.startsWith(lower) && lower.length >= 3);
  return abbrev >= 0 ? abbrev + 1 : undefined;
}

function valid(year?: number, month?: number, day?: number): boolean {
  if (year !== undefined && (year < 1000 || year > 2999)) return false;
  if (month !== undefined && (month < 1 || month > 12)) return false;
  if (day !== undefined && (day < 1 || day > 31)) return false;
  return true;
}

/** Parses RIS "YYYY/MM/DD/other". Missing parts are allowed; slashes are not required. */
export function parseRisDate(text: string): InterchangeDate | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  // The RIS form starts with a four-digit year or a slash; anything else is
  // free text ("21 October 2020") from a tool that ignored the specification.
  if (!/^(\d{4}|\/)/.test(trimmed)) return parseFreeTextDate(trimmed);
  const m = /^(\d{4})?\/?(\d{1,2})?\/?(\d{1,2})?\/?(.*)$/.exec(trimmed);
  if (!m || (!m[1] && !m[4])) return parseFreeTextDate(trimmed);
  const year = m[1] ? Number(m[1]) : undefined;
  const month = m[2] ? Number(m[2]) : undefined;
  const day = m[3] ? Number(m[3]) : undefined;
  const other = m[4]?.trim();
  if (!valid(year, month, day)) return { raw: trimmed };
  const result: InterchangeDate = {};
  if (year !== undefined) result.year = year;
  if (month) result.month = month;
  if (day) result.day = day;
  if (other) result.raw = other;
  return result;
}

/** Parses CSL "date-parts": [[y, m, d]]. */
export function parseDateParts(parts: unknown): InterchangeDate | undefined {
  if (!Array.isArray(parts) || parts.length === 0) return undefined;
  const first = Array.isArray(parts[0]) ? parts[0] : parts;
  const nums = (first as unknown[]).map((p) => Number(p)).filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return undefined;
  const [year, month, day] = nums;
  if (!valid(year, month, day)) return undefined;
  const result: InterchangeDate = { year };
  if (month) result.month = month;
  if (day) result.day = day;
  return result;
}

/**
 * Parses the free-text dates found in EndNote, Word and hand-typed fields.
 * Day-first is assumed for numeric "21/10/2020" (Australian convention).
 */
export function parseFreeTextDate(text: string): InterchangeDate | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  let m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(trimmed);
  if (m) {
    const d = { year: Number(m[1]), month: Number(m[2]), day: m[3] ? Number(m[3]) : undefined };
    return valid(d.year, d.month, d.day) ? compact(d) : { raw: trimmed };
  }

  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  if (m) {
    const d = { year: Number(m[3]), month: Number(m[2]), day: Number(m[1]) };
    return valid(d.year, d.month, d.day) ? compact(d) : { raw: trimmed };
  }

  m = /^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/.exec(trimmed);
  if (m) {
    const month = monthIndex(m[2]);
    if (month) return compact({ year: Number(m[3]), month, day: Number(m[1]) });
  }

  m = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(trimmed);
  if (m) {
    const month = monthIndex(m[1]);
    if (month) return compact({ year: Number(m[3]), month, day: Number(m[2]) });
  }

  m = /^([A-Za-z]+)\s+(\d{4})$/.exec(trimmed);
  if (m) {
    const month = monthIndex(m[1]);
    if (month) return { year: Number(m[2]), month };
  }

  m = /^(\d{4})$/.exec(trimmed);
  if (m) return { year: Number(m[1]) };

  // A year somewhere in the text ("Spring 2019", "c 1990")
  m = /\b(1[0-9]{3}|2[0-9]{3})\b/.exec(trimmed);
  if (m) return { year: Number(m[1]), raw: trimmed };

  return { raw: trimmed };
}

function compact(d: { year: number; month?: number; day?: number }): InterchangeDate {
  const out: InterchangeDate = { year: d.year };
  if (d.month) out.month = d.month;
  if (d.day) out.day = d.day;
  return out;
}

/** The AGLC rule 1.11.1 string: "21 October 2020", "October 2020" or "2020". */
export function toAglcDateString(date: InterchangeDate | undefined): string | undefined {
  if (!date) return undefined;
  if (date.year === undefined) return date.raw;
  if (date.month) {
    return formatDate({ year: date.year, month: date.month, day: date.day });
  }
  return String(date.year);
}

/** Parses an AGLC date string back ("21 October 2020"). */
export function fromAglcDateString(text: string | undefined): InterchangeDate | undefined {
  if (!text) return undefined;
  return parseFreeTextDate(String(text));
}

/** RIS "YYYY/MM/DD/" form. */
export function toRisDate(date: InterchangeDate | undefined): string | undefined {
  if (!date) return undefined;
  if (date.year === undefined) return date.raw ? `///${date.raw}` : undefined;
  const pad = (n: number | undefined): string => (n ? String(n).padStart(2, "0") : "");
  return `${date.year}/${pad(date.month)}/${pad(date.day)}/${date.raw ?? ""}`;
}

/** ISO "YYYY-MM-DD" trimmed to the known precision. */
export function toIsoDate(date: InterchangeDate | undefined): string | undefined {
  if (!date || date.year === undefined) return date?.raw;
  const pad = (n: number): string => String(n).padStart(2, "0");
  if (date.month && date.day) return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
  if (date.month) return `${date.year}-${pad(date.month)}`;
  return String(date.year);
}

/** CSL date object. */
export function toDateParts(
  date: InterchangeDate | undefined
): { "date-parts": number[][] } | { raw: string } | undefined {
  if (!date) return undefined;
  if (date.year === undefined) return date.raw ? { raw: date.raw } : undefined;
  const parts: number[] = [date.year];
  if (date.month) {
    parts.push(date.month);
    if (date.day) parts.push(date.day);
  }
  return { "date-parts": [parts] };
}

/** Year as a number when known. */
export function yearOf(date: InterchangeDate | undefined): number | undefined {
  return date?.year;
}
