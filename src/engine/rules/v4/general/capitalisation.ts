/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Rule 1.7 — Capitalisation
 *
 * Titles of sources cited in footnotes should be capitalised according to
 * title-case conventions: capitalise the first letter of every word except
 * articles, short prepositions (4 or fewer letters), and coordinating
 * conjunctions — unless they are the first or last word of the title.
 */

/** Articles that are lowercased in title-case (unless first/last word). */
const ARTICLES: ReadonlySet<string> = new Set(["a", "an", "the"]);

/**
 * Prepositions of 4 or fewer letters that are lowercased in title-case
 * (unless first/last word).
 */
const SHORT_PREPOSITIONS: ReadonlySet<string> = new Set([
  "in",
  "on",
  "at",
  "to",
  "for",
  "from",
  "with",
  "by",
  "of",
  "as",
]);

/** Coordinating conjunctions that are lowercased in title-case (unless first/last word). */
const CONJUNCTIONS: ReadonlySet<string> = new Set([
  "and",
  "but",
  "or",
  "nor",
  "yet",
  "so",
]);

/**
 * Returns true if the word should remain lowercase in AGLC4 title-case
 * (i.e. it is an article, short preposition, or conjunction).
 */
function isMinorWord(word: string): boolean {
  const lower = word.toLowerCase();
  return ARTICLES.has(lower) || SHORT_PREPOSITIONS.has(lower) || CONJUNCTIONS.has(lower);
}

/**
 * Capitalise the first letter of a word, lowercasing the rest.
 * Preserves all-uppercase words of 2+ letters (likely acronyms, e.g. "UN", "EU", "ASIC").
 */
function capitaliseWord(word: string): string {
  if (word.length === 0) return word;
  // Preserve acronyms: all-uppercase words of 2+ letters
  if (word.length >= 2 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Converts text to AGLC4 title-case per Rule 1.7.
 *
 * Capitalises the first letter of all words except articles (a, an, the),
 * prepositions of 4 or fewer letters (in, on, at, to, for, from, with, by,
 * of, as), and conjunctions (and, but, or, nor, yet, so) — unless the word
 * is the first or last word.
 *
 * @param text - The text to convert to title-case.
 * @returns The text converted to AGLC4 title-case.
 *
 * @see AGLC4, Rule 1.7.
 */
export function toTitleCase(text: string): string {
  const words = text.split(/(\s+)/);

  // Find indices of actual words (not whitespace).
  const wordIndices: number[] = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i].trim().length > 0) {
      wordIndices.push(i);
    }
  }

  if (wordIndices.length === 0) return text;

  const firstWordIndex = wordIndices[0];
  const lastWordIndex = wordIndices[wordIndices.length - 1];

  return words
    .map((segment, index) => {
      // Preserve whitespace segments as-is.
      if (segment.trim().length === 0) return segment;

      // Always capitalise first and last words.
      if (index === firstWordIndex || index === lastWordIndex) {
        return capitaliseWord(segment);
      }

      // Lowercase minor words; capitalise everything else.
      if (isMinorWord(segment)) {
        return segment.toLowerCase();
      }

      return capitaliseWord(segment);
    })
    .join("");
}

/**
 * Checks whether a title follows AGLC4 capitalisation rules (Rule 1.7)
 * and returns the suggested correction.
 *
 * @param title - The title to validate.
 * @returns An object with `valid` (true if the title already conforms) and
 *   `suggested` (the corrected title-case form).
 *
 * @see AGLC4, Rule 1.7.
 */
export function validateCapitalisation(title: string): {
  valid: boolean;
  suggested: string;
} {
  const suggested = toTitleCase(title);
  return {
    valid: title === suggested,
    suggested,
  };
}
