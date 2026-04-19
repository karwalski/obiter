/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global document, Office, Word */

import { renderApp } from "../ui/App";
import { applyAglc4Styles } from "../word/styles";
import { applyAglc4Template } from "../word/template";
import { CitationStore } from "../store/citationStore";
import { hideAddinNotice, setDocumentMetadata } from "../word/documentMeta";
import { removeTemplateNotice } from "../word/templateExporter";

/** Check if this document has already been set up by Obiter. */
async function isDocumentSetUp(): Promise<boolean> {
  try {
    const store = new CitationStore();
    await store.initStore();
    // If the store was already initialised (has metadata), document is set up
    return store.getSchemaVersion() !== undefined;
  } catch {
    return false;
  }
}

/** Apply AGLC4 template and styles on first use. */
async function autoSetupDocument(): Promise<void> {
  try {
    const alreadySetUp = await isDocumentSetUp();

    // Check if user has opted out of auto-setup
    let autoSetup = true;
    try {
      const saved = localStorage.getItem("obiter-autoSetup");
      if (saved === "false") autoSetup = false;
    } catch { /* ignore */ }

    if (!autoSetup) return;

    // Only apply template to empty/new documents, always apply styles
    await Word.run(async (context) => {
      // Apply styles (modifies built-in Heading 1-5 to AGLC4 formatting)
      try {
        await applyAglc4Styles(context);
      } catch { /* styles may already exist */ }

      // Apply template only if document is new (empty or just has placeholders)
      if (!alreadySetUp) {
        const body = context.document.body;
        body.load("text");
        await context.sync();

        const bodyText = body.text.trim();
        if (bodyText.length === 0) {
          await applyAglc4Template(context);
        }
      }
    });
  } catch {
    // Auto-setup failed — non-critical, user can do it manually from Settings
  }
}

Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    const root = document.getElementById("root");
    if (!root) return;

    if (!Office.context.requirements.isSetSupported("WordApi", "1.5")) {
      root.innerHTML =
        '<div style="padding:20px;text-align:center;">' +
        "<h2>Unsupported Version</h2>" +
        "<p>Obiter requires Microsoft Word 2024 or Microsoft 365 (WordApi 1.5+). " +
        "Please update your version of Word.</p></div>";
      return;
    }

    renderApp(root);

    // Auto-setup document on first load
    void autoSetupDocument();

    // Clean up notices and set metadata
    void Word.run(async (context) => {
      try { await hideAddinNotice(context); } catch { /* non-critical */ }
      try { await removeTemplateNotice(context); } catch { /* non-critical */ }
      try { await setDocumentMetadata(context); } catch { /* non-critical */ }
    });
  }
});
