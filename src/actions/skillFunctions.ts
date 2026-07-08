/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Agent-callable skill functions (COPILOT-009). These are the entry points a
 * Microsoft 365 Copilot skill action invokes; each parses/validates a structured
 * request at the boundary and dispatches to the headless citationService — the
 * SAME one code path the task pane uses. No formatting logic lives here: Obiter's
 * engine remains the AGLC4 authority; the caller only supplies structured fields.
 *
 * The pure dispatch functions (skill*) are unit-tested. registerSkillFunctions()
 * binds them into the Office runtime via Office.actions.associate; it runs in the
 * shared runtime page (COPILOT-010). The exact argument marshalling Copilot uses
 * to pass an action's input is preview — the boundary accepts either a structured
 * object or a JSON string, and is finalised against a Copilot tenant at
 * COPILOT-014.
 */

/* global Office */

import { CitationInsertRequest } from "./citationRequest";
import { SourceType, SourceData } from "../types/citation";
import { OBITER_ACTIONS } from "./actionCatalogue";
import {
  insertCitation,
  updateCitation,
  deleteCitation,
  refreshFootnotes,
  formatCitationForRequest,
  InsertResult,
} from "./citationService";

/** Thrown when a caller-supplied skill request is malformed. */
export class SkillRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillRequestError";
  }
}

/** Coerce a JSON string (or pass through an object) to a plain record. */
function asRecord(raw: unknown, label: string): Record<string, unknown> {
  const value = typeof raw === "string" ? safeParse(raw, label) : raw;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SkillRequestError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function safeParse(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new SkillRequestError(`${label} is not valid JSON`);
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Validate and normalise a caller-supplied CitationInsertRequest. Rejects the two
 * fields the engine cannot proceed without (sourceType, data); leaves per-source
 * field validation to the engine, which owns the AGLC4 rules.
 */
export function parseInsertRequest(raw: unknown): CitationInsertRequest {
  const r = asRecord(raw, "request");
  if (typeof r.sourceType !== "string" || r.sourceType.length === 0) {
    throw new SkillRequestError("sourceType is required");
  }
  if (!r.data || typeof r.data !== "object" || Array.isArray(r.data)) {
    throw new SkillRequestError("data object is required");
  }
  const version = r.aglcVersion === "4" || r.aglcVersion === "5" ? r.aglcVersion : undefined;
  const appendIndex =
    typeof r.appendToFootnoteIndex === "number" ? r.appendToFootnoteIndex : undefined;
  return {
    sourceType: r.sourceType as SourceType,
    data: r.data as SourceData,
    shortTitle: optionalString(r.shortTitle),
    signal: optionalString(r.signal),
    commentaryBefore: optionalString(r.commentaryBefore),
    commentaryAfter: optionalString(r.commentaryAfter),
    overrideText: optionalString(r.overrideText),
    aglcVersion: version,
    appendToFootnoteIndex: appendIndex,
  };
}

// ── Skill action dispatchers ────────────────────────────────────────────────

/** insertCitation — format + insert as a native Word footnote. */
export async function skillInsertCitation(rawRequest: unknown): Promise<InsertResult> {
  return insertCitation(parseInsertRequest(rawRequest));
}

/** formatCitation — return the AGLC4 text without inserting (pure preview). */
export async function skillFormatCitation(rawRequest: unknown): Promise<{ text: string }> {
  const { text } = await formatCitationForRequest(parseInsertRequest(rawRequest));
  return { text };
}

/** updateCitation — re-format + update every occurrence of an existing citation. */
export async function skillUpdateCitation(
  raw: unknown
): Promise<{ status: "updated"; citationId: string }> {
  const r = asRecord(raw, "request");
  const citationId = optionalString(r.citationId);
  if (!citationId) throw new SkillRequestError("citationId is required");
  await updateCitation(citationId, parseInsertRequest(r.request));
  return { status: "updated", citationId };
}

/** deleteCitation — remove one footnote occurrence of a citation. */
export async function skillDeleteCitation(
  raw: unknown
): Promise<{ status: "deleted"; citationId: string; footnoteIndex: number }> {
  const r = asRecord(raw, "request");
  const citationId = optionalString(r.citationId);
  if (!citationId) throw new SkillRequestError("citationId is required");
  if (typeof r.footnoteIndex !== "number") {
    throw new SkillRequestError("footnoteIndex (number) is required");
  }
  await deleteCitation(citationId, r.footnoteIndex);
  return { status: "deleted", citationId, footnoteIndex: r.footnoteIndex };
}

/** refreshFootnotes — fix ibid/short refs, renumber, normalise. */
export async function skillRefreshFootnotes(): Promise<{ status: "refreshed" }> {
  await refreshFootnotes();
  return { status: "refreshed" };
}

/** Action-name → dispatcher map, keyed by the OBITER_ACTIONS names (COPILOT-004). */
export const SKILL_DISPATCHERS: Record<string, (raw: unknown) => Promise<unknown>> = {
  insertCitation: skillInsertCitation,
  formatCitation: skillFormatCitation,
  updateCitation: skillUpdateCitation,
  deleteCitation: skillDeleteCitation,
  refreshFootnotes: () => skillRefreshFootnotes(),
};

/**
 * Wraps a dispatcher for Copilot invocation (COPILOT-020). executeDataFunction
 * handlers receive the arguments as a JSON string and must return a string —
 * the working combine-agents-with-add-ins samples return plain text, which
 * Copilot relays. Success returns the result object as JSON (so the agent can
 * quote e.g. the formatted citation text or the citationId); failures return a
 * structured error string instead of throwing, so Copilot can tell the user
 * which field was missing rather than reporting a generic failure.
 */
export function wrapForCopilot(
  name: string,
  dispatch: (raw: unknown) => Promise<unknown>
): (raw: unknown) => Promise<string> {
  return async (raw: unknown): Promise<string> => {
    try {
      const result = await dispatch(raw);
      return JSON.stringify({ status: "ok", action: name, result: result ?? null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const kind = err instanceof SkillRequestError ? "invalid_request" : "error";
      return JSON.stringify({ status: kind, action: name, message });
    }
  };
}

/**
 * Register every catalogued action as an Office runtime function so Copilot can
 * invoke it. Called from the shared runtime page (COPILOT-010). Guarded so the
 * module stays importable (and testable) outside the Office runtime.
 */
export function registerSkillFunctions(): void {
  if (typeof Office === "undefined" || !Office.actions || !Office.actions.associate) {
    return;
  }
  for (const action of OBITER_ACTIONS) {
    const dispatch = SKILL_DISPATCHERS[action.name];
    if (dispatch) {
      Office.actions.associate(
        action.name,
        wrapForCopilot(action.name, dispatch) as unknown as (arg: unknown) => void
      );
    }
  }
}
