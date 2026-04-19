/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * bibtexImporter.ts — Parse BibTeX/BibLaTeX strings and import entries
 * into the Obiter citation store.
 */

import type { Citation, SourceType, Author } from "../types/citation";
import { CitationStore } from "../store/citationStore";

// ─── BibEntry Interface ─────────────────────────────────────────────────────

export interface BibEntry {
  entryType: string; // e.g. "article", "book", "misc"
  citeKey: string; // e.g. "smith2020"
  fields: Record<string, string>; // field name → value
}

// ─── LaTeX Escape Mapping ───────────────────────────────────────────────────

const LATEX_ESCAPES: Record<string, string> = {
  "\\&": "&",
  "\\%": "%",
  "\\$": "$",
  "\\#": "#",
  "\\_": "_",
  "\\{": "{",
  "\\}": "}",
  "\\~": "~",
  "\\^": "^",
  "\\\\": "\\",
  "\\textendash": "\u2013",
  "\\textemdash": "\u2014",
  "\\textquoteleft": "\u2018",
  "\\textquoteright": "\u2019",
  "\\textquotedblleft": "\u201C",
  "\\textquotedblright": "\u201D",
  "\\ldots": "\u2026",
  "\\ss": "\u00DF",
  "\\o": "\u00F8",
  "\\O": "\u00D8",
  "\\ae": "\u00E6",
  "\\AE": "\u00C6",
  "\\oe": "\u0153",
  "\\OE": "\u0152",
  "\\aa": "\u00E5",
  "\\AA": "\u00C5",
  "\\i": "\u0131",
  "\\l": "\u0142",
  "\\L": "\u0141",
};

/** Map of combining accent commands to Unicode combining characters. */
const ACCENT_MAP: Record<string, string> = {
  "`": "\u0300", // grave
  "'": "\u0301", // acute
  "^": "\u0302", // circumflex
  "\"": "\u0308", // diaeresis
  "~": "\u0303", // tilde
  "=": "\u0304", // macron
  ".": "\u0307", // dot above
  "u": "\u0306", // breve
  "v": "\u030C", // caron
  "H": "\u030B", // double acute
  "c": "\u0327", // cedilla
  "k": "\u0328", // ogonek
  "d": "\u0323", // dot below
  "b": "\u0331", // macron below
  "r": "\u030A", // ring above
  "t": "\u0361", // tie
};

// Common pre-composed accent results for normalisation
const PRECOMPOSED: Record<string, Record<string, string>> = {
  "'": {
    a: "\u00E1", A: "\u00C1", e: "\u00E9", E: "\u00C9",
    i: "\u00ED", I: "\u00CD", o: "\u00F3", O: "\u00D3",
    u: "\u00FA", U: "\u00DA", y: "\u00FD", Y: "\u00DD",
    c: "\u0107", C: "\u0106", n: "\u0144", N: "\u0143",
    s: "\u015B", S: "\u015A", z: "\u017A", Z: "\u0179",
  },
  "`": {
    a: "\u00E0", A: "\u00C0", e: "\u00E8", E: "\u00C8",
    i: "\u00EC", I: "\u00CC", o: "\u00F2", O: "\u00D2",
    u: "\u00F9", U: "\u00D9",
  },
  "^": {
    a: "\u00E2", A: "\u00C2", e: "\u00EA", E: "\u00CA",
    i: "\u00EE", I: "\u00CE", o: "\u00F4", O: "\u00D4",
    u: "\u00FB", U: "\u00DB",
  },
  "\"": {
    a: "\u00E4", A: "\u00C4", e: "\u00EB", E: "\u00CB",
    i: "\u00EF", I: "\u00CF", o: "\u00F6", O: "\u00D6",
    u: "\u00FC", U: "\u00DC", y: "\u00FF",
  },
  "~": {
    a: "\u00E3", A: "\u00C3", n: "\u00F1", N: "\u00D1",
    o: "\u00F5", O: "\u00D5",
  },
  "c": {
    c: "\u00E7", C: "\u00C7",
  },
};

// ─── LaTeX to Unicode Conversion ────────────────────────────────────────────

/**
 * Convert common LaTeX escape sequences and accent commands to Unicode.
 */
