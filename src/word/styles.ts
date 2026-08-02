/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

import type { CitationStandardId } from "../engine/standards/types";

// ─── Roman Numeral Conversion ────────────────────────────────────────────────

/**
 * Converts a positive integer to its Roman numeral representation.
 *
 * @param num - A positive integer to convert.
 * @returns The Roman numeral string (e.g. 1 -> "I", 4 -> "IV").
 */
export function toRoman(num: number): string {
  if (num <= 0) return "";

  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];

  let result = "";
  let remaining = num;

  for (let i = 0; i < values.length; i++) {
    while (remaining >= values[i]) {
      result += symbols[i];
      remaining -= values[i];
    }
  }

  return result;
}

// ─── Selection Paragraph Resolution ──────────────────────────────────────────

/**
 * Returns the paragraphs the user's selection visibly covers, for
 * paragraph-level styling.
 *
 * Word's `selection.paragraphs` includes any paragraph the range merely
 * touches at a zero-width boundary — e.g. a selection anchored at the end of
 * the previous paragraph, or one that swallows the target line's trailing
 * paragraph mark. Styling those boundary paragraphs restyles text the user
 * never selected. When the selection spans multiple paragraphs, this drops
 * the ones whose intersection with the selection contains no text; a
 * collapsed selection (cursor only) keeps its single paragraph.
 */
export async function getSelectedStyleParagraphs(
  context: Word.RequestContext
): Promise<Word.Paragraph[]> {
  const selection = context.document.getSelection();
  const paragraphs = context.document.getSelection().paragraphs;
  paragraphs.load("items");
  await context.sync();

  const items = paragraphs.items ?? [];
  if (items.length <= 1) return items;

  const intersections = items.map((para) =>
    para.getRange("Whole").intersectWithOrNullObject(selection)
  );
  for (const range of intersections) {
    range.load("isNullObject,text");
  }
  await context.sync();

  const covered = items.filter((_, i) => {
    const range = intersections[i];
    return !range.isNullObject && range.text.length > 0;
  });
  // If every intersection is empty (e.g. only paragraph marks selected),
  // fall back to Word's own answer rather than styling nothing.
  return covered.length > 0 ? covered : items;
}

// ─── Heading Numbering Prefixes (Rule 1.12.2) ───────────────────────────────

/**
 * Returns the correct numbering prefix for an AGLC4 heading level and
 * sequence number.
 *
 * AGLC4 Rule 1.12.2:
 * - Level I:  upper Roman numerals (I, II, III...)
 * - Level II: upper letters (A, B, C...)
 * - Level III: Arabic numerals (1, 2, 3...)
 * - Level IV: lower letters in parentheses ((a), (b), (c)...)
 * - Level V:  lower Roman numerals in parentheses ((i), (ii), (iii)...)
 *
 * @param level - Heading level (1–5).
 * @param number - The sequence number within that level (1-based).
 * @returns The formatted prefix string (e.g. "II", "B", "3", "(c)", "(iv)").
 */
export function getHeadingPrefix(level: 1 | 2 | 3 | 4 | 5, number: number): string {
  switch (level) {
    case 1:
      return toRoman(number);
    case 2:
      return String.fromCharCode(64 + number); // A=65
    case 3:
      return String(number);
    case 4:
      return `(${String.fromCharCode(96 + number)})`; // a=97
    case 5:
      return `(${toRoman(number).toLowerCase()})`;
  }
}

// ─── AGLC4 Document Styles (Rules 1.5.1, 1.12.1, 1.12.2, 1.13) ─────────────

/**
 * Creates all AGLC4 styles in the active Word document.
 *
 * Uses `context.document.addStyle()` (WordApi 1.6+) to create named styles
 * with the correct paragraph and font formatting per AGLC4 rules:
 *
 * - **AGLC4 Block Quote** (Rule 1.5.1): left indent 720 twips (0.5 in),
 *   font size 10 pt, no quotation marks.
 * - **AGLC4 Title** (Rule 1.12.1): bold, centred.
 * - **AGLC4 Author** (Rule 1.12.1): small caps, centred.
 * - **AGLC4 Footnote Text**: 10 pt, single spacing.
 * - **AGLC4 Bibliography Heading** (Rule 1.13): centred, italic.
 * - **AGLC4 Level I–V** (Rule 1.12.2): heading styles with appropriate
 *   formatting and alignment.
 *
 * If a style with the same name already exists, the call to `addStyle` will
 * throw; in that case the error is caught and the existing style is left
 * unchanged.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 */
