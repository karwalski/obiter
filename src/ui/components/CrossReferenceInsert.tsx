/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * RESEARCH-002: Cross-Reference Insert component (Rule 1.4.2).
 *
 * Allows the user to insert an "above n X" or "below n X" cross-reference
 * into the document. The user enters a footnote number and selects the
 * direction (above or below), then inserts the reference as plain text.
 */

import { useState, useCallback } from "react";

export interface CrossReferenceInsertProps {
  /** Called when the user confirms the cross-reference insertion. */
  onInsert: (text: string) => void;
}

export default function CrossReferenceInsert({
  onInsert,
}: CrossReferenceInsertProps): JSX.Element {
  const [footnoteNumber, setFootnoteNumber] = useState<string>("");
  const [direction, setDirection] = useState<"above" | "below">("above");

  const handleInsert = useCallback(() => {
    const num = parseInt(footnoteNumber, 10);
    if (isNaN(num) || num < 1) return;

    const text = `${direction} n ${num}`;
    onInsert(text);
  }, [footnoteNumber, direction, onInsert]);

  const isValid = (() => {
    const num = parseInt(footnoteNumber, 10);
    return !isNaN(num) && num >= 1;
  })();

  return (
    <div className="cross-reference-insert">
      <h4>Cross-reference (Rule 1.4.2)</h4>

      <div className="cross-reference-insert-fields">
        <label
          className="cross-reference-insert-label"
          htmlFor="cross-ref-footnote"
        >
          Footnote number
        </label>
        <input
          id="cross-ref-footnote"
          className="cross-reference-insert-input"
          type="number"
          min="1"
          step="1"
          value={footnoteNumber}
          onChange={(e) => setFootnoteNumber(e.target.value)}
          placeholder="e.g. 3"
        />

        <fieldset className="cross-reference-insert-direction">
          <legend className="cross-reference-insert-legend">Direction</legend>
          <label className="cross-reference-insert-radio">
            <input
              type="radio"
              name="cross-ref-direction"
              value="above"
              checked={direction === "above"}
              onChange={() => setDirection("above")}
            />
            Above (earlier footnote)
          </label>
          <label className="cross-reference-insert-radio">
            <input
              type="radio"
              name="cross-ref-direction"
              value="below"
              checked={direction === "below"}
              onChange={() => setDirection("below")}
            />
            Below (later footnote)
          </label>
        </fieldset>
      </div>

      {isValid && (
        <div className="cross-reference-insert-preview">
          {direction} n {parseInt(footnoteNumber, 10)}
        </div>
      )}

      <button
        className="cross-reference-insert-btn"
        onClick={handleInsert}
        disabled={!isValid}
      >
        Insert cross-reference
      </button>
    </div>
  );
}
