/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-007: maps the flat SourceMetadata bag an adapter returns onto the
 * data keys the Edit form reads for one source type. Stays on the adapter
 * side of the boundary: the only engine import is the pure alias table, so
 * a value the form stores under an alias (`courtId` for a reported case's
 * court) still lands on the form's primary key.
 */

import type { ContentType, SourceMetadata } from "./sourceAdapter";
import type { Author, SourceData, SourceType } from "../types/citation";
import { getFieldAliases } from "../engine/fieldAliases";
import { getFieldsForSourceType } from "../ui/views/editCitationFields";

/** The adapter content type a source type is looked up under, or null when none applies. */
export function contentTypeForSourceType(sourceType: string): ContentType | null {
  if (sourceType.startsWith("case.")) return "case";
  if (sourceType.startsWith("legislation.")) return "legislation";
  if (sourceType.startsWith("journal.")) return "journal";
  if (sourceType === "treaty" || sourceType.startsWith("treaty.")) return "treaty";
  if (sourceType === "hansard") return "hansard";
  if (sourceType === "report.law_reform") return "lrc-report";
  return null;
}

/**
 * Identifiers kept even though no form field lists them: they feed the
 * record's source links and duplicate detection (ENP-003/ENP-005).
 */
const IDENTIFIER_KEYS: ReadonlyArray<string> = ["doi", "frliId", "mnc"];

/** Trimmed text for a scalar metadata value; undefined when blank or not scalar. */
function text(value: unknown): string | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** "Surname, Given" or "Given Surname" as the engine's Author shape. */
export function parseAuthorName(name: string): Author | null {
  const trimmed = name.trim();
  if (trimmed === "") return null;
  const comma = trimmed.indexOf(",");
  if (comma !== -1) {
    return {
      surname: trimmed.slice(0, comma).trim(),
      givenNames: trimmed.slice(comma + 1).trim(),
    };
  }
  const splitAt = trimmed.lastIndexOf(" ");
  if (splitAt === -1) return { givenNames: "", surname: trimmed };
  return { givenNames: trimmed.slice(0, splitAt).trim(), surname: trimmed.slice(splitAt + 1) };
}

/** "Mabo v Queensland" split at the first " v "; null when the string has no versus. */
export function splitParties(parties: string): [string, string] | null {
  const match = parties.match(/^(.+?)\s+v\.?\s+(.+)$/);
  if (!match) return null;
  const first = match[1].trim();
  const second = match[2].trim();
  return first && second ? [first, second] : null;
}

/** "[1992] HCA 23" → year, court and judgment number. */
export function parseMnc(mnc: string): { year: string; court: string; number: string } | null {
  const match = mnc.trim().match(/^\[(\d{4})\]\s+([A-Za-z]+)\s+(\d+)$/);
  return match ? { year: match[1], court: match[2], number: match[3] } : null;
}

/** ISO country codes adapters use for the federal jurisdiction, as the form writes it. */
const JURISDICTION_FROM_CODE: Readonly<Record<string, string>> = { AU: "Cth" };

/**
 * "Competition and Consumer Act 2010 (Cth)" → the title, year and
 * jurisdiction the statute form keeps as separate fields (Rule 3.1).
 */
export function parseStatuteTitle(title: string): {
  title: string;
  year?: string;
  jurisdiction?: string;
} {
  const match = title.trim().match(/^(.+?)\s+(\d{4})(?:\s+\(([^)]+)\))?$/);
  if (!match) return { title: title.trim() };
  return { title: match[1].trim(), year: match[2], jurisdiction: match[3]?.trim() };
}

/** Candidate values keyed by the form's canonical keys, before filtering to the type's fields. */
function buildCandidates(sourceType: string, metadata: SourceMetadata): SourceData {
  const contentType = contentTypeForSourceType(sourceType);
  const out: SourceData = {};
  const put = (key: string, value: unknown): void => {
    const asText = text(value);
    if (asText !== undefined) out[key] = asText;
  };

  put("year", metadata.year);
  put("volume", metadata.volume);
  put("startingPage", metadata.startingPage ?? metadata.page);
  put("reportSeries", metadata.reportSeries);
  put("issue", metadata.issue);
  put("doi", metadata.doi);
  put("frliId", metadata.frliId);
  put("treatySeries", metadata.treatySeries);
  put("seriesVolume", metadata.volume);
  put("speaker", metadata.speaker);
  put("chamber", metadata.chamber);
  put("journal", metadata.journal);

  const jurisdiction = text(metadata.jurisdiction);
  if (jurisdiction) {
    out.jurisdiction =
      contentType === "legislation"
        ? (JURISDICTION_FROM_CODE[jurisdiction.toUpperCase()] ?? jurisdiction)
        : jurisdiction;
  }

  const title = text(metadata.title);
  if (contentType === "legislation" && title) {
    const parsed = parseStatuteTitle(title);
    out.title = parsed.title;
    if (parsed.year) out.year = parsed.year;
    if (parsed.jurisdiction) out.jurisdiction = parsed.jurisdiction;
  } else if (title) {
    out.title = title;
  }

  if (contentType === "case") {
    const parties = text(metadata.parties) ?? title;
    const split = parties ? splitParties(parties) : null;
    if (split) {
      out.party1 = split[0];
      out.party2 = split[1];
    }
    if (parties && !split) out.caseName = parties;
    const court = text(metadata.court);
    const mnc = text(metadata.mnc);
    const parsedMnc = mnc ? parseMnc(mnc) : null;
    if (mnc) out.mnc = mnc;
    if (court || parsedMnc) {
      out.court = court ?? parsedMnc?.court;
      out.courtId = out.court;
    }
    if (parsedMnc) {
      out.caseNumber = parsedMnc.number;
      if (out.year === undefined) out.year = parsedMnc.year;
    }
  }

  if (Array.isArray(metadata.authors)) {
    const authors = metadata.authors
      .map((name) => (typeof name === "string" ? parseAuthorName(name) : null))
      .filter((author): author is Author => author !== null);
    if (authors.length > 0) out.authors = authors;
  }

  return out;
}

/**
 * The adapter metadata as the form fields of `sourceType`. Only keys the
 * form lists (under their primary key, honouring aliases) plus the stable
 * identifiers survive; blank values are dropped and numbers become strings.
 */
export function metadataToFields(sourceType: string, metadata: SourceMetadata): SourceData {
  const candidates = buildCandidates(sourceType, metadata);
  const fields = getFieldsForSourceType(sourceType as SourceType);
  const out: SourceData = {};
  for (const field of fields) {
    // A bare year is not a full date (Rule 2.3.2): never let the `date` field
    // fall back through its `year` alias.
    const keys =
      field.key === "date"
        ? [field.key]
        : [field.key, ...(field.aliases ?? []), ...getFieldAliases(field.key)];
    for (const key of keys) {
      if (candidates[key] !== undefined) {
        out[field.key] = candidates[key];
        break;
      }
    }
  }
  for (const key of IDENTIFIER_KEYS) {
    if (out[key] === undefined && candidates[key] !== undefined) out[key] = candidates[key];
  }
  return out;
}
