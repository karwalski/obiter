/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-008: the "Cited by" section of the Record details panel for journal
 * articles. Nothing is fetched until the user asks: a "Look up citing works"
 * button runs the lookup (OpenAlex for the rows, Crossref for a count), then
 * the count and the citing works are listed with "Open" and "Add to library"
 * actions. A record without a DOI, or a lookup that is switched off in
 * Settings, gets a plain explanation instead of a button.
 */

import { useCallback, useEffect, useState } from "react";
import type { Citation } from "../../types/citation";
import type { CitedByResult, LookupResult } from "../../api/sourceAdapter";
import { CITED_BY_NO_DOI, citedByForCitation, doiForCitation, isCitedByUnavailable } from "../../api/citedBy";

export interface CitedByPanelProps {
  citation: Citation;
  /** Add a citing work to the library; rejects with a plain message on failure. */
  onAdd(work: LookupResult): Promise<void>;
}

type PanelState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; result: CitedByResult }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

function openLink(url: string): void {
  window.open(url, "_blank", "noopener");
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function CitedByPanel({ citation, onAdd }: CitedByPanelProps): JSX.Element {
  const [state, setState] = useState<PanelState>({ kind: "idle" });
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<ReadonlySet<string>>(() => new Set());
  const [status, setStatus] = useState<string>("");

  const hasDoi = doiForCitation(citation) !== "";

  // A different record means a different answer: back to the button.
  useEffect(() => {
    setState({ kind: "idle" });
    setAdding(null);
    setAdded(new Set());
    setStatus("");
  }, [citation]);

  const lookUp = useCallback(async (): Promise<void> => {
    setState({ kind: "loading" });
    setStatus("");
    try {
      const outcome = await citedByForCitation(citation);
      if (isCitedByUnavailable(outcome)) {
        setState({ kind: "unavailable", message: outcome.unavailable });
      } else {
        setState({ kind: "ready", result: outcome });
      }
    } catch (err) {
      setState({ kind: "error", message: errorMessage(err, "Citing works could not be retrieved.") });
    }
  }, [citation]);

  const handleAdd = useCallback(
    async (work: LookupResult): Promise<void> => {
      setAdding(work.sourceId);
      setStatus("");
      try {
        await onAdd(work);
        setAdded((prev) => new Set(prev).add(work.sourceId));
        setStatus("Added to the library.");
      } catch (err) {
        setStatus(errorMessage(err, "The citing work could not be added."));
      } finally {
        setAdding(null);
      }
    },
    [onAdd]
  );

  const busy = state.kind === "loading";

  return (
    <details className="record-details-nested cited-by">
      <summary>Cited by</summary>
      <div className="cited-by-body">
        {!hasDoi && <p className="cited-by-note">{CITED_BY_NO_DOI}</p>}

        {hasDoi && state.kind === "idle" && (
          <button
            type="button"
            className="edit-btn edit-btn-secondary edit-btn-small"
            onClick={() => void lookUp()}
          >
            Look up citing works
          </button>
        )}

        <div aria-live="polite" role="status" className="cited-by-status">
          {state.kind === "loading" && <span>Looking up citing works…</span>}
          {state.kind === "unavailable" && <span>{state.message}</span>}
          {state.kind === "error" && <span className="record-details-error">{state.message}</span>}
          {status && <span>{status}</span>}
        </div>

        {state.kind === "ready" && (
          <>
            <p className="cited-by-count">
              {state.result.count !== null
                ? `Cited by ${state.result.count}`
                : state.result.works.length > 0
                  ? "Cited by an unknown number of works"
                  : "No citing works found."}
            </p>

            {state.result.works.length > 0 && (
              <ul className="record-details-list cited-by-list" aria-label="Citing works">
                {state.result.works.map((work) => {
                  const isAdded = added.has(work.sourceId);
                  const isAdding = adding === work.sourceId;
                  return (
                    <li key={work.sourceId} className="cited-by-work">
                      <span className="cited-by-title">{work.title}</span>
                      {work.snippet && <span className="cited-by-snippet">{work.snippet}</span>}
                      <div className="record-details-buttons">
                        {work.sourceUrl && (
                          <button
                            type="button"
                            className="edit-btn edit-btn-secondary edit-btn-small"
                            onClick={() => openLink(work.sourceUrl as string)}
                            aria-label={`Open ${work.title}`}
                          >
                            Open
                          </button>
                        )}
                        <button
                          type="button"
                          className="edit-btn edit-btn-secondary edit-btn-small"
                          onClick={() => void handleAdd(work)}
                          disabled={isAdded || adding !== null}
                          aria-label={`${isAdded ? "Added" : "Add"} ${work.title} to library`}
                        >
                          {isAdded ? "Added" : isAdding ? "Adding…" : "Add to library"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {state.result.attribution && (
              <p className="cited-by-attribution">{state.result.attribution}</p>
            )}
          </>
        )}

        {(state.kind === "error" || state.kind === "unavailable") && hasDoi && (
          <button
            type="button"
            className="edit-btn edit-btn-secondary edit-btn-small"
            onClick={() => void lookUp()}
            disabled={busy}
          >
            Try again
          </button>
        )}
      </div>
    </details>
  );
}
