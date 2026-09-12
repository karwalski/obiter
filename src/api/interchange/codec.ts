/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * codec.ts — the contract every interchange format implements, and the
 * registry the pipelines and the format detector consult.
 */

import type { InterchangeFormat, InterchangeIssue, InterchangeRecord } from "./model";

export interface ParseResult {
  records: InterchangeRecord[];
  issues: InterchangeIssue[];
}

export interface SerialiseOptions {
  /** Emit the AGLC-formatted citation as a note on each record. */
  includeFormatted?: boolean;
  lineEnding?: "\r\n" | "\n";
  /**
   * EndNote XML only: write the UTS AGLC4 reference-type names (default)
   * or EndNote's generic names.
   */
  endnoteStyle?: "uts-aglc4" | "generic";
}

export interface InterchangeCodec {
  readonly format: InterchangeFormat;
  /** Human label: "RIS", "EndNote XML", "BibTeX", "CSL-JSON". */
  readonly label: string;
  readonly extensions: readonly string[];
  readonly mimeType: string;
  readonly canExport: boolean;
  /** 0..1 confidence that `text` is this format. Cheap; looks at the head only. */
  sniff(text: string): number;
  /** Never throws: malformed records become issues. */
  parse(text: string): ParseResult;
  serialise(records: InterchangeRecord[], options?: SerialiseOptions): string;
}

const registry = new Map<InterchangeFormat, InterchangeCodec>();

/** Registers a codec. Called by each codec module on load. */
export function registerCodec(codec: InterchangeCodec): void {
  registry.set(codec.format, codec);
}

export function getCodec(format: InterchangeFormat): InterchangeCodec {
  const codec = registry.get(format);
  if (!codec) {
    throw new Error(`No interchange codec registered for "${format}"`);
  }
  return codec;
}

export function hasCodec(format: InterchangeFormat): boolean {
  return registry.has(format);
}

/** Codecs in registration order. */
export function listCodecs(): InterchangeCodec[] {
  return [...registry.values()];
}

/** Codecs that can write a file. */
export function listExportCodecs(): InterchangeCodec[] {
  return listCodecs().filter((c) => c.canExport);
}

/** Strips a UTF-8 byte-order mark and normalises line endings to "\n". */
export function normaliseText(text: string): string {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return withoutBom.replace(/\r\n?/g, "\n");
}
