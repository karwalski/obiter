/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * List of Authorities fields for one citation (COURT-116, COURT-118).
 *
 * Shows only the controls the document's List of Authorities layout reads
 * (see `getLoaCitationControls`): the part ("to be read" or not), the
 * key-authority asterisk, the WA pages or paragraphs to be read, HCA
 * principal legislation, and the legislation version ("as at"). Nothing is
 * shown for academic documents or a simple list.
 */

import type { LoaType } from "../../engine/standards/types";
import {
  getLoaCitationControls,
  hasLoaControls,
  isLoaPartA,
  JBA_PRINCIPAL_FIELD,
  LOA_READ_PASSAGES_FIELD,
} from "../../engine/court/loaLayouts";
import {
  LEGISLATION_VERSION_FIELDS,
  LEGISLATION_VERSION_KINDS,
} from "../../engine/court/legislationVersion";
import { toText } from "../../engine/rules/v4/general/coerce";

type Variant = "edit" | "insert";

const CLASSES: Record<Variant, { field: string; label: string; input: string; select: string }> = {
  edit: {
    field: "edit-field",
    label: "edit-field-label",
    input: "edit-field-input",
    select: "edit-field-input",
  },
  insert: { field: "ic-field", label: "ic-label", input: "ic-input", select: "ic-select" },
};

const HINT_STYLE = { fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 4px" };

// ─── Legislation version (COURT-118) ────────────────────────────────────────

export interface LegislationVersionFieldsProps {
  data: Record<string, unknown>;
  onDataChange: (key: string, value: string) => void;
  disabled?: boolean;
  variant?: Variant;
  idPrefix?: string;
}

/**
 * COURT-118: the version ("as at") fields for a piece of legislation, used
 * by court list layouts that state the version (HCA Form 27A; NSW SC CA 1
 * cl 37(1); FCA GPN-eBOOKS cl 7.4). Never used in footnotes.
 */
export function LegislationVersionFields({
  data,
  onDataChange,
  disabled,
  variant = "edit",
  idPrefix = "loa",
}: LegislationVersionFieldsProps): JSX.Element {
  const c = CLASSES[variant];
  const date = toText(data[LEGISLATION_VERSION_FIELDS.date]);
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  return (
    <>
      <label className={c.field} htmlFor={`${idPrefix}-version-kind`}>
        <span className={c.label}>Legislation version</span>
        <select
          id={`${idPrefix}-version-kind`}
          className={c.select}
          value={toText(data[LEGISLATION_VERSION_FIELDS.kind]) || "point-in-time"}
          onChange={(e) => onDataChange(LEGISLATION_VERSION_FIELDS.kind, e.target.value)}
          disabled={disabled}
        >
          {LEGISLATION_VERSION_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className={c.field} htmlFor={`${idPrefix}-version-date`}>
        <span className={c.label}>Version date (as at)</span>
        <input
          id={`${idPrefix}-version-date`}
          type={isoDate || date === "" ? "date" : "text"}
          className={c.input}
          value={date}
          onChange={(e) => onDataChange(LEGISLATION_VERSION_FIELDS.date, e.target.value)}
          disabled={disabled}
        />
      </label>
      <label className={c.field} htmlFor={`${idPrefix}-version-note`}>
        <span className={c.label}>Reason for this version</span>
        <input
          id={`${idPrefix}-version-note`}
          type="text"
          className={c.input}
          value={toText(data[LEGISLATION_VERSION_FIELDS.note])}
          placeholder="For example, the law at the date of the contract"
          onChange={(e) => onDataChange(LEGISLATION_VERSION_FIELDS.note, e.target.value)}
          disabled={disabled}
        />
      </label>
      <p style={HINT_STYLE}>
        Shown only in court lists that ask for the version of legislation. Footnotes are not
        affected.
      </p>
    </>
  );
}

// ─── Full panel (COURT-116) ─────────────────────────────────────────────────

export interface LoaCitationFieldsProps {
  loaType: LoaType | undefined;
  sourceType: string;
  loaPart: "A" | "B" | undefined;
  isKeyAuthority: boolean;
  data: Record<string, unknown>;
  onPartChange: (part: "A" | "B" | undefined) => void;
  onKeyAuthorityChange: (value: boolean) => void;
  onDataChange: (key: string, value: string | boolean) => void;
  disabled?: boolean;
}

/**
 * COURT-116: the List of Authorities section of Edit Citation. Renders
 * nothing when the layout reads no per-citation field for this source.
 */
export default function LoaCitationFields({
  loaType,
  sourceType,
  loaPart,
  isKeyAuthority,
  data,
  onPartChange,
  onKeyAuthorityChange,
  onDataChange,
  disabled,
}: LoaCitationFieldsProps): JSX.Element | null {
  const controls = getLoaCitationControls(loaType, sourceType);
  if (!hasLoaControls(controls)) return null;
  const c = CLASSES.edit;
  const partA = isLoaPartA(loaType, loaPart, isKeyAuthority);
  const principal =
    data[JBA_PRINCIPAL_FIELD] === true || toText(data[JBA_PRINCIPAL_FIELD]) === "true";

  return (
    <fieldset className="settings-section" data-testid="loa-citation-fields">
      <legend className="settings-section-title">List of Authorities</legend>

      {controls.part && (
        <label className={c.field} htmlFor="loa-part">
          <span className={c.label}>Placement ({controls.part.source})</span>
          <select
            id="loa-part"
            className={c.input}
            value={partA ? "A" : "B"}
            onChange={(e) => {
              const part = e.target.value === "A" ? "A" : "B";
              onPartChange(part);
              // WA: the older key-authority flag also means "to be read".
              if (part === "B" && isKeyAuthority && loaType === "wa-outline-asterisk") {
                onKeyAuthorityChange(false);
              }
            }}
            disabled={disabled}
          >
            <option value="A">{controls.part.a}</option>
            <option value="B">{controls.part.b}</option>
          </select>
        </label>
      )}

      {controls.readPassages && partA && (
        <label className={c.field} htmlFor="loa-read-passages">
          <span className={c.label}>Pages or paragraphs to be read</span>
          <input
            id="loa-read-passages"
            type="text"
            className={c.input}
            value={toText(data[LOA_READ_PASSAGES_FIELD])}
            placeholder="For example, 34–36 [15]–[20]"
            onChange={(e) => onDataChange(LOA_READ_PASSAGES_FIELD, e.target.value)}
            disabled={disabled}
          />
        </label>
      )}

      {controls.keyAuthority && (
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={isKeyAuthority}
            onChange={(e) => onKeyAuthorityChange(e.target.checked)}
            disabled={disabled}
          />
          <span className="settings-toggle-label">Key authority (marked with an asterisk)</span>
        </label>
      )}

      {controls.principalLegislation && (
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={principal}
            onChange={(e) => onDataChange(JBA_PRINCIPAL_FIELD, e.target.checked)}
            disabled={disabled}
          />
          <span className="settings-toggle-label">Principal legislation (Joint Book Part A)</span>
        </label>
      )}

      {controls.legislationVersion && (
        <LegislationVersionFields
          data={data}
          onDataChange={(key, value) => onDataChange(key, value)}
          disabled={disabled}
        />
      )}
    </fieldset>
  );
}
