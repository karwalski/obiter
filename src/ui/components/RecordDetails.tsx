/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-005: the collapsed "Record details" panel in the Edit view. Shows when
 * a citation was created and modified, where it was imported from and the
 * identifiers and passthrough the import kept, the source links its own
 * data supports (ENP-004), a "Cases citing this" row for cases (ENP-009,
 * link-only), and the earlier versions held in the document's backup
 * snapshots, each restorable after a confirmation.
 *
 * Previous versions are read lazily the first time the panel is opened:
 * reading the backup part parses every store snapshot, which is not a cost
 * to pay on every citation load.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Citation } from "../../types/citation";
import type { CitationInterchangeBag, InterchangeFormat } from "../../api/interchange/model";
import { INTERCHANGE_DATA_KEY } from "../../api/interchange/model";
import { lawCiteUrl, linksForCitation } from "../../api/sourceLinks";
import { addCitingWorkToLibrary } from "../../api/citedBy";
import type { LookupResult } from "../../api/sourceAdapter";
import type { SnapshotReason } from "../../store/backupSerializer";
import type { CitationVersion } from "../../store/citationHistory";
import CitedByPanel from "./CitedByPanel";

export interface RecordDetailsProps {
  citation: Citation;
  /** The current formatted full citation, used for the LawCite lookup. */
  citationText: string;
  onRestore(version: CitationVersion): Promise<void>;
  loadVersions(): Promise<CitationVersion[]>;
  /** Open the panel on first render (the library's "Details" action). */
  initiallyOpen?: boolean;
  /**
   * ENP-008: add a citing work (from the "Cited by" section, journal types
   * only) to the library. Defaults to a linked `journal.article` written to
   * the shared store.
   */
  onAddCitingWork?(work: LookupResult): Promise<void>;
}

const FORMAT_LABELS: Partial<Record<InterchangeFormat | "adapter", string>> = {
  ris: "RIS",
  bibtex: "BibTeX",
  "csl-json": "CSL JSON",
  "endnote-xml": "EndNote XML",
  "word-sources-xml": "Word Source Manager XML",
  adapter: "an online source",
};

const REASON_LABELS: Record<SnapshotReason, string> = {
  persist: "automatic backup",
  "pre-restore": "saved before a restore",
  manual: "manual backup",
  dedupe: "saved before merging duplicates",
};

/** Format an ISO timestamp for display; fall back to the raw string. */
export function formatRecordTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

/** String() then trim, never calling .trim() on an unknown; empty for nullish/objects. */
function text(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return "";
  return String(value).trim();
}

