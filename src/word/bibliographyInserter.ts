/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import type { BibliographySection } from "../engine/rules/v4/general/bibliography";
import type { FormattedRun } from "../types/formattedRun";
import { runsToHtml } from "./formattedRunsHtml";

/**
 * COURT-116: the paragraph style for bibliography and List of Authorities
 * entries.
 *
 * - "inherit" — the style (and alignment) of the paragraph at the cursor, so
 *   a list inserted into a court or firm template takes the template's body
 *   style (register O-K9: entries were forced to Normal). When the cursor
 *   is in a heading, entries use Normal instead.
 * - "Normal" — the earlier behaviour, kept as the default for academic
 *   bibliographies.
 */
export type EntryParagraphStyle = "inherit" | "Normal";

const SETTABLE_ALIGNMENTS = new Set<string>(["Left", "Centered", "Right", "Justified"]);

/** Bibliography heading style (AGLC4 r 1.13). */
const BIBLIOGRAPHY_HEADING_STYLE = "AGLC4 Bibliography Heading";

/**
 * True when the cursor paragraph is a heading (a built-in heading, title or
 * subtitle, or the bibliography heading style). Entries never take a
 * heading's style: they fall back to Normal, as before COURT-116.
 */
function isHeadingParagraph(style: string, styleBuiltIn: string): boolean {
  return style === BIBLIOGRAPHY_HEADING_STYLE || /^(Heading\d|Title|Subtitle)$/.test(styleBuiltIn);
}

/**
 * Inserts bibliography or List of Authorities sections at the cursor,
 * applying formatting from FormattedRun arrays.
 *
 * A section with an empty heading (the WA PD 2.1 cl 13 closing statement)
 * inserts its entries with no heading paragraph.
 *
 * Office.js: WordApi 1.1 paragraph APIs only. With `entryStyle` "inherit"
 * one extra sync reads the cursor paragraph's style before anything is
 * written; the number of syncs does not grow with the number of entries
 * except in the per-entry fallback after a failed batch write.
 *
 * @param sections - the sections to insert, in order.
 * @param entryStyle - the entry paragraph style (default "Normal").
 */
export async function insertBibliographyIntoDocument(
  sections: BibliographySection[],
  entryStyle: EntryParagraphStyle = "Normal"
): Promise<void> {
  await Word.run(async (context) => {
    const selection = context.document.getSelection();

    // COURT-116: read the cursor paragraph's style before the first insert.
    let inherited: {
      style: string;
      alignment?: Word.Alignment | "Left" | "Centered" | "Right" | "Justified";
    } | null = null;
    if (entryStyle === "inherit") {
      const cursorParagraph = selection.paragraphs.getFirst();
      // styleBuiltIn is WordApi 1.3, inside the 1.5 baseline.
      cursorParagraph.load("style,styleBuiltIn,alignment");
      await context.sync();
      inherited = isHeadingParagraph(cursorParagraph.style, String(cursorParagraph.styleBuiltIn))
        ? null
        : {
            style: cursorParagraph.style,
            alignment: SETTABLE_ALIGNMENTS.has(String(cursorParagraph.alignment))
              ? (cursorParagraph.alignment as "Left" | "Centered" | "Right" | "Justified")
              : undefined,
          };
    }

    // Each paragraph is inserted AFTER the previously inserted one so the
    // document grows forward. Anchoring every insert against `selection`
    // stacks paragraphs in reverse order at the cursor.
    let anchor: Word.Paragraph | null = null;
    const headingParagraphs: Word.Paragraph[] = [];

    function insertAfter(text: string): Word.Paragraph {
      return anchor
        ? anchor.insertParagraph(text, Word.InsertLocation.after)
        : selection.insertParagraph(text, Word.InsertLocation.after);
    }

    // Pass 1 — build the full paragraph skeleton (headings with their text,
    // entries empty). Entry content is deliberately NOT written here: on
    // Word on the web, `insertHtml(..., "Replace")` invalidates the
    // paragraph proxy, so a paragraph that has received its content can no
    // longer serve as the anchor for the next `insertParagraph("After")`
    // (ItemNotFound). All anchoring therefore happens before any content
    // write.
    const entryParagraphs: Array<{ paragraph: Word.Paragraph; runs: FormattedRun[] }> = [];
    for (const section of sections) {
      if (section.heading) {
        const headingParagraph = insertAfter(section.heading);
        // Direct formatting mirrors the "AGLC4 Bibliography Heading" style
        // (Rule 1.13: centred, italic) so the output is correct even when the
        // AGLC4 styles are not installed in this document. Assigning the named
        // style throws InvalidArgument on such documents and — because the
        // batch is not atomic — used to abort the insert after the first
        // heading; the style is applied as an optional pass below.
        headingParagraph.alignment = Word.Alignment.centered;
        headingParagraph.spaceBefore = 18;
        headingParagraph.spaceAfter = 6;
        headingParagraph.font.italic = true;
        headingParagraphs.push(headingParagraph);
        anchor = headingParagraph;
      }

      for (const entry of section.entries) {
        const entryParagraph = insertAfter("");
        // Entries are inserted after the heading paragraph and would
        // otherwise inherit its centred + italic formatting. Give each entry
        // the chosen style (the cursor paragraph's, or Normal) and alignment
        // so it renders as flowing body text.
        entryParagraph.style = inherited ? inherited.style : "Normal";
        entryParagraph.alignment = inherited?.alignment ?? Word.Alignment.left;
        entryParagraphs.push({ paragraph: entryParagraph, runs: entry });
        anchor = entryParagraph;
      }
    }
    await context.sync();

    // Pass 2 — write each entry's content as one HTML fragment. Word on the
    // web does not reliably honour font assignments on insertText's
    // returned ranges (italics leaked across runs); insertHtml applies
    // inline formatting atomically on both hosts. Each paragraph proxy is
    // used for the last time here. Entries with no runs are skipped —
    // insertHtml("") throws InvalidArgument. If the batched write fails
    // (e.g. one entry's content is rejected), fall back to per-entry writes
    // so a single bad entry cannot abort the whole bibliography.
    const writable = entryParagraphs.filter(({ runs }) => runs.length > 0);
    try {
      for (const { paragraph, runs } of writable) {
        paragraph.insertHtml(runsToHtml(runs), Word.InsertLocation.replace);
      }
      await context.sync();
    } catch {
      let skipped = 0;
      for (const { paragraph, runs } of writable) {
        try {
          paragraph.insertHtml(runsToHtml(runs), Word.InsertLocation.replace);
          await context.sync();
        } catch {
          skipped += 1;
        }
      }
      if (skipped > 0) {
        console.warn(`[bibliography] ${skipped} entries could not be written`);
      }
    }

    // Pass 3 — upgrade headings to the named style where installed; the
    // direct formatting above already matches the style's appearance.
    if (headingParagraphs.length === 0) return;
    try {
      for (const headingParagraph of headingParagraphs) {
        headingParagraph.style = BIBLIOGRAPHY_HEADING_STYLE;
      }
      await context.sync();
    } catch {
      // Style not installed — keep direct formatting.
    }
  });
}
