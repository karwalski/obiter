/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

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
  const symbols = [
    "M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I",
  ];

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
export function getHeadingPrefix(
  level: 1 | 2 | 3 | 4 | 5,
  number: number
): string {
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
export async function applyAglc4Styles(
  context: Word.RequestContext
): Promise<void> {
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
  const getOrCreateStyle = (
    name: string,
    type: Word.StyleType
  ): Word.Style | null => {
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
  const blockQuote = getOrCreateStyle(
    "AGLC4 Block Quote",
    "Paragraph" as Word.StyleType
  );
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
  const footnoteText = getOrCreateStyle(
    "AGLC4 Footnote Text",
    "Paragraph" as Word.StyleType
  );
  if (footnoteText) {
    footnoteText.font.size = 10;
    footnoteText.paragraphFormat.lineSpacing = 12;
  }

  // ── AGLC4 Bibliography Heading (Rule 1.13) ──────────────────────────────
  // Bibliography section headings are centred and in italic.
  const bibHeading = getOrCreateStyle(
    "AGLC4 Bibliography Heading",
    "Paragraph" as Word.StyleType
  );
  if (bibHeading) {
    bibHeading.font.italic = true;
    bibHeading.paragraphFormat.alignment = "Centered" as Word.Alignment;
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
  }> = [
    { name: "Heading 1", italic: false, smallCaps: true,  bold: false, centered: true  },
    { name: "Heading 2", italic: true,  smallCaps: false, bold: false, centered: true  },
    { name: "Heading 3", italic: true,  smallCaps: false, bold: false, centered: false },
    { name: "Heading 4", italic: true,  smallCaps: false, bold: false, centered: false },
    { name: "Heading 5", italic: true,  smallCaps: false, bold: false, centered: false },
  ];

  for (const cfg of headingConfigs) {
    try {
      const style = doc.getStyles().getByName(cfg.name);
      style.font.name = "Times New Roman";
      style.font.size = 12;
      style.font.italic = cfg.italic;
      style.font.smallCaps = cfg.smallCaps;
      style.font.bold = cfg.bold;
      style.font.color = "black";
      style.paragraphFormat.alignment = (cfg.centered ? "Centered" : "Left") as Word.Alignment;
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
    list.setLevelNumbering(
      i,
      config.listNumbering as Word.ListNumbering,
      config.formatString
    );
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
  const stripped = stripPrefix(paragraph.text, level);
  if (stripped !== paragraph.text) {
    paragraph.insertText(stripped, "Replace" as Word.InsertLocation.replace);
    await context.sync();
  }

  // Remove any old heading content controls from previous approaches
  const oldControls = paragraph.contentControls;
  oldControls.load("items/tag");
  await context.sync();
  for (const cc of oldControls.items) {
    if (cc.tag && cc.tag.startsWith(HEADING_TAG_PREFIX)) {
      cc.delete(true); // keep content
    }
  }
  if (oldControls.items.some((cc) => cc.tag?.startsWith(HEADING_TAG_PREFIX))) {
    await context.sync();
  }

  // Apply built-in Heading style for outline level + styles pane
  paragraph.style = `Heading ${level}`;

  // Override formatting to match AGLC4 Rule 1.12.2
  paragraph.font.italic = level >= 2;
  paragraph.font.bold = false;
  paragraph.font.smallCaps = level === 1;
  paragraph.font.size = 12;
  paragraph.font.name = "Times New Roman";
  paragraph.font.color = "black";
  paragraph.alignment = (level <= 2 ? "Centered" : "Left") as Word.Alignment;

  await context.sync();

  // Use Word's multilevel list for real numbering
  try {
    if (_existingListId !== undefined) {
      paragraph.attachToList(_existingListId, level - 1);
      await context.sync();
    } else {
      // Create list, configure all 5 levels, then sync
      const list = paragraph.startNewList();
      list.setLevelNumbering(0, "UpperRoman" as Word.ListNumbering);
      list.setLevelNumbering(1, "UpperLetter" as Word.ListNumbering);
      list.setLevelNumbering(2, "Arabic" as Word.ListNumbering);
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
export async function renumberAllHeadings(
  context: Word.RequestContext,
): Promise<number> {
  const allControls = context.document.contentControls;
  allControls.load("items/tag,items/text");
  await context.sync();

  // Collect heading controls in document order
  const headings: Array<{ cc: Word.ContentControl; level: 1 | 2 | 3 | 4 | 5 }> = [];
  for (const cc of allControls.items) {
    if (cc.tag && cc.tag.startsWith(HEADING_TAG_PREFIX)) {
      const lvl = parseInt(cc.tag.slice(HEADING_TAG_PREFIX.length), 10);
      if (lvl >= 1 && lvl <= 5) {
        headings.push({ cc, level: lvl as 1 | 2 | 3 | 4 | 5 });
      }
    }
  }

  if (headings.length === 0) return 0;

  const counters = [0, 0, 0, 0, 0, 0]; // index 0 unused
  let renumbered = 0;

  for (const { cc, level } of headings) {
    counters[level]++;
    for (let child = level + 1; child <= 5; child++) {
      counters[child] = 0;
    }

    const prefix = getHeadingPrefix(level, counters[level]);
    const currentText = cc.text;

    // Strip any existing prefix pattern
    const stripped = stripPrefix(currentText, level);
    const expectedText = stripped.length > 0 ? `${prefix} ${stripped}` : prefix;

    if (currentText !== expectedText) {
      cc.insertText(expectedText, "Replace" as Word.InsertLocation.replace);
      renumbered++;
    }
  }

  if (renumbered > 0) {
    await context.sync();
  }

  return renumbered;
}

/** Strips an existing heading prefix from text. */
function stripPrefix(text: string, level: number): string {
  const patterns: RegExp[] = [
    /^[IVXLCDM]+\s+/,     // Level 1: Upper Roman
    /^[A-Z]\s+/,           // Level 2: Upper Letter
    /^\d+\s+/,             // Level 3: Arabic
    /^\([a-z]\)\s+/,       // Level 4: Lower letter in parens
    /^\([ivxlcdm]+\)\s+/,  // Level 5: Lower Roman in parens
  ];
  return text.replace(patterns[level - 1], "");
}
