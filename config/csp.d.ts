/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * TRUST-001: Type declarations for config/csp.js (the CommonJS single source
 * of truth for the Content Security Policy). See csp.js for documentation.
 */

/** Hosts allowed in script-src (office.js CDN + Microsoft Ajax CDN). */
export declare const SCRIPT_SRC_HOSTS: readonly string[];

/** Every external origin the add-in fetches at runtime (connect-src). */
export declare const CONNECT_SRC_HOSTS: readonly string[];

/** frame-ancestors sources for the header-only policy variant (TRUST-002). */
export declare const FRAME_ANCESTORS: readonly string[];

/** Build the full CSP string. */
export declare function buildCsp(options?: {
  /** Allow the webpack-dev-server HMR websocket (localhost only). */
  dev?: boolean;
  /** Include the header-only frame-ancestors directive (TRUST-002). */
  frameAncestors?: boolean;
}): string;

/** Production meta-tag policy (no frame-ancestors — ignored in meta CSP). */
export declare const CSP_META_POLICY: string;

/** Header policy for TRUST-002: meta policy plus frame-ancestors. */
export declare const CSP_HEADER_POLICY: string;
