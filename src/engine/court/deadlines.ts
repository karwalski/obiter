/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-VALID-002: Filing deadline reminders.
 *
 * Accepts a hearing date and jurisdiction, returns calculated deadlines
 * for LOA and submission filing. Business day calculation excludes
 * weekends; state-specific holidays are not accounted for (user adjusts).
 *
 * @remarks
 * - FCA: GPN-AUTH cl 3.1-3.2
 * - HCA: Rules r 44.05.2
 * - NSWCA: PN CA 1
 */

/** Jurisdictional presets that have deadline rules. */
export type DeadlineJurisdiction = "FCA" | "HCA" | "NSWCA";

/** A single filing deadline. */
export interface FilingDeadline {
  label: string;
  deadline: Date;
  jurisdiction: DeadlineJurisdiction;
}

/**
 * Returns true if the given date falls on a weekend (Saturday or Sunday).
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Subtracts the specified number of business days from a date.
 * Business days exclude weekends only; state-specific holidays
 * are not accounted for — the user adjusts manually.
 *
 * @param from - The starting date (typically the hearing date).
 * @param businessDays - Number of business days to subtract.
 * @returns A new Date representing the calculated deadline.
 */
export function subtractBusinessDays(from: Date, businessDays: number): Date {
  const result = new Date(from);
  let remaining = businessDays;

  while (remaining > 0) {
    result.setDate(result.getDate() - 1);
    if (!isWeekend(result)) {
      remaining--;
    }
  }

  return result;
}

/**
 * Adds the specified number of calendar days to a date.
 *
 * @param from - The starting date.
 * @param days - Number of calendar days to add.
 * @returns A new Date.
 */
export function addCalendarDays(from: Date, days: number): Date {
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate filing deadlines for a given hearing date and jurisdiction.
 *
 * Supported jurisdictions:
 * - **FCA**: applicant LOA 5 business days before hearing by 4pm;
 *   respondent LOA 4 business days before hearing by 4pm.
 * - **HCA**: JBA due 14 calendar days after reply filing date.
 *   (For HCA, `hearingDate` is interpreted as the reply filing date,
 *   since the JBA deadline is relative to the reply, not the hearing.)
 * - **NSWCA**: email LOA to President's Researcher 2 business days
 *   before hearing by 10am; hardcopy to authorities box 1 business day
 *   before hearing by 10am.
 *
 * @param hearingDate - The hearing date (or reply filing date for HCA).
 * @param jurisdiction - The court jurisdiction.
 * @returns An array of filing deadlines, sorted chronologically.
 */
export function calculateDeadlines(
  hearingDate: Date,
  jurisdiction: DeadlineJurisdiction,
): FilingDeadline[] {
  const deadlines: FilingDeadline[] = [];

  switch (jurisdiction) {
    case "FCA": {
      const applicantDeadline = subtractBusinessDays(hearingDate, 5);
      applicantDeadline.setHours(16, 0, 0, 0);
      deadlines.push({
        label: "FCA: Applicant LOA due (5 business days before hearing, by 4pm)",
        deadline: applicantDeadline,
        jurisdiction: "FCA",
      });

      const respondentDeadline = subtractBusinessDays(hearingDate, 4);
      respondentDeadline.setHours(16, 0, 0, 0);
      deadlines.push({
        label: "FCA: Respondent LOA due (4 business days before hearing, by 4pm)",
        deadline: respondentDeadline,
        jurisdiction: "FCA",
      });
      break;
    }

    case "HCA": {
      // hearingDate is the reply filing date for HCA
      const jbaDeadline = addCalendarDays(hearingDate, 14);
      deadlines.push({
        label: "HCA: Joint Book of Authorities due (14 days after reply)",
        deadline: jbaDeadline,
        jurisdiction: "HCA",
      });
      break;
    }

    case "NSWCA": {
      const emailDeadline = subtractBusinessDays(hearingDate, 2);
      emailDeadline.setHours(10, 0, 0, 0);
      deadlines.push({
        label: "NSWCA: Email LOA to President's Researcher (2 business days before hearing, by 10am)",
        deadline: emailDeadline,
        jurisdiction: "NSWCA",
      });

      const hardcopyDeadline = subtractBusinessDays(hearingDate, 1);
      hardcopyDeadline.setHours(10, 0, 0, 0);
      deadlines.push({
        label: "NSWCA: Hardcopy LOA to authorities box, level 12 (1 business day before hearing, by 10am)",
        deadline: hardcopyDeadline,
        jurisdiction: "NSWCA",
      });
      break;
    }
  }

  // Sort chronologically (earliest first)
  deadlines.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  return deadlines;
}
