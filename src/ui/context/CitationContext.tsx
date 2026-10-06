/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { registerSelectionHandler, unregisterSelectionHandler } from "../../word/selectionHandler";
import { registerChangeListener, unregisterChangeListener } from "../../word/changeListener";
import { refreshAllCitations } from "../../word/citationRefresher";
import type { RefreshIssuesDetail } from "../../word/citationRefresher";
import { getSharedStore } from "../../store/singleton";
import { getDevicePref } from "../../store/devicePreferences";
import { createLogger } from "../../debug/logger";
import { isFeatureAvailable } from "../../word/apiCompat";
import {
  readChangeTrackingMode,
  isTrackingOn,
  countPendingRevisionsInManagedFootnotes,
  type TrackingMode,
} from "../../word/trackChanges";
import { PARENT_CC_TAG } from "../../word/footnoteManager";
import { getTrackChangesGate, recordTrackingMode } from "../trackChangesGate";
import {
  hasTrackedWriteConsentHandler,
  requestTrackedWriteConsent,
} from "../../word/trackedWriteConsent";

const log = createLogger("CitationContext");

/** Which field to auto-focus after navigating to Edit from a CC click. */
export type FocusField = "pinpoint" | "format" | null;

interface CitationContextValue {
  selectedCitationId: string | null;
  setSelectedCitationId: (id: string | null) => void;
  focusField: FocusField;
  setFocusField: (field: FocusField) => void;
  refreshCounter: number;
  /**
   * Bump the refresh counter and schedule the debounced refresh. With
   * `askIfTracked` (a Settings change), Track Changes on asks first in the
   * pane instead of pausing silently (COURT-108 follow-up).
   */
  triggerRefresh: (options?: TriggerRefreshOptions) => void;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (enabled: boolean) => void;
}

/** COURT-108 follow-up: options for {@link CitationContextValue.triggerRefresh}. */
export interface TriggerRefreshOptions {
  /** Ask before refreshing while Track Changes is on (Settings changes). */
  askIfTracked?: boolean;
}

/** COURT-108 follow-up: the option a Settings change passes. */
export const ASK_IF_TRACKED: TriggerRefreshOptions = { askIfTracked: true };

const CitationContext = createContext<CitationContextValue | undefined>(undefined);

