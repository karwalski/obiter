/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Story 17.39 — Replication Policy & Licence Ledger
 *
 * Maintains a ledger of every source the Obiter Cloud pipeline might
 * replicate. Each entry records the licence, permission status, and
 * whether the source's data may lawfully be replicated and served via
 * the Obiter Cloud search API.
 *
 * Sources marked `replicable: false` are never ingested. They may
 * still be referenced by link-only adapters in the add-in.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LicenceLedgerEntry {
  sourceId: string;
  sourceName: string;
  licence: string;
  licenceUrl: string;
  permissionStatus: "permitted" | "pending" | "denied";
  replicable: boolean;
  lastRefresh?: string; // ISO date
  attributionString: string;
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

export const LICENCE_LEDGER: LicenceLedgerEntry[] = [
  // -- Replicable sources ---------------------------------------------------
  {
    sourceId: "corpus",
    sourceName: "Open Australian Legal Corpus",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    permissionStatus: "permitted",
    replicable: true,
    attributionString:
      "Isaacus, Open Australian Legal Corpus (CC BY 4.0)",
  },
  {
    sourceId: "crossref",
    sourceName: "Crossref",
    licence: "CC0",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    permissionStatus: "permitted",
    replicable: true,
    attributionString: "Crossref (CC0)",
  },
  {
    sourceId: "openalex",
    sourceName: "OpenAlex",
    licence: "CC0",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    permissionStatus: "permitted",
    replicable: true,
    attributionString: "OpenAlex (CC0)",
  },
  {
    sourceId: "doaj",
    sourceName: "DOAJ",
    licence: "CC BY",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    permissionStatus: "permitted",
    replicable: true,
    attributionString: "Directory of Open Access Journals (CC BY)",
  },
  {
    sourceId: "nsw-hansard",
    sourceName: "NSW Parliament Hansard",
    licence: "CC BY",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    permissionStatus: "permitted",
    replicable: true,
    attributionString:
      "NSW Parliament Hansard (CC BY)",
  },
  {
    sourceId: "qld-legislation",
    sourceName: "Queensland Legislation",
    licence: "CC BY 3.0 AU",
    licenceUrl: "https://creativecommons.org/licenses/by/3.0/au/",
    permissionStatus: "permitted",
    replicable: true,
    attributionString: "Queensland Legislation (CC BY 3.0 AU)",
  },
  {
    sourceId: "act-sc-rss",
    sourceName: "ACT Supreme Court",
    licence: "CC BY 3.0 AU",
    licenceUrl: "https://creativecommons.org/licenses/by/3.0/au/",
    permissionStatus: "permitted",
    replicable: true,
    attributionString: "ACT Supreme Court (CC BY 3.0 AU)",
  },

  // -- NOT replicable -------------------------------------------------------
  {
    sourceId: "austlii",
    sourceName: "AustLII",
    licence: "Proprietary",
    licenceUrl: "https://www.austlii.edu.au/austlii/copyright.html",
    permissionStatus: "denied",
    replicable: false,
    attributionString: "AustLII",
  },
  {
    sourceId: "jade",
    sourceName: "JADE",
    licence: "Proprietary",
    licenceUrl: "https://jade.io/t/terms",
    permissionStatus: "denied",
    replicable: false,
    attributionString: "JADE",
  },
  {
    sourceId: "cth-hansard",
    sourceName: "Commonwealth Parliament Hansard",
    licence: "CC BY-NC-ND 3.0 AU",
    licenceUrl: "https://creativecommons.org/licenses/by-nc-nd/3.0/au/",
    permissionStatus: "permitted",
    replicable: false,
    attributionString:
      "Commonwealth Parliament Hansard (CC BY-NC-ND 3.0 AU)",
  },
];

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Return all ledger entries whose content may be replicated. */
export function getReplicableSources(): LicenceLedgerEntry[] {
  return LICENCE_LEDGER.filter((e) => e.replicable);
}

/** Check whether a source is permitted for replication. */
export function isReplicable(sourceId: string): boolean {
  const entry = LICENCE_LEDGER.find((e) => e.sourceId === sourceId);
  return entry?.replicable ?? false;
}

/** Return the attribution string for a source, or `undefined` if unknown. */
export function getAttribution(sourceId: string): string | undefined {
  return LICENCE_LEDGER.find((e) => e.sourceId === sourceId)
    ?.attributionString;
}
