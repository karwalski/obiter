/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Office, Word */

Office.onReady(() => {
  // Office.js is ready to be called.
});

// ── Refresh All — rebuilds citations, headings, inline formatting ──
// Context-sensitivity: silently no-ops if no citations exist in the store.
async function refreshAll(event: Office.AddinCommands.Event) {
  const { CitationStore } = await import("../store/citationStore");
  const { refreshAllCitations } = await import("../word/citationRefresher");
  const { renumberHeadings } = await import("../word/headingTracker");
  const { scanAndFormatInlineReferences } = await import("../word/inlineFormatter");

  try {
    const store = new CitationStore();
    await store.initStore();
    const citations = store.getAll();
    // No-op if there are no citations and nothing to refresh
    if (citations.length === 0) {
      event.completed();
      return;
    }
    await Word.run(async (context) => {
      await refreshAllCitations(context, store);
      await renumberHeadings(context);
      await scanAndFormatInlineReferences(context, citations);
    });
  } catch {
    /* silent */
  }
  event.completed();
}
Office.actions.associate("refreshAll", refreshAll);

// ── Apply Template — applies AGLC4 document template styles ──
async function applyTemplate(event: Office.AddinCommands.Event) {
  const { applyAglc4Template } = await import("../word/template");
  try {
    await Word.run(async (context) => {
      await applyAglc4Template(context);
    });
  } catch {
    /* silent */
  }
  event.completed();
}
Office.actions.associate("applyTemplate", applyTemplate);

// ── Apply Block Quote style ──
// Context-sensitivity: silently no-ops if no text is selected (collapsed selection).
async function applyBlockQuote(event: Office.AddinCommands.Event) {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load("isEmpty");
      await context.sync();
      if (selection.isEmpty) {
        event.completed();
        return;
      }
      selection.paragraphs.load("items");
      await context.sync();
      for (const para of selection.paragraphs.items) {
        para.font.size = 10;
        para.leftIndent = 36;
        para.lineSpacing = 12;
      }
      await context.sync();
    });
  } catch {
    /* silent */
  }
  event.completed();
}
Office.actions.associate("applyBlockQuote", applyBlockQuote);

// ── Heading Level Commands (Levels I–V) ──
// Uses the same applyHeadingLevel from styles.ts that the task pane uses,
// which applies built-in Heading styles + direct formatting (works without
// custom named styles that require WordApi 1.6+).

async function applyHeading(
  event: Office.AddinCommands.Event,
  level: 1 | 2 | 3 | 4 | 5,
) {
  try {
    const { applyHeadingLevel: applyHL } = await import("../word/styles");
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load("paragraphs");
      await context.sync();

      for (let i = 0; i < selection.paragraphs.items.length; i++) {
        await applyHL(context, selection.paragraphs.items[i], level, i + 1);
      }
    });
  } catch {
    /* silent */
  }
  event.completed();
}

async function applyHeadingI(event: Office.AddinCommands.Event) { await applyHeading(event, 1); }
Office.actions.associate("applyHeadingI", applyHeadingI);

async function applyHeadingII(event: Office.AddinCommands.Event) { await applyHeading(event, 2); }
Office.actions.associate("applyHeadingII", applyHeadingII);

async function applyHeadingIII(event: Office.AddinCommands.Event) { await applyHeading(event, 3); }
Office.actions.associate("applyHeadingIII", applyHeadingIII);

async function applyHeadingIV(event: Office.AddinCommands.Event) { await applyHeading(event, 4); }
Office.actions.associate("applyHeadingIV", applyHeadingIV);

async function applyHeadingV(event: Office.AddinCommands.Event) { await applyHeading(event, 5); }
Office.actions.associate("applyHeadingV", applyHeadingV);
