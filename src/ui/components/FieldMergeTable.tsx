/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * FieldMergeTable — a field-by-field comparison of two or more versions of
 * one citation's data (ENP-003). Pure presentation: every field the Edit
 * view knows for the source type, plus any extra key present in a column,
 * is one row. Fields every column agrees on show a single read-only value;
 * fields that differ get one radio per column so the caller can pick which
 * value survives. Reused by the later "Update from source" story.
 */

import type { SourceData, SourceType } from "../../types/citation";
import { getFieldsForSourceType } from "../views/editCitationFields";
import type { FieldDefinition } from "../views/editCitationFields";
import { getFieldAliases, readFieldWithAliases } from "../../engine/fieldAliases";
import { INTERCHANGE_DATA_KEY } from "../../api/interchange/model";
import { nameListToStr } from "../nameList";

export interface FieldMergeColumn {
  id: string;
  label: string;
  data: SourceData;
}

export interface FieldMergeTableProps {
  sourceType: string;
  columns: FieldMergeColumn[];
  /** fieldKey -> the column whose value is chosen, for fields that differ. */
  selection: Record<string, string>;
  onSelect: (fieldKey: string, columnId: string) => void;
  /** Replaces the Edit view's field list for the source type. */
  fieldsOverride?: FieldDefinition[];
}

/** One comparison row: the raw value and its display text per column. */
export interface FieldMergeRow {
  key: string;
  label: string;
  /** True for a key the Edit view does not list for this source type. */
  extra: boolean;
  values: Record<string, unknown>;
  texts: Record<string, string>;
  /** False when every column carries the same value. */
  differs: boolean;
}

/** Keys never shown: the interchange provenance bag is not a citation field. */
const HIDDEN_KEYS = new Set<string>([INTERCHANGE_DATA_KEY]);

/** Display text for a field value; names are joined the way the Edit view shows them. */
export function fieldValueText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return nameListToStr(value);
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).trim();
}

/** Comparison form: name lists by structure, everything else as trimmed text. */
function comparable(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

/** The field list for a source type plus any extra key present in a column. */
export function mergeFields(
  sourceType: string,
  columns: FieldMergeColumn[],
  fieldsOverride?: FieldDefinition[]
): FieldDefinition[] {
  const fields = fieldsOverride ?? getFieldsForSourceType(sourceType as SourceType);
  const known = new Set<string>();
  for (const field of fields) {
    known.add(field.key);
    for (const alias of field.aliases ?? getFieldAliases(field.key)) known.add(alias);
  }
  const extras: FieldDefinition[] = [];
  for (const column of columns) {
    for (const key of Object.keys(column.data)) {
      if (known.has(key) || HIDDEN_KEYS.has(key)) continue;
      known.add(key);
      extras.push({ key, label: key });
    }
  }
  return [...fields, ...extras];
}

/** Reads a field from column data, honouring the Edit view's aliases. */
export function readMergeValue(data: SourceData, field: FieldDefinition): unknown {
  const direct = readFieldWithAliases(data, field.key);
  if (direct !== undefined) return direct;
  for (const alias of field.aliases ?? []) {
    const value = readFieldWithAliases(data, alias);
    if (value !== undefined) return value;
  }
  return undefined;
}

/** Builds the comparison rows the table renders; exported so callers can seed a selection. */
export function buildMergeRows(
  sourceType: string,
  columns: FieldMergeColumn[],
  fieldsOverride?: FieldDefinition[]
): FieldMergeRow[] {
  const base = fieldsOverride ?? getFieldsForSourceType(sourceType as SourceType);
  const baseKeys = new Set(base.map((field) => field.key));
  const fields = mergeFields(sourceType, columns, base);
  return fields.map((field) => {
    const values: Record<string, unknown> = {};
    const texts: Record<string, string> = {};
    const forms = new Set<string>();
    for (const column of columns) {
      const value = readMergeValue(column.data, field);
      values[column.id] = value;
      texts[column.id] = fieldValueText(value);
      forms.add(comparable(value));
    }
    return {
      key: field.key,
      label: field.label,
      extra: !baseKeys.has(field.key),
      values,
      texts,
      differs: forms.size > 1,
    };
  });
}

export default function FieldMergeTable({
  sourceType,
  columns,
  selection,
  onSelect,
  fieldsOverride,
}: FieldMergeTableProps): JSX.Element {
  const rows = buildMergeRows(sourceType, columns, fieldsOverride);
  const differing = rows.filter((row) => row.differs).length;

  return (
    <div className="field-merge">
      <p className="field-merge-summary" role="status">
        {differing === 0
          ? "Every field matches."
          : `${differing} field${differing === 1 ? "" : "s"} differ${differing === 1 ? "s" : ""}. Choose the value to keep for each.`}
      </p>
      <div className="field-merge-scroll">
        <table className="field-merge-table" aria-label="Fields to merge">
          <thead>
            <tr>
              <th scope="col">Field</th>
              {columns.map((column) => (
                <th key={column.id} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className={`field-merge-row${row.differs ? " field-merge-row--differs" : ""}`}
              >
                <th scope="row">{row.label}</th>
                {row.differs ? (
                  columns.map((column) => {
                    const text = row.texts[column.id];
                    const inputId = `field-merge-${row.key}-${column.id}`;
                    return (
                      <td key={column.id}>
                        <label className="field-merge-option" htmlFor={inputId}>
                          <input
                            id={inputId}
                            type="radio"
                            name={`field-${row.key}`}
                            value={column.id}
                            checked={selection[row.key] === column.id}
                            onChange={() => onSelect(row.key, column.id)}
                            aria-label={`${row.label}: ${text || "empty"} (${column.label})`}
                          />
                          <span className={text ? undefined : "field-merge-empty"}>
                            {text || "Empty"}
                          </span>
                        </label>
                      </td>
                    );
                  })
                ) : (
                  <td colSpan={columns.length} className="field-merge-agreed">
                    {row.texts[columns[0]?.id ?? ""] || (
                      <span className="field-merge-empty">Empty</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
