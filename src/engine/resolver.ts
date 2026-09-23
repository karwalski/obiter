/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Subsequent Reference Resolution (AGLC4 Rules 1.4.1–1.4.6)
 *
 * Pure functions for resolving subsequent references to citations that have
 * already appeared in the document. Handles ibid, short titles, within-footnote
 * references, and abbreviation definitions.
 */

import type { Author, Citation, Pinpoint, SourceType } from "../types/citation";
import type { FormattedRun } from "../types/formattedRun";
import type { CitationConfig } from "./standards/types";
import { formatPinpointFor, pinpointText } from "./standards/pinpoints";
import { formatLegislationPinpoint } from "./rules/v4/domestic/legislation";
import {
  formatCommercialSubsequent as nzlsgFormatCommercialSubsequent,
  formatGeneralSubsequent as nzlsgFormatGeneralSubsequent,
} from "./rules/nzlsg/styles";
import type { NZLSGStyle } from "./rules/nzlsg/styles";
import { shouldItaliciseTitle } from "./rules/v4/general/italicisation";
import { parseTitleMarkup, quoteTitleRuns } from "./rules/v4/general/titleMarkup";
import {
  formatInternationalShortReference,
  internationalLeadsWithShortTitle,
  internationalShortTitleStyle,
  styleInternationalShortTitle,
} from "./rules/v4/international/subsequent";
import {
  formatAuthorSurname,
  formatFreeTextAuthorLead,
  joinAuthorNames,
} from "./rules/v4/secondary/authors";
import { formatSecondaryShortTitle } from "./rules/v4/secondary/general";

// ─── Source Type Classification ──────────────────────────────────────────────

/**
 * Returns true if the source type is a case (Part II, Chapter 2).
 */
function isCase(sourceType: SourceType): boolean {
  return sourceType.startsWith("case.");
}

/**
 * Returns true if the source type is legislation (Part II, Chapter 3).
 */
function isLegislation(sourceType: SourceType): boolean {
  return sourceType.startsWith("legislation.");
}

/**
 * Returns true if the source type is a secondary source (Part III+).
 * Any source that is neither a case nor legislation is treated as secondary.
 */
function isSecondarySource(sourceType: SourceType): boolean {
  return !isCase(sourceType) && !isLegislation(sourceType);
}

// ─── STD-015: Standard Families ──────────────────────────────────────────────

/** The rule family a config belongs to; no config means AGLC (the default). */
type StandardFamily = "aglc" | "oscola" | "nzlsg";

function familyOf(config?: CitationConfig): StandardFamily {
  if (!config) return "aglc";
  if (config.standardId.startsWith("oscola")) return "oscola";
  if (config.standardId.startsWith("nzlsg")) return "nzlsg";
  return "aglc";
}

/**
 * Source types OSCOLA declares a short form for at the end of the first
 * citation and then cites by that short form alone, without `(n X)`:
 * legislation (§1.2.1 `… Act 2015 (‘SARAH’) s 1.` then `SARAH, s 2.`),
 * treaties (§4.1.1 `(‘ICCPR’)` then `UNCLOS, art 101.`), the UN Charter
 * (§4.2.1 `UN Charter, art 33.`), UN resolutions (§4.2.2 `(‘Friendly
 * Relations Declaration’)`) and OJ instruments (§4.4.1 `(‘Maastricht
 * Treaty’)`, `Rome I, art 6.`). Cases (§2.1.2) and secondary sources
 * (§3.1.5) are short-formed by party name or surname with `(n X)` and
 * declare nothing.
 */
function isOscolaDeclaredType(sourceType: SourceType): boolean {
  return (
    isLegislation(sourceType) ||
    sourceType === "treaty" ||
    sourceType === "treaty.mou" ||
    sourceType === "un.charter" ||
    sourceType === "un.document" ||
    sourceType === "eu.official_journal"
  );
}

/** The `shortTitleIntroduction` a family implies when a config omits it. */
function defaultShortTitleIntroduction(
  family: StandardFamily
): NonNullable<CitationConfig["shortTitleIntroduction"]> {
  switch (family) {
    case "oscola":
      return "declared";
    case "nzlsg":
      return "none";
    default:
      return "aglc";
  }
}

/**
 * STD-015: whether the first citation of `sourceType` is followed by a
 * short-form declaration under `config` (`config.shortTitleIntroduction`,
 * derived from the standard family when absent): every source under AGLC4
 * 1.4.4/1.4.5, only the declared types under OSCOLA, none under NZLSG.
 */
export function declaresShortForm(sourceType: SourceType, config?: CitationConfig): boolean {
  const mode = config?.shortTitleIntroduction ?? defaultShortTitleIntroduction(familyOf(config));
  switch (mode) {
    case "none":
      return false;
    case "declared":
      return isOscolaDeclaredType(sourceType);
    default:
      return true;
  }
}

/** The declared short form of a citation (the user's short title), or "". */
function declaredShortForm(citation: Citation): string {
  if (typeof citation.shortTitle === "string" && citation.shortTitle.trim()) {
    return citation.shortTitle.trim();
  }
  const stored = citation.data.shortTitle;
  return typeof stored === "string" ? stored.trim() : "";
}

// ─── Pinpoint Formatting ─────────────────────────────────────────────────────

/** Pinpoint type prefixes per AGLC4 Rule 1.3. */
const PINPOINT_PREFIX: Record<Pinpoint["type"], string> = {
  page: "",
  paragraph: "",
  section: "s ",
  chapter: "ch ",
  part: "pt ",
  clause: "cl ",
  schedule: "sch ",
  article: "art ",
  regulation: "reg ",
  rule: "r ",
  footnote: "n ",
  column: "col ",
  line: "line ",
  division: "div ",
  appendix: "app ",
  subdivision: "sub-div ",
  subsection: "sub-s ",
  subclause: "sub-cl ",
  subparagraph: "sub-para ",
  subregulation: "sub-reg ",
  subrule: "sub-r ",
  order: "ord ",
  item: "item ",
};

/**
 * Formats a pinpoint reference into FormattedRun[].
 *
 * AGLC4 Rule 1.3: Pinpoint references use abbreviated labels followed by the
 * value. Pages and paragraphs have no prefix — paragraph values are wrapped
 * in square brackets by convention (stored in `value`).
 */
function formatPinpoint(pinpoint: Pinpoint): FormattedRun[] {
  // Defensive: an empty or malformed pinpoint (no usable value, or an
  // unrecognised type) must never render the literal string "undefined" —
  // `${undefined}${undefined}` produced "undefinedundefined" in subsequent
  // references and ", undefined" in full citations. Callers should already
  // have dropped valueless pinpoints (see normalisePinpoint), but guard here so
  // no path can emit it.
  if (!pinpoint || typeof pinpoint.value !== "string" || pinpoint.value.trim() === "") {
    return [];
  }
  const prefix = PINPOINT_PREFIX[pinpoint.type] ?? "";
  const runs: FormattedRun[] = [{ text: `${prefix}${pinpoint.value}` }];

  if (pinpoint.subPinpoint) {
    const subRuns = formatPinpoint(pinpoint.subPinpoint);
    if (subRuns.length > 0) {
      runs.push({ text: " " });
      runs.push(...subRuns);
    }
  }

  return runs;
}

