/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useCallback, useState } from "react";
import { applyHeadingLevel } from "../../word/styles";
import { applyAglc4Styles } from "../../word/styles";
import { applyAglc4Template } from "../../word/template";

/** Single shared list ID — prevents the dual-list bug. */
let aglcHeadingListId: number | undefined;

interface HeadingDef {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  numbering: string;
  description: string;
  previewStyle: React.CSSProperties;
}

const HEADINGS: HeadingDef[] = [
  {
    level: 1,
    label: "Level I",
    numbering: "I, II, III",
    description: "Small caps, centred",
    previewStyle: {
      fontVariant: "small-caps",
      textAlign: "center",
      fontWeight: 400,
      fontSize: 12,
    },
  },
  {
    level: 2,
    label: "Level II",
    numbering: "A, B, C",
    description: "Italic, centred",
    previewStyle: {
      fontStyle: "italic",
      textAlign: "center",
      fontWeight: 400,
      fontSize: 12,
    },
  },
  {
    level: 3,
    label: "Level III",
    numbering: "1, 2, 3",
    description: "Italic, left-aligned",
    previewStyle: {
      fontStyle: "italic",
      textAlign: "left",
      fontWeight: 400,
      fontSize: 12,
    },
  },
  {
    level: 4,
    label: "Level IV",
    numbering: "(a), (b), (c)",
    description: "Italic, left-aligned",
    previewStyle: {
      fontStyle: "italic",
      textAlign: "left",
      fontWeight: 400,
      fontSize: 12,
    },
  },
  {
    level: 5,
    label: "Level V",
    numbering: "(i), (ii), (iii)",
    description: "Italic, left-aligned",
    previewStyle: {
      fontStyle: "italic",
      textAlign: "left",
      fontWeight: 400,
      fontSize: 12,
    },
  },
];

const SAMPLE_TEXTS: Record<number, string> = {
  1: "Introduction",
  2: "Background",
  3: "The rule in Mabo",
  4: "First limb",
  5: "Procedural history",
};

export default function Styling(): JSX.Element {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApplyHeading = useCallback(async (level: 1 | 2 | 3 | 4 | 5) => {
    try {
      setStatus(null);
      setError(null);
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("paragraphs");
        await context.sync();

        for (let i = 0; i < selection.paragraphs.items.length; i++) {
          const para = selection.paragraphs.items[i];
          const list = await applyHeadingLevel(
            context,
            para,
            level,
            i + 1,
            aglcHeadingListId,
          );
          if (list && aglcHeadingListId === undefined) {
            aglcHeadingListId = list.id;
          }
        }
      });
      setStatus(`Applied Level ${HEADINGS[level - 1].label.split(" ")[1]} heading.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to apply heading");
    }
  }, []);

  const handleBlockQuote = useCallback(async () => {
    try {
      setStatus(null);
      setError(null);
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("paragraphs");
        await context.sync();

        for (const para of selection.paragraphs.items) {
          try {
            para.style = "AGLC4 Block Quote";
          } catch {
            para.font.size = 10;
            para.leftIndent = 36;
            para.lineSpacing = 12;
          }
        }
        await context.sync();
      });
      setStatus("Applied block quote formatting.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to apply block quote");
    }
  }, []);

  const handleSetupDocument = useCallback(async () => {
    try {
      setStatus(null);
      setError(null);
      await Word.run(async (context) => {
        try { await applyAglc4Styles(context); } catch { /* may already exist */ }
        await applyAglc4Template(context);
      });
      setStatus("Document set up with AGLC4 styles and template.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Setup failed");
    }
  }, []);

  return (
    <div>
      <h2>Styling</h2>

      <fieldset className="settings-section">
        <legend className="settings-section-title">Document Setup</legend>
        <p style={{ fontSize: 12, margin: "4px 0 8px" }}>
          Apply AGLC4 heading styles, template formatting, and document metadata.
        </p>
        <button
          className="bib-insert-btn"
          style={{ width: "100%" }}
          onClick={() => void handleSetupDocument()}
        >
          Set Up Document (Styles + Template)
        </button>
      </fieldset>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Heading Levels</legend>
        <p style={{ fontSize: 12, margin: "4px 0 8px" }}>
          Select text, then click a heading level to apply. Per AGLC4 Rule 1.12.2.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {HEADINGS.map((h) => (
            <button
              key={h.level}
              className="library-btn"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid var(--colour-border)",
                borderRadius: "var(--radius-md)",
              }}
              onClick={() => void handleApplyHeading(h.level)}
            >
              <span style={{
                flex: "0 0 auto",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--colour-accent)",
                width: 50,
              }}>
                {h.label}
              </span>
              <span style={{
                flex: 1,
                fontFamily: "'Times New Roman', Georgia, serif",
                ...h.previewStyle,
              }}>
                {h.numbering.split(",")[0].trim()} {SAMPLE_TEXTS[h.level]}
              </span>
              <span style={{
                flex: "0 0 auto",
                fontSize: 10,
                color: "var(--colour-text-secondary)",
                textAlign: "right",
                whiteSpace: "nowrap",
              }}>
                {h.numbering}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Block Quote</legend>
        <p style={{ fontSize: 12, margin: "4px 0 8px" }}>
          Format selected paragraphs as an indented block quotation (10pt, single-spaced, indented).
        </p>
        <button
          className="bib-insert-btn"
          style={{ width: "100%" }}
          onClick={() => void handleBlockQuote()}
        >
          Apply Block Quote
        </button>
      </fieldset>

      <div aria-live="polite" role="status" style={{ marginTop: 8 }}>
        {status && (
          <p style={{ fontSize: 12, color: "var(--colour-success)", margin: "8px 0 0" }}>
            {status}
          </p>
        )}
        {error && (
          <p style={{ fontSize: 12, color: "var(--colour-error)", margin: "8px 0 0" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
