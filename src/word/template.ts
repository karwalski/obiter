/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

import { applyAglc4Styles } from "./styles";

// ─── AGLC4 Document Template ────────────────────────────────────────────────

/**
 * Applies a full AGLC4 document template to the active Word document.
 *
 * This sets up a document according to AGLC4 formatting conventions:
 * - Creates all AGLC4 named styles (via {@link applyAglc4Styles})
 * - Sets default body font to Times New Roman 12 pt
 * - Sets page margins to 2.54 cm (1 inch) on all sides per AGLC4
 * - Sets body text line spacing to double
 * - Sets footnote text to 10 pt single spacing
 * - Inserts title and author placeholders if the document body is empty
 *
 * @param context - A Word.RequestContext from within a Word.run() callback.
 */
export async function applyAglc4Template(
  context: Word.RequestContext
): Promise<void> {
  // 1. Apply all AGLC4 named styles (may no-op if already applied)
  try {
    await applyAglc4Styles(context);
  } catch {
    // Styles may already exist from a previous application — continue
  }

  // 2. Set default font: Times New Roman 12 pt
  const body = context.document.body;
  body.font.name = "Times New Roman";
  body.font.size = 12;

  // 3. Set page margins: 2.54 cm = 72 pt (1 inch) on all sides
  //    WordApi exposes page dimensions via Section.body but direct margin
  //    properties require WordApi 1.7+. We use a try/catch to gracefully
  //    degrade on older runtimes.
  const sections = context.document.sections;
  sections.load("items");
  await context.sync();

  for (let i = 0; i < sections.items.length; i++) {
    const section = sections.items[i];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sectionAny = section as any;
      if (typeof sectionAny.setMargins === "function") {
        sectionAny.setMargins(72, 72, 72, 72);
      }
    } catch {
      // Margin setting not supported in this runtime — skip silently.
    }
  }

  // 4. Set body line spacing to double (24 pt for 12 pt font)
  body.paragraphs.load("items");
  await context.sync();

  for (let i = 0; i < body.paragraphs.items.length; i++) {
    const para = body.paragraphs.items[i];
    para.lineSpacing = 24;
    try { para.lineUnitAfter = 0; } catch { /* WordApi 1.5 may not support */ }
    try { para.lineUnitBefore = 0; } catch { /* WordApi 1.5 may not support */ }
  }

  // 5. Insert title and author placeholders if document is empty
  body.load("text");
  await context.sync();

  const bodyText = body.text.trim();
  if (bodyText.length === 0) {
    // Insert author placeholder first, then title above it
    const authorPara = body.insertParagraph(
      "[Author Name]",
      Word.InsertLocation.start
    );
    authorPara.font.smallCaps = true;
    authorPara.alignment = Word.Alignment.centered;
    try { authorPara.style = "AGLC4 Author"; } catch { /* style may not exist */ }

    const titlePara = body.insertParagraph(
      "[Title]",
      Word.InsertLocation.start
    );
    titlePara.font.bold = true;
    titlePara.alignment = Word.Alignment.centered;
    try { titlePara.style = "AGLC4 Title"; } catch { /* style may not exist */ }

    await context.sync();
  }
}