/**
 * Returns true if two pinpoints are semantically equal.
 */
function pinpointsEqual(a: Pinpoint | undefined, b: Pinpoint | undefined): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  if (a.type !== b.type || a.value !== b.value) return false;
  return pinpointsEqual(a.subPinpoint, b.subPinpoint);
}

// ─── Author Helpers ──────────────────────────────────────────────────────────

/** Matches CJK ideographs (Chinese-script names, Rule 16.4.2). */
const CJK_CHAR = /[㐀-䶿一-鿿豈-﫿]/;

/**
 * Returns the full name for a Chinese-script structured author, in source
 * order (surname first — AGLC4 Rule 16.4.2 note band), or undefined when
 * the name is not in Chinese characters.
 *
 * AGLC4 Rule 16.4.2: subsequent references to Chinese language sources
 * always carry the author's full name (characters plus any pinyin
 * transliteration), never the surname alone.
 */
function chineseScriptFullName(author: {
  surname?: string;
  givenNames?: string;
}): string | undefined {
  const surname = author.surname ?? "";
  const givenNames = author.givenNames ?? "";
  if (!CJK_CHAR.test(surname) && !CJK_CHAR.test(givenNames)) {
    return undefined;
  }
  if (!givenNames) return surname || undefined;
  if (!surname) return givenNames;
  // Characters run together without a space; a pinyin element keeps one.
  const joiner = CJK_CHAR.test(surname.slice(-1)) && CJK_CHAR.test(givenNames.charAt(0)) ? "" : " ";
  return `${surname}${joiner}${givenNames}`;
}

/**
 * Extracts the author surname from a Citation's data for use in short
 * references. Falls back to an empty string if no author is available.
 *
 * AGLC4 Rule 16.4.2: authors named in Chinese characters keep their full
 * name (with any pinyin transliteration) in subsequent references.
 */
function getAuthorSurname(citation: Citation): string {
  const data = citation.data;
  // Structured authors array (journal articles, books; chapter authors for
  // book chapters). Rule 4.1.2 carries into subsequent references: two or
  // three authors are all named ('Edelman and Bant (n 2)'), four or more
  // collapse to 'Rishworth et al (n 3)'.
  const authors =
    Array.isArray(data.authors) && data.authors.length > 0
      ? data.authors
      : Array.isArray(data.chapterAuthors)
        ? data.chapterAuthors
        : [];
  if (authors.length > 0) {
    const surnames = (authors as Author[])
      .map((author) => chineseScriptFullName(author) ?? formatAuthorSurname(author))
      .filter((name) => name.length > 0);
    if (surnames.length > 0) {
      return joinAuthorNames(surnames);
    }
  }
  // Structured author object
  if (data.author && typeof data.author === "object") {
    const author = data.author as { surname?: string; givenNames?: string };
    return chineseScriptFullName(author) ?? author.surname ?? "";
  }
  // Rule 7.3: a speech leads with its speaker, who occupies the author
  // position of the rule 7.3 template ('Heydon (n 41)'; DECISION-037).
  if (citation.sourceType === "speech" && typeof data.speaker === "string" && data.speaker) {
    return formatFreeTextAuthorLead(data.speaker);
  }
  // Plain string author (newspapers, internet materials, reports, press
  // releases, etc.): personal names reduce to surnames per rule 1.4.1;
  // body authors stay verbatim (DECISION-037).
  if (typeof data.author === "string" && data.author) {
    return formatFreeTextAuthorLead(data.author);
  }
  // Institutional author
  if (typeof data.institutionalAuthor === "string" && data.institutionalAuthor) {
    return data.institutionalAuthor;
  }
  if (typeof data.authorSurname === "string") {
    return data.authorSurname;
  }
  return "";
}

/**
 * Formats the leading element of a short reference to a secondary source:
 * the author surname, or — for authorless/body-authored sources — the short
 * title styled per Rule 1.4.1.
 *
 * AGLC4 Rule 1.4.1 (guide ex 55): a report short title standing in for a
 * body author is italicised: *Traditional Rights and Freedoms* (n 52).
 */
function formatSecondaryLead(citation: Citation): FormattedRun[] {
  const exchangeLead = formatExchangeLead(citation);
  if (exchangeLead !== null) {
    return exchangeLead;
  }
  const surname = getAuthorSurname(citation);
  if (surname) {
    return [{ text: surname }];
  }
  // Fall back to the (styled) short title for body-authored sources
  const title = getTitle(citation);
  if (title) {
    return formatStyledShortTitle(title, citation.sourceType);
  }
  return [];
}

/**
 * Formats the short-reference lead for interviews (Rule 7.13) and written
 * correspondence (Rule 7.12), which have neither an author nor a title
 * element for rule 1.4.1 to fall back on.
 *
 * DECISION-037: the leading identifier is kept and the parties reduce to
 * surnames, following edited AGLC4 practice (UNSW Law Journal editing
 * materials r 7.13.1: 'Interview with Petschler and Gergis (n 109) 5';
 * 'Written Response from Sidhu (n 119) 2') and the community CSL style
 * ('Email from Li to Jones (n X)'). A user-assigned short title (rule 1.4.4)
 * replaces the generated lead and is rendered roman.
 *
 * Returns null for every other source type.
 */
