/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Headless citation service (COPILOT-001). The single, UI-independent code path
 * for inserting / updating / deleting / refreshing / formatting citations. The
 * task pane calls this, and (in future) a Microsoft Copilot skill action calls
 * exactly the same functions — so there is no duplicated insert logic.
 *
 * This is the Office.js orchestration seam that sits above the pure engine
 * (formatting) and the word layer (document mutation). It has no React/DOM
 * dependency and derives its config from the shared store, so it is callable
 * from any runtime (task pane, ribbon command, or a Copilot skill action).
 */

import { Citation, SourceData } from "../types/citation";
import { FormattedRun } from "../types/formattedRun";
import { CitationConfig } from "../engine/standards/types";
import { getFormattedPreview } from "../engine/engine";
import { getStandardConfig, buildCourtConfig } from "../engine/standards";
import {
  insertCitationFootnote,
  updateCitationContent,
  deleteCitationFootnote,
} from "../word/footnoteManager";
import { refreshAllCitationsNow } from "../word/citationRefresher";
import { getSharedStore } from "../store/singleton";
import { CitationStore } from "../store/citationStore";
import { getDevicePref } from "../store/devicePreferences";
import {
  CitationInsertRequest,
  buildCitationFromRequest,
  getVersionForStandard,
} from "./citationRequest";

export interface InsertResult {
  status: "inserted";
  /** The citation id the footnote is bound to (the reused id when mode === "reused"). */
  citationId: string;
  mode: "new" | "reused" | "override";
  /** Present when appended to an existing footnote (Rule 1.1.3). */
  appendedToFootnote?: number;
}

/** Resolve the active AGLC/court config from the document's stored settings. */
async function resolveConfig(store: CitationStore): Promise<CitationConfig> {
  const courtToggles =
    store.getCourtToggles() ??
    (getDevicePref("courtToggles") as Record<string, string> | undefined);
  return buildCourtConfig(getStandardConfig(store.getStandardId()), courtToggles);
}

function asString(val: unknown): string {
  return typeof val === "string" ? val : "";
}

/**
 * Find an already-stored citation that matches the incoming one (so a second
 * occurrence reuses the same id and is renumbered as a subsequent reference
 * rather than duplicated). Mirrors the task-pane matching rules.
 */
export function findMatchingCitation(
  candidate: Citation,
  existing: Citation[]
): Citation | undefined {
  const st = candidate.sourceType;
  const d: SourceData = candidate.data;
  return existing.find((c) => {
    if (c.sourceType !== st) return false;
    const cd = c.data;
    if (st.startsWith("case.")) {
      return (
        asString(cd.party1) === asString(d.party1) &&
        asString(cd.party2) === asString(d.party2) &&
        asString(cd.year) === asString(d.year)
      );
    }
    if (st.startsWith("legislation.")) {
      return (
        asString(cd.title) === asString(d.title) &&
        asString(cd.year) === asString(d.year) &&
        asString(cd.jurisdiction) === asString(d.jurisdiction)
      );
    }
    return asString(cd.title) === asString(d.title) && asString(cd.year) === asString(d.year);
  });
}

/**
 * Insert a citation as a native Word footnote. Handles the three modes the task
 * pane supports: verbatim override, reuse of an existing matching citation, and
 * a new citation. Persists to the store, formats via the engine, inserts the
 * native footnote, then normalises separators/punctuation via a refresh.
 */
export async function insertCitation(
  request: CitationInsertRequest,
  config?: CitationConfig
): Promise<InsertResult> {
  const store = await getSharedStore();
  const cfg = config ?? (await resolveConfig(store));
  const citation = buildCitationFromRequest(request, getVersionForStandard(store.getStandardId()));
  const appendIndex =
    request.appendToFootnoteIndex && request.appendToFootnoteIndex > 0
      ? request.appendToFootnoteIndex
      : undefined;

  // Override mode — insert the user's verbatim text; the refresher will not
  // overwrite it because overrideText is persisted on the Citation.
  if (request.overrideText) {
    await store.add(citation);
    const title = request.shortTitle || citation.sourceType;
    await insertCitationFootnote(citation.id, title, [{ text: request.overrideText }], appendIndex);
    await refreshAllCitationsNow(store);
    return {
      status: "inserted",
      citationId: citation.id,
      mode: "override",
      appendedToFootnote: appendIndex,
    };
  }

  // Reuse an existing matching citation (subsequent reference).
  const existingMatch = findMatchingCitation(citation, store.getAll());
  if (existingMatch) {
    const runs = getFormattedPreview(existingMatch, cfg);
    const title = request.shortTitle || existingMatch.shortTitle || existingMatch.sourceType;
    await insertCitationFootnote(existingMatch.id, title, runs, appendIndex);
    await refreshAllCitationsNow(store);
    return {
      status: "inserted",
      citationId: existingMatch.id,
      mode: "reused",
      appendedToFootnote: appendIndex,
    };
  }

  // New citation.
  const runs = getFormattedPreview(citation, cfg);
  await store.add(citation);
  const title = request.shortTitle || citation.sourceType;
  await insertCitationFootnote(citation.id, title, runs, appendIndex);
  await refreshAllCitationsNow(store);
  return {
    status: "inserted",
    citationId: citation.id,
    mode: "new",
    appendedToFootnote: appendIndex,
  };
}

/**
 * Format a request to AGLC4 runs without touching the document (preview / for a
 * Copilot or jurisd caller that wants the formatted text before inserting).
 */
export function formatCitationRuns(
  request: CitationInsertRequest,
  config: CitationConfig
): FormattedRun[] {
  const citation = buildCitationFromRequest(request, request.aglcVersion ?? "4");
  return getFormattedPreview(citation, config);
}

/** Flatten formatted runs to plain text (italic/bold markers dropped). */
export function runsToPlainText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

/**
 * Format a request to AGLC4 runs + plain text, resolving the active config from
 * the document's stored settings (unlike formatCitationRuns, which requires the
 * caller to supply a config). The skill's `formatCitation` action uses this so a
 * Copilot caller gets a correctly-configured preview without knowing the config.
 */
export async function formatCitationForRequest(
  request: CitationInsertRequest
): Promise<{ runs: FormattedRun[]; text: string }> {
  const store = await getSharedStore();
  const cfg = await resolveConfig(store);
  const runs = formatCitationRuns(request, cfg);
  return { runs, text: runsToPlainText(runs) };
}

/** Re-render every managed footnote (fixes ibid, short references, numbering). */
export async function refreshFootnotes(): Promise<void> {
  const store = await getSharedStore();
  await refreshAllCitationsNow(store);
}

/** Re-format and update every occurrence of a stored citation from a new request. */
export async function updateCitation(
  citationId: string,
  request: CitationInsertRequest,
  config?: CitationConfig
): Promise<void> {
  const store = await getSharedStore();
  const cfg = config ?? (await resolveConfig(store));
  const runs = formatCitationRuns(request, cfg);
  await updateCitationContent(citationId, runs);
  await refreshAllCitationsNow(store);
}

/** Remove a specific footnote occurrence of a citation. */
export async function deleteCitation(citationId: string, footnoteIndex: number): Promise<void> {
  await deleteCitationFootnote(citationId, footnoteIndex);
  const store = await getSharedStore();
  await refreshAllCitationsNow(store);
}