export function CitationProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [selectedCitationId, setSelectedCitationIdRaw] = useState<string | null>(null);
  const [focusField, setFocusField] = useState<FocusField>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const refreshingRef = useRef(false);
  // A refresh requested while another is running. It used to be dropped,
  // which left an "auto" occurrence stale: an Ibid stayed Ibid after a
  // different source was inserted before it (field report 27 Sep 2026).
  // Now it runs once the current refresh finishes.
  const refreshPendingRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);
  // COURT-108 follow-up: a Settings change asked for the next debounced
  // refresh to ask first while Track Changes is on.
  const askIfTrackedRef = useRef(false);

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

  const triggerRefresh = useCallback(
    (options?: TriggerRefreshOptions) => {
      setRefreshCounter((prev) => prev + 1);

      // Auto-refresh ibid/subsequent references when enabled.
      // Debounced: waits 1.5s after the last trigger before running, so rapid
      // inserts don't cause back-to-back full refreshes (O(n) each).
      // Gate: Manual Citations Mode disables all auto-refresh.
      if (
        !autoRefreshEnabled ||
        !startupReadyRef.current ||
        getDevicePref("manualCitationMode") === true
      )
        return;

      // Only an explicit option counts (a click handler may pass an event).
      if (options?.askIfTracked === true) askIfTrackedRef.current = true;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(() => runRefresh(), 1500);
    },
    [autoRefreshEnabled]
  );

  /** Run one full refresh, then any refresh requested while it ran. */
  function runRefresh(): void {
    if (refreshingRef.current) {
      refreshPendingRef.current = true;
      return;
    }
    refreshingRef.current = true;
    refreshPendingRef.current = false;
    const askIfTracked = askIfTrackedRef.current;
    askIfTrackedRef.current = false;
    // Set when a Settings change found Track Changes on: ask after this run.
    let askMode: TrackingMode | null = null;

    let run: Promise<unknown>;
    try {
      run = Word.run(async (context) => {
        try {
          // COURT-108: read Track Changes before any automatic refresh. With
          // it on, every rebuild would be recorded as a revision, so pause
          // and let the banner offer "Refresh now" or "Keep paused". One
          // extra sync per refresh (two more, once, to count revisions on
          // WordApi 1.6+), never one per footnote. A host without WordApi
          // 1.4 skips the read entirely and refreshes as before.
          if (isFeatureAvailable("changeTrackingMode")) {
            const mode = await readChangeTrackingMode(context);
            if (isTrackingOn(mode)) {
              // COURT-108 follow-up: a Settings change asks in the pane
              // instead (after this Word.run, so no request context is held
              // open while the user decides).
              if (askIfTracked && hasTrackedWriteConsentHandler()) {
                askMode = mode;
                return;
              }
              const pending = getTrackChangesGate().paused
                ? undefined
                : await countPendingRevisionsInManagedFootnotes(context, PARENT_CC_TAG);
              recordTrackingMode(mode, pending);
              log.info("Automatic refresh paused: Track Changes is on", { mode });
              return;
            }
            recordTrackingMode(mode);
          }
          await refreshAndReport(context);
        } catch (err) {
          // Refresh failed — non-critical, will catch up on next trigger
          log.error("Auto-refresh failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
    } catch {
      // Word unavailable (host not ready): release the guard so the next
      // trigger can run.
      run = Promise.resolve();
    }
    void run
      .catch(() => {
        // Word.run itself failed (document closing); the next trigger retries.
      })
      .then(async () => {
        if (!askMode) return;
        const accepted = await requestTrackedWriteConsent({ reason: "settings", mode: askMode });
        if (!accepted) {
          log.info("Refresh after a Settings change skipped: Track Changes is on");
          return;
        }
        try {
          await Word.run((context) => refreshAndReport(context));
        } catch (err) {
          log.error("Refresh after a Settings change failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })
      .finally(() => {
        refreshingRef.current = false;
        if (refreshPendingRef.current) {
          refreshPendingRef.current = false;
          runRefresh();
        }
      });
  }

  /** One full refresh, with partial failures reported to the Status UI. */
  async function refreshAndReport(context: Word.RequestContext): Promise<void> {
    const store = await getSharedStore();
    const result = await refreshAllCitations(context, store);
    // SAFE-003: surface partial failures and detected user edits
    // instead of silently swallowing them. The Status/Recovery UI
    // listens for `obiter:refresh-issues`.
    const revisionSkips = result.revisionSkips ?? [];
    if (result.failures.length > 0 || result.userEdits.length > 0 || revisionSkips.length > 0) {
      log.warn("Auto-refresh completed with issues", {
        failures: result.failures,
        userEditedFootnotes: result.userEdits.map((edit) => edit.footnoteNumber),
        revisionSkips,
      });
      const detail: RefreshIssuesDetail = {
        failures: result.failures,
        userEdits: result.userEdits,
        ...(revisionSkips.length > 0 ? { revisionSkips } : {}),
      };
      window.dispatchEvent(new CustomEvent("obiter:refresh-issues", { detail }));
    }
  }

  // Register the document selection handler — auto-navigate to /edit on CC click
  const navigateRef = useRef<ReturnType<typeof useNavigate> | null>(null);
  const locationRef = useRef<ReturnType<typeof useLocation> | null>(null);

  // Keep refs in sync (avoids re-registering the handler on every nav change)
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

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
    <CitationContext.Provider
      value={{
        selectedCitationId,
        setSelectedCitationId,
        focusField,
        setFocusField,
        refreshCounter,
        triggerRefresh,
        autoRefreshEnabled,
        setAutoRefreshEnabled,
      }}
    >
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
