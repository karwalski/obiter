/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { CitationStore } from "../../store";
import { getSharedStore } from "../../store/singleton";
import { getDevicePref } from "../../store/devicePreferences";
import type { Citation, Pinpoint } from "../../types/citation";
import type { FormattedRun } from "../../types/formattedRun";
import { formatCitation, getFormattedPreview } from "../../engine/engine";
import type { CitationContext } from "../../engine/engine";
import type { CitationConfig, CitationStandardId } from "../../engine/standards/types";
import { getStandardConfig, resolveDocumentConfig } from "../../engine/standards";
import { detectPinpointsInPassage, bracketParagraphValue } from "../../engine/quotations/pinpoint";
import { applyQuotationToText } from "../../engine/quotations/format";
import type { QuotationMode } from "../../engine/quotations/format";
import {
  buildOccurrenceTitle,
  getAllCitationFootnotes,
  insertCitationFootnote,
} from "../../word/footnoteManager";
import type { CitationFootnoteEntry } from "../../word/footnoteManager";
import { insertPlainParagraph, insertQuotation } from "../../word/quotationInserter";
import { writeErrorMessage } from "../../word/documentAccess";
import { loadLlmConfig } from "../../llm/config";
import {
  MAX_TEXT_CHARS,
  askAboutPassage,
  describeLlmError,
  describeSend,
  summarisePassage,
} from "../../llm/summariseJudgment";
import { useCitationContext } from "../context/CitationContext";
import { copyTextToClipboard, readFileAsArrayBuffer } from "../fileTransfer";
import { describePdfError, extractPdfPages } from "../pdfText";
import { getCitationLabel, getSourceTypeBadge } from "./CitationLibrary";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** The pinpoint types offered by the panel (Rule 1.1.6: pages and paragraphs; sections for legislation). */
type QuotePinpointType = "page" | "paragraph" | "section";

const PINPOINT_TYPE_OPTIONS: { value: QuotePinpointType; label: string }[] = [
  { value: "paragraph", label: "Paragraph" },
  { value: "page", label: "Page" },
  { value: "section", label: "Section" },
];

/** Most matches listed under the source search box. */
const MAX_MATCHES = 8;

/** ENP-011: largest PDF the panel will read (whole file is held in memory while parsing). */
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const PDF_TOO_LARGE_MESSAGE =
  "This PDF is larger than 25 MB. Choose a smaller file or paste the passage.";

/** A PDF loaded into the panel (ENP-011); only the page texts are retained. */
interface LoadedPdf {
  name: string;
  pages: string[];
}

/**
 * The printed page number for a PDF page: the PDF's 1-based page index plus
 * the user's offset (front matter, a report's own numbering). Never below 1.
 */
export function printedPageNumber(pdfPage: number, offset: string): number {
  const parsed = Number.parseInt(offset.trim(), 10);
  const delta = Number.isFinite(parsed) ? parsed : 0;
  return Math.max(1, pdfPage + delta);
}

/**
 * ENP-012: the text the AI section would send — the ticked PDF pages joined
 * with a blank line when a PDF is loaded, otherwise the passage box. Nothing
 * else is ever included.
 */
export function aiScopeText(passage: string, pdf: LoadedPdf | null, ticked: boolean[]): string {
  if (!pdf) return passage;
  return pdf.pages
    .filter((_page, i) => ticked[i] === true)
    .map((page) => page.trim())
    .filter((page) => page.length > 0)
    .join("\n\n");
}

/** ENP-012: button label naming the size of the payload and its destination. */
export function sendLabel(action: string, words: number, chunks: number, provider: string): string {
  const parts = chunks > 1 ? ` in ${chunks} parts` : "";
  return `${action}: send ${words.toLocaleString("en-AU")} words to ${provider}${parts}`;
}

/** Route state carried from the Styling view or a library card link. */
interface QuoteRouteState {
  citationId?: string;
}

function asString(val: unknown): string {
  return typeof val === "string" ? val : "";
}

/** Paragraph pinpoints suit judgments; everything else defaults to a page. */
export function defaultPinpointType(sourceType: string): QuotePinpointType {
  return sourceType.startsWith("case.") ? "paragraph" : "page";
}

