/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  registerSelectionHandler,
  unregisterSelectionHandler,
} from "../../word/selectionHandler";

interface CitationContextValue {
  selectedCitationId: string | null;
  setSelectedCitationId: (id: string | null) => void;
  refreshCounter: number;
  triggerRefresh: () => void;
}

const CitationContext = createContext<CitationContextValue | undefined>(undefined);

export function CitationProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [selectedCitationId, setSelectedCitationIdRaw] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const setSelectedCitationId = useCallback((id: string | null) => {
    setSelectedCitationIdRaw(id);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);
  }, []);

  // Register the document selection handler so clicking a citation content
  // control in Word automatically sets the selected citation ID.
  useEffect(() => {
    let mounted = true;

    void registerSelectionHandler((citationId: string) => {
      if (mounted) {
        setSelectedCitationIdRaw(citationId);
      }
    }).catch(() => {
      // Selection handler registration may fail in environments where
      // Office.js is not fully available (e.g. unit tests). Ignore.
    });

    return () => {
      mounted = false;
      void unregisterSelectionHandler();
    };
  }, []);

  return (
    <CitationContext.Provider value={{ selectedCitationId, setSelectedCitationId, refreshCounter, triggerRefresh }}>
      {children}
    </CitationContext.Provider>
  );
}

export function useCitationContext(): CitationContextValue {
  const ctx = useContext(CitationContext);
  if (!ctx) {
    throw new Error("useCitationContext must be used within a CitationProvider");
  }
  return ctx;
}
