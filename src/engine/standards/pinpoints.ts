/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-014 — Standard-aware pinpoints.
 *
 * One place that turns a typed `Pinpoint` into the punctuated suffix a
 * standard appends to a citation: the label vocabulary (`s`, `reg`, `fn`,
 * `para`, …), the paragraph form (`[42]` or `para 42`), the joiner before
 * the pinpoint (comma, space, nothing) and the NZLSG `at` prefix. The
 * type is what is stored (occurrence titles and `data.pinpoint`); the label
 * is chosen here, at render time, from the config's standard.
 *
 * Rule sources (docs/standards-rule-notes.md, paraphrased — no guide text):
 * - AGLC4 1.1.6–1.1.7: pages bare, paragraphs `[n]`, labelled types `s 6`;
 *   rendered through `formatPinpoint` unchanged (the AGLC dispatchers do
 *   not call this module, so AGLC output is untouched).
 * - OSCOLA 5 §1.2.1: pinpoint after `(n X)` with no comma; declared short
 *   form then comma then provision (`SARAH, s 2`). §2.1.6: paragraph
 *   pinpoints `[n]` at the very end with no comma; page pinpoints follow a
 *   bracketed court identifier with no comma; OSCOLA 4 §2.1.6 put a comma
 *   before a page pinpoint when no closing bracket precedes it (kept here;
 *   Unresolved 1). §2.4.2 / §2.5.2: `, s 6`, `, ss 1(1) and 4(3)`, `, sch 1`,
 *   `, reg 7(2)`. §3.1.3: pages bare after the publication bracket, footnote
 *   sub-pinpoint `9 fn 6`. §3.2.1: book paragraphs take `para`, never
 *   square brackets. §3.3: journal pinpoint after a comma (`554, 42`).
 *   §4.1.1: `art` after a comma unless it follows a closing bracket.
 *   OSCOLA 4 §2.7.1: ECtHR paragraph pinpoints `, para 42`.
 * - NZLSG 3 §3.2.8: every case pinpoint is prefixed `at`; paragraphs `[n]`;
 *   pages bare; several pinpoints comma separated with `and` before the
 *   last; ranges with an unspaced en dash. §2.3.1(a)(i): `, above n X, at 42`;
 *   §2.3.1(a)(ii): legislation `Securities Act, s 63` with no `above n`.
 *   §4.1.1(d) / §4.3.1: `, s 59`, `, reg 3`, `, sch 3 cl 4`; labels `s/ss`,
 *   `subs/subss`, `sch/schs`, `pt/pts`, `art/arts`, `r/rr`, `sub-r`,
 *   `reg/regs`, `sub-reg`, `cl/cls`, `sub-cl`. §6.1.8: `at 164`, `at [1206]`,
 *   `at ch 1`, `at 189, n 92`. §10.1.1: treaty `, art 5`.
 */

import type { Pinpoint } from "../../types/citation";
import type { CitationConfig } from "./types";
import { formatPinpoint, pinpointFromTitleString } from "../rules/v4/general/pinpoints";

// ─── Context ────────────────────────────────────────────────────────────────

/**
 * What the pinpoint follows. The kind of citation decides the label
 * vocabulary (OSCOLA `para` for secondary sources) and the default joiner
 * (comma after a report or a statute title, space after `(n X)`).
 */
export type PinpointPosition =
  /** A neutral citation (`[2008] UKHL 13`). */
  | "neutral"
  /** A report citation or a starting page (`[2008] 1 AC 884`, `72 MLR 554`). */
  | "report"
  /** A statute, SI, bill, treaty or OJ instrument (`Human Rights Act 1998`). */
  | "statute"
  /** A secondary source's publication details (`(OUP 2008)`). */
  | "secondary"
  /** A source cited by paragraph (ECtHR, CJEU, ICJ, ICC, WTO). */
  | "paragraph-source"
  /** A cross-reference: `(n X)`, `above n X`, `ibid`. */
  | "cross-reference"
  /** A declared short form used alone (`SARAH`, `UNCLOS`, `Privacy Act`). */
  | "short-form";