function convertLatexToUnicode(input: string): string {
  let result = input;

  // Remove outer braces that BibTeX uses for case protection
  result = result.replace(/\{([^{}]*)\}/g, "$1");

  // Handle accent commands: \'{e}, \'e, \"{o}, etc.
  // Pattern: \ACCENT{CHAR} or \ACCENT CHAR
  result = result.replace(
    /\\([`'^"~=.ubvHckdrt])\{([a-zA-Z])\}/g,
    (_match, accent: string, char: string) => {
      const precomp = PRECOMPOSED[accent];
      if (precomp && precomp[char]) return precomp[char];
      const combining = ACCENT_MAP[accent];
      if (combining) return char + combining;
      return char;
    },
  );

  // Without braces: \'e
  result = result.replace(
    /\\([`'^"~=.])\s?([a-zA-Z])/g,
    (_match, accent: string, char: string) => {
      const precomp = PRECOMPOSED[accent];
      if (precomp && precomp[char]) return precomp[char];
      const combining = ACCENT_MAP[accent];
      if (combining) return char + combining;
      return char;
    },
  );

  // Named commands: \ss, \o, \ae, etc.
  for (const [latex, unicode] of Object.entries(LATEX_ESCAPES)) {
    // Use split/join for literal replacement (no regex special char issues)
    result = result.split(latex).join(unicode);
  }

  // Remove any remaining LaTeX commands we don't recognise (e.g. \textbf{...})
  result = result.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1");

  // Clean up any remaining stray braces
  result = result.replace(/[{}]/g, "");

  return result.trim();
}

// ─── BibTeX Parser ──────────────────────────────────────────────────────────

/**
 * Extract the value of a BibTeX field, handling both `{...}` and `"..."` delimiters,
 * including nested braces.
 *
 * Returns the extracted value and the index after the closing delimiter.
 */
function extractFieldValue(
  input: string,
  startIndex: number,
): { value: string; endIndex: number } {
  let i = startIndex;

  // Skip whitespace
  while (i < input.length && /\s/.test(input[i])) i++;

  if (i >= input.length) return { value: "", endIndex: i };

  const delimiter = input[i];

  if (delimiter === "{") {
    // Brace-delimited: count nested braces
    let depth = 1;
    let j = i + 1;
    while (j < input.length && depth > 0) {
      if (input[j] === "{" && input[j - 1] !== "\\") depth++;
      else if (input[j] === "}" && input[j - 1] !== "\\") depth--;
      j++;
    }
    return { value: input.substring(i + 1, j - 1), endIndex: j };
  }

  if (delimiter === "\"") {
    // Quote-delimited: find closing quote (respecting escaped quotes)
    let j = i + 1;
    while (j < input.length) {
      if (input[j] === "\"" && input[j - 1] !== "\\") break;
      j++;
    }
    return { value: input.substring(i + 1, j), endIndex: j + 1 };
  }

  // Bare value (e.g. a number or a @string reference)
  let j = i;
  while (j < input.length && /[a-zA-Z0-9_]/.test(input[j])) j++;
  return { value: input.substring(i, j), endIndex: j };
}

/**
 * Parse a single BibTeX entry body (everything between the outer braces of an entry)
 * into a record of field name → raw value.
 */
function parseEntryFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let i = 0;

  while (i < body.length) {
    // Skip whitespace and commas
    while (i < body.length && /[\s,]/.test(body[i])) i++;
    if (i >= body.length) break;

    // Read field name
    let nameEnd = i;
    while (nameEnd < body.length && /[a-zA-Z0-9_-]/.test(body[nameEnd]))
      nameEnd++;
    if (nameEnd === i) {
      i++;
      continue;
    }

    const fieldName = body.substring(i, nameEnd).toLowerCase();
    i = nameEnd;

    // Skip whitespace and '='
    while (i < body.length && /\s/.test(body[i])) i++;
    if (i >= body.length || body[i] !== "=") continue;
    i++; // skip '='

    // Extract value
    const { value, endIndex } = extractFieldValue(body, i);
    fields[fieldName] = convertLatexToUnicode(value);
    i = endIndex;
  }

  return fields;
}

/**
 * Find the matching closing brace for an entry, accounting for nested braces.
 */
function findEntryEnd(input: string, openIndex: number): number {
  let depth = 1;
  let i = openIndex + 1;
  while (i < input.length && depth > 0) {
    const ch = input[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    i++;
  }
  return i;
}

/**
 * Parse a BibTeX/BibLaTeX string into structured entries.
 *
 * Handles:
 * - Curly brace `{...}` and quote `"..."` field delimiters
 * - Nested braces in field values
 * - Multiple entries separated by whitespace
 * - Common LaTeX escapes converted to Unicode
 * - `@string` definitions are skipped (not expanded)
 * - `@preamble` and `@comment` are skipped
 */
export function parseBibTeX(bibtexString: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const input = bibtexString;
  let i = 0;

  while (i < input.length) {
    // Find next '@'
    const atIndex = input.indexOf("@", i);
    if (atIndex === -1) break;

    // Read entry type
    let typeEnd = atIndex + 1;
    while (typeEnd < input.length && /[a-zA-Z]/.test(input[typeEnd]))
      typeEnd++;

    const entryType = input.substring(atIndex + 1, typeEnd).toLowerCase();

    // Skip @string, @preamble, @comment
    if (
      entryType === "string" ||
      entryType === "preamble" ||
      entryType === "comment"
    ) {
      // Find the closing brace and skip
      const openBrace = input.indexOf("{", typeEnd);
      if (openBrace === -1) {
        i = typeEnd;
        continue;
      }
      i = findEntryEnd(input, openBrace);
      continue;
    }

    // Find opening brace
    const openBrace = input.indexOf("{", typeEnd);
    if (openBrace === -1) {
      i = typeEnd;
      continue;
    }

    // Find entry end (matching closing brace)
    const entryEnd = findEntryEnd(input, openBrace);
    const entryBody = input.substring(openBrace + 1, entryEnd - 1);

    // The cite key is everything before the first comma
    const firstComma = entryBody.indexOf(",");
    if (firstComma === -1) {
      i = entryEnd;
      continue;
    }

    const citeKey = entryBody.substring(0, firstComma).trim();
    const fieldsBody = entryBody.substring(firstComma + 1);
    const fields = parseEntryFields(fieldsBody);

    entries.push({ entryType, citeKey, fields });
    i = entryEnd;
  }

  return entries;
}

// ─── Entry Type to SourceType Mapping ───────────────────────────────────────

const ENTRY_TYPE_MAP: Record<string, SourceType> = {
  article: "journal.article",
  book: "book",
  inbook: "book.chapter",
  incollection: "book.chapter",
  misc: "internet_material",
  phdthesis: "thesis",
  mastersthesis: "thesis",
  techreport: "report",
  inproceedings: "conference_paper",
  conference: "conference_paper",
  legislation: "legislation.statute",
  case: "case.reported",
};

function mapEntryType(entryType: string): SourceType {
  return ENTRY_TYPE_MAP[entryType] || "internet_material";
}

// ─── Author Parsing ─────────────────────────────────────────────────────────

/**
 * Parse a BibTeX author string into an array of Author objects.
 *
 * BibTeX format: "Last, First and Last, First and ..."
 * Also handles "First Last" (no comma) format.
 */
function parseAuthors(authorField: string): Author[] {
  if (!authorField.trim()) return [];

  // Split on " and " (case-insensitive, surrounded by spaces)
  const parts = authorField.split(/\s+and\s+/i);

  return parts
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return null;

      // "Last, First" format
      if (trimmed.includes(",")) {
        const [surname, ...rest] = trimmed.split(",");
        return {
          surname: surname.trim(),
          givenNames: rest.join(",").trim(),
        };
      }

      // "First Last" format — last token is surname
      const tokens = trimmed.split(/\s+/);
      if (tokens.length === 1) {
        return { surname: tokens[0], givenNames: "" };
      }

      const surname = tokens[tokens.length - 1];
      const givenNames = tokens.slice(0, -1).join(" ");
      return { surname, givenNames };
    })
    .filter((a): a is Author => a !== null);
}

