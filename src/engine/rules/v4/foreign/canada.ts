/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part V — Foreign Domestic Materials: Canada (Rules 15.1–15.4)
 *
 * Pure formatting functions for Canadian case citations, legislation,
 * constitutional provisions and regulations.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── FRGN-001: Canadian Cases (Rule 15.1) ───────────────────────────────────

/**
 * Formats a Canadian case citation per AGLC4 Rule 15.1.
 *
 * @remarks AGLC4 Rule 15.1.1: Canadian cases follow chapter 2 without
 * modification. Rule 15.1.2: cite an authorised series where possible
 * (SCR, FC/FCR, Ex CR — all federal); otherwise an official,
 * semi-official provincial or unofficial series (e.g. the DLR).
 * Year-organised series take square brackets and volume-organised
 * series round brackets, per rules 2.2.3–2.2.4.
 *
 * @example
 *   // R v Sharpe [2001] 1 SCR 45  — AGLC4 ex 1
 *   formatCase({ caseName: "R v Sharpe", year: 2001, reportSeries: "SCR", volume: 1, startingPage: 45 })
 *
 * @example
 *   // Bangoura v Washington Post (2005) 258 DLR (4th) 341
 *   //   (Ontario Court of Appeal)  — AGLC4 ex 5
 *   formatCase({ caseName: "Bangoura v Washington Post", year: 2005, yearType: "round", reportSeries: "DLR (4th)", volume: 258, startingPage: 341, court: "Ontario Court of Appeal" })
 *
 * @param data - Canadian case citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatCase(data: {
  caseName: string;
  year: number;
  reportSeries: string;
  volume?: number;
  startingPage: number;
  court?: string;
  /**
   * Year bracket style per rules 2.2.3–2.2.4: square for year-organised
   * series (the default), round for volume-organised series (e.g. the
   * DLR, whose volume number identifies the report).
   */
  yearType?: "round" | "square";
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Year — square brackets for year-organised series (the default)
  const yearType = data.yearType ?? "square";
  const open = yearType === "round" ? "(" : "[";
  const close = yearType === "round" ? ")" : "]";
  runs.push({ text: ` ${open}${data.year}${close}` });

  // Volume (if applicable)
  if (data.volume !== undefined) {
    runs.push({ text: ` ${data.volume}` });
  }

  // Report series and starting page
  runs.push({ text: ` ${data.reportSeries} ${data.startingPage}` });

  // Court identifier (if not apparent from series)
  const seriesImplyingCourt = new Set(["SCR", "FC", "FCR", "Ex CR"]);
  if (data.court && !seriesImplyingCourt.has(data.reportSeries)) {
    runs.push({ text: ` (${data.court})` });
  }

  return runs;
}

// ─── FRGN-001: Canadian Legislation (Rule 15.2) ─────────────────────────────

/**
 * Formats a Canadian statute citation per AGLC4 Rule 15.2.
 *
 * @remarks AGLC4 Rule 15.2 template: Title, Statute Volume +
 * Jurisdiction Year, c Chapter, Pinpoint. The title (rule 15.2.1) ends
 * with a non-italic comma; the statute volume and jurisdiction fuse
 * into one token with no space ('RSC', 'SS', 'RSO' — rule 15.2.2);
 * the year takes an optional parenthesised session or supplement number
 * (rule 15.2.3); the chapter is abbreviated 'c' (rule 15.2.4);
 * pinpoints are comma-introduced (rule 15.2.5).
 *
 * @example
 *   // Criminal Code, RSC 1985, c C-46, s 515  — AGLC4 ex 7
 *   formatLegislation({ title: "Criminal Code", year: 1985, jurisdiction: "RSC", pinpoint: "c C-46, s 515" })
 *
 * @example
 *   // Criminal Law Amendment Act, RSC 1985 (1st Supp), c 27  — AGLC4 ex 11
 *   formatLegislation({ title: "Criminal Law Amendment Act", year: 1985, jurisdiction: "RSC", sessionOrSupplement: "1st Supp", pinpoint: "c 27" })
 *
 * @param data - Canadian legislation citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatLegislation(data: {
  title: string;
  year?: number;
  /** Fused statute volume + jurisdiction token (e.g. 'RSC', 'SC', 'RSO', 'SS'). */
  jurisdiction?: string;
  pinpoint?: string;
  /**
   * Session or supplement number per rule 15.2.3 (e.g. '1st Supp',
   * '2nd Sess'), parenthesised after the year (which then loses its
   * comma — the comma follows the parenthesis via the pinpoint).
   */
  sessionOrSupplement?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics (non-italic comma follows via the next run)
  runs.push({ text: data.title, italic: true });

  // Statute volume + jurisdiction and year (rules 15.2.2–15.2.3)
  if (data.jurisdiction) {
    let text = `, ${data.jurisdiction}`;
    if (data.year !== undefined) {
      text += ` ${data.year}`;
      if (data.sessionOrSupplement) {
        text += ` (${data.sessionOrSupplement})`;
      }
    }
    runs.push({ text });
  }

  // Chapter and pinpoint (rules 15.2.4–15.2.5)
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── FRGN-001: Canadian Regulations (Rule 15.4) ─────────────────────────────

