/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Shared status log. Replaces silent failures and transient toasts with a
 * re-readable, in-pane record of what just happened (WCAG 3.3.1 Error
 * Identification, 4.1.3 Status Messages). A slow or assistive-technology user
 * can review recent outcomes instead of racing a disappearing banner.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import {
  GLOBAL_ERROR_EVENT,
  COMMAND_ERROR_STORAGE_KEY,
  drainCommandErrors,
  type GlobalErrorDetail,
} from "../../debug/globalErrors";
import { REFRESH_ISSUES_EVENT, recordRefreshIssues } from "../recoveryQueue";
import type { RefreshIssuesDetail } from "../../word/citationRefresher";

export type StatusLevel = "info" | "success" | "error";

export interface StatusEntry {
  id: number;
  message: string;
  level: StatusLevel;
}

interface StatusContextValue {
  entries: StatusEntry[];
  announce: (message: string, level?: StatusLevel) => void;
  clear: () => void;
}

const StatusContext = createContext<StatusContextValue | null>(null);

// Keep a short, re-readable history; older entries scroll off.
const MAX_ENTRIES = 5;

export function StatusProvider({ children }: { children: ReactNode }): JSX.Element {
  const [entries, setEntries] = useState<StatusEntry[]>([]);
  const idRef = useRef(0);

  const announce = useCallback((message: string, level: StatusLevel = "info") => {
    idRef.current += 1;
    const entry: StatusEntry = { id: idRef.current, message, level };
    setEntries((prev) => [...prev, entry].slice(-MAX_ENTRIES));
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  // SAFE-006: surface failures from outside the React tree.
  //
  // 1. Global errors — installGlobalErrorHandlers() runs pre-React (from
  //    Office.onReady) and cannot reach this context directly, so it
  //    dispatches an `obiter:global-error` CustomEvent that is relayed here.
  // 2. Ribbon command errors — commands run in a separate runtime
  //    (commands.html) and record failures into a localStorage ring. The
  //    `storage` event does not fire in the window that wrote the key, and a
  //    shared-runtime host fires no `storage` event at all, so the ring is
  //    drained on mount, on `storage`, and on window focus.
  // 3. Refresh issues (SAFE-005) — the auto-refresh path dispatches
  //    `obiter:refresh-issues` when a refresh skips user-edited footnotes
  //    or a rebuild chunk fails. The detail is recorded into the recovery
  //    queue (so the Recovery view can list it later) and summarised as a
  //    status line pointing at the Recovery view.
  useEffect(() => {
    const announceCommandErrors = (): void => {
      for (const entry of drainCommandErrors()) {
        announce(
          entry.message
            ? `Ribbon command '${entry.name}' failed — ${entry.message}`
            : `Ribbon command '${entry.name}' failed.`,
          "error"
        );
      }
    };
    const onGlobalError = (event: Event): void => {
      const detail = (event as CustomEvent<GlobalErrorDetail>).detail;
      if (detail && detail.message) {
        announce(`Unexpected error: ${detail.message}`, "error");
      }
    };
    const onStorage = (event: StorageEvent): void => {
      // key === null means the other window cleared storage entirely.
      if (event.key === null || event.key === COMMAND_ERROR_STORAGE_KEY) {
        announceCommandErrors();
      }
    };
    const onRefreshIssues = (event: Event): void => {
      const detail = (event as CustomEvent<RefreshIssuesDetail>).detail;
      if (!detail) return;
      recordRefreshIssues(detail);
      const parts: string[] = [];
      if (detail.userEdits.length > 0) {
        parts.push(
          `${detail.userEdits.length} manually edited footnote` +
            `${detail.userEdits.length !== 1 ? "s were" : " was"} left unchanged`
        );
      }
      if (detail.failures.length > 0) {
        const failedCount = detail.failures.reduce((n, f) => n + f.footnoteNumbers.length, 0);
        parts.push(`${failedCount} footnote${failedCount !== 1 ? "s" : ""} failed to rebuild`);
      }
      if (parts.length > 0) {
        announce(
          `Refresh finished with issues: ${parts.join(" and ")}. ` +
            `Open the Recovery view to review them.`,
          "error"
        );
      }
    };

    announceCommandErrors();
    window.addEventListener(GLOBAL_ERROR_EVENT, onGlobalError);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", announceCommandErrors);
    window.addEventListener(REFRESH_ISSUES_EVENT, onRefreshIssues);
    return () => {
      window.removeEventListener(GLOBAL_ERROR_EVENT, onGlobalError);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", announceCommandErrors);
      window.removeEventListener(REFRESH_ISSUES_EVENT, onRefreshIssues);
    };
  }, [announce]);

  return (
    <StatusContext.Provider value={{ entries, announce, clear }}>{children}</StatusContext.Provider>
  );
}

/**
 * Access the status log. Outside a provider it returns a safe no-op so
 * components (and tests) never crash for the lack of one.
 */
export function useStatus(): StatusContextValue {
  const ctx = useContext(StatusContext);
  if (!ctx) {
    return { entries: [], announce: () => undefined, clear: () => undefined };
  }
  return ctx;
}