export async function applyAglc4Styles(context: Word.RequestContext): Promise<void> {
  const doc = context.document;

  // Check if addStyle is available (WordApi 1.6+)
  const canAddStyles = Office.context.requirements.isSetSupported("WordApi", "1.6");
  if (!canAddStyles) {
    // On WordApi 1.5, we cannot create custom styles programmatically.
    // Users will need to use the AGLC4 template file instead.
    return;
  }

  // Helper: create a style, returning null if it already exists.
  // addStyle throws at sync time if the name is taken, so we
  // track names we've already attempted and skip duplicates.
  const attempted = new Set<string>();
  const getOrCreateStyle = (name: string, type: Word.StyleType): Word.Style | null => {
    if (attempted.has(name)) return null;
    attempted.add(name);
    try {
      return doc.addStyle(name, type);
    } catch {
      return null;
    }
  };

  // ── AGLC4 Block Quote (Rule 1.5.1) ──────────────────────────────────────
  // "Quotations of four or more lines ... should be displayed in an
  //  indented block, without quotation marks, in a smaller font."
  const blockQuote = getOrCreateStyle("AGLC4 Block Quote", "Paragraph" as Word.StyleType);
  if (blockQuote) {
    blockQuote.font.size = 10;
    blockQuote.paragraphFormat.leftIndent = 36; // 720 twips = 36pt = 0.5 in
    blockQuote.paragraphFormat.lineSpacing = 12;
  }

  // ── AGLC4 Title (Rule 1.12.1) ───────────────────────────────────────────
  // "The title of the work should appear in bold and be centred."
  const title = getOrCreateStyle("AGLC4 Title", "Paragraph" as Word.StyleType);
  if (title) {
    title.font.bold = true;
    title.paragraphFormat.alignment = "Centered" as Word.Alignment;
  }

  // ── AGLC4 Author (Rule 1.12.1) ──────────────────────────────────────────
  // "The author's name should appear in small capitals and be centred."
  const author = getOrCreateStyle("AGLC4 Author", "Paragraph" as Word.StyleType);
  if (author) {
    author.font.smallCaps = true;
    author.paragraphFormat.alignment = "Centered" as Word.Alignment;
  }

  // ── AGLC4 Footnote Text ─────────────────────────────────────────────────
  const footnoteText = getOrCreateStyle("AGLC4 Footnote Text", "Paragraph" as Word.StyleType);
  if (footnoteText) {
    footnoteText.font.size = 10;
    footnoteText.paragraphFormat.lineSpacing = 12;
  }

  // ── AGLC4 Bibliography Heading (Rule 1.13) ──────────────────────────────
  // Bibliography section headings are centred and in italic. Add visible
  // breathing room before/after each heading so sections are visually
  // separated from the entries above and below.
  const bibHeading = getOrCreateStyle("AGLC4 Bibliography Heading", "Paragraph" as Word.StyleType);
  if (bibHeading) {
    bibHeading.font.italic = true;
    bibHeading.paragraphFormat.alignment = "Centered" as Word.Alignment;
    bibHeading.paragraphFormat.spaceBefore = 18;
    bibHeading.paragraphFormat.spaceAfter = 6;
    try {
      // ATAG Part B / WCAG 1.3.1: give the bibliography heading an outline level so it
      // appears in Word's Navigation pane and document outline. It is a named paragraph
      // style (not a numbered Heading), so it must carry the outline level explicitly.
      bibHeading.paragraphFormat.outlineLevel = "OutlineLevel1" as Word.OutlineLevel;
    } catch {
      // outlineLevel not supported on this platform/API — the heading still renders.
    }
  }

  // ── Modify built-in Heading 1–5 for AGLC4 (Rule 1.12.2) ────────────────
  //
  // Instead of creating new custom styles, we modify Word's built-in
  // Heading 1-5 styles so they appear correctly in the styles pane
  // and work with Word's built-in outline/navigation features.

  const headingConfigs: Array<{
    name: string;
    italic: boolean;
    smallCaps: boolean;
    bold: boolean;
    centered: boolean;
    leftIndent: number;
  }> = [
    {
      name: "Heading 1",
      italic: false,
      smallCaps: true,
      bold: false,
      centered: true,
      leftIndent: 0,
    },
    {
      name: "Heading 2",
      italic: true,
      smallCaps: false,
      bold: false,
      centered: true,
      leftIndent: 0,
    },
    {
      name: "Heading 3",
      italic: true,
      smallCaps: false,
      bold: false,
      centered: false,
      leftIndent: 0,
    },
    {
      name: "Heading 4",
      italic: true,
      smallCaps: false,
      bold: false,
      centered: false,
      leftIndent: 36,
    },
    {
      name: "Heading 5",
      italic: true,
      smallCaps: false,
      bold: false,
      centered: false,
      leftIndent: 72,
    },
  ];

  for (const cfg of headingConfigs) {
    try {
      const style = doc.getStyles().getByName(cfg.name);
      // Don't override the document's default font — let users choose their own
      style.font.size = 12;
      style.font.italic = cfg.italic;
      style.font.smallCaps = cfg.smallCaps;
      style.font.bold = cfg.bold;
      style.font.color = "black";
      style.paragraphFormat.alignment = (cfg.centered ? "Centered" : "Left") as Word.Alignment;
      style.paragraphFormat.leftIndent = cfg.leftIndent;
      style.paragraphFormat.firstLineIndent = 0;
      style.paragraphFormat.spaceAfter = 12;
      style.paragraphFormat.spaceBefore = 12;
      await context.sync();
    } catch {
      // getStyles/getByName not available or style not found — skip
    }
  }
}

