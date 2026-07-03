/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * BUG-004: Scan & Repair view.
 *
 * Deep document scan for un-linked libraries, never-Obiter documents and
 * partially corrupted stores. The scan is read-only; results are previewed
 * in a table with per-item checkboxes and NOTHING is modified until the
 * user confirms. Fully offline — only the deterministic parser is used.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSharedStore } from "../../store/singleton";
import type { CitationStore } from "../../store";
import { scanDocument, applyScanPlan } from "../../word/documentScanner";
import type { ApplyOutcome } from "../../word/documentScanner";
import { buildScanPlan } from "../../word/scanRepair";
import type { ScanItem, ScanPlan } from "../../word/scanRepair";
import { refreshAllCitationsNow } from "../../word/citationRefresher";
import { useCitationContext } from "../context/CitationContext";
import { createLogger } from "../../debug/logger";

const log = createLogger("ScanRepair");

type Phase = "scanning" | "preview" | "applying" | "done" | "error";

/** Human-readable location for a scan item. */
function describeLocation(item: ScanItem): string {
  if (item.location === "footnote") return `Footnote ${item.noteIndex}`;
  if (item.location === "endnote") return `Endnote ${item.noteIndex}`;
  return "Body";
}

/** Section metadata for the preview table. */
const SECTIONS: {
  kind: ScanItem["kind"];
  heading: string;
  description: string;
}[] = [
  {
    kind: "linked",
    heading: "Linked",
    description: "Obiter citation markers already matching library entries. No change needed.",
  },
  {
    kind: "rebuild",
    heading: "Rebuild library entries",
    description:
      "Obiter citation markers found in the document with no matching library entry (lost or corrupted store). Selected entries are rebuilt from the marker text.",
  },
  {
    kind: "adopt",
    heading: "Adopt as managed citations",
    description:
      "Plain-text citations recognised by the offline parser. Selected citations are added to the library and converted to managed Obiter citations (re-formatted by the engine).",
  },
  {
    kind: "verbatim",
    heading: "Adopt as verbatim manual citations",
    description:
      "Text the parser could not interpret. Selected notes are added to the library as manual citations rendered exactly as they read now (no engine formatting). Review these before selecting.",
  },
];

