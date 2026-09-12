/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ImportDialog — two steps in one dialog. Step one collects sources: pasted
 * records with auto-detection, uploaded files (RIS, EndNote XML, BibTeX,
 * CSL-JSON, Word Sources XML) and the document's own Source Manager. Step
 * two previews every record with its detected type, an AGLC rendering,
 * completeness and duplicate status, then adds the included rows in one
 * persist (INTEROP-012).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ModalDialog from "./ModalDialog";
import ImportPreviewTable from "./ImportPreviewTable";
import type { SourceTypeOption } from "./ImportPreviewTable";
import {
  commitImport,
  detectFormat,
  prepareImport,
  recount,
  retypeRow,
} from "../../api/interchange";
import type {
  ImportCommitResult,
  ImportPreview,
  ImportSource,
  InterchangeFormat,
} from "../../api/interchange";
import type { CitationStore } from "../../store/citationStore";
import type { Citation, SourceType } from "../../types/citation";
import { getVersionForStandard } from "../../actions/citationRequest";
import { exportRuleReference } from "../../engine/ruleExporter";
import { readFileAsText } from "../fileTransfer";

export interface ImportDialogProps {
  store: CitationStore;
  /** Renders a citation as one line of AGLC text for the preview. */
  renderCitation: (citation: Citation) => string;
  /** Reads Word's Source Manager part as XML, or null when the document has none. */
  readWordSources?: () => Promise<string | null>;
  onClose: () => void;
  onImported: (result: ImportCommitResult & { formats: string[] }) => void;
  returnFocusTo?: HTMLElement | null;
}

interface SourceEntry {
  id: number;
  name: string;
  text: string;
  formatHint?: InterchangeFormat;
  state: "reading" | "ready" | "unrecognised" | "too-large" | "error";
  format?: InterchangeFormat | null;
  count: number;
  /** The File, kept so the user can re-read it in another encoding. */
  file?: File;
}

