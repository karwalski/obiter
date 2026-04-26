/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Story 17.55 — Practice-Note-Aware Reminder
 *
 * Returns factual reminder text for jurisdictions that have practice notes
 * or directions requiring citation verification. Each reminder cites the
 * specific practice note or direction.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PracticeNoteReminder {
  jurisdiction: string;
  courtName: string;
  practiceNote: string;
  reminderText: string;
}

// ---------------------------------------------------------------------------
// Practice note data
// ---------------------------------------------------------------------------

/**
 * Map of jurisdiction keys to practice note reminders.
 *
 * Keys use the format "JURISDICTION_COURT" for clarity and uniqueness.
 * Only jurisdictions with verified citation-verification requirements
 * are included.
 */
const PRACTICE_NOTES: Record<string, PracticeNoteReminder> = {
  NSW_SC: {
    jurisdiction: "NSW",
    courtName: "Supreme Court of New South Wales",
    practiceNote: "Practice Note Gen 23",
    reminderText:
      "Practice Note Gen 23 (Supreme Court of NSW) requires that citations " +
      "in written submissions comply with the court's referencing " +
      "requirements. Parties should ensure all case references include " +
      "medium neutral citations where available and that legislative " +
      "references are to the current, in-force version of the provision.",
  },

  VIC_SC: {
    jurisdiction: "VIC",
    courtName: "Supreme Court of Victoria",
    practiceNote: "Practice Note SC Gen 1",
    reminderText:
      "Practice Note SC Gen 1 (Supreme Court of Victoria) requires that " +
      "written submissions include proper citations. Case citations should " +
      "include medium neutral citations where available, and references " +
      "to legislation should identify the relevant version and any " +
      "applicable amendments.",
  },

  FCA: {
    jurisdiction: "CTH",
    courtName: "Federal Court of Australia",
    practiceNote: "Central Practice Note (CPN-1)",
    reminderText:
      "The Central Practice Note CPN-1 (Federal Court of Australia) " +
      "requires that written submissions cite authorities accurately. " +
      "Medium neutral citations should be used where available. Parties " +
      "must provide complete and accurate references to enable the Court " +
      "to locate the cited material.",
  },

  QLD_SC: {
    jurisdiction: "QLD",
    courtName: "Supreme Court of Queensland",
    practiceNote: "Practice Direction 6 of 2023",
    reminderText:
      "Practice Direction 6 of 2023 (Supreme Court of Queensland) sets " +
      "out requirements for the citation of authorities in written " +
      "submissions. Medium neutral citations must be used where available, " +
      "and report citations should follow the AGLC format.",
  },

  NCAT: {
    jurisdiction: "NSW",
    courtName: "NSW Civil and Administrative Tribunal",
    practiceNote: "NCAT Practice Note 1",
    reminderText:
      "NCAT Practice Note 1 (NSW Civil and Administrative Tribunal) " +
      "provides guidance on the citation of cases and legislation in " +
      "submissions. Parties should use medium neutral citations where " +
      "available and ensure legislative references are current and accurate.",
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Supported jurisdiction keys. Use these values when calling
 * {@link getPracticeNoteReminder}.
 */
export const SUPPORTED_JURISDICTIONS = Object.keys(PRACTICE_NOTES);

/**
 * Return a practice-note reminder for the given jurisdiction key.
 *
 * @param jurisdiction — One of the supported jurisdiction keys:
 *   "NSW_SC", "VIC_SC", "FCA", "QLD_SC", "NCAT".
 * @returns The reminder object, or `null` if the jurisdiction does not
 *   have a known citation-verification practice note.
 */
export function getPracticeNoteReminder(
  jurisdiction: string,
): PracticeNoteReminder | null {
  const key = jurisdiction.toUpperCase().replace(/\s+/g, "_");
  return PRACTICE_NOTES[key] ?? null;
}

/**
 * Return all available practice note reminders.
 */
export function getAllReminders(): PracticeNoteReminder[] {
  return Object.values(PRACTICE_NOTES);
}