export default function ScanRepair(): JSX.Element {
  const { triggerRefresh } = useCitationContext();
  const [phase, setPhase] = useState<Phase>("scanning");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ScanPlan | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null);
  const [refreshSummary, setRefreshSummary] = useState<string | null>(null);
  const [scanNonce, setScanNonce] = useState(0);
  const [storeRef, setStoreRef] = useState<CitationStore | null>(null);

  // Read-only scan on mount (and on rescan).
  useEffect(() => {
    let cancelled = false;
    async function scan(): Promise<void> {
      setPhase("scanning");
      setError(null);
      setOutcome(null);
      setRefreshSummary(null);
      try {
        const store = await getSharedStore();
        const snapshot = await scanDocument();
        if (cancelled) return;
        const built = buildScanPlan(snapshot, store.getAll(), {
          aglcVersion: store.getAglcVersion(),
        });
        // Extends the BUG-003 diagnostics log line with scan results.
        log.info("scanRepair: scan results", {
          storeStatus: store.getDiagnostics().status,
          notesScanned: snapshot.notes.length,
          ...built.counts,
        });
        setStoreRef(store);
        setPlan(built);
        setSelected(
          Object.fromEntries(
            built.items
              .filter((i) => i.selectable)
              .map((i) => [i.key, i.defaultSelected])
          )
        );
        setPhase("preview");
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Scan failed.");
          setPhase("error");
        }
      }
    }
    void scan();
    return () => {
      cancelled = true;
    };
  }, [scanNonce]);

  const selectedItems = useMemo(
    () => (plan ? plan.items.filter((i) => i.selectable && selected[i.key]) : []),
    [plan, selected]
  );

  const toggleItem = useCallback((key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setSection = useCallback(
    (kind: ScanItem["kind"], value: boolean) => {
      if (!plan) return;
      setSelected((prev) => {
        const next = { ...prev };
        for (const item of plan.items) {
          if (item.kind === kind && item.selectable) next[item.key] = value;
        }
        return next;
      });
    },
    [plan]
  );

  const handleApply = useCallback(async () => {
    if (!storeRef || selectedItems.length === 0) return;
    setPhase("applying");
    setError(null);
    try {
      const result = await applyScanPlan(storeRef, selectedItems);
      setOutcome(result);

      // Post-repair: re-run the subsequent-reference integrity pass so
      // ibid / short-title chains reflect the repaired document. No-op in
      // Manual Citations Mode (the refresher gates on it).
      try {
        const refresh = await refreshAllCitationsNow(storeRef);
        setRefreshSummary(
          `Citation formats re-validated: ${refresh.updated} updated, ${refresh.unchanged} unchanged.`
        );
      } catch (err: unknown) {
        setRefreshSummary(
          `Repair applied, but the follow-up refresh failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      triggerRefresh();
      setPhase("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Repair failed.");
      setPhase("error");
    }
  }, [storeRef, selectedItems, triggerRefresh]);

  const handleRescan = useCallback(() => setScanNonce((n) => n + 1), []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === "scanning") {
    return (
      <div className="library-panel">
        <h2>Scan &amp; Repair</h2>
        <p role="status">Scanning body, footnotes and endnotes...</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="library-panel">
        <h2>Scan &amp; Repair</h2>
        <p style={{ color: "var(--colour-error)" }} role="alert">
          {error}
        </p>
        <button className="library-btn" onClick={handleRescan}>
          Scan again
        </button>
      </div>
    );
  }

  if (phase === "done" && outcome) {
    return (
      <div className="library-panel">
        <h2>Scan &amp; Repair</h2>
        <div className="library-toast" role="status">
          <span>Repair complete.</span>
        </div>
        <ul style={{ paddingLeft: 18, fontSize: "var(--text-min, 12px)" }}>
          <li>{outcome.rebuiltFromControls} library entr{outcome.rebuiltFromControls === 1 ? "y" : "ies"} rebuilt from document markers</li>
          <li>{outcome.adoptedManaged} citation{outcome.adoptedManaged !== 1 ? "s" : ""} adopted as managed citations</li>
          <li>{outcome.adoptedVerbatim} note{outcome.adoptedVerbatim !== 1 ? "s" : ""} adopted as verbatim manual citations</li>
          <li>{outcome.wrappedNotes} note{outcome.wrappedNotes !== 1 ? "s" : ""} linked with citation markers</li>
        </ul>
        {refreshSummary && (
          <p style={{ fontSize: "var(--text-min, 12px)" }}>{refreshSummary}</p>
        )}
        {outcome.failures.length > 0 && (
          <div className="library-toast" role="alert">
            <div>
              <p style={{ margin: "0 0 4px" }}>
                {outcome.failures.length} item{outcome.failures.length !== 1 ? "s" : ""} could not be fully applied:
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {outcome.failures.map((f) => (
                  <li key={f.key}>{f.reason}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <button className="library-btn" onClick={handleRescan}>
          Scan again
        </button>
      </div>
    );
  }

  // phase === "preview" | "applying"
  const items = plan?.items ?? [];
  const counts = plan?.counts;
  const applying = phase === "applying";

  return (
    <div className="library-panel">
      <h2>Scan &amp; Repair</h2>
      <p style={{ fontSize: "var(--text-min, 12px)", color: "var(--colour-text-secondary)" }}>
        Deep scan of the document body and all footnotes and endnotes. Nothing
        is changed until you confirm below. The scan works offline using the
        deterministic parser only.
      </p>

      {counts && (
        <p className="library-summary" role="status">
          Found {counts.found}: {counts.linked} linked, {counts.rebuild} to rebuild,{" "}
          {counts.adopt} to adopt, {counts.verbatim} unparseable
        </p>
      )}

      {items.length === 0 && (
        <p className="library-empty">
          No citation markers or citation-like text found in this document.
        </p>
      )}

      {SECTIONS.map((section) => {
        const sectionItems = items.filter((i) => i.kind === section.kind);
        if (sectionItems.length === 0) return null;
        const selectable = sectionItems.some((i) => i.selectable);
        return (
          <section key={section.kind} style={{ marginBottom: 12 }}>
            <h3 style={{ margin: "8px 0 2px", fontSize: "var(--text-sm, 13px)" }}>
              {section.heading} ({sectionItems.length})
            </h3>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: "var(--text-min, 12px)",
                color: "var(--colour-text-secondary)",
              }}
            >
              {section.description}
            </p>
            {selectable && (
              <div style={{ marginBottom: 4 }}>
                <button
                  className="library-btn"
                  onClick={() => setSection(section.kind, true)}
                  disabled={applying}
                >
                  Select all
                </button>{" "}
                <button
                  className="library-btn"
                  onClick={() => setSection(section.kind, false)}
                  disabled={applying}
                >
                  Select none
                </button>
              </div>
            )}
            <div style={{ overflowX: "auto" }}>
              <table
                style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-min, 12px)" }}
              >
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    {selectable && <th style={{ width: 24 }} aria-label="Selected" />}
                    <th style={{ padding: "2px 4px" }}>Location</th>
                    <th style={{ padding: "2px 4px" }}>Citation text</th>
                    {section.kind !== "linked" && <th style={{ padding: "2px 4px" }}>Proposed</th>}
                  </tr>
                </thead>
                <tbody>
                  {sectionItems.map((item) => (
                    <tr key={item.key} style={{ borderTop: "1px solid var(--colour-border, #ddd)" }}>
                      {selectable && (
                        <td style={{ padding: "2px 4px", verticalAlign: "top" }}>
                          {item.selectable && (
                            <input
                              type="checkbox"
                              checked={!!selected[item.key]}
                              onChange={() => toggleItem(item.key)}
                              disabled={applying}
                              aria-label={`Include ${describeLocation(item)}`}
                            />
                          )}
                        </td>
                      )}
                      <td style={{ padding: "2px 4px", whiteSpace: "nowrap", verticalAlign: "top" }}>
                        {describeLocation(item)}
                      </td>
                      <td style={{ padding: "2px 4px", verticalAlign: "top" }}>
                        {item.text.length > 140 ? `${item.text.slice(0, 140)}…` : item.text}
                      </td>
                      {section.kind !== "linked" && (
                        <td style={{ padding: "2px 4px", whiteSpace: "nowrap", verticalAlign: "top" }}>
                          {item.kind === "verbatim"
                            ? "Manual (verbatim)"
                            : item.proposedCitation?.sourceType ?? ""}
                          {item.pinpoint ? `, pinpoint ${item.pinpoint}` : ""}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          className="library-btn library-btn--insert"
          onClick={() => void handleApply()}
          disabled={applying || selectedItems.length === 0}
        >
          {applying
            ? "Repairing..."
            : `Repair ${selectedItems.length} item${selectedItems.length !== 1 ? "s" : ""}`}
        </button>
        <button className="library-btn" onClick={handleRescan} disabled={applying}>
          Scan again
        </button>
      </div>
    </div>
  );
}
