/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * SAFE-006: global error surfacing.
 *
 * Wires `window.onerror` and `unhandledrejection` into the debug logger and
 * announces failures to the user. The status mechanism is React-context-bound
 * (StatusContext) while these handlers install pre-React from Office.onReady,
 * so announcements cross the boundary as a CustomEvent (`obiter:global-error`)
 * that StatusProvider listens for — the same pattern as `obiter:refresh-issues`.
 *
 * Every occurrence is written to the debug logger; user-visible announcements
 * are deduplicated by error signature (message + source hash) to at most one
 * per signature per 60 seconds.
 *
 * Also provides the task-pane side of the ribbon-command error ring: ribbon
 * commands run in a separate runtime (commands.html) with no UI and record
 * failures into localStorage (`obiter-command-errors`, written by an inline
 * helper in src/commands/commands.ts — that file cannot import this module).
 * `drainCommandErrors()` reads and clears that ring so StatusProvider can
 * announce the failures on mount, on the `storage` event, and on focus.
 */

import { createLogger } from "./logger";

/** CustomEvent type dispatched on `window` for user-visible error announcements. */
export const GLOBAL_ERROR_EVENT = "obiter:global-error";

/** localStorage key of the ribbon-command error ring (written by commands.ts). */
export const COMMAND_ERROR_STORAGE_KEY = "obiter-command-errors";

/** Minimum interval between StatusLog announcements of the same signature. */
export const ANNOUNCE_WINDOW_MS = 60_000;

/** Detail payload of the `obiter:global-error` CustomEvent. */
export interface GlobalErrorDetail {
  /** Human-readable error message. */
  message: string;
  /** Where the error surfaced. */
  kind: "error" | "unhandledrejection";
}

/** One entry of the ribbon-command error ring. */
export interface CommandErrorEntry {
  name: string;
  message: string;
  timestamp: string;
}

/**
 * Stable signature for an error occurrence: FNV-1a 32-bit hash over
 * `message|source`, as 8 hex digits. Pure — used for announcement dedup.
 */
export function errorSignature(message: string, source: string): string {
  const input = `${message}|${source}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16);
  return ("00000000" + hex).slice(-8);
}

/**
 * Creates a signature deduper: returns true the first time a signature is
 * seen and again once `windowMs` has elapsed since its last accepted
 * occurrence; false otherwise. Pure apart from the injected clock.
 */
export function createErrorDeduper(
  windowMs: number = ANNOUNCE_WINDOW_MS,
  now: () => number = Date.now
): (signature: string) => boolean {
  const lastAccepted = new Map<string, number>();
  return (signature: string): boolean => {
    const t = now();
    const previous = lastAccepted.get(signature);
    if (previous !== undefined && t - previous < windowMs) return false;
    // Bound memory: drop expired signatures before recording a new one.
    if (lastAccepted.size >= 200) {
      lastAccepted.forEach((acceptedAt, key) => {
        if (t - acceptedAt >= windowMs) lastAccepted.delete(key);
      });
    }
    lastAccepted.set(signature, t);
    return true;
  };
}

/** Normalises an unknown thrown value / rejection reason into message + stack. */
export function describeError(reason: unknown): { message: string; stack?: string } {
  if (reason instanceof Error) {
    return { message: reason.message || reason.name, stack: reason.stack };
  }
  if (typeof reason === "string") {
    return { message: reason || "Unknown error" };
  }
  try {
    const serialised = JSON.stringify(reason);
    return { message: serialised === undefined ? "Unknown error" : serialised };
  } catch {
    return { message: "Unknown error" };
  }
}

function isCommandErrorEntry(value: unknown): value is CommandErrorEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" && typeof v.message === "string" && typeof v.timestamp === "string"
  );
}

/**
 * Reads and clears the ribbon-command error ring. Returns the valid entries,
 * oldest first. All storage access is guarded — some webviews throw on
 * localStorage — and a malformed ring is discarded rather than surfaced.
 */
export function drainCommandErrors(
  storage?: Pick<Storage, "getItem" | "removeItem">
): CommandErrorEntry[] {
  let raw: string | null = null;
  try {
    const store = storage ?? window.localStorage;
    raw = store.getItem(COMMAND_ERROR_STORAGE_KEY);
    if (raw !== null) store.removeItem(COMMAND_ERROR_STORAGE_KEY);
  } catch {
    return [];
  }
  if (raw === null || raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCommandErrorEntry);
  } catch {
    return [];
  }
}

let installed = false;

/**
 * Installs the global error handlers. Idempotent — a second call is a no-op.
 * Every occurrence is logged to the debug logger; the `obiter:global-error`
 * CustomEvent (which StatusProvider turns into a StatusLog entry) is
 * dispatched at most once per signature per {@link ANNOUNCE_WINDOW_MS}.
 */
export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const log = createLogger("GlobalErrors");
  const shouldAnnounce = createErrorDeduper();

  const announce = (kind: GlobalErrorDetail["kind"], message: string, source: string): void => {
    if (!shouldAnnounce(errorSignature(message, source))) return;
    try {
      window.dispatchEvent(
        new CustomEvent<GlobalErrorDetail>(GLOBAL_ERROR_EVENT, { detail: { message, kind } })
      );
    } catch {
      // Announcing must never itself throw.
    }
  };

  const previousOnError = window.onerror;
  window.onerror = function (
    message: string | Event,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): boolean {
    const described = error
      ? describeError(error)
      : describeError(typeof message === "string" ? message : "Unknown error");
    log.error("Unhandled error", {
      message: described.message,
      source,
      lineno,
      colno,
      stack: described.stack,
    });
    announce("error", described.message, source ?? "");
    if (typeof previousOnError === "function") {
      return previousOnError.call(window, message, source, lineno, colno, error) === true;
    }
    return false;
  };

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const described = describeError(event.reason);
    log.error("Unhandled promise rejection", {
      message: described.message,
      stack: described.stack,
    });
    // Rejections have no source URL; the signature is the message alone.
    announce("unhandledrejection", described.message, "");
  });
}
