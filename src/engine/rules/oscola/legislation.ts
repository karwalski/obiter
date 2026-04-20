/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSC-005 + OSC-006: OSCOLA Rules 2.2.1–2.2.8 — UK Legislation
 *
 * Formats UK primary legislation (Acts of Parliament, Scottish asp,
 * Welsh anaw/asc, NI Acts) and secondary/delegated legislation
 * (SIs, SSIs, WSIs, NI SRs). All titles in roman (not italic) per OSCOLA.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Data Interfaces ─────────────────────────────────────────────────────────

export interface OscolaPrimaryLegislationData {
  /** Short title of the Act (rendered in roman, not italic). */
  title: string;
  /** Year of the Act. */
  year: number;
  /**
   * Legislation type determining suffix format.
   * - 'uk': Acts of the UK Parliament (no suffix)
   * - 'asp': Acts of the Scottish Parliament
   * - 'anaw': Acts of the National Assembly for Wales (pre-2020)
   * - 'asc': Acts of Senedd Cymru (2020+)
   * - 'ni': Northern Ireland Acts
   */
  type: "uk" | "asp" | "anaw" | "asc" | "ni";
  /** Chapter/act number (for asp, anaw, asc types). */
  number?: number;
  /** Section pinpoint (e.g. 's 6', 'ss 3-5'). */
  pinpoint?: string;
  /**
   * Regnal year for historical statutes (e.g. '39 & 40 Geo III').
   * Used for pre-modern Acts where helpful.
   */
  regnalYear?: string;
  /** Chapter number for historical statutes (e.g. 'c 67'). */
  chapter?: string;
}

export interface OscolaSecondaryLegislationData {
  /** Short title of the instrument (rendered in roman, not italic). */
  title: string;
  /** Year of the instrument. */
  year: number;
  /**
   * Instrument type determining prefix.
   * - 'si': Statutory Instrument (England & Wales / UK)
   * - 'ssi': Scottish Statutory Instrument
   * - 'wsi': Welsh Statutory Instrument
   * - 'sr': Northern Ireland Statutory Rule
   */
  type: "si" | "ssi" | "wsi" | "sr";
  /** Instrument number. */
  number: number | string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── Type prefix mapping ─────────────────────────────────────────────────────

const SECONDARY_LEGISLATION_PREFIX: Record<
  OscolaSecondaryLegislationData["type"],
  string
> = {
  si: "SI",
  ssi: "SSI",
  wsi: "WSI",
  sr: "SR",
};

// ─── OSC-005: UK Primary Legislation (OSCOLA Rules 2.2.1–2.2.5) ─────────────

/**
 * Formats UK primary legislation per OSCOLA Rules 2.2.1–2.2.5.
 *
 * OSCOLA Rule 2.2.1: Acts of Parliament are cited by short title and year,
 * in roman type (not italic). No comma before the year.
 * OSCOLA Rule 2.2.2: Section abbreviation is 's' (no full stop).
 * OSCOLA Rule 2.2.3: Scottish Acts use '(asp X)' suffix.
 * OSCOLA Rule 2.2.4: Welsh Acts use '(anaw X)' pre-2020, '(asc X)' from 2020.
 * OSCOLA Rule 2.2.5: NI Acts use '(NI)' after the year.
 *
 * @example
 *   // Human Rights Act 1998, s 6
 *   formatOscolaPrimaryLegislation({
 *     title: "Human Rights Act", year: 1998, type: "uk", pinpoint: "s 6",
 *   })
 *
 * @example
 *   // Scotland Act 1998, s 29
 *   formatOscolaPrimaryLegislation({
 *     title: "Scotland Act", year: 1998, type: "uk", pinpoint: "s 29",
 *   })
 *
 * @example
 *   // Adoption and Children (Scotland) Act 2007 (asp 4)
 *   formatOscolaPrimaryLegislation({
 *     title: "Adoption and Children (Scotland) Act", year: 2007, type: "asp", number: 4,
 *   })
 *
 * @example
 *   // Legislation (Wales) Act 2019 (anaw 4)
 *   formatOscolaPrimaryLegislation({
 *     title: "Legislation (Wales) Act", year: 2019, type: "anaw", number: 4,
 *   })
 *
 * @example
 *   // Justice (Northern Ireland) Act 2002 (NI)
 *   formatOscolaPrimaryLegislation({
 *     title: "Justice (Northern Ireland) Act", year: 2002, type: "ni",
 *   })
 */
export function formatOscolaPrimaryLegislation(
  data: OscolaPrimaryLegislationData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title and year in roman (not italic) — this is the key OSCOLA distinction
  let titleText = `${data.title} ${data.year}`;

  // Type-specific suffix
  switch (data.type) {
    case "uk":
      // No suffix for UK Parliament Acts
      break;
    case "asp":
      if (data.number !== undefined) {
        titleText += ` (asp ${data.number})`;
      }
      break;
    case "anaw":
      if (data.number !== undefined) {
        titleText += ` (anaw ${data.number})`;
      }
      break;
    case "asc":
      if (data.number !== undefined) {
        titleText += ` (asc ${data.number})`;
      }
      break;
    case "ni":
      titleText += " (NI)";
      break;
  }

  runs.push({ text: titleText });

  // Historical regnal year (if provided)
  if (data.regnalYear) {
    runs.push({ text: `, ${data.regnalYear}` });
    if (data.chapter) {
      runs.push({ text: `, ${data.chapter}` });
    }
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── OSC-006: UK Secondary Legislation (OSCOLA Rules 2.2.6–2.2.8) ───────────

/**
 * Formats UK secondary/delegated legislation per OSCOLA Rules 2.2.6–2.2.8.
 *
 * OSCOLA Rule 2.2.6: Statutory Instruments are cited as
 *   'Short Title Year, SI Year/Number'. Roman type (not italic).
 * OSCOLA Rule 2.2.7: Scottish Statutory Instruments use 'SSI'.
 * OSCOLA Rule 2.2.8: Welsh Statutory Instruments use 'WSI';
 *   NI Statutory Rules use 'SR'.
 *
 * @example
 *   // Civil Procedure Rules 1998, SI 1998/3132
 *   formatOscolaSecondaryLegislation({
 *     title: "Civil Procedure Rules", year: 1998, type: "si", number: 3132,
 *   })
 *
 * @example
 *   // National Health Service (General Medical Services Contracts) (Scotland) Regulations 2018, SSI 2018/66
 *   formatOscolaSecondaryLegislation({
 *     title: "National Health Service (General Medical Services Contracts) (Scotland) Regulations",
 *     year: 2018, type: "ssi", number: 66,
 *   })
 *
 * @example
 *   // Phosphorus Compounds (Prohibition) Regulations (Northern Ireland) 1989, SR 1989/182
 *   formatOscolaSecondaryLegislation({
 *     title: "Phosphorus Compounds (Prohibition) Regulations (Northern Ireland)",
 *     year: 1989, type: "sr", number: 182,
 *   })
 */
export function formatOscolaSecondaryLegislation(
  data: OscolaSecondaryLegislationData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  const prefix = SECONDARY_LEGISLATION_PREFIX[data.type];

  // Title, year, and instrument number — all roman
  runs.push({
    text: `${data.title} ${data.year}, ${prefix} ${data.year}/${data.number}`,
  });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}