// ─── Multilevel Heading Numbering (Rule 1.12.2) ─────────────────────────────

/**
 * AGLC4 heading numbering configuration per level.
 *
 * Each entry maps to the Word.ListNumbering format and an optional
 * format string array for `setLevelNumbering`. Levels 4 and 5 use
 * parenthetical wrapping per AGLC4 Rule 1.12.2.
 */
const HEADING_LEVEL_CONFIG: ReadonlyArray<{
  listNumbering: string;
  formatString?: Array<string | number>;
}> = [
  // Level 1 (index 0): Upper Roman — I, II, III
  { listNumbering: "UpperRoman" },
  // Level 2 (index 1): Upper Letter — A, B, C
  { listNumbering: "UpperLetter" },
  // Level 3 (index 2): Arabic — 1, 2, 3
  { listNumbering: "Arabic" },
  // Level 4 (index 3): Lower letter in parens — (a), (b), (c)
  { listNumbering: "LowerLetter", formatString: ["(", 3, ")"] },
  // Level 5 (index 4): Lower Roman in parens — (i), (ii), (iii)
  { listNumbering: "LowerRoman", formatString: ["(", 4, ")"] },
];

/**
 * Creates an AGLC4 multilevel list on a paragraph and configures all five
 * heading numbering levels per Rule 1.12.2.
 *
 * The Word JS API (WordApi 1.3+) supports `paragraph.startNewList()` to
 * create a new list, then `list.setLevelNumbering()` to configure each
 * level's numbering format. However, the API does not support binding a
 * custom multilevel list to a *style* (that requires WordApiDesktop 1.1).
 *
 * This function should be called on the first heading paragraph in the
 * document to bootstrap the list. Subsequent heading paragraphs can then
 * be attached to the same list using `paragraph.attachToList(listId, level)`.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 * @param paragraph - The paragraph to start the list on.
 * @param level - The heading level (1–5) for this paragraph.
 * @returns The created Word.List object (with its id loaded).
 */
