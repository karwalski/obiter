/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Author } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Post-nominals that must be stripped from author names (Rule 4.1.1).
 * Matched case-insensitively against trailing tokens.
 */
const POST_NOMINALS: ReadonlySet<string> = new Set([
  "AM",
  "AO",
  "AC",
  "AD",
  "AK",
  "CVO",
  "GC",
  "MG",
  "OAM",
  "OBE",
  "MBE",
  "CBE",
  "KBE",
  "DBE",
  "KCMG",
  "GCMG",
  "CH",
  "OM",
  "QC",
  "KC",
  "SC",
  "PhD",
  "DPhil",
  "SJD",
  "JSD",
  "LLB",
  "LLM",
  "LLD",
  "BA",
  "MA",
  "BSc",
  "MSc",
  "BCL",
  "BEc",
  "BComm",
  "MCL",
  "JD",
  "MD",
  "FAAL",
  "FASSA",
  "FBA",
  "FRSA",
  "PSM",
  "RFD",
  "ED",
  // Imperial and Royal Victorian orders, gallantry and service awards
  "CMG",
  "CB",
  "GCB",
  "KCB",
  "DCB",
  "GCVO",
  "KCVO",
  "DCVO",
  "LVO",
  "MVO",
  "ISO",
  "DSC",
  "DSO",
  "MC",
  "AFC",
  "DFC",
  "GM",
  // Fellowships and further degrees
  "FRS",
  "FAHA",
  "FTSE",
  "FRSN",
  "FACLM",
  "MBBS",
  "BCom",
  "BEng",
  "MPhil",
  "DSc",
  "DLitt",
  "LittD",
  "JP",
]);

/**
 * Honorific titles that are retained in author names (Rule 4.1.1).
 * All other honorifics (eg "Professor", "Dr", "The Hon") are stripped.
 */
const RETAINED_TITLES: ReadonlySet<string> = new Set([
  "Sir",
  "Dame",
  "Lord",
  "Lady",
  "Viscount",
  "Baron",
  "Baroness",
]);

/**
 * Honorific prefixes to strip when they appear at the start of givenNames.
 * Matched case-insensitively (Rule 4.1.1, eg 'Associate Professor Katy
 * Barnett' → 'Katy Barnett').
 */
const STRIPPED_TITLE_PREFIXES: ReadonlyArray<string> = [
  "The Honourable",
  "The Hon",
  "Honourable",
  "Hon",
  "Associate Professor",
  "Assistant Professor",
  "Professor",
  "Prof",
  "Doctor",
  "Dr",
  "The Right Honourable",
  "The Rt Hon",
  "Rt Hon",
  "Reverend",
  "Rev",
];

/**
 * Conventional titles stripped from citations (Rule 4.1.1, eg 'Ms Sharon
 * Rodrick' → 'Sharon Rodrick'). Matched case-sensitively so that initials
 * such as 'MS' are never mistaken for a title.
 */
const CONVENTIONAL_TITLE_PREFIXES: ReadonlyArray<string> = ["Mrs", "Miss", "Ms", "Mr"];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strips post-nominal letters from a name string.
 */
function stripPostNominals(name: string): string {
  const tokens = name.split(/\s+/);
  // Walk backwards, removing any trailing post-nominals (with or without commas)
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1].replace(/,/g, "");
    if (POST_NOMINALS.has(last)) {
      tokens.pop();
    } else {
      break;
    }
  }
  return tokens.join(" ");
}

/**
 * Strips non-retained honorific and conventional titles from the start of a
 * given-names string, repeating until no title remains so that stacked
 * titles (eg 'The Hon Dr John Cockburn') are fully stripped (Rule 4.1.1).
 * Retained titles (Sir, Dame, Lord, Lady, Viscount, Baron, Baroness) are kept.
 */
