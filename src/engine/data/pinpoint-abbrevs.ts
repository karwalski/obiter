export interface PinpointAbbreviation {
  type: string;
  singular: string;
  plural: string;
  /**
   * Scope note from AGLC4 Appendix C where the abbreviation is jurisdiction- or
   * material-specific (eg "United States legislation" for the "§" section sign,
   * "cap" for Hong Kong and Singaporean legislation) or cross-references another
   * rule (eg annexure → rule 9.2.12). Omitted for the general-purpose forms.
   */
  use?: string;
}

/**
 * AGLC4 pinpoint designation abbreviations — the complete Appendix C table
 * (PDF pp.332–333), imported in full (DATA-004, verified 2026-07-20), plus the
 * footnote pinpoint "n"/"nn" from rules 1.1.6–1.1.7.
 *
 * Ordering matters: `getPinpointAbbreviation` returns the FIRST entry matching a
 * type, so the general-purpose form of each designation is listed before its
 * jurisdiction-scoped variants ("ch" before "c"/"cap"; "s" before "§").
 *
 * Note (rule 1.1.6): "para" for a paragraph *pinpoint* applies to
 * legislative-style materials; paragraphs of cases and journal articles are
 * pinpointed with bare square-bracketed numbers, not "para".
 */
export const PINPOINT_ABBREVIATIONS: PinpointAbbreviation[] = [
  // --- General designations (Appendix C) ---
  { type: "amendment", singular: "amend", plural: "amends", use: "United States legislation" },
  { type: "annexure", singular: "annex", plural: "annex", use: "See rule 9.2.12" },
  { type: "appendix", singular: "app", plural: "apps" },
  { type: "article", singular: "art", plural: "arts" },
  { type: "chapter", singular: "ch", plural: "chs" },
  { type: "chapter", singular: "c", plural: "c", use: "United Kingdom and Canadian legislation" },
  { type: "chapter", singular: "cap", plural: "cap", use: "Hong Kong and Singaporean legislation" },
  { type: "clause", singular: "cl", plural: "cls" },
  { type: "division", singular: "div", plural: "divs" },
  { type: "figure", singular: "fig", plural: "figs" },
  { type: "item", singular: "item", plural: "items" },
  { type: "note", singular: "note", plural: "notes" },
  { type: "order", singular: "ord", plural: "ords" },
  { type: "paragraph", singular: "para", plural: "paras" },
  { type: "part", singular: "pt", plural: "pts" },
  { type: "preamble", singular: "Preamble", plural: "Preamble", use: "See rule 9.2.13" },
  { type: "regulation", singular: "reg", plural: "regs" },
  { type: "rule", singular: "r", plural: "rr" },
  { type: "schedule", singular: "sch", plural: "schs" },
  { type: "section", singular: "s", plural: "ss" },
  { type: "section", singular: "§", plural: "§§", use: "United States legislation" },
  { type: "sub-clause", singular: "sub-cl", plural: "sub-cls" },
  { type: "subdivision", singular: "sub-div", plural: "sub-divs" },
  { type: "sub-paragraph", singular: "sub-para", plural: "sub-paras" },
  { type: "sub-regulation", singular: "sub-reg", plural: "sub-regs" },
  { type: "sub-rule", singular: "sub-rule", plural: "sub-rules" },
  { type: "subsection", singular: "sub-s", plural: "sub-ss" },
  { type: "table", singular: "tbl", plural: "tbls" },
  { type: "title", singular: "tit", plural: "tits", use: "United States legislation" },
  // --- Footnote pinpoints (rules 1.1.6–1.1.7; not in Appendix C) ---
  { type: "footnote", singular: "n", plural: "nn" },
  // --- Engine conveniences (not listed in AGLC4 Appendix C) ---
  { type: "column", singular: "col", plural: "cols" },
  { type: "line", singular: "ln", plural: "lns" },
];

/**
 * Get the abbreviated form of a pinpoint reference type (AGLC4 Appendix C).
 *
 * Hyphen/space variants are normalised, so "sub-section", "subsection" and
 * "sub section" all resolve to "sub-s". Where a designation has jurisdiction-
 * scoped variants (chapter → ch/c/cap, section → s/§) the general-purpose form
 * is returned; pass the specific abbreviation directly when a variant is needed.
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
