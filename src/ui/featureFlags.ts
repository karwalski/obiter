/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Compile-time feature flags for UI affordances that ship ahead of the
 * views they link to.
 */

/**
 * Gates the "Open Recovery" links that navigate to the "/recovery" route.
 * SAFE-005 delivered the Recovery view and its route, so the links are now
 * live. Kept as a flag so the affordances can be switched off in one place
 * if the view ever needs to be pulled from a build.
 */
export const RECOVERY_VIEW_ENABLED = true;