function formatExchangeLead(citation: Citation): FormattedRun[] | null {
  const type = citation.sourceType;
  if (type !== "interview" && type !== "correspondence") {
    return null;
  }
  const data = citation.data;
  const str = (...keys: string[]): string => {
    for (const key of keys) {
      const value = data[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  };
  const shortTitle = citation.shortTitle ?? str("shortTitle");
  if (shortTitle) {
    return parseTitleMarkup(shortTitle, false);
  }
  if (type === "interview") {
    const interviewee = str("interviewee", "author", "name");
    if (!interviewee) return [];
    const label = str("interviewType", "format") || "Interview";
    return [{ text: `${label} with ${formatFreeTextAuthorLead(interviewee)}` }];
  }
  const sender = str("sender", "author");
  if (!sender) return [];
  const label = str("type", "correspondenceType") || "Letter";
  const recipient = str("recipient");
  const text = recipient
    ? `${label} from ${formatFreeTextAuthorLead(sender)} to ${formatFreeTextAuthorLead(recipient)}`
    : `${label} from ${formatFreeTextAuthorLead(sender)}`;
  return [{ text }];
}

/**
 * Extracts a title or short title from the citation, for disambiguation or
 * use in short references.
 */
function getTitle(citation: Citation, config?: CitationConfig): string {
  if (citation.shortTitle) return citation.shortTitle;
  if (typeof citation.data.shortTitle === "string") return citation.data.shortTitle;
  // Document-led sources (ICJ pleadings, rule 10.5 ex 42) shorten to the
  // document title, not the case name.
  if (typeof citation.data.documentTitle === "string") return citation.data.documentTitle;
  // Case-like sources store their name under caseTitle/caseName/parties
  // (mirroring the dispatch layer's field fallbacks).
  if (typeof citation.data.caseTitle === "string") return citation.data.caseTitle;
  if (typeof citation.data.caseName === "string") return citation.data.caseName;
  if (typeof citation.data.title === "string") return citation.data.title;
  if (typeof citation.data.name === "string") return citation.data.name;
  if (typeof citation.data.parties === "string") return citation.data.parties;
  // STD-015: a form-entered case stores its parties as party1/party2 and
  // may carry no short title. OSCOLA 5 §2.1.2 short-forms a case by its
  // first-named party ('Phelps (n 14)'); NZLSG 3 §2.3.1(a)(i) repeats the
  // case name ('Rainy Sky SA v Kookmin Bank, above n 10'). The AGLC path is
  // unchanged (rule 2.1.14 short titles are entered by the user).
  const family = familyOf(config);
  if (family !== "aglc") {
    const party1 = typeof citation.data.party1 === "string" ? citation.data.party1.trim() : "";
    const party2 = typeof citation.data.party2 === "string" ? citation.data.party2.trim() : "";
    if (party1) return family === "oscola" || !party2 ? party1 : `${party1} v ${party2}`;
  }
  return "";
}

/**
 * Styles a title or short title used in a subsequent reference the same way
 * the title appeared in the first citation.
 *
 * AGLC4 Rule 1.4.1: the disambiguating title/short title is "styled the same
 * way" as in the first citation — italics for italic-titled sources (books,
 * reports, cases, Acts; guide ex 61: Rubenstein, *Australian Citizenship Law
 * in Context* (n 59)), single inverted commas for articles/chapters.
 *
 * AGLC4 Rules 3.2/3.5: Bill titles are not italicised, so a Bill short title
 * is roman in subsequent references.
 *
 * AGLC4 Rules 8.8/9.5/10.5/11.3/12.4/13.4/14.6: Part IV short titles are
 * italic (treaties, UN/WTO/GATT documents, decisions of international
 * courts and tribunals) or quoted (ICJ pleadings, UN yearbook material).
 */
function formatStyledShortTitle(title: string, sourceType: SourceType): FormattedRun[] {
  const international = styleInternationalShortTitle(title, sourceType);
  if (international !== null) {
    return international;
  }
  // Rule 4.2 via DECISION-021: embedded-italic markers in stored short
  // titles are honoured — italic spans inside roman short titles; markers
  // consumed (span stays italic) inside wholly italic short titles.
  if (sourceType === "legislation.bill") {
    return parseTitleMarkup(title, false);
  }
  if (shouldItaliciseTitle(sourceType)) {
    return parseTitleMarkup(title, true);
  }
  return quoteTitleRuns(parseTitleMarkup(title, false));
}

// ─── GEN-007: Short References (Rule 1.4.1) ─────────────────────────────────

/**
 * Formats a short (subsequent) reference to a citation.
 *
 * AGLC4 Rule 1.4.1: After the first full citation, subsequent references use
 * a shortened form with a cross-reference back to the first footnote.
 *
 * - Secondary sources: `Author Surname (n X) pinpoint.`
 * - Cases: `Short Title (n X) pinpoint.`
 * - Legislation: `Short Title (n X) pinpoint.`
 *
 * NZLSG Rule 2.3: Uses "above n X, at pinpoint" format when
 * `config.subsequentReferenceFormat === "above n"`.
 *
 * When multiple works by the same author exist (indicated by
 * `disambiguate = true`), the title/short title is included after the
 * surname to distinguish between works.
 *
 * @param citation - The citation being referenced
 * @param firstFootnoteNumber - The footnote number where the citation first appeared
 * @param pinpoint - Optional pinpoint for the subsequent reference
 * @param disambiguate - Whether to include the title for disambiguation
 * @param config - Optional citation config for multi-standard support
 */
export function formatShortReference(
  citation: Citation,
  firstFootnoteNumber: number,
  pinpoint?: Pinpoint,
  disambiguate?: boolean,
  config?: CitationConfig
): FormattedRun[] {
  const format = config?.subsequentReferenceFormat ?? "n";
  const pinpointPrefix = config?.pinpointPrefix ?? "";

  // MULTI-014: Court mode — short name only, no (n X) cross-reference
  if (config?.writingMode === "court") {
    return formatCourtShortReference(citation, pinpoint, disambiguate);
  }

  // STD-015: OSCOLA 5 §1.2.1 / OSCOLA 4 §1.2.1 short forms
  if (config && familyOf(config) === "oscola") {
    return formatOscolaShortReference(
      citation,
      firstFootnoteNumber,
      pinpoint,
      disambiguate,
      config
    );
  }

  // NZLSG "above n" format: Author, above n X, at pinpoint (STD-015:
  // legislation by short title alone, NZLSG 3 §2.3.1(a)(ii))
  if (format === "above n" && config) {
    return formatNzlsgShortReference(citation, firstFootnoteNumber, pinpoint, disambiguate, config);
  }

  // AGLC4 / OSCOLA "n" format: Author (n X) pinpoint
  const runs: FormattedRun[] = [];

  // Part IV international materials lead with the styled short title plus
  // any chapter-specific elements (Rules 8.8/9.5/10.5/11.3/12.4/13.4/14.6);
  // authored rule 9.3.2 submissions fall through to the secondary form.
  const internationalLead = formatInternationalShortReference(
    citation,
    firstFootnoteNumber,
    getTitle(citation)
  );
  if (internationalLead !== null) {
    runs.push(...internationalLead);
  } else if (isSecondarySource(citation.sourceType)) {
    // Secondary sources: Author Surname (n X) pinpoint.
    const surname = getAuthorSurname(citation);
    runs.push(...formatSecondaryLead(citation));

    // Rule 1.4.1: multiple works by the same author — append the title,
    // styled the same way it appeared in the first citation (guide ex 61:
    // Rubenstein, *Australian Citizenship Law in Context* (n 59)).
    if (disambiguate && surname) {
      const title = getTitle(citation);
      if (title) {
        runs.push({ text: ", " });
        runs.push(...formatStyledShortTitle(title, citation.sourceType));
      }
    }

    runs.push({ text: ` (n ${firstFootnoteNumber})` });
  } else if (isCase(citation.sourceType)) {
    // Cases: Short Title (n X) pinpoint.
    const title = getTitle(citation);
    if (title) {
      runs.push({ text: title, italic: true });
    }
    runs.push({ text: ` (n ${firstFootnoteNumber})` });
  } else if (isLegislation(citation.sourceType)) {
    // Legislation: Short Title (n X) pinpoint. Rules 3.2/3.5: italic for
    // Acts/delegated legislation, roman for Bills.
    const title = getTitle(citation);
    if (title) {
      runs.push(...formatStyledShortTitle(title, citation.sourceType));
    }
    runs.push({ text: ` (n ${firstFootnoteNumber})` });
  }

  if (pinpoint) {
    runs.push({ text: " " });
    if (pinpointPrefix) {
      runs.push({ text: pinpointPrefix });
    }
    // AUDIT2-020: Use legislation-specific pinpoint formatting (singular/plural
    // abbreviations like s/ss, reg/regs, cl/cll) for legislation citations
    // instead of the general pinpoint formatter (Rule 3.5).
    if (isLegislation(citation.sourceType)) {
      runs.push(...formatLegislationPinpoint(pinpoint));
    } else {
      runs.push(...formatPinpoint(pinpoint));
    }
  }

  return runs;
}

/**
 * The identifier that leads a short reference: the styled Part IV short
 * title, the author surname (or the styled short title of a body-authored
 * secondary source, with the disambiguating title when asked), the italic
 * case name or reference tag, or the roman legislation short title.
 */
function shortReferenceLead(
  citation: Citation,
  disambiguate: boolean | undefined,
  config?: CitationConfig
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (internationalLeadsWithShortTitle(citation)) {
    // Part IV materials lead with the styled short title (Rules 8.8–14.6)
    const title = getTitle(citation, config);
    if (title) {
      runs.push(...formatStyledShortTitle(title, citation.sourceType));
    }
  } else if (isSecondarySource(citation.sourceType)) {
    const surname = getAuthorSurname(citation);
    runs.push(...formatSecondaryLead(citation));

    if (disambiguate && surname) {
      const title = getTitle(citation, config);
      if (title) {
        runs.push({ text: ", " });
        runs.push(...formatStyledShortTitle(title, citation.sourceType));
      }
    }
  } else if (isCase(citation.sourceType)) {
    // NZLSG 3 §2.3.1(a)(i): case names and reference tags keep their italics
    const title = getTitle(citation, config);
    if (title) {
      runs.push(...parseTitleMarkup(title, true));
    }
  } else if (isLegislation(citation.sourceType)) {
    // NZLSG 3 §4.1.1(a): legislation is roman
    const title = getTitle(citation, config);
    if (title) {
      runs.push(...parseTitleMarkup(title, false));
    }
  }

  return runs;
}

/**
 * Prepends the styled `lead` to a styles formatter's output produced with
 * an empty identifier (`authorOrTitle: ""`), dropping that empty run. The
 * formatter supplies the cross-reference and pinpoint text; the identifier
 * is styled here so italic case tags survive (§2.3.1(a)(i)).
 */
function withLead(lead: FormattedRun[], runs: FormattedRun[]): FormattedRun[] {
  const rest = runs.length > 0 && runs[0].text === "" ? runs.slice(1) : runs;
  return [...lead, ...rest];
}

/**
 * Formats a short reference in NZLSG "above n" style.
 *
 * NZLSG 3 §2.3.1(a)(i)/(iii)/(iv): identifier, comma, `above n X`, then
 * the pinpoint after a comma with `at` (`R v Wang, above n 49, at 533`;
 * `Spiller, above n 21, at 70`; `Mullan, above n 40, at 152`). Labelled
 * provisions keep their label without `at` (`, art 7`).
 */
function formatAboveNReference(
  citation: Citation,
  firstFootnoteNumber: number,
  pinpoint: Pinpoint | undefined,
  disambiguate: boolean | undefined,
  config: CitationConfig
): FormattedRun[] {
  const lead = shortReferenceLead(citation, disambiguate, config);
  const pinpointSuffix = pinpoint
    ? formatPinpointFor(config, pinpoint, { after: "cross-reference" })
    : undefined;
  return withLead(
    lead,
    nzlsgFormatGeneralSubsequent({
      authorOrTitle: "",
      footnoteNumber: firstFootnoteNumber,
      pinpointSuffix,
    })
  );
}

/**
 * NZLSG 3 §2.3.1(a)(ii): the legislation identifier is the short title
 * without the year (`Securities Act`), so a stored title `Crimes Act 1961`
 * loses its year; the year is kept only by the citation's own full form.
 */
function nzlsgLegislationTitle(citation: Citation, config: CitationConfig): string {
  const stored = citation.data.title;
  const title =
    typeof stored === "string" && stored.trim() ? stored.trim() : getTitle(citation, config);
  return title.replace(/\s+(1[5-9]\d\d|20\d\d)$/, "");
}

/**
 * NZLSG 3 §2.3.1(a)(ii): legislation is never cross-referenced with
 * `above n` — the short title (no year or jurisdiction), a comma and the
 * provision: `Securities Act, s 63.`; roman per §4.1.1(a).
 */
function formatNzlsgLegislationReference(
  citation: Citation,
  pinpoint: Pinpoint | undefined,
  config: CitationConfig
): FormattedRun[] {
  const runs: FormattedRun[] = [{ text: nzlsgLegislationTitle(citation, config) }];
  if (pinpoint) {
    runs.push({ text: formatPinpointFor(config, pinpoint, { after: "short-form" }) });
  }
  return runs;
}

/** NZLSG 3 §2.3.1(a) rule 2: the general-style short reference. */
function formatNzlsgShortReference(
  citation: Citation,
  firstFootnoteNumber: number,
  pinpoint: Pinpoint | undefined,
  disambiguate: boolean | undefined,
  config: CitationConfig
): FormattedRun[] {
  if (isLegislation(citation.sourceType)) {
    return formatNzlsgLegislationReference(citation, pinpoint, config);
  }
  return formatAboveNReference(citation, firstFootnoteNumber, pinpoint, disambiguate, config);
}

/**
 * NZLSG commercial style (NZLSG-008; `config.nzlsgStyle`, else
 * `data.nzlsgStyle`): identifier and pinpoint only — no `above n`, no ibid
 * (`Butler and Butler at 134`; legislation `Securities Act, s 63`).
 *
 * DECISION-040: NZLSG 3 §2.3.1(b) as read online describes the commercial
 * style as the full citation on every reference for cases and legislation,
 * with other sources in the general style. The shipped short form is kept
 * until that reading is confirmed; no expectation row covers it.
 */
function formatNzlsgCommercialReference(
  citation: Citation,
  pinpoint: Pinpoint | undefined,
  config: CitationConfig
): FormattedRun[] {
  const legislation = isLegislation(citation.sourceType);
  const lead: FormattedRun[] = legislation
    ? [{ text: nzlsgLegislationTitle(citation, config) }]
    : shortReferenceLead(citation, undefined, config);
  const pinpointSuffix = pinpoint
    ? formatPinpointFor(config, pinpoint, { after: legislation ? "short-form" : "report" })
    : undefined;
  return withLead(lead, nzlsgFormatCommercialSubsequent({ authorOrTitle: "", pinpointSuffix }));
}

/**
 * NZLSG 3 §2.3.1(a) rule 1: when the source is obvious from the immediately
 * preceding footnote, only the pinpoint is given, capitalised as a footnote
 * (`At 535.`, `At [52] per Tipping J.`; legislation `Section 8.`). Returns
 * null where the rule gives no form (a legislation pinpoint that is not a
 * section), so that rule 2 applies instead.
 */
function formatNzlsgPinpointOnly(
  citation: Citation,
  pinpoint: Pinpoint,
  config: CitationConfig
): FormattedRun[] | null {
  if (isLegislation(citation.sourceType)) {
    const value = pinpoint.value.trim();
    return pinpoint.type === "section" && value ? [{ text: `Section ${value}` }] : null;
  }
  const text = pinpointText(config, pinpoint, { after: "cross-reference" });
  return text ? [{ text: `At ${text}` }] : null;
}

/**
 * OSCOLA 5 §1.2.1 (OSCOLA 4 §1.2.1) short reference: brief identifier,
 * `(n X)`, then the pinpoint with no comma (`Austin (n 1) [34]`, `Stevens
 * (n 1) 110`). Cases lead with the first-named party or reference name in
 * italics, `v` included (§2.1.2 `Phelps (n 14)`, `Ninja Turtles case (n
 * 12)`); international decisions likewise; secondary sources with the
 * surname (§3.1.5) and, when disambiguating, the styled title (`Ashworth,
 * ‘Testing Fidelity to Legal Values’ (n 27) 635–37`). Declared short forms
 * are used alone, roman, then a comma and the provision (`SARAH, s 2`,
 * `UNCLOS, art 101`, `Rome I, art 6`).
 */
function formatOscolaShortReference(
  citation: Citation,
  firstFootnoteNumber: number,
  pinpoint: Pinpoint | undefined,
  disambiguate: boolean | undefined,
  config: CitationConfig
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (isOscolaDeclaredType(citation.sourceType)) {
    const declared = declaredShortForm(citation);
    if (declared) {
      runs.push(...parseTitleMarkup(declared, false));
      if (pinpoint) {
        runs.push({ text: formatPinpointFor(config, pinpoint, { after: "short-form" }) });
      }
      return runs;
    }
    // No declared short form (DECISION-040: §1.2.1 shows only the declared
    // route). The resolver repeats the full citation in that case; a direct
    // caller gets the roman title with the cross-reference.
    const title = getTitle(citation, config);
    if (title) {
      runs.push(...parseTitleMarkup(title, false));
    }
    runs.push({ text: ` (n ${firstFootnoteNumber})` });
  } else if (
    isCase(citation.sourceType) ||
    internationalShortTitleStyle(citation.sourceType) === "italic"
  ) {
    const title = getTitle(citation, config);
    if (title) {
      runs.push(...parseTitleMarkup(title, true));
    }
    runs.push({ text: ` (n ${firstFootnoteNumber})` });
  } else {
    const surname = getAuthorSurname(citation);
    runs.push(...formatSecondaryLead(citation));
    if (disambiguate && surname) {
      const title = getTitle(citation, config);
      if (title) {
        runs.push({ text: ", " });
        runs.push(...formatStyledShortTitle(title, citation.sourceType));
      }
    }
    runs.push({ text: ` (n ${firstFootnoteNumber})` });
  }

  if (pinpoint) {
    const text = pinpointText(config, pinpoint, { after: "cross-reference" });
    if (text) {
      runs.push({ text: ` ${text}` });
    }
  }

  return runs;
}

// ─── GEN-008: Ibid (Rule 1.4.3) ─────────────────────────────────────────────

/**
 * Formats a court-mode short reference: short case name or author surname
 * followed by an optional pinpoint. No footnote cross-reference `(n X)`.
 *
 * MULTI-014: In court submissions, every subsequent reference uses the short
 * case name (or author surname for secondary sources) without ibid and
 * without footnote cross-references.
 */
function formatCourtShortReference(
  citation: Citation,
  pinpoint?: Pinpoint,
  disambiguate?: boolean
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (isSecondarySource(citation.sourceType) && !internationalLeadsWithShortTitle(citation)) {
    const surname = getAuthorSurname(citation);
    runs.push(...formatSecondaryLead(citation));
    if (disambiguate && surname) {
      const title = getTitle(citation);
      if (title) {
        runs.push({ text: ", " });
        runs.push(...formatStyledShortTitle(title, citation.sourceType));
      }
    }
  } else {
    // Cases and legislation: use short title, italic per Rule 1.8.2
    // (roman for Bills per Rules 3.2/3.5)
    const title = getTitle(citation);
    if (title) {
      runs.push(...formatStyledShortTitle(title, citation.sourceType));
    }
  }

  if (pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(pinpoint));
  }

  return runs;
}

/**
 * Resolves an ibid reference.
 *
 * AGLC4 Rule 1.4.3: 'Ibid' refers to the immediately preceding source.
 *
 * - If pinpoints match (or both absent): returns `Ibid`
 * - If pinpoints differ: returns `Ibid pinpoint`
 *
 * Ibid is NOT used when:
 * - The preceding footnote has multiple sources
 * - The current citation has no pinpoint but the preceding had one
 *
 * These guards are enforced by the caller (`resolveSubsequentReference`).
 *
 * @param currentPinpoint - Pinpoint for the current reference
 * @param precedingPinpoint - Pinpoint from the preceding reference
 */
export function resolveIbid(
  currentPinpoint?: Pinpoint,
  precedingPinpoint?: Pinpoint,
  config?: CitationConfig
): FormattedRun[] {
  // STD-015: OSCOLA 4 §1.2.3 'ibid' is lower case and never capitalised;
  // AGLC4 1.4.3 opens the footnote with 'Ibid'.
  const word = config?.ibidStyle === "lowercase" ? "ibid" : "Ibid";

  if (pinpointsEqual(currentPinpoint, precedingPinpoint)) {
    return [{ text: word }];
  }

  if (currentPinpoint) {
    if (config && familyOf(config) !== "aglc") {
      // OSCOLA 4 §1.2.1 'ibid 271–78', 'ibid [34]': the pinpoint in the
      // standard's own vocabulary after a space.
      const text = pinpointText(config, currentPinpoint, { after: "cross-reference" });
      return [{ text: text ? `${word} ${text}` : word }];
    }
    return [{ text: `${word} ` }, ...formatPinpoint(currentPinpoint)];
  }

  // Current has no pinpoint but preceding did — should not reach here
  // if caller enforces ibid eligibility correctly, but handle defensively.
  return [{ text: word }];
}

/**
 * Wraps title runs in roman parentheses, merging each parenthesis into its
 * adjacent run when that run is roman — so an unmarked (single-roman-run)
 * short title round-trips byte-for-byte with the pre-markup output.
 */
function wrapRunsInParens(runs: FormattedRun[]): FormattedRun[] {
  if (runs.length === 0) {
    return [{ text: "()" }];
  }
  const wrapped = runs.map((run) => ({ ...run }));
  const first = wrapped[0];
  if (first.italic) {
    wrapped.unshift({ text: "(" });
  } else {
    first.text = "(" + first.text;
  }
  const last = wrapped[wrapped.length - 1];
  if (last.italic) {
    wrapped.push({ text: ")" });
  } else {
    last.text += ")";
  }
  return wrapped;
}

// ─── GEN-009: Short Title Introduction (Rule 1.4.4) ─────────────────────────

/**
 * Formats the short title introduction appended after the first full citation.
 *
 * AGLC4 Rule 1.4.4: A short title is introduced in parentheses after the
 * first citation so readers can recognise it in subsequent references.
 *
 * - Cases: `('short title')` — short title in italics inside single quotes,
 *   parentheses not italic
 * - Legislation: `('short title')` — short title in italics for Acts and
 *   delegated legislation; roman for Bills (Rules 3.2/3.5)
 * - Secondary sources: `('short title')` — italic iff the source's title is
 *   italic (Rule 4.3: books/reports italic, articles/chapters roman)
 *
 * @param shortTitle - The short title to introduce
 * @param sourceType - The source type (determines formatting)
 */
export function formatShortTitleIntroduction(
  shortTitle: string,
  sourceType: SourceType,
  config?: CitationConfig
): FormattedRun[] {
  // STD-015: OSCOLA declares short forms roman — OSCOLA 5 §1.2.1 in single
  // quotation marks ('… Act 2015 (‘SARAH’)'), OSCOLA 4 §1.2.1 without them
  // ('(Working Time Directive)'). Which types declare is decided by the
  // caller through `declaresShortForm`.
  if (config && familyOf(config) === "oscola") {
    const runs = parseTitleMarkup(shortTitle, false);
    if (config.standardId === "oscola4") {
      return wrapRunsInParens(runs);
    }
    return [{ text: "(‘" }, ...runs, { text: "’)" }];
  }

  // Part IV international materials: the introduced short title carries the
  // styling its chapter's subsequent-reference rule prescribes — italic for
  // treaties/UN docs/decisions (rule 8.8 ex 20: ('Timor Gap Treaty') with
  // the title italic; rule 10.5 ex 36: ('Reparations')), quoted roman for
  // ICJ pleadings and UN yearbook material (via the fallthrough below).
  // Rule 4.2 via DECISION-021: embedded-italic markers in the stored short
  // title are consumed here exactly as in the subsequent-reference path
  // (formatStyledShortTitle), keeping the two renderings consistent.
  if (internationalShortTitleStyle(sourceType) === "italic") {
    return [{ text: "(‘" }, ...parseTitleMarkup(shortTitle, true), { text: "’)" }];
  }

  if (isCase(sourceType)) {
    // Cases: ('Short Title') — title italic inside curly quotes, parens not italic
    return [{ text: "(\u2018" }, ...parseTitleMarkup(shortTitle, true), { text: "\u2019)" }];
  }

  if (isLegislation(sourceType)) {
    // Rule 3.5: Bill short titles are roman (Rule 3.2); Acts and delegated
    // legislation short titles are italic
    if (sourceType === "legislation.bill") {
      return wrapRunsInParens(quoteTitleRuns(parseTitleMarkup(shortTitle, false)));
    }
    return [{ text: "(\u2018" }, ...parseTitleMarkup(shortTitle, true), { text: "\u2019)" }];
  }

  // Secondary sources: Rule 4.3 (via Rule 1.4.4) — the short title is italic
  // iff the source's title is italic (AGLC4 ch 4 ex 27: ('ISDS 2016 Review'
  // with the title italic, for a report); articles/chapters stay roman
  return formatSecondaryShortTitle(shortTitle, sourceType);
}

// ─── GEN-010: Within-Footnote Subsequent References (Rule 1.4.6) ─────────────

/**
 * Formats a within-footnote subsequent reference using `at` format.
 *
 * AGLC4 Rule 1.4.6: When referring to the same source again within the same
 * footnote, use `at [pinpoint]` rather than a full or short reference.
 *
 * @param pinpoint - The pinpoint for the within-footnote reference
 */
export function formatWithinFootnoteReference(pinpoint: Pinpoint): FormattedRun[] {
  const pinpointRuns = formatPinpoint(pinpoint);
  return [{ text: "at " }, ...pinpointRuns];
}

// ─── GEN-011: Abbreviation Definitions (Rule 1.4.5) ─────────────────────────

/**
 * Formats an abbreviation definition in parentheses.
 *
 * AGLC4 Rule 1.4.5: When defining an abbreviation for subsequent use,
 * it appears in parentheses after the full citation, e.g., `('ADJR Act')`.
 *
 * @param abbreviation - The abbreviation to define
 */
export function formatAbbreviationDefinition(abbreviation: string): FormattedRun[] {
  return [{ text: `(\u2018${abbreviation}\u2019)` }];
}

// ─── RESEARCH-002: Cross-Reference Formatting (Rule 1.4.2) ───────────────────

/**
 * Formats an "above n" cross-reference.
 *
 * AGLC4 Rule 1.4.2: When referring to a source cited in an earlier footnote,
 * the cross-reference takes the form `above n X` or `above n X, pinpoint`.
 *
 * @param footnoteNumber - The footnote number being referred to
 * @param pinpoint - Optional pinpoint for the cross-reference
 */
export function formatAboveReference(footnoteNumber: number, pinpoint?: Pinpoint): FormattedRun[] {
  const runs: FormattedRun[] = [{ text: `above n ${footnoteNumber}` }];

  if (pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(pinpoint));
  }

  return runs;
}

