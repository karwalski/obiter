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
      authorPara.font.smallCaps = true;
      authorPara.font.name = prefs.fontName;
      authorPara.font.size = prefs.fontSize;
      authorPara.alignment = Word.Alignment.centered;
      try { authorPara.style = "AGLC4 Author"; } catch { /* style may not exist */ }
    }

    if (prefs.includeTitle) {
      const titlePara = body.insertParagraph(
        "[Title]",
        Word.InsertLocation.start,
      );
      titlePara.font.bold = true;
      titlePara.font.name = prefs.fontName;
      titlePara.font.size = prefs.fontSize;
      titlePara.alignment = Word.Alignment.centered;
      try { titlePara.style = "AGLC4 Title"; } catch { /* style may not exist */ }
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
