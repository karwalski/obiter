/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * fileTransfer.ts — the browser-side file helpers the task pane needs:
 * download a text file, copy text to the clipboard with a fallback for
 * webviews that lack the Clipboard API, and read an uploaded file with an
 * optional legacy encoding. Shared by the interchange dialogs, Recovery and
 * Settings (INTEROP-011).
 */

/** Triggers a download of `text` as `fileName`. */
export function downloadTextFile(fileName: string, text: string, mimeType = "text/plain"): void {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Copies text to the clipboard. Tries the Clipboard API, then the hidden
 * textarea fallback. Returns false when neither worked.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard API unavailable or refused in this webview — fall through.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } finally {
      document.body.removeChild(ta);
    }
    return ok;
  } catch {
    return false;
  }
}

/** Reads an uploaded file as text. `encoding` defaults to UTF-8. */
export function readFileAsText(file: Blob, encoding?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("File could not be read"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File could not be read"));
    reader.readAsText(file, encoding);
  });
}

/** Local date as YYYY-MM-DD (never the UTC date, which rolls over at night in AEST). */
export function todayStamp(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
