/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ExportDialog — scope (all, selected, shown), format (RIS, EndNote XML,
 * BibTeX, CSL-JSON, formatted text) and destination (download, clipboard,
 * show as text) for the Citation Library (INTEROP-013).
 */

import { useCallback, useRef, useState } from "react";
import ModalDialog from "./ModalDialog";
import { exportCitations, hasCodec } from "../../api/interchange";
import type { ExportFormat } from "../../api/interchange";
import type { Citation } from "../../types/citation";
import { getDevicePref, setDevicePref } from "../../store/devicePreferences";
import { copyTextToClipboard, downloadTextFile, todayStamp } from "../fileTransfer";

export interface ExportDialogProps {
  all: Citation[];
  selected: Citation[];
  shown: Citation[];
  hasActiveFilter: boolean;
  /** Formats a citation for the note and the formatted-text list. */
  formatCitation: (citation: Citation) => { footnote: string; bibliography?: string };
  standardLabel: string;
  onClose: () => void;
  onExported: (message: string) => void;
  returnFocusTo?: HTMLElement | null;
}

type Scope = "all" | "selected" | "shown";
type Destination = "download" | "clipboard" | "text";

export const EXPORT_FORMAT_PREF = "interchange.exportFormat";

const FORMATS: Array<{ value: ExportFormat; label: string; hint?: string }> = [
  { value: "ris", label: "RIS (.ris)", hint: "EndNote, Zotero, Mendeley, Trove, Primo" },
  { value: "endnote-xml", label: "EndNote XML (.xml)" },
  { value: "bibtex", label: "BibTeX (.bib)" },
  { value: "csl-json", label: "CSL-JSON (.json)", hint: "Zotero, Pandoc" },
  {
    value: "formatted-text",
    label: "Formatted text (AGLC4)",
    hint: "Plain text only. Italics are not preserved.",
  },
];

function formatLabel(format: ExportFormat): string {
  return format === "formatted-text"
    ? "formatted text"
    : (FORMATS.find((f) => f.value === format)?.label.split(" (")[0] ?? format);
}

