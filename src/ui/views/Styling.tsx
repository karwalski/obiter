/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useCallback, useEffect, useRef, useState } from "react";
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

/** QUOTE-005 annotation options (Rule 1.5.7). */
const ANNOTATIONS = [
  "(emphasis added)",
  "(emphasis in original)",
  "(citations omitted)",
  "(footnotes omitted)",
  "(translation modified)",
];

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

  /* ── Annotation dropdown state ── */
  const [annotationOpen, setAnnotationOpen] = useState(false);
  const annotationRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (annotationRef.current && !annotationRef.current.contains(e.target as Node)) {
        setAnnotationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * QUOTE-001: Auto-Format Quotation (Rule 1.5.1)
   * If 3+ paragraphs, apply block quote style. Otherwise wrap in curly single quotes.
   */
  const handleFormatQuotation = useCallback(async () => {
    setApplying(true);
    try {
      setStatus(null);
      setError(null);
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("text");
        selection.paragraphs.load("items");
        await context.sync();

        const paraCount = selection.paragraphs.items?.length ?? 0;

        if (paraCount >= 3) {
          // Block quote: 10pt, indented, remove surrounding quotation marks
          for (const para of (selection.paragraphs.items ?? [])) {
            try {
              para.style = "AGLC4 Block Quote";
            } catch {
              para.font.size = 10;
              para.leftIndent = 36;
              para.lineSpacing = 12;
            }
          }
          // Remove leading/trailing quotation marks from first and last paragraphs
          const firstPara = selection.paragraphs.items[0];
          const lastPara = selection.paragraphs.items[paraCount - 1];
          firstPara.load("text");
          lastPara.load("text");
          await context.sync();

          const firstText = firstPara.text;
          const lastText = lastPara.text;
          const openQuotes = /^[\u2018\u201C'"]/;
          const closeQuotes = /[\u2019\u201D'"]$/;
          if (openQuotes.test(firstText)) {
            const range = firstPara.getRange("Start");
            range.load("text");
            await context.sync();
            const startRange = firstPara.getRange("Start").expandTo(
              firstPara.getRange("Start")
            );
            startRange.insertText(firstText.replace(openQuotes, ""), "Replace");
          }
          if (closeQuotes.test(lastText)) {
            lastPara.insertText(lastText.replace(closeQuotes, ""), "Replace");
          }
          await context.sync();
          setStatus("Applied block quote formatting (3+ line quotation).");
        } else {
          // Short quotation: wrap in curly single quotes
          const text = selection.text ?? "";
          // Remove existing straight or curly quotes at boundaries
          const stripped = text
            .replace(/^[\u2018\u201C'"]+/, "")
            .replace(/[\u2019\u201D'"]+$/, "");
          selection.insertText("\u2018" + stripped + "\u2019", "Replace");
          await context.sync();
          setStatus("Wrapped in single quotation marks (short quotation).");
        }
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to format quotation.");
    } finally {
      setApplying(false);
    }
  }, []);

  /**
   * QUOTE-002: Insert Ellipsis (Rule 1.5.3)
   * AGLC4 ellipsis is ` . . . ` (three dots with spaces).
   */
  const handleInsertEllipsis = useCallback(async () => {
    setApplying(true);
    try {
      setStatus(null);
      setError(null);
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.insertText(" . . . ", "Replace");
        await context.sync();
      });
      setStatus("Inserted AGLC4 ellipsis.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to insert ellipsis.");
    } finally {
      setApplying(false);
    }
  }, []);

  /**
   * QUOTE-003: Wrap in Square Brackets (Rule 1.5.4)
   * Wraps selected text in []. If no selection, inserts [] with cursor inside.
   */
  const handleEditorialBrackets = useCallback(async () => {
    setApplying(true);
    try {
      setStatus(null);
      setError(null);
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("text");
        await context.sync();

        const text = selection.text ?? "";
        if (text.length > 0) {
          selection.insertText("[" + text + "]", "Replace");
        } else {
          selection.insertText("[]", "Replace");
        }
        await context.sync();
      });
      setStatus("Wrapped in editorial brackets.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to insert brackets.");
    } finally {
      setApplying(false);
    }
  }, []);

  /**
   * QUOTE-004: Insert [sic] (Rule 1.5.5)
   * Brackets in roman, "sic" in italic.
   */
  const handleInsertSic = useCallback(async () => {
    setApplying(true);
    try {
      setStatus(null);
      setError(null);
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        // Insert as three separate runs for formatting control
        const bracket1 = selection.insertText("[", "End");
        bracket1.font.italic = false;
        const sicText = bracket1.insertText("sic", "After");
        sicText.font.italic = true;
        const bracket2 = sicText.insertText("]", "After");
        bracket2.font.italic = false;
        await context.sync();
      });
      setStatus("Inserted [sic].");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to insert [sic].");
    } finally {
      setApplying(false);
    }
  }, []);

  /**
   * QUOTE-005: Insert Annotation (Rule 1.5.7)
   * Inserts a parenthetical annotation in roman text.
   */
  const handleInsertAnnotation = useCallback(async (annotation: string) => {
    setApplying(true);
    setAnnotationOpen(false);
    try {
      setStatus(null);
      setError(null);
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        const inserted = selection.insertText(" " + annotation, "End");
        inserted.font.italic = false;
        await context.sync();
      });
      setStatus(`Inserted ${annotation}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to insert annotation.");
    } finally {
      setApplying(false);
    }
  }, []);

  /**
   * STYLE-001: Italicise + Emphasis Added (Rule 1.8.1)
   * Italicises the selected text and appends " (emphasis added)" in roman.
   */
  const handleAddEmphasis = useCallback(async () => {
    setApplying(true);
    try {
      setStatus(null);
      setError(null);
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("text");
        await context.sync();

        // Italicise the selected text
        selection.font.italic = true;

        // Insert " (emphasis added)" after the selection in roman
        const annotation = selection.insertText(" (emphasis added)", "After");
        annotation.font.italic = false;
        await context.sync();
      });
      setStatus("Applied emphasis and inserted annotation.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add emphasis.");
    } finally {
      setApplying(false);
    }
  }, []);

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

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Quotation Tools</legend>
        <p style={{ fontSize: 12, margin: "4px 0 8px" }}>
          Format quotations and insert editorial marks per AGLC4 Rules 1.5 and 1.8.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            className="bib-insert-btn"
            style={{ width: "100%" }}
            onClick={() => void handleFormatQuotation()}
            disabled={applying}
          >
            Format Quotation
          </button>
          <button
            className="bib-insert-btn"
            style={{ width: "100%" }}
            onClick={() => void handleAddEmphasis()}
            disabled={applying}
          >
            Add Emphasis
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="bib-insert-btn"
              style={{ flex: 1 }}
              onClick={() => void handleInsertEllipsis()}
              disabled={applying}
            >
              Insert Ellipsis
            </button>
            <button
              className="bib-insert-btn"
              style={{ flex: 1 }}
              onClick={() => void handleEditorialBrackets()}
              disabled={applying}
            >
              Editorial [Brackets]
            </button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="bib-insert-btn"
              style={{ flex: 1 }}
              onClick={() => void handleInsertSic()}
              disabled={applying}
            >
              Insert [sic]
            </button>
            <div ref={annotationRef} style={{ flex: 1, position: "relative" }}>
              <button
                className="bib-insert-btn"
                style={{ width: "100%" }}
                onClick={() => setAnnotationOpen((prev) => !prev)}
                disabled={applying}
              >
                Insert Annotation
              </button>
              {annotationOpen && (
                <div style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  right: 0,
                  background: "var(--colour-surface, #fff)",
                  border: "1px solid var(--colour-border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  zIndex: 10,
                  marginBottom: 4,
                }}>
                  {ANNOTATIONS.map((a) => (
                    <button
                      key={a}
                      className="library-btn"
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 10px",
                        fontSize: 12,
                        border: "none",
                        borderBottom: "1px solid var(--colour-border)",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                      onClick={() => void handleInsertAnnotation(a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