// ─── Mapping BibEntry → Citation ────────────────────────────────────────────

/**
 * Map a parsed BibTeX entry to an Obiter Citation record.
 */
export function mapBibEntryToObiter(entry: BibEntry): Citation {
  const sourceType = mapEntryType(entry.entryType);
  const now = new Date().toISOString();
  const f = entry.fields;

  const data: Record<string, unknown> = {};

  // Authors
  if (f.author) {
    data.authors = parseAuthors(f.author);
  }

  // Editors (for books/collections)
  if (f.editor) {
    data.editors = parseAuthors(f.editor);
  }

  // Title
  if (f.title) {
    data.title = f.title;
  }

  // Year — prefer "year", fall back to extracting from "date" (BibLaTeX)
  if (f.year) {
    data.year = f.year;
  } else if (f.date) {
    // BibLaTeX date format: YYYY-MM-DD or YYYY
    const yearMatch = f.date.match(/^(\d{4})/);
    if (yearMatch) data.year = yearMatch[1];
  }

  // Journal-specific
  if (f.journal || f.journaltitle) {
    data.journalName = f.journal || f.journaltitle;
  }
  if (f.volume) data.volume = f.volume;
  if (f.number || f.issue) data.issue = f.number || f.issue;
  if (f.pages) {
    // BibTeX uses "--" for page ranges; normalise to single dash
    const pages = f.pages.replace(/--/g, "\u2013");
    // Extract starting page
    const startPage = pages.split(/[-\u2013]/)[0].trim();
    data.startingPage = startPage;
    data.pages = pages;
  }

  // Publisher/place
  if (f.publisher) data.publisher = f.publisher;
  if (f.address || f.location) {
    data.placeOfPublication = f.address || f.location;
  }

  // Edition
  if (f.edition) data.edition = f.edition;

  // URL / DOI
  if (f.url) {
    data.url = f.url;
  } else if (f.doi) {
    data.url = f.doi.startsWith("http")
      ? f.doi
      : `https://doi.org/${f.doi}`;
  }

  // Thesis type
  if (
    sourceType === "thesis" &&
    (entry.entryType === "phdthesis" || entry.entryType === "mastersthesis")
  ) {
    data.thesisType =
      entry.entryType === "phdthesis" ? "PhD Thesis" : "Masters Thesis";
    if (f.school || f.institution) {
      data.institution = f.school || f.institution;
    }
  }

  // Book chapter: booktitle
  if (sourceType === "book.chapter" && f.booktitle) {
    data.bookTitle = f.booktitle;
  }

  // Case-specific
  if (sourceType === "case.reported" && f.title) {
    data.caseName = f.title;
  }

  // Conference
  if (sourceType === "conference_paper" && f.booktitle) {
    data.proceedingsTitle = f.booktitle;
  }

  // Abstract and note (store as comments)
  if (f.abstract) data.comments = f.abstract;
  if (f.note && !data.comments) data.comments = f.note;

  // ISBN/ISSN
  if (f.isbn) data.isbn = f.isbn;
  if (f.issn) data.issn = f.issn;

  return {
    id: generateUUID(),
    aglcVersion: "4",
    sourceType,
    data,
    shortTitle: f.shorttitle || undefined,
    tags: ["imported-from-bibtex"],
    createdAt: now,
    modifiedAt: now,
  };
}

