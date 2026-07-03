/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Rule 1.7 — Capitalisation (PDF pp 49–51)
 *
 * In titles of all cited materials and in all headings, capitalise the
 * first letter of: the first word of the title/heading (and of any
 * subtitle/subheading); the word following the hyphen in a hyphenated
 * word; and every other word except articles, conjunctions and
 * prepositions. There is no length limit on lowercased prepositions (the
 * rule's own examples include 'before' and 'within'), and no special rule
 * for the last word of a title.
 */

/** Articles that are lowercased in title-case (unless opening the title/subtitle). */
const ARTICLES: ReadonlySet<string> = new Set(["a", "an", "the"]);

/**
 * Prepositions that are lowercased in title-case (unless opening the
 * title/subtitle). Rule 1.7 lowercases prepositions without a length
 * limit — its own examples include 'before' and 'within'.
 */
const PREPOSITIONS: ReadonlySet<string> = new Set([
  "aboard",
  "about",
  "above",
  "across",
  "after",
  "against",
  "along",
  "amid",
  "amidst",
  "among",
  "amongst",
  "around",
  "as",
  "at",
  "before",
  "behind",
  "below",
  "beneath",
  "beside",
  "besides",
  "between",
  "beyond",
  "by",
  "concerning",
  "despite",
  "down",
  "during",
  "except",
  // Lowercase in the guide's own ex 2 ('… Works following IceTV …', rule 5.2).
  "following",
  "for",
  "from",
  "in",
  "inside",
  "into",
  "near",
  "of",
  "off",
  "on",
  "onto",
  "out",
  "outside",
  "over",
  "past",
  "per",
  "regarding",
  "since",
  "through",
  "throughout",
  "to",
  "toward",
  "towards",
  "under",
  "underneath",
  "until",
  "unto",
  "up",
  "upon",
  "via",
  "with",
  "within",
  "without",
]);

/** Conjunctions that are lowercased in title-case (unless opening the title/subtitle). */
const CONJUNCTIONS: ReadonlySet<string> = new Set(["and", "but", "or", "nor", "yet", "so"]);

/**
 * Returns true if the word should remain lowercase in AGLC4 title-case
 * (i.e. it is an article, preposition, or conjunction).
 */
function isMinorWord(word: string): boolean {
  const lower = word.toLowerCase();
  return ARTICLES.has(lower) || PREPOSITIONS.has(lower) || CONJUNCTIONS.has(lower);
}

/**
 * Capitalise the first letter of a word.
 *
 * - Preserves all-uppercase words of 2+ letters (likely acronyms, e.g.
 *   "UN", "EU", "ASIC").
 * - Preserves internal capitals (e.g. "McPherson", "eBay") — only an
 *   all-lowercase remainder is normalised.
 * - Capitalises the letter following a hyphen in a hyphenated word
 *   (Rule 1.7, e.g. "Twenty-First", "Self-Determination").
 */
function capitaliseWord(word: string): string {
  if (word.length === 0) return word;
  // Preserve acronyms: all-uppercase words of 2+ letters
  if (word.length >= 2 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
    return word;
  }
  // Hyphenated words: capitalise the word following each hyphen (Rule 1.7)
  if (word.includes("-")) {
    return word
      .split("-")
      .map((part) => capitaliseWord(part))
      .join("-");
  }
  // Capitalise the first LETTER (skipping leading quotes/parentheses).
  const firstLetterIdx = word.search(/[A-Za-z]/);
  if (firstLetterIdx === -1) return word;
  const prefix = word.slice(0, firstLetterIdx);
  const rest = word.slice(firstLetterIdx + 1);
  // Preserve internal capitals (proper nouns like "McPherson")
  const normalisedRest = /[A-Z]/.test(rest) ? rest : rest.toLowerCase();
  return prefix + word.charAt(firstLetterIdx).toUpperCase() + normalisedRest;
}

/**
 * Converts text to AGLC4 title-case per Rule 1.7.
 *
 * Capitalises the first letter of the first word of the title and of any
 * subtitle (a word following ':', '—' or '–'), the word following the
 * hyphen in a hyphenated word, and every other word except articles
 * (a, an, the), prepositions (of any length — e.g. in, of, before,
 * within), and conjunctions (and, but, or, nor, yet, so).
 *
 * There is no last-word capitalisation rule in AGLC4.
 *
 * @param text - The text to convert to title-case.
 * @returns The text converted to AGLC4 title-case.
 *
 * @see AGLC4, Rule 1.7 (PDF pp 49–51).
 */
export function toTitleCase(text: string): string {
  const segments = text.split(/(\s+)/);

  let atTitleStart = true; // start of title or subtitle → always capitalise

  return segments
    .map((segment) => {
      // Preserve whitespace segments as-is.
      if (segment.trim().length === 0) return segment;

      // Standalone dash marks a subtitle boundary.
      if (/^[—–]$/.test(segment)) {
        atTitleStart = true;
        return segment;
      }

      const openingWord = atTitleStart;
      // A word ending with ':' (or a dash) starts a subtitle after it.
      atTitleStart = /[:—–]$/.test(segment);

      if (!openingWord && isMinorWord(stripPunctuation(segment))) {
        return segment.toLowerCase();
      }

      return capitaliseWord(segment);
    })
    .join("");
}

/** Strips leading/trailing punctuation for minor-word comparison. */
function stripPunctuation(word: string): string {
  return word.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
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