export default function ExportDialog({
  all,
  selected,
  shown,
  hasActiveFilter,
  formatCitation,
  standardLabel,
  onClose,
  onExported,
  returnFocusTo,
}: ExportDialogProps): JSX.Element {
  const initialFormat = ((): ExportFormat => {
    const pref = getDevicePref(EXPORT_FORMAT_PREF);
    return typeof pref === "string" && FORMATS.some((f) => f.value === pref)
      ? (pref as ExportFormat)
      : "ris";
  })();
  const [scope, setScope] = useState<Scope>(selected.length > 0 ? "selected" : "all");
  const [format, setFormat] = useState<ExportFormat>(initialFormat);
  const [destination, setDestination] = useState<Destination>("download");
  const [endnoteStyle, setEndnoteStyle] = useState<"uts-aglc4" | "generic">("uts-aglc4");
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  const citations = scope === "selected" ? selected : scope === "shown" ? shown : all;
  const showShown = hasActiveFilter && shown.length !== all.length;
  const available = FORMATS.filter((f) => f.value === "formatted-text" || hasCodec(f.value));

  const run = useCallback(async () => {
    setError(null);
    setText(null);
    if (citations.length === 0) {
      setError(
        scope === "selected"
          ? "Nothing to export. The current selection is empty."
          : "Nothing to export. The current search and filter show no citations."
      );
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }
    setBusy(true);
    try {
      const result = exportCitations(citations, {
        format,
        formatCitation,
        standardLabel,
        endnoteStyle,
        scopeLabel: scope === "all" ? "library" : "selection",
        dateStamp: todayStamp(),
      });
      setDevicePref(EXPORT_FORMAT_PREF, format);
      const count = `${result.records} citation${result.records === 1 ? "" : "s"}`;
      if (destination === "download") {
        downloadTextFile(result.fileName, result.text, result.mimeType);
        onExported(`Downloaded ${count} as ${formatLabel(format)} (${result.fileName}).`);
      } else if (destination === "clipboard") {
        const ok = await copyTextToClipboard(result.text);
        if (!ok) {
          setError(
            "Could not copy to the clipboard in this window. Choose Download file or Show as text instead."
          );
          window.setTimeout(() => errorRef.current?.focus(), 0);
          return;
        }
        onExported(`Copied ${count} as ${formatLabel(format)} to the clipboard.`);
      } else {
        setText(result.text);
        window.setTimeout(() => outputRef.current?.focus(), 0);
      }
    } catch (err) {
      setError(
        `Could not build the ${formatLabel(format)} file: ${err instanceof Error ? err.message : String(err)}. Try another format.`
      );
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setBusy(false);
    }
  }, [
    citations,
    scope,
    format,
    formatCitation,
    standardLabel,
    endnoteStyle,
    destination,
    onExported,
  ]);

  const primaryLabel =
    destination === "download" ? "Download" : destination === "clipboard" ? "Copy" : "Show";

  return (
    <ModalDialog
      titleId="export-dialog-title"
      busy={busy}
      onClose={onClose}
      returnFocusTo={returnFocusTo}
    >
      <h3 id="export-dialog-title">Export citations</h3>
      <p className="library-modal-description">
        Export the library for use in EndNote, Zotero, Mendeley or another tool, or as a plain{" "}
        {standardLabel} list.
      </p>
      {error && (
        <div className="import-error" role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </div>
      )}

      <fieldset className="export-fieldset">
        <legend>What to export</legend>
        <label className="export-radio-row">
          <input
            type="radio"
            name="export-scope"
            checked={scope === "all"}
            onChange={() => setScope("all")}
          />
          All {all.length} citation{all.length === 1 ? "" : "s"} in the library
        </label>
        {selected.length > 0 && (
          <label className="export-radio-row">
            <input
              type="radio"
              name="export-scope"
              checked={scope === "selected"}
              onChange={() => setScope("selected")}
            />
            {selected.length} selected
          </label>
        )}
        {showShown && (
          <label className="export-radio-row">
            <input
              type="radio"
              name="export-scope"
              checked={scope === "shown"}
              onChange={() => setScope("shown")}
            />
            {shown.length} shown by the current search and filter
          </label>
        )}
      </fieldset>

      <fieldset className="export-fieldset">
        <legend>Format</legend>
        {available.map((f) => (
          <label key={f.value} className="export-radio-row">
            <input
              type="radio"
              name="export-format"
              checked={format === f.value}
              onChange={() => setFormat(f.value)}
            />
            {f.label}
            {f.hint && <span className="export-hint"> — {f.hint}</span>}
          </label>
        ))}
        {format === "endnote-xml" && (
          <label className="export-radio-row export-sub-option" htmlFor="export-endnote-style">
            Reference types
            <select
              id="export-endnote-style"
              className="library-select"
              value={endnoteStyle}
              onChange={(e) => setEndnoteStyle(e.target.value as "uts-aglc4" | "generic")}
            >
              <option value="uts-aglc4">UTS AGLC4 reference types</option>
              <option value="generic">EndNote generic reference types</option>
            </select>
          </label>
        )}
      </fieldset>

      <fieldset className="export-fieldset">
        <legend>Destination</legend>
        <label className="export-radio-row">
          <input
            type="radio"
            name="export-destination"
            checked={destination === "download"}
            onChange={() => setDestination("download")}
          />
          Download file
        </label>
        <label className="export-radio-row">
          <input
            type="radio"
            name="export-destination"
            checked={destination === "clipboard"}
            onChange={() => setDestination("clipboard")}
          />
          Copy to clipboard
        </label>
        <label className="export-radio-row">
          <input
            type="radio"
            name="export-destination"
            checked={destination === "text"}
            onChange={() => setDestination("text")}
          />
          Show as text
        </label>
      </fieldset>

      {text !== null && (
        <div className="export-text-output">
          <textarea
            ref={outputRef}
            className="library-paste-textarea"
            rows={10}
            readOnly
            value={text}
            aria-label="Exported text"
          />
          <button className="library-btn" onClick={() => outputRef.current?.select()}>
            Select all
          </button>
        </div>
      )}

      <div className="library-modal-actions">
        <button
          className="library-btn library-btn--import"
          onClick={() => void run()}
          disabled={busy || citations.length === 0}
        >
          {primaryLabel}
        </button>
        <button className="library-btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </ModalDialog>
  );
}