export async function createAglc4HeadingList(
  context: Word.RequestContext,
  paragraph: Word.Paragraph,
  level: 1 | 2 | 3 | 4 | 5
): Promise<Word.List> {
  const list = paragraph.startNewList();

  // Configure all five levels of the multilevel list
  for (let i = 0; i < HEADING_LEVEL_CONFIG.length; i++) {
    const config = HEADING_LEVEL_CONFIG[i];
    list.setLevelNumbering(i, config.listNumbering as Word.ListNumbering, config.formatString);
    list.setLevelStartingNumber(i, 1);
  }

  // Sync to create the list and get its ID
  list.load("id");
  await context.sync();

  // Now attach the paragraph to the correct level (0-based)
  paragraph.attachToList(list.id, level - 1);
  await context.sync();

  return list;
}

/**
 * Applies AGLC4 heading style and automatic numbering to the selected
 * paragraphs. If an AGLC4 heading list already exists in the document,
 * paragraphs are attached to it; otherwise a new multilevel list is
 * created.
 *
 * When the Word list API is not available (WordApi < 1.3), heading
 * prefixes are prepended as plain text using `getHeadingPrefix`.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 * @param paragraph - The paragraph to format.
 * @param level - The heading level (1–5).
 * @param number - The sequence number within that level (1-based).
 * @param existingListId - Optional ID of an existing AGLC4 heading list.
 */
/**
 * Tag prefix used on content controls to identify AGLC4 headings.
 * The full tag is `obiter-heading-{level}` (e.g., `obiter-heading-1`).
 */
export const HEADING_TAG_PREFIX = "obiter-heading-";

/**
 * Scans the document for an existing paragraph with a Heading style that
 * is already part of a multilevel list. Returns the list ID if found, or
 * undefined if no heading list exists. This allows reattaching to the same
 * list after a document close/reopen cycle.
 */
export async function findExistingHeadingListId(
  context: Word.RequestContext
): Promise<number | undefined> {
  try {
    const body = context.document.body;
    const paragraphs = body.paragraphs;
    paragraphs.load("items/style,items/isListItem");
    await context.sync();

    for (const para of paragraphs.items ?? []) {
      if (para.style && para.style.startsWith("Heading") && para.isListItem) {
        // Access the list via listItem — load listString which contains the list ID
        const listItem = para.listItem;
        listItem.load("level");
        const list = para.list;
        list.load("id");
        await context.sync();
        return list.id;
      }
    }
  } catch {
    // List API not available or no headings found
  }
  return undefined;
}

