/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ACCT-005 — Account auth client.
 *
 * Contract under test:
 *  - setSession persists the token pair + email to localStorage (`obiter-auth`)
 *    and is reflected by isSignedIn/getEmail.
 *  - getAccessToken returns the current token while fresh, and refreshes via
 *    /api/auth/refresh once expired.
 *  - Concurrent getAccessToken calls across an expiry boundary share ONE
 *    refresh request (single-flight) — the server must not see two rotations.
 *  - signOut revokes the refresh chain server-side (/api/auth/logout) and
 *    clears all local state.
 */

import {
  setSession,
  isSignedIn,
  getEmail,
  getAccessToken,
  signOut,
  __resetForTests,
  type TokenPair,
} from "../../src/api/authClient";

const mockFetch = jest.fn() as jest.Mock;
(globalThis as Record<string, unknown>).fetch = mockFetch;

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const PAIR: TokenPair = {
  accessToken: "access-1",
  refreshToken: "refresh-1",
  expiresIn: 900,
};

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
  __resetForTests();
});

describe("token store", () => {
  it("persists the token pair and email under obiter-auth", () => {
    setSession(PAIR, "user@example.com");

    expect(isSignedIn()).toBe(true);
    expect(getEmail()).toBe("user@example.com");

    const raw = localStorage.getItem("obiter-auth");
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw as string);
    expect(stored.accessToken).toBe("access-1");
    expect(stored.refreshToken).toBe("refresh-1");
    expect(stored.email).toBe("user@example.com");
    expect(typeof stored.expiresAt).toBe("number");
  });

  it("reports signed-out with no session", () => {
    expect(isSignedIn()).toBe(false);
    expect(getEmail()).toBeNull();
  });

  it("rehydrates from localStorage across a fresh module cache", () => {
    setSession(PAIR, "user@example.com");
    __resetForTests();
    expect(isSignedIn()).toBe(true);
    expect(getEmail()).toBe("user@example.com");
  });
});

describe("getAccessToken", () => {
  it("returns null when signed out", async () => {
    expect(await getAccessToken()).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns the current token while fresh, without refreshing", async () => {
    setSession(PAIR, "user@example.com");
    const token = await getAccessToken();
    expect(token).toBe("access-1");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("refreshes via /api/auth/refresh once the access token is expired", async () => {
    // expiresIn 0 -> already inside the skew window on the next tick.
    setSession({ accessToken: "old", refreshToken: "r-old", expiresIn: 0 }, "u@e.com");
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ accessToken: "new", refreshToken: "r-new", expiresIn: 900 })
    );

    const token = await getAccessToken();

    expect(token).toBe("new");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/auth/refresh");
    expect(JSON.parse((init as RequestInit).body as string).refreshToken).toBe("r-old");
    // The rotated refresh token is now stored.
    expect(JSON.parse(localStorage.getItem("obiter-auth") as string).refreshToken).toBe("r-new");
  });

  it("shares a single refresh across concurrent callers (single-flight)", async () => {
    setSession({ accessToken: "old", refreshToken: "r-old", expiresIn: 0 }, "u@e.com");
    let resolveRefresh: (r: Response) => void = () => undefined;
    mockFetch.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveRefresh = resolve;
      })
    );

    const p1 = getAccessToken();
    const p2 = getAccessToken();
    const p3 = getAccessToken();

    resolveRefresh(jsonResponse({ accessToken: "new", refreshToken: "r-new", expiresIn: 900 }));

    const [t1, t2, t3] = await Promise.all([p1, p2, p3]);
    expect(t1).toBe("new");
    expect(t2).toBe("new");
    expect(t3).toBe("new");
    // Only ONE refresh request despite three concurrent callers.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("signs out and returns null when refresh fails", async () => {
    setSession({ accessToken: "old", refreshToken: "r-old", expiresIn: 0 }, "u@e.com");
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "Invalid token." }, false, 401));

    const token = await getAccessToken();

    expect(token).toBeNull();
    expect(isSignedIn()).toBe(false);
    expect(localStorage.getItem("obiter-auth")).toBeNull();
  });
});

describe("signOut", () => {
  it("revokes the refresh chain server-side then clears local state", async () => {
    setSession(PAIR, "user@example.com");
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: "Signed out." }));

    await signOut();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/auth/logout");
    expect(JSON.parse((init as RequestInit).body as string).refreshToken).toBe("refresh-1");
    expect(isSignedIn()).toBe(false);
    expect(localStorage.getItem("obiter-auth")).toBeNull();
  });

  it("clears local state even when the logout request fails", async () => {
    setSession(PAIR, "user@example.com");
    mockFetch.mockRejectedValueOnce(new TypeError("network down"));

    await signOut();

    expect(isSignedIn()).toBe(false);
    expect(localStorage.getItem("obiter-auth")).toBeNull();
  });
});
