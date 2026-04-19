/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Represents a single run of formatted text within a citation.
 *
 * Each property maps directly to a Word.Font property. Omitted properties
 * inherit the content control's default formatting.
 */
export interface FormattedRun {
  text: string;
  italic?: boolean;
  bold?: boolean;
  smallCaps?: boolean;
  superscript?: boolean;
  font?: string;
  size?: number;
}
