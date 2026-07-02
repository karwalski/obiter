/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Shared status log. Replaces silent failures and transient toasts with a
 * re-readable, in-pane record of what just happened (WCAG 3.3.1 Error
 * Identification, 4.1.3 Status Messages). A slow or assistive-technology user
 * can review recent outcomes instead of racing a disappearing banner.
 */

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

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
