/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC5 Rule Modules — Placeholder Scaffold
 *
 * This barrel file re-exports all v4 modules as fallbacks. When AGLC5 is
 * published, individual modules in this directory will override specific v4
 * rules. Any module not overridden here will continue to use the v4
 * implementation via the re-exports below.
 *
 * To override a v4 rule for AGLC5:
 *   1. Create a new file in src/engine/rules/v5/<category>/<module>.ts
 *   2. Implement the AGLC5 version of the relevant functions
 *   3. Replace the corresponding re-export below with the v5 import
 *
 * Directory structure (mirrors v4):
 *   v5/
 *     index.ts              — This file (barrel re-exports)
 *     general/              — General rules overrides (footnotes, pinpoints, etc.)
 *     domestic/             — Domestic cases and legislation overrides
 *     secondary/            — Secondary sources overrides
 *     international/        — International materials overrides
 *     foreign/              — Foreign materials overrides
 */

// ─── General Rules (v4 fallbacks) ────────────────────────────────────────────

export * as bibliography from "../v4/general/bibliography";
export * as capitalisation from "../v4/general/capitalisation";
export * as dates from "../v4/general/dates";
export * as footnotes from "../v4/general/footnotes";
export * as italicisation from "../v4/general/italicisation";
export * as numbers from "../v4/general/numbers";
export * as pinpoints from "../v4/general/pinpoints";
export * as punctuation from "../v4/general/punctuation";
export * as signals from "../v4/general/signals";

// ─── Domestic Rules (v4 fallbacks) ───────────────────────────────────────────

export * as caseNames from "../v4/domestic/case-names";
export * as casesSupplementary from "../v4/domestic/cases-supplementary";
export * as casesUnreported from "../v4/domestic/cases-unreported";
export * as cases from "../v4/domestic/cases";
export * as legislationSupplementary from "../v4/domestic/legislation-supplementary";
export * as legislation from "../v4/domestic/legislation";

// ─── Secondary Sources (v4 fallbacks) ────────────────────────────────────────

export * as authors from "../v4/secondary/authors";
export * as books from "../v4/secondary/books";
export * as secondaryGeneral from "../v4/secondary/general";
export * as journals from "../v4/secondary/journals";
export * as otherMedia from "../v4/secondary/other-media";
export * as other from "../v4/secondary/other";

// ─── International Materials (v4 fallbacks) ──────────────────────────────────

export * as arbitral from "../v4/international/arbitral";
export * as economic from "../v4/international/economic";
export * as iccTribunals from "../v4/international/icc-tribunals";
export * as icj from "../v4/international/icj";
export * as treaties from "../v4/international/treaties";
export * as un from "../v4/international/un";

// ─── International Materials: Supranational (v4 fallback) ────────────────────

export * as supranational from "../v4/international/supranational";

// ─── Foreign Materials (v4 fallbacks) ────────────────────────────────────────

export * as canada from "../v4/foreign/canada";
export * as china from "../v4/foreign/china";
export * as france from "../v4/foreign/france";
export * as germany from "../v4/foreign/germany";
export * as hongKong from "../v4/foreign/hong-kong";
export * as newZealand from "../v4/foreign/new-zealand";
export * as foreignOther from "../v4/foreign/other";
export * as singapore from "../v4/foreign/singapore";
export * as southAfrica from "../v4/foreign/south-africa";
export * as uk from "../v4/foreign/uk";
export * as usa from "../v4/foreign/usa";
