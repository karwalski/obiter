/**
 * @jest-environment jsdom
 *
 * STD-009: the Find duplicates dialog with its `formatCitation` bound to
 * each standard's config — member rows render in the active standard, a
 * case stored by report and by neutral citation clusters on the legal key
 * (report, MNC and parallel citations equivalent), the court-mode
 * formatter shows the parallel MNC, and axe once per standard.
 */
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import DuplicatesDialog, { clusterKindLabel } from "../../../src/ui/components/DuplicatesDialog";
import type { DuplicatesDialogCluster } from "../../../src/ui/components/DuplicatesDialog";
import { findDuplicateClusters } from "../../../src/api/interchange/dedupe";
import { getFormattedPreview } from "../../../src/engine/engine";
import { buildCourtConfig, getStandardConfig } from "../../../src/engine/standards";
import type { CitationConfig } from "../../../src/engine/standards/types";
import type { Citation } from "../../../src/types/citation";
import {
  CORR_NEUTRAL,
  CORR_REPORTED,
  EDELMAN_BOOK,
  FONOTIA,
  MABO_COURT_HCA_TEXT,
  MABO_MNC,
  MABO_REPORTED,
  presetToggles,
  runsText,
} from "./storeMock";
import type { StandardKey } from "./storeMock";

// ─── Fixtures ───────────────────────────────────────────────────────────────

/** Fonotia by report, with the neutral citation and the NZLR parallel report. */
const FONOTIA_REPORTED: Citation = {
  ...FONOTIA,
  id: "fonotia-rep",
  sourceType: "case.reported",
  data: {
    ...FONOTIA.data,
    parallelReport: { year: 2007, volume: 3, reportSeries: "NZLR", startPage: 338 },
  },
  createdAt: "2026-02-01T00:00:00.000Z",
  modifiedAt: "2026-02-01T00:00:00.000Z",
};

interface PairCase {
  standardId: StandardKey;
  pair: [Citation, Citation];
  rows: [string, string];
  rule: string;
}

const PAIRS: PairCase[] = [
  {
    standardId: "aglc4",
    pair: [MABO_REPORTED, MABO_MNC],
    rows: ["Mabo v Queensland (No 2) (1992) 175 CLR 1.", "Mabo v Queensland (No 2) [1992] HCA 23."],
    rule: "AGLC4 rr 2.2.1, 2.3.1",
  },
  {
    standardId: "oscola5",
    pair: [CORR_REPORTED, CORR_NEUTRAL],
    rows: ["Corr v IBC Vehicles Ltd [2008] UKHL 15, [2008] 1 AC 884.", "Corr v IBC Vehicles Ltd [2008] UKHL 15."],
    rule: "OSCOLA 5 rr 2.1.1–2.1.3",
  },
  {
    standardId: "nzlsg3",
    pair: [FONOTIA, FONOTIA_REPORTED],
    rows: ["R v Fonotia [2007] NZCA 188.", "R v Fonotia [2007] NZCA 188, [2007] 3 NZLR 338."],
    rule: "NZLSG 3 r 3.2",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatterFor =
  (config: CitationConfig) =>
  (citation: Citation): string =>
    runsText(getFormattedPreview(citation, config));

const courtHcaConfig = (): CitationConfig =>
  buildCourtConfig({ ...getStandardConfig("aglc4"), writingMode: "court" }, presetToggles("HCA"));

function renderDialog(clusters: DuplicatesDialogCluster[], config: CitationConfig): HTMLElement {
  const { container } = render(
    <DuplicatesDialog
      clusters={clusters}
      formatCitation={formatterFor(config)}
      occurrenceCounts={{}}
      onMerge={jest.fn(async () => 1)}
      onIgnore={jest.fn(async () => undefined)}
      onClose={jest.fn()}
    />
  );
  return container;
}

// ─── Member rows per standard ───────────────────────────────────────────────

describe.each(PAIRS)("STD-009 duplicates dialog under $standardId", ({ standardId, pair, rows, rule }) => {
  const clusters = (): DuplicatesDialogCluster[] => findDuplicateClusters([...pair, EDELMAN_BOOK]);

  test("the two records cluster and the book stays out", () => {
    const found = clusters();
    expect(found).toHaveLength(1);
    expect(found[0].members.map((m) => m.id)).toEqual(pair.map((c) => c.id));
  });

  test(`member rows render in the active standard (${rule})`, () => {
    renderDialog(clusters(), getStandardConfig(standardId));
    expect(screen.getByRole("dialog", { name: "Find duplicates" })).toBeInTheDocument();
    expect(screen.getByText(rows[0])).toBeInTheDocument();
    expect(screen.getByText(rows[1])).toBeInTheDocument();
  });

  // STD-020: the dedupe legal key includes the MNC / neutral citation and
  // every parallel citation, so a report record and a neutral citation
  // record of the same case match on the legal key, not on the loose
  // title-and-year key.
  test("the cluster is a legal match, labelled by its citation kind", () => {
    const [cluster] = clusters();
    expect(cluster.kind).toBe("legal");
    expect(clusterKindLabel(cluster)).toMatch(/^Same (medium neutral|report) citation$/);
  });

  test("has no axe violations with the cluster open", async () => {
    const container = renderDialog(clusters(), getStandardConfig(standardId));
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── Court mode ─────────────────────────────────────────────────────────────

describe("STD-009 duplicates dialog under court mode (AGLC4, HCA preset)", () => {
  test("member rows render through the court config, with the parallel MNC", () => {
    renderDialog(findDuplicateClusters([MABO_REPORTED, MABO_MNC]), courtHcaConfig());
    expect(screen.getByText(`${MABO_COURT_HCA_TEXT}.`)).toBeInTheDocument();
    expect(screen.getByText("Mabo v Queensland (No 2) [1992] HCA 23.")).toBeInTheDocument();
  });

  // STD-020: the legal key covers parallel citations, so Mabo by report
  // (carrying "[1992] HCA 23" as a parallel citation) and Mabo by MNC
  // cluster with kind "legal".
  test("Mabo by report and by MNC cluster on the legal key", () => {
    const [cluster] = findDuplicateClusters([MABO_REPORTED, MABO_MNC]);
    expect(cluster.kind).toBe("legal");
  });

  test("has no axe violations", async () => {
    const container = renderDialog(findDuplicateClusters([MABO_REPORTED, MABO_MNC]), courtHcaConfig());
    expect(await axe(container)).toHaveNoViolations();
  });
});