// ─── Deduplication ──────────────────────────────────────────────────────────

/**
 * Check whether a BibEntry is a duplicate of an existing citation
 * by matching title + year + first author surname.
 */
function isDuplicate(entry: BibEntry, existing: Citation[]): boolean {
  const entryTitle = (entry.fields.title || "").toLowerCase().trim();
  const entryYear = (
    entry.fields.year ||
    (entry.fields.date || "").substring(0, 4) ||
    ""
  ).trim();

  let entryFirstAuthor = "";
  if (entry.fields.author) {
    const authors = parseAuthors(entry.fields.author);
    if (authors.length > 0) {
      entryFirstAuthor = authors[0].surname.toLowerCase().trim();
    }
  }

  return existing.some((c) => {
    const cTitle = (
      (typeof c.data.title === "string" ? c.data.title : "") ||
      (typeof c.data.caseName === "string" ? c.data.caseName : "")
    )
      .toLowerCase()
      .trim();
    const cYear = (
      typeof c.data.year === "string" ? c.data.year : ""
    ).trim();

    let cFirstAuthor = "";
    if (Array.isArray(c.data.authors) && c.data.authors.length > 0) {
      const first = c.data.authors[0] as { surname?: string };
      cFirstAuthor = (first.surname || "").toLowerCase().trim();
    }

    return (
      entryTitle !== "" &&
      entryTitle === cTitle &&
      entryYear === cYear &&
      entryFirstAuthor === cFirstAuthor
    );
  });
}

// ─── Import Function ────────────────────────────────────────────────────────

/**
 * Parse a BibTeX/BibLaTeX string, map entries to Obiter citations,
 * deduplicate against the existing store, and add new citations.
 *
 * Returns the count of imported and skipped entries.
 */
export async function importBibTeX(
  bibtexString: string,
  store: CitationStore,
): Promise<{ imported: number; skipped: number }> {
  const entries = parseBibTeX(bibtexString);
  const existingCitations = store.getAll();

  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (isDuplicate(entry, existingCitations)) {
      skipped++;
      continue;
    }

    const citation = mapBibEntryToObiter(entry);
    await store.add(citation);
    // Also add to local list so subsequent entries can deduplicate
    existingCitations.push(citation);
    imported++;
  }

  return { imported, skipped };
}

// ─── UUID Helper ────────────────────────────────────────────────────────────

function generateUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
