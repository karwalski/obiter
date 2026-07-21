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
 * @remarks Sources (verified 2026-07-21):
 * - FCA: GPN-AUTH (reissued 7 May 2025) — applicant 5 business days,
 *   respondent 4, consolidated list and eBook 2, each by 4:30 pm
 * - HCA: Rules r 44.05.2 / PD 2 of 2024 — JBA 14 days after reply
 * - NSWCA: PN CA 1
 * - FCFCOA: FAM-APPEALS (updated 10 Jun 2025) — appeals LOA filed with
 *   the summary of argument at least 28 days before the sittings
 * - TASSC: PD 3 of 2022 — LOA lodged at least 48 hours before hearing
 * - NTSC: PD 1 of 2025 (1 Jan 2025) — single judge at least 24 hours
 *   before hearing; Full Court 28 days
 */

/** Jurisdictional presets that have deadline rules. */
export type DeadlineJurisdiction = "FCA" | "HCA" | "NSWCA" | "FCFCOA" | "TASSC" | "NTSC";

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
 * Subtracts the specified number of calendar days from a date.
 *
 * @param from - The starting date (typically the hearing date).
 * @param days - Number of calendar days to subtract.
 * @returns A new Date.
 */
export function subtractCalendarDays(from: Date, days: number): Date {
  const result = new Date(from);
  result.setDate(result.getDate() - days);
  return result;
}

/**
 * Subtracts the specified number of hours from a date, preserving the
 * time of day arithmetic (used for the Tas 48-hour and NT 24-hour
 * lodgement windows).
 *
 * @param from - The starting date (typically the hearing date and time).
 * @param hours - Number of hours to subtract.
 * @returns A new Date.
 */
export function subtractHours(from: Date, hours: number): Date {
  return new Date(from.getTime() - hours * 60 * 60 * 1000);
}

/**
 * Calculate filing deadlines for a given hearing date and jurisdiction.
 *
 * Supported jurisdictions:
 * - **FCA** (GPN-AUTH, reissued 7 May 2025): applicant LOA 5 business
 *   days before hearing by 4:30 pm; respondent LOA 4 business days
 *   before hearing by 4:30 pm; consolidated list and eBook of
 *   authorities 2 business days before hearing by 4:30 pm.
 * - **HCA** (PD 2 of 2024): JBA due 14 calendar days after reply filing
 *   date. (For HCA, `hearingDate` is interpreted as the reply filing
 *   date, since the JBA deadline is relative to the reply, not the
 *   hearing.)
 * - **NSWCA** (PN CA 1): email LOA to President's Researcher 2 business
 *   days before hearing by 10am; hardcopy to authorities box 1 business
 *   day before hearing by 10am.
 * - **FCFCOA** (FAM-APPEALS, updated 10 Jun 2025): appeals LOA filed
 *   with the summary of argument at least 28 days before the first day
 *   of the sittings. (For FCFCOA, `hearingDate` is the first day of the
 *   sittings.)
 * - **TASSC** (PD 3 of 2022): LOA lodged at least 48 hours before the
 *   hearing.
 * - **NTSC** (PD 1 of 2025): single judge list at least 24 hours before
 *   the hearing; Full Court list 28 days before the hearing.
 *
 * @param hearingDate - The hearing date (or reply filing date for HCA;
 *   first day of sittings for FCFCOA).
 * @param jurisdiction - The court jurisdiction.
 * @returns An array of filing deadlines, sorted chronologically.
 */
export function calculateDeadlines(
  hearingDate: Date,
  jurisdiction: DeadlineJurisdiction
): FilingDeadline[] {
  const deadlines: FilingDeadline[] = [];

  switch (jurisdiction) {
    case "FCA": {
      // GPN-AUTH (7 May 2025) cl 3: lists due by 4:30 pm.
      const applicantDeadline = subtractBusinessDays(hearingDate, 5);
      applicantDeadline.setHours(16, 30, 0, 0);
      deadlines.push({
        label: "FCA: Applicant LOA due (5 business days before hearing, by 4:30 pm)",
        deadline: applicantDeadline,
        jurisdiction: "FCA",
      });

      const respondentDeadline = subtractBusinessDays(hearingDate, 4);
      respondentDeadline.setHours(16, 30, 0, 0);
      deadlines.push({
        label: "FCA: Respondent LOA due (4 business days before hearing, by 4:30 pm)",
        deadline: respondentDeadline,
        jurisdiction: "FCA",
      });

      const consolidatedDeadline = subtractBusinessDays(hearingDate, 2);
      consolidatedDeadline.setHours(16, 30, 0, 0);
      deadlines.push({
        label:
          "FCA: Consolidated list and eBook of authorities due " +
          "(2 business days before hearing, by 4:30 pm)",
        deadline: consolidatedDeadline,
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
        label:
          "NSWCA: Email LOA to President's Researcher (2 business days before hearing, by 10am)",
        deadline: emailDeadline,
        jurisdiction: "NSWCA",
      });

      const hardcopyDeadline = subtractBusinessDays(hearingDate, 1);
      hardcopyDeadline.setHours(10, 0, 0, 0);
      deadlines.push({
        label:
          "NSWCA: Hardcopy LOA to authorities box, level 12 (1 business day before hearing, by 10am)",
        deadline: hardcopyDeadline,
        jurisdiction: "NSWCA",
      });
      break;
    }

    case "FCFCOA": {
      // FAM-APPEALS (10 Jun 2025): hearingDate is the first day of the
      // appeal sittings.
      const loaDeadline = subtractCalendarDays(hearingDate, 28);
      deadlines.push({
        label:
          "FCFCOA: Appeals LOA and summary of argument due " +
          "(28 days before first day of sittings)",
        deadline: loaDeadline,
        jurisdiction: "FCFCOA",
      });
      break;
    }

    case "TASSC": {
      // PD 3 of 2022: lodged at least 48 hours before the hearing.
      const loaDeadline = subtractHours(hearingDate, 48);
      deadlines.push({
        label: "TASSC: List of authorities lodged (48 hours before hearing)",
        deadline: loaDeadline,
        jurisdiction: "TASSC",
      });
      break;
    }

    case "NTSC": {
      // PD 1 of 2025: single judge 24 hours; Full Court 28 days.
      const singleJudgeDeadline = subtractHours(hearingDate, 24);
      deadlines.push({
        label: "NTSC: List of authorities lodged, single judge (24 hours before hearing)",
        deadline: singleJudgeDeadline,
        jurisdiction: "NTSC",
      });

      const fullCourtDeadline = subtractCalendarDays(hearingDate, 28);
      deadlines.push({
        label: "NTSC: List of authorities lodged, Full Court (28 days before hearing)",
        deadline: fullCourtDeadline,
        jurisdiction: "NTSC",
      });
      break;
    }
  }

  // Sort chronologically (earliest first)
  deadlines.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  return deadlines;
}
