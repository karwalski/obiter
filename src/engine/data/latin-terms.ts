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
 * Both of the rule's lists are encoded verbatim. Terms beyond the rule's
 * lists are Macquarie-dependent; the Macquarie Dictionary is subscription-only
 * and could not be consulted directly.
 *
 * ── Free-source proxy pass (2026-07-03, RESEARCH-009 / DECISION-016) ──
 * Because Macquarie is paywalled, provisional terms were assessed against
 * free proxy sources: Merriam-Webster main dictionary (/dictionary/, the most
 * Macquarie-like signal — a general dictionary folding legal senses into main
 * entries only when naturalised), Collins, Cambridge, Dictionary.com, plus
 * Merriam-Webster's legal-only dictionary and Wiktionary as auxiliaries. The
 * proxy was calibrated against the rule's own 36 labelled terms: it reproduces
 * the 29 Macquarie-listed terms well (25/29, zero false-italic) but has an
 * IRREDUCIBLE false-roman floor — 'stare decisis' and 'ex ante' are labelled
 * italic (absent from Macquarie) yet appear in all four general dictionaries,
 * so no free source distinguishes a legal-Latin term of art that Macquarie
 * happens to list from one it happens to omit.
 *
 * CONSERVATIVE application (chosen 2026-07-03): only clear GENERAL-English
 * borrowings with a Merriam-Webster main entry and strong conventional-
 * dictionary coverage were moved to the not-italicised set. Every legal-Latin
 * term of art — even those with a main-dictionary entry (certiorari, mandamus,
 * mens rea, res judicata …) — is kept italic pending a Macquarie check, because
 * de-italicising a term Macquarie does not list would violate the rule's
 * default. DECISION-016 remains OPEN: the Macquarie pass is the closing step.
 *
 * Multi-word phrases are stored as-is; the inline formatter matches them as
 * whole phrases.
 *
 * @see AGLC4, Rule 1.8.3 (PDF p 52).
 * @see docs/decisions.md DECISION-016 for the per-term evidence table.
 */

/**
 * Latin and foreign terms that are italicised per AGLC4 Rule 1.8.3.
 *
 * Group 1 is the rule's own "generally italicised" list, encoded verbatim.
 * Groups 2–3 are Macquarie-dependent provisional terms kept italic under the
 * conservative proxy pass (see the module header):
 *  - Group 2 ("Macquarie-pass priority") appear in a mainstream or legal
 *    dictionary, so the proxy cannot rule out a Macquarie listing — they are
 *    kept italic as legal terms of art but are the terms most likely to become
 *    roman once Macquarie is checked.
 *  - Group 3 are essentially absent from free general dictionaries (legal
 *    glossaries / Wiktionary appendix only), so italic is well-supported.
 *
 * Sorted alphabetically within each group.
 */
export const LATIN_TERMS_ITALICISED: ReadonlySet<string> = new Set<string>([
  // ── Group 1: Rule 1.8.3 "generally italicised" list (verbatim) ──
  "contra proferentem",
  "ex ante",
  "jus ad bellum",
  "lex fori",
  "ne bis in idem",
  "quantum meruit",
  "stare decisis",
  // ── Group 2: provisional, kept italic — Macquarie-pass priority ──
  // Present in a mainstream/legal dictionary; the free proxy cannot confirm
  // Macquarie absence, and the conservative rule keeps legal terms of art
  // italic pending that check (DECISION-016).
  "actus reus",
  "certiorari",
  "corpus delicti",
  "corpus juris",
  "cy-pres",
  "de novo",
  "in camera",
  "in extenso",
  "in limine",
  "in loco parentis",
  "in personam",
  "in re",
  "in rem",
  "inter se",
  "inter vivos",
  "intra vires",
  "lex loci",
  "lex loci delicti",
  "lis pendens",
  "locus standi",
  "mandamus",
  "mens rea",
  "nisi prius",
  "nolle prosequi",
  "onus probandi",
  "per curiam",
  "quo warranto",
  "res judicata",
  "sub judice",
  "uberrimae fidei",
  "vis major",
  // ── Group 3: provisional, confidently italic — absent from free general dicts ──
  "animus possidendi",
  "ejusdem generis",
  "en ventre sa mere",
  "functus officio",
  "inter partes",
  "nemo dat quod non habet",
  "noscitur a sociis",
  "per incuriam",
  "pro tanto",
  "sub nom",
  "suo motu",
  "vel non",
  "vexata quaestio",
  "volenti non fit injuria",
]);

/**
 * Latin and foreign terms that should NOT be italicised per AGLC4 Rule 1.8.3.
 *
 * Group 1 is the rule's own "generally not italicised" list (Macquarie-listed),
 * encoded verbatim — 29 terms. Group 2 comprises close variants of listed
 * terms (plural/noun forms sharing the listed term's dictionary entry) and
 * terms absorbed into common English or reserved by other AGLC4 rules (eg
 * 'ibid', rule 1.4.3). Group 3 are general-English borrowings moved here by the
 * 2026-07-03 free-source proxy pass: each has a Merriam-Webster main entry plus
 * strong conventional-dictionary coverage and everyday non-legal currency, so
 * Macquarie almost certainly lists them (DECISION-016; proxy — Macquarie
 * confirmation pending).
 *
 * Sorted alphabetically within each group.
 */
export const LATIN_TERMS_EXCEPTIONS: ReadonlySet<string> = new Set<string>([
  // ── Group 1: Rule 1.8.3 "generally not italicised" list (verbatim) ──
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
  // ── Group 2: Variants of listed terms (same treatment as the listed form) ──
  "bona fides",
  "dicta",
  "dictum",
  "obiter dicta",
  // ── Group 2: Common-English / AGLC-internal terms (not on the rule's lists) ──
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
  // ── Group 3: General-English borrowings — proxy-romanised 2026-07-03 ──
  // MW main entry + strong conventional-dictionary coverage + everyday non-legal
  // currency → near-certain Macquarie listing. Proxy only; Macquarie pending
  // (DECISION-016). Deliberately excludes legal terms of art (see ITALICISED
  // group 2), which stay italic under the conservative rule.
  "ex officio",
  "in situ",
  "modus operandi",
  "mutatis mutandis",
  "pro bono",
  "pro forma",
  "pro rata",
  "pro tempore",
  "qua",
  "quasi",
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