export async function applyHeadingLevel(
  context: Word.RequestContext,
  paragraph: Word.Paragraph,
  level: 1 | 2 | 3 | 4 | 5,
  _number?: number,
  _existingListId?: number
): Promise<Word.List | undefined> {
  // Use Word's built-in Heading styles. If applyAglc4Styles has been run,
  // Strip any old text-based numbering prefixes from previous approaches
  paragraph.load("text");
  await context.sync();
  const stripped = cleanHeadingBody(paragraph.text, level);
  if (stripped !== paragraph.text) {
    paragraph.insertText(stripped, "Replace" as Word.InsertLocation.replace);
    await context.sync();
  }

  // Remove any old heading content controls from previous approaches
  const oldControls = paragraph.contentControls;
  oldControls.load("items/tag");
  await context.sync();
  const oldControlItems = oldControls.items ?? [];
  for (const cc of oldControlItems) {
    if (cc.tag && cc.tag.startsWith(HEADING_TAG_PREFIX)) {
      cc.delete(true); // keep content
    }
  }
  if (oldControlItems.some((cc) => cc.tag?.startsWith(HEADING_TAG_PREFIX))) {
    await context.sync();
  }

  // Apply built-in Heading style for outline level + styles pane
  paragraph.style = `Heading ${level}`;

  // Override formatting to match AGLC4 Rule 1.12.2
  paragraph.font.italic = level >= 2;
  paragraph.font.bold = false;
  paragraph.font.smallCaps = level === 1;
  paragraph.font.size = 12;
  // Don't override the document's default font
  paragraph.font.color = "black";
  paragraph.alignment = (level <= 2 ? "Centered" : "Left") as Word.Alignment;

  // Reset indentation per AGLC4 Rule 1.12.2 — Word's built-in Heading
  // styles carry default leftIndent values that must be overridden.
  // Levels I–III at the left margin, IV indented once, V indented twice.
  paragraph.firstLineIndent = 0;
  if (level <= 3) {
    paragraph.leftIndent = 0;
  } else if (level === 4) {
    paragraph.leftIndent = 36; // 0.5in
  } else {
    paragraph.leftIndent = 72; // 1.0in
  }

  await context.sync();

  // Word (notably Word for Mac) attaches its own built-in multilevel list to
  // paragraphs when the built-in "Heading N" style is applied, which renders
  // an automatic number (e.g. "1"). AGLC4 numbering is applied separately as a
  // text prefix by renumberAllHeadings, so leaving Word's list attached yields
  // a doubled "1  I BACKGROUND". Detach from any auto-applied list so only the
  // AGLC4 text prefix remains. detachFromList() throws if the paragraph is not
  // a list item, so guard on isListItem.
  try {
    paragraph.load("isListItem");
    await context.sync();
    if (paragraph.isListItem) {
      paragraph.detachFromList();
      await context.sync();
    }
  } catch {
    // detachFromList unsupported on this host — nothing to strip.
  }

  // Numbering: use text-prefix approach instead of Word's multilevel
  // list API, which is unreliable on Mac (numbering disappears after
  // document close/reopen, re-renders, or undo). Text prefixes are
  // visible, persistent, and work identically across all platforms.
  //
  // After applying the heading style, we call renumberAllHeadings()
  // to scan all headings and assign correct numbered prefixes.
  // The caller (Styling.tsx) handles calling renumberAllHeadings.
  //
  // Skip the list API entirely:
  try {
    const needsNewList = false;

    if (needsNewList) {
      // Create list, configure all 5 levels, then sync
      const list = paragraph.startNewList();
      // Configure all 5 AGLC4 heading levels (Rule 1.12.2)
      // Level I:   I, II, III        (UpperRoman)
      // Level II:  A, B, C           (UpperLetter)
      // Level III: 1, 2, 3           (Arabic)
      // Level IV:  (a), (b), (c)     (LowerLetter with parens)
      // Level V:   (i), (ii), (iii)  (LowerRoman with parens)
      list.setLevelNumbering(0, "UpperRoman" as Word.ListNumbering, [0]);
      list.setLevelNumbering(1, "UpperLetter" as Word.ListNumbering, [1]);
      list.setLevelNumbering(2, "Arabic" as Word.ListNumbering, [2]);
      list.setLevelNumbering(3, "LowerLetter" as Word.ListNumbering, ["(", 3, ")"]);
      list.setLevelNumbering(4, "LowerRoman" as Word.ListNumbering, ["(", 4, ")"]);
      for (let i = 0; i < 5; i++) {
        list.setLevelStartingNumber(i, 1);
      }
      list.load("id");
      await context.sync();

      // If applying to a level other than 1, re-attach at correct level
      if (level > 1) {
        paragraph.attachToList(list.id, level - 1);
        await context.sync();
      }

      return list;
    }
  } catch {
    // List API unavailable — no fallback numbering, just the style
  }

  return undefined;
}

/**
 * Scans all content controls tagged as AGLC4 headings and renumbers
 * them sequentially per Rule 1.12.2. Resets child-level counters
 * when a parent level increments.
 */
