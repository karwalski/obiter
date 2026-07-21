/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ACCT-004 / ACCT-005 — Server-side key vault client.
 *
 * Thin authenticated wrappers over /api/user/keys. The server stores each
 * provider key encrypted (write-only) and returns metadata only: provider +
 * last4. Key ciphertext is NEVER returned. Deletion requires a step-up
 * re-authentication (a current TOTP code for MFA accounts, otherwise the
 * account password) collected in-pane per WEB-013 (no window.confirm/prompt).
 */

import { authFetch } from "./authClient";

/** Display metadata for one stored provider key. Never includes key material. */
export interface VaultKeyMeta {
  provider: string;
  last4: string;
  createdAt?: string;
}

/** Providers the vault accepts (must match the server's KNOWN_PROVIDERS). */
export const VAULT_PROVIDERS = ["openai", "anthropic", "gemini", "grok", "deepseek"] as const;

/** List the stored keys for the signed-in account (metadata only). */
export async function listVaultKeys(): Promise<VaultKeyMeta[]> {
  const res = await authFetch("/api/user/keys", { method: "GET" });
  if (!res.ok) throw new Error(`Could not load stored keys (${res.status}).`);
  const json = (await res.json()) as { keys?: VaultKeyMeta[] };
  return json.keys ?? [];
}

/** Store (or replace) the key for a provider. Returns the new last4. */
export async function saveVaultKey(provider: string, apiKey: string): Promise<VaultKeyMeta> {
  const res = await authFetch(`/api/user/keys/${encodeURIComponent(provider)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const json = (await res.json().catch(() => ({}))) as VaultKeyMeta & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Could not store key (${res.status}).`);
  return { provider: json.provider, last4: json.last4 };
}

/** Step-up credential for a vault-key delete: a TOTP code or the password. */
export type StepUpCredential = { code: string } | { password: string };

/**
 * Delete a stored key. Requires step-up: `{ code }` (current TOTP) for MFA
 * accounts, `{ password }` otherwise. Returns whether a row was removed.
 * Throws with the server's stable error code embedded when step-up is missing
 * or invalid, so the caller can prompt for the right credential.
 */
export async function deleteVaultKey(provider: string, stepUp: StepUpCredential): Promise<boolean> {
  const res = await authFetch(`/api/user/keys/${encodeURIComponent(provider)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stepUp),
  });
  const json = (await res.json().catch(() => ({}))) as {
    deleted?: boolean;
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    const err = new Error(json.error ?? `Could not remove key (${res.status}).`) as Error & {
      code?: string;
    };
    err.code = json.code;
    throw err;
  }
  return Boolean(json.deleted);
}
