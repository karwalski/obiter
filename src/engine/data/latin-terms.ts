/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Rule 1.8.3 — Latin and Foreign Words
 *
 * Latin and foreign words that are not commonly used in English should be
 * italicised. Words that have been absorbed into common English usage
 * (e.g. "etc", "ie", "eg", "ad hoc", "status quo") are NOT italicised.
 *
 * This module exports the canonical sets of terms that must be italicised
 * and terms that must NOT be italicised (common English exceptions).
 *
 * @see AGLC4, Rule 1.8.3.
 */

/**
 * Latin and foreign terms that MUST be italicised per AGLC4 Rule 1.8.3.
 *
 * These terms are not considered common English usage. Multi-word phrases
 * are stored as-is; the inline formatter matches them as whole phrases.
 *
 * Sorted alphabetically for maintainability.
 */
export const LATIN_TERMS_ITALICISED: ReadonlySet<string> = new Set<string>([
  "ab initio",
  "actus reus",
  "amicus curiae",
  "animus possidendi",
  "bona fide",
  "bona fides",
  "certiorari",
  "corpus delicti",
  "corpus juris",
  "cy-pres",
  "de facto",
  "de jure",
  "de novo",
  "dicta",
  "dictum",
  "ejusdem generis",
  "en ventre sa mere",
  "ex officio",
  "ex parte",
  "functus officio",
  "habeas corpus",
  "in camera",
  "in extenso",
  "in limine",
  "in loco parentis",
  "in personam",
  "in re",
  "in rem",
  "in situ",
  "inter alia",
  "inter partes",
  "inter se",
  "inter vivos",
  "intra vires",
  "lex fori",
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
  "obiter dicta",
  "obiter dictum",
  "onus probandi",
  "per curiam",
  "per incuriam",
  "per se",
  "prima facie",
  "pro bono",
  "pro forma",
  "pro rata",
  "pro tanto",
  "pro tempore",
  "qua",
  "quantum meruit",
  "quasi",
  "quo warranto",
  "ratio decidendi",
  "res ipsa loquitur",
  "res judicata",
  "stare decisis",
  "sub judice",
  "sub nom",
  "sui generis",
  "suo motu",
  "uberrimae fidei",
  "ultra vires",
  "vel non",
  "vexata quaestio",
  "vis major",
  "volenti non fit injuria",
]);

/**
 * Latin and foreign terms that should NOT be italicised per AGLC4 Rule 1.8.3.
 *
 * These terms are considered sufficiently absorbed into common English usage
 * that they no longer require italicisation. This set is used to avoid
 * false positives when a term appears in both contexts (e.g. "de facto"
 * in legal writing vs common English usage, "bona fide" as adverb vs adjective).
 *
 * Sorted alphabetically for maintainability.
 */
export const LATIN_TERMS_EXCEPTIONS: ReadonlySet<string> = new Set<string>([
  "ad hoc",
  "caveat",
  "eg",
  "et al",
  "etc",
  "ibid",
  "ie",
  "per",
  "per annum",
  "re",
  "sic",
  "status quo",
  "versus",
  "vice versa",
  "viz",
]);

/**
 * Returns an array of Latin terms to italicise, sorted longest-first.
 *
 * Sorting longest-first ensures that multi-word phrases like "obiter dictum"
 * are matched before shorter substrings like "dictum".
 */
export function getLatinTermsSorted(): string[] {
  return [...LATIN_TERMS_ITALICISED].sort((a, b) => b.length - a.length);
}
