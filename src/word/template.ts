/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

import { applyAglc4Styles } from "./styles";
import {
  setDocumentMetadata,
  loadTemplatePreferences,
  type TemplatePreferences,
} from "./documentMeta";

/**
 * Applies a full AGLC4 document template using the user's saved
 * preferences (or defaults). Sets document metadata, applies styles,
 * configures formatting, and optionally inserts title/author placeholders
 * and the add-in notice.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 * @param prefsOverride - Optional preferences to use instead of saved ones.
 */
export async function applyAglc4Template(
  context: Word.RequestContext,
  prefsOverride?: Partial<TemplatePreferences>,
): Promise<void> {
  const prefs = { ...loadTemplatePreferences(), ...prefsOverride };

  // 1. Apply AGLC4 styles (heading formatting, block quote, etc.)
  try {
    await applyAglc4Styles(context);
  } catch {
    // Styles may already exist
  }

  // 2. Set document metadata (custom properties)
  try {
    await setDocumentMetadata(context);
  } catch {
    // Custom properties API may not be available
  }

  // 3. Set default font — only if user explicitly chose one in Settings
  const body = context.document.body;
  if (prefs.fontName) {
    body.font.name = prefs.fontName;
  }
  body.font.size = prefs.fontSize;

  // 4. Set page margins
  const sections = context.document.sections;
  sections.load("items");
  await context.sync();

  const sectionItems = sections.items ?? [];
  for (let i = 0; i < sectionItems.length; i++) {
    const section = sectionItems[i];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sectionAny = section as any;
      if (typeof sectionAny.setMargins === "function") {
        sectionAny.setMargins(prefs.marginPt, prefs.marginPt, prefs.marginPt, prefs.marginPt);
      }
    } catch {
      // Margin setting not supported
    }
  }

  // 5. Set body line spacing
  body.paragraphs.load("items");
  await context.sync();

  const bodyParaItems = body.paragraphs.items ?? [];
  for (let i = 0; i < bodyParaItems.length; i++) {
    const para = bodyParaItems[i];
    para.lineSpacing = prefs.lineSpacing;
    try { para.lineUnitAfter = 0; } catch { /* not supported */ }
    try { para.lineUnitBefore = 0; } catch { /* not supported */ }
  }

  // 6. Insert placeholders if document is empty
  body.load("text");
  await context.sync();

  const bodyText = body.text.trim();
  if (bodyText.length === 0) {
    if (prefs.includeAuthor) {
      const authorPara = body.insertParagraph(
        "[Author Name]",
        Word.InsertLocation.start,
      );
      // Apply the named style first, then direct formatting, so the centring
      // and small caps win even if the style is missing or stripped (Word Web).
      try { authorPara.style = "AGLC4 Author"; } catch { /* style may not exist */ }
      authorPara.font.smallCaps = true;
      authorPara.alignment = Word.Alignment.centered;
      authorPara.font.size = prefs.fontSize;
      // Only set the font name if the user chose one — `font.name = ""` throws
      // 'InvalidArgument' and aborts the rest of the setup.
      if (prefs.fontName) authorPara.font.name = prefs.fontName;
    }

    if (prefs.includeTitle) {
      const titlePara = body.insertParagraph(
        "[Title]",
        Word.InsertLocation.start,
      );
      try { titlePara.style = "AGLC4 Title"; } catch { /* style may not exist */ }
      titlePara.font.bold = true;
      titlePara.alignment = Word.Alignment.centered;
      titlePara.font.size = prefs.fontSize;
      if (prefs.fontName) titlePara.font.name = prefs.fontName;
    }

    await context.sync();
  }

  // 7. Add-in notice — skipped during template setup.
  // The notice is only useful for recipients who don't have Obiter installed.
  // It will be inserted when the document is shared/exported, not on creation,
  // to avoid showing it to the author during editing.
  // The document's custom properties (Obiter.ManagedDocument) serve as the
  // machine-readable signal that this document uses Obiter.
}

/**
 * Insert a single title paragraph at the cursor, formatted per AGLC4 Rule
 * 1.12.1 (bold, capitalised, centred). When `smallCaps` is true, the title is
 * rendered in small capitals instead of bold — this is NOT standard AGLC4 and
 * the caller should label it as such.
 *
 * Inserting "Before" the selection means consecutive Add Title → Add Author
 * calls stack in order (title, then author) above the cursor.
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 * @param text - The title text.
 * @param smallCaps - Use the non-standard small-caps variant instead of bold.
 */
export async function insertTitleParagraph(
  context: Word.RequestContext,
  text: string,
  smallCaps = false,
): Promise<void> {
  try { await applyAglc4Styles(context); } catch { /* may already exist */ }
  const prefs = loadTemplatePreferences();

  const para = context.document
    .getSelection()
    .insertParagraph(text, Word.InsertLocation.before);
  try { para.style = "AGLC4 Title"; } catch { /* style may not exist */ }
  // Direct formatting after the style so it holds even if the style is missing
  // or stripped (e.g. on Word for Web, which ignores small caps).
  para.alignment = Word.Alignment.centered;
  para.font.bold = !smallCaps;
  para.font.smallCaps = smallCaps;
  para.font.size = prefs.fontSize;
  if (prefs.fontName) para.font.name = prefs.fontName; // "" throws InvalidArgument
  await context.sync();
}

/**
 * Insert a single author paragraph at the cursor, formatted per AGLC4 Rule
 * 1.12.1 (small capitals, centred).
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 * @param text - The author name(s).
 */
export async function insertAuthorParagraph(
  context: Word.RequestContext,
  text: string,
): Promise<void> {
  try { await applyAglc4Styles(context); } catch { /* may already exist */ }
  const prefs = loadTemplatePreferences();

  const para = context.document
    .getSelection()
    .insertParagraph(text, Word.InsertLocation.before);
  try { para.style = "AGLC4 Author"; } catch { /* style may not exist */ }
  para.alignment = Word.Alignment.centered;
  para.font.smallCaps = true;
  para.font.size = prefs.fontSize;
  if (prefs.fontName) para.font.name = prefs.fontName;
  await context.sync();
}
