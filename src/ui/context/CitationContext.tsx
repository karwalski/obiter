/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import {
  registerSelectionHandler,
  unregisterSelectionHandler,
} from "../../word/selectionHandler";
import { registerChangeListener, unregisterChangeListener } from "../../word/changeListener";
import { refreshAllCitations } from "../../word/citationRefresher";
import { CitationStore } from "../../store/citationStore";

interface CitationContextValue {
  selectedCitationId: string | null;
  setSelectedCitationId: (id: string | null) => void;
  refreshCounter: number;
  triggerRefresh: () => void;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (enabled: boolean) => void;
}

const CitationContext = createContext<CitationContextValue | undefined>(undefined);

export function CitationProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [selectedCitationId, setSelectedCitationIdRaw] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const refreshingRef = useRef(false);
  const storeRef = useRef<CitationStore | null>(null);

  const setSelectedCitationId = useCallback((id: string | null) => {
    setSelectedCitationIdRaw(id);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);

    // Auto-refresh ibid/subsequent references when enabled
    if (!autoRefreshEnabled || refreshingRef.current) return;
    refreshingRef.current = true;

    void Word.run(async (context) => {
      try {
        if (!storeRef.current) {
          storeRef.current = new CitationStore();
          await storeRef.current.initStore();
        }
        await refreshAllCitations(context, storeRef.current);
      } catch {
        // Refresh failed — non-critical, will catch up on next trigger
      } finally {
        refreshingRef.current = false;
      }
    });
  }, [autoRefreshEnabled]);

  // Register the document selection handler
  useEffect(() => {
    let mounted = true;

    void registerSelectionHandler((citationId: string) => {
      if (mounted) {
        setSelectedCitationIdRaw(citationId);
      }
    }).catch(() => {
      // Ignore — Office.js may not be available in tests
    });

    return () => {
      mounted = false;
      void unregisterSelectionHandler();
    };
  }, []);

  // Register the document change listener for auto-refresh
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    try {
      registerChangeListener(() => {
        triggerRefresh();
      });
    } catch {
      // Change listener not available
    }

    return () => {
      unregisterChangeListener();
    };
  }, [autoRefreshEnabled, triggerRefresh]);

  return (
    <CitationContext.Provider value={{
      selectedCitationId,
      setSelectedCitationId,
      refreshCounter,
      triggerRefresh,
      autoRefreshEnabled,
      setAutoRefreshEnabled,
    }}>
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
