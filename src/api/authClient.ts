/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ACCT-005 — Account auth client.
 *
 * Typed wrappers around the obiter.com.au account API (register / login / MFA /
 * refresh / logout) plus an authenticated `fetch` helper that transparently
 * refreshes an expired access token before each request.
 *
 * ─── TOKEN CUSTODY (THREAT-MODEL, ACCT-007) ─────────────────────────────────
 * The access + refresh token pair is held in memory and mirrored to
 * localStorage under `obiter-auth`. A refresh token lets its bearer obtain
 * fresh access tokens and, when a vault key exists, drive LLM requests through
 * the proxy with the user's stored provider key injected server-side. That
 * makes the token pair EQUIVALENT-TO-BYOK-KEY CUSTODY: whoever can read this
 * device's localStorage can act as the account until the tokens are revoked.
 *
 * This is the same custody boundary Obiter already accepts for BYOK keys (see
 * keyVault.ts / devicePreferences.ts — localStorage is the only storage the
 * Office webview offers). It is mitigated by:
 *   - SHORT ACCESS-TOKEN EXPIRY: access tokens are refreshed on expiry, so a
 *     stale access token is useless quickly.
 *   - REFRESH ROTATION: every /api/auth/refresh rotates the refresh token and
 *     detects reuse of a retired token (server invalidates the family).
 *   - SERVER-SIDE REVOCATION: signOut() calls /api/auth/logout to revoke the
 *     refresh chain before clearing local storage, so a leaked copy is dead.
 * The provider key itself is NEVER stored on the device once vaulted — only the
 * tokens that authorise the proxy to use it are.
 */

import { WEBSITE_URL } from "../constants";

// ─── Types ──────────────────────────────────────────────────────────────────

/** The token pair the account API returns on a successful login. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds, as returned by the server. */
  expiresIn: number;
}

/** Persisted auth state (localStorage `obiter-auth`). */
export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  /** Absolute epoch-ms at which the access token expires. */
  expiresAt: number;
  /** The signed-in email, for display in Settings. */
  email: string;
}

/** Result of a login attempt: either an MFA challenge or a full token pair. */
export type LoginResult =
  | { mfaRequired: true; mfaToken: string }
  | { mfaRequired: false; tokens: TokenPair };

const STORAGE_KEY = "obiter-auth";

/**
 * Refresh the access token this many milliseconds BEFORE its stated expiry, so
 * an in-flight request never races the boundary.
 */
const EXPIRY_SKEW_MS = 30_000;

// ─── In-memory mirror ───────────────────────────────────────────────────────

let memoryAuth: StoredAuth | null = null;
let loaded = false;

function readStorage(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    if (
      typeof parsed.accessToken === "string" &&
      typeof parsed.refreshToken === "string" &&
      typeof parsed.expiresAt === "number" &&
      typeof parsed.email === "string"
    ) {
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        expiresAt: parsed.expiresAt,
        email: parsed.email,
      };
    }
  } catch {
    /* corrupt entry — treat as signed out */
  }
  return null;
}

function loadAuth(): StoredAuth | null {
  if (!loaded) {
    memoryAuth = readStorage();
    loaded = true;
  }
  return memoryAuth;
}

function persist(auth: StoredAuth | null): void {
  memoryAuth = auth;
  loaded = true;
  try {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* storage unavailable — the in-memory mirror still holds this session */
  }
}

function toStored(tokens: TokenPair, email: string): StoredAuth {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    email,
  };
}

// ─── Public state accessors ─────────────────────────────────────────────────

/** True when a token pair is held (does not check expiry — access is refreshable). */
export function isSignedIn(): boolean {
  return loadAuth() !== null;
}

/** The signed-in email, or null when signed out. */
export function getEmail(): string | null {
  return loadAuth()?.email ?? null;
}

/**
 * Persist a token pair received from the Office Dialog auth flow.
 * The email is stored for display; tokens are stored per the custody note above.
 */
export function setSession(tokens: TokenPair, email: string): void {
  persist(toStored(tokens, email));
}

/**
 * Clear all local auth state WITHOUT contacting the server. Prefer signOut(),
 * which also revokes the refresh chain; use this only after the server has
 * already invalidated the session (e.g. reuse detected on refresh).
 */
export function clearSession(): void {
  persist(null);
}

// ─── Network helpers ────────────────────────────────────────────────────────

async function postJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const response = await fetch(`${WEBSITE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: JSON.stringify(body),
    ...init,
  });
  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (json as { error?: string }).error ?? `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return json as T;
}

// ─── Auth operations ────────────────────────────────────────────────────────

/**
 * Begin a login. Returns an MFA challenge when the account has MFA enabled,
 * otherwise a full token pair. The caller stores the pair via setSession().
 *
 * NOTE: Interactive login (with Turnstile + password managers) runs in the
 * Office Dialog page (website/account/auth.html); this wrapper is used by the
 * dialog page and by tests. The pane itself never renders Turnstile.
 */
export async function login(
  email: string,
  password: string,
  turnstileToken?: string
): Promise<LoginResult> {
  const data = await postJson<{ mfaRequired?: boolean; mfaToken?: string } & Partial<TokenPair>>(
    "/api/auth/login",
    { email, password, turnstileToken }
  );
  if (data.mfaRequired && data.mfaToken) {
    return { mfaRequired: true, mfaToken: data.mfaToken };
  }
  if (data.accessToken && data.refreshToken && typeof data.expiresIn === "number") {
    return {
      mfaRequired: false,
      tokens: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
      },
    };
  }
  throw new Error("Unexpected login response from server.");
}

