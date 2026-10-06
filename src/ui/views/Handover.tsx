/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-122 (OBI-206): Prepare for handover.
 *
 * One read-mostly check before a document leaves the author:
 *
 *  - validation issues (the same checks as the Validate view);
 *  - footnotes the last refresh left unchanged because they were edited by
 *    hand, and footnotes the user locked;
 *  - Obiter's custom document properties, each with its own Remove button
 *    and an Undo (legacy keys such as Obiter.Author are marked);
 *  - whether the Obiter data part and Obiter's controls are present;
 *  - counts of comments and pending tracked changes (read-only).
 *
 * Nothing changes without an explicit per-item choice. Obiter never removes
 * comments, tracked changes, author metadata, its data part or its controls
 * here, and never touches properties other tools wrote. Office add-ins
 * cannot save a separate copy or export a PDF, so this view does neither.
 */

import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { runDocumentValidation } from "../../engine/documentValidation";
import type { ValidationResult } from "../../engine/validator";
import { getSharedStore } from "../../store/singleton";
import { getDevicePref } from "../../store/devicePreferences";
import {
  obiterPropertyRows,
  otherPropertyCount,
  readHandoverSnapshot,
  removeObiterProperty,
  restoreObiterProperty,
  type HandoverSnapshot,
  type RemovedProperty,
} from "../../word/handoverCheck";
import { hostReportsReadOnly, writeErrorMessage } from "../../word/documentAccess";
import { getRefreshIssues } from "../recoveryQueue";
import { createLogger } from "../../debug/logger";

const log = createLogger("Handover");

/** The disclaimer the acceptance criteria require, word for word. */
export const HANDOVER_DISCLAIMER =
  "Obiter output is compatibility-checked, not guaranteed accepted for filing. " +
  "Check the court's current practice directions before you file.";

const sectionHeadingStyle = { margin: "12px 0 2px", fontSize: "var(--text-sm, 13px)" } as const;
const sectionNoteStyle = {
  margin: "0 0 6px",
  fontSize: "var(--text-min, 12px)",
  color: "var(--colour-text-secondary)",
} as const;
const entryStyle = {
  padding: "6px 0",
  borderBottom: "1px solid var(--colour-border)",
  fontSize: "var(--text-min, 12px)",
} as const;

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

interface CheckResult {
  snapshot: HandoverSnapshot;
  validation: ValidationResult;
  userEdited: number[];
}

