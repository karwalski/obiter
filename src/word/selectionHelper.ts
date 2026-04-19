/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

/**
 * NEXT-001: Selection helper utilities.
 *
 * Provides convenience functions for reading the current Word selection,
 * used by the CheckReference component and other features that operate on
 * user-selected text.
 */

/**
 * Returns the plain text of the current Word selection.
 * Resolves to an empty string if nothing is selected.
 */
export async function getSelectedText(): Promise<string> {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load("text");
    await context.sync();
    return selection.text ?? "";
  });
}

export interface SelectionWithContext {
  text: string;
  isInFootnote: boolean;
  footnoteIndex?: number;
}

/**
 * Returns the current selection text together with context about its
 * location in the document (e.g. whether it sits inside a footnote).
 */
export async function getSelectedTextWithContext(): Promise<SelectionWithContext> {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load("text");

    // Try to determine if the selection is inside a footnote by walking up
    // to a parent body and checking its type.
    const parentBody = selection.parentBody;
    parentBody.load("type");

    await context.sync();

    const text = selection.text ?? "";
    const isInFootnote = parentBody.type === Word.BodyType.footnote;

    const result: SelectionWithContext = { text, isInFootnote };

    if (isInFootnote) {
      // Attempt to resolve the footnote index by iterating the body's
      // footnote collection and matching on the parent body.
      try {
        const body = context.document.body;
        const footnotes = body.footnotes;
        footnotes.load("items");
        await context.sync();

        for (let i = 0; i < footnotes.items.length; i++) {
          const fnBody = footnotes.items[i].body;
          fnBody.load("text");
        }
        await context.sync();

        // Match by comparing the footnote body text to the parent body
        // text. This is a best-effort heuristic; duplicate footnote text
        // will resolve to the first match.
        const parentText = parentBody.text ?? "";
        for (let i = 0; i < footnotes.items.length; i++) {
          if ((footnotes.items[i].body.text ?? "") === parentText) {
            result.footnoteIndex = i + 1; // 1-based
            break;
          }
        }
      } catch {
        // Footnote index resolution is best-effort; swallow errors.
      }
    }

    return result;
  });
}
