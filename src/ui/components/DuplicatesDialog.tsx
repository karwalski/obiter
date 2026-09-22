/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * DuplicatesDialog — walks the library's duplicate clusters one at a time
 * (ENP-003). Each cluster lists its members with a "Keep this one" radio,
 * then a FieldMergeTable to pick the value of every field that differs.
 * Merge writes the chosen values to the survivor and re-points the other
 * members' footnotes to it; "Not a duplicate" tags the members so the
 * cluster stops appearing. The dialog owns no document access: the caller
 * passes the service calls in and this component reports their failures.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ModalDialog from "./ModalDialog";
import FieldMergeTable, { buildMergeRows } from "./FieldMergeTable";
import type { FieldMergeColumn } from "./FieldMergeTable";
import type { DuplicateCluster } from "../../api/interchange/dedupe";
import type { Citation, SourceData } from "../../types/citation";
import { getFieldAliases } from "../../engine/fieldAliases";
import { userTags, withUserTags } from "../../engine/tags";
import { writeErrorMessage } from "../../word/documentAccess";

/** A cluster to review; `label` overrides the kind-derived heading (manual merges). */
export interface DuplicatesDialogCluster extends DuplicateCluster {
  label?: string;
}

export interface DuplicatesDialogProps {
  clusters: DuplicatesDialogCluster[];
  /** Renders a member the way the library cards do. */
  formatCitation: (citation: Citation) => string;
  /** Footnote occurrences per citation id, from the library's footnote scan. */
  occurrenceCounts: Record<string, number>;
  /** Performs the merge; resolves to the number of footnotes moved. Throw to report. */
  onMerge: (
    survivorId: string,
    removedIds: string[],
    mergedData: SourceData,
    mergedTags: string[]
  ) => Promise<number | void>;
  /** Marks the cluster as not duplicates. Throw to report. */
  onIgnore: (clusterKey: string, memberIds: string[]) => Promise<void>;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}

export const NO_DUPLICATES_MESSAGE =
  "No duplicates found. Citations match on DOI, ISBN, citation key, medium neutral or report citation, statute title and year, or title, year and first author.";

/** Heading for a cluster: what its members were matched on. */
export function clusterKindLabel(cluster: DuplicatesDialogCluster): string {
  if (cluster.label) return cluster.label;
  switch (cluster.kind) {
    case "doi":
      return "Same DOI";
    case "isbn":
      return "Same ISBN";
    case "cite-key":
      return "Same citation key";
    case "legal":
      if (cluster.key.startsWith("mnc|")) return "Same medium neutral citation";
      if (cluster.key.startsWith("report|")) return "Same report citation";
      if (cluster.key.startsWith("statute|")) return "Same statute";
      return "Same citation";
    case "loose":
      return "Similar title and year";
    default:
      return "Same citation";
  }
}

/** The member to keep by default: the oldest with footnotes, else the oldest. */
export function defaultSurvivor(
  members: Citation[],
  occurrenceCounts: Record<string, number>
): Citation | undefined {
  return members.find((m) => (occurrenceCounts[m.id] ?? 0) > 0) ?? members[0];
}

/**
 * Initial choice for every differing field: the survivor's value, except
 * where the survivor is blank and another member has one.
 */
export function initialSelection(
  survivor: Citation,
  columns: FieldMergeColumn[]
): Record<string, string> {
  const rows = buildMergeRows(survivor.sourceType, columns);
  const selection: Record<string, string> = {};
  for (const row of rows) {
    if (!row.differs) continue;
    if (row.texts[survivor.id]) {
      selection[row.key] = survivor.id;
      continue;
    }
    const filled = columns.find((c) => row.texts[c.id]);
    selection[row.key] = filled ? filled.id : survivor.id;
  }
  return selection;
}

/** The survivor's data with every differing field replaced by the chosen column's value. */
export function buildMergedData(
  survivor: Citation,
  columns: FieldMergeColumn[],
  selection: Record<string, string>
): SourceData {
  const rows = buildMergeRows(survivor.sourceType, columns);
  const merged: SourceData = { ...survivor.data };
  for (const row of rows) {
    if (!row.differs) continue;
    const chosen = selection[row.key] ?? survivor.id;
    const value = row.values[chosen];
    // The canonical key wins; drop aliases so a stale alias cannot shadow it.
    for (const alias of getFieldAliases(row.key)) delete merged[alias];
    if (value === undefined || value === null || row.texts[chosen] === "") {
      delete merged[row.key];
    } else {
      merged[row.key] = value;
    }
  }
  return merged;
}

/** Union of every member's user tags (survivor first) behind the survivor's system tags. */
export function buildMergedTags(survivor: Citation, members: Citation[]): string[] {
  const ordered = [survivor, ...members.filter((m) => m.id !== survivor.id)];
  const union: string[] = [];
  for (const member of ordered) {
    for (const tag of userTags(Array.isArray(member.tags) ? member.tags : [])) {
      if (!union.includes(tag)) union.push(tag);
    }
  }
  return withUserTags(Array.isArray(survivor.tags) ? survivor.tags : [], union);
}

function formatCreated(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString();
}

