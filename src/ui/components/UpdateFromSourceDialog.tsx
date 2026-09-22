/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * UpdateFromSourceDialog — refetches one citation from its online source
 * (ENP-007) and lays the result beside the library's values in a
 * FieldMergeTable. Fields the library has blank pre-select the fetched
 * value; every other difference waits for the user. Apply hands the merged
 * data, stamped with adapter provenance, to the caller — the dialog owns no
 * store access.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ModalDialog from "./ModalDialog";
import FieldMergeTable, { buildMergeRows } from "./FieldMergeTable";
import type { FieldMergeColumn } from "./FieldMergeTable";
import type { Citation, SourceData } from "../../types/citation";
import type { SourceType } from "../../types/citation";
import { getFieldsForSourceType } from "../views/editCitationFields";
import type { FieldDefinition } from "../views/editCitationFields";
import { getFieldAliases } from "../../engine/fieldAliases";
import { fetchSourceUpdate } from "../../api/updateFromSource";
import type { SourceUpdateResult } from "../../api/updateFromSource";
import { INTERCHANGE_DATA_KEY } from "../../api/interchange/model";
import type { CitationInterchangeBag, InterchangeProvenance } from "../../api/interchange/model";
import { writeErrorMessage } from "../../word/documentAccess";

export interface UpdateFromSourceDialogProps {
  citation: Citation;
  /** The formatted citation, without its closing full stop, for adapter resolve. */
  citationText: string;
  /** Receives the merged data and how many fields changed. Throw to report. */
  onApply: (
    mergedData: SourceData,
    appliedCount: number,
    result: SourceUpdateResult
  ) => Promise<void> | void;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}

const CURRENT = "current";
const SOURCE = "source";

/** Labels for identifiers the mapper keeps that no form field lists. */
const EXTRA_LABELS: Readonly<Record<string, string>> = {
  doi: "DOI",
  frliId: "Federal Register identifier",
  mnc: "Medium neutral citation",
};

/** The form's fields plus a labelled row for each identifier the fetch supplied. */
export function mergeFieldsFor(sourceType: string, fetched: SourceData): FieldDefinition[] {
  const base = getFieldsForSourceType(sourceType as SourceType);
  const known = new Set<string>();
  for (const field of base) {
    known.add(field.key);
    for (const alias of field.aliases ?? getFieldAliases(field.key)) known.add(alias);
  }
  const extras: FieldDefinition[] = [];
  for (const key of Object.keys(fetched)) {
    if (known.has(key)) continue;
    known.add(key);
    extras.push({ key, label: EXTRA_LABELS[key] ?? key });
  }
  return [...base, ...extras];
}

/** The fetched column: the library's data with every mapped field replaced. */
export function sourceColumnData(citation: Citation, fields: SourceData): SourceData {
  const data: SourceData = { ...citation.data, ...fields };
  for (const key of Object.keys(fields)) {
    for (const alias of getFieldAliases(key)) {
      if (!(alias in fields)) delete data[alias];
    }
  }
  return data;
}

/** Fetched values win only where the library is blank; other differences keep the current value. */
export function initialSelection(
  sourceType: string,
  columns: FieldMergeColumn[],
  fields: FieldDefinition[]
): Record<string, string> {
  const selection: Record<string, string> = {};
  for (const row of buildMergeRows(sourceType, columns, fields)) {
    if (!row.differs) continue;
    selection[row.key] = row.texts[CURRENT] ? CURRENT : SOURCE;
  }
  return selection;
}

/** The library's data with each field chosen from the source replaced, plus adapter provenance. */
export function buildAppliedData(
  citation: Citation,
  columns: FieldMergeColumn[],
  fields: FieldDefinition[],
  selection: Record<string, string>,
  result: SourceUpdateResult,
  now: string
): { data: SourceData; applied: number } {
  const merged: SourceData = { ...citation.data };
  let applied = 0;
  for (const row of buildMergeRows(citation.sourceType, columns, fields)) {
    if (!row.differs || selection[row.key] !== SOURCE) continue;
    applied += 1;
    for (const alias of getFieldAliases(row.key)) delete merged[alias];
    const value = row.values[SOURCE];
    if (value === undefined || value === null || row.texts[SOURCE] === "") {
      delete merged[row.key];
    } else {
      merged[row.key] = value;
    }
  }
  const existing = citation.data[INTERCHANGE_DATA_KEY] as Partial<CitationInterchangeBag> | undefined;
  const previous = existing?.provenance;
  const sourceUrl =
    typeof result.metadata?.sourceUrl === "string" ? result.metadata.sourceUrl : previous?.sourceUrl;
  const provenance: InterchangeProvenance = {
    ...previous,
    format: "adapter",
    rawType: previous?.rawType ?? citation.sourceType,
    adapterId: result.adapterId,
    sourceLabel: result.adapterLabel,
    retrievedAt: now,
  };
  if (result.rawId ?? previous?.rawId) provenance.rawId = result.rawId ?? previous?.rawId;
  if (sourceUrl) provenance.sourceUrl = sourceUrl;
  merged[INTERCHANGE_DATA_KEY] = { ...existing, v: 1, provenance };
  return { data: merged, applied };
}

