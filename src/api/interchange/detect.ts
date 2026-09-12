/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * detect.ts — works out which interchange format a pasted or uploaded text
 * is in, so the Import dialog can label it ("Detected: RIS · 12 records")
 * and the pipeline can pick a codec without asking.
 */

import { listCodecs, normaliseText } from "./codec";
import type { InterchangeFormat } from "./model";

export interface DetectionHints {
  /** Original file name; the extension adds confidence. */
  fileName?: string;
  /** A user-chosen format overrides sniffing. */
  formatHint?: InterchangeFormat;
}

export interface DetectionCandidate {
  format: InterchangeFormat;
  confidence: number;
}

export interface DetectionResult {
  /** null when nothing reached the confidence threshold. */
  format: InterchangeFormat | null;
  confidence: number;
  candidates: DetectionCandidate[];
  /** Cheap record count for the detected format (0 when unknown). */
  count: number;
}

/** Below this the caller must ask the user for the format. */
export const DETECTION_THRESHOLD = 0.5;

const EXTENSION_BONUS = 0.3;

/** How many characters the sniffers look at. */
export const SNIFF_WINDOW = 4096;

function extensionOf(fileName: string | undefined): string | null {
  if (!fileName) return null;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csl.json")) return ".json";
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot) : null;
}

/**
 * Counts records cheaply without a full parse. Used for the detection
 * label; the preview step parses properly.
 */
export function countRecords(text: string, format: InterchangeFormat): number {
  const body = normaliseText(text);
  switch (format) {
    case "ris":
      return (body.match(/^TY {1,2}- /gim) ?? []).length;
    case "bibtex":
      return (body.match(/^\s*@(?!comment|string|preamble)[a-z]+\s*[{(]/gim) ?? []).length;
    case "endnote-xml":
      return (body.match(/<record\b/gi) ?? []).length;
    case "word-sources-xml":
      return (body.match(/<b:Source\b/g) ?? []).length;
    case "csl-json": {
      try {
        const parsed: unknown = JSON.parse(body);
        if (Array.isArray(parsed)) return parsed.length;
        return parsed && typeof parsed === "object" ? 1 : 0;
      } catch {
        return 0;
      }
    }
    default:
      return 0;
  }
}

/**
 * Detects the format of `text`.
 *
 * A hint wins outright. Otherwise every registered codec sniffs the head of
 * the text; a matching file extension adds a bonus; the best candidate wins
 * when it reaches the threshold. Ties go to the extension.
 */
export function detectFormat(text: string, hints: DetectionHints = {}): DetectionResult {
  if (hints.formatHint) {
    return {
      format: hints.formatHint,
      confidence: 1,
      candidates: [{ format: hints.formatHint, confidence: 1 }],
      count: countRecords(text, hints.formatHint),
    };
  }

  const head = normaliseText(text).slice(0, SNIFF_WINDOW);
  const ext = extensionOf(hints.fileName);

  const candidates: DetectionCandidate[] = listCodecs()
    .map((codec) => {
      let confidence = codec.sniff(head);
      if (ext && codec.extensions.includes(ext)) {
        confidence = Math.min(1, confidence + EXTENSION_BONUS);
      }
      return { format: codec.format, confidence };
    })
    .filter((c) => c.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  const best = candidates[0];
  if (!best || best.confidence < DETECTION_THRESHOLD) {
    return { format: null, confidence: best?.confidence ?? 0, candidates, count: 0 };
  }
  return {
    format: best.format,
    confidence: best.confidence,
    candidates,
    count: countRecords(text, best.format),
  };
}