export interface PinpointFormatContext {
  after: PinpointPosition;
  /**
   * True when the rendered citation ends with a closing round bracket (a
   * court identifier, publication details, a declared short form, a date):
   * OSCOLA §2.1.6 / §4.1.1 / §1.2.1 then drop the comma.
   */
  afterBracket?: boolean;
  /** Overrides the standard's joiner (the punctuation before the pinpoint). */
  joiner?: "comma" | "space" | "none";
}

type Family = "aglc" | "oscola" | "nzlsg";

function familyOf(config: CitationConfig): Family {
  if (config.standardId.startsWith("oscola")) return "oscola";
  if (config.standardId.startsWith("nzlsg")) return "nzlsg";
  return "aglc";
}

// ─── Normalisation ──────────────────────────────────────────────────────────

/**
 * The typed pinpoint behind a `data.pinpoint` value: a `Pinpoint` object is
 * kept (dropped when it has no usable value); a string from a form is
 * decoded by type the way an occurrence title is (`[42]` paragraph, `s 6`
 * section, `6 [23]` page with a paragraph sub-pinpoint, otherwise page).
 */
export function normaliseStringPinpoint(raw: unknown): Pinpoint | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "string") return pinpointFromTitleString(raw);
  if (typeof raw === "object") {
    const candidate = raw as Partial<Pinpoint>;
    if (typeof candidate.value !== "string" || candidate.value.trim() === "") return undefined;
    return raw as Pinpoint;
  }
  return undefined;
}

// ─── Label tables ───────────────────────────────────────────────────────────

type LabelledType = Exclude<Pinpoint["type"], "page" | "paragraph">;

/** OSCOLA 5 §2.4.2, §2.5.2, §3.1.3 singular labels (`fn` for footnotes). */
const OSCOLA_LABELS: Record<LabelledType, string> = {
  footnote: "fn",
  section: "s",
  chapter: "ch",
  part: "pt",
  clause: "cl",
  schedule: "sch",
  article: "art",
  regulation: "reg",
  rule: "r",
  column: "col",
  line: "line",
  division: "div",
  appendix: "app",
  subdivision: "sub-div",
  subsection: "sub-s",
  subclause: "sub-cl",
  subparagraph: "subpara",
  subregulation: "sub-reg",
  subrule: "sub-r",
  order: "ord",
  item: "item",
};

/** OSCOLA plural labels for spans and lists (`ss 1(1) and 4(3)`, `regs`, `cols 973–76`). */
const OSCOLA_PLURALS: Partial<Record<LabelledType, string>> = {
  section: "ss",
  chapter: "chs",
  part: "pts",
  clause: "cls",
  schedule: "schs",
  article: "arts",
  regulation: "regs",
  rule: "rr",
  column: "cols",
  subsection: "sub-ss",
  subparagraph: "subparas",
};

/** NZLSG 3 §4.1.1(d), §6.1.8 singular labels (`subs`, `n` for footnotes). */
const NZLSG_LABELS: Record<LabelledType, string> = {
  footnote: "n",
  section: "s",
  chapter: "ch",
  part: "pt",
  clause: "cl",
  schedule: "sch",
  article: "art",
  regulation: "reg",
  rule: "r",
  column: "col",
  line: "line",
  division: "div",
  appendix: "app",
  subdivision: "sub-div",
  subsection: "subs",
  subclause: "sub-cl",
  subparagraph: "sub-para",
  subregulation: "sub-reg",
  subrule: "sub-r",
  order: "ord",
  item: "item",
};

/** NZLSG plural labels (`ss`, `subss`, `schs`, `pts`, `arts`, `rr`, `regs`, `cls`). */
const NZLSG_PLURALS: Partial<Record<LabelledType, string>> = {
  section: "ss",
  subsection: "subss",
  schedule: "schs",
  part: "pts",
  article: "arts",
  rule: "rr",
  regulation: "regs",
  clause: "cls",
  footnote: "nn",
};

/** True when a value names several provisions or a span (`1(1) and 4(3)`, `5–7`, `2, 4`). */
function isPlural(value: string): boolean {
  return /[–,-]|\band\b/.test(value);
}