function stripHonorifics(givenNames: string): string {
  let result = givenNames.trim();

  // Try stripping known non-retained prefixes (longest first for greedy
  // match), looping so stacked titles all come off.
  const sorted = [...STRIPPED_TITLE_PREFIXES].sort((a, b) => b.length - a.length);
  let stripped = true;
  while (stripped && result.length > 0) {
    stripped = false;
    for (const prefix of sorted) {
      const re = new RegExp(`^${prefix}\\b\\s*`, "i");
      if (re.test(result)) {
        result = result.replace(re, "").trim();
        stripped = true;
        break;
      }
    }
    if (!stripped) {
      // Conventional titles (Ms, Mr, Mrs, Miss) are matched case-sensitively
      // so initials such as 'MS' survive.
      for (const prefix of CONVENTIONAL_TITLE_PREFIXES) {
        if (result === prefix || result.startsWith(prefix + " ")) {
          result = result.slice(prefix.length).trim();
          stripped = true;
          break;
        }
      }
    }
  }

  return result;
}

/**
 * Collapses initials so they have no spaces or full stops between them.
 * E.g. "H. L. A." -> "HLA", "H L A" -> "HLA", "H.L.A." -> "HLA".
 * Mixed initials and words are handled: "H.L.A. Herbert" -> "HLA Herbert".
 */
function collapseInitials(name: string): string {
  // Split into tokens and rebuild, collapsing consecutive single-letter
  // initials (with or without dots) into a single block.
  const tokens = name.split(/\s+/);
  const result: string[] = [];
  let initialBlock = "";

  for (const token of tokens) {
    // Check if token is a dotted-initial sequence: "A.", "H.L.A.", "R.J."
    if (/^([A-Z]\.)+$/.test(token)) {
      // Extract all letters and add to initial block
      initialBlock += token.replace(/\./g, "");
      continue;
    }

    // Check if token is a single uppercase letter: "A", "H"
    if (/^[A-Z]$/.test(token)) {
      initialBlock += token;
      continue;
    }

    // Not an initial — flush any accumulated initials first
    if (initialBlock) {
      result.push(initialBlock);
      initialBlock = "";
    }
    result.push(token);
  }

  // Flush remaining initials
  if (initialBlock) {
    result.push(initialBlock);
  }

  return result.join(" ").trim();
}

/**
 * Stricter initials collapsing for NZLSG (MULTI-012).
 *
 * NZLSG Rule 6.1: No spaces between initials, even when mixed with names.
 * E.g. "A J P Taylor" -> "AJP Taylor", "A. J. P. Taylor" -> "AJP Taylor".
 *
 * This mode additionally collapses runs of single uppercase letters that
 * precede a multi-character word, removing spaces between them. The standard
 * collapseInitials already handles this for consecutive initials, but this
 * mode is explicit about the NZLSG requirement.
 *
 * @param name - The name string to process.
 * @returns The name with all initials collapsed without spaces.
 */
export function collapseInitialsStrict(name: string): string {
  // First apply normal collapse
  const collapsed = collapseInitials(name);

  // Then merge any remaining single-letter tokens that are adjacent to
  // initial blocks. E.g. "A JP Taylor" is already handled, but ensure
  // edge cases like separated initials before names are caught.
  const tokens = collapsed.split(/\s+/);
  const result: string[] = [];
  let initialBlock = "";

  for (const token of tokens) {
    if (/^[A-Z]+$/.test(token) && token.length <= 3) {
      // Could be an initial block or a short abbreviation
      // If it looks like initials (all caps, 1-3 chars), accumulate
      initialBlock += token;
      continue;
    }

    if (initialBlock) {
      result.push(initialBlock);
      initialBlock = "";
    }
    result.push(token);
  }

  if (initialBlock) {
    result.push(initialBlock);
  }

  return result.join(" ").trim();
}

/**
 * Processes given names: strips honorifics, post-nominals, collapses initials.
 */
