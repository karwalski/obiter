/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global document, Office, Word */

import { renderApp } from "../ui/App";

// Register service worker for offline support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // Service worker registration failed — offline mode unavailable
  });
}
import { getSharedStore } from "../store/singleton";
import { hideAddinNotice } from "../word/documentMeta";
import { removeTemplateNotice } from "../word/templateExporter";
import { runStartupDocumentTasks } from "../word/startupSetup";
import { formatCapabilitySnapshot, getCapabilitySnapshot } from "../word/apiCompat";
import { createLogger } from "../debug/logger";
import { APP_VERSION } from "../constants";
import { detectProduct } from "../store/devicePreferences";
import { installGlobalErrorHandlers } from "../debug/globalErrors";

const log = createLogger("Taskpane");

Office.onReady((info) => {
  // SAFE-006: capture unhandled errors and promise rejections for the whole
  // pane runtime. Idempotent — safe if onReady ever fires more than once.
  installGlobalErrorHandlers();

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

    // COURT-103: record what the host reports, for issue reports.
    log.info("Word API capabilities\n" + formatCapabilitySnapshot(getCapabilitySnapshot()));

    // Clean up notices
    void Word.run(async (context) => {
      try {
        await hideAddinNotice(context);
      } catch {
        /* non-critical */
      }
      try {
        await removeTemplateNotice(context);
      } catch {
        /* non-critical */
      }
    });

    // Anonymous load ping — once per session, no PII
    void (async () => {
      try {
        // Generate or retrieve a random device ID (not derived from user data)
        let deviceHash = localStorage.getItem("obiter-deviceHash");
        if (!deviceHash) {
          deviceHash = crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2) + Date.now().toString(36);
          localStorage.setItem("obiter-deviceHash", deviceHash);
        }

        // Only ping once per session
        if (sessionStorage.getItem("obiter-loadPinged")) return;
        sessionStorage.setItem("obiter-loadPinged", "1");

        let wordVersion: string | undefined;
        let platform: string | undefined;
        try {
          wordVersion = Office?.context?.diagnostics?.version;
          platform = Office?.context?.diagnostics?.platform?.toString();
        } catch {
          /* ignore */
        }

        await fetch("https://obiter.com.au/api/analytics/load", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            obiterVersion: APP_VERSION,
            // Product line reporting the load: "classic" (the free add-in) or
            // "copilot" (the Obiter for Microsoft 365 Copilot package, whose
            // task-pane URLs carry ?product=copilot). Lets analytics separate
            // the two variants (WEB-ANALYTICS-01). The server ignores this
            // field until its schema is extended — safe to send now.
            variant: detectProduct(),
            wordVersion,
            platform,
            deviceHash,
          }),
        });
      } catch {
        /* non-critical — analytics failure must never affect UX */
      }
    })();

    // COURT-101 / COURT-102: startup document tasks. Never modifies an
    // existing style; creates missing AGLC4 styles only on a new blank
    // academic document (visible setting); writes Obiter properties only
    // when the document holds a citation, and removes any Obiter.Author.
    // Uses the shared store so no second store instance races its persists.
    void (async () => {
      try {
        const store = await getSharedStore();
        await Word.run(async (context) => {
          await runStartupDocumentTasks(context, store, APP_VERSION);
        });
      } catch {
        /* non-critical */
      }
    })();
  }
});
