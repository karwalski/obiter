/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import type { QuotationMode } from "../engine/quotations/format";

export interface InsertQuotationOptions {
  /** The quotation text, already stripped or wrapped by `applyQuotationToText`. */
  text: string;
  mode: QuotationMode;
}

/**
 * ENP-010: writes a quotation into the document at the cursor and leaves the
 * selection collapsed at its end, so a footnote inserted next lands where
 * AGLC4 Rule 1.1.3 puts it — after the quotation (and after any closing
 * punctuation or quotation mark).
 *
 * Block mode (Rule 1.5.1, long quotations of four or more full lines): each
 * paragraph of the text becomes a new paragraph after the current one in the
 * "AGLC4 Block Quote" style; where that style is not installed the paragraph
 * takes the equivalent direct formatting (10pt, 36pt left indent, 12pt line
 * spacing — the same fallback as the ribbon Block Quote command). The
 * selection then moves to the end of the last block paragraph.
 *
 * Inline mode: the text (already wrapped in ‘ ’) replaces the selection and
 * the selection collapses to the end of the inserted range.
 *
 * Errors bubble to the caller, which reports them through `writeErrorMessage`.
 */
export async function insertQuotation(opts: InsertQuotationOptions): Promise<void> {
  await Word.run(async (context) => {
    const selection = context.document.getSelection();

    if (opts.mode === "inline") {
      const inserted = selection.insertText(opts.text, "Replace");
      inserted.getRange("End").select();
      await context.sync();
      return;
    }

    // Block: one Word paragraph per text paragraph, each anchored after the
    // previous so the quotation grows forward (see Bibliography insertion).
    const lines = opts.text.split("\n").filter((line) => line.trim().length > 0);
    const paragraphs: Word.Paragraph[] = [];
    let anchor: Word.Paragraph | undefined;
    for (const line of lines.length > 0 ? lines : [opts.text]) {
      const paragraph = anchor
        ? anchor.insertParagraph(line, "After")
        : selection.insertParagraph(line, "After");
      paragraphs.push(paragraph);
      anchor = paragraph;
    }
    await context.sync();

    // Named style first (semantic, restylable); the batch is not atomic, so
    // the style pass is separate from the insert and the fallback is direct
    // formatting when the style is absent from this document.
    try {
      for (const paragraph of paragraphs) paragraph.style = "AGLC4 Block Quote";
      await context.sync();
    } catch {
      for (const paragraph of paragraphs) {
        paragraph.font.size = 10;
        paragraph.leftIndent = 36;
        paragraph.lineSpacing = 12;
      }
      await context.sync();
    }

    paragraphs[paragraphs.length - 1].getRange("End").select();
    await context.sync();
  });
}

/**
 * ENP-012: writes plain text into the document as ordinary paragraphs after
 * the current one (one Word paragraph per line, blank lines dropped) in the
 * Normal style, and leaves the selection at the end of the last paragraph.
 * Used by the Quote panel's "Insert as note" for a summary or an answer; the
 * text is the user's note, not a quotation, so it takes no quotation marks
 * and no block-quote style.
 *
 * Errors bubble to the caller, which reports them through `writeErrorMessage`.
 */
export async function insertPlainParagraph(text: string): Promise<void> {
  await Word.run(async (context) => {
    const selection = context.document.getSelection();
    const lines = text.split("\n").filter((line) => line.trim().length > 0);
    const paragraphs: Word.Paragraph[] = [];
    let anchor: Word.Paragraph | undefined;
    for (const line of lines.length > 0 ? lines : [text]) {
      const paragraph = anchor
        ? anchor.insertParagraph(line, "After")
        : selection.insertParagraph(line, "After");
      paragraphs.push(paragraph);
      anchor = paragraph;
    }
    await context.sync();

    // The inserted paragraphs inherit the current paragraph's style (which
    // may be a block quote); reset them to Normal. Style errors are not fatal.
    try {
      for (const paragraph of paragraphs) paragraph.styleBuiltIn = "Normal";
      await context.sync();
    } catch {
      // Leave the inherited style in place.
    }

    paragraphs[paragraphs.length - 1].getRange("End").select();
    await context.sync();
  });
}