function processGivenNames(givenNames: string): string {
  let result = stripHonorifics(givenNames);
  result = stripPostNominals(result);
  result = collapseInitials(result);
  return result.trim();
}

/**
 * Extracts a retained title from the start of given names, if present.
 * Returns [title | null, remainingGivenNames].
 */
function extractRetainedTitle(givenNames: string): [string | null, string] {
  const trimmed = givenNames.trim();
  for (const title of RETAINED_TITLES) {
    if (trimmed === title || trimmed.startsWith(title + " ")) {
      return [title, trimmed.slice(title.length).trim()];
    }
  }
  return [null, trimmed];
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Formats an author name as it appears on the title page (Rule 4.1.1).
 *
 * AGLC4 Rule 4.1.1: Authors should be cited as their name appears on the
 * title page of the source. Post-nominals should not be included. Titles
 * should not be included except for Sir, Dame, Lord, Lady, Viscount, Baron
 * and Baroness. Initials should be written without spaces or full stops.
 *
 * @returns Formatted name as `Given Names Surname` (e.g. `HLA Hart`, `Sir Anthony Mason`)
 */
export function formatAuthorName(author: Author): string {
  const givenNames = author.givenNames ?? "";
  const [retainedTitle, restOfGiven] = extractRetainedTitle(givenNames);
  const processedGiven = processGivenNames(restOfGiven);
  const surname = stripPostNominals((author.surname ?? "").trim());

  const parts: string[] = [];
  if (retainedTitle) {
    parts.push(retainedTitle);
  }
  if (processedGiven) {
    parts.push(processedGiven);
  }
  parts.push(surname);

  return parts.join(" ");
}

/**
 * Inverts an author name for bibliography entries: `Surname, Given Names`.
 *
 * AGLC4 Rule 4.1.1: In bibliographies, the first-listed author's name
 * is inverted (surname first) for alphabetical ordering.
 *
 * @returns Inverted name (e.g. `Hart, HLA`)
 */
export function invertAuthorName(author: Author): string {
  const [retainedTitle, restOfGiven] = extractRetainedTitle(author.givenNames ?? "");
  const processedGiven = processGivenNames(restOfGiven);
  const surname = stripPostNominals((author.surname ?? "").trim());

  const givenParts: string[] = [];
  if (retainedTitle) {
    givenParts.push(retainedTitle);
  }
  if (processedGiven) {
    givenParts.push(processedGiven);
  }

  const givenStr = givenParts.join(" ");
  if (givenStr) {
    return `${surname}, ${givenStr}`;
  }
  return surname;
}

/**
 * Joins a list of already-formatted author names per AGLC4 Rule 4.1.2.
 *
 * Two or three names are all listed, the last joined with 'and'; four or
 * more collapse to the first name followed by 'et al'. The same treatment
 * applies in subsequent references (Rule 1.4.1, guide ex 5: 'Edelman and
 * Bant (n 2) 260. See Rishworth et al (n 3).'), so the resolver reuses this
 * helper with bare surnames.
 */
export function joinAuthorNames(names: string[]): string {
  if (names.length === 0) {
    return "";
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length <= 3) {
    return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  }
  // 4+ authors: first author + et al
  return names[0] + " et al";
}

/**
 * Returns an author's surname as it appears in a subsequent reference
 * (Rule 1.4.1): post-nominals stripped, as in the first citation.
 */
export function formatAuthorSurname(author: Author): string {
  return stripPostNominals((author.surname ?? "").trim());
}

/**
 * Formats a list of authors, handling multiple-author rules and editor
 * suffixes (Rules 4.1.2, 4.1.3).
 *
 * AGLC4 Rule 4.1.2: Where a source has two or three authors, all should
 * be listed with 'and' before the last author.
 *
 * AGLC4 Rule 4.1.3: Where a source has four or more authors, cite the
 * first-listed author followed by 'et al'.
 *
 * If the authors are editors, append '(ed)' for a single editor or
 * '(eds)' for multiple editors.
 *
 * AGLC4 Rule 4.1.5: an author whose judicial title appears on the source
 * itself (`judicialTitle` populated) is rendered through
 * {@link formatJudicialAuthor}, so the title precedes the name (eg
 * 'Justice Michael Kirby', guide ex 19).
 *
 * @returns FormattedRun[] — plain text (no italic, no bold)
 */
export function formatAuthors(authors: Author[], isEditor?: boolean): FormattedRun[] {
  // Stored data is not always the shape the type says: the book-chapter
  // form saved editors as one string until 1.16.16, and AI-parsed input can
  // arrive as a single object. Normalise rather than throw ('e.map is not a
  // function', field report 2026-09-08).
  authors = normaliseAuthorList(authors);
  if (authors.length === 0) {
    return [];
  }

  // Rule 4.1.5: on-source judicial titles route through formatJudicialAuthor
  const displayName = (author: Author): string =>
    author.judicialTitle
      ? formatJudicialAuthor(author)
          .map((run) => run.text)
          .join("")
      : formatAuthorName(author);

  let nameStr = joinAuthorNames(authors.map(displayName));

  if (isEditor) {
    const suffix = authors.length === 1 ? " (ed)" : " (eds)";
    nameStr += suffix;
  }

  return [{ text: nameStr }];
}

/**
 * Formats a body-authored publication (Rule 4.1.4).
 *
 * AGLC4 Rule 4.1.4: Where a source is authored by an organisation or
 * government body, the body name is used as the author. If the body's
 * jurisdiction may be ambiguous, the jurisdiction abbreviation should
 * follow in parentheses. If a subdivision of the body is relevant, it
 * should be listed before the body name, separated by a comma.
 *
 * Company names lose their corporate-status designators ('Pty', 'Ltd',
 * 'Co', 'Inc') and a leading 'The' (Rule 4.1.4).
 *
 * @returns FormattedRun[] — plain text
 */
export function formatBodyAuthor(data: {
  body: string;
  jurisdiction?: string;
  subdivision?: string;
}): FormattedRun[] {
  const parts: string[] = [];

  if (data.subdivision) {
    parts.push(data.subdivision);
  }
  parts.push(normaliseBodyName(data.body));

  let text = parts.filter(Boolean).join(", ");

  if (data.jurisdiction) {
    text += ` (${data.jurisdiction})`;
  }

  return [{ text }];
}

/** Corporate-status designators dropped from company names (Rule 4.1.4). */
const CORPORATE_DESIGNATORS: ReadonlySet<string> = new Set(["Pty", "Ltd", "Co", "Inc"]);

/**
 * Normalises a body-author name per Rule 4.1.4: drops corporate-status
 * designator tokens ('Pty', 'Ltd', 'Co', 'Inc') and a leading 'The'.
 * Exported for reuse by publisher/company normalisation (Rules 6.3.1, 7.10).
 */
export function normaliseBodyName(body: string): string {
  let result = body.trim().replace(/^The\s+/, "");
  result = result
    .split(/\s+/)
    .filter((token) => !CORPORATE_DESIGNATORS.has(token.replace(/[,.]+$/, "")))
    .join(" ");
  return result.trim();
}

/**
 * Formats a judicial author (Rule 4.1.5).
 *
 * AGLC4 Rule 4.1.5: For extra-curial writing the judicial title is OMITTED
 * unless it appears on the source itself; former judicial officers lose the
 * former title. 'Sir', 'Dame' and peerage titles are always retained.
 *
 * Accordingly, callers must populate `judicialTitle` only when the title is
 * actually printed on the source being cited (eg 'Justice Michael Kirby' on
 * the article, AGLC4 ex 19 under rule 4.1.5); a serving judge whose source
 * carries no title is cited by plain name (eg James Edelman, ex 18).
 *
 * @returns FormattedRun[] — plain text
 */
export function formatJudicialAuthor(author: Author): FormattedRun[] {
  const [retainedTitle, restOfGiven] = extractRetainedTitle(author.givenNames ?? "");
  const processedGiven = processGivenNames(restOfGiven);
  const surname = stripPostNominals((author.surname ?? "").trim());

  const parts: string[] = [];

  if (author.judicialTitle) {
    parts.push(author.judicialTitle);
  }

  if (retainedTitle) {
    parts.push(retainedTitle);
  }
  if (processedGiven) {
    parts.push(processedGiven);
  }
  parts.push(surname);

  return [{ text: parts.join(" ") }];
}

// ─── Free-text author strings (DECISION-037) ────────────────────────────────

/**
 * Judicial and office titles that precede a personal name on the source
 * (Rule 4.1.5) and are dropped when reducing free text to a surname.
 */
const FREE_TEXT_TITLE_PREFIXES: ReadonlyArray<string> = [
  "Chief Justice",
  "Justice",
  "Judge",
  "Magistrate",
  "His Honour",
  "Her Honour",
  "Senator",
];

/** Generational suffixes kept with the surname ('Brennan Jr (n 94)'). */
const NAME_SUFFIXES: ReadonlySet<string> = new Set(["Jr", "Sr", "II", "III", "IV"]);

/**
 * Words that mark a free-text author as a body rather than a person
 * (Rule 4.1.4). Matched case-insensitively against each token.
 */
const BODY_WORDS: ReadonlySet<string> = new Set([
  "of",
  "for",
  "the",
  "and",
  "&",
  "commission",
  "department",
  "council",
  "committee",
  "association",
  "institute",
  "office",
  "ltd",
  "pty",
  "inc",
  "co",
  "limited",
  "government",
  "university",
  "society",
  "board",
  "authority",
  "bureau",
  "court",
  "tribunal",
  "group",
  "centre",
  "center",
  "foundation",
  "bank",
  "corporation",
  "company",
  "ministry",
  "parliament",
  "union",
  "agency",
  "service",
  "services",
  "australia",
  "australian",
  "international",
  "national",
  "federal",
  "state",
  "organisation",
  "organization",
  "network",
  "school",
  "faculty",
  "college",
  "library",
  "press",
  "review",
  "journal",
  "media",
  "news",
  "team",
  "project",
  "program",
  "programme",
  "fund",
  "trust",
  "party",
  "secretariat",
  "chamber",
  "chambers",
  "firm",
  "partners",
  "consulting",
  "forum",
  "alliance",
  "coalition",
  "federation",
  "league",
  "club",
  "church",
  "hospital",
  "health",
  "editorial",
  "editor",
  "staff",
  "anonymous",
]);

/** Lower-case surname particles kept with the surname ('van de Pol'). */
const SURNAME_PARTICLES: ReadonlySet<string> = new Set([
  "van",
  "von",
  "de",
  "der",
  "den",
  "del",
  "della",
  "di",
  "da",
  "du",
  "la",
  "le",
  "al",
  "bin",
  "ibn",
  "ter",
  "ten",
  "des",
  "dos",
  "das",
]);

/**
 * Parses a free-text author field ('Jane Smith and Bob Jones') into
 * structured authors, or returns null where any part does not look like a
 * personal name (a body author such as 'Australian Law Reform Commission',
 * a pseudonym such as 'Anonymous 10', or a single bare word).
 *
 * Rule 1.4.1 reduces personal authors to surnames in subsequent references
 * and rule 1.13 inverts the first author in a bibliography, but many chapter
 * 7 forms (newspapers, internet materials, speeches, interviews,
 * correspondence) capture the name as one string. This parser applies the
 * rule 4.1.1 name conventions to that string conservatively: when in doubt
 * the caller keeps the text verbatim, which is always a permissible reading
 * of the full citation. Recorded in docs/decisions.md as DECISION-037.
 */
export function parseFreeTextAuthors(text: string): Author[] | null {
  const parts = text
    .split(/;|,|\band\b|&/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  const authors: Author[] = [];
  for (const part of parts) {
    const author = parsePersonalName(part);
    if (!author) {
      return null;
    }
    authors.push(author);
  }
  return authors;
}

function parsePersonalName(part: string): Author | null {
  let name = stripHonorifics(part);
  for (const prefix of FREE_TEXT_TITLE_PREFIXES) {
    const re = new RegExp(`^${prefix}\\b\\s*`, "i");
    if (re.test(name)) {
      name = name.replace(re, "").trim();
    }
  }
  const [, withoutRetainedTitle] = extractRetainedTitle(name);
  name = stripPostNominals(withoutRetainedTitle.trim());

  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 5) {
    return null;
  }
  for (const token of tokens) {
    if (!/^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\u2019.-]*$/.test(token)) {
      return null;
    }
    if (BODY_WORDS.has(token.toLowerCase())) {
      return null;
    }
  }

  let end = tokens.length;
  let suffix: string | undefined;
  if (NAME_SUFFIXES.has(tokens[end - 1]) && end >= 3) {
    suffix = tokens[end - 1];
    end -= 1;
  }
  let start = end - 1;
  while (start > 1 && SURNAME_PARTICLES.has(tokens[start - 1].toLowerCase())) {
    start -= 1;
  }
  const surnameTokens = tokens.slice(start, end);
  if (suffix) {
    surnameTokens.push(suffix);
  }
  return {
    givenNames: tokens.slice(0, start).join(" "),
    surname: surnameTokens.join(" "),
  };
}

