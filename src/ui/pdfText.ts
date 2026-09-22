/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * pdfText.ts — ENP-011: reads the text layer of a PDF the user chose so a
 * passage can be selected for the Quote panel. Everything happens in the
 * browser: pdf.js is bundled with the add-in (loaded on first use) and its
 * worker is emitted by webpack as a same-origin asset, so the strict CSP
 * (`script-src 'self'`, `worker-src 'self'`, no `'unsafe-eval'`) is
 * satisfied and the document never leaves the machine.
 */

/** A failure the user can act on; the message says what happened and what to do. */
export class PdfTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfTextError";
  }
}

export const PDF_PASSWORD_MESSAGE =
  "This PDF is password protected. Remove the password and try again.";
export const PDF_NO_TEXT_MESSAGE =
  "No text layer in this PDF. It may be a scanned image; paste the passage instead.";
export const PDF_INVALID_MESSAGE = "This file could not be read as a PDF.";

/** Fewer non-space characters than this across the whole document counts as no text layer. */
const MIN_TEXT_CHARS = 20;

export interface PdfPagesResult {
  /** Plain text of each page, in page order; paragraphs separated by a single newline. */
  pages: string[];
  pageCount: number;
}

/** The subset of a pdf.js text item the joiner needs (mirrors `TextItem`). */
export interface PdfTextItemLike {
  str: string;
  hasEOL?: boolean;
  /** pdf.js transform matrix; [4] is x, [5] is y (PDF user space, y grows upward). */
  transform?: number[];
  width?: number;
  height?: number;
}

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.min.mjs");
type PdfDocument = import("pdfjs-dist/legacy/build/pdf.min.mjs").PdfDocumentProxy;

let pdfjsPromise: Promise<PdfJsModule> | null = null;

/**
 * Loads pdf.js on first use (a separate webpack chunk) and points it at the
 * worker asset webpack emitted on the app origin. A failed load is not
 * cached so a later attempt can retry.
 */
function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const [pdfjs, worker] = await Promise.all([
        import("pdfjs-dist/legacy/build/pdf.min.mjs"),
        import("pdfjs-dist/legacy/build/pdf.worker.min.mjs"),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    })();
    pdfjsPromise.catch(() => {
      pdfjsPromise = null;
    });
  }
  return pdfjsPromise;
}

