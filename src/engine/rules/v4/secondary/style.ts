/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-016 — Secondary-source style derived from the citation config.
 *
 * The AGLC4 secondary formatters (books, chapters, journal articles, theses,
 * internet materials) are shared by every standard that has no native
 * formatter for a source type. `secondaryStyleFor` turns the optional
 * STD-016 fields of a `CitationConfig` into the concrete choices those
 * formatters make; with no config (or an AGLC config) every choice is the
 * AGLC4 one, so the AGLC output is unchanged.
 *
 * Rule authority (docs/standards-rule-notes.md unless AGLC):
 * - AGLC4 4.1, 5.1–5.7, 6.1–6.6, 7.2.5, 7.15 (derived rule references).
 * - OSCOLA 5 §3.2.1 books `(edn, Publisher year)`, `para` for book
 *   paragraphs; §3.2.4 chapters without a start page; §3.3 articles with the
 *   pinpoint after a comma; §3.7.1 websites; §3.7.6 theses italic; §1.5
 *   single quotation marks, double within.
 * - NZLSG 3 §6.1.1 books `Author Title (edn, Publisher, Place, year) at
 *   pinpoint`; §6.2 chapters with the start page; §6.4 articles; §6.7.1
 *   theses in double quotes; §7.1.1 websites; §1.2.2 double quotation marks,
 *   single within; §6.1.8 every pinpoint takes `at`.
 */

import { Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import type { CitationConfig } from "../../../standards/types";
import { formatPinpoint } from "../general/pinpoints";

/** The standard family a config belongs to. */
export type StandardFamily = "aglc" | "oscola" | "nzlsg";

/** Curly quotation marks as an [open, close] pair. */
export type QuoteMarks = readonly [string, string];

export const SINGLE_MARKS: QuoteMarks = ["‘", "’"];
export const DOUBLE_MARKS: QuoteMarks = ["“", "”"];

/** The concrete choices the secondary formatters make for one standard. */
export interface SecondaryStyle {
  family: StandardFamily;
  /** Outer quotation-mark style (AGLC4 1.8.2 / OSCOLA 5 §1.5 single; NZLSG 3 §1.2.2 double). */
  quotationMarkStyle: "single" | "double";
  /** The outer marks as a curly [open, close] pair. */
  quoteMarks: QuoteMarks;
  /** Whether curly marks inside a quoted title are swapped to the inner style (OSCOLA 5 §3.3, NZLSG 3 §6.4). */
  swapInnerMarks: boolean;
  /** Text between the author element and the title. */
  authorTitleSeparator: ", " | " ";
  /** Text between the editors' `(eds)` and the book title in a chapter citation. */
  editorsTitleSeparator: ", " | " ";
  editionAbbreviation: "ed" | "edn";
  /** AGLC4 6.3.2 sets the ordinal indicator in superscript; the other guides show it plain. */
  superscriptOrdinal: boolean;
  bookParenthesisOrder: NonNullable<CitationConfig["bookParenthesisOrder"]>;
  includePlaceOfPublication: boolean;
  chapterStartPage: boolean;
  journalTitleItalic: boolean;
  thesisTitleStyle: "quoted" | "italic";
  websiteStyle: "aglc" | "oscola" | "nzlsg";
  /** Every pinpoint takes `at` (NZLSG 3 §6.1.8). */
  pinpointPrefix: "" | "at ";
  /** Book/chapter paragraph pinpoints: AGLC/NZLSG `[42]`; OSCOLA 5 §3.2.1 `para 42`. */
  paragraphPinpointStyle: "brackets" | "para";
}

/** The family a config belongs to, from its standard id. */
export function standardFamily(config?: Pick<CitationConfig, "standardId">): StandardFamily {
  const id = config?.standardId ?? "aglc4";
  if (id.startsWith("oscola")) return "oscola";
  if (id.startsWith("nzlsg")) return "nzlsg";
  return "aglc";
}

const FAMILY_DEFAULTS: Record<
  StandardFamily,
  Pick<
    SecondaryStyle,
    | "authorTitleSeparator"
    | "bookParenthesisOrder"
    | "includePlaceOfPublication"
    | "chapterStartPage"
    | "journalTitleItalic"
    | "thesisTitleStyle"
    | "websiteStyle"
    | "editionAbbreviation"
    | "pinpointPrefix"
  > & { quotationMarkStyle: "single" | "double" }
> = {
  aglc: {
    authorTitleSeparator: ", ",
    bookParenthesisOrder: "publisher-edition-year",
    includePlaceOfPublication: false,
    chapterStartPage: true,
    journalTitleItalic: true,
    thesisTitleStyle: "quoted",
    websiteStyle: "aglc",
    editionAbbreviation: "ed",
    pinpointPrefix: "",
    quotationMarkStyle: "single",
  },
  oscola: {
    authorTitleSeparator: ", ",
    bookParenthesisOrder: "edition-publisher-year",
    includePlaceOfPublication: false,
    chapterStartPage: false,
    journalTitleItalic: false,
    thesisTitleStyle: "italic",
    websiteStyle: "oscola",
    editionAbbreviation: "edn",
    pinpointPrefix: "",
    quotationMarkStyle: "single",
  },
  nzlsg: {
    authorTitleSeparator: " ",
    bookParenthesisOrder: "edition-publisher-place-year",
    includePlaceOfPublication: true,
    chapterStartPage: true,
    journalTitleItalic: false,
    thesisTitleStyle: "quoted",
    websiteStyle: "nzlsg",
    editionAbbreviation: "ed",
    pinpointPrefix: "at ",
    quotationMarkStyle: "double",
  },
};

/**
 * Derives the secondary-source style from a config. Explicit STD-016 fields
 * win; absent fields fall back to the family's defaults (OSCOLA 4 §3.4.7
 * quoted thesis titles are the one profile-level departure from the
 * family, carried by the oscola4 profile's `thesisTitleStyle`). No config
 * means AGLC4.
 */
export function secondaryStyleFor(config?: CitationConfig): SecondaryStyle {
  const family = standardFamily(config);
  const defaults = FAMILY_DEFAULTS[family];
  const markStyle = config?.quotationMarkStyle ?? defaults.quotationMarkStyle;
  return {
    family,
    quotationMarkStyle: markStyle,
    quoteMarks: markStyle === "double" ? DOUBLE_MARKS : SINGLE_MARKS,
    swapInnerMarks: family !== "aglc",
    authorTitleSeparator:
      config?.authorTitleSeparator === undefined
        ? defaults.authorTitleSeparator
        : config.authorTitleSeparator === "space"
          ? " "
          : ", ",
    editorsTitleSeparator:
      (config?.authorTitleSeparator ?? (family === "nzlsg" ? "space" : "comma")) === "space"
        ? " "
        : ", ",
    editionAbbreviation: config?.editionAbbreviation ?? defaults.editionAbbreviation,
    superscriptOrdinal: family === "aglc",
    bookParenthesisOrder: config?.bookParenthesisOrder ?? defaults.bookParenthesisOrder,
    includePlaceOfPublication:
      config?.includePlaceOfPublication ?? defaults.includePlaceOfPublication,
    chapterStartPage: config?.chapterStartPage ?? defaults.chapterStartPage,
    journalTitleItalic:
      config?.journalTitleStyle === undefined
        ? defaults.journalTitleItalic
        : config.journalTitleStyle === "italic",
    thesisTitleStyle: config?.thesisTitleStyle ?? defaults.thesisTitleStyle,
    websiteStyle: config?.websiteStyle ?? defaults.websiteStyle,
    pinpointPrefix: config?.pinpointPrefix ?? defaults.pinpointPrefix,
    paragraphPinpointStyle: family === "oscola" ? "para" : "brackets",
  };
}

// ─── Quotation marks ────────────────────────────────────────────────────────

/**
 * Encloses title runs in the given marks (the generalisation of
 * `quoteTitleRuns`, which is fixed to ‘ ’): the marks join a roman edge run
 * or stand alone beside an italic one, so a title that opens or closes in
 * italics keeps the marks roman.
 */
export function quoteRunsWith(runs: FormattedRun[], marks: QuoteMarks): FormattedRun[] {
  const [open, close] = marks;
  if (runs.length === 0) {
    return [{ text: `${open}${close}` }];
  }
  const quoted = runs.map((run) => ({ ...run }));

  const first = quoted[0];
  if (first.italic) {
    quoted.unshift({ text: open });
  } else {
    first.text = open + first.text;
  }

  const last = quoted[quoted.length - 1];
  if (last.italic) {
    quoted.push({ text: close });
  } else {
    last.text += close;
  }

  return quoted;
}

/**
 * Swaps curly quotation marks inside a text to the style nested within
 * `outer`: single outer marks take double marks within (AGLC4 1.5.1,
 * OSCOLA 5 §1.5 and §3.3), double outer marks take single within (NZLSG 3
 * §1.2.2(b), §6.4). Only paired curly marks are touched: a ’ with no open
 * ‘ before it is an apostrophe (`Birks’ Unjust Enrichment`) and stays.
 * Straight marks are left alone.
 */
export function nestInnerMarks(text: string, outer: "single" | "double"): string {
  if (outer === "single") {
    // Inner single → double. Pair ‘ … ’ left to right; unmatched ’ is an apostrophe.
    let depth = 0;
    let out = "";
    for (const ch of text) {
      if (ch === "‘") {
        depth += 1;
        out += "“";
      } else if (ch === "’" && depth > 0) {
        depth -= 1;
        out += "”";
      } else {
        out += ch;
      }
    }
    return out;
  }
  // Inner double → single. “ and ” are never apostrophes.
  return text.replace(/“/g, "‘").replace(/”/g, "’");
}

// ─── Pinpoints ──────────────────────────────────────────────────────────────

/** `[42]` → `42`, `[42]–[44]` → `42–44` (OSCOLA 5 §3.2.1 book paragraphs take `para`). */
function unbracket(value: string): string {
  return value.replace(/[[\]]/g, "");
}

/**
 * Renders a secondary-source pinpoint per the style, including the text
 * that joins it to the citation:
 * - AGLC: `separator` then the AGLC4 form (`42`, `[42]`, `s 6`);
 * - OSCOLA: `separator` then a bare page, `para 42` for a paragraph
 *   (§3.2.1), or the labelled form for other subdivisions;
 * - NZLSG: ` at ` then the AGLC4 form (§6.1.8 `at 164`, `at [1206]`).
 *
 * `separator` is the AGLC/OSCOLA joiner: a space after a closing bracket
 * (AGLC4 6.4, OSCOLA 5 §3.2.1) or a comma after a starting page (AGLC4 5.7,
 * OSCOLA 5 §3.3).
 *
 * STD-014 introduces `formatPinpointFor(config, pinpoint)`; when it lands,
 * this helper should delegate the pinpoint body to it.
 */
export function pushSecondaryPinpoint(
  runs: FormattedRun[],
  pinpoint: Pinpoint,
  style: SecondaryStyle,
  separator: " " | ", "
): void {
  if (style.family === "aglc") {
    runs.push({ text: separator });
    runs.push(...formatPinpoint(pinpoint));
    return;
  }
  if (style.pinpointPrefix === "at ") {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(pinpoint, "at "));
    return;
  }
  runs.push({ text: separator });
  if (pinpoint.type === "paragraph" && style.paragraphPinpointStyle === "para") {
    runs.push({ text: `para ${unbracket(pinpoint.value)}` });
    if (pinpoint.subPinpoint) {
      runs.push({ text: " " });
      runs.push(...formatPinpoint(pinpoint.subPinpoint));
    }
    return;
  }
  runs.push(...formatPinpoint(pinpoint));
}
