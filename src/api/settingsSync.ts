/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * BUG-007 / ACCT-004 — Synced settings client.
 *
 * Typed wrappers around GET / PUT /api/user/settings (website/server/
 * routes/settings.js). Settings are namespaced JSON with last-write-wins
 * semantics guarded by a monotonic `settingsVersion`:
 *   - GET returns { settingsVersion, settings: { ...namespaces } }.
 *   - PUT must carry the version last seen; on a stale version the server
 *     answers 409 with its current state, and we rebase (server state with
 *     the local namespaces reapplied on top) and retry once.
 *
 * NEVER carries key material: `apiKey` is stripped from every namespace
 * before sending (the server strips it too). Keys live only in the vault.
 */

import { authFetch } from "./authClient";
import type { LLMConfig } from "../llm/config";
import type { TemplatePreferences } from "../word/documentMeta";

// ─── Types ──────────────────────────────────────────────────────────────────

/** The LLM configuration as synced — every field but the key. */
export type SyncedLlmConfig = Partial<Omit<LLMConfig, "apiKey">>;

/**
 * The namespaces Obiter knows. Unknown namespaces round-trip opaquely so a
 * newer client's settings survive a save from an older one.
 */
export interface SyncedSettings {
  llmConfig?: SyncedLlmConfig;
  autoRefresh?: boolean;
  templatePrefs?: Partial<TemplatePreferences>;
  courtToggles?: Record<string, string>;
  [namespace: string]: unknown;
}

export interface SyncedSettingsState {
  version: number;
  settings: SyncedSettings;
}

interface ServerSettingsBody {
  settingsVersion?: unknown;
  newVersion?: unknown;
  settings?: unknown;
  error?: unknown;
}

// ─── Version cache ──────────────────────────────────────────────────────────

/** The settingsVersion last seen from the server (0 until the first GET/PUT). */
let lastSeenVersion = 0;

/** The version last seen from the server; pass it to putSyncedSettings. */
export function getSyncedSettingsVersion(): number {
  return lastSeenVersion;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function readVersion(body: ServerSettingsBody): number {
  const raw = body.settingsVersion ?? body.newVersion;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

function readSettings(body: ServerSettingsBody): SyncedSettings {
  const raw = body.settings;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as SyncedSettings) : {};
}

function readError(body: ServerSettingsBody, status: number): string {
  return typeof body.error === "string" && body.error ? body.error : `Request failed (${status}).`;
}

async function parseBody(response: Response): Promise<ServerSettingsBody> {
  const json: unknown = await response.json().catch(() => ({}));
  return json && typeof json === "object" ? (json as ServerSettingsBody) : {};
}

/** Field names that may carry key material; dropped from every namespace. */
const KEY_FIELDS = new Set(["apiKey", "api_key", "apikey", "key", "secret"]);

/**
 * Remove key-like fields from an object-valued namespace (one level deep,
 * which covers every shape Obiter syncs). Arrays and primitives pass through.
 */
export function stripKeyMaterial(settings: SyncedSettings): SyncedSettings {
  const out: SyncedSettings = {};
  for (const [ns, value] of Object.entries(settings)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (KEY_FIELDS.has(k)) continue;
        clean[k] = v;
      }
      out[ns] = clean;
    } else {
      out[ns] = value;
    }
  }
  return out;
}

// ─── API ────────────────────────────────────────────────────────────────────

/** Fetch the account's synced settings and remember the version seen. */
export async function getSyncedSettings(): Promise<SyncedSettingsState> {
  const response = await authFetch("/api/user/settings", { method: "GET" });
  const body = await parseBody(response);
  if (!response.ok) {
    throw new Error(readError(body, response.status));
  }
  const version = readVersion(body);
  lastSeenVersion = version;
  return { version, settings: readSettings(body) };
}

async function sendPut(version: number, settings: SyncedSettings): Promise<Response> {
  return authFetch("/api/user/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settingsVersion: version, settings }),
  });
}

/**
 * Write `settings` (the namespaces this device changed) on top of the
 * account's settings. `version` is the settingsVersion last seen. On a 409
 * the server's current state is taken, the local namespaces are reapplied on
 * top, and the write is retried once. Resolves with the new version.
 */
export async function putSyncedSettings(
  version: number,
  settings: SyncedSettings
): Promise<number> {
  const local = stripKeyMaterial(settings);

  let response = await sendPut(version, local);
  let body = await parseBody(response);

  if (response.status === 409) {
    // Stale: rebase the local change onto the server's current state.
    const serverVersion = readVersion(body);
    const rebased: SyncedSettings = { ...readSettings(body), ...local };
    response = await sendPut(serverVersion, rebased);
    body = await parseBody(response);
    if (response.status === 409) {
      throw new Error("Settings changed on another device. Try saving again.");
    }
  }

  if (!response.ok) {
    throw new Error(readError(body, response.status));
  }
  const newVersion = readVersion(body);
  lastSeenVersion = newVersion;
  return newVersion;
}

// ─── Test-only reset ────────────────────────────────────────────────────────

/** Reset the cached version. Not for production use. */
export function __resetForTests(): void {
  lastSeenVersion = 0;
}