const FORMAT_LABELS: Record<InterchangeFormat, string> = {
  ris: "RIS",
  "endnote-xml": "EndNote XML",
  bibtex: "BibTeX",
  "csl-json": "CSL-JSON",
  "word-sources-xml": "Word Source Manager",
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PAGE_SIZE = 50;
const ACCEPT =
  ".ris,.txt,.xml,.enw,.bib,.bibtex,.json,text/plain,application/xml,text/xml,application/json";

function describe(entry: SourceEntry): string {
  switch (entry.state) {
    case "reading":
      return "Reading…";
    case "too-large":
      return "File is larger than 5 MB and was not read";
    case "error":
      return "File could not be read";
    case "unrecognised":
      return "Format not recognised";
    default:
      return `${entry.format ? FORMAT_LABELS[entry.format] : "Unknown"} · ${entry.count} record${entry.count === 1 ? "" : "s"}`;
  }
}

let nextSourceId = 1;

export default function ImportDialog({
  store,
  renderCitation,
  readWordSources,
  onClose,
  onImported,
  returnFocusTo,
}: ImportDialogProps): JSX.Element {
  const [step, setStep] = useState<"sources" | "preview">("sources");
  const [pasted, setPasted] = useState("");
  const [pasteFormat, setPasteFormat] = useState<"auto" | InterchangeFormat>("auto");
  const [files, setFiles] = useState<SourceEntry[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wordBusy, setWordBusy] = useState(false);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const aglcVersion = getVersionForStandard(store.getStandardId());
  const typeOptions = useMemo<SourceTypeOption[]>(
    () =>
      exportRuleReference()
        .sourceTypes.map((s) => ({
          type: s.type as SourceType,
          label: s.label,
          category: s.category,
        }))
        .sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label)),
    []
  );

  // Debounced detection of the pasted text.
  const [pasteDetection, setPasteDetection] = useState<{
    format: InterchangeFormat | null;
    count: number;
  } | null>(null);
  useEffect(() => {
    if (!pasted.trim()) {
      setPasteDetection(null);
      return;
    }
    const handle = window.setTimeout(() => {
      const result = detectFormat(pasted, {
        formatHint: pasteFormat === "auto" ? undefined : pasteFormat,
      });
      setPasteDetection({ format: result.format, count: result.count });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [pasted, pasteFormat]);

  const readFile = useCallback(async (file: File, id: number, encoding?: string) => {
    if (file.size > MAX_FILE_BYTES) {
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, state: "too-large" } : f)));
      return;
    }
    try {
      const text = await readFileAsText(file, encoding);
      const detection = detectFormat(text, { fileName: file.name });
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                text,
                state: detection.format ? "ready" : "unrecognised",
                format: detection.format,
                count: detection.count,
                formatHint: detection.format ?? undefined,
              }
            : f
        )
      );
    } catch {
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, state: "error" } : f)));
    }
  }, []);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const entries: SourceEntry[] = Array.from(list).map((file) => ({
        id: nextSourceId++,
        name: file.name,
        text: "",
        state: "reading",
        count: 0,
        file,
      }));
      setFiles((prev) => [...prev, ...entries]);
      for (const entry of entries) {
        if (entry.file) void readFile(entry.file, entry.id);
      }
    },
    [readFile]
  );

  const handleWordSources = useCallback(async () => {
    if (!readWordSources) return;
    setWordBusy(true);
    setError(null);
    try {
      const xml = await readWordSources();
      if (!xml) {
        setError("Word's Source Manager holds no sources in this document.");
        return;
      }
      const detection = detectFormat(xml, { formatHint: "word-sources-xml" });
      setFiles((prev) => [
        ...prev,
        {
          id: nextSourceId++,
          name: "Word Source Manager",
          text: xml,
          formatHint: "word-sources-xml",
          state: "ready",
          format: "word-sources-xml",
          count: detection.count,
        },
      ]);
    } catch (err) {
      setError(
        `Could not read Word's Source Manager: ${err instanceof Error ? err.message : String(err)}. Try again.`
      );
    } finally {
      setWordBusy(false);
    }
  }, [readWordSources]);

  const totalRecords =
    files.filter((f) => f.state === "ready").reduce((n, f) => n + f.count, 0) +
    (pasteDetection?.count ?? 0);
  const sourceCount =
    files.filter((f) => f.state === "ready").length + (pasteDetection?.format ? 1 : 0);

  const handlePreview = useCallback(() => {
    setError(null);
    const sources: ImportSource[] = files
      .filter((f) => f.state === "ready")
      .map((f) => ({ text: f.text, fileName: f.name, formatHint: f.formatHint }));
    if (pasted.trim()) {
      sources.push({ text: pasted, formatHint: pasteFormat === "auto" ? undefined : pasteFormat });
    }
    const result = prepareImport(sources, { existing: store.getAll(), aglcVersion });
    if (result.rows.length === 0) {
      const first = result.issues.find((i) => i.severity === "error");
      setError(
        first
          ? `${first.message} Fix the text or export the file again, then try Preview.`
          : "No records could be read from the pasted text or chosen files. Check the format and try again."
      );
      return;
    }
    setPreview(result);
    setPage(0);
    setStep("preview");
    window.setTimeout(() => summaryRef.current?.focus(), 0);
  }, [files, pasted, pasteFormat, store, aglcVersion]);

  const updateRows = useCallback(
    (mutate: (rows: ImportPreview["rows"]) => ImportPreview["rows"]) => {
      setPreview((prev) => {
        if (!prev) return prev;
        const next = { ...prev, rows: mutate(prev.rows) };
        next.counts = recount(next);
        return next;
      });
    },
    []
  );

  const includedCount = preview
    ? preview.rows.filter((r) => r.include && (!r.duplicateOf || r.update)).length
    : 0;

  const handleCommit = useCallback(async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const result = await commitImport(preview, store, { includeIncomplete: true });
      const formats = Array.from(
        new Set(
          preview.sources
            .map((s) => s.detection.format)
            .filter((f): f is InterchangeFormat => Boolean(f))
        )
      ).map((f) => FORMAT_LABELS[f]);
      onImported({ ...result, formats });
    } catch (err) {
      setError(
        `Could not add the citations: ${err instanceof Error ? err.message : String(err)}. Nothing was added. Try again, or export the file again and retry.`
      );
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setBusy(false);
    }
  }, [preview, store, onImported]);

  const renderPreview = useCallback(
    (row: ImportPreview["rows"][number]): string => {
      try {
        return renderCitation(row.citation);
      } catch {
        return row.record.title ?? "";
      }
    },
    [renderCitation]
  );

  return (
    <ModalDialog
      titleId="import-dialog-title"
      busy={busy}
      onClose={onClose}
      wide={step === "preview"}
      returnFocusTo={returnFocusTo}
    >
      <h3 id="import-dialog-title">Import citations</h3>

      {error && (
        <div className="import-error" role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </div>
      )}

      {step === "sources" && (
        <>
          <p className="library-modal-description">
            Paste records copied from a catalogue or reference manager, or choose exported files.
            Obiter reads RIS, EndNote XML, BibTeX and CSL-JSON.
          </p>
          <div className="library-modal-file-row">
            <label className="library-btn library-btn--import library-file-label">
              Choose files
              <input
                type="file"
                multiple
                accept={ACCEPT}
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
                style={{ display: "none" }}
              />
            </label>
            {readWordSources && (
              <button
                className="library-btn library-btn--import"
                onClick={() => void handleWordSources()}
                disabled={wordBusy}
              >
                {wordBusy ? "Reading…" : "From Word's Source Manager"}
              </button>
            )}
          </div>
          {files.length > 0 && (
            <ul className="import-sources" aria-label="Chosen files">
              {files.map((entry) => (
                <li key={entry.id} className="import-source-row">
                  <span>
                    {entry.name} — <span className="import-source-meta">{describe(entry)}</span>
                  </span>
                  <span>
                    {entry.file && (entry.state === "ready" || entry.state === "unrecognised") && (
                      <button
                        className="library-btn"
                        onClick={() =>
                          entry.file && void readFile(entry.file, entry.id, "windows-1252")
                        }
                        title="Re-read this file as Windows-1252 if the preview shows garbled characters"
                      >
                        Read as Windows-1252
                      </button>
                    )}
                    <button
                      className="library-btn"
                      onClick={() => setFiles((prev) => prev.filter((f) => f.id !== entry.id))}
                      aria-label={`Remove ${entry.name}`}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <textarea
            className="library-paste-textarea"
            rows={8}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            aria-label="Pasted records"
            aria-describedby="import-detect"
            placeholder={
              "TY  - JOUR\nAU  - Luntz, Harold\nTI  - A Personal Journey through the Law of Torts\nER  -"
            }
          />
          <p id="import-detect" className="import-detect" role="status" aria-live="polite">
            {pasted.trim() &&
              (pasteDetection?.format
                ? `Detected: ${FORMAT_LABELS[pasteDetection.format]} · ${pasteDetection.count} record${pasteDetection.count === 1 ? "" : "s"}`
                : pasteDetection
                  ? "Format not recognised. Paste RIS, EndNote XML, BibTeX or CSL-JSON records, or choose the exported file instead."
                  : "")}
          </p>
          <div className="import-format-row">
            <label htmlFor="import-format">Format</label>
            <select
              id="import-format"
              className="library-select"
              value={pasteFormat}
              onChange={(e) => setPasteFormat(e.target.value as "auto" | InterchangeFormat)}
            >
              <option value="auto">Auto-detect</option>
              <option value="ris">RIS</option>
              <option value="endnote-xml">EndNote XML</option>
              <option value="bibtex">BibTeX</option>
              <option value="csl-json">CSL-JSON</option>
            </select>
          </div>
          <p className="import-summary" role="status">
            {totalRecords > 0
              ? `${sourceCount} source${sourceCount === 1 ? "" : "s"} · ${totalRecords} record${totalRecords === 1 ? "" : "s"} ready to preview`
              : "No records found yet"}
          </p>
          <div className="library-modal-actions">
            <button
              className="library-btn library-btn--import"
              onClick={handlePreview}
              disabled={totalRecords === 0}
            >
              Preview
            </button>
            <button className="library-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </>
      )}

      {step === "preview" && preview && (
        <>
          <p className="import-summary" role="status" tabIndex={-1} ref={summaryRef}>
            {preview.counts.total} record{preview.counts.total === 1 ? "" : "s"}:{" "}
            {preview.counts.ready} ready · {preview.counts.incomplete} need more details ·{" "}
            {preview.counts.duplicates} already in library
            {preview.counts.failed > 0 ? ` · ${preview.counts.failed} could not be read` : ""}
            {preview.counts.total > 5000
              ? ". Large import: review is paged; adding may take a few seconds."
              : ""}
          </p>
          {preview.issues.filter((i) => i.severity === "error").length > 0 && (
            <ul className="import-issues" aria-label="Problems reading the sources">
              {preview.issues
                .filter((i) => i.severity === "error")
                .slice(0, 5)
                .map((i, n) => (
                  <li key={n}>{i.message}</li>
                ))}
            </ul>
          )}
          <div className="import-bulk">
            <button
              className="library-btn"
              onClick={() => updateRows((rows) => rows.map((r) => ({ ...r, include: true })))}
            >
              Include all
            </button>
            <button
              className="library-btn"
              onClick={() => updateRows((rows) => rows.map((r) => ({ ...r, include: false })))}
            >
              Include none
            </button>
            <button
              className="library-btn"
              onClick={() =>
                updateRows((rows) =>
                  rows.map((r) => (r.duplicateOf ? { ...r, include: false, update: false } : r))
                )
              }
            >
              Exclude duplicates
            </button>
            <button
              className="library-btn"
              onClick={() =>
                updateRows((rows) =>
                  rows.map((r) => (r.missingFields.length > 0 ? { ...r, include: false } : r))
                )
              }
            >
              Exclude incomplete
            </button>
          </div>
          <ImportPreviewTable
            rows={preview.rows}
            page={page}
            pageSize={PAGE_SIZE}
            typeOptions={typeOptions}
            renderPreview={renderPreview}
            onToggleInclude={(index, include) =>
              updateRows((rows) =>
                rows.map((r) =>
                  r.index === index ? { ...r, include, update: include ? r.update : false } : r
                )
              )
            }
            onToggleUpdate={(index, update) =>
              updateRows((rows) => rows.map((r) => (r.index === index ? { ...r, update } : r)))
            }
            onRetype={(index, sourceType) =>
              updateRows((rows) =>
                rows.map((r) =>
                  r.index === index
                    ? retypeRow(r, sourceType, { existing: store.getAll(), aglcVersion })
                    : r
                )
              )
            }
            onPage={setPage}
          />
          <div className="library-modal-actions">
            <button className="library-btn" onClick={() => setStep("sources")} disabled={busy}>
              Back
            </button>
            <button
              className="library-btn library-btn--import"
              onClick={() => void handleCommit()}
              disabled={busy || includedCount === 0}
            >
              {busy
                ? `Adding ${includedCount} citation${includedCount === 1 ? "" : "s"}…`
                : includedCount === 0
                  ? "Nothing selected"
                  : `Add ${includedCount} citation${includedCount === 1 ? "" : "s"}`}
            </button>
            <button className="library-btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </>
      )}
    </ModalDialog>
  );
}