/**
 * Reduces a free-text author field to the rule 1.4.1 short-reference lead:
 * personal names become surnames joined per rule 4.1.2 ('Smith and Jones',
 * 'Rishworth et al'); anything else is returned verbatim (DECISION-037).
 */
export function formatFreeTextAuthorLead(text: string): string {
  const trimmed = text.trim();
  const authors = parseFreeTextAuthors(trimmed);
  if (!authors) {
    return trimmed;
  }
  return joinAuthorNames(authors.map(formatAuthorSurname));
}

/**
 * Coerces a stored author-list value into `Author[]`.
 *
 * Accepts an array of authors (objects or free-text strings), a single
 * author object, or one free-text string such as 'Michael Coper and George
 * Williams'. Free text is parsed with {@link parseFreeTextAuthors}; text
 * that is not a list of personal names (a body author) becomes a single
 * author whose surname carries the whole string, matching how the engine
 * already renders string authors. Anything else yields an empty list.
 *
 * Backwards compatibility: documents created before 1.16.16 hold chapter
 * editors as a plain string; they must keep rendering unchanged.
 */
export function normaliseAuthorList(value: unknown): Author[] {
  if (Array.isArray(value)) {
    const out: Author[] = [];
    for (const entry of value) {
      out.push(...normaliseAuthorList(entry));
    }
    return out;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    return parseFreeTextAuthors(text) ?? [{ givenNames: "", surname: text }];
  }
  if (value && typeof value === "object") {
    const obj = value as Partial<Author> & { name?: unknown };
    const surname = typeof obj.surname === "string" ? obj.surname : "";
    const givenNames = typeof obj.givenNames === "string" ? obj.givenNames : "";
    if (surname || givenNames) {
      return [{ ...(obj as Author), givenNames, surname }];
    }
    if (typeof obj.name === "string" && obj.name.trim()) {
      return normaliseAuthorList(obj.name);
    }
  }
  return [];
}

/** {@link normaliseAuthorList}, returning undefined for an empty list. */
export function normaliseOptionalAuthorList(value: unknown): Author[] | undefined {
  const list = normaliseAuthorList(value);
  return list.length > 0 ? list : undefined;
}
