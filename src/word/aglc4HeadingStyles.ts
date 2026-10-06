/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Pure data describing the AGLC4 formatting Obiter can apply to Word's
 * built-in Heading 1–5 styles, and a plain-language description of each
 * change so the user can see what will change before accepting it
 * (COURT-101). No Office.js here, so views can import it freely.
 */

/** The AGLC4 formatting applied to one built-in heading style. */
export interface Aglc4HeadingFormat {
  /** Built-in style name ("Heading 1" ... "Heading 5"). */
  name: string;
  /** AGLC4 heading level this style carries (Rule 1.12.2). */
  levelLabel: "I" | "II" | "III" | "IV" | "V";
  italic: boolean;
  smallCaps: boolean;
  bold: boolean;
  centered: boolean;
  /** Left indent in points (Obiter layout choice; not prescribed by AGLC4). */
  leftIndent: number;
}

/**
 * AGLC4 Rule 1.12.2 (PDF p 59, printed p 34): five heading levels.
 * Level I is in large and small capitals, centred; Level II is italicised,
 * centred; Levels III–V are italicised, left-aligned. AGLC4 marks rule 1.12
 * as a suggestion only. Size 12 pt, black, 12 pt spacing and the IV/V left
 * indents are Obiter layout choices, unchanged from earlier releases.
 */
export const AGLC4_HEADING_FORMATS: ReadonlyArray<Aglc4HeadingFormat> = [
  {
    name: "Heading 1",
    levelLabel: "I",
    italic: false,
    smallCaps: true,
    bold: false,
    centered: true,
    leftIndent: 0,
  },
  {
    name: "Heading 2",
    levelLabel: "II",
    italic: true,
    smallCaps: false,
    bold: false,
    centered: true,
    leftIndent: 0,
  },
  {
    name: "Heading 3",
    levelLabel: "III",
    italic: true,
    smallCaps: false,
    bold: false,
    centered: false,
    leftIndent: 0,
  },
  {
    name: "Heading 4",
    levelLabel: "IV",
    italic: true,
    smallCaps: false,
    bold: false,
    centered: false,
    leftIndent: 36,
  },
  {
    name: "Heading 5",
    levelLabel: "V",
    italic: true,
    smallCaps: false,
    bold: false,
    centered: false,
    leftIndent: 72,
  },
];

/** Shared settings applied to every built-in heading (Obiter layout choices). */
export const AGLC4_HEADING_COMMON = {
  fontSize: 12,
  color: "black",
  spaceBefore: 12,
  spaceAfter: 12,
  firstLineIndent: 0,
} as const;

/**
 * One plain-language line per built-in heading style describing what the
 * explicit "format headings" action will change (COURT-101 preview).
 */
export function describeBuiltInHeadingChanges(): string[] {
  return AGLC4_HEADING_FORMATS.map((cfg) => {
    const parts: string[] = [];
    parts.push(`${AGLC4_HEADING_COMMON.fontSize} pt`);
    parts.push(cfg.smallCaps ? "small capitals" : cfg.italic ? "italic" : "roman");
    parts.push("not bold");
    parts.push(cfg.centered ? "centred" : "left-aligned");
    if (cfg.leftIndent > 0) parts.push(`indented ${cfg.leftIndent / 72} in`);
    parts.push("black");
    parts.push(`${AGLC4_HEADING_COMMON.spaceBefore} pt before and after`);
    return `${cfg.name} (Level ${cfg.levelLabel}): ${parts.join(", ")}`;
  });
}
