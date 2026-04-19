/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { FormattedRun } from "../../types/formattedRun";

export interface CitationPreviewProps {
  runs: FormattedRun[];
}

/**
 * Renders an array of FormattedRun objects as styled inline spans,
 * providing a live preview of how the citation will appear in a footnote.
 */
export default function CitationPreview({ runs }: CitationPreviewProps): JSX.Element {
  if (runs.length === 0) {
    return (
      <div className="citation-preview citation-preview--empty">
        <span className="citation-preview-placeholder">
          Citation preview will appear here as you fill in the fields.
        </span>
      </div>
    );
  }

  return (
    <div className="citation-preview">
      {runs.map((run, index) => {
        const style: React.CSSProperties = {};
        if (run.italic) {
          style.fontStyle = "italic";
        }
        if (run.bold) {
          style.fontWeight = "bold";
        }
        if (run.superscript) {
          style.verticalAlign = "super";
          style.fontSize = "0.75em";
        }
        if (run.smallCaps) {
          style.fontVariant = "small-caps";
        }
        if (run.font) {
          style.fontFamily = run.font;
        }
        if (run.size) {
          style.fontSize = `${run.size}pt`;
        }
        return (
          <span key={index} style={style}>
            {run.text}
          </span>
        );
      })}
    </div>
  );
}
