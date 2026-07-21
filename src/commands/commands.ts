/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Ribbon command functions. These run in a separate context from the task pane
 * (commands.html, not taskpane.html). All imports must be static — dynamic
 * imports fail because webpack code-splits them into chunks that the commands
 * page cannot resolve.
 */

/* global Office, Word, localStorage */

// NOTE: All logic is inlined here to avoid import chains that bloat the
// commands bundle or fail due to chunk-loading in the commands.html context.
// The commands page runs separately from taskpane.html.

Office.onReady(() => {
  // Office.js is ready.
});

// ── SAFE-006: ribbon command error recording ──
// This runtime has no UI, so failures are appended to a small localStorage
// ring (`obiter-command-errors`, max 5 entries, oldest evicted) that the task
// pane drains and announces on mount, focus, and the `storage` event.
// Inlined — no imports, per the bundle constraint above. Must never throw:
// localStorage can be unavailable in some webviews, and a failure here must
// not stop event.completed().
function recordCommandError(name: string, err: unknown): void {
  const key = "obiter-command-errors";
  let ring: unknown[] = [];
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) ring = parsed;
  } catch {
    /* corrupt or unavailable ring — start fresh */
  }
  try {
    const message = err instanceof Error ? err.message : String(err);
    ring.push({ name, message, timestamp: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(ring.slice(-5)));
  } catch {
    /* localStorage unavailable — the failure stays in the console only */
  }
}

// ── Refresh All — shows task pane which triggers refresh ──
async function refreshAll(event: Office.AddinCommands.Event) {
  // Open task pane — the auto-refresh listener handles the actual refresh
  event.completed();
}
Office.actions.associate("refreshAll", refreshAll);

// ── Apply Template ──
async function applyTemplate(event: Office.AddinCommands.Event) {
  try {
    await Word.run(async (context) => {
      // Inline template logic — set size only, preserve document's default font
      const body = context.document.body;
      body.font.size = 12;
      await context.sync();
    });
  } catch (err) {
    recordCommandError("Apply Template", err);
  }
  event.completed();
}
Office.actions.associate("applyTemplate", applyTemplate);

// ── Block Quote ──
async function applyBlockQuote(event: Office.AddinCommands.Event) {
  // Prefer the named "AGLC4 Block Quote" paragraph style so the quote is semantic
  // (ATAG Part B) and restylable; fall back to direct formatting where the style is
  // not present yet (e.g. the AGLC4 template has not been applied to this document).
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.paragraphs.load("items");
      await context.sync();
      // eslint-disable-next-line office-addins/load-object-before-read -- collection loaded and synced immediately before this read
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
        // eslint-disable-next-line office-addins/load-object-before-read -- collection loaded and synced immediately before this read
        for (const para of selection.paragraphs.items ?? []) {
          para.font.size = 10;
          para.leftIndent = 36;
          para.lineSpacing = 12;
        }
        await context.sync();
      });
    } catch (err) {
      // Only the fallback failing is an error — the styled path failing just
      // means the named style is absent and the fallback formatting applies.
      recordCommandError("Block Quote", err);
    }
  }
  event.completed();
}
Office.actions.associate("applyBlockQuote", applyBlockQuote);

// ── Heading Levels I–V — inline formatting, no external imports ──
async function applyHeading(event: Office.AddinCommands.Event, level: number) {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.paragraphs.load("items");
      await context.sync();

      // eslint-disable-next-line office-addins/load-object-before-read -- collection loaded and synced immediately before this read
      for (const para of selection.paragraphs.items ?? []) {
        // Apply built-in Heading style
        para.style = "Heading " + level;
        // Override with AGLC4 formatting
        para.font.italic = level >= 2;
        para.font.bold = false;
        para.font.smallCaps = level === 1;
        para.font.size = 12;
        // Don't override font — use document default
        para.font.color = "black";
        para.alignment = (level <= 2 ? "Centered" : "Left") as Word.Alignment;
        // AGLC4 Rule 1.12.2 indentation
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
  } catch (err) {
    recordCommandError("Heading " + level, err);
  }
  event.completed();
}

async function applyHeadingI(event: Office.AddinCommands.Event) {
  await applyHeading(event, 1);
}
Office.actions.associate("applyHeadingI", applyHeadingI);
async function applyHeadingII(event: Office.AddinCommands.Event) {
  await applyHeading(event, 2);
}
Office.actions.associate("applyHeadingII", applyHeadingII);
async function applyHeadingIII(event: Office.AddinCommands.Event) {
  await applyHeading(event, 3);
}
Office.actions.associate("applyHeadingIII", applyHeadingIII);
async function applyHeadingIV(event: Office.AddinCommands.Event) {
  await applyHeading(event, 4);
}
Office.actions.associate("applyHeadingIV", applyHeadingIV);
async function applyHeadingV(event: Office.AddinCommands.Event) {
  await applyHeading(event, 5);
}
Office.actions.associate("applyHeadingV", applyHeadingV);