/**
 * Formats a Canadian regulation citation per AGLC4 Rules 15.4.1–15.4.3.
 *
 * @remarks AGLC4 Rule 15.4.1 (revised federal): Title, CRC,
 * c Chapter Number, Pinpoint — with a parenthesised year after the
 * chapter or pinpoint when citing a consolidation other than the
 * latest. Rule 15.4.2 (unrevised federal): Title, SOR/Year-Number,
 * Pinpoint (two-digit years until 1999, full years from 2000).
 * Rule 15.4.3 (provincial/territorial): an optional title plus the
 * jurisdiction-specific designation from the 15.4.3 table
 * (e.g. 'Alta Reg 192/2015', 'O Reg 361/08', 'RRO 1990, Reg 469').
 *
 * @example
 *   // Maple Products Regulations, CRC, c 289, s 9  — AGLC4 ex 17
 *   formatRegulation({ title: "Maple Products Regulations", citation: "CRC, c 289", pinpoint: "s 9" })
 *
 * @example
 *   // Regulations Amending the Food and Drug Regulations, SOR/98-580  — AGLC4 ex 19
 *   formatRegulation({ title: "Regulations Amending the Food and Drug Regulations", citation: "SOR/98-580" })
 *
 * @example
 *   // Air Transport Regulations, CRC, c 34, s 23 (1987)  — AGLC4 ex 18
 *   formatRegulation({ title: "Air Transport Regulations", citation: "CRC, c 34", pinpoint: "s 23", consolidationYear: 1987 })
 */
export function formatRegulation(data: {
  /** Title of the regulation (italicised). Optional for rule 15.4.3. */
  title?: string;
  /**
   * Citation to the regulation: 'CRC, c «Chapter»' (rule 15.4.1),
   * 'SOR/«Year»-«Number»' (rule 15.4.2), or a rule 15.4.3 provincial
   * designation (e.g. 'Alta Reg 192/2015').
   */
  citation: string;
  /** Pinpoint reference (rules 3.1.4–3.1.7 and 3.4). */
  pinpoint?: string;
  /**
   * Year of a CRC consolidation other than the latest (rule 15.4.1),
   * parenthesised after the chapter number or pinpoint.
   */
  consolidationYear?: number;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics, with a non-italic comma
  if (data.title) {
    runs.push({ text: data.title, italic: true });
    runs.push({ text: ", " });
  }

  // Citation to the regulation
  runs.push({ text: data.citation });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Consolidation year (rule 15.4.1)
  if (data.consolidationYear !== undefined) {
    runs.push({ text: ` (${data.consolidationYear})` });
  }

  return runs;
}

// ─── FRGN-001: Canadian Constitution (Rule 15.3) ────────────────────────────

/**
 * Formats a citation to a Canadian constitutional statute per AGLC4
 * Rule 15.3.
 *
 * @remarks AGLC4 Rule 15.3.1: the federal constitutional statutes take
 * fixed forms with mandatory italic short titles — use
 * {@link formatFederalConstitution}. Rule 15.3.2: provincial and
 * territorial constitutions are cited as ordinary legislation under
 * rule 15.2 (use {@link formatLegislation} — e.g. *Constitution Act*,
 * RSBC 1996, c 66).
 *
 * @example
 *   // Constitution Act, 1982, s 2
 *   formatConstitution({ title: "Constitution Act, 1982", pinpoint: "s 2" })
 *
 * @param data - Canadian constitutional citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatConstitution(data: { title: string; pinpoint?: string }): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Pinpoint (section, part, etc.)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── FRGN-001: Federal Constitutional Statutes (Rule 15.3.1) ────────────────

/**
 * Formats one of the fixed rule 15.3.1 citations for Canada's federal
 * constitutional statutes.
 *
 * @remarks AGLC4 Rule 15.3.1 fixed forms (short titles mandatory even
 * without subsequent references):
 * - *Canada Act 1982* (UK) c 11, sch B ('*Constitution Act 1982*')
 * - *Constitution Act 1867* (Imp), 30 & 31 Vict, c 3 ('*Constitution Act 1867*')
 * - *Canada Act 1982* (UK) c 11, sch B pt I ('*Canadian Charter of Rights and Freedoms*')
 * A pinpoint is inserted before the short-title parenthetical.
 *
 * @example
 *   // Canada Act 1982 (UK) c 11, sch B ('Constitution Act 1982')
 *   formatFederalConstitution({ instrument: "constitution1982" })
 *
 * @example
 *   // Canada Act 1982 (UK) c 11, sch B pt I
 *   //   ('Canadian Charter of Rights and Freedoms')
 *   formatFederalConstitution({ instrument: "charter" })
 */
export function formatFederalConstitution(data: {
  /** Which fixed rule 15.3.1 citation to produce. */
  instrument: "constitution1982" | "constitution1867" | "charter";
  /** Pinpoint reference, inserted before the short-title parenthetical. */
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const pinpoint = data.pinpoint ? `, ${data.pinpoint}` : "";

  if (data.instrument === "constitution1867") {
    runs.push({ text: "Constitution Act 1867", italic: true });
    runs.push({ text: ` (Imp), 30 & 31 Vict, c 3${pinpoint} ('` });
    runs.push({ text: "Constitution Act 1867", italic: true });
    runs.push({ text: "')" });
    return runs;
  }

  const schedule = data.instrument === "charter" ? "sch B pt I" : "sch B";
  const shortTitle =
    data.instrument === "charter"
      ? "Canadian Charter of Rights and Freedoms"
      : "Constitution Act 1982";
  runs.push({ text: "Canada Act 1982", italic: true });
  runs.push({ text: ` (UK) c 11, ${schedule}${pinpoint} ('` });
  runs.push({ text: shortTitle, italic: true });
  runs.push({ text: "')" });
  return runs;
}