export async function renumberAllHeadings(context: Word.RequestContext): Promise<number> {
  // Scan all paragraphs for Heading 1-5 styles and apply text-prefix numbering.
  // This is more reliable than Word's multilevel list API on Mac.
  const body = context.document.body;
  const paragraphs = body.paragraphs;
  paragraphs.load("items/style,items/text,items/isListItem");
  await context.sync();

  const paraItems = paragraphs.items ?? [];

  // Collect heading paragraphs in document order
  const headings: Array<{ para: Word.Paragraph; level: 1 | 2 | 3 | 4 | 5 }> = [];
  for (const para of paraItems) {
    if (para.style && para.style.startsWith("Heading ")) {
      const lvl = parseInt(para.style.slice("Heading ".length), 10);
      if (lvl >= 1 && lvl <= 5) {
        headings.push({ para, level: lvl as 1 | 2 | 3 | 4 | 5 });
      }
    }
  }

  if (headings.length === 0) return 0;

  // Strip Word's auto-applied built-in Heading list numbering (see
  // applyHeadingLevel) so it does not double up with the AGLC4 text prefix.
  // Handles documents whose headings were styled before this fix.
  let detached = false;
  for (const { para } of headings) {
    if (para.isListItem) {
      try {
        para.detachFromList();
        detached = true;
      } catch {
        // detachFromList unsupported on this host — nothing to strip.
      }
    }
  }
  if (detached) {
    await context.sync();
  }

  const counters = [0, 0, 0, 0, 0, 0]; // index 0 unused
  let renumbered = 0;

  for (const { para, level } of headings) {
    counters[level]++;
    for (let child = level + 1; child <= 5; child++) {
      counters[child] = 0;
    }

    const prefix = getHeadingPrefix(level, counters[level]);
    const currentText = para.text;

    // Strip Markdown markers and any existing (possibly wrong) numbering.
    let stripped = cleanHeadingBody(currentText, level);
    // Level I is small-capped; convert ALL-CAPS body text to title case so the
    // small-caps style renders (Word only small-caps lower-case letters).
    if (level === 1) {
      stripped = toSmallCapsHeadingCase(stripped);
    }
    const expectedText = stripped.length > 0 ? `${prefix} ${stripped}` : prefix;

    if (currentText !== expectedText) {
      para.insertText(expectedText, "Replace" as Word.InsertLocation.replace);
      // Re-apply formatting since Replace clears it
      para.font.italic = level >= 2;
      para.font.bold = false;
      para.font.smallCaps = level === 1;
      para.font.size = 12;
      // Don't override the document's default font
      para.font.color = "black";
      renumbered++;
    }

    // Always enforce correct indentation (Rule 1.12.2)
    para.firstLineIndent = 0;
    if (level <= 3) {
      para.leftIndent = 0;
    } else if (level === 4) {
      para.leftIndent = 36;
    } else {
      para.leftIndent = 72;
    }
  }

  if (renumbered > 0) {
    await context.sync();
  }

  return renumbered;
}

// Minor words left lower-case in title-cased headings (unless first/last word).
const HEADING_MINOR_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "per",
  "the",
  "to",
  "v",
  "via",
  "vs",
  "with",
]);

/**
 * Normalises the body text of a Level I heading so Word's small-caps rendering
 * is visible. Word only renders *lower-case* letters as small capitals, so a
 * heading typed in ALL CAPS ("BACKGROUND") shows as full-size caps — the
 * small-caps style has no effect. This title-cases such headings
 * ("BACKGROUND" -> "Background"), which small caps then renders with a large
 * leading capital and small capitals for the rest ("Bᴀᴄᴋɢʀᴏᴜɴᴅ").
 *
 * Only fully upper-case text is touched: if the heading already contains any
 * lower-case letter the author's casing is respected and returned unchanged.
 * Caveat: an all-caps heading containing an acronym (e.g. "ROLE OF ASIC")
 * will lower-case the acronym ("Role of Asic") — type such headings in normal
 * case to preserve the acronym, and they will be left as-is.
 */
export function toSmallCapsHeadingCase(text: string): string {
  // Respect deliberate casing — only act on headings typed entirely in caps.
  if (/[a-z]/.test(text)) return text;
  if (!/[A-Z]/.test(text)) return text; // nothing cased to convert

  const capitalise = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

  const tokens = text.split(/(\s+)/); // keep whitespace tokens for round-trip
  const wordIdx = tokens.map((t, i) => (/\S/.test(t) ? i : -1)).filter((i) => i >= 0);
  const firstWord = wordIdx[0];
  const lastWord = wordIdx[wordIdx.length - 1];

  return tokens
    .map((tok, i) => {
      if (!/\S/.test(tok)) return tok; // whitespace — preserve as-is
      const bare = tok.toLowerCase().replace(/[^a-z]/g, "");
      if (i !== firstWord && i !== lastWord && HEADING_MINOR_WORDS.has(bare)) {
        return tok.toLowerCase();
      }
      return capitalise(tok);
    })
    .join("");
}

// A strictly well-formed Roman numeral (1–3999). Used so an all-caps word made
// only of Roman letters (e.g. "CIVIL", "MILL") is NOT mistaken for a numeral and
// stripped, while genuine numerals ("III", "IV", "XII") are.
const STRICT_ROMAN = /^M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/;
function isRomanNumeral(s: string): boolean {
  return s.length > 0 && STRICT_ROMAN.test(s.toUpperCase());
}

