/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — Short Titles and Subsequent References for International
 * Materials (Rules 8.8, 9.5, 10.5, 11.3, 12.4, 13.4, 14.6)
 *
 * Every Part IV chapter closes with a short-title/subsequent-reference rule
 * that delegates to Rules 1.4.1–1.4.4 but fixes (a) how the short title is
 * styled and (b) chapter-specific extra elements in the subsequent form
 * (the UN/WTO/GATT document number, the WTO reporting-body description).
 * These helpers give the resolver that per-chapter behaviour.
 */

import type { Citation, SourceType } from "../../../../types/citation";
import type { FormattedRun } from "../../../../types/formattedRun";

// ─── Short-Title Styling ─────────────────────────────────────────────────────

/** How a Part IV short title is styled in subsequent references. */
export type InternationalShortTitleStyle = "italic" | "quoted";

/**
 * Short-title styling per Part IV source type.
 *
 * - Rule 8.8 (guide ex 20/25): treaty short titles are italic.
 * - Rule 9.5 (ex 48): UN document short titles are italic ('Resolution
 *   1325'); yearbook material keeps the quoted article-style title (ex 51).
 * - Rule 10.5 (exs 41–2): ICJ/PCIJ decision short titles follow rule 2.1.14
 *   (italic); pleadings keep the quoted document title.
 * - Rules 11.3/12.4 (exs 19, 32): arbitral and criminal-tribunal decision
 *   short titles follow rule 2.1.14 (italic).
 * - Rule 13.4 (exs 25, 33): WTO/GATT short titles are italic.
 * - Rule 14.6 (exs 55, 58): EU/supranational document and decision short
 *   titles are italic.
 */
const SHORT_TITLE_STYLES: Partial<Record<SourceType, InternationalShortTitleStyle>> = {
  treaty: "italic",
  "treaty.mou": "italic",
  "un.document": "italic",
  "un.communication": "italic",
  "un.yearbook": "quoted",
  "icj.decision": "italic",
  "icj.pleading": "quoted",
  "arbitral.state_state": "italic",
  "arbitral.individual_state": "italic",
  "icc_tribunal.case": "italic",
  "wto.document": "italic",
  "wto.decision": "italic",
  "gatt.document": "italic",
  "eu.official_journal": "italic",
  "eu.court": "italic",
  "echr.decision": "italic",
  "supranational.decision": "italic",
  "supranational.document": "italic",
};

/**
 * Returns the Part IV short-title style for the source type, or undefined
 * when the type is not an international material.
 */
export function internationalShortTitleStyle(
  sourceType: SourceType
): InternationalShortTitleStyle | undefined {
  return SHORT_TITLE_STYLES[sourceType];
}

/**
 * Returns true for Part IV (chapters 8–14) source types.
 */
export function isInternationalMaterial(sourceType: SourceType): boolean {
  return SHORT_TITLE_STYLES[sourceType] !== undefined;
}

/**
 * Styles a Part IV short title per its chapter's short-title rule: italic
 * for treaties, UN/WTO/GATT documents and decisions of international courts
 * and tribunals; single inverted commas for ICJ pleadings and UN yearbook
 * material. Returns null for non-international source types.
 */
export function styleInternationalShortTitle(
  title: string,
  sourceType: SourceType
): FormattedRun[] | null {
  const style = internationalShortTitleStyle(sourceType);
  if (style === "italic") {
    return [{ text: title, italic: true }];
  }
  if (style === "quoted") {
    return [{ text: `‘${title}’` }];
  }
  return null;
}

// ─── Subsequent-Reference Lead ───────────────────────────────────────────────

/** Reads a string field off the citation data, tolerating absent values. */
function dataStr(citation: Citation, key: string): string {
  const value = citation.data[key];
  return typeof value === "string" ? value.trim() : "";
}

/** The stored author of the citation, where the source type carries one. */
function authorOf(citation: Citation): string {
  return dataStr(citation, "author");
}