/**
 * AGLC4 Rule 1.7.1 (quotations must carry a pinpoint): approximated by the
 * source-type families whose citations always take a pinpoint when a
 * passage is quoted — cases, legislation, books, journal articles and
 * reports.
 */
export function requiresPinpoint(sourceType: string): boolean {
  return (
    sourceType.startsWith("case.") ||
    sourceType.startsWith("legislation.") ||
    sourceType.startsWith("book") ||
    sourceType.startsWith("journal.") ||
    sourceType.startsWith("report")
  );
}

/**
 * Builds the engine `Pinpoint` for the typed value. Paragraph values carry
 * their square brackets in the value (Rule 1.1.6, as the formatters expect);
 * spans keep the en dash (Rule 1.1.7).
 */
export function toPinpoint(type: QuotePinpointType, rawValue: string): Pinpoint | undefined {
  const value = rawValue.trim().replace(/\s*-\s*/g, "–");
  if (value.length === 0) return undefined;
  if (type === "paragraph") return { type, value: bracketParagraphValue(value) };
  return { type, value };
}

/** True when the last run already ends in closing punctuation. */
function endsWithFullStop(runs: FormattedRun[]): boolean {
  const text = runs
    .map((run) => run.text)
    .join("")
    .trimEnd();
  return /[.?!]$/.test(text);
}

/**
 * Formatted preview for the source list, rendered with the document config
 * (STD-022) so the picker shows the same OSCOLA, NZLSG or court-mode text
 * the footnote will carry; an incomplete citation falls back to its label.
 */
function safePreview(citation: Citation, config: CitationConfig): FormattedRun[] {
  try {
    return getFormattedPreview(citation, config);
  } catch {
    return [{ text: getCitationLabel(citation) }];
  }
}

/**
 * Same simple filter as the library search — label, short title, title and
 * parties — plus the rendered citation text, so authors held in structured
 * fields (an `authors` array) are searchable by name.
 */
function matchesSearch(citation: Citation, term: string, config: CitationConfig): boolean {
  const d = citation.data;
  const haystack = [
    getCitationLabel(citation),
    citation.shortTitle ?? "",
    asString(d.title),
    asString(d.author),
    asString(d.applicant) || asString(d.plaintiff) || asString(d.partyA) || asString(d.party1),
    asString(d.respondent) || asString(d.defendant) || asString(d.partyB) || asString(d.party2),
    safePreview(citation, config)
      .map((run) => run.text)
      .join(""),
  ];
  return haystack.some((s) => s.toLowerCase().includes(term));
}

interface FootnoteBuild {
  runs: FormattedRun[];
  isFirst: boolean;
  lastFootnoteNumber: number;
}

/**
 * Builds the footnote runs the way the library's "Insert as" action does in
 * "auto" mode: a full citation for the first occurrence, otherwise the
 * resolver's short form or ibid against the preceding footnote. The
 * quotation's pinpoint is passed as the occurrence pinpoint in both cases
 * (Rule 1.7.1); the engine applies it to a first citation as it does to the
 * short forms (Rule 1.1.6). The runs carry no closing full stop — the
 * refresher adds it inside the footnote (Rule 1.1.4), as for every insert.
 */
function buildFootnoteRuns(
  citation: Citation,
  existing: CitationFootnoteEntry[],
  pinpoint: Pinpoint | undefined,
  courtConfig: CitationConfig
): FootnoteBuild {
  const firstFn = existing.find((e) => e.citationId === citation.id);
  const lastFootnoteNumber =
    existing.length > 0 ? Math.max(...existing.map((e) => e.footnoteIndex)) : 0;
  const precedingCitations = existing.filter((e) => e.footnoteIndex === lastFootnoteNumber);
  const isFirst = !firstFn;
  const isSameAsPreceding =
    precedingCitations.length === 1 && precedingCitations[0].citationId === citation.id;

  const ctx: CitationContext = {
    footnoteNumber: lastFootnoteNumber + 1,
    isFirstCitation: isFirst,
    isSameAsPreceding: !isFirst && isSameAsPreceding,
    precedingFootnoteCitationCount: precedingCitations.length,
    currentPinpoint: pinpoint,
    firstFootnoteNumber: firstFn?.footnoteIndex ?? citation.firstFootnoteNumber ?? 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };
  return { runs: formatCitation(citation, ctx, courtConfig), isFirst, lastFootnoteNumber };
}

