/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Ribbon command functions. These run in a separate context from the task pane
 * (commands.html, not taskpane.html). All imports must be static — dynamic
 * imports fail because webpack code-splits them into chunks that the commands
 * page cannot resolve.
 */

/* global Office, Word */

import { CitationStore } from "../store/citationStore";
import { refreshAllCitations } from "../word/citationRefresher";
import { renumberAllHeadings } from "../word/styles";
import { applyHeadingLevel } from "../word/styles";
import { applyAglc4Template } from "../word/template";
import { scanAndFormatInlineReferences } from "../word/inlineFormatter";

Office.onReady(() => {
  // Office.js is ready.
});

// ── Refresh All ──
async function refreshAll(event: Office.AddinCommands.Event) {
  try {
    const store = new CitationStore();
    await store.initStore();
    const citations = store.getAll();
    if (citations.length > 0) {
      await Word.run(async (context) => {
        await refreshAllCitations(context, store);
        await renumberAllHeadings(context);
        await scanAndFormatInlineReferences(context, citations);
      });
    }
  } catch { /* silent */ }
  event.completed();
}
Office.actions.associate("refreshAll", refreshAll);

// ── Apply Template ──
async function applyTemplate(event: Office.AddinCommands.Event) {
  try {
    await Word.run(async (context) => {
      await applyAglc4Template(context);
    });
  } catch { /* silent */ }
  event.completed();
}
Office.actions.associate("applyTemplate", applyTemplate);

// ── Block Quote ──
async function applyBlockQuote(event: Office.AddinCommands.Event) {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.paragraphs.load("items");
      await context.sync();
      for (const para of selection.paragraphs.items) {
        para.font.size = 10;
        para.leftIndent = 36;
        para.lineSpacing = 12;
      }
      await context.sync();
    });
  } catch { /* silent */ }
  event.completed();
}
Office.actions.associate("applyBlockQuote", applyBlockQuote);

// ── Heading Levels I–V ──
async function applyHeading(event: Office.AddinCommands.Event, level: 1 | 2 | 3 | 4 | 5) {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load("paragraphs");
      await context.sync();
      for (let i = 0; i < selection.paragraphs.items.length; i++) {
        await applyHeadingLevel(context, selection.paragraphs.items[i], level, i + 1);
      }
    });
  } catch { /* silent */ }
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
