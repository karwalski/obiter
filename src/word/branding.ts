/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

const ATTRIBUTION_TAG = "obiter-attribution";

/**
 * Checks whether the legacy attribution content control exists in the document.
 * Retained for migration detection (INFRA-008).
 */
export async function hasAttribution(context: Word.RequestContext): Promise<boolean> {
  return hasAttributionControl(context);
}

/**
 * INFRA-008 Layer 3: Insert an acknowledgment line at the current cursor position.
 * Plain text, no content control, no formatting.
 */
export async function insertAcknowledgment(
  context: Word.RequestContext,
  standardLabel: string,
): Promise<void> {
  const text = `Citations managed with Obiter (obiter.com.au), a free, open-source ${standardLabel} citation engine.`;
  const selection = context.document.getSelection();
  selection.insertText(text, Word.InsertLocation.replace);
  await context.sync();
}

/**
 * Build the acknowledgment text for a given standard label.
 * Used by the "Copy acknowledgment" button.
 */
export function getAcknowledgmentText(standardLabel: string): string {
  return `Citations managed with Obiter (obiter.com.au), a free, open-source ${standardLabel} citation engine.`;
}

/**
 * @deprecated Retained for backward compatibility. No longer called from Settings.
 * Inserts "Formatted with Obiter" into the default (first section) footer.
 */
export async function insertAttribution(context: Word.RequestContext): Promise<void> {
  const existing = await hasAttributionControl(context);
  if (existing) {
    return;
  }

  const sections = context.document.sections;
  sections.load("items");
  await context.sync();

  const sectionItems = sections.items ?? [];
  if (sectionItems.length === 0) return;

  const footer = sectionItems[0].getFooter(Word.HeaderFooterType.primary);
  footer.load("paragraphs");
  await context.sync();

  const paragraph = footer.insertParagraph("Formatted with Obiter", Word.InsertLocation.end);
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
 * @deprecated Retained for backward compatibility. No longer called from Settings.
 * Finds and removes the attribution content control from the footer.
 */
export async function removeAttribution(context: Word.RequestContext): Promise<void> {
  const controls = context.document.contentControls;
  controls.load("items/tag");
  await context.sync();

  for (const cc of (controls.items ?? [])) {
    if (cc.tag === ATTRIBUTION_TAG) {
      cc.delete(false);
    }
  }

  await context.sync();
}

async function hasAttributionControl(context: Word.RequestContext): Promise<boolean> {
  const controls = context.document.contentControls;
  controls.load("items/tag");
  await context.sync();

  return (controls.items ?? []).some((cc) => cc.tag === ATTRIBUTION_TAG);
}