function FormattedRuns({ runs }: { runs: FormattedRun[] }): JSX.Element {
  return (
    <>
      {runs.map((run, i) => {
        const style: React.CSSProperties = {};
        if (run.italic) style.fontStyle = "italic";
        if (run.bold) style.fontWeight = "bold";
        if (run.smallCaps) style.fontVariant = "small-caps";
        if (run.superscript) {
          style.verticalAlign = "super";
          style.fontSize = "0.75em";
        }
        return (
          <span key={i} style={style}>
            {run.text}
          </span>
        );
      })}
    </>
  );
}

// ─── View ───────────────────────────────────────────────────────────────────

/**
 * ENP-010: turns a pasted passage into a formatted quotation with its
 * citation footnote and pinpoint.
 *
 * - Rule 1.5.1: four or more full lines become an indented block quotation
 *   without quotation marks; shorter passages are set inline in single
 *   quotation marks.
 * - Rule 1.7.1: the footnote carries the pinpoint of the quoted passage;
 *   paragraph numbers pasted with the passage ("[42]") are detected, removed
 *   from the quotation and offered as the pinpoint (Rule 1.1.6, paragraphs in
 *   square brackets).
 * - Rule 1.1.3: the footnote reference is placed after the quotation
 *   (after its closing punctuation or quotation mark).
 */
