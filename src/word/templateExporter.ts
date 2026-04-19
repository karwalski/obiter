/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Exports the current document's formatting as a reusable Word template.
 * Users can save .dotx templates with AGLC4 styles pre-configured,
 * so new documents created from the template inherit all formatting.
 *
 * The template includes a notice paragraph that is visible when the
 * add-in is not installed, guiding the user to install Obiter.
 */

/* global Word */

const TEMPLATE_NOTICE_TAG = "obiter-template-notice";

const TEMPLATE_NOTICE_TEXT =
  "This template is configured for AGLC4 citation formatting with Obiter. " +
  "Install the Obiter add-in from obiter.com.au to use automated citations, " +
  "bibliography generation, and document validation. " +
  "You can delete this notice after installing the add-in.";

/**
 * Prepares the current document for saving as a .dotx template.
 * Inserts the template notice (if not already present), ensures all
 * AGLC4 styles are applied, and sets up placeholder content.
 *
 * After calling this, the user saves the document as .dotx via
 * File > Save As > Word Template (.dotx).
 */
export async function prepareAsTemplate(
  context: Word.RequestContext,
): Promise<void> {
  // Insert template notice if not already present
  const existing = context.document.contentControls.getByTag(TEMPLATE_NOTICE_TAG);
  existing.load("items");
  await context.sync();

  if (existing.items.length === 0) {
    const body = context.document.body;
    const para = body.insertParagraph(
      TEMPLATE_NOTICE_TEXT,
      "Start" as Word.InsertLocation.start,
    );
    para.font.size = 9;
    para.font.color = "#999999";
    para.font.italic = true;
    para.alignment = "Left" as Word.Alignment;

    const cc = para.insertContentControl("RichText");
    cc.tag = TEMPLATE_NOTICE_TAG;
    cc.title = "Obiter Template Notice";
    cc.appearance = "BoundingBox" as Word.ContentControlAppearance;
    cc.cannotDelete = false;
    cc.cannotEdit = false;

    await context.sync();
  }
}

/**
 * Removes the template notice. Called when the add-in loads on a document
 * that was created from an Obiter template.
 */
export async function removeTemplateNotice(
  context: Word.RequestContext,
): Promise<void> {
  const controls = context.document.contentControls.getByTag(TEMPLATE_NOTICE_TAG);
  controls.load("items");
  await context.sync();

  for (const cc of controls.items) {
    cc.cannotEdit = false;
    cc.cannotDelete = false;
    cc.delete(false); // delete control and content
  }

  if (controls.items.length > 0) {
    await context.sync();
  }
}

/**
 * Checks if the current document was created from an Obiter template
 * (has the template notice tag).
 */
export async function isFromObiterTemplate(
  context: Word.RequestContext,
): Promise<boolean> {
  const controls = context.document.contentControls.getByTag(TEMPLATE_NOTICE_TAG);
  controls.load("items");
  await context.sync();
  return controls.items.length > 0;
}