// Strips the enumerator for a SPECIFIC heading level (the level being applied),
// matching the format the engine itself emits for that level. A trailing "." or
// ")" is tolerated (pasted outlines often carry one). Level I validates the
// Roman numeral so heading bodies that merely start with Roman letters survive.
function stripLevelEnumerator(text: string, level: number): string {
  switch (level) {
    case 1: {
      const m = text.match(/^([IVXLCDM]+)[.)]?\s+/);
      return m && isRomanNumeral(m[1]) ? text.slice(m[0].length) : text;
    }
    case 2: {
      const m = text.match(/^[A-Z][.)]?\s+/);
      return m ? text.slice(m[0].length) : text;
    }
    case 3: {
      const m = text.match(/^\d+(?:\.\d+)*[.)]?\s+/);
      return m ? text.slice(m[0].length) : text;
    }
    case 4: {
      const m = text.match(/^\([a-z]\)\s+/);
      return m ? text.slice(m[0].length) : text;
    }
    default: {
      const m = text.match(/^\([ivxlcdm]+\)\s+/);
      return m ? text.slice(m[0].length) : text;
    }
  }
}

// Strips a leading enumerator that does NOT match the target level — a stale or
// mistaken number carried in from pasted markup (the number is re-derived, so it
// is not trusted). Only UNAMBIGUOUS forms are removed: Arabic (dotted) numbers,
// parenthesised letters/numerals, and multi-character validated Roman numerals.
// Bare single letters (e.g. "A New Approach") are deliberately left alone.
function stripStaleEnumerator(text: string): string {
  let m = text.match(/^\d+(?:\.\d+)*[.)]?\s+/); // 3, 3., 1.2.3, 10)
  if (m) return text.slice(m[0].length);
  m = text.match(/^\((?:[a-zA-Z]|[ivxlcdm]+|[IVXLCDM]+)\)\s+/); // (a) (A) (iv) (IV)
  if (m) return text.slice(m[0].length);
  m = text.match(/^([IVXLCDM]{2,})[.)]?\s+/); // II, III, IV ... (validated)
  if (m && isRomanNumeral(m[1])) return text.slice(m[0].length);
  return text;
}

/**
 * Cleans a heading paragraph's raw text into a bare title, ready for the engine
 * to re-number. Removes, in order:
 *   1. a leading Markdown ATX marker ("#".."######"), e.g. a pasted "## Heading";
 *   2. one leading enumerator — the target level's own format if present,
 *      otherwise a stale/mismatched one (Arabic, parenthesised, or a validated
 *      multi-char Roman numeral). The existing number is never trusted: the
 *      engine assigns the correct one afterwards.
 *
 * Example: cleanHeadingBody("## III Statutory Framework", 1) -> "Statutory Framework".
 */
export function cleanHeadingBody(text: string, level: number): string {
  let t = text
    .replace(/^\s+/, "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\s+/, "");
  const afterLevel = stripLevelEnumerator(t, level);
  t = afterLevel !== t ? afterLevel : stripStaleEnumerator(t);
  return t.replace(/^\s+/, "");
}

// ─── MULTI-011: Heading styles per standard ─────────────────────────────────

/**
 * Returns whether the given citation standard prescribes custom heading styles.
 *
 * AGLC4 Rule 1.12: Five heading levels with specific formatting.
 * OSCOLA: No heading prescription — use standard Word headings.
 * NZLSG: No heading prescription — use standard Word headings.
 *
 * When this returns false, the AGLC heading buttons should be hidden in the
 * ribbon and standard Word heading styles used instead.
 *
 * @param standardId - The active citation standard identifier.
 * @returns true if the standard prescribes custom headings (AGLC), false otherwise.
 */
export function hasCustomHeadings(standardId: CitationStandardId): boolean {
  switch (standardId) {
    case "aglc4":
    case "aglc5":
      return true;
    case "oscola4":
    case "oscola5":
    case "nzlsg3":
    case "nzlsg4":
      return false;
  }
}