export default function DuplicatesDialog({
  clusters,
  formatCitation,
  occurrenceCounts,
  onMerge,
  onIgnore,
  onClose,
  returnFocusTo,
}: DuplicatesDialogProps): JSX.Element {
  const [remaining, setRemaining] = useState<DuplicatesDialogCluster[]>(clusters);
  const [index, setIndex] = useState(0);
  const [survivorId, setSurvivorId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const cluster = remaining[index];
  const members = useMemo(() => cluster?.members ?? [], [cluster]);
  const survivor = useMemo(
    () => members.find((m) => m.id === survivorId) ?? defaultSurvivor(members, occurrenceCounts),
    [members, survivorId, occurrenceCounts]
  );
  const columns = useMemo<FieldMergeColumn[]>(
    () =>
      members.map((m, i) => ({
        id: m.id,
        label: `${i + 1}${m.id === survivor?.id ? " (keep)" : ""}`,
        data: m.data,
      })),
    [members, survivor]
  );

  // A new cluster or survivor resets the field choices to their defaults.
  useEffect(() => {
    if (!survivor) return;
    setSelection(initialSelection(survivor, columns));
  }, [survivor, columns]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const goTo = useCallback((next: number) => {
    setIndex(next);
    setSurvivorId(null);
    setError(null);
  }, []);

  const advanceAfter = useCallback(
    (removedIndex: number, message: string) => {
      const next = remaining.filter((_, i) => i !== removedIndex);
      if (next.length === 0) {
        onClose();
        return;
      }
      setRemaining(next);
      setIndex(Math.min(removedIndex, next.length - 1));
      setSurvivorId(null);
      setStatus(message);
    },
    [remaining, onClose]
  );

  const handleMerge = useCallback(async () => {
    if (!cluster || !survivor || busy) return;
    setBusy(true);
    setError(null);
    try {
      const removedIds = members.filter((m) => m.id !== survivor.id).map((m) => m.id);
      await onMerge(
        survivor.id,
        removedIds,
        buildMergedData(survivor, columns, selection),
        buildMergedTags(survivor, members)
      );
      advanceAfter(index, `Merged ${members.length} citations into one.`);
    } catch (err: unknown) {
      setError(writeErrorMessage(err, "The citations could not be merged. Try again."));
    } finally {
      setBusy(false);
    }
  }, [cluster, survivor, busy, members, columns, selection, onMerge, advanceAfter, index]);

  const handleIgnore = useCallback(async () => {
    if (!cluster || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onIgnore(
        cluster.key,
        members.map((m) => m.id)
      );
      advanceAfter(index, "Marked as not duplicates.");
    } catch (err: unknown) {
      setError(writeErrorMessage(err, "The citations could not be marked. Try again."));
    } finally {
      setBusy(false);
    }
  }, [cluster, busy, members, onIgnore, advanceAfter, index]);

  return (
    <ModalDialog
      titleId="duplicates-title"
      busy={busy}
      onClose={onClose}
      wide
      returnFocusTo={returnFocusTo}
    >
      <h3 id="duplicates-title">Find duplicates</h3>
      <div aria-live="polite" role="status" className="duplicates-status">
        {status}
      </div>
      {error && (
        <div className="import-error" role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </div>
      )}
      {!cluster || !survivor ? (
        <>
          <p className="library-modal-description">{NO_DUPLICATES_MESSAGE}</p>
          <div className="library-modal-actions">
            <button className="library-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="duplicates-nav">
            <span className="duplicates-count">
              {index + 1} of {remaining.length}
            </span>
            <span className="duplicates-kind">{clusterKindLabel(cluster)}</span>
            <button
              className="library-btn"
              onClick={() => goTo(index - 1)}
              disabled={busy || index === 0}
              aria-label="Previous duplicate group"
            >
              Previous
            </button>
            <button
              className="library-btn"
              onClick={() => goTo(index + 1)}
              disabled={busy || index >= remaining.length - 1}
              aria-label="Next duplicate group"
            >
              Next
            </button>
          </div>

          <fieldset className="duplicates-members" disabled={busy}>
            <legend>Keep which citation</legend>
            {members.map((member, i) => {
              const text = formatCitation(member);
              const count = occurrenceCounts[member.id] ?? 0;
              const inputId = `duplicates-keep-${member.id}`;
              return (
                <div key={member.id} className="duplicates-member">
                  <input
                    id={inputId}
                    type="radio"
                    name="survivor"
                    value={member.id}
                    checked={member.id === survivor.id}
                    onChange={() => setSurvivorId(member.id)}
                    aria-label={`Keep this one: ${i + 1}, ${text}`}
                  />
                  <label htmlFor={inputId} className="duplicates-member-body">
                    <span className="duplicates-member-index">{i + 1}</span>
                    <span className="duplicates-member-text">{text}</span>
                    <span className="duplicates-member-meta">
                      {count} footnote{count === 1 ? "" : "s"}, added {formatCreated(member.createdAt)}
                    </span>
                  </label>
                </div>
              );
            })}
          </fieldset>

          <FieldMergeTable
            sourceType={survivor.sourceType}
            columns={columns}
            selection={selection}
            onSelect={(key, columnId) =>
              setSelection((prev) => ({ ...prev, [key]: columnId }))
            }
          />

          <div className="library-modal-actions">
            <button
              className="library-btn library-btn--import"
              onClick={() => void handleMerge()}
              disabled={busy}
            >
              {busy ? "Merging" : "Merge"}
            </button>
            <button className="library-btn" onClick={() => void handleIgnore()} disabled={busy}>
              Not a duplicate
            </button>
            <button className="library-btn" onClick={onClose} disabled={busy}>
              Close
            </button>
          </div>
        </>
      )}
    </ModalDialog>
  );
}
