/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { ValidationIssue } from "../../../types/validation";

const MONTHS: readonly string[] = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_ABBREVS: readonly string[] = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Sept", "Oct", "Nov", "Dec",
];

// ─── GEN-031: Date formatting (Rule 1.11.1) ────────────────────────────────

/**
 * Formats a date as "Day Month Year" per AGLC4.
 *
 * If `day` is omitted, returns "Month Year". Month names are never abbreviated
 * and no commas or ordinals are used.
 *
 * @remarks AGLC4 Rule 1.11.1: "Dates should appear in the format
 * 'Day Month Year' (eg '14 July 2018'). Do not use commas, ordinal indicators
 * or abbreviations for the month."
 */
export function formatDate(
  date: Date | { day?: number; month: number; year: number },
): string {
  let day: number | undefined;
  let month: number;
  let year: number;

  if (date instanceof Date) {
    day = date.getDate();
    month = date.getMonth(); // 0-indexed
    year = date.getFullYear();
  } else {
    day = date.day;
    month = date.month - 1; // Expect 1-indexed input, convert to 0-indexed
    year = date.year;
  }

  const monthName = MONTHS[month];

  if (day !== undefined) {
    return `${day} ${monthName} ${year}`;
  }
  return `${monthName} ${year}`;
}

/**
 * Scans text for date-formatting issues per AGLC4 Rule 1.11.1.
 *
 * Flags:
 * 1. US-style dates with commas (e.g. "July 14, 2018").
 * 2. Ordinal indicators on days (e.g. "14th July", "1st January").
 * 3. Abbreviated month names (e.g. "Jul", "Sept").
 *
 * @remarks AGLC4 Rule 1.11.1
 */
