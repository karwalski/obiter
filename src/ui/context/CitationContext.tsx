/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  registerSelectionHandler,
  unregisterSelectionHandler,
} from "../../word/selectionHandler";
import { registerChangeListener, unregisterChangeListener } from "../../word/changeListener";
import { refreshAllCitations } from "../../word/citationRefresher";
import { getSharedStore } from "../../store/singleton";
import { getDevicePref } from "../../store/devicePreferences";

/** Which field to auto-focus after navigating to Edit from a CC click. */
export type FocusField = "pinpoint" | "format" | null;

interface CitationContextValue {
  selectedCitationId: string | null;
  setSelectedCitationId: (id: string | null) => void;
  focusField: FocusField;
  setFocusField: (field: FocusField) => void;
  refreshCounter: number;
  triggerRefresh: () => void;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (enabled: boolean) => void;
}

const CitationContext = createContext<CitationContextValue | undefined>(undefined);

export function CitationProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [selectedCitationId, setSelectedCitationIdRaw] = useState<string | null>(null);
  const [focusField, setFocusField] = useState<FocusField>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const refreshingRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);

  // UX-005: Delay auto-refresh until Word finishes its initial document
  // render (including footnote numbering). Without this guard, the change
  // listener fires during startup and the citation refresher modifies
  // footnote content controls before Word has finished rendering them,
  // causing footnote numbers to briefly appear then disappear.
  const startupReadyRef = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      startupReadyRef.current = true;
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const setSelectedCitationId = useCallback((id: string | null) => {
    setSelectedCitationIdRaw(id);
    if (!id) setFocusField(null);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);

    // Auto-refresh ibid/subsequent references when enabled.
    // Debounced: waits 1.5s after the last trigger before running, so rapid
    // inserts don't cause back-to-back full refreshes (O(n) each).
    // Gate: Manual Citations Mode disables all auto-refresh.
    if (!autoRefreshEnabled || !startupReadyRef.current || getDevicePref("manualCitationMode") === true) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(() => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;

      void Word.run(async (context) => {
        try {
          const store = await getSharedStore();
          await refreshAllCitations(context, store);
        } catch {
          // Refresh failed — non-critical, will catch up on next trigger
        } finally {
          refreshingRef.current = false;
        }
      });
    }, 1500);
  }, [autoRefreshEnabled]);

  // Register the document selection handler — auto-navigate to /edit on CC click
  const navigateRef = useRef<ReturnType<typeof useNavigate> | null>(null);
  const locationRef = useRef<ReturnType<typeof useLocation> | null>(null);

  // Keep refs in sync (avoids re-registering the handler on every nav change)
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { locationRef.current = location; }, [location]);

  useEffect(() => {
    let mounted = true;

    void registerSelectionHandler((citationId: string, ccTitle?: string) => {
      if (!mounted) return;

      setSelectedCitationIdRaw(citationId);

      // Derive focusField from the child CC title set by the citationRefresher
      if (ccTitle === "Citation:short") {
        setFocusField("pinpoint");
      } else if (ccTitle === "Citation:ibid") {
        setFocusField("format");
      } else {
        setFocusField(null);
      }

      // Auto-navigate to the edit view if not already there
      if (locationRef.current && locationRef.current.pathname !== "/edit") {
        navigateRef.current?.("/edit");
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
      focusField,
      setFocusField,
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