export default function Quote(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerRefresh, refreshCounter } = useCitationContext();
  const routeState = (location.state ?? {}) as QuoteRouteState;

  const [store, setStore] = useState<CitationStore | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [existingFootnotes, setExistingFootnotes] = useState<CitationFootnoteEntry[]>([]);
  const [standardId, setStandardId] = useState<CitationStandardId>("aglc4");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(routeState.citationId ?? null);
  const [passage, setPassage] = useState("");
  const [pinpointType, setPinpointType] = useState<QuotePinpointType>("paragraph");
  const [pinpointValue, setPinpointValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inserting, setInserting] = useState(false);

  // ENP-011: a PDF loaded into the panel (page texts only), the page shown,
  // the printed-page offset and the reading progress or failure.
  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [pdfPageIndex, setPdfPageIndex] = useState(0);
  const [pdfOffset, setPdfOffset] = useState("0");
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pdfTextRef = useRef<HTMLTextAreaElement>(null);
  const mountedRef = useRef(true);

  // ENP-012: summarise or ask about the loaded text with the user's own key.
  // The config is read once per mount; the section is hidden when no provider
  // is enabled. `aiPages[i]` is whether PDF page i is included in the send.
  const llmConfig = useMemo(() => loadLlmConfig(), []);
  const aiEnabled = llmConfig !== null && llmConfig.enabled === true;
  const [aiPages, setAiPages] = useState<boolean[]>([]);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiBusy, setAiBusy] = useState<"summarise" | "ask" | null>(null);
  const [aiProgress, setAiProgress] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load the library and the current footnote map.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const shared = await getSharedStore();
        if (cancelled) return;
        setStore(shared);
        setCitations(shared.getAll());
        setStandardId(shared.getStandardId());
        try {
          const entries = await getAllCitationFootnotes();
          if (!cancelled) setExistingFootnotes(entries);
        } catch {
          // Footnote scan unavailable — preview assumes a first occurrence.
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load citations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshCounter]);

  const selected = useMemo(
    () => citations.find((c) => c.id === selectedId) ?? null,
    [citations, selectedId]
  );

  // Reset the pinpoint type to the source's default whenever the source changes.
  const selectedSourceType = selected?.sourceType;
  useEffect(() => {
    if (selectedSourceType) setPinpointType(defaultPinpointType(selectedSourceType));
  }, [selectedId, selectedSourceType]);

  // STD-013: the document config (writing mode and court toggles; device
  // pref is the legacy fallback), the academic profile until the store loads.
  const courtConfig = useMemo(
    () =>
      store
        ? resolveDocumentConfig(store, getDevicePref("courtToggles") as Record<string, string> | undefined)
        : getStandardConfig(standardId),
    [store, standardId]
  );

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = term ? citations.filter((c) => matchesSearch(c, term, courtConfig)) : citations;
    const shown = list.slice(0, MAX_MATCHES);
    // Keep the chosen source visible even when the search no longer matches it.
    if (selected && !shown.some((c) => c.id === selected.id)) shown.unshift(selected);
    return shown;
  }, [citations, search, selected, courtConfig]);

  const detection = useMemo(() => detectPinpointsInPassage(passage), [passage]);

  const handlePassageChange = useCallback(
    (value: string) => {
      setPassage(value);
      setStatus(null);
      const found = detectPinpointsInPassage(value).pinpoint;
      if (found && pinpointValue.trim() === "") {
        setPinpointType("paragraph");
        setPinpointValue(found.value);
      }
    },
    [pinpointValue]
  );

  // STD-016: the standard's quotation marks and block threshold (AGLC4
  // r 1.5.1, OSCOLA 5 §1.5, NZLSG 3 §1.2.2) come from the document config.
  const decision = useMemo(
    () =>
      detection.cleaned ? applyQuotationToText(detection.cleaned, { config: courtConfig }) : null,
    [detection.cleaned, courtConfig]
  );

  const pinpoint = useMemo(
    () => toPinpoint(pinpointType, pinpointValue),
    [pinpointType, pinpointValue]
  );
  const pinpointMissing = selected !== null && requiresPinpoint(selected.sourceType) && !pinpoint;

  const footnotePreview = useMemo(
    () =>
      selected
        ? buildFootnoteRuns(selected, existingFootnotes, pinpoint, courtConfig)
        : null,
    [selected, existingFootnotes, pinpoint, courtConfig]
  );

  const canInsert =
    !inserting && selected !== null && decision !== null && !pinpointMissing && store !== null;

  const handleInsert = useCallback(async () => {
    if (!selected || !decision || !store) return;
    if (pinpointMissing) {
      setError("Add a pinpoint for this source type (Rule 1.7.1).");
      return;
    }
    setInserting(true);
    setStatus(null);
    setError(null);
    try {
      // 1. The quotation itself; the selection is left at its end so the
      //    footnote reference follows the quotation (Rule 1.1.3).
      await insertQuotation({ text: decision.text, mode: decision.mode });

      // 2. The footnote, built exactly as the library's "Insert as" (auto).
      const existing = await getAllCitationFootnotes();
      const build = buildFootnoteRuns(selected, existing, pinpoint, courtConfig);
      const ccTitle = buildOccurrenceTitle("auto", pinpoint);
      await insertCitationFootnote(selected.id, ccTitle, build.runs);

      if (build.isFirst) {
        selected.firstFootnoteNumber = build.lastFootnoteNumber + 1;
        await store.update(selected);
      }

      triggerRefresh();
      setStatus("Quotation inserted with footnote.");
    } catch (err: unknown) {
      setError(writeErrorMessage(err, "Failed to insert the quotation."));
    } finally {
      setInserting(false);
    }
  }, [
    selected,
    decision,
    store,
    pinpointMissing,
    pinpoint,
    courtConfig,
    triggerRefresh,
  ]);

  const handleClear = useCallback(() => {
    setPassage("");
    setPinpointValue("");
    setStatus(null);
    setError(null);
    if (selected) setPinpointType(defaultPinpointType(selected.sourceType));
  }, [selected]);

  // ENP-011: read the chosen PDF's text layer in the browser.
  const handlePdfFile = useCallback(async (file: File) => {
    setPdfError(null);
    if (file.size > MAX_PDF_BYTES) {
      setPdfError(PDF_TOO_LARGE_MESSAGE);
      return;
    }
    setPdfProgress("Reading the PDF…");
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const result = await extractPdfPages(buffer, (page, total) => {
        if (mountedRef.current) setPdfProgress(`Reading page ${page} of ${total}…`);
      });
      if (!mountedRef.current) return;
      setPdf({ name: file.name, pages: result.pages });
      setPdfPageIndex(0);
      setAiPages(result.pages.map(() => true));
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setPdfError(describePdfError(err));
    } finally {
      if (mountedRef.current) setPdfProgress(null);
    }
  }, []);

  const handleClearPdf = useCallback(() => {
    setPdf(null);
    setPdfPageIndex(0);
    setPdfError(null);
    setAiPages([]);
  }, []);

  // ENP-012 ─────────────────────────────────────────────────────────────────

  const aiText = useMemo(() => aiScopeText(passage, pdf, aiPages), [passage, pdf, aiPages]);
  const aiSend = useMemo(
    () => (llmConfig ? describeSend(aiText, llmConfig) : null),
    [aiText, llmConfig]
  );
  const aiTooLong = aiSend !== null && aiSend.chars > MAX_TEXT_CHARS;
  const aiCanSend = aiBusy === null && aiSend !== null && aiSend.words > 0 && !aiTooLong;
  const allPagesTicked = aiPages.length > 0 && aiPages.every((on) => on);

  const toggleAiPage = useCallback((index: number) => {
    setAiPages((prev) => prev.map((on, i) => (i === index ? !on : on)));
  }, []);

  const toggleAllAiPages = useCallback(() => {
    setAiPages((prev) => {
      const all = prev.length > 0 && prev.every((on) => on);
      return prev.map(() => !all);
    });
  }, []);

  const runAi = useCallback(
    async (action: "summarise" | "ask") => {
      if (!llmConfig || !aiSend || !aiCanSend) return;
      const question = aiQuestion.trim();
      if (action === "ask" && question.length === 0) {
        setAiError("Type a question to ask about the text.");
        return;
      }
      setAiBusy(action);
      setAiError(null);
      setAiStatus(null);
      setAiResult(null);
      const onProgress = (done: number, total: number): void => {
        if (!mountedRef.current) return;
        setAiProgress(
          total > 1
            ? `Sent part ${Math.min(done, total)} of ${total} to ${aiSend.providerLabel}. Waiting for the reply…`
            : `Waiting for ${aiSend.providerLabel}…`
        );
      };
      setAiProgress(
        aiSend.chunks > 1
          ? `Sending part 1 of ${aiSend.chunks + 1} to ${aiSend.providerLabel}…`
          : `Sending to ${aiSend.providerLabel}…`
      );
      try {
        const text =
          action === "summarise"
            ? await summarisePassage(aiText, llmConfig, { onProgress })
            : await askAboutPassage(aiText, question, llmConfig, { onProgress });
        if (!mountedRef.current) return;
        setAiResult(text);
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        setAiError(describeLlmError(err));
      } finally {
        if (mountedRef.current) {
          setAiBusy(null);
          setAiProgress(null);
        }
      }
    },
    [llmConfig, aiSend, aiCanSend, aiQuestion, aiText]
  );

  const handleInsertNote = useCallback(async () => {
    if (!aiResult) return;
    setAiError(null);
    setAiStatus(null);
    try {
      await insertPlainParagraph(aiResult);
      setAiStatus("Note inserted.");
    } catch (err: unknown) {
      setAiError(writeErrorMessage(err, "Failed to insert the note."));
    }
  }, [aiResult]);

  const handleCopyResult = useCallback(async () => {
    if (!aiResult) return;
    setAiError(null);
    setAiStatus(null);
    const ok = await copyTextToClipboard(aiResult);
    if (ok) setAiStatus("Copied.");
    else setAiError("Copy failed. Select the text above and copy it manually.");
  }, [aiResult]);

  /**
   * Copies the selected part of the PDF page (or the whole page) into the
   * passage box. A page pinpoint is pre-filled from the PDF page number and
   * offset; a paragraph pinpoint comes from a detected marker (Rule 1.1.6).
   * A value the user has already typed is left alone.
   */
  const handleUsePdfSelection = useCallback(() => {
    if (!pdf) return;
    const pageText = pdf.pages[pdfPageIndex] ?? "";
    const area = pdfTextRef.current;
    const start = area?.selectionStart ?? 0;
    const end = area?.selectionEnd ?? 0;
    const chosen = end > start ? pageText.slice(start, end) : pageText;
    const text = chosen.trim();
    setPassage(text);
    setStatus(null);
    setPdfError(null);
    if (pinpointValue.trim() !== "") return;
    if (pinpointType === "page") {
      setPinpointValue(String(printedPageNumber(pdfPageIndex + 1, pdfOffset)));
      return;
    }
    if (pinpointType === "paragraph") {
      const found = detectPinpointsInPassage(text).pinpoint;
      if (found) setPinpointValue(found.value);
    }
  }, [pdf, pdfPageIndex, pdfOffset, pinpointType, pinpointValue]);

  const modeLabel = (mode: QuotationMode): string =>
    mode === "block"
      ? "Block quotation (four or more lines, Rule 1.5.1)"
      : "Inline quotation (Rule 1.5.1)";

  if (loading) {
    return (
      <div className="quote-panel">
        <h2>Quote</h2>
        <p>Loading citations...</p>
      </div>
    );
  }

  if (citations.length === 0) {
    return (
      <div className="quote-panel">
        <h2>Quote</h2>
        <p className="quote-help">
          Add a citation to the library first.{" "}
          <button type="button" className="quote-link-btn" onClick={() => navigate("/")}>
            Go to Insert Citation
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="quote-panel">
      <h2>Quote</h2>
      <p className="quote-help">
        Paste a passage, choose its source and pinpoint, and insert it as a formatted quotation with
        its footnote. Long quotations of four or more lines are set as a block quotation without
        quotation marks; shorter ones are set inline in single quotation marks (Rule 1.5.1).
      </p>

      <fieldset className="settings-section quote-section">
        <legend className="settings-section-title">Source</legend>
        <label htmlFor="quote-search" className="quote-label">
          Search the library
        </label>
        <input
          id="quote-search"
          type="search"
          className="library-search"
          placeholder="Title, parties or short title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {matches.length === 0 ? (
          <p className="quote-hint">No citations match the search.</p>
        ) : (
          <div role="radiogroup" aria-label="Quoted source" className="quote-source-list">
            {matches.map((citation) => (
              <label key={citation.id} className="quote-source-row">
                <input
                  type="radio"
                  name="quote-source"
                  value={citation.id}
                  checked={selectedId === citation.id}
                  onChange={() => {
                    setSelectedId(citation.id);
                    setStatus(null);
                    setError(null);
                  }}
                />
                <span className="quote-source-text">
                  <span className="quote-source-badge">
                    {getSourceTypeBadge(citation.sourceType)}
                  </span>{" "}
                  <FormattedRuns runs={safePreview(citation, courtConfig)} />
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="settings-section quote-section">
        <legend className="settings-section-title">Passage</legend>
        <label htmlFor="quote-passage" className="quote-label">
          Quoted text
        </label>
        <textarea
          id="quote-passage"
          className="quote-textarea"
          rows={6}
          value={passage}
          placeholder="Paste the passage to quote"
          onChange={(e) => handlePassageChange(e.target.value)}
        />
        {detection.pinpoint && (
          <p className="quote-hint">
            Paragraph marker {detection.markers[0]} found and used as the pinpoint
            {detection.markers.length > 1 ? ` (${detection.markers.length} markers removed)` : ""}.
          </p>
        )}

        <div className="quote-pdf">
          <div className="quote-pdf-toolbar">
            <button
              type="button"
              className="library-btn"
              onClick={() => pdfInputRef.current?.click()}
              disabled={pdfProgress !== null}
              aria-describedby="quote-pdf-help"
            >
              {pdf ? "Load another PDF" : "Load PDF"}
            </button>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              tabIndex={-1}
              data-testid="quote-pdf-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handlePdfFile(file);
              }}
              style={{ display: "none" }}
            />
            {pdf && (
              <button
                type="button"
                className="library-btn"
                onClick={handleClearPdf}
                disabled={pdfProgress !== null}
              >
                Clear PDF
              </button>
            )}
          </div>
          <p id="quote-pdf-help" className="quote-hint">
            {pdf
              ? `${pdf.name} (${pdf.pages.length} ${pdf.pages.length === 1 ? "page" : "pages"}). Select part of a page, or use the whole page.`
              : "Or load a PDF and pick the passage from its text. The file is read on this device only."}
          </p>
          <div aria-live="polite" role="status">
            {pdfProgress && <p className="quote-hint quote-pdf-progress">{pdfProgress}</p>}
          </div>
          {pdfError && (
            <p className="quote-status-error" role="alert">
              {pdfError}
            </p>
          )}
          {pdf && (
            <>
              <div className="quote-pinpoint-row">
                <div className="quote-pinpoint-value">
                  <label htmlFor="quote-pdf-page" className="quote-label">
                    Page
                  </label>
                  <select
                    id="quote-pdf-page"
                    className="quote-select quote-pdf-page-select"
                    value={pdfPageIndex}
                    onChange={(e) => setPdfPageIndex(Number(e.target.value))}
                  >
                    {pdf.pages.map((_text, i) => (
                      <option key={i} value={i}>
                        Page {i + 1} of {pdf.pages.length}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="quote-pdf-offset" className="quote-label">
                    Page offset
                  </label>
                  <input
                    id="quote-pdf-offset"
                    type="number"
                    step={1}
                    className="library-search quote-pdf-offset"
                    value={pdfOffset}
                    onChange={(e) => setPdfOffset(e.target.value)}
                    aria-describedby="quote-pdf-offset-help"
                  />
                </div>
              </div>
              <p id="quote-pdf-offset-help" className="quote-hint">
                Added to the PDF page number to give the printed page for a page pinpoint (for
                example, -4 when the text starts on the fifth PDF page).
              </p>
              <label htmlFor="quote-pdf-text" className="quote-label">
                Page text
              </label>
              <textarea
                id="quote-pdf-text"
                ref={pdfTextRef}
                className="quote-textarea quote-pdf-text"
                rows={8}
                readOnly
                value={pdf.pages[pdfPageIndex] ?? ""}
              />
              <div className="quote-pdf-toolbar">
                <button type="button" className="library-btn" onClick={handleUsePdfSelection}>
                  Use selection
                </button>
              </div>
            </>
          )}
        </div>
      </fieldset>

      <fieldset className="settings-section quote-section">
        <legend className="settings-section-title">AI</legend>
        {!aiEnabled || !aiSend ? (
          <p className="quote-hint">
            Configure an LLM provider in Settings to summarise or ask about a passage.
          </p>
        ) : (
          <>
            <div className="quote-ai-scope">
              {pdf ? (
                <>
                  <fieldset className="quote-ai-pages">
                    <legend>Pages to include</legend>
                    {pdf.pages.map((_page, i) => (
                      <label key={i} className="quote-ai-page">
                        <input
                          type="checkbox"
                          checked={aiPages[i] === true}
                          onChange={() => toggleAiPage(i)}
                          disabled={aiBusy !== null}
                        />
                        Page {i + 1}
                      </label>
                    ))}
                  </fieldset>
                  <button
                    type="button"
                    className="quote-link-btn"
                    onClick={toggleAllAiPages}
                    disabled={aiBusy !== null}
                  >
                    {allPagesTicked ? "Select none" : "Select all"}
                  </button>
                </>
              ) : (
                <p className="quote-hint">
                  The text in the Quoted text box is what will be sent. Load a PDF to choose pages
                  instead.
                </p>
              )}
            </div>
            <div className="quote-ai-actions">
              <button
                type="button"
                className="library-btn"
                onClick={() => void runAi("summarise")}
                disabled={!aiCanSend}
              >
                {sendLabel("Summarise", aiSend.words, aiSend.chunks, aiSend.providerLabel)}
              </button>
            </div>
            <label htmlFor="quote-ai-question" className="quote-label">
              Question
            </label>
            <input
              id="quote-ai-question"
              type="text"
              className="library-search quote-ai-question"
              placeholder="What did the court decide on causation?"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              disabled={aiBusy !== null}
            />
            <div className="quote-ai-actions">
              <button
                type="button"
                className="library-btn"
                onClick={() => void runAi("ask")}
                disabled={!aiCanSend || aiQuestion.trim().length === 0}
              >
                {sendLabel("Ask", aiSend.words, aiSend.chunks, aiSend.providerLabel)}
              </button>
            </div>
            {aiTooLong && (
              <p className="quote-status-error">
                The text is longer than {MAX_TEXT_CHARS.toLocaleString("en-AU")} characters.
                Untick some pages or shorten the passage.
              </p>
            )}
            <div aria-live="polite" role="status">
              {aiProgress && <p className="quote-hint quote-pdf-progress">{aiProgress}</p>}
              {aiStatus && <p className="quote-status-ok">{aiStatus}</p>}
            </div>
            {aiError && (
              <p className="quote-status-error" role="alert">
                {aiError}
              </p>
            )}
            {aiResult && (
              <>
                <div className="quote-ai-result" aria-live="polite" data-testid="quote-ai-result">
                  {aiResult}
                </div>
                <div className="quote-ai-actions">
                  <button
                    type="button"
                    className="library-btn"
                    onClick={() => void handleInsertNote()}
                    disabled={aiBusy !== null}
                  >
                    Insert as note
                  </button>
                  <button
                    type="button"
                    className="library-btn"
                    onClick={() => void handleCopyResult()}
                    disabled={aiBusy !== null}
                  >
                    Copy
                  </button>
                </div>
              </>
            )}
            <p className="quote-ai-note">Answers are drawn only from the text you loaded.</p>
          </>
        )}
      </fieldset>

      <fieldset className="settings-section quote-section">
        <legend className="settings-section-title">Pinpoint</legend>
        <div className="quote-pinpoint-row">
          <div>
            <label htmlFor="quote-pinpoint-type" className="quote-label">
              Type
            </label>
            <select
              id="quote-pinpoint-type"
              className="quote-select"
              value={pinpointType}
              onChange={(e) => setPinpointType(e.target.value as QuotePinpointType)}
            >
              {PINPOINT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="quote-pinpoint-value">
            <label htmlFor="quote-pinpoint-value" className="quote-label">
              Value
            </label>
            <input
              id="quote-pinpoint-value"
              type="text"
              className="library-search"
              placeholder={pinpointType === "paragraph" ? "42 or 42–44" : "12 or 12–13"}
              value={pinpointValue}
              onChange={(e) => setPinpointValue(e.target.value)}
              aria-describedby="quote-pinpoint-help"
            />
          </div>
        </div>
        <p id="quote-pinpoint-help" className="quote-hint">
          {pinpointMissing
            ? "Add a pinpoint for this source type (Rule 1.7.1)."
            : "Paragraph numbers are set in square brackets and spans take an en dash (Rules 1.1.6 and 1.1.7)."}
        </p>
      </fieldset>

      <fieldset className="settings-section quote-section">
        <legend className="settings-section-title">Preview</legend>
        {decision && selected ? (
          <>
            <p className="quote-preview-mode">{modeLabel(decision.mode)}</p>
            <div
              className={
                decision.mode === "block" ? "quote-preview quote-preview--block" : "quote-preview"
              }
              data-testid="quote-preview-text"
            >
              {decision.text.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <p className="quote-label">Footnote</p>
            <p
              className="quote-preview quote-preview--footnote"
              data-testid="quote-preview-footnote"
            >
              {footnotePreview && (
                <>
                  <FormattedRuns runs={footnotePreview.runs} />
                  {endsWithFullStop(footnotePreview.runs) ? "" : "."}
                </>
              )}
            </p>
          </>
        ) : (
          <p className="quote-hint">
            {selected
              ? "Paste a passage to preview the quotation."
              : "Choose a source to preview the footnote."}
          </p>
        )}
      </fieldset>

      <div className="quote-actions">
        <button
          type="button"
          className="bib-insert-btn"
          onClick={() => void handleInsert()}
          disabled={!canInsert}
        >
          {inserting ? "Inserting..." : "Insert quotation and footnote"}
        </button>
        <button type="button" className="library-btn" onClick={handleClear} disabled={inserting}>
          Clear
        </button>
      </div>

      <div aria-live="polite" role="status" className="quote-status">
        {status && <p className="quote-status-ok">{status}</p>}
        {error && <p className="quote-status-error">{error}</p>}
      </div>
    </div>
  );
}
