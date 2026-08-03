/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Text coercion for citation data crossing the Custom XML Part boundary.
 *
 * Citation data is declared as `string` on the *Data interfaces, but the store
 * does not preserve that at runtime. `deserializeValue` in the XML serializer
 * coerces any digit-only value of a known-numeric field (NUMERIC_DATA_FIELDS —
 * `year`, `page`, `number`, `reportNumber`, `volume`, …) back to a JS `number`,
 * and JSON-decodes anything that looks like an object or array. A field the
 * engine casts with `as string` therefore holds a number after a save/reload
 * round-trip, and calling a string method on it throws
 * "x.trim is not a function".
 *
 * Formatters must funnel such fields through {@link toText} rather than calling
 * `.trim()` directly. Returns a trimmed string for anything renderable and ""
 * for values with no sensible text form, so a malformed field degrades to an
 * omitted element instead of crashing the render.
 */
export function toText(raw: unknown): string {
  if (raw === undefined || raw === null) return "";
  if (typeof raw === "string") return raw.trim();
  // The round-trip case: a digit-only field deserialized back to a number.
  if (typeof raw === "number") return Number.isFinite(raw) ? String(raw) : "";
  if (typeof raw === "bigint") return String(raw);
  // A JSON-decoded array (eg a multi-value field) renders as a comma list.
  if (Array.isArray(raw)) {
    return raw
      .map(toText)
      .filter((p) => p.length > 0)
      .join(", ");
  }
  // Booleans, objects, symbols and functions have no citation text form.
  return "";
}
