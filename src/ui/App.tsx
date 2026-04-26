/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global document */

import { createRoot } from "react-dom/client";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { setNavigate } from "../debug";
import Layout from "./Layout";
import InsertCitation from "./views/InsertCitation";
import EditCitation from "./views/EditCitation";
import CitationLibrary from "./views/CitationLibrary";
import AbbreviationLookup from "./views/AbbreviationLookup";
import Validation from "./views/Validation";
import Bibliography from "./views/Bibliography";
import Settings from "./views/Settings";
import Styling from "./views/Styling";
import { CitationProvider } from "./context/CitationContext";
import { InsertCitationProvider } from "./context/InsertCitationContext";
import "./styles/global.css";

/** Registers the React Router navigate function for screenshot prep. */
function NavigateRegistrar(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);
  return null;
}

/** Map URL hash fragments from manifest ribbon buttons to routes.
 *  Action hashes (#action/...) execute a command then navigate to a view. */
function getInitialRoute(): string {
  try {
    const hash = window.location.hash.replace("#", "");
    if (hash.startsWith("action/")) {
      // Execute the action after a short delay (let Office.js init first)
      setTimeout(() => executeRibbonAction(hash), 500);
      return "/"; // Navigate to Insert view while action runs
    }
    if (hash && hash !== "/") return "/" + hash;
  } catch { /* ignore */ }
  return "/";
}

async function executeRibbonAction(action: string): Promise<void> {
  const { applyHeadingLevel } = await import("../word/styles");
  const { applyAglc4Template } = await import("../word/template");
  const { refreshAllCitations } = await import("../word/citationRefresher");
  const { renumberAllHeadings } = await import("../word/styles");
  const { scanAndFormatInlineReferences } = await import("../word/inlineFormatter");
  const { CitationStore } = await import("../store/citationStore");

  try {
    if (action.startsWith("action/heading/")) {
      const level = parseInt(action.split("/")[2], 10) as 1 | 2 | 3 | 4 | 5;
      if (level >= 1 && level <= 5) {
        await Word.run(async (context) => {
          const selection = context.document.getSelection();
          selection.load("paragraphs");
          await context.sync();
          const paraItems = selection.paragraphs.items ?? [];
          for (let i = 0; i < paraItems.length; i++) {
            await applyHeadingLevel(context, paraItems[i], level, i + 1);
          }
        });
      }
    } else if (action === "action/blockquote") {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.paragraphs.load("items");
        await context.sync();
        for (const para of (selection.paragraphs.items ?? [])) {
          para.font.size = 10;
          para.leftIndent = 36;
          para.lineSpacing = 12;
        }
        await context.sync();
      });
    } else if (action === "action/template") {
      await Word.run(async (context) => {
        await applyAglc4Template(context);
      });
    } else if (action === "action/refresh") {
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
    }
  } catch {
    // Silent — action failed, user can retry from the task pane
  }
}

function App(): JSX.Element {
  const initialRoute = getInitialRoute();

  return (
    <InsertCitationProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <CitationProvider>
          <NavigateRegistrar />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<InsertCitation />} />
              <Route path="edit" element={<EditCitation />} />
              <Route path="library" element={<CitationLibrary />} />
              <Route path="guide" element={<AbbreviationLookup />} />
              <Route path="validation" element={<Validation />} />
              <Route path="bibliography" element={<Bibliography />} />
              <Route path="styling" element={<Styling />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </CitationProvider>
      </MemoryRouter>
    </InsertCitationProvider>
  );
}

export function renderApp(container: HTMLElement): void {
  const root = createRoot(container);
  root.render(<App />);
}
