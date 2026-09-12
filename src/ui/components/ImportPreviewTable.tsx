/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ImportPreviewTable — the paged review table of the Import dialog. Pure
 * presentation: include and update checkboxes, a source-type select, the
 * one-line AGLC rendering and a text status per row (INTEROP-012).
 */

import type { ImportPreviewRow } from "../../api/interchange";
import type { SourceType } from "../../types/citation";
import { EXPERIMENTAL_BADGE, isExperimentalSourceType } from "../../engine/ruleExporter";

export interface SourceTypeOption {
  type: SourceType;
  label: string;
  category: string;
}

export interface ImportPreviewTableProps {
  rows: ImportPreviewRow[];
  page: number;
  pageSize: number;
  typeOptions: SourceTypeOption[];
  /** Renders the row's citation as one line of AGLC text. */
  renderPreview: (row: ImportPreviewRow) => string;
  onToggleInclude: (index: number, include: boolean) => void;
  onToggleUpdate: (index: number, update: boolean) => void;
  onRetype: (index: number, sourceType: SourceType) => void;
  onPage: (page: number) => void;
}

function rowLabel(row: ImportPreviewRow, preview: string): string {
  return preview.trim() || row.record.title || `record ${row.index + 1}`;
}

/** Status text for a row. Text carries the meaning; colour is decoration. */
export function rowStatus(row: ImportPreviewRow): {
  text: string;
  kind: "ready" | "incomplete" | "duplicate" | "custom";
} {
  if (row.duplicateOf) {
    return {
      text: row.roundTrip ? "Already in library (exported from here)" : "Already in library",
      kind: "duplicate",
    };
  }
  if (row.issues.some((i) => i.code === "type-fallback-custom")) {
    return { text: "Type not recognised — imported as Custom citation", kind: "custom" };
  }
  if (row.missingFields.length > 0) {
    const n = row.missingFields.length;
    return {
      text: `${n} required field${n === 1 ? "" : "s"} missing: ${row.missingFields.join(", ")}`,
      kind: "incomplete",
    };
  }
  return { text: "Ready", kind: "ready" };
}

export default function ImportPreviewTable({
  rows,
  page,
  pageSize,
  typeOptions,
  renderPreview,
  onToggleInclude,
  onToggleUpdate,
  onRetype,
  onPage,
}: ImportPreviewTableProps): JSX.Element {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const start = page * pageSize;
  const visible = rows.slice(start, start + pageSize);
  const categories = Array.from(new Set(typeOptions.map((o) => o.category)));

  return (
    <div className="import-preview">
      <div className="import-preview-scroll">
        <table className="import-preview-table" aria-label="Records to import">
          <thead>
            <tr>
              <th scope="col">Include</th>
              <th scope="col">Type</th>
              <th scope="col">Preview</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const preview = renderPreview(row);
              const status = rowStatus(row);
              const label = rowLabel(row, preview);
              const experimental = isExperimentalSourceType(row.sourceType);
              return (
                <tr key={row.index} className={`import-row import-row--${status.kind}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.include}
                      onChange={(e) => onToggleInclude(row.index, e.target.checked)}
                      aria-label={`Include record ${row.index + 1}: ${label}`}
                    />
                    {row.duplicateOf && row.roundTrip && (
                      <label className="import-update-toggle">
                        <input
                          type="checkbox"
                          checked={row.update}
                          disabled={!row.include}
                          onChange={(e) => onToggleUpdate(row.index, e.target.checked)}
                          aria-label={`Update the existing citation for record ${row.index + 1}`}
                        />
                        Update existing
                      </label>
                    )}
                  </td>
                  <td>
                    <select
                      className="library-select"
                      value={row.sourceType}
                      onChange={(e) => onRetype(row.index, e.target.value as SourceType)}
                      aria-label={`Source type for record ${row.index + 1}`}
                      title={row.reasons.join("; ")}
                    >
                      {categories.map((category) => (
                        <optgroup key={category} label={category}>
                          {typeOptions
                            .filter((o) => o.category === category)
                            .map((o) => (
                              <option key={o.type} value={o.type}>
                                {o.label}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                    {experimental && (
                      <div className="import-experimental" title={EXPERIMENTAL_BADGE}>
                        {EXPERIMENTAL_BADGE}
                      </div>
                    )}
                  </td>
                  <td className="import-preview-cell" title={preview}>
                    {preview}
                  </td>
                  <td className={`import-status import-status--${status.kind}`}>{status.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize && (
        <div className="import-pager">
          <span role="status">
            Showing {start + 1}–{Math.min(start + pageSize, rows.length)} of {rows.length}
          </span>
          <button
            className="library-btn"
            onClick={() => onPage(page - 1)}
            disabled={page === 0}
            aria-label={`Previous ${pageSize} records`}
          >
            Previous
          </button>
          <button
            className="library-btn"
            onClick={() => onPage(page + 1)}
            disabled={page >= pageCount - 1}
            aria-label={`Next ${pageSize} records`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
