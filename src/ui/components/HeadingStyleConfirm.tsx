/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState } from "react";
import { describeBuiltInHeadingChanges } from "../../word/aglc4HeadingStyles";

interface HeadingStyleConfirmProps {
  /** Other document changes the action makes, listed after the styles. */
  otherChanges: string[];
  /** Whether "restyle built-in headings" starts ticked. Off in court mode. */
  defaultFormatHeadings: boolean;
  /** Offer the built-in heading option at all (AGLC standards only). */
  offerHeadings?: boolean;
  /** Called with the user's heading choice when they confirm. */
  onConfirm: (formatBuiltInHeadings: boolean) => void;
  onCancel: () => void;
}

/**
 * COURT-101: shows which styles an explicit set-up action will change before
 * it runs, lets the user leave Word's built-in headings alone, and can be
 * cancelled. AGLC4 Rule 1.12.2 governs the heading formats listed.
 */
export default function HeadingStyleConfirm({
  otherChanges,
  defaultFormatHeadings,
  offerHeadings = true,
  onConfirm,
  onCancel,
}: HeadingStyleConfirmProps): JSX.Element {
  const [checked, setChecked] = useState(defaultFormatHeadings);
  const formatHeadings = offerHeadings && checked;
  return (
    <div
      role="group"
      aria-label="Confirm document set-up"
      style={{
        marginTop: 8,
        padding: 8,
        border: "1px solid var(--colour-border)",
        borderRadius: 4,
        fontSize: 11,
      }}
    >
      <p style={{ margin: "0 0 4px", fontWeight: 600 }}>Before you continue</p>
      <p style={{ margin: "0 0 4px" }}>
        Missing AGLC4 styles (AGLC4 Block Quote, Title, Author, Footnote Text and
        Bibliography Heading) are added. Existing styles with those names are not changed.
      </p>
      {offerHeadings && (
        <label style={{ display: "block", margin: "6px 0 2px" }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />{" "}
          Restyle Word&rsquo;s built-in Heading 1 to 5 (Rule 1.12.2)
        </label>
      )}
      {formatHeadings && (
        <ul style={{ margin: "2px 0 4px", paddingLeft: 18 }} aria-label="Heading styles that will change">
          {describeBuiltInHeadingChanges().map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {formatHeadings && (
        <p style={{ margin: "0 0 4px", color: "var(--colour-text-secondary)" }}>
          This changes the heading styles for the whole document, including any a
          court or firm template defines.
        </p>
      )}
      {otherChanges.length > 0 && (
        <>
          <p style={{ margin: "6px 0 2px" }}>Also changes:</p>
          <ul style={{ margin: "0 0 4px", paddingLeft: 18 }}>
            {otherChanges.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        <button className="library-btn library-btn--insert" onClick={() => onConfirm(formatHeadings)}>
          Apply
        </button>
        <button className="library-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Other changes made by applyAglc4Template, in plain words. */
export const TEMPLATE_OTHER_CHANGES: string[] = [
  "Body text font size (and font, if you chose one in Template Defaults)",
  "Proofing language, set to English (Australia)",
  "Page margins",
  "Line spacing of every paragraph, with no extra space before or after",
  "Title and author placeholders, if the document is empty",
];