function readBag(citation: Citation): CitationInterchangeBag | undefined {
  const value = (citation.data as Record<string, unknown> | undefined)?.[INTERCHANGE_DATA_KEY];
  return value && typeof value === "object" ? (value as CitationInterchangeBag) : undefined;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceDescription(bag: CitationInterchangeBag | undefined): string {
  const provenance = bag?.provenance;
  if (!provenance) return "Created in Obiter; no import record";
  if (provenance.adapterId) {
    const via = text(provenance.sourceLabel) || provenance.adapterId;
    const when = text(provenance.retrievedAt);
    return when ? `Found via ${via} on ${formatRecordTime(when)}` : `Found via ${via}`;
  }
  const format = FORMAT_LABELS[provenance.format] || text(provenance.format) || "an import";
  const label = text(provenance.sourceLabel);
  const when = text(provenance.importedAt);
  let description = `Imported from ${format}`;
  if (label) description += ` (${label})`;
  if (when) description += ` on ${formatRecordTime(when)}`;
  return description;
}

interface IdentifierRow {
  label: string;
  value: string;
}

function identifierRows(citation: Citation, bag: CitationInterchangeBag | undefined): IdentifierRow[] {
  const ids = bag?.identifiers;
  const data = (citation.data ?? {}) as Record<string, unknown>;
  const candidates: IdentifierRow[] = [
    { label: "DOI", value: text(ids?.doi) || text(data.doi) },
    { label: "ISBN", value: text(ids?.isbn) },
    { label: "ISSN", value: text(ids?.issn) },
    { label: "Cite key", value: text(ids?.citeKey) },
    { label: "Accession number", value: text(ids?.accessionNumber) },
    { label: "Call number", value: text(ids?.callNumber) },
  ];
  return candidates.filter((row) => row.value !== "");
}

function openLink(url: string): void {
  window.open(url, "_blank", "noopener");
}

export default function RecordDetails({
  citation,
  citationText,
  onRestore,
  loadVersions,
  initiallyOpen = false,
  onAddCitingWork,
}: RecordDetailsProps): JSX.Element {
  const [open, setOpen] = useState(initiallyOpen);
  const [versions, setVersions] = useState<CitationVersion[] | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const requested = useRef(false);

  const bag = useMemo(() => readBag(citation), [citation]);
  const links = useMemo(() => linksForCitation(citation), [citation]);
  const identifiers = useMemo(() => identifierRows(citation, bag), [citation, bag]);
  const isCase = citation.sourceType.startsWith("case.");
  const isJournal = citation.sourceType.startsWith("journal.");
  const jadeLink = useMemo(() => links.find((l) => hostOf(l.url) === "jade.io"), [links]);

  // ENP-008: the Edit view does not pass a handler, so the default writes a
  // linked journal article straight to the shared store.
  const addCitingWork = useCallback(
    async (work: LookupResult): Promise<void> => {
      if (onAddCitingWork) return onAddCitingWork(work);
      await addCitingWorkToLibrary(citation, work);
    },
    [citation, onAddCitingWork]
  );
  const passthroughKeys = useMemo(
    () => Object.keys(bag?.passthrough ?? {}).sort((a, b) => a.localeCompare(b)),
    [bag]
  );
  const notes = useMemo(
    () => (Array.isArray(bag?.notes) ? bag.notes.map(text).filter((n) => n !== "") : []),
    [bag]
  );
  const abstract = text(bag?.abstract);
  const created = text(citation.createdAt);
  const modified = text(citation.modifiedAt);

  const load = useCallback(async (): Promise<void> => {
    setVersionsLoading(true);
    setVersionsError(null);
    try {
      setVersions(await loadVersions());
    } catch (err) {
      setVersionsError(err instanceof Error ? err.message : "Could not read the document's backup.");
    } finally {
      setVersionsLoading(false);
    }
  }, [loadVersions]);

  // A different record (another citation, a save, a restore) means a different
  // history: read it again on the next open, or straight away while open.
  useEffect(() => {
    requested.current = false;
    setVersions(null);
    setVersionsError(null);
  }, [citation]);

  useEffect(() => {
    if (!open || requested.current) return;
    requested.current = true;
    void load();
  }, [open, load]);

  const handleToggle = useCallback((e: React.SyntheticEvent<HTMLDetailsElement>): void => {
    setOpen(e.currentTarget.open);
  }, []);

  const handleRestore = useCallback(
    async (version: CitationVersion): Promise<void> => {
      const when = formatRecordTime(version.timestamp);
      if (!window.confirm(`Restore the version from ${when}? The current values will be replaced.`)) {
        return;
      }
      setRestoring(version.timestamp);
      try {
        // The parent replaces `citation` on success, which reloads the list.
        await onRestore(version);
      } finally {
        setRestoring(null);
      }
    },
    [onRestore]
  );

  const busy = restoring !== null;

  return (
    <details className="record-details" open={open} onToggle={handleToggle}>
      <summary className="record-details-summary">Record details</summary>
      <div className="record-details-body">
        {created && (
          <div className="record-details-row">
            <span className="record-details-key">Created</span>
            <span className="record-details-value">{formatRecordTime(created)}</span>
          </div>
        )}
        {modified && (
          <div className="record-details-row">
            <span className="record-details-key">Modified</span>
            <span className="record-details-value">{formatRecordTime(modified)}</span>
          </div>
        )}
        <div className="record-details-row">
          <span className="record-details-key">Source</span>
          <span className="record-details-value">{sourceDescription(bag)}</span>
        </div>

        {identifiers.length > 0 && (
          <div className="record-details-row">
            <span className="record-details-key">Identifiers</span>
            <ul className="record-details-list" aria-label="Identifiers">
              {identifiers.map((row) => (
                <li key={row.label}>
                  <span className="record-details-key">{row.label}</span>{" "}
                  <span className="record-details-value">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {abstract && (
          <details className="record-details-nested">
            <summary>Abstract</summary>
            <p className="record-details-text">{abstract}</p>
          </details>
        )}

        {notes.length > 0 && (
          <details className="record-details-nested">
            <summary>Notes</summary>
            <ul className="record-details-list">
              {notes.map((note, i) => (
                <li key={i} className="record-details-text">
                  {note}
                </li>
              ))}
            </ul>
          </details>
        )}

        {passthroughKeys.length > 0 && (
          <details className="record-details-nested">
            <summary>
              {passthroughKeys.length}{" "}
              {passthroughKeys.length === 1 ? "passthrough field" : "passthrough fields"} kept for
              export
            </summary>
            <ul className="record-details-list record-details-keys">
              {passthroughKeys.map((key) => (
                <li key={key}>
                  <code>{key}</code>
                </li>
              ))}
            </ul>
          </details>
        )}

        {links.length > 0 && (
          <div className="record-details-row">
            <span className="record-details-key">Links</span>
            <div className="record-details-buttons">
              {links.map((link) => (
                <button
                  key={link.url}
                  type="button"
                  className="edit-btn edit-btn-secondary edit-btn-small"
                  onClick={() => openLink(link.url)}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isCase && (
          <div className="record-details-row">
            <span className="record-details-key">Cases citing this</span>
            <div className="record-details-buttons">
              <button
                type="button"
                className="edit-btn edit-btn-secondary edit-btn-small"
                onClick={() => openLink(lawCiteUrl(citationText))}
              >
                LawCite
              </button>
              {jadeLink && (
                <button
                  type="button"
                  className="edit-btn edit-btn-secondary edit-btn-small"
                  onClick={() => openLink(jadeLink.url)}
                >
                  Jade
                </button>
              )}
            </div>
          </div>
        )}

        {isJournal && <CitedByPanel citation={citation} onAdd={addCitingWork} />}

        <div className="record-details-versions">
          <span className="record-details-key">Previous versions</span>
          <div aria-live="polite" role="status" className="record-details-status">
            {versionsLoading && <span>Looking for previous versions…</span>}
            {!versionsLoading && versionsError && (
              <span className="record-details-error">{versionsError}</span>
            )}
            {!versionsLoading && !versionsError && versions !== null && versions.length === 0 && (
              <span>No previous versions in this document&apos;s backup.</span>
            )}
          </div>
          {versions !== null && versions.length > 0 && (
            <ul className="record-details-list record-details-version-list" aria-label="Previous versions">
              {versions.map((version) => (
                <li key={version.timestamp} className="record-details-version">
                  <span className="record-details-version-text">
                    {formatRecordTime(version.timestamp)} · {REASON_LABELS[version.reason] ?? version.reason}{" "}
                    · changed: {version.changedFields.join(", ")}
                  </span>
                  <button
                    type="button"
                    className="edit-btn edit-btn-secondary edit-btn-small"
                    onClick={() => void handleRestore(version)}
                    disabled={busy}
                  >
                    {restoring === version.timestamp ? "Restoring…" : "Restore this version"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </details>
  );
}