function isTextItem(item: unknown): item is PdfTextItemLike {
  return (
    typeof item === "object" && item !== null && typeof (item as { str?: unknown }).str === "string"
  );
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** `[42]` (or `42.`) opening a line marks a judgment paragraph, so it starts a new paragraph. */
const PARAGRAPH_MARKER_RE = /^\s*(\[\d{1,4}\]|\d{1,4}\.)\s/;

/**
 * Joins the text items of one page into plain text.
 *
 * Items on the same baseline are joined with a space when there is a visible
 * horizontal gap between them (kerned fragments of one word stay joined). A
 * new baseline (a y change or `hasEOL`) ends a visual line; visual lines are
 * joined with a space, and a line becomes a paragraph break when the vertical
 * gap is clearly larger than the page's usual line pitch or the next line
 * opens with a paragraph marker. Hyphenated line ends are rejoined.
 */
export function joinPageText(items: readonly unknown[]): string {
  const textItems = items.filter(isTextItem).filter((it) => it.str.length > 0);
  if (textItems.length === 0) return "";

  const yOf = (it: PdfTextItemLike): number | null =>
    it.transform && it.transform.length >= 6 ? it.transform[5] : null;
  const xOf = (it: PdfTextItemLike): number | null =>
    it.transform && it.transform.length >= 6 ? it.transform[4] : null;

  // Usual line pitch: the median baseline step on the page, capped by the
  // font height so a page of few lines (where most steps are paragraph
  // gaps) still keeps a sensible pitch.
  const steps: number[] = [];
  let prevY: number | null = null;
  for (const it of textItems) {
    const y = yOf(it);
    if (y !== null && prevY !== null && Math.abs(y - prevY) > 0.5) steps.push(Math.abs(y - prevY));
    if (y !== null) prevY = y;
  }
  const heights = textItems.map((it) => it.height ?? 0).filter((h) => h > 0);
  const fontHeight = median(heights);
  const stepPitch = median(steps);
  const pitch =
    stepPitch > 0 && fontHeight > 0
      ? Math.min(stepPitch, fontHeight * 1.5)
      : stepPitch || fontHeight * 1.2 || 12;
  const paragraphGap = Math.max(pitch * 1.35, fontHeight * 1.5);

  const paragraphs: string[] = [];
  let line = "";
  let paragraph = "";
  let last: PdfTextItemLike | null = null;
  let lastY: number | null = null;
  let lineBroken = false;
  let breakGap = 0;

  const flushLine = (): void => {
    const text = line.replace(/\s+/g, " ").trim();
    line = "";
    if (text.length === 0) return;
    if (paragraph.length === 0) {
      paragraph = text;
    } else if (/[A-Za-z]-$/.test(paragraph)) {
      paragraph = paragraph.slice(0, -1) + text;
    } else {
      paragraph = `${paragraph} ${text}`;
    }
  };
  const flushParagraph = (): void => {
    flushLine();
    if (paragraph.length > 0) paragraphs.push(paragraph);
    paragraph = "";
  };

  for (const it of textItems) {
    const y = yOf(it);
    const newBaseline = y !== null && lastY !== null && Math.abs(y - lastY) > 0.5;
    if (last !== null && (newBaseline || lineBroken)) {
      const gap = newBaseline && y !== null && lastY !== null ? Math.abs(y - lastY) : breakGap;
      if (gap > paragraphGap || PARAGRAPH_MARKER_RE.test(it.str)) flushParagraph();
      else flushLine();
    } else if (last !== null) {
      const lastX = xOf(last);
      const x = xOf(it);
      const endsWithSpace = /\s$/.test(line) || /^\s/.test(it.str);
      if (!endsWithSpace) {
        if (lastX !== null && x !== null && last.width !== undefined && last.width > 0) {
          const gap = x - (lastX + last.width);
          const fontSize = last.height && last.height > 0 ? last.height : pitch;
          if (gap > fontSize * 0.12) line += " ";
        } else {
          line += " ";
        }
      }
    }
    line += it.str;
    last = it;
    if (y !== null) lastY = y;
    lineBroken = it.hasEOL === true;
    breakGap = 0;
  }
  flushParagraph();
  return paragraphs.join("\n");
}

function toPdfTextError(err: unknown): PdfTextError {
  if (err instanceof PdfTextError) return err;
  const name =
    typeof err === "object" && err !== null ? (err as { name?: unknown }).name : undefined;
  if (name === "PasswordException") return new PdfTextError(PDF_PASSWORD_MESSAGE);
  return new PdfTextError(PDF_INVALID_MESSAGE);
}

/**
 * Extracts the text of every page of a PDF. `onProgress(page, total)` is
 * called before each page is read. Throws `PdfTextError` with a message the
 * panel can show directly. The buffer is handed to pdf.js and released with
 * the document; nothing is kept beyond the returned strings.
 */
export async function extractPdfPages(
  data: ArrayBuffer,
  onProgress?: (page: number, total: number) => void
): Promise<PdfPagesResult> {
  const pdfjs = await loadPdfJs();
  let doc: PdfDocument;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(data),
      isEvalSupported: false,
      useWorkerFetch: false,
      disableAutoFetch: true,
    }).promise;
  } catch (err: unknown) {
    throw toPdfTextError(err);
  }
  try {
    const pageCount = doc.numPages;
    const pages: string[] = [];
    let textChars = 0;
    for (let n = 1; n <= pageCount; n++) {
      onProgress?.(n, pageCount);
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const text = joinPageText(content.items);
      textChars += text.replace(/\s+/g, "").length;
      pages.push(text);
      page.cleanup();
    }
    if (textChars < MIN_TEXT_CHARS) throw new PdfTextError(PDF_NO_TEXT_MESSAGE);
    return { pages, pageCount };
  } catch (err: unknown) {
    throw toPdfTextError(err);
  } finally {
    try {
      await doc.destroy();
    } catch {
      // The worker is already gone; nothing to release.
    }
  }
}

/** The message to show for a failure from `extractPdfPages` or the file read before it. */
export function describePdfError(err: unknown): string {
  return err instanceof PdfTextError ? err.message : PDF_INVALID_MESSAGE;
}