/** Digit-hyphen-digit spans take an en dash (OSCOLA 5 §1.3.2; NZLSG 3 §1.2.3). */
function enDashSpans(value: string): string {
  return value.replace(/(\d)-(\d)/g, "$1–$2");
}

/** NZLSG 3 §3.2.8: several pinpoints comma separated with `and` before the last. */
function nzlsgList(value: string): string {
  if (/\band\b/.test(value)) return value;
  const items = value
    .split(/\s*,\s*/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
  if (items.length < 2) return value;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The paragraph numbers of a `[42]`, `[42]–[45]` or `42` value, bracket-free. */
function stripParagraphBrackets(value: string): string {
  return value.replace(/\[([^\]]*)\]/g, "$1");
}

/** A paragraph value in square brackets: `42` → `[42]`, `42–45` → `[42]–[45]`; bracketed input unchanged. */
function bracketParagraphs(value: string): string {
  if (value.includes("[")) return value;
  return value
    .split(/(\s*[–,-]\s*|\s+and\s+)/)
    .map((piece, i) => (i % 2 === 0 && piece.trim() !== "" ? `[${piece.trim()}]` : piece))
    .join("");
}

// ─── Text (label + value) ───────────────────────────────────────────────────

function aglcText(pinpoint: Pinpoint): string {
  return formatPinpoint(pinpoint)
    .map((run) => run.text)
    .join("");
}

/**
 * OSCOLA: `42`, `[42]` (or `para 42` for secondary sources and, under
 * OSCOLA 4, for paragraph-cited international sources), `s 6`, `9 fn 6`.
 */
function oscolaText(pinpoint: Pinpoint, ctx: PinpointFormatContext, oscola4: boolean): string {
  const value = enDashSpans(pinpoint.value.trim());
  let text: string;
  if (pinpoint.type === "page") {
    text = value;
  } else if (pinpoint.type === "paragraph") {
    const usePara = ctx.after === "secondary" || (oscola4 && ctx.after === "paragraph-source");
    if (usePara) {
      const bare = stripParagraphBrackets(value);
      text = `${isPlural(bare) ? "paras" : "para"} ${bare}`;
    } else {
      text = bracketParagraphs(value);
    }
  } else {
    const label =
      (isPlural(value) && OSCOLA_PLURALS[pinpoint.type]) || OSCOLA_LABELS[pinpoint.type];
    text = `${label} ${value}`;
  }
  if (pinpoint.subPinpoint) {
    // §3.1.3 `9 fn 6`; AGLC-style `6 [23]` keeps the space.
    text += ` ${oscolaText(pinpoint.subPinpoint, ctx, oscola4)}`;
  }
  return text;
}

/**
 * NZLSG: `42`, `[42]`, `s 6`, `sch 3 cl 4`, `189, n 92`; spans with an en
 * dash and lists with `and` before the last item (§3.2.8).
 */
function nzlsgText(pinpoint: Pinpoint): string {
  const value = nzlsgList(enDashSpans(pinpoint.value.trim()));
  let text: string;
  if (pinpoint.type === "page") {
    text = value;
  } else if (pinpoint.type === "paragraph") {
    text = bracketParagraphs(value);
  } else {
    const label = (isPlural(value) && NZLSG_PLURALS[pinpoint.type]) || NZLSG_LABELS[pinpoint.type];
    text = `${label} ${value}`;
  }
  if (pinpoint.subPinpoint) {
    // §6.1.8 `at 189, n 92`; §4.1.1(d) `sch 3 cl 4`; otherwise a space.
    const joiner = pinpoint.subPinpoint.type === "footnote" ? ", " : " ";
    text += `${joiner}${nzlsgText(pinpoint.subPinpoint)}`;
  }
  return text;
}

/**
 * The labelled pinpoint text without any joiner or `at` prefix — what a
 * short-form formatter writes after its own separator.
 */
export function pinpointText(
  config: CitationConfig,
  pinpoint: Pinpoint | string | undefined,
  ctx: PinpointFormatContext
): string {
  const pin = normaliseStringPinpoint(pinpoint);
  if (!pin) return "";
  switch (familyOf(config)) {
    case "oscola":
      return oscolaText(pin, ctx, config.standardId === "oscola4");
    case "nzlsg":
      return nzlsgText(pin);
    default:
      return aglcText(pin);
  }
}

// ─── Joiner and prefix ──────────────────────────────────────────────────────

type Joiner = "" | " " | ", ";

function joinerFor(override: PinpointFormatContext["joiner"]): Joiner | undefined {
  switch (override) {
    case "comma":
      return ", ";
    case "space":
      return " ";
    case "none":
      return "";
    default:
      return undefined;
  }
}

const LEGISLATIVE_POSITIONS: ReadonlySet<PinpointPosition> = new Set(["statute", "short-form"]);

/**
 * OSCOLA: paragraphs `[n]` never take a comma (§2.1.6); nothing after a
 * closing bracket or `(n X)` does (§1.2.1, §2.1.6, §4.1.1); OSCOLA 4 ECtHR
 * `, para` (§2.7.1); otherwise a comma (§2.4.2 `, s 6`; §3.3 `554, 42`;
 * OSCOLA 4 §2.1.6 page after a report page).
 */
function oscolaJoiner(pin: Pinpoint, ctx: PinpointFormatContext, oscola4: boolean): Joiner {
  if (ctx.after === "cross-reference") return " ";
  if (oscola4 && ctx.after === "paragraph-source" && pin.type === "paragraph") return ", ";
  if (ctx.afterBracket) return " ";
  if (pin.type === "paragraph" && ctx.after !== "secondary") return " ";
  if (ctx.after === "secondary" || ctx.after === "paragraph-source") return " ";
  return ", ";
}

/**
 * NZLSG: `at` before pages and paragraphs everywhere and before labelled
 * types outside legislation and cross-references (§3.2.8, §6.1.8); a comma
 * after a statute title, a declared short form or `above n X` (§4.1.1(d),
 * §2.3.1); a space elsewhere. A page or paragraph pinpoint on legislation
 * is not exemplified and takes the legislation comma with `at`.
 */
function nzlsgSuffix(pin: Pinpoint, ctx: PinpointFormatContext, text: string): string {
  const legislative = LEGISLATIVE_POSITIONS.has(ctx.after);
  const crossRef = ctx.after === "cross-reference";
  const bare = pin.type === "page" || pin.type === "paragraph";
  const at = bare || (!legislative && !crossRef) ? "at " : "";
  const joiner = joinerFor(ctx.joiner) ?? (legislative || crossRef ? ", " : " ");
  return `${joiner}${at}${text}`;
}

/** AGLC mirror of the v4 dispatchers (they render their own pinpoints; this is for callers with a config). */
function aglcJoiner(pin: Pinpoint, ctx: PinpointFormatContext): Joiner {
  if (ctx.after === "cross-reference" || ctx.afterBracket) return " ";
  if (pin.type === "page" && (ctx.after === "report" || ctx.after === "neutral")) return ", ";
  return " ";
}

/**
 * The fully punctuated suffix a standard appends after the citation text
 * for `pinpoint` — including the leading `, ` / ` ` / ` at ` — or an empty
 * string when there is no usable pinpoint. Strings are normalised by type
 * (`normaliseStringPinpoint`).
 */
export function formatPinpointFor(
  config: CitationConfig,
  pinpoint: Pinpoint | string | undefined,
  ctx: PinpointFormatContext
): string {
  const pin = normaliseStringPinpoint(pinpoint);
  if (!pin) return "";
  const text = pinpointText(config, pin, ctx);
  if (text === "") return "";
  switch (familyOf(config)) {
    case "oscola": {
      const joiner =
        joinerFor(ctx.joiner) ?? oscolaJoiner(pin, ctx, config.standardId === "oscola4");
      return `${joiner}${text}`;
    }
    case "nzlsg":
      return nzlsgSuffix(pin, ctx, text);
    default:
      return `${joinerFor(ctx.joiner) ?? aglcJoiner(pin, ctx)}${text}`;
  }
}

/** True when the rendered text ends with a closing round bracket (ignoring trailing space). */
export function endsWithClosingBracket(text: string): boolean {
  return text.trimEnd().endsWith(")");
}
