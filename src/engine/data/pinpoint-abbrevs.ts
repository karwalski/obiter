export interface PinpointAbbreviation {
  type: string;
  singular: string;
  plural: string;
}

/**
 * AGLC4 pinpoint designation abbreviations.
 *
 * Core set: the rule 3.1.4 table (PDF p.94) — appendix, article, chapter,
 * clause, division, paragraph, part, schedule, section and their "sub-"
 * forms — plus "ord"/"r" from the rule 3.1.4 court-rules notes and "n"/"nn"
 * from rules 1.1.6–1.1.7 (footnotes).
 *
 * Note (rule 1.1.6): "para" for a paragraph *pinpoint* applies to
 * legislative-style materials; paragraphs of cases and journal articles are
 * pinpointed with bare square-bracketed numbers, not "para".
 *
 * "reg", "col" and "ln" have no in-chapter source — provisional: verify
 * against Appendix C (DATA-004).
 */
export const PINPOINT_ABBREVIATIONS: PinpointAbbreviation[] = [
  { type: "appendix", singular: "app", plural: "apps" },
  { type: "article", singular: "art", plural: "arts" },
  { type: "chapter", singular: "ch", plural: "chs" },
  { type: "clause", singular: "cl", plural: "cls" },
  { type: "division", singular: "div", plural: "divs" },
  { type: "paragraph", singular: "para", plural: "paras" },
  { type: "part", singular: "pt", plural: "pts" },
  { type: "schedule", singular: "sch", plural: "schs" },
  { type: "section", singular: "s", plural: "ss" },
  { type: "sub-clause", singular: "sub-cl", plural: "sub-cls" },
  { type: "subdivision", singular: "sub-div", plural: "sub-divs" },
  { type: "sub-paragraph", singular: "sub-para", plural: "sub-paras" },
  { type: "subsection", singular: "sub-s", plural: "sub-ss" },
  // Rule 3.1.4 notes: an order in court rules is "ord" (never "O"), eg
  // 'ord 9 r 4'. The plural is not given in-chapter — provisional (DATA-004).
  { type: "order", singular: "ord", plural: "ords" },
  { type: "rule", singular: "r", plural: "rr" },
  // Rules 1.1.6–1.1.7: footnote pinpoints.
  { type: "footnote", singular: "n", plural: "nn" },
  // provisional: verify against Appendix C (DATA-004) — no in-chapter source.
  { type: "regulation", singular: "reg", plural: "regs" },
  { type: "column", singular: "col", plural: "cols" },
  { type: "line", singular: "ln", plural: "lns" },
];

/**
 * Get the abbreviated form of a pinpoint reference type (rule 3.1.4).
 *
 * Hyphen/space variants are normalised, so "sub-section", "subsection" and
 * "sub section" all resolve to "sub-s".
 *
 * @param type - The pinpoint type (e.g. "section", "sub-paragraph").
 * @param isPlural - Whether to return the plural abbreviation.
 * @returns The abbreviated string, or the original type if not found.
 */
export function getPinpointAbbreviation(type: string, isPlural: boolean): string {
  const lowerType = type.toLowerCase();
  const normalised = lowerType.replace(/[\s-]+/g, "");
  const entry = PINPOINT_ABBREVIATIONS.find(
    (p) => p.type === lowerType || p.type.replace(/-/g, "") === normalised
  );
  if (!entry) {
    return type;
  }
  return isPlural ? entry.plural : entry.singular;
}
