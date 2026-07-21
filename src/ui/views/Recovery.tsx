/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * SAFE-005 / SAFE-007: Recovery view.
 *
 * One place to undo what went wrong, built on the in-document backup layer
 * (SAFE-001/004) rather than Word's undo stack:
 *
 *  - Library snapshots — restore the whole library from the ring buffer.
 *    Restore snapshots the current state first, so a restore is itself
 *    revertible from this same list.
 *  - Footnote history — put back the previous text of a footnote that a
 *    refresh rebuilt. Restored footnotes are locked so refresh never
 *    overwrites them again.
 *  - User-edit review — footnotes the refresher skipped because their text
 *    was manually edited (SAFE-002). Keep the edit (lock the footnote) or
 *    use Obiter's version (rebuild that one footnote).
 *  - Quarantined data (SAFE-007) — store parts that could not be read.
 *    Preview and export the raw XML, or attempt an element-wise salvage
 *    that merges recoverable citations into the library. The quarantined
 *    part itself is never modified or deleted.
 *
 * Confirmations are in-pane modals (window.confirm is blocked in the
 * add-in iframe on Word for the web — WEB-013).
 */

import { useCallback, useEffect, useState } from "react";
import { getSharedStore } from "../../store/singleton";
import { StoreDataLossError } from "../../store/citationStore";
import type { CitationStore, StorePartInfo } from "../../store/citationStore";
import { listSnapshots, getSnapshot, listFootnoteGenerations } from "../../store/backupStore";
import type { SnapshotSummary } from "../../store/backupStore";
import type { FootnoteSnapshot, SnapshotReason } from "../../store/backupSerializer";
import { deserializeStore } from "../../store/xmlSerializer";
import { salvageCitations, filterNewCitations } from "../../store/salvage";
import { restoreFootnoteText, acceptObiterVersion } from "../../word/footnoteBackup";
import { setFootnoteLock } from "../../word/footnoteManager";
import {
  getRefreshIssues,
  resolveUserEdit,
  subscribeRefreshIssues,
} from "../recoveryQueue";
import { useCitationContext } from "../context/CitationContext";
import { useStatus } from "../context/StatusContext";
import { createLogger } from "../../debug/logger";

const log = createLogger("Recovery");

const REASON_LABELS: Record<SnapshotReason, string> = {
  persist: "Automatic backup",
  "pre-restore": "Saved before a restore",
  manual: "Manual backup",
};

/** Format an ISO timestamp for display; fall back to the raw string. */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

/** Describe a snapshot's citation count relative to the current library. */
function deltaLabel(snapshotCount: number, currentCount: number): string {
  const diff = snapshotCount - currentCount;
  if (diff === 0) return "same count as the current library";
  if (diff > 0) return `${diff} more than the current library`;
  return `${Math.abs(diff)} fewer than the current library`;
}

const sectionHeadingStyle = {
  margin: "12px 0 2px",
  fontSize: "var(--text-sm, 13px)",
} as const;

const sectionNoteStyle = {
  margin: "0 0 6px",
  fontSize: "var(--text-min, 12px)",
  color: "var(--colour-text-secondary)",
} as const;

const entryStyle = {
  borderTop: "1px solid var(--colour-border, #ddd)",
  padding: "6px 0",
  fontSize: "var(--text-min, 12px)",
} as const;

/** Long text with an inline expand/collapse control. */
function TruncatedText({ text, limit = 140 }: { text: string; limit?: number }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= limit) {
    return <span>{text}</span>;
  }
  return (
    <span>
      {expanded ? text : `${text.slice(0, limit)}…`}{" "}
      <button
        type="button"
        className="library-btn"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? "Show less" : "Show full text"}
      </button>
    </span>
  );
}

