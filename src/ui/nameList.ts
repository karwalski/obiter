/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Name-list helpers shared by the Insert and Edit citation views (BUG-005 (d)).
 *
 * The engine dispatch reads structured `Author[]` values for fields such as
 * `authors` and `editors` (rules 4.1, 6.6), while the task-pane forms edit
 * them as a single comma/'and'-separated text line. These helpers convert
 * between the two shapes so both views write the shape the engine reads.
 */

import type { AuthorEntry } from "./context/InsertCitationContext";

/** Renders a person value ({ givenNames, surname } or { name }) as display text. */
export function personToStr(p: unknown): string {
  if (typeof p === "string") return p;
  if (!p || typeof p !== "object") return String(p ?? "");
  const obj = p as Record<string, string>;
  if (obj.givenNames) return `${obj.givenNames} ${obj.surname ?? ""}`.trim();
  return obj.surname ?? obj.name ?? "";
}

/**
 * Parses a comma/'and'-separated list of personal names into structured
 * author entries ({ givenNames, surname }). The engine expects Author[] for
 * fields such as `editors` (Rule 6.6.2); the last space-separated token is
 * treated as the surname.
 */
export function parseNameList(value: string): AuthorEntry[] {
  return value
    .split(/,|\band\b/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => {
      const splitAt = name.lastIndexOf(" ");
      return splitAt === -1
        ? { givenNames: "", surname: name }
        : { givenNames: name.slice(0, splitAt), surname: name.slice(splitAt + 1) };
    });
}

/** Renders a name-list field value (string or Author[]) as display text. */
export function nameListToStr(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(personToStr).filter(Boolean).join(", ");
  }
  return "";
}
