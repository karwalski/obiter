/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * NZLSG-005: NZ Legislation
 *
 * NZLSG Rules 4.1–4.2: NZ legislation in roman (not italic).
 * No jurisdiction identifier for domestic NZ Acts.
 * Foreign jurisdiction in parentheses.
 * Bills with italic title and (no X-N) bill number.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Data Interfaces ────────────────────────────────────────────────────────

export interface NZLegislationData {
  /** Short title of the Act (e.g. 'Property Law Act'). */
  title: string;
  /** Year of the Act. */
  year: number;
  /**
   * Jurisdiction identifier for foreign legislation.
   * Omitted for NZ domestic legislation per NZLSG 4.1.
   */
  jurisdiction?: string;
  /** Section pinpoint (e.g. 's 27', 'ss 12\u201314'). */
  pinpoint?: string;
}

export interface NZDelegatedLegislationData {
  /** Short title of the regulation (e.g. 'Land Transfer Regulations'). */
  title: string;
  /** Year of the regulation. */
  year: number;
  /** Regulation pinpoint (e.g. 'reg 4', 'cl 3'). */
  pinpoint?: string;
}

export interface NZBillData {
  /** Title of the Bill (will be italicised). */
  title: string;
  /** Bill number in format 'X-N' (e.g. '105-2'). */
  billNumber: string;
  /** Section pinpoint. */
  pinpoint?: string;
}

// ─── NZLSG-005: NZ Primary Legislation ─────────────────────────────────────

/**
 * Formats NZ primary legislation per NZLSG Rule 4.1.
 *
 * NZLSG Rule 4.1: NZ legislation titles are roman (not italic).
 * No jurisdiction identifier for NZ domestic Acts.
 * Foreign legislation includes jurisdiction in parentheses.
 *
 * @example
 *   // Property Law Act 2007, s 27
 *   formatLegislation({ title: "Property Law Act", year: 2007, pinpoint: "s 27" })
 *
 * @example
 *   // Counter-Terrorism Act 2008 (UK)
 *   formatLegislation({ title: "Counter-Terrorism Act", year: 2008, jurisdiction: "UK" })
 */
export function formatLegislation(data: NZLegislationData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title and year in roman (not italic) per NZLSG 4.1
  runs.push({ text: `${data.title} ${data.year}` });

  // Foreign jurisdiction in parentheses (omitted for NZ domestic)
  if (data.jurisdiction) {
    runs.push({ text: ` (${data.jurisdiction})` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-005: NZ Delegated Legislation ───────────────────────────────────

/**
 * Formats NZ delegated legislation per NZLSG Rule 4.2.
 *
 * NZLSG Rule 4.2: Delegated legislation titles in roman.
 *
 * @example
 *   // Land Transfer Regulations 2002, reg 4
 *   formatDelegatedLegislation({ title: "Land Transfer Regulations", year: 2002, pinpoint: "reg 4" })
 */
export function formatDelegatedLegislation(
  data: NZDelegatedLegislationData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title and year in roman
  runs.push({ text: `${data.title} ${data.year}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-005: NZ Bills ───────────────────────────────────────────────────

/**
 * Formats a NZ Bill citation per NZLSG Rule 4.1.
 *
 * NZLSG Rule 4.1: Bill titles are italic, followed by the bill number
 * in the format (no X-N).
 *
 * @example
 *   // Trusts Bill (no 105-2), cl 5
 *   formatBill({ title: "Trusts Bill", billNumber: "105-2", pinpoint: "cl 5" })
 */
export function formatBill(data: NZBillData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Bill number
  runs.push({ text: ` (no ${data.billNumber})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}