/** Trigger a browser download of the given XML, byte-exact. */
function downloadXmlFile(partId: string, xml: string): void {
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `obiter-quarantined-${partId.replace(/[^A-Za-z0-9_-]/g, "")}.xml`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function Recovery(): JSX.Element {
  const { triggerRefresh } = useCitationContext();
  const { announce } = useStatus();

  const [store, setStore] = useState<CitationStore | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [currentCount, setCurrentCount] = useState(0);
  const [quarantined, setQuarantined] = useState<StorePartInfo[]>([]);

  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [generations, setGenerations] = useState<FootnoteSnapshot[]>([]);
  const [generationsError, setGenerationsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [issues, setIssues] = useState(() => getRefreshIssues());

  /** Key of the action in flight ("restore-<ts>", "fn-...", "salvage-<id>"). */
  const [busy, setBusy] = useState<string | null>(null);
  /** Snapshot awaiting first-stage restore confirmation. */
  const [pendingRestore, setPendingRestore] = useState<SnapshotSummary | null>(null);
  /** Empty-snapshot restore awaiting the explicit second confirmation. */
  const [pendingEmptyRestore, setPendingEmptyRestore] = useState<{
    snapshot: SnapshotSummary;
    libraryCount: number;
  } | null>(null);

  /** Lazily fetched raw XML per quarantined part id. */
  const [partXml, setPartXml] = useState<Record<string, string>>({});
  /** Part ids whose raw XML preview is open. */
  const [openPreviews, setOpenPreviews] = useState<Record<string, boolean>>({});
  /** Last salvage report per part id. */
  const [salvageReports, setSalvageReports] = useState<Record<string, string>>({});

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const shared = await getSharedStore();
        if (cancelled) return;
        setStore(shared);
        setCurrentCount(shared.getAll().length);
        setQuarantined(shared.getDiagnostics().parts.filter((p) => p.citationCount === null));
        setStoreError(null);
      } catch (err: unknown) {
        if (!cancelled) {
          setStoreError(err instanceof Error ? err.message : String(err));
        }
      }
      try {
        const list = await listSnapshots();
        if (!cancelled) {
          setSnapshots(list);
          setSnapshotsError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setSnapshotsError(err instanceof Error ? err.message : String(err));
        }
      }
      try {
        const gens = await listFootnoteGenerations();
        if (!cancelled) {
          setGenerations(gens);
          setGenerationsError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setGenerationsError(err instanceof Error ? err.message : String(err));
        }
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  // Re-render the user-edit queue when a refresh reports new issues.
  useEffect(() => subscribeRefreshIssues(() => setIssues(getRefreshIssues())), []);

  const reload = useCallback(() => setReloadNonce((n) => n + 1), []);

  // ── Library snapshot restore ──────────────────────────────────────────────

  const performRestore = useCallback(
    async (summary: SnapshotSummary, allowEmpty: boolean): Promise<void> => {
      if (!store) return;
      setBusy(`restore-${summary.timestamp}`);
      try {
        const snapshot = await getSnapshot(summary.timestamp);
        if (!snapshot) {
          throw new Error(
            "The snapshot is no longer available in this document. It may have been replaced by newer backups."
          );
        }
        const data = deserializeStore(snapshot.storeXml);
        try {
          await store.restoreFromSnapshot(data, allowEmpty ? { allowEmpty: true } : {});
        } catch (err: unknown) {
          if (err instanceof StoreDataLossError && !allowEmpty) {
            // Empty snapshot over a populated library: require the explicit
            // second confirmation before retrying with allowEmpty.
            setPendingEmptyRestore({ snapshot: summary, libraryCount: store.getAll().length });
            return;
          }
          throw err;
        }
        setCurrentCount(store.getAll().length);
        announce(
          `Library restored from the snapshot of ${formatTimestamp(summary.timestamp)} ` +
            `(${summary.citationCount} citation${summary.citationCount !== 1 ? "s" : ""}). ` +
            `The previous library was backed up first, so this restore can be reverted.`,
          "success"
        );
        triggerRefresh();
        reload();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log.error("Snapshot restore failed", { timestamp: summary.timestamp, error: message });
        announce(`Restore failed: ${message}`, "error");
      } finally {
        setBusy(null);
      }
    },
    [store, announce, triggerRefresh, reload]
  );

  // ── Footnote history restore ──────────────────────────────────────────────

  const handleRestoreFootnote = useCallback(
    async (footnoteNumber: number, previousText: string, key: string): Promise<void> => {
      setBusy(key);
      try {
        await restoreFootnoteText(footnoteNumber, previousText);
        announce(
          `Footnote ${footnoteNumber} restored to its previous text. The footnote is now ` +
            `locked so refresh keeps it as it reads; unlock it to return to automatic formatting.`,
          "success"
        );
        triggerRefresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log.error("Footnote restore failed", { footnoteNumber, error: message });
        announce(message, "error");
      } finally {
        setBusy(null);
      }
    },
    [announce, triggerRefresh]
  );

  // ── User-edit review ──────────────────────────────────────────────────────

  const handleKeepEdit = useCallback(
    async (footnoteNumber: number): Promise<void> => {
      setBusy(`keep-${footnoteNumber}`);
      try {
        await setFootnoteLock(footnoteNumber, true);
        resolveUserEdit(footnoteNumber);
        setIssues(getRefreshIssues());
        announce(
          `Footnote ${footnoteNumber} is locked. Refresh will keep your edited text.`,
          "success"
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log.error("Keep-edit lock failed", { footnoteNumber, error: message });
        announce(`Could not lock footnote ${footnoteNumber}: ${message}`, "error");
      } finally {
        setBusy(null);
      }
    },
    [announce]
  );

  const handleUseObiterVersion = useCallback(
    async (footnoteNumber: number): Promise<void> => {
      if (!store) return;
      setBusy(`accept-${footnoteNumber}`);
      try {
        await acceptObiterVersion(footnoteNumber, store);
        resolveUserEdit(footnoteNumber);
        setIssues(getRefreshIssues());
        announce(
          `Footnote ${footnoteNumber} was rebuilt with Obiter's version. The replaced text ` +
            `was saved to Footnote history first.`,
          "success"
        );
        triggerRefresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log.error("Use-Obiter-version failed", { footnoteNumber, error: message });
        announce(`Could not rebuild footnote ${footnoteNumber}: ${message}`, "error");
      } finally {
        setBusy(null);
      }
    },
    [store, announce, triggerRefresh]
  );

  // ── Quarantined parts (SAFE-007) ──────────────────────────────────────────

  const fetchPartXml = useCallback(
    async (partId: string): Promise<string | null> => {
      if (!store) return null;
      if (partXml[partId] !== undefined) return partXml[partId];
      const xml = await store.getQuarantinedPartXml(partId);
      if (xml !== null) {
        setPartXml((prev) => ({ ...prev, [partId]: xml }));
      }
      return xml;
    },
    [store, partXml]
  );

  const handleTogglePreview = useCallback(
    async (partId: string): Promise<void> => {
      if (openPreviews[partId]) {
        setOpenPreviews((prev) => ({ ...prev, [partId]: false }));
        return;
      }
      setBusy(`preview-${partId}`);
      try {
        const xml = await fetchPartXml(partId);
        if (xml === null) {
          announce("The quarantined data could not be found in the document.", "error");
          return;
        }
        setOpenPreviews((prev) => ({ ...prev, [partId]: true }));
      } catch (err: unknown) {
        announce(
          `Could not read the quarantined data: ${err instanceof Error ? err.message : String(err)}`,
          "error"
        );
      } finally {
        setBusy(null);
      }
    },
    [openPreviews, fetchPartXml, announce]
  );

  const handleDownload = useCallback(
    async (partId: string): Promise<void> => {
      setBusy(`download-${partId}`);
      try {
        const xml = await fetchPartXml(partId);
        if (xml === null) {
          announce("The quarantined data could not be found in the document.", "error");
          return;
        }
        downloadXmlFile(partId, xml);
        announce("Quarantined data exported as an XML file.", "success");
      } catch (err: unknown) {
        announce(
          `Could not export the quarantined data: ${err instanceof Error ? err.message : String(err)}`,
          "error"
        );
      } finally {
        setBusy(null);
      }
    },
    [fetchPartXml, announce]
  );

  const handleSalvage = useCallback(
    async (partId: string): Promise<void> => {
      if (!store) return;
      setBusy(`salvage-${partId}`);
      try {
        const xml = await fetchPartXml(partId);
        if (xml === null) {
          announce("The quarantined data could not be found in the document.", "error");
          return;
        }
        // Read-only over the quarantined part: salvage parses a copy of its
        // XML and merges into the library. The part itself is never touched.
        const result = salvageCitations(xml);
        const existingIds = new Set(store.getAll().map((c) => c.id));
        const fresh = filterNewCitations(result.citations, existingIds);
        const added = await store.addMany(fresh);
        setCurrentCount(store.getAll().length);

        const skipped = result.citations.length - fresh.length;
        const parts: string[] = [
          `Salvage found ${result.citations.length} citation${result.citations.length !== 1 ? "s" : ""}`,
          `${added} added to the library`,
        ];
        if (skipped > 0) parts.push(`${skipped} already in the library`);
        if (result.errors.length > 0) {
          parts.push(
            `${result.errors.length} element${result.errors.length !== 1 ? "s" : ""} could not be read`
          );
        }
        const report = `${parts.join(", ")}. The quarantined data was left unchanged.`;
        setSalvageReports((prev) => ({ ...prev, [partId]: report }));
        log.info("Salvage completed", {
          partId,
          found: result.citations.length,
          added,
          skipped,
          errors: result.errors,
        });
        announce(report, added > 0 ? "success" : "info");
        if (added > 0) triggerRefresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log.error("Salvage failed", { partId, error: message });
        announce(`Salvage failed: ${message}`, "error");
      } finally {
        setBusy(null);
      }
    },
    [store, fetchPartXml, announce, triggerRefresh]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="library-panel">
        <h2>Recovery</h2>
        <p role="status">Reading backups from the document...</p>
      </div>
    );
  }

  const userEdits = issues.userEdits;
  const failures = issues.failures;

  return (
    <div className="library-panel">
      <h2>Recovery</h2>
      <p style={sectionNoteStyle}>
        Restore points saved inside this document: library snapshots, previous footnote
        texts, manually edited footnotes awaiting review, and quarantined data. Nothing
        here changes the document until you choose an action.
      </p>

      {storeError && (
        <p style={{ color: "var(--colour-error)" }} role="alert">
          The citation store could not be loaded: {storeError}. Snapshot and footnote
          restore remain available once the store loads; reopen the task pane and try again.
        </p>
      )}

      {/* ── Library snapshots ─────────────────────────────────────────────── */}
      <section aria-labelledby="recovery-snapshots-heading">
        <h3 id="recovery-snapshots-heading" style={sectionHeadingStyle}>
          Library snapshots ({snapshots.length})
        </h3>
        <p style={sectionNoteStyle}>
          The library currently holds {currentCount} citation{currentCount !== 1 ? "s" : ""}.
          Restoring a snapshot replaces the whole library; the current library is backed up
          first, so a restore can itself be reverted from this list.
        </p>
        {snapshotsError && (
          <p style={{ color: "var(--colour-error)" }} role="alert">
            Snapshots could not be read: {snapshotsError}
          </p>
        )}
        {!snapshotsError && snapshots.length === 0 && (
          <p className="library-empty">
            No library snapshots yet. Obiter saves one automatically each time the citation
            store changes.
          </p>
        )}
        {snapshots.map((snap) => (
          <div key={snap.timestamp} style={entryStyle}>
            <div>
              <strong>{formatTimestamp(snap.timestamp)}</strong> — {REASON_LABELS[snap.reason]}
            </div>
            <div style={{ color: "var(--colour-text-secondary)" }}>
              {snap.citationCount} citation{snap.citationCount !== 1 ? "s" : ""} (
              {deltaLabel(snap.citationCount, currentCount)})
            </div>
            <button
              type="button"
              className="library-btn"
              style={{ marginTop: 4 }}
              disabled={busy !== null || !store}
              onClick={() => setPendingRestore(snap)}
              aria-label={`Restore the library snapshot of ${formatTimestamp(snap.timestamp)}`}
            >
              {busy === `restore-${snap.timestamp}` ? "Restoring..." : "Restore"}
            </button>
          </div>
        ))}
      </section>

      {/* ── Footnote history ──────────────────────────────────────────────── */}
      <section aria-labelledby="recovery-footnotes-heading">
        <h3 id="recovery-footnotes-heading" style={sectionHeadingStyle}>
          Footnote history ({generations.length})
        </h3>
        <p style={sectionNoteStyle}>
          The text each footnote held before a refresh rebuilt it. Restoring locks the
          footnote so refresh keeps the restored text; unlock it later to return to
          automatic formatting.
        </p>
        {generationsError && (
          <p style={{ color: "var(--colour-error)" }} role="alert">
            Footnote history could not be read: {generationsError}
          </p>
        )}
        {!generationsError && generations.length === 0 && (
          <p className="library-empty">
            No footnote history yet. Obiter saves the previous text of each footnote before
            a refresh rebuilds it.
          </p>
        )}
        {generations.map((generation, genIndex) => (
          <div key={generation.timestamp} style={entryStyle}>
            <div>
              <strong>Before the refresh of {formatTimestamp(generation.timestamp)}</strong>
            </div>
            {generation.footnotes.map((fn) => {
              const key = `fn-${genIndex}-${fn.n}`;
              return (
                <div key={key} style={{ margin: "4px 0 0 8px" }}>
                  <div>
                    Footnote {fn.n}: <TruncatedText text={fn.text} />
                  </div>
                  <button
                    type="button"
                    className="library-btn"
                    style={{ marginTop: 2 }}
                    disabled={busy !== null}
                    onClick={() => void handleRestoreFootnote(fn.n, fn.text, key)}
                    aria-label={`Restore the previous text of footnote ${fn.n} from ${formatTimestamp(generation.timestamp)}`}
                  >
                    {busy === key ? "Restoring..." : "Restore previous text"}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </section>

      {/* ── User-edit review ──────────────────────────────────────────────── */}
      <section aria-labelledby="recovery-edits-heading">
        <h3 id="recovery-edits-heading" style={sectionHeadingStyle}>
          Manually edited footnotes ({userEdits.length})
        </h3>
        <p style={sectionNoteStyle}>
          Footnotes the last refresh left unchanged because their text was edited by hand.
          Keep your edit to lock the footnote, or use Obiter&apos;s version to rebuild it.
        </p>
        {userEdits.length === 0 && (
          <p className="library-empty">
            No edited footnotes are waiting for review. Refresh detects manual edits and
            lists them here instead of overwriting them.
          </p>
        )}
        {userEdits.map((edit) => (
          <div key={edit.footnoteNumber} style={entryStyle}>
            <div>
              <strong>Footnote {edit.footnoteNumber}</strong>
            </div>
            <div style={{ margin: "2px 0 0 8px" }}>
              Your text: <TruncatedText text={edit.currentText} />
            </div>
            <div style={{ margin: "2px 0 0 8px" }}>
              Obiter&apos;s version: <TruncatedText text={edit.expectedText} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="library-btn"
                disabled={busy !== null}
                onClick={() => void handleKeepEdit(edit.footnoteNumber)}
                aria-label={`Keep my edit in footnote ${edit.footnoteNumber} and lock it`}
              >
                {busy === `keep-${edit.footnoteNumber}` ? "Locking..." : "Keep my edit"}
              </button>
              <button
                type="button"
                className="library-btn"
                disabled={busy !== null || !store}
                onClick={() => void handleUseObiterVersion(edit.footnoteNumber)}
                aria-label={`Replace footnote ${edit.footnoteNumber} with Obiter's version`}
              >
                {busy === `accept-${edit.footnoteNumber}` ? "Rebuilding..." : "Use Obiter's version"}
              </button>
            </div>
          </div>
        ))}
        {failures.length > 0 && (
          <div role="alert" style={{ marginTop: 8 }}>
            <strong style={{ fontSize: "var(--text-min, 12px)" }}>
              Refresh failures ({failures.length})
            </strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: "var(--text-min, 12px)" }}>
              {failures.map((failure, index) => (
                <li key={index}>
                  Footnote{failure.footnoteNumbers.length !== 1 ? "s" : ""}{" "}
                  {failure.footnoteNumbers.join(", ")}: {failure.error}
                </li>
              ))}
            </ul>
            <p style={sectionNoteStyle}>
              These footnotes were not changed. Run Refresh All to retry; if a footnote keeps
              failing, its previous text remains available in Footnote history.
            </p>
          </div>
        )}
      </section>

      {/* ── Quarantined data (SAFE-007) ───────────────────────────────────── */}
      <section aria-labelledby="recovery-quarantine-heading">
        <h3 id="recovery-quarantine-heading" style={sectionHeadingStyle}>
          Quarantined data ({quarantined.length})
        </h3>
        <p style={sectionNoteStyle}>
          Citation data found in the document that could not be read. Obiter never deletes
          or modifies it. You can inspect it, export it as a file, or attempt a salvage that
          copies recoverable citations into the library.
        </p>
        {quarantined.length === 0 && (
          <p className="library-empty">No quarantined data was found in this document.</p>
        )}
        {quarantined.map((part) => (
          <div key={part.partId} style={entryStyle}>
            <div>
              <strong>Stored data ({part.xmlLength.toLocaleString()} characters)</strong>
            </div>
            <div style={{ color: "var(--colour-text-secondary)" }}>
              {part.errorReason === "newer-schema"
                ? "This data was created by a newer version of Obiter. Update Obiter to read it in full; salvage may still recover individual citations."
                : `The data could not be read${part.error ? ` (${part.error})` : ""}.`}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <button
                type="button"
                className="library-btn"
                disabled={busy !== null || !store}
                onClick={() => void handleTogglePreview(part.partId)}
                aria-expanded={!!openPreviews[part.partId]}
                aria-label={`${openPreviews[part.partId] ? "Hide" : "Show"} the raw XML of the quarantined data`}
              >
                {busy === `preview-${part.partId}`
                  ? "Reading..."
                  : openPreviews[part.partId]
                    ? "Hide XML"
                    : "Show XML"}
              </button>
              <button
                type="button"
                className="library-btn"
                disabled={busy !== null || !store}
                onClick={() => void handleDownload(part.partId)}
                aria-label="Download the quarantined data as an XML file"
              >
                {busy === `download-${part.partId}` ? "Exporting..." : "Download XML"}
              </button>
              <button
                type="button"
                className="library-btn library-btn--insert"
                disabled={busy !== null || !store}
                onClick={() => void handleSalvage(part.partId)}
                aria-label="Attempt to salvage citations from the quarantined data"
              >
                {busy === `salvage-${part.partId}` ? "Salvaging..." : "Attempt salvage"}
              </button>
            </div>
            {openPreviews[part.partId] && partXml[part.partId] !== undefined && (
              <>
                {/* Scrollable content must be keyboard-reachable (WCAG 2.1.1);
                    a labelled focusable region is the accepted pattern. */}
                {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
                <pre tabIndex={0}
                role="region"
                aria-label="Raw XML of the quarantined data"
                style={{
                  maxHeight: 200,
                  overflow: "auto",
                  border: "1px solid var(--colour-border, #ddd)",
                  padding: 6,
                  marginTop: 6,
                  fontSize: 11,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
                >
                  {partXml[part.partId]}
                </pre>
              </>
            )}
            <div aria-live="polite" role="status">
              {salvageReports[part.partId] && (
                <p style={{ ...sectionNoteStyle, marginTop: 6 }}>{salvageReports[part.partId]}</p>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ── In-pane confirmations (window.confirm is blocked on Word web) ── */}
      {pendingRestore && (
        <div className="error-reporter-overlay" role="dialog" aria-modal="true">
          <div className="error-reporter-modal">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Restore this snapshot?</h3>
            <p style={{ fontSize: 12, color: "var(--colour-text-secondary)" }}>
              The library will be replaced with the snapshot of{" "}
              {formatTimestamp(pendingRestore.timestamp)} ({pendingRestore.citationCount}{" "}
              citation{pendingRestore.citationCount !== 1 ? "s" : ""}). The current library (
              {currentCount} citation{currentCount !== 1 ? "s" : ""}) is backed up first, so
              this restore can be reverted from the snapshot list.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="error-reporter-btn-primary"
                onClick={() => {
                  const snap = pendingRestore;
                  setPendingRestore(null);
                  void performRestore(snap, false);
                }}
              >
                Restore snapshot
              </button>
              <button
                type="button"
                className="error-reporter-btn"
                onClick={() => setPendingRestore(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingEmptyRestore && (
        <div className="error-reporter-overlay" role="dialog" aria-modal="true">
          <div className="error-reporter-modal">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>The snapshot is empty</h3>
            <p style={{ fontSize: 12, color: "var(--colour-text-secondary)" }}>
              The snapshot is empty and the library has {pendingEmptyRestore.libraryCount}{" "}
              citation{pendingEmptyRestore.libraryCount !== 1 ? "s" : ""}. Restoring it will
              remove every citation from the library. The current library is backed up
              first, so this can still be reverted from the snapshot list.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="error-reporter-btn-primary"
                onClick={() => {
                  const pending = pendingEmptyRestore;
                  setPendingEmptyRestore(null);
                  void performRestore(pending.snapshot, true);
                }}
              >
                Restore the empty snapshot
              </button>
              <button
                type="button"
                className="error-reporter-btn"
                onClick={() => setPendingEmptyRestore(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
