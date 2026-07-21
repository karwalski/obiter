/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ACCT-005 — Vault-key mode for the LLM client.
 *
 * When the user is signed in AND has a provider key in the server-side vault,
 * the LLM client omits the inline key and lets the proxy inject the stored key
 * (ACCT-004). A per-device "use my own key on this device instead" override
 * lets a signed-in user force local BYOK for a provider without deleting the
 * vaulted key.
 *
 * Which providers have a vaulted key is discovered from the server
 * (GET /api/user/keys) and cached on the device so the synchronous LLM call
 * path (callLlm / callLlmMultiTurn) can decide without an await per request.
 */

import { getDevicePref, setDevicePref } from "../store/devicePreferences";

/** Device-pref key: array of provider ids known to have a vaulted key. */
const VAULT_PROVIDERS_PREF = "vaultKeyProviders";

/** Device-pref key: map of provider -> true when local BYOK is forced. */
const LOCAL_OVERRIDE_PREF = "vaultLocalKeyOverride";

/** Record which providers currently have a vaulted key (from the server list). */
export function setVaultKeyProviders(providers: string[]): void {
  setDevicePref(VAULT_PROVIDERS_PREF, providers);
}

/** The providers cached as having a vaulted key. */
export function getVaultKeyProviders(): string[] {
  const raw = getDevicePref(VAULT_PROVIDERS_PREF);
  return Array.isArray(raw) ? (raw as string[]) : [];
}

/** True when the given provider has a vaulted key on the server (per cache). */
export function hasVaultKey(provider: string): boolean {
  return getVaultKeyProviders().includes(provider);
}

/** Force local BYOK for a provider (or clear the override). */
export function setLocalKeyOverride(provider: string, forceLocal: boolean): void {
  const raw = getDevicePref(LOCAL_OVERRIDE_PREF);
  const map: Record<string, boolean> =
    raw && typeof raw === "object" ? { ...(raw as Record<string, boolean>) } : {};
  if (forceLocal) {
    map[provider] = true;
  } else {
    delete map[provider];
  }
  setDevicePref(LOCAL_OVERRIDE_PREF, map);
}

/** True when the user has chosen to use a local key for this provider. */
export function hasLocalKeyOverride(provider: string): boolean {
  const raw = getDevicePref(LOCAL_OVERRIDE_PREF);
  if (raw && typeof raw === "object") {
    return (raw as Record<string, boolean>)[provider] === true;
  }
  return false;
}

/** Clear all vault caches and overrides (e.g. on sign-out). */
export function clearVaultMode(): void {
  setDevicePref(VAULT_PROVIDERS_PREF, undefined);
  setDevicePref(LOCAL_OVERRIDE_PREF, undefined);
}
