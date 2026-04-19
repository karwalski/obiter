/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Debug logging utility. Disabled by default in production.
 * Enable via Settings or by setting localStorage.setItem("obiter-debug", "true").
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let enabled = false;
let minLevel: LogLevel = "debug";
let logHistory: Array<{ timestamp: string; level: LogLevel; module: string; message: string; data?: unknown }> = [];
const MAX_HISTORY = 500;

/** Check if debug mode is enabled (from localStorage). */
function checkEnabled(): boolean {
  try {
    return localStorage.getItem("obiter-debug") === "true";
  } catch {
    return false;
  }
}

/** Enable debug logging. */
export function enableDebug(level: LogLevel = "debug"): void {
  enabled = true;
  minLevel = level;
  try {
    localStorage.setItem("obiter-debug", "true");
    localStorage.setItem("obiter-debug-level", level);
  } catch { /* ignore */ }
}

/** Disable debug logging. */
export function disableDebug(): void {
  enabled = false;
  try {
    localStorage.removeItem("obiter-debug");
    localStorage.removeItem("obiter-debug-level");
  } catch { /* ignore */ }
}

/** Returns whether debug logging is currently enabled. */
export function isDebugEnabled(): boolean {
  if (!enabled) enabled = checkEnabled();
  return enabled;
}

/** Get the full log history. */
export function getLogHistory(): typeof logHistory {
  return [...logHistory];
}

/** Clear the log history. */
export function clearLogHistory(): void {
  logHistory = [];
}

/** Export log history as a downloadable text blob. */
export function exportLogs(): string {
  return logHistory
    .map((entry) => {
      const data = entry.data !== undefined ? ` | ${JSON.stringify(entry.data)}` : "";
      return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}${data}`;
    })
    .join("\n");
}

/**
 * Create a scoped logger for a module.
 *
 * Usage:
 * ```ts
 * const log = createLogger("CitationStore");
 * log.info("Store initialised", { citationCount: 5 });
 * log.debug("Loading XML part", { partId: "abc123" });
 * log.error("Failed to persist", { error: err.message });
 * ```
 */
export function createLogger(module: string) {
  const log = (level: LogLevel, message: string, data?: unknown): void => {
    if (!isDebugEnabled()) return;
    if (LOG_LEVELS[level] < LOG_LEVELS[minLevel]) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };

    logHistory.push(entry);
    if (logHistory.length > MAX_HISTORY) {
      logHistory = logHistory.slice(-MAX_HISTORY);
    }

    // Also output to browser console
    const prefix = `[Obiter:${module}]`;
    switch (level) {
      case "debug":
        // eslint-disable-next-line no-console
        console.debug(prefix, message, data ?? "");
        break;
      case "info":
        // eslint-disable-next-line no-console
        console.info(prefix, message, data ?? "");
        break;
      case "warn":
        // eslint-disable-next-line no-console
        console.warn(prefix, message, data ?? "");
        break;
      case "error":
        // eslint-disable-next-line no-console
        console.error(prefix, message, data ?? "");
        break;
    }
  };

  return {
    debug: (message: string, data?: unknown) => log("debug", message, data),
    info: (message: string, data?: unknown) => log("info", message, data),
    warn: (message: string, data?: unknown) => log("warn", message, data),
    error: (message: string, data?: unknown) => log("error", message, data),
  };
}
