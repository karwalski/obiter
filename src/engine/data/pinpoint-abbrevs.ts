export interface PinpointAbbreviation {
  type: string;
  singular: string;
  plural: string;
}

/**
 * AGLC4 pinpoint abbreviations (Rule 1.1.6).
 * Used when citing specific locations within a source.
 */
export const PINPOINT_ABBREVIATIONS: PinpointAbbreviation[] = [
  { type: "section", singular: "s", plural: "ss" },
  { type: "part", singular: "pt", plural: "pts" },
  { type: "division", singular: "div", plural: "divs" },
  { type: "chapter", singular: "ch", plural: "chs" },
  { type: "clause", singular: "cl", plural: "cls" },
  { type: "schedule", singular: "sch", plural: "schs" },
  { type: "regulation", singular: "reg", plural: "regs" },
  { type: "rule", singular: "r", plural: "rr" },
  { type: "article", singular: "art", plural: "arts" },
  { type: "paragraph", singular: "para", plural: "paras" },
  { type: "footnote", singular: "n", plural: "nn" },
  { type: "column", singular: "col", plural: "cols" },
  { type: "line", singular: "ln", plural: "lns" },
];

/**
 * Get the abbreviated form of a pinpoint reference type.
 *
 * @param type - The pinpoint type (e.g. "section", "paragraph").
 * @param isPlural - Whether to return the plural abbreviation.
 * @returns The abbreviated string, or the original type if not found.
 */
export function getPinpointAbbreviation(
  type: string,
  isPlural: boolean
): string {
  const lowerType = type.toLowerCase();
  const entry = PINPOINT_ABBREVIATIONS.find(
    (p) => p.type === lowerType
  );
  if (!entry) {
    return type;
  }
  return isPlural ? entry.plural : entry.singular;
}