/**
 * Formats a "below n" cross-reference.
 *
 * AGLC4 Rule 1.4.2: When referring to a source cited in a later footnote,
 * the cross-reference takes the form `below n X` or `below n X, pinpoint`.
 * This is architecturally impossible in forward-only processors like CSL,
 * but Obiter processes the whole document so it can support forward references.
 *
 * @param footnoteNumber - The footnote number being referred to
 * @param pinpoint - Optional pinpoint for the cross-reference
 */
export function formatBelowReference(footnoteNumber: number, pinpoint?: Pinpoint): FormattedRun[] {
  const runs: FormattedRun[] = [{ text: `below n ${footnoteNumber}` }];

  if (pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(pinpoint));
  }

  return runs;
}

// ─── Subsequent Reference Context ────────────────────────────────────────────

/**
 * Context required to determine how a subsequent reference should be rendered.
 */
export interface SubsequentReferenceContext {
  /** Whether this is the first citation of this source in the document. */
  isFirstCitation: boolean;
  /** Whether this citation refers to the same source as the preceding footnote. */
  isSameAsPreceding: boolean;
  /** Number of citations in the preceding footnote. */
  precedingFootnoteCitationCount: number;
  /** Pinpoint from the preceding reference to this source. */
  precedingPinpoint?: Pinpoint;
  /** Pinpoint for the current reference. */
  currentPinpoint?: Pinpoint;
  /** The footnote number where this source was first cited. */
  firstFootnoteNumber: number;
  /**
   * Whether the IMMEDIATELY preceding citation in the same footnote is the
   * same source (Rule 1.4.6: 'at' may only refer to the immediately
   * preceding source — an earlier, non-adjacent source in the footnote is
   * cited via the Rule 1.4.1 `(n X)` form instead).
   */
  isWithinSameFootnote: boolean;
  /** Explicit format preference. `"auto"` uses the priority logic. */
  formatPreference: "full" | "short" | "ibid" | "auto";
  /** Whether multiple works by the same author exist, requiring disambiguation. */
  disambiguate?: boolean;
  /** The current footnote number (needed for cross-reference direction). */
  footnoteNumber?: number;
  /**
   * Direction for cross-references (Rule 1.4.2).
   *
   * - `"auto"`: The resolver determines direction by comparing
   *   `firstFootnoteNumber` to `footnoteNumber`.
   * - `"above"`: Force an "above n X" cross-reference.
   * - `"below"`: Force a "below n X" cross-reference.
   */
  crossReferenceDirection?: "auto" | "above" | "below";
  /**
   * Optional citation config for multi-standard support (MULTI-004/005).
   * When provided, controls subsequent reference format and ibid behaviour.
   */
  config?: CitationConfig;
}

