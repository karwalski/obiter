/**
 * Corpus Coverage Gap Surfacing (Story 17.11)
 *
 * Reports coverage completeness per jurisdiction so the UI can show
 * appropriate badges and help users understand when they should consult
 * additional sources.
 *
 * Coverage is based on the Open Australian Legal Corpus (Isaacus) which
 * has comprehensive coverage of most jurisdictions but incomplete coverage
 * of Vic, ACT, and NT due to upstream data availability.
 */

export type CoverageStatus = "complete" | "partial" | "absent";

/**
 * Jurisdiction coverage map.
 *
 * "complete" — corpus has comprehensive coverage for this jurisdiction.
 * "partial"  — corpus has some decisions/legislation but with known gaps.
 * "absent"   — no data available in the corpus for this jurisdiction.
 */
const COVERAGE_MAP: Record<string, CoverageStatus> = {
  Cth: "complete",
  NSW: "complete",
  Qld: "complete",
  WA: "complete",
  SA: "complete",
  Tas: "complete",
  Vic: "partial",
  ACT: "partial",
  NT: "partial",
};

/** Human-readable descriptions for each coverage status. */
const STATUS_DESCRIPTIONS: Record<CoverageStatus, string> = {
  complete:
    "Comprehensive coverage. The corpus contains most published decisions and current legislation.",
  partial:
    "Partial coverage. Some decisions and legislation may be missing. Consider verifying against primary sources.",
  absent:
    "No corpus coverage. Use online sources (AustLII, Jade) for this jurisdiction.",
};

/**
 * Return the coverage status for a given jurisdiction code.
 * Returns "absent" for unknown jurisdictions.
 */
export function getCoverageStatus(jurisdiction: string): CoverageStatus {
  return COVERAGE_MAP[jurisdiction] ?? "absent";
}

/**
 * Return a human-readable summary of overall corpus coverage.
 */
export function getCoverageDescription(): string {
  const complete = Object.entries(COVERAGE_MAP)
    .filter(([, s]) => s === "complete")
    .map(([j]) => j);
  const partial = Object.entries(COVERAGE_MAP)
    .filter(([, s]) => s === "partial")
    .map(([j]) => j);

  return (
    `Complete coverage: ${complete.join(", ")}. ` +
    `Partial coverage: ${partial.join(", ")}. ` +
    "New Zealand and international sources are not included in the corpus."
  );
}

/**
 * Return a short badge label for use in the task pane UI.
 *
 * Examples: "Corpus: Full", "Corpus: Partial", "No corpus".
 */
export function getJurisdictionBadge(jurisdiction: string): string {
  const status = getCoverageStatus(jurisdiction);
  switch (status) {
    case "complete":
      return "Corpus: Full";
    case "partial":
      return "Corpus: Partial";
    case "absent":
      return "No corpus";
  }
}

/**
 * Return all known jurisdictions and their coverage statuses.
 * Useful for rendering a coverage summary table in the UI.
 */
export function getAllCoverage(): Array<{
  jurisdiction: string;
  status: CoverageStatus;
  badge: string;
  description: string;
}> {
  return Object.entries(COVERAGE_MAP).map(([jurisdiction, status]) => ({
    jurisdiction,
    status,
    badge: getJurisdictionBadge(jurisdiction),
    description: STATUS_DESCRIPTIONS[status],
  }));
}