/**
 * Returns true when a Part IV citation's subsequent reference leads with
 * its (styled) short title rather than an author surname.
 *
 * All Part IV subsequent-reference rules lead with the short title — even
 * for body-authored documents (rule 14.6 ex 55: 'Guidelines to a Fair
 * Trial (n 52) 4' despite the African Union author; rule 9.5's template has
 * no author element). The one exception is parties' submissions in UN
 * individual communications (rule 9.3.2), whose subsequent references
 * follow rule 1.4.1's author-surname form.
 */
export function internationalLeadsWithShortTitle(citation: Citation): boolean {
  if (!isInternationalMaterial(citation.sourceType)) {
    return false;
  }
  if (citation.sourceType === "un.communication" && authorOf(citation)) {
    return false;
  }
  return true;
}

/** The UN document number, mirroring the dispatch layer's field fallbacks. */
function unDocumentNumber(citation: Citation): string {
  return (
    dataStr(citation, "documentNumber") ||
    dataStr(citation, "documentSymbol") ||
    dataStr(citation, "docNumber")
  );
}

/**
 * Formats the lead of a Part IV subsequent reference: the styled short
 * title, any chapter-specific elements, and the `(n X)` cross-reference.
 * The caller appends any pinpoint. Returns null for source types this
 * module does not lead (non-international types; authored rule 9.3.2
 * submissions).
 *
 * Chapter-specific forms:
 * - Rule 9.5: `«Short Title», UN Doc «Number» (n X)` for official UN
 *   documents (guide ex 48).
 * - Rule 13.4: `«Short Title», WTO/GATT Doc «Number» (n X)` for WTO and
 *   GATT documents; reports and decisions prepend the reporting body:
 *   `«Description», «Short Title», WTO Doc «Number» (n X)` (ex 33).
 * - All other chapters: `«Short Title» (n X)` (rules 8.8, 10.5, 11.3,
 *   12.4, 14.6).
 *
 * @param citation - The Part IV citation being referenced.
 * @param firstFootnoteNumber - Footnote of the first full citation.
 * @param shortTitle - The short title chosen by the resolver.
 */
export function formatInternationalShortReference(
  citation: Citation,
  firstFootnoteNumber: number,
  shortTitle: string
): FormattedRun[] | null {
  if (!internationalLeadsWithShortTitle(citation)) {
    return null;
  }

  const styled = styleInternationalShortTitle(shortTitle, citation.sourceType);
  if (styled === null || !shortTitle) {
    return null;
  }

  const runs: FormattedRun[] = [];
  const sourceType = citation.sourceType;

  // Rule 13.4: panel/Appellate Body/arbitrator/GATT panel reports include
  // the document description (reporting body) before the short title.
  if (sourceType === "wto.decision") {
    const description =
      dataStr(citation, "documentDescription") || dataStr(citation, "reportType");
    if (description) {
      runs.push({ text: `${description}, ` });
    }
  } else if (sourceType === "gatt.document") {
    const description =
      dataStr(citation, "documentDescription") || dataStr(citation, "reportType");
    if (/panel report/i.test(description)) {
      runs.push({ text: "GATT Panel Report, " });
    }
  }

  runs.push(...styled);

  // Chapter-specific document-number element before the cross-reference.
  if (sourceType === "un.document") {
    const docNumber = unDocumentNumber(citation);
    if (docNumber) {
      // Rule 9.2.10 via 9.5: 'UN Docs' where multiple numbers are joined.
      const label = /\band\b/.test(docNumber) ? "UN Docs" : "UN Doc";
      runs.push({ text: `, ${label} ${docNumber}` });
    }
  } else if (sourceType === "wto.decision" || sourceType === "wto.document") {
    const docNumber = dataStr(citation, "documentNumber");
    if (docNumber) {
      runs.push({ text: `, WTO Doc ${docNumber}` });
    }
  } else if (sourceType === "gatt.document") {
    const docNumber = dataStr(citation, "documentNumber");
    if (docNumber) {
      runs.push({ text: `, GATT Doc ${docNumber}` });
    }
  }

  runs.push({ text: ` (n ${firstFootnoteNumber})` });

  return runs;
}