// ─── Main Resolver ───────────────────────────────────────────────────────────

/** The kind of subsequent reference a resolution produced. */
export type SubsequentReferenceKind = "ibid" | "short";

/**
 * A resolved subsequent reference: the runs and what they are, so that a
 * caller labelling the occurrence (the refresher's `renderedFormat`) takes
 * the label from the same resolution that produced the text (STD-015).
 */
export interface ResolvedSubsequentReference {
  runs: FormattedRun[];
  /** `ibid` for an ibid reference; `short` for every other subsequent form. */
  kind: SubsequentReferenceKind;
}

const asShort = (runs: FormattedRun[]): ResolvedSubsequentReference => ({ runs, kind: "short" });
const asIbid = (runs: FormattedRun[]): ResolvedSubsequentReference => ({ runs, kind: "ibid" });

/**
 * AGLC4 Rule 1.4.3 ibid eligibility (shared by OSCOLA 4 §1.2.3): the same
 * source as the immediately preceding footnote, which cited exactly one
 * source; not when the preceding reference had a pinpoint and this one has
 * none.
 */
function isIbidEligible(context: SubsequentReferenceContext): boolean {
  return (
    context.isSameAsPreceding &&
    context.precedingFootnoteCitationCount === 1 &&
    !(context.precedingPinpoint !== undefined && context.currentPinpoint === undefined)
  );
}

