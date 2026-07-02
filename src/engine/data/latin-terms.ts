/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Rule 1.8.3 — Italicisation of Foreign Words
 *
 * "Foreign words and phrases should be italicised unless they appear in the
 * latest edition of the Macquarie Dictionary." The rule gives two lists:
 * examples of foreign words/phrases generally NOT italicised
 * (Macquarie-listed), and examples generally italicised.
 *
 * This module exports the canonical sets of terms that must be italicised
 * and terms that must NOT be italicised. Both of the rule's lists are
 * encoded verbatim; terms beyond the rule's lists are Macquarie-dependent
 * and marked provisional.
 *
 * @see AGLC4, Rule 1.8.3 (PDF p 52).
 */

/**
 * Latin and foreign terms that are italicised per AGLC4 Rule 1.8.3.
 *
 * The first seven terms are the rule's own "generally italicised" list,
 * encoded verbatim. The remaining terms do not appear on either of the
 * rule's lists; under the rule they are italicised only if absent from the
 * Macquarie Dictionary. They are retained provisionally pending dictionary
 * verification (Macquarie-dependent Latin terms — see the PARITY handoff
 * note for the decisions.md entry).
 *
 * Multi-word phrases are stored as-is; the inline formatter matches them as
 * whole phrases. Sorted alphabetically within each group.
 */
export const LATIN_TERMS_ITALICISED: ReadonlySet<string> = new Set<string>([
  // ── Rule 1.8.3 "generally italicised" list (verbatim) ──
  "contra proferentem",
  "ex ante",
  "jus ad bellum",
  "lex fori",
  "ne bis in idem",
  "quantum meruit",
  "stare decisis",
  // ── Not on either rule list — provisional: verify against Macquarie ──
  "actus reus",
  "animus possidendi",
  "certiorari",
  "corpus delicti",
  "corpus juris",
  "cy-pres",
  "de novo",
  "ejusdem generis",
  "en ventre sa mere",
  "ex officio",
  "functus officio",
  "in camera",
  "in extenso",
  "in limine",
  "in loco parentis",
  "in personam",
  "in re",
  "in rem",
  "in situ",
  "inter partes",
  "inter se",
  "inter vivos",
  "intra vires",
  "lex loci",
  "lex loci delicti",
  "lis pendens",
  "locus standi",
  "mandamus",
  "mens rea",
  "modus operandi",
  "mutatis mutandis",
  "nemo dat quod non habet",
  "nisi prius",
  "nolle prosequi",
  "noscitur a sociis",
  "onus probandi",
  "per curiam",
  "per incuriam",
  "pro bono",
  "pro forma",
  "pro rata",
  "pro tanto",
  "pro tempore",
  "qua",
  "quasi",
  "quo warranto",
  "res judicata",
  "sub judice",
  "sub nom",
  "suo motu",
  "uberrimae fidei",
  "vel non",
  "vexata quaestio",
  "vis major",
  "volenti non fit injuria",
]);

/**
 * Latin and foreign terms that should NOT be italicised per AGLC4 Rule 1.8.3.
 *
 * The first group is the rule's own "generally not italicised" list
 * (Macquarie-listed terms), encoded verbatim — 29 terms. The second group
 * comprises close variants of listed terms (plural/noun forms sharing the
 * listed term's dictionary entry) and other terms absorbed into common
 * English or reserved by other AGLC4 rules (eg 'ibid', rule 1.4.3). Leaving
 * a term un-italicised is the safe default under the rule.
 *
 * Sorted alphabetically within each group.
 */
export const LATIN_TERMS_EXCEPTIONS: ReadonlySet<string> = new Set<string>([
  // ── Rule 1.8.3 "generally not italicised" list (verbatim) ──
  "ab initio",
  "ad hoc",
  "ad idem",
  "amicus curiae",
  "bona fide",
  "caveat emptor",
  "de facto",
  "de jure",
  "et al",
  "ex gratia",
  "ex parte",
  "ex post facto",
  "habeas corpus",
  "inter alia",
  "laissez-faire",
  "non-refoulement",
  "non est factum",
  "obiter dictum",
  "per se",
  "prima facie",
  "quid pro quo",
  "raison d'être",
  "ratio decidendi",
  "res ipsa loquitur",
  "sui generis",
  "terra nullius",
  "ultra vires",
  "vice versa",
  "vis-a-vis",
  // ── Variants of listed terms (same treatment as the listed form) ──
  "bona fides",
  "dicta",
  "dictum",
  "obiter dicta",
  // ── Common-English / AGLC-internal terms (not on the rule's lists) ──
  "caveat",
  "eg",
  "etc",
  "ibid",
  "ie",
  "per",
  "per annum",
  "re",
  "sic",
  "status quo",
  "versus",
  "viz",
]);

/**
 * Returns an array of Latin terms to italicise, sorted longest-first.
 *
 * Sorting longest-first ensures that multi-word phrases like
 * "lex loci delicti" are matched before shorter substrings like "lex loci".
 */
export function getLatinTermsSorted(): string[] {
  return [...LATIN_TERMS_ITALICISED].sort((a, b) => b.length - a.length);
}