export default function UpdateFromSourceDialog({
  citation,
  citationText,
  onApply,
  onClose,
  returnFocusTo,
}: UpdateFromSourceDialogProps): JSX.Element {
  const [checking, setChecking] = useState<string | null>("Checking sources");
  const [result, setResult] = useState<SourceUpdateResult | null>(null);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setChecking("Checking sources");
    setResult(null);
    fetchSourceUpdate(citation, citationText, {
      onAttempt: ({ label }) => {
        if (!cancelled) setChecking(`Checking ${label}`);
      },
    })
      .then((next) => {
        if (cancelled) return;
        setResult(next);
        setChecking(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          status: "unavailable",
          message: writeErrorMessage(err, "The source could not be checked. Try again."),
        });
        setChecking(null);
      });
    return () => {
      cancelled = true;
    };
  }, [citation, citationText]);

  const label = result?.adapterLabel ?? "the source";
  const fields = useMemo(
    () => mergeFieldsFor(citation.sourceType, result?.fields ?? {}),
    [citation.sourceType, result]
  );
  const columns = useMemo<FieldMergeColumn[]>(
    () => [
      { id: CURRENT, label: "Current", data: citation.data },
      { id: SOURCE, label: `From ${label}`, data: sourceColumnData(citation, result?.fields ?? {}) },
    ],
    [citation, result, label]
  );

  useEffect(() => {
    if (result?.status !== "updated") return;
    setSelection(initialSelection(citation.sourceType, columns, fields));
  }, [result, citation.sourceType, columns, fields]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const selectedCount = Object.values(selection).filter((column) => column === SOURCE).length;

  const handleApply = useCallback(async () => {
    if (!result || result.status !== "updated" || busy || selectedCount === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { data, applied } = buildAppliedData(
        citation,
        columns,
        fields,
        selection,
        result,
        new Date().toISOString()
      );
      await onApply(data, applied, result);
      onClose();
    } catch (err: unknown) {
      setError(writeErrorMessage(err, "The citation could not be updated. Try again."));
    } finally {
      setBusy(false);
    }
  }, [result, busy, selectedCount, citation, columns, fields, selection, onApply, onClose]);

  const confidence = result?.confidence;

  return (
    <ModalDialog
      titleId="update-from-source-title"
      busy={busy}
      onClose={onClose}
      wide={result?.status === "updated"}
      returnFocusTo={returnFocusTo}
    >
      <h3 id="update-from-source-title">Update from source</h3>
      {error && (
        <div className="import-error" role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </div>
      )}
      {checking !== null || !result ? (
        <>
          <p className="library-modal-description update-source-checking" role="status">
            {checking ?? "Checking sources"}
            <span aria-hidden="true">…</span>
          </p>
          <div className="library-modal-actions">
            <button className="library-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </>
      ) : result.status === "unavailable" ? (
        <>
          <p className="library-modal-description" role="status">
            {result.message ?? "The source could not be checked. Try again."}
          </p>
          <div className="library-modal-actions">
            <button className="library-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      ) : result.status === "same" ? (
        <>
          <p className="library-modal-description" role="status">
            Already up to date with {label}.
          </p>
          {result.attribution && <p className="update-source-attribution">{result.attribution}</p>}
          <div className="library-modal-actions">
            <button className="library-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      ) : (
        <>
          {result.attribution && <p className="update-source-attribution">{result.attribution}</p>}
          {confidence !== undefined && confidence < 0 && (
            <p className="update-source-warning" role="status">
              Key details from {label} differ from this citation. Check each value before applying.
            </p>
          )}
          {confidence !== undefined && confidence >= 0 && (
            <p className="update-source-confidence">
              Match confidence: {Math.round(confidence * 100)}%
            </p>
          )}
          <FieldMergeTable
            sourceType={citation.sourceType}
            columns={columns}
            selection={selection}
            onSelect={(key, columnId) =>
              setSelection((prev) => ({ ...prev, [key]: columnId }))
            }
            fieldsOverride={fields}
          />
          <div className="library-modal-actions">
            <button
              className="library-btn library-btn--import"
              onClick={() => void handleApply()}
              disabled={busy || selectedCount === 0}
              title={selectedCount === 0 ? "Choose at least one value from the source" : undefined}
            >
              {busy ? "Applying" : "Apply selected"}
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