/**
 * Resolves how a subsequent reference should be formatted.
 *
 * AGLC4 Rules 1.4.1–1.4.6: The resolver follows this priority:
 * 1. If first citation → return `null` (caller renders the full citation)
 * 2. If within same footnote → use `at` format (Rule 1.4.6)
 * 3. If ibid eligible → use ibid (Rule 1.4.3)
 * 4. Otherwise → use short reference (Rule 1.4.1)
 *
 * When `formatPreference` is not `"auto"`, the specified format is used
 * directly, bypassing the priority logic (except for first citations, which
 * always return `null`).
 *
 * STD-015: under an OSCOLA or NZLSG config the standard's own rules apply
 * instead (`resolveSubsequentReferenceWithKind`); the AGLC path is unchanged.
 *
 * @param citation - The citation being referenced
 * @param context - Resolution context with document-level state
 * @returns Formatted runs for the subsequent reference, or `null` if this is
 *   the first citation (caller should render the full citation instead)
 */
export function resolveSubsequentReference(
  citation: Citation,
  context: SubsequentReferenceContext
): FormattedRun[] | null {
  const resolved = resolveSubsequentReferenceWithKind(citation, context);
  return resolved === null ? null : resolved.runs;
}

/**
 * `resolveSubsequentReference` with the kind of reference produced, for
 * callers that label the occurrence as well as render it.
 *
 * - AGLC4 1.4.1–1.4.6 (any AGLC config, or none).
 * - OSCOLA 5 §1.2.1/§1.2.3: brief identifier + `(n X)` + pinpoint, never
 *   ibid, no within-footnote `at` and no above/below constructs; OSCOLA 4
 *   §1.2.3 adds lower-case `ibid` for the immediately preceding footnote.
 * - NZLSG 3 §2.3.1: rule 1 pinpoint-only form when the source is obvious
 *   from the immediately preceding footnote, else rule 2 `, above n X, at`
 *   (legislation by short title alone); commercial style (NZLSG-008) from
 *   `config.nzlsgStyle` or `data.nzlsgStyle`; never ibid.
 *
 * `formatPreference` is honoured under every standard: `full` renders the
 * full citation (`null`), `short` the standard's short form, `ibid` an ibid
 * where the standard allows one and its short form otherwise.
 */