export function checkDateFormatting(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // US-style dates with commas: "Month Day, Year"
  const usDateRegex = new RegExp(
    `\\b((?:${MONTHS.join("|")})\\s+\\d{1,2},\\s*\\d{4})\\b`,
    "g",
  );
  let match: RegExpExecArray | null;

  while ((match = usDateRegex.exec(text)) !== null) {
    issues.push({
      ruleNumber: "1.11.1",
      message: `Date "${match[1]}" should not use a comma; use "Day Month Year" format`,
      severity: "warning",
      offset: match.index,
      length: match[1].length,
    });
  }

  // Ordinal indicators: "14th", "1st", "2nd", "3rd" before a month name
  const ordinalRegex = new RegExp(
    `\\b(\\d{1,2}(?:st|nd|rd|th))\\s+(${MONTHS.join("|")})\\b`,
    "gi",
  );

  while ((match = ordinalRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const dayOrdinal = match[1];
    const dayDigits = dayOrdinal.replace(/(?:st|nd|rd|th)$/i, "");
    issues.push({
      ruleNumber: "1.11.1",
      message: `Ordinal "${dayOrdinal}" should be written as a plain number`,
      severity: "warning",
      offset: match.index,
      length: fullMatch.length,
      suggestion: `${dayDigits} ${match[2]}`,
    });
  }

  // Abbreviated month names (exclude "May" which is a full month name)
  const abbrevsWithoutMay = MONTH_ABBREVS.filter((a) => a !== "May");
  const abbrevRegex = new RegExp(
    `\\b(${abbrevsWithoutMay.join("|")})\\b(?!\\w)`,
    "g",
  );

  while ((match = abbrevRegex.exec(text)) !== null) {
    const abbrev = match[1];
    // Find the full month name for this abbreviation
    const fullMonth = MONTHS.find((m) =>
      m.toLowerCase().startsWith(abbrev.toLowerCase()),
    );
    issues.push({
      ruleNumber: "1.11.1",
      message: `Abbreviated month "${abbrev}" should be written in full`,
      severity: "warning",
      offset: match.index,
      length: abbrev.length,
      suggestion: fullMonth,
    });
  }

  return issues;
}

// ─── GEN-033: Date and time spans (Rules 1.11.3, 1.11.4) ───────────────────

const EN_DASH = "\u2013";

/**
 * Formats a span of two years using an en-dash.
 *
 * When both years are in the same century, the end year is abbreviated to its
 * last two digits (e.g. `1986–87`). Otherwise the full end year is used
 * (e.g. `1999–2009`).
 *
 * @remarks AGLC4 Rule 1.11.3 / 1.11.4
 */
export function formatYearSpan(startYear: number, endYear: number): string {
  const startCentury = Math.floor(startYear / 100);
  const endCentury = Math.floor(endYear / 100);

  if (startCentury === endCentury) {
    const endAbbrev = String(endYear).slice(-2);
    return `${startYear}${EN_DASH}${endAbbrev}`;
  }
  return `${startYear}${EN_DASH}${endYear}`;
}

/**
 * Formats a date span with an en-dash per AGLC4.
 *
 * Rules applied:
 * - Same month & year: `21–22 September 2018`
 * - Different months, same year: `21 September – 3 October 2018`
 * - Different years (no day/month): abbreviate end year if same century
 *   (`1986–87`), otherwise full (`1999–2009`)
 *
 * @remarks AGLC4 Rules 1.11.3, 1.11.4
 */
export function formatDateSpan(
  start: { day?: number; month?: number; year: number },
  end: { day?: number; month?: number; year: number },
): string {
  // Year-only span
  if (
    start.month === undefined &&
    end.month === undefined &&
    start.day === undefined &&
    end.day === undefined
  ) {
    return formatYearSpan(start.year, end.year);
  }

  // Different years
  if (start.year !== end.year) {
    // If both have full date info, format each side fully
    if (
      start.month !== undefined &&
      end.month !== undefined &&
      start.day !== undefined &&
      end.day !== undefined
    ) {
      const startMonth = MONTHS[start.month - 1];
      const endMonth = MONTHS[end.month - 1];
      return `${start.day} ${startMonth} ${start.year} ${EN_DASH} ${end.day} ${endMonth} ${end.year}`;
    }
    // Year-only
    return formatYearSpan(start.year, end.year);
  }

  // Same year
  if (
    start.month !== undefined &&
    end.month !== undefined &&
    start.day !== undefined &&
    end.day !== undefined
  ) {
    if (start.month === end.month) {
      // Same month: "21–22 September 2018"
      const monthName = MONTHS[start.month - 1];
      return `${start.day}${EN_DASH}${end.day} ${monthName} ${start.year}`;
    }
    // Different months: "21 September – 3 October 2018"
    const startMonth = MONTHS[start.month - 1];
    const endMonth = MONTHS[end.month - 1];
    return `${start.day} ${startMonth} ${EN_DASH} ${end.day} ${endMonth} ${end.year}`;
  }

  // Fallback for month-only spans in same year
  if (start.month !== undefined && end.month !== undefined) {
    const startMonth = MONTHS[start.month - 1];
    const endMonth = MONTHS[end.month - 1];
    return `${startMonth} ${EN_DASH} ${endMonth} ${start.year}`;
  }

  return formatYearSpan(start.year, end.year);
}

/**
 * Scans text for date/year spans using hyphens instead of en-dashes.
 *
 * Flags patterns like `1986-87`, `2010-2015`, or `21-22 September` where a
 * hyphen is used but an en-dash is required.
 *
 * @remarks AGLC4 Rules 1.11.3, 1.11.4
 */
export function checkDateSpans(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let match: RegExpExecArray | null;

  // Year spans with hyphen: "1986-87" or "1999-2009"
  const yearSpanRegex = /\b(\d{4})-(\d{2,4})\b/g;

  while ((match = yearSpanRegex.exec(text)) !== null) {
    const full = match[0];
    const startYear = Number(match[1]);
    const endPart = match[2];

    // Sanity check: start year should look like a real year
    if (startYear < 1000 || startYear > 2999) {
      continue;
    }

    // Avoid false positives on things that aren't year spans
    // (e.g. phone numbers, ISBNs). End part should be a plausible year suffix.
    const endYear =
      endPart.length === 2
        ? Math.floor(startYear / 100) * 100 + Number(endPart)
        : Number(endPart);

    if (endYear <= startYear) {
      continue;
    }

    const suggestion = full.replace("-", EN_DASH);
    issues.push({
      ruleNumber: "1.11.3",
      message: `Year span "${full}" should use an en-dash, not a hyphen`,
      severity: "warning",
      offset: match.index,
      length: full.length,
      suggestion,
    });
  }

  // Day spans with hyphen before a month name: "21-22 September"
  const daySpanRegex = new RegExp(
    `\\b(\\d{1,2})-(\\d{1,2})\\s+(${MONTHS.join("|")})\\b`,
    "g",
  );

  while ((match = daySpanRegex.exec(text)) !== null) {
    const full = match[0];
    const suggestion = full.replace("-", EN_DASH);
    issues.push({
      ruleNumber: "1.11.3",
      message: `Date span "${full}" should use an en-dash, not a hyphen`,
      severity: "warning",
      offset: match.index,
      length: full.length,
      suggestion,
    });
  }

  return issues;
}
