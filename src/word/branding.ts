/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

const ATTRIBUTION_TAG = "obiter-attribution";
const ATTRIBUTION_TEXT = "Formatted with Obiter";

/**
 * Inserts "Formatted with Obiter" into the default (first section) footer,
 * centred, 8pt grey text. Does not replace any existing footer content —
 * appends a new paragraph at the end of the footer.
 */
export async function insertAttribution(context: Word.RequestContext): Promise<void> {
  const existing = await hasAttributionControl(context);
  if (existing) {
    return;
  }

  const sections = context.document.sections;
  sections.load("items");
  await context.sync();

  if (sections.items.length === 0) return;

  const footer = sections.items[0].getFooter(Word.HeaderFooterType.primary);
  footer.load("paragraphs");
  await context.sync();

  // Append to footer — don't clear existing content
  const paragraph = footer.insertParagraph(ATTRIBUTION_TEXT, Word.InsertLocation.end);
  paragraph.font.size = 8;
  paragraph.font.color = "#a0a0a0";
  paragraph.alignment = Word.Alignment.centered;

  const cc = paragraph.insertContentControl();
  cc.tag = ATTRIBUTION_TAG;
  cc.title = "Obiter Attribution";
  cc.appearance = Word.ContentControlAppearance.hidden;

  await context.sync();
}

/**
 * Finds and removes the attribution content control from the footer.
 */
export async function removeAttribution(context: Word.RequestContext): Promise<void> {
  const controls = context.document.contentControls;
  controls.load("items/tag");
  await context.sync();

  for (const cc of controls.items) {
    if (cc.tag === ATTRIBUTION_TAG) {
      cc.delete(false);
    }
  }

  await context.sync();
}

/**
 * Checks whether the attribution content control exists in the document.
 */
export async function hasAttribution(context: Word.RequestContext): Promise<boolean> {
  return hasAttributionControl(context);
}

async function hasAttributionControl(context: Word.RequestContext): Promise<boolean> {
  const controls = context.document.contentControls;
  controls.load("items/tag");
  await context.sync();

  return controls.items.some((cc) => cc.tag === ATTRIBUTION_TAG);
}