export function resolveSubsequentReferenceWithKind(
  citation: Citation,
  context: SubsequentReferenceContext
): ResolvedSubsequentReference | null {
  // Explanatory notes always render in full — no ibid or short ref
  if (citation.sourceType === "explanatory_note") {
    return null;
  }

  // 1. First citation — caller renders full
  if (context.isFirstCitation) {
    return null;
  }

  const config = context.config;
  if (config && familyOf(config) === "oscola") {
    return resolveOscolaSubsequent(citation, context, config);
  }
  if (config && familyOf(config) === "nzlsg") {
    return resolveNzlsgSubsequent(citation, context, config);
  }
  return resolveAglcSubsequent(citation, context);
}

/** AGLC4 Rules 1.4.1–1.4.6 (see `resolveSubsequentReference`). */
function resolveAglcSubsequent(
  citation: Citation,
  context: SubsequentReferenceContext
): ResolvedSubsequentReference | null {
  const config = context.config;
  // COURT-FIX-004: ibidSuppressionMode toggle controls ibid instead of hardcoded court check
  const ibidEnabled = config?.ibidSuppressionMode === "on" ? false : (config?.ibidEnabled ?? true);

  // Explicit format preferences override auto logic
  if (context.formatPreference !== "auto") {
    switch (context.formatPreference) {
      case "full":
        return null;
      case "ibid":
        // If ibid is disabled by config, fall through to short reference
        if (!ibidEnabled) {
          return asShort(
            formatShortReference(
              citation,
              context.firstFootnoteNumber,
              context.currentPinpoint,
              context.disambiguate,
              config
            )
          );
        }
        return asIbid(resolveIbid(context.currentPinpoint, context.precedingPinpoint));
      case "short":
        return asShort(
          formatShortReference(
            citation,
            context.firstFootnoteNumber,
            context.currentPinpoint,
            context.disambiguate,
            config
          )
        );
    }
  }

  // 2. Immediately preceding source in the same footnote — use `at` format
  //    (Rule 1.4.6). The caller sets isWithinSameFootnote only when the
  //    immediately preceding citation in the footnote is the same source;
  //    a pinpoint to an earlier, non-adjacent source falls through to the
  //    Rule 1.4.1 short form below (eg 'Brennan Jr (n 94) 430').
  //    Repeating `at` for an identical consecutive pinpoint is permitted:
  //    Rule 1.4.6 says the repetition "is not necessary", not prohibited.
  if (context.isWithinSameFootnote && context.currentPinpoint) {
    return asShort(formatWithinFootnoteReference(context.currentPinpoint));
  }

  // 3. Ibid eligible (Rule 1.4.3)
  //    - Same source as preceding footnote
  //    - Preceding footnote had exactly 1 citation
  //    - If preceding had a pinpoint but current doesn't, ibid is not used
  //    - Ibid must be enabled by config (MULTI-005)
  if (ibidEnabled && isIbidEligible(context)) {
    return asIbid(resolveIbid(context.currentPinpoint, context.precedingPinpoint));
  }

  // 4. Cross-reference direction (Rule 1.4.2)
  //    When crossReferenceDirection is explicitly "above" or "below", or "auto"
  //    with a known footnoteNumber, render the directional cross-reference
  //    instead of the standard short reference.
  const direction = context.crossReferenceDirection;
  if (direction === "above") {
    return asShort(formatAboveReference(context.firstFootnoteNumber, context.currentPinpoint));
  }
  if (direction === "below") {
    return asShort(formatBelowReference(context.firstFootnoteNumber, context.currentPinpoint));
  }
  if (direction === "auto" && context.footnoteNumber !== undefined) {
    if (context.firstFootnoteNumber < context.footnoteNumber) {
      return asShort(formatAboveReference(context.firstFootnoteNumber, context.currentPinpoint));
    }
    if (context.firstFootnoteNumber > context.footnoteNumber) {
      return asShort(formatBelowReference(context.firstFootnoteNumber, context.currentPinpoint));
    }
    // firstFootnoteNumber === footnoteNumber: same footnote, fall through to short reference
  }

  // 5. Short reference (Rule 1.4.1)
  return asShort(
    formatShortReference(
      citation,
      context.firstFootnoteNumber,
      context.currentPinpoint,
      context.disambiguate,
      config
    )
  );
}