/** Complete an MFA login by exchanging the mfaToken + code for a token pair. */
export async function completeMfaLogin(mfaToken: string, code: string): Promise<TokenPair> {
  const data = await postJson<Partial<TokenPair>>("/api/auth/mfa/login", { mfaToken, code });
  if (data.accessToken && data.refreshToken && typeof data.expiresIn === "number") {
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    };
  }
  throw new Error("Unexpected MFA response from server.");
}

/** Register a new account. Returns the server's generic acknowledgement message. */
export async function register(
  email: string,
  password: string,
  turnstileToken?: string
): Promise<string> {
  const data = await postJson<{ message?: string }>("/api/auth/register", {
    email,
    password,
    turnstileToken,
  });
  return data.message ?? "If that email can be registered, a verification email has been sent.";
}

// ─── Refresh (single-flight) ────────────────────────────────────────────────

let refreshInFlight: Promise<string> | null = null;

async function performRefresh(current: StoredAuth): Promise<string> {
  let data: TokenPair;
  try {
    data = await postJson<TokenPair>("/api/auth/refresh", {
      refreshToken: current.refreshToken,
    });
  } catch (err) {
    // Refresh failed (reuse detected / revoked / expired) — force sign-out so
    // the UI reflects reality and we do not loop on a dead token.
    clearSession();
    throw err instanceof Error ? err : new Error(String(err));
  }
  persist(toStored(data, current.email));
  return data.accessToken;
}

/**
 * Return a valid access token, refreshing via /api/auth/refresh when the
 * current one is expired (or within the skew window). Concurrent callers share
 * a single refresh request (single-flight) so we never rotate the refresh token
 * twice in parallel — which the server would treat as reuse.
 *
 * Returns null when signed out.
 */
export async function getAccessToken(): Promise<string | null> {
  const current = loadAuth();
  if (!current) return null;

  if (Date.now() < current.expiresAt - EXPIRY_SKEW_MS) {
    return current.accessToken;
  }

  if (!refreshInFlight) {
    refreshInFlight = performRefresh(current).finally(() => {
      refreshInFlight = null;
    });
  }
  try {
    return await refreshInFlight;
  } catch {
    return null;
  }
}

// ─── Authenticated fetch ────────────────────────────────────────────────────

/**
 * Like fetch(), but attaches a fresh Bearer access token. Throws when signed
 * out. Absolute URLs are used as-is; a leading-slash path is resolved against
 * WEBSITE_URL.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not signed in.");
  const url = input.startsWith("http") ? input : `${WEBSITE_URL}${input}`;
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

// ─── Sign out ───────────────────────────────────────────────────────────────

/**
 * Revoke the refresh chain server-side, then clear all local auth state. The
 * local clear happens even if the network call fails, so the device is never
 * left holding tokens the user asked to drop.
 */
export async function signOut(): Promise<void> {
  const current = loadAuth();
  if (current) {
    try {
      await postJson("/api/auth/logout", { refreshToken: current.refreshToken });
    } catch {
      /* best effort — clear locally regardless */
    }
  }
  clearSession();
}

// ─── Self-service data rights (ACCT-007) ────────────────────────────────────

/** Step-up material for a sensitive action: a current TOTP code (MFA accounts)
 *  or the account password (non-MFA accounts). Exactly one is supplied. */
export type StepUp = { code: string } | { password: string };

/** Live account status from GET /api/user/me (counts and flags only). */
export interface MeStatus {
  email: string;
  mfaEnabled: boolean;
  keyProviders: string[];
  syncedSettings: boolean;
}

/**
 * Delete the signed-in account (self-service erasure). Step-up gated: pass a
 * current TOTP code for MFA accounts, or the password otherwise. On success the
 * server purges settings/keys/tokens and anonymises the row; the caller should
 * then clear local auth state. Throws with the server's message on failure
 * (e.g. a missing or invalid step-up).
 */
export async function deleteAccount(stepUp: StepUp): Promise<void> {
  const response = await authFetch("/api/user/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stepUp),
  });
  if (!response.ok) {
    const json: unknown = await response.json().catch(() => ({}));
    const message = (json as { error?: string }).error ?? `Request failed (${response.status}).`;
    throw new Error(message);
  }
}

/** Fetch the caller's own data (account, settings, audit) for export/download. */
export async function exportData(): Promise<unknown> {
  const response = await authFetch("/api/user/export", { method: "GET" });
  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (json as { error?: string }).error ?? `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return json;
}

/** Fetch live account status (MFA / stored key providers / synced settings). */
export async function fetchMe(): Promise<MeStatus> {
  const response = await authFetch("/api/user/me", { method: "GET" });
  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (json as { error?: string }).error ?? `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return json as MeStatus;
}

// ─── Test-only reset ────────────────────────────────────────────────────────

/**
 * Reset the in-memory cache so tests can re-read localStorage. Not for
 * production use.
 */
export function __resetForTests(): void {
  memoryAuth = null;
  loaded = false;
  refreshInFlight = null;
}