export default function Handover(): JSX.Element {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);
  /** Properties removed in this session, by key, kept for Undo. */
  const [removed, setRemoved] = useState<Record<string, RemovedProperty>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const readOnly = hostReportsReadOnly();

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setError(null);
    setActionMessage(null);
    try {
      const store = await getSharedStore();
      const snapshot = await Word.run((context) =>
        readHandoverSnapshot(context, (tag) => store.getById(tag) !== undefined)
      );
      const validation = runDocumentValidation({
        footnoteTexts: snapshot.footnoteTexts,
        bodyText: snapshot.bodyText,
        headingLevels: snapshot.headingLevels,
        citations: store.getAll(),
        standardId: store.getStandardId(),
        writingMode: store.getWritingMode(),
        courtJurisdiction: store.getCourtJurisdiction(),
        courtToggles:
          store.getCourtToggles() ??
          (getDevicePref("courtToggles") as Record<string, string> | undefined),
      });
      const userEdited = getRefreshIssues().userEdits.map((e) => e.footnoteNumber);
      setCheck({ snapshot, validation, userEdited });
    } catch (err: unknown) {
      log.warn("Handover check failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      setError(err instanceof Error ? err.message : "The check could not read the document");
    } finally {
      setChecking(false);
    }
  }, []);

  const handleRemove = useCallback(async (key: string) => {
    setBusyKey(key);
    setActionMessage(null);
    try {
      const result = await Word.run((context) => removeObiterProperty(context, key));
      if (result) {
        setRemoved((prev) => ({ ...prev, [key]: result }));
        setActionMessage(`Removed ${key}. Undo puts it back.`);
      } else {
        setActionMessage(`${key} was already removed.`);
      }
    } catch (err: unknown) {
      setActionMessage(writeErrorMessage(err, `Could not remove ${key}`));
    } finally {
      setBusyKey(null);
    }
  }, []);

  const handleUndo = useCallback(
    async (key: string) => {
      const entry = removed[key];
      if (!entry) return;
      setBusyKey(key);
      setActionMessage(null);
      try {
        await Word.run((context) => restoreObiterProperty(context, entry));
        setRemoved((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setActionMessage(`Put back ${key}.`);
      } catch (err: unknown) {
        setActionMessage(writeErrorMessage(err, `Could not put back ${key}`));
      } finally {
        setBusyKey(null);
      }
    },
    [removed]
  );

  const snapshot = check?.snapshot;
  const listed = snapshot?.properties ? obiterPropertyRows(snapshot.properties) : [];
  // A property removed in this session stays listed with its Undo button,
  // even after "Check again" reads a document that no longer holds it.
  const rows = snapshot?.properties
    ? [
        ...listed,
        ...obiterPropertyRows(
          Object.values(removed).filter((r) => !listed.some((row) => row.key === r.key))
        ),
      ]
    : [];
  const others = snapshot?.properties ? otherPropertyCount(snapshot.properties) : 0;

  return (
    <div className="library-panel">
      <h2>Prepare for handover</h2>
      <p style={sectionNoteStyle}>
        Checks this document before you send or file it. Nothing in the document changes
        unless you choose an action below.
      </p>
      <p role="note" style={{ ...sectionNoteStyle, color: "var(--colour-text-primary)" }}>
        {HANDOVER_DISCLAIMER}
      </p>

      <button
        type="button"
        className="validation-scan-btn"
        onClick={() => void handleCheck()}
        disabled={checking}
      >
        {checking ? "Checking..." : check ? "Check again" : "Check document"}
      </button>

      <div aria-live="polite" role="status">
        {error && (
          <div className="validation-error">
            <p>Error: {error}</p>
          </div>
        )}
        {actionMessage && <p style={sectionNoteStyle}>{actionMessage}</p>}
      </div>

      {check && snapshot && (
        <>
          {/* ── Validation ─────────────────────────────────────────────── */}
          <section aria-labelledby="handover-validation-heading">
            <h3 id="handover-validation-heading" style={sectionHeadingStyle}>
              Citation checks
            </h3>
            <p style={sectionNoteStyle}>
              {plural(check.validation.errors.length, "error")},{" "}
              {plural(check.validation.warnings.length, "warning")} and{" "}
              {check.validation.info.length} for information.
            </p>
            <button type="button" className="library-btn" onClick={() => navigate("/validation")}>
              Open Validate for details
            </button>
          </section>

          {/* ── Footnotes ──────────────────────────────────────────────── */}
          <section aria-labelledby="handover-footnotes-heading">
            <h3 id="handover-footnotes-heading" style={sectionHeadingStyle}>
              Footnotes
            </h3>
            <p style={sectionNoteStyle}>
              {check.userEdited.length === 0
                ? "No manually edited footnotes are waiting for review."
                : `Edited by hand and left unchanged by the last refresh: footnote${
                    check.userEdited.length !== 1 ? "s" : ""
                  } ${check.userEdited.join(", ")}.`}{" "}
              {plural(snapshot.controls.locked, "locked footnote")} (refresh does not change
              them).
            </p>
            {check.userEdited.length > 0 && (
              <button type="button" className="library-btn" onClick={() => navigate("/recovery")}>
                Review in Recovery
              </button>
            )}
          </section>

          {/* ── Obiter document properties ─────────────────────────────── */}
          <section aria-labelledby="handover-properties-heading">
            <h3 id="handover-properties-heading" style={sectionHeadingStyle}>
              Obiter document properties
            </h3>
            {snapshot.properties === undefined ? (
              <p style={sectionNoteStyle}>
                This version of Word does not let add-ins read document properties. Use File
                &gt; Info &gt; Properties to review them.
              </p>
            ) : (
              <>
                <p style={sectionNoteStyle}>
                  Custom properties Obiter wrote into this document. Remove any you do not want
                  to send; each removal can be undone while this pane is open. While the document
                  holds citations, Obiter writes Obiter.Version, Obiter.CitationStyle and
                  Obiter.CreatedDate again when the document is next opened or when you open
                  Settings.{" "}
                  {others > 0 &&
                    `${plural(others, "property", "properties")} from other tools ${
                      others === 1 ? "is" : "are"
                    } not shown and never changed.`}
                </p>
                {rows.length === 0 && (
                  <p className="library-empty">No Obiter properties in this document.</p>
                )}
                {rows.map((row) => (
                  <div key={row.key} style={entryStyle}>
                    <div>
                      <strong>{row.key}</strong>: {row.value}
                    </div>
                    {row.noLongerWritten && (
                      <div style={{ color: "var(--colour-text-secondary)" }}>
                        Written by an earlier release; this release no longer writes it.
                      </div>
                    )}
                    {removed[row.key] ? (
                      <button
                        type="button"
                        className="library-btn"
                        style={{ marginTop: 4 }}
                        disabled={busyKey !== null || readOnly}
                        onClick={() => void handleUndo(row.key)}
                        aria-label={`Undo the removal of ${row.key}`}
                      >
                        {busyKey === row.key ? "Putting back..." : "Undo"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="library-btn"
                        style={{ marginTop: 4 }}
                        disabled={busyKey !== null || readOnly}
                        onClick={() => void handleRemove(row.key)}
                        aria-label={`Remove the property ${row.key}`}
                      >
                        {busyKey === row.key ? "Removing..." : "Remove"}
                      </button>
                    )}
                    {removed[row.key] && (
                      <span style={{ marginLeft: 8 }}>Removed from the document.</span>
                    )}
                  </div>
                ))}
                {readOnly && (
                  <p style={sectionNoteStyle}>
                    This document is open read-only, so properties cannot be removed.
                  </p>
                )}
              </>
            )}
          </section>

          {/* ── Obiter data ────────────────────────────────────────────── */}
          <section aria-labelledby="handover-data-heading">
            <h3 id="handover-data-heading" style={sectionHeadingStyle}>
              Obiter data in this document
            </h3>
            <ul style={{ ...sectionNoteStyle, paddingLeft: 16 }}>
              <li>
                Citation library part:{" "}
                {snapshot.storeParts === undefined
                  ? "could not be read"
                  : snapshot.storeParts > 0
                    ? "present"
                    : "not present"}
                {snapshot.backupParts !== undefined && snapshot.backupParts > 0
                  ? " (with a backup part)"
                  : ""}
              </li>
              <li>{plural(snapshot.controls.footnotes, "managed footnote")}</li>
              <li>{plural(snapshot.controls.citations, "citation control")}</li>
              {snapshot.controls.notices > 0 && (
                <li>{plural(snapshot.controls.notices, "Obiter notice")}</li>
              )}
            </ul>
            <p style={sectionNoteStyle}>
              The library part and the controls keep citations linked to Obiter, so this check
              does not remove them. Readers without Obiter see ordinary text and footnotes.
              Word add-ins cannot save a separate copy or export a PDF; use File &gt; Save a
              Copy or File &gt; Export in Word.
            </p>
          </section>

          {/* ── Review state ───────────────────────────────────────────── */}
          <section aria-labelledby="handover-review-heading">
            <h3 id="handover-review-heading" style={sectionHeadingStyle}>
              Comments and tracked changes
            </h3>
            <ul style={{ ...sectionNoteStyle, paddingLeft: 16 }}>
              <li>
                Comments:{" "}
                {snapshot.comments === undefined
                  ? "not available in this version of Word"
                  : snapshot.comments}
              </li>
              <li>
                Pending tracked changes:{" "}
                {snapshot.pendingRevisions === undefined
                  ? "not available in this version of Word"
                  : snapshot.pendingRevisions}
              </li>
              <li>
                Track Changes:{" "}
                {snapshot.trackingMode === "unknown"
                  ? "not known"
                  : snapshot.trackingMode === "Off"
                    ? "off"
                    : "on"}
              </li>
            </ul>
            <p style={sectionNoteStyle}>
              Obiter does not accept, reject or delete comments or tracked changes, and does
              not change author information. Review them in Word before you send the document.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
