/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import type { ReactNode } from "react";

export interface ParseFindingsProps {
  /** Problems to fix or check before inserting. */
  warnings: string[];
  /** Non-blocking notes from the AI parse-verification loop (LCT-010). */
  notes?: string[];
  /** Shown beneath the warnings, eg the manual-citation hint. */
  warningHint?: ReactNode;
}

/**
 * The warnings and notes from a citation parse, shared by the Paste Citation
 * panel and the Preview editor so the two stay identical.
 */
export default function ParseFindings({
  warnings,
  notes = [],
  warningHint,
}: ParseFindingsProps): JSX.Element | null {
  if (warnings.length === 0 && notes.length === 0) return null;
  return (
    <>
      {warnings.length > 0 && (
        <div className="citation-preview-warnings" role="status">
          {warnings.map((w, i) => (
            <div key={i} className="citation-preview-warning">
              {w}
            </div>
          ))}
          {warningHint}
        </div>
      )}
      {notes.length > 0 && (
        <ul className="ai-parse-notes">
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </>
  );
}
