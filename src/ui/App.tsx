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
import { CitationProvider } from "./context/CitationContext";
import "./styles/global.css";

/** Registers the React Router navigate function for screenshot prep. */
function NavigateRegistrar(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);
  return null;
}

/** Map URL hash fragments from manifest ribbon buttons to routes. */
function getInitialRoute(): string {
  try {
    const hash = window.location.hash.replace("#", "/");
    if (hash && hash !== "/") return hash;
  } catch { /* ignore */ }
  return "/";
}

function App(): JSX.Element {
  const initialRoute = getInitialRoute();

  return (
    <CitationProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <NavigateRegistrar />
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
