/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INFRA-009: Device-level preferences — persist in localStorage.
 *
 * SECURITY: These preferences are stored in the browser's localStorage
 * only. They are NEVER written to the document (Custom XML Part, document
 * settings, or roamingSettings) to prevent sensitive data such as API
 * keys from leaking to other users who open the same document.
 *
 * On Mac, Office Add-in webviews have per-document localStorage, so
 * device preferences (including API keys) must be re-entered when
 * opening a new document for the first time. This is a known platform
 * limitation with no secure workaround — roamingSettings is Outlook-only
 * and document.settings is stored inside the .docx file.
 */

const PREFIX = "obiter-device.";

/** Read a device-level preference from localStorage. */
export function getDevicePref(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Write a device-level preference to localStorage. */
export function setDevicePref(key: string, value: unknown): void {
  try {
    if (value === undefined) {
      localStorage.removeItem(PREFIX + key);
    } else {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    }
  } catch {
    /* ignore */
  }
}

// ── Product heartbeats (dual-install detection) ─────────────────────────────
//
// The classic add-in and the "Obiter for Microsoft 365 Copilot" package are
// separate products that load the same web app from the same origin, so they
// share this localStorage. Each pane records which product loaded it; if the
// OTHER product has a fresh heartbeat, both are installed — an unsupported
// combination (they would contend for the document selection handler), so the
// UI shows a remove-the-classic-add-in warning.

/** The two Obiter product lines that can host this web app. */
export type ObiterProduct = "classic" | "copilot";

/** How long a heartbeat counts as "this product is in use". */
const HEARTBEAT_FRESH_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Which product loaded this pane. The Copilot package's manifest appends
 * `product=copilot` to its task-pane URLs; the classic XML manifest does not.
 */
export function detectProduct(): ObiterProduct {
  try {
    if (new URLSearchParams(window.location.search).get("product") === "copilot") {
      return "copilot";
    }
  } catch {
    /* ignore */
  }
  return "classic";
}

/** Record that this product's pane loaded now. */
export function recordProductHeartbeat(product: ObiterProduct): void {
  setDevicePref(`heartbeat.${product}`, Date.now());
}

/** True when the OTHER product has loaded recently on this device. */
export function otherProductActive(product: ObiterProduct): boolean {
  const other: ObiterProduct = product === "classic" ? "copilot" : "classic";
  const at = getDevicePref(`heartbeat.${other}`);
  return typeof at === "number" && Date.now() - at < HEARTBEAT_FRESH_MS;
}
