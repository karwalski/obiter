/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global document */

import { createRoot } from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import InsertCitation from "./views/InsertCitation";
import EditCitation from "./views/EditCitation";
import CitationLibrary from "./views/CitationLibrary";
import AbbreviationLookup from "./views/AbbreviationLookup";
import Validation from "./views/Validation";
import Bibliography from "./views/Bibliography";
import Settings from "./views/Settings";
import { CitationProvider } from "./context/CitationContext";
import "./styles/global.css";

function App(): JSX.Element {
  return (
    <CitationProvider>
      <MemoryRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<InsertCitation />} />
            <Route path="edit" element={<EditCitation />} />
            <Route path="library" element={<CitationLibrary />} />
            <Route path="guide" element={<AbbreviationLookup />} />
            <Route path="validation" element={<Validation />} />
            <Route path="bibliography" element={<Bibliography />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </CitationProvider>
  );
}

export function renderApp(container: HTMLElement): void {
  const root = createRoot(container);
  root.render(<App />);
}
