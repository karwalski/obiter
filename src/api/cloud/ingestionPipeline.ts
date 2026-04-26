/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Story 17.41 — Replication Ingestion Pipeline (stub)
 *
 * This module defines the types and schedule metadata for the server-side
 * ingestion pipeline. The actual pipeline runs as a separate service (see
 * docs/self-hosting.md). These types are shared between the add-in client
 * and the server so that the UI can display ingestion status.
 */

import { getReplicableSources } from "./licenceLedger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IngestionStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "disabled";

export interface IngestionJob {
  /** Matches a sourceId from the licence ledger. */
  sourceId: string;
  /** Cron expression for the job schedule (e.g. "0 3 * * *"). */
  schedule: string;
  /** ISO date-time of the last completed run, if any. */
  lastRun?: string;
  /** ISO date-time of the next scheduled run. */
  nextRun?: string;
  /** Current status. */
  status: IngestionStatus;
}

// ---------------------------------------------------------------------------
// Default schedule
// ---------------------------------------------------------------------------

/**
 * Default ingestion schedules for each replicable source. In production
 * these are read from the server configuration; this function provides
 * sensible defaults for display when the server is unreachable.
 */
const DEFAULT_SCHEDULES: Record<string, string> = {
  corpus: "0 2 * * 0",         // Weekly, Sunday 02:00
  crossref: "0 3 * * *",       // Daily, 03:00
  openalex: "0 4 * * *",       // Daily, 04:00
  doaj: "0 5 * * 1",           // Weekly, Monday 05:00
  "nsw-hansard": "0 6 * * *",  // Daily, 06:00
  "qld-legislation": "0 7 * * 0", // Weekly, Sunday 07:00
  "act-sc-rss": "30 * * * *",  // Every 30 minutes
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Return the planned ingestion schedule for every replicable source.
 * When the server is reachable the caller should fetch live status;
 * this provides a static fallback.
 */
export function getIngestionSchedule(): IngestionJob[] {
  return getReplicableSources().map((source) => ({
    sourceId: source.sourceId,
    schedule: DEFAULT_SCHEDULES[source.sourceId] ?? "0 0 * * *",
    status: "idle" as IngestionStatus,
  }));
}
