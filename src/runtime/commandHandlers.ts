/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Shared-runtime command handlers (COPILOT-010). These are the ribbon-command
 * implementations for the shared runtime page. Unlike the classic commands.ts —
 * which runs in the isolated commands.html context and must inline all logic to
 * avoid chunk-loading failures — this module runs in the shared runtime and is
 * therefore free to import the engine/word layer. `refreshAll` demonstrates the
 * lifted constraint: it delegates to the headless citationService (the same code
 * path the pane and the Copilot skill use) instead of only opening the pane.
 *
 * Classic commands.ts is left untouched for the production manifest; this is the
 * staged replacement that manifest.skill.xml / manifest.skill.json point at.
 */

/* global Office, Word */

import { refreshFootnotes } from "../actions/citationService";

// ── Refresh All — now actually refreshes via the shared engine path ──
async function refreshAll(event: Office.AddinCommands.Event) {
  try {
    await refreshFootnotes();
  } catch {
    /* silent — the pane's auto-refresh listener remains a fallback */
  }
  event.completed();
}

// ── Apply Template ──
async function applyTemplate(event: Office.AddinCommands.Event) {
  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      body.font.size = 12;
      await context.sync();
    });
  } catch {
    /* silent */
  }
  event.completed();
}

// ── Block Quote ──
async function applyBlockQuote(event: Office.AddinCommands.Event) {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.paragraphs.load("items");
      await context.sync();
      for (const para of selection.paragraphs.items ?? []) {
        para.style = "AGLC4 Block Quote";
      }
      await context.sync();
    });
  } catch {
    try {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.paragraphs.load("items");
        await context.sync();
        for (const para of selection.paragraphs.items ?? []) {
          para.font.size = 10;
          para.leftIndent = 36;
          para.lineSpacing = 12;
        }
        await context.sync();
      });
    } catch {
      /* silent */
    }
  }
  event.completed();
}

// ── Heading Levels I–V ──
async function applyHeading(event: Office.AddinCommands.Event, level: number) {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.paragraphs.load("items");
      await context.sync();
      for (const para of selection.paragraphs.items ?? []) {
        para.style = "Heading " + level;
        para.font.italic = level >= 2;
        para.font.bold = false;
        para.font.smallCaps = level === 1;
        para.font.size = 12;
        para.font.color = "black";
        para.alignment = (level <= 2 ? "Centered" : "Left") as Word.Alignment;
        para.firstLineIndent = 0;
        if (level <= 3) {
          para.leftIndent = 0;
        } else if (level === 4) {
          para.leftIndent = 36;
        } else {
          para.leftIndent = 72;
        }
      }
      await context.sync();
    });
  } catch {
    /* silent */
  }
  event.completed();
}

/** Associate every ribbon command with the shared runtime. */
export function registerCommandFunctions(): void {
  if (typeof Office === "undefined" || !Office.actions || !Office.actions.associate) {
    return;
  }
  Office.actions.associate("refreshAll", refreshAll);
  Office.actions.associate("applyTemplate", applyTemplate);
  Office.actions.associate("applyBlockQuote", applyBlockQuote);
  Office.actions.associate("applyHeadingI", (e: Office.AddinCommands.Event) => applyHeading(e, 1));
  Office.actions.associate("applyHeadingII", (e: Office.AddinCommands.Event) => applyHeading(e, 2));
  Office.actions.associate("applyHeadingIII", (e: Office.AddinCommands.Event) => applyHeading(e, 3));
  Office.actions.associate("applyHeadingIV", (e: Office.AddinCommands.Event) => applyHeading(e, 4));
  Office.actions.associate("applyHeadingV", (e: Office.AddinCommands.Event) => applyHeading(e, 5));
}
