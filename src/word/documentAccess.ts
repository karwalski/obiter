/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Read-only / protected document detection.
 *
 * Word rejects every write to a document the user cannot edit with
 * `RichApi.Error: NotAllowed`, whose whole stack sits inside word-win32.js —
 * it names nothing of ours, so it reaches the user as the bare word
 * "NotAllowed". A document is unwritable for several ordinary reasons:
 *
 *   - it opened in Protected View (downloaded, email attachment, internet zone)
 *   - it is marked as final, or opened read-only / "always open read-only"
 *   - it carries IRM / Information Rights Management restrictions
 *   - editing is restricted (Review > Restrict Editing)
 *   - the file is locked by another user, or checked out in SharePoint
 *
 * Reads keep working in all of those states, so the add-in must degrade to
 * read-only rather than fail: citations already in the document stay visible,
 * and only the writes are refused, with an explanation the user can act on.
 */

/** What the user is told when the document refuses a write. */
export const READ_ONLY_MESSAGE =
  "This document is read-only, so Obiter cannot save to it. " +
  "If it opened in Protected View, choose Enable Editing; otherwise check " +
  "whether it is marked as final, restricted, or open read-only, then reopen the task pane.";

/**
 * True when an Office.js rejection means "the document will not accept this
 * write". Word reports it as the `NotAllowed` code, but the code can sit on
 * the error or on its debugInfo depending on the host build, and some hosts
 * only put it in the message — so all three are checked.
 * @param err - the value thrown by an Office.js call
 */
export function isNotAllowedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    code?: unknown;
    message?: unknown;
    debugInfo?: { code?: unknown; message?: unknown };
  };
  const code = typeof e.code === "string" ? e.code : undefined;
  const debugCode = typeof e.debugInfo?.code === "string" ? e.debugInfo.code : undefined;
  if (code === "NotAllowed" || debugCode === "NotAllowed") return true;
  const message = typeof e.message === "string" ? e.message : "";
  return /\bNotAllowed\b/.test(message);
}

/**
 * Best-effort read of the host's own view of the document, used only to
 * enrich a message — never as the gate. `Office.context.document.mode` is a
 * snapshot and does not capture every restriction (IRM and co-authoring locks
 * can refuse a write while the mode still reads ReadWrite), so the
 * authoritative signal is a caught {@link isNotAllowedError}.
 *
 * @returns true when the host reports the document as read-only.
 */
export function hostReportsReadOnly(): boolean {
  try {
    return (
      typeof Office !== "undefined" &&
      Office.context?.document?.mode === Office.DocumentMode.ReadOnly
    );
  } catch {
    return false;
  }
}

/**
 * Thrown in place of the raw Office.js rejection when a write is refused
 * because the document cannot be edited. Carries a message the user can act
 * on, and keeps the original error for the diagnostic report.
 */
export class DocumentReadOnlyError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super(READ_ONLY_MESSAGE);
    this.name = "DocumentReadOnlyError";
    this.cause = cause;
  }
}

/**
 * True when a failure means the document refused the write — whether it is
 * still Word's raw rejection or has already been wrapped as a
 * {@link DocumentReadOnlyError} by a lower layer. Callers that sit above
 * persist() must use this rather than {@link isNotAllowedError}, which only
 * sees the raw form.
 * @param err - the value thrown by the failed write
 */
export function isWriteRefused(err: unknown): boolean {
  return err instanceof DocumentReadOnlyError || isNotAllowedError(err);
}

/**
 * Re-throws a document-write rejection as a {@link DocumentReadOnlyError} when
 * the document is what refused it, and otherwise re-throws unchanged. Lets a
 * write path add the explanation without swallowing unrelated failures.
 *
 * @param err - the value thrown by an Office.js call
 */
export function rethrowWriteFailure(err: unknown): never {
  if (isNotAllowedError(err)) {
    throw new DocumentReadOnlyError(err);
  }
  throw err;
}

/**
 * Message to show the user when an action that writes to the document fails.
 * A refused write is explained; anything else keeps its own message, so real
 * defects are still reported accurately.
 *
 * Use this at user-facing write paths (insert, refresh, bibliography, styling)
 * in place of a bare `err.message`, which renders a document-permission
 * problem as the single unexplained word "NotAllowed".
 *
 * @param err - the value thrown by the failed action
 * @param fallback - message for a failure that is not a refused write
 */
export function writeErrorMessage(err: unknown, fallback: string): string {
  if (isNotAllowedError(err) || err instanceof DocumentReadOnlyError) {
    return READ_ONLY_MESSAGE;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
