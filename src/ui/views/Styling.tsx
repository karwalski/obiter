/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useCallback, useEffect, useState } from "react";
import { applyHeadingLevel, findExistingHeadingListId, renumberAllHeadings } from "../../word/styles";
import { applyAglc4Styles } from "../../word/styles";
import { applyAglc4Template } from "../../word/template";
import { getSharedStore } from "../../store/singleton";
import type { CitationStandardId } from "../../engine/standards/types";
import { getStandardConfig } from "../../engine/standards";

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
  const [applying, setApplying] = useState(false);
  const [standardId, setStandardId] = useState<CitationStandardId>("aglc4");

  // Load the active standard and heading list ID on mount
  useEffect(() => {
    void (async () => {
      try {
        const store = await getSharedStore();
        setStandardId(store.getStandardId());

        // Restore persisted heading list ID
        const savedListId = store.getHeadingListId();
        if (savedListId !== undefined) {
          aglcHeadingListId = savedListId;
        } else {
          // Fallback: scan document for existing heading list
          await Word.run(async (context) => {
            const foundId = await findExistingHeadingListId(context);
            if (foundId !== undefined) {
              aglcHeadingListId = foundId;
              await store.setHeadingListId(foundId);
            }
          });
        }
      } catch {
        // Default to aglc4
      }
    })();
  }, []);

  const isAglc = standardId.startsWith("aglc");
  const standardLabel = getStandardConfig(standardId).standardLabel;

  const handleApplyHeading = useCallback(async (level: 1 | 2 | 3 | 4 | 5) => {
    setApplying(true);
    try {
      setStatus(null);
      setError(null);
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("paragraphs");
        await context.sync();

        const paraItems = selection.paragraphs.items ?? [];
        for (let i = 0; i < paraItems.length; i++) {
          await applyHeadingLevel(
            context,
            paraItems[i],
            level,
            i + 1,
          );
        }
        // Renumber all headings in the document with text prefixes
        await renumberAllHeadings(context);
      });
      setStatus(`Applied Level ${HEADINGS[level - 1].label.split(" ")[1]} heading.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to apply heading.");
    } finally {
      setApplying(false);
    }
  }, []);

  const handleBlockQuote = useCallback(async () => {
    setApplying(true);
    try {
      setStatus(null);
      setError(null);
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("paragraphs");
        await context.sync();

        for (const para of (selection.paragraphs.items ?? [])) {
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
      setError(err instanceof Error ? err.message : "Failed to apply block quote.");
    } finally {
      setApplying(false);
    }
  }, []);

  const handleSetupDocument = useCallback(async () => {
    setApplying(true);
    try {
      setStatus(null);
      setError(null);
      await Word.run(async (context) => {
        if (isAglc) {
          try { await applyAglc4Styles(context); } catch { /* may already exist */ }
        }
        await applyAglc4Template(context);
      });
      setStatus(isAglc
        ? "Document set up with AGLC4 styles and template."
        : "Document set up with template formatting.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set up document.");
    } finally {
      setApplying(false);
    }
  }, [isAglc]);

  return (
    <div>
      <h2>Styling</h2>

      <fieldset className="settings-section">
        <legend className="settings-section-title">Document Setup</legend>
        <p style={{ fontSize: 12, margin: "4px 0 8px" }}>
          {isAglc
            ? "Apply AGLC4 heading styles, template formatting, and document metadata."
            : "Apply template formatting and document metadata."}
        </p>
        <button
          className="bib-insert-btn"
          style={{ width: "100%" }}
          onClick={() => void handleSetupDocument()}
          disabled={applying}
        >
          {applying ? "Applying..." : isAglc ? "Set Up Document (Styles + Template)" : "Set Up Document (Template)"}
        </button>
      </fieldset>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Heading Levels</legend>
        {isAglc ? (
          <>
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
                  disabled={applying}
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
          </>
        ) : (
          <p style={{ fontSize: 12, margin: "4px 0 8px", color: "var(--colour-text-secondary)" }}>
            Heading styles for {standardLabel} follow the standard's conventions.
            Use Word's built-in Heading 1–5 styles directly from the Home tab.
          </p>
        )}
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
          disabled={applying}
        >
          {applying ? "Applying..." : "Apply Block Quote"}
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
