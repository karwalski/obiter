/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global document, Office */

import { renderApp } from "../ui/App";

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
  }
});