/**
 * OSCOLA 5 §1.2.1/§1.2.3 and OSCOLA 4 §1.2.1/§1.2.3.
 *
 * Every later reference is the short form with `(n X)` and the pinpoint
 * (`Austin (n 1) [34]`); a second reference to the same source within one
 * footnote takes the same form (OSCOLA has no `at`, `above` or `below`
 * gadgets — §1.2.3 avoids Latin and directional cross-references, §1.2.2
 * names the footnote instead). Under OSCOLA 4 the immediately preceding
 * footnote may be cited as `ibid` (`ibid 6`, `ibid [34]`), which OSCOLA 5
 * removed (`ibidEnabled`). Legislation, treaties and OJ instruments without
 * a declared short form repeat the full citation (OSCOLA 4 §1.2.1; the 5th
 * edition shows only the declared route — DECISION-040).
 */
function resolveOscolaSubsequent(
  citation: Citation,
  context: SubsequentReferenceContext,
  config: CitationConfig
): ResolvedSubsequentReference | null {
  const shortForm = (): ResolvedSubsequentReference | null => {
    if (isOscolaDeclaredType(citation.sourceType) && !declaredShortForm(citation)) {
      return null;
    }
    return asShort(
      formatOscolaShortReference(
        citation,
        context.firstFootnoteNumber,
        context.currentPinpoint,
        context.disambiguate,
        config
      )
    );
  };
  const ibid = (): ResolvedSubsequentReference =>
    asIbid(resolveIbid(context.currentPinpoint, context.precedingPinpoint, config));

  switch (context.formatPreference) {
    case "full":
      return null;
    case "short":
      return shortForm();
    case "ibid":
      return config.ibidEnabled ? ibid() : shortForm();
    default:
      break;
  }

  if (config.ibidEnabled && isIbidEligible(context)) {
    return ibid();
  }
  return shortForm();
}

/**
 * NZLSG 3 §2.3.1 (general style) and NZLSG-008 (commercial style).
 *
 * General: rule 1 gives only the pinpoint when the source is obvious from
 * the immediately preceding footnote (`At [42].`, `Section 8.`); rule 2
 * otherwise repeats the identifier with `, above n X,` and the pinpoint
 * (`Brooker, above n 1, at [42]`), legislation by short title alone
 * (`Privacy Act, s 6`). A `short` preference always takes rule 2; an `ibid`
 * preference is treated as `auto` (ibid is never used, §2.3.1). A second
 * reference within one footnote takes rule 2 (no AGLC `at` gadget; whether
 * rule 1 applies there is a DECISION-040 point). Commercial style renders
 * the identifier and pinpoint only.
 */
function resolveNzlsgSubsequent(
  citation: Citation,
  context: SubsequentReferenceContext,
  config: CitationConfig
): ResolvedSubsequentReference | null {
  if (context.formatPreference === "full") {
    return null;
  }

  const pinpoint = context.currentPinpoint;
  const stored = citation.data.nzlsgStyle;
  const style: NZLSGStyle =
    config.nzlsgStyle ?? (stored === "commercial" || stored === "general" ? stored : "general");

  if (style === "commercial") {
    return asShort(formatNzlsgCommercialReference(citation, pinpoint, config));
  }

  // §2.3.1(a) rule 1: the source is obvious from the immediately preceding
  // footnote, which cited this one source.
  const obvious =
    context.formatPreference !== "short" &&
    context.isSameAsPreceding &&
    context.precedingFootnoteCitationCount === 1;
  if (obvious && pinpoint) {
    const only = formatNzlsgPinpointOnly(citation, pinpoint, config);
    if (only !== null) {
      return asShort(only);
    }
  }

  // §2.3.1(a) rule 2
  return asShort(
    formatNzlsgShortReference(
      citation,
      context.firstFootnoteNumber,
      pinpoint,
      context.disambiguate,
      config
    )
  );
}
