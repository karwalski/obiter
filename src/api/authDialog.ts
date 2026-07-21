/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ACCT-005 — Office Dialog auth flow (pane side).
 *
 * Turnstile, password managers, and the MFA UI work poorly inside the
 * sandboxed task-pane iframe, so the interactive auth journey runs in a real
 * Office Dialog window pointed at obiter.com.au/account/auth.html. The dialog
 * page performs login/register/MFA and posts the resulting token pair back via
 * `Office.context.ui.messageParent(JSON.stringify(tokens))`; this module
 * receives it, stores it via authClient, and closes the dialog.
 *
 * The Dialog API is gated behind requirement set DialogApi 1.1; when it is not
 * supported we surface a graceful message instead of failing silently.
 */

import { WEBSITE_URL } from "../constants";
import { setSession, type TokenPair } from "./authClient";

/** Which auth screen the dialog opens on. */
export type AuthMode = "login" | "register";

/** Outcome of an Office Dialog auth attempt. */
export type AuthDialogResult =
  | { status: "success"; email: string }
  | { status: "cancelled" }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string };

/** Shape the dialog page messages back on a successful auth. */
interface DialogAuthMessage {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  email: string;
}

/** True when the Office Dialog API (set 1.1) is available in this host. */
export function isDialogAuthSupported(): boolean {
  try {
    return (
      typeof Office !== "undefined" &&
      Office.context?.requirements?.isSetSupported("DialogApi", "1.1") === true
    );
  } catch {
    return false;
  }
}

function parseDialogMessage(raw: string): DialogAuthMessage | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DialogAuthMessage>;
    if (
      typeof parsed.accessToken === "string" &&
      typeof parsed.refreshToken === "string" &&
      typeof parsed.expiresIn === "number" &&
      typeof parsed.email === "string"
    ) {
      return parsed as DialogAuthMessage;
    }
  } catch {
    /* not our message */
  }
  return null;
}

/**
 * Open the auth dialog and resolve once the user finishes, cancels, or the
 * host cannot show a dialog. On success the token pair is already stored via
 * authClient.setSession() before this resolves.
 */
export function openAuthDialog(mode: AuthMode): Promise<AuthDialogResult> {
  return new Promise<AuthDialogResult>((resolve) => {
    if (!isDialogAuthSupported()) {
      resolve({
        status: "unavailable",
        message:
          "Signing in requires a newer version of Word. Please update Word, or visit obiter.com.au to manage your account.",
      });
      return;
    }

    const url = `${WEBSITE_URL}/account/auth.html?mode=${mode}`;
    let settled = false;

    Office.context.ui.displayDialogAsync(
      url,
      { height: 60, width: 30, promptBeforeOpen: false },
      (asyncResult) => {
        if (asyncResult.status !== Office.AsyncResultStatus.Succeeded) {
          resolve({
            status: "error",
            message:
              asyncResult.error?.message ?? "Could not open the sign-in window. Please try again.",
          });
          return;
        }

        const dialog = asyncResult.value;

        const finish = (result: AuthDialogResult): void => {
          if (settled) return;
          settled = true;
          try {
            dialog.close();
          } catch {
            /* already closed */
          }
          resolve(result);
        };

        dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
          // The message arg carries a `message` string on success.
          const message = (arg as { message?: string }).message ?? "";
          const tokens = parseDialogMessage(message);
          if (tokens) {
            const pair: TokenPair = {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresIn: tokens.expiresIn,
            };
            setSession(pair, tokens.email);
            finish({ status: "success", email: tokens.email });
          } else {
            finish({
              status: "error",
              message: "The sign-in window returned an unexpected response.",
            });
          }
        });

        dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
          // 12006 = dialog closed by the user (X). Other codes are load errors.
          const code = (arg as { error?: number }).error;
          if (code === 12006) {
            finish({ status: "cancelled" });
          } else {
            finish({
              status: "error",
              message: "The sign-in window closed unexpectedly. Please try again.",
            });
          }
        });
      }
    );
  });
}
