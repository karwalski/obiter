/**
 * @jest-environment jsdom
 *
 * STD-009: the Update from source dialog for UK and NZ cases — the merge
 * table offers the fetched standard-specific fields (OSCOLA neutral
 * citation; NZ parallel report) with labels rather than raw keys, Apply
 * writes them, and the merged record renders in the active standard.
 *
 * The dialog receives the citation text from its caller; here it is
 * rendered under the standard, as the Library and Edit views do.
 */
import * as React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import UpdateFromSourceDialog from "../../../src/ui/components/UpdateFromSourceDialog";
import { getFormattedPreview } from "../../../src/engine/engine";
import { getStandardConfig } from "../../../src/engine/standards";
import type { SourceUpdateResult } from "../../../src/api/updateFromSource";
import type { Citation, SourceData } from "../../../src/types/citation";
import { CORR_REPORTED, FONOTIA, MABO_MNC, mockStoreFor, runsText } from "./storeMock";
import type { MockStore, StandardKey } from "./storeMock";

const mockFetchSourceUpdate = jest.fn();
jest.mock("../../../src/api/updateFromSource", () => ({
  fetchSourceUpdate: (...args: unknown[]): unknown => mockFetchSourceUpdate(...args),
}));

// STD-021: the dialog reads the document standard from the ready store for
// its field list, so the shared store is mocked as in the other suites.
let mockStore: MockStore;
jest.mock("../../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
  getSharedStoreIfReady: (): unknown => mockStore,
}));
jest.mock("../../../src/store/devicePreferences", () => ({
  getDevicePref: (): unknown => undefined,
  setDevicePref: (): void => undefined,
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────

/** Corr as a library record with the law report only; the source supplies the neutral citation. */
const CORR_REPORT_ONLY: Citation = {
  ...CORR_REPORTED,
  data: {
    party1: "Corr",
    party2: "IBC Vehicles Ltd",
    year: "2008",
    yearType: "square",
    volume: "1",
    reportSeries: "AC",
    startingPage: "884",
  },
};

const UK_RESULT: SourceUpdateResult = {
  status: "updated",
  adapterId: "mock",
  adapterLabel: "Mock Adapter",
  metadata: { neutralCitation: "[2008] UKHL 15" },
  fields: { neutralCitationYear: "2008", neutralCitationCourt: "UKHL", neutralCitationNumber: "15" },
  differences: ["neutralCitationYear", "neutralCitationCourt", "neutralCitationNumber"],
};

const NZ_RESULT: SourceUpdateResult = {
  status: "updated",
  adapterId: "mock",
  adapterLabel: "Mock Adapter",
  metadata: { reportSeries: "NZLR" },
  fields: { reportSeries: "NZLR", volume: "3", startingPage: "338" },
  differences: ["reportSeries", "volume", "startingPage"],
};

const AU_RESULT: SourceUpdateResult = {
  status: "updated",
  adapterId: "mock",
  adapterLabel: "Mock Adapter",
  metadata: { court: "HCA" },
  fields: { judicialOfficer: "Brennan J" },
  differences: ["judicialOfficer"],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function textUnder(citation: Citation, standardId: StandardKey): string {
  return runsText(getFormattedPreview(citation, getStandardConfig(standardId)))
    .trim()
    .replace(/\.$/, "");
}

interface Rendered {
  container: HTMLElement;
  onApply: jest.Mock;
  citationText: string;
}

async function renderDialog(
  citation: Citation,
  standardId: StandardKey,
  result: SourceUpdateResult
): Promise<Rendered> {
  mockStore = mockStoreFor({ standardId, citations: [citation] });
  mockFetchSourceUpdate.mockResolvedValue(result);
  const onApply = jest.fn(async () => undefined);
  const citationText = textUnder(citation, standardId);
  const { container } = render(
    <UpdateFromSourceDialog
      citation={citation}
      citationText={citationText}
      onApply={onApply}
      onClose={jest.fn()}
    />
  );
  await screen.findByRole("table", { name: "Fields to merge" });
  return { container, onApply, citationText };
}

async function applyAndRead(onApply: jest.Mock): Promise<SourceData> {
  fireEvent.click(screen.getByRole("button", { name: "Apply selected" }));
  await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
  return onApply.mock.calls[0][0] as SourceData;
}

/** Radios whose accessible name is `<label>: <value> (From Mock Adapter)`. */
function sourceRadio(value: string): HTMLElement {
  return screen.getByLabelText(new RegExp(`: ${value} \\(From Mock Adapter\\)$`));
}

beforeEach(() => {
  mockFetchSourceUpdate.mockReset();
});

// ─── UK case under OSCOLA 5 ─────────────────────────────────────────────────

describe("STD-009 update from source for a UK case (oscola5)", () => {
  test("the lookup is given the OSCOLA rendering of the record", async () => {
    const { citationText } = await renderDialog(CORR_REPORT_ONLY, "oscola5", UK_RESULT);
    expect(citationText).toBe("Corr v IBC Vehicles Ltd [2008] 1 AC 884");
    expect(mockFetchSourceUpdate.mock.calls[0][1]).toBe(citationText);
  });

  test("the merge table offers the neutral citation fields, pre-selected where the record is blank", async () => {
    await renderDialog(CORR_REPORT_ONLY, "oscola5", UK_RESULT);
    expect(sourceRadio("2008")).toBeChecked();
    expect(sourceRadio("UKHL")).toBeChecked();
    expect(sourceRadio("15")).toBeChecked();
  });

  // STD-021: the merge table lists the OSCOLA neutral citation fields
  // through the standard-aware `getFieldsForSourceType` with their labels.
  test("labels the neutral citation fields rather than showing raw keys", async () => {
    await renderDialog(CORR_REPORT_ONLY, "oscola5", UK_RESULT);
    expect(screen.queryByLabelText(/^neutralCitationYear:/)).toBeNull();
    expect(screen.queryByLabelText(/^neutralCitationCourt:/)).toBeNull();
    expect(screen.queryByLabelText(/^neutralCitationNumber:/)).toBeNull();
  });

  test("Apply writes the neutral citation fields and the merged record renders per OSCOLA 5 rr 2.1.2–2.1.3", async () => {
    const { onApply } = await renderDialog(CORR_REPORT_ONLY, "oscola5", UK_RESULT);
    const data = await applyAndRead(onApply);
    expect(data).toMatchObject({
      neutralCitationYear: "2008",
      neutralCitationCourt: "UKHL",
      neutralCitationNumber: "15",
      reportSeries: "AC",
    });
    expect(onApply.mock.calls[0][1]).toBe(3);
    expect(textUnder({ ...CORR_REPORT_ONLY, data }, "oscola5")).toBe(
      "Corr v IBC Vehicles Ltd [2008] UKHL 15, [2008] 1 AC 884"
    );
  });

  test("has no axe violations", async () => {
    const { container } = await renderDialog(CORR_REPORT_ONLY, "oscola5", UK_RESULT);
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── NZ case under NZLSG 3 ──────────────────────────────────────────────────

describe("STD-009 update from source for an NZ case (nzlsg3)", () => {
  test("the lookup is given the NZLSG rendering of the record", async () => {
    const { citationText } = await renderDialog(FONOTIA, "nzlsg3", NZ_RESULT);
    expect(citationText).toBe("R v Fonotia [2007] NZCA 188");
    expect(mockFetchSourceUpdate.mock.calls[0][1]).toBe(citationText);
  });

  test("the merge table offers the parallel report fields, pre-selected where the record is blank", async () => {
    await renderDialog(FONOTIA, "nzlsg3", NZ_RESULT);
    expect(sourceRadio("NZLR")).toBeChecked();
    expect(sourceRadio("3")).toBeChecked();
    expect(sourceRadio("338")).toBeChecked();
  });

  // STD-021: the merge table lists the parallel report fields for an NZ
  // neutral-citation case through the standard-aware field list.
  test("labels the parallel report fields rather than showing raw keys", async () => {
    await renderDialog(FONOTIA, "nzlsg3", NZ_RESULT);
    expect(screen.queryByLabelText(/^reportSeries:/)).toBeNull();
    expect(screen.queryByLabelText(/^startingPage:/)).toBeNull();
  });

  test("Apply writes the parallel report fields", async () => {
    const { onApply } = await renderDialog(FONOTIA, "nzlsg3", NZ_RESULT);
    const data = await applyAndRead(onApply);
    expect(data).toMatchObject({ court: "NZCA", caseNumber: "188", reportSeries: "NZLR", volume: "3", startingPage: "338" });
    expect(onApply.mock.calls[0][1]).toBe(3);
  });

  // STD-021: the NZLSG dispatcher reads the AGLC form fields
  // (`reportSeries`/`volume`/`startingPage` → parallel report).
  test("the merged record renders with its parallel report per NZLSG 3 r 3.2", async () => {
    const { onApply } = await renderDialog(FONOTIA, "nzlsg3", NZ_RESULT);
    const data = await applyAndRead(onApply);
    expect(textUnder({ ...FONOTIA, data }, "nzlsg3")).toBe("R v Fonotia [2007] NZCA 188, [2007] 3 NZLR 338");
  });

  test("has no axe violations", async () => {
    const { container } = await renderDialog(FONOTIA, "nzlsg3", NZ_RESULT);
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── AU case under AGLC4 (parity) ───────────────────────────────────────────

describe("STD-009 update from source for an AU case (aglc4)", () => {
  test("the lookup is given the AGLC rendering and a form field is labelled", async () => {
    const { citationText, onApply } = await renderDialog(MABO_MNC, "aglc4", AU_RESULT);
    expect(citationText).toBe("Mabo v Queensland (No 2) [1992] HCA 23");
    expect(screen.getByLabelText("Judicial Officer: Brennan J (From Mock Adapter)")).toBeChecked();
    const data = await applyAndRead(onApply);
    expect(data).toMatchObject({ judicialOfficer: "Brennan J", court: "HCA" });
  });

  test("has no axe violations", async () => {
    const { container } = await renderDialog(MABO_MNC, "aglc4", AU_RESULT);
    expect(await axe(container)).toHaveNoViolations();
  });
});
