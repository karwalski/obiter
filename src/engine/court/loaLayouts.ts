/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * List of Authorities controls per layout (COURT-116, COURT-117, COURT-118)
 *
 * Which per-citation List of Authorities fields a layout uses, and what the
 * UI should call them. The Edit Citation view and the Library show only the
 * controls the document's layout reads, labelled in that layout's terms
 * (register O-K9: `loaPart` and `isKeyAuthority` were stored and used, but
 * no UI set them).
 *
 * Pure data: no DOM, no Office.js.
 */

import type { SourceType } from "../../types/citation";
import type { LoaType } from "../standards/types";

/** The per-citation controls a layout reads. */
export interface LoaCitationControls {
  /**
   * `loaPart` "A" / "B" labels for this layout, or undefined when the layout
   * does not place this kind of source by part.
   */
  part?: { a: string; b: string; source: string };
  /** Whether the layout marks `isKeyAuthority` with an asterisk. */
  keyAuthority: boolean;
  /** WA PD 2.1 cl 13: the pages or paragraphs to be read (`loaReadPassages`). */
  readPassages: boolean;
  /** HCA PD 2 of 2024: principal legislation goes in Part A (`jbaPrincipal`). */
  principalLegislation: boolean;
  /** COURT-118: the layout prints the legislation version (`versionDate` etc). */
  legislationVersion: boolean;
}

/** Data key for the WA pages or paragraphs to be read. */
export const LOA_READ_PASSAGES_FIELD = "loaReadPassages";

/** Data key for HCA principal legislation (JBA Part A). */
export const JBA_PRINCIPAL_FIELD = "jbaPrincipal";

type SourceKind = "case" | "legislation" | "extrinsic" | "other";

/** Bills and explanatory material are kept apart from enacted legislation. */
function sourceKind(sourceType: SourceType | string): SourceKind {
  if (sourceType.startsWith("case.")) return "case";
  if (sourceType === "legislation.bill" || sourceType === "legislation.explanatory") {
    return "extrinsic";
  }
  if (sourceType.startsWith("legislation.")) return "legislation";
  return "other";
}

/** Part labels by layout, with the instrument they come from. */
const PART_LABELS: Partial<Record<LoaType, { a: string; b: string; source: string }>> = {
  "part-ab": {
    a: "Part A: passages to be read",
    b: "Part B: reference may be made",
    source: "Part A / Part B list",
  },
  "part-abc": {
    a: "Part A: to be read from at the hearing",
    b: "Part B: referred to, not read from",
    source: "Vic SC CA 3 cl 14.1",
  },
  "two-part-read": {
    a: "Expected to be read",
    b: "Not expected to be read",
    source: "SA UCR r 217.8, Form 91; FCFCOA FAM-APPEALS",
  },
  "three-part-tas": {
    a: "Part 1: counsel intends to cite",
    b: "Part 2: might be referred to, not cited",
    source: "Tas SC PD 3 of 2022",
  },
  "hca-jba-five-part": {
    a: "Counsel will take the Court to it",
    b: "Not to be taken to",
    source: "HCA PD 2 of 2024",
  },
  "nswca-four-category": {
    a: "Passages will be read",
    b: "Cited, not read",
    source: "NSW SC CA 1 cl 37(2)–(3)",
  },
  "wa-outline-asterisk": {
    a: "Counsel intends to read from it (asterisk)",
    b: "Not to be read",
    source: "WA PD 2.1 cl 13",
  },
};

/** Layouts whose legislation is split between Part A and Part B. */
const LEGISLATION_BY_PART: ReadonlySet<LoaType> = new Set<LoaType>([
  "part-ab",
  "part-abc",
  "two-part-read",
]);

/**
 * Layouts that print the `isKeyAuthority` asterisk (LOA-004 convention). The
 * COURT-117 layouts do not: NSW SC CA 1 cl 37 and FCA GPN-eBOOKS have no
 * such mark, the HCA Joint Book has none, and WA PD 2.1 cl 13 uses the
 * asterisk for cases to be read (`loaPart` "A").
 */
const KEY_AUTHORITY_LAYOUTS: ReadonlySet<LoaType> = new Set<LoaType>([
  "part-ab",
  "part-abc",
  "two-part-read",
  "three-part-tas",
]);

/** COURT-118: layouts that print the legislation version. */
export const LEGISLATION_VERSION_LAYOUTS: ReadonlySet<LoaType> = new Set<LoaType>([
  "hca-jba-five-part",
  "nswca-four-category",
  "fca-ebook-sections",
]);

/** COURT-116: true when the layout places authorities by `loaPart`. */
export function loaUsesParts(loaType: LoaType | undefined): boolean {
  return !!loaType && PART_LABELS[loaType] !== undefined;
}

/**
 * COURT-116 / COURT-117 / COURT-118: the List of Authorities controls to
 * show for one citation in a document with this layout. All flags are false
 * for "off", "simple" and academic documents (pass undefined).
 */
export function getLoaCitationControls(
  loaType: LoaType | undefined,
  sourceType: SourceType | string
): LoaCitationControls {
  const none: LoaCitationControls = {
    keyAuthority: false,
    readPassages: false,
    principalLegislation: false,
    legislationVersion: false,
  };
  if (!loaType || loaType === "off" || loaType === "simple") return none;
  const kind = sourceKind(sourceType);
  const labels = PART_LABELS[loaType];

  const partApplies =
    labels !== undefined &&
    (kind === "case" || (kind === "legislation" && LEGISLATION_BY_PART.has(loaType)));

  return {
    ...(partApplies ? { part: labels } : {}),
    keyAuthority: kind === "case" && KEY_AUTHORITY_LAYOUTS.has(loaType),
    readPassages: kind === "case" && loaType === "wa-outline-asterisk",
    principalLegislation: kind === "legislation" && loaType === "hca-jba-five-part",
    legislationVersion: kind === "legislation" && LEGISLATION_VERSION_LAYOUTS.has(loaType),
  };
}

/**
 * COURT-117: whether a citation counts as "to be read" (Part A) in this
 * layout. The WA layout also reads the older `isKeyAuthority` flag as "to be
 * read" (WA PD 2.1 cl 13 asterisk), so the controls show it as placed in
 * Part A, and moving it out must clear that flag too.
 */
export function isLoaPartA(
  loaType: LoaType | undefined,
  loaPart: "A" | "B" | undefined,
  isKeyAuthority: boolean | undefined
): boolean {
  return loaPart === "A" || (loaType === "wa-outline-asterisk" && isKeyAuthority === true);
}

/** True when any control applies (the panel is worth showing). */
export function hasLoaControls(controls: LoaCitationControls): boolean {
  return (
    controls.part !== undefined ||
    controls.keyAuthority ||
    controls.readPassages ||
    controls.principalLegislation ||
    controls.legislationVersion
  );
}
