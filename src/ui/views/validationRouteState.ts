/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * B7: router state that carries already-computed validation results to the
 * Validate view, so arriving from Prepare for Handover shows the issues
 * without running the check again.
 */

import type { ValidationResult } from "../../engine/validator";

/** Where the results came from (shown as a note in the Validate view). */
export type ValidationResultOrigin = "handover";

export interface ValidationRouteState {
  validationResult: ValidationResult;
  origin: ValidationResultOrigin;
}

/** The router state for navigating to Validate with `result`. */
export function validationRouteState(result: ValidationResult): ValidationRouteState {
  return { validationResult: result, origin: "handover" };
}

/** The results carried in router state, or undefined when none (or malformed). */
export function readValidationRouteState(state: unknown): ValidationRouteState | undefined {
  if (!state || typeof state !== "object") return undefined;
  const candidate = state as Partial<ValidationRouteState>;
  const r = candidate.validationResult;
  if (
    !r ||
    !Array.isArray(r.errors) ||
    !Array.isArray(r.warnings) ||
    !Array.isArray(r.info) ||
    candidate.origin !== "handover"
  ) {
    return undefined;
  }
  return { validationResult: r, origin: candidate.origin };
}
