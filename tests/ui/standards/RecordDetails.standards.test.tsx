/**
 * @jest-environment jsdom
 *
 * STD-009: the Record details panel for cases from each jurisdiction —
 * source links by jurisdiction (AustLII and Jade for AU, BAILII for UK,
 * NZLII for NZ), the "Cases citing this" row (LawCite is AustLII's and
 * belongs to AU cases only), provenance and previous versions unaffected by
 * the standard, and axe once per standard.
 *
 * The panel takes its citation text from the caller; here it is rendered
 * through the engine under the standard, as the Edit view does.
 */
import * as React from "react";
import { render, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { axe } from "jest-axe";
import RecordDetails from "../../../src/ui/components/RecordDetails";
import { getFormattedPreview } from "../../../src/engine/engine";
import { getStandardConfig } from "../../../src/engine/standards";
import type { CitationVersion } from "../../../src/store/citationHistory";
import type { Citation } from "../../../src/types/citation";
import { CARD_CASE, CORR_REPORTED, FONOTIA, MABO_MNC, STANDARDS, runsText } from "./storeMock";
import type { StandardKey } from "./storeMock";

jest.mock("../../../src/api/citedBy", () => ({
  CITED_BY_NO_DOI: "Citing works need a DOI.",
  citedByForCitation: jest.fn(async () => ({ count: 0, works: [] })),
  addCitingWorkToLibrary: jest.fn(async () => undefined),
  doiForCitation: (): string => "",
  isCitedByUnavailable: (): boolean => false,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function textUnder(citation: Citation, standardId: StandardKey): string {
  return runsText(getFormattedPreview(citation, getStandardConfig(standardId)))
    .trim()
    .replace(/\.$/, "");
}

function withProvenance(citation: Citation): Citation {
  return {
    ...citation,
    data: {
      ...citation.data,
      interchange: {
        v: 1,
        provenance: {
          format: "ris",
          sourceLabel: "Zotero",
          rawType: "CASE",
          rawId: "42",
          importedAt: "2026-09-01T10:00:00.000Z",
        },
      },
    },
  };
}

function version(timestamp: string, changedFields: string[], citation: Citation): CitationVersion {
  return { timestamp, reason: "persist", changedFields, citation };
}

interface Rendered {
  container: HTMLElement;
  loadVersions: jest.Mock<Promise<CitationVersion[]>, []>;
}

function renderPanel(
  citation: Citation,
  standardId: StandardKey,
  versions: CitationVersion[] = []
): Rendered {
  const loadVersions = jest.fn((): Promise<CitationVersion[]> => Promise.resolve(versions));
  const { container } = render(
    <RecordDetails
      citation={citation}
      citationText={textUnder(citation, standardId)}
      onRestore={jest.fn(async () => undefined)}
      loadVersions={loadVersions}
    />
  );
  return { container, loadVersions };
}

/**
 * jsdom flips `open` on the summary click without dispatching toggle, so
 * the toggle is fired explicitly; the empty versions state is awaited so
 * the panel's load settles inside the test.
 */
async function openPanel(): Promise<void> {
  const details = document.querySelector("details.record-details") as HTMLDetailsElement;
  fireEvent.click(screen.getByText("Record details"));
  details.open = true;
  fireEvent(details, new Event("toggle"));
  await screen.findByText(/No previous versions|changed: /);
}

let openSpy: jest.SpyInstance;
beforeEach(() => {
  openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
});
afterEach(() => {
  openSpy.mockRestore();
});

function lastOpenedUrl(): string {
  return openSpy.mock.calls[openSpy.mock.calls.length - 1][0] as string;
}

// ─── AU case under AGLC4 ────────────────────────────────────────────────────

describe("STD-009 record details for an AU case (aglc4)", () => {
  test("offers AustLII and Jade source links and a LawCite lookup for the AGLC text", async () => {
    renderPanel(MABO_MNC, "aglc4");
    await openPanel();
    fireEvent.click(screen.getByRole("button", { name: "View on austlii.edu.au" }));
    expect(lastOpenedUrl()).toBe("https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/HCA/1992/23.html");
    fireEvent.click(screen.getByRole("button", { name: "View on jade.io" }));
    expect(lastOpenedUrl()).toBe("https://jade.io/article/HCA/1992/23");
    expect(screen.getByText("Cases citing this")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "LawCite" }));
    expect(lastOpenedUrl()).toContain(encodeURIComponent("Mabo v Queensland (No 2) [1992] HCA 23"));
    expect(screen.queryByRole("button", { name: /bailii|nzlii/i })).toBeNull();
  });
});

// ─── UK case under OSCOLA 5 ─────────────────────────────────────────────────

describe("STD-009 record details for a UK case (oscola5)", () => {
  test("offers no AustLII or Jade link for a case cited by UK neutral citation", async () => {
    renderPanel(CORR_REPORTED, "oscola5");
    await openPanel();
    expect(screen.queryByRole("button", { name: "View on austlii.edu.au" })).toBeNull();
    expect(screen.queryByRole("button", { name: "View on jade.io" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Jade" })).toBeNull();
  });

  // STD-020: sourceLinks.ts builds the BAILII link from the UK neutral
  // citation (court "UKHL", 2008, 15), gated by jurisdiction.
  test("offers a BAILII link built from the neutral citation", async () => {
    renderPanel(CORR_REPORTED, "oscola5");
    await openPanel();
    fireEvent.click(screen.getByRole("button", { name: "View on bailii.org" }));
    expect(lastOpenedUrl()).toMatch(/^https:\/\/www\.bailii\.org\/.*UKHL\/2008\/15/);
  });

  // STD-020: `lawCiteUrl` is offered for AU cases only.
  test("does not offer AustLII's LawCite lookup", async () => {
    renderPanel(CORR_REPORTED, "oscola5");
    await openPanel();
    expect(screen.queryByRole("button", { name: "LawCite" })).toBeNull();
  });

  // STD-020: BAILII has no citator, so the "Cases citing this" row offers
  // BAILII's search on the neutral citation as the UK equivalent of LawCite.
  test("'Cases citing this' opens BAILII's search on the neutral citation", async () => {
    renderPanel(CORR_REPORTED, "oscola5");
    await openPanel();
    expect(screen.getByText("Cases citing this")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "BAILII" }));
    expect(lastOpenedUrl()).toBe(
      `https://www.bailii.org/cgi-bin/lucy_search_1.cgi?query=${encodeURIComponent("[2008] UKHL 15")}`
    );
    expect(screen.queryByRole("button", { name: "Jade" })).toBeNull();
  });
});

// ─── NZ case under NZLSG 3 ──────────────────────────────────────────────────

describe("STD-009 record details for an NZ case (nzlsg3)", () => {
  // STD-020: sourceLinks.ts builds the NZLII link from the NZ neutral
  // citation (court "NZCA", 2007, 188), gated by jurisdiction.
  test("offers an NZLII link built from the neutral citation", async () => {
    renderPanel(FONOTIA, "nzlsg3");
    await openPanel();
    fireEvent.click(screen.getByRole("button", { name: "View on nzlii.org" }));
    expect(lastOpenedUrl()).toMatch(/^https:\/\/www\.nzlii\.org\/.*NZCA\/2007\/188/);
  });

  // STD-020: the Jade builder is gated to AU courts; an NZCA neutral
  // citation no longer yields a jade.io link that resolves to nothing.
  test("offers no Jade link for an NZ court", async () => {
    renderPanel(FONOTIA, "nzlsg3");
    await openPanel();
    expect(screen.queryByRole("button", { name: "View on jade.io" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Jade" })).toBeNull();
  });

  test("offers no AustLII link for an NZ court", async () => {
    renderPanel(FONOTIA, "nzlsg3");
    await openPanel();
    expect(screen.queryByRole("button", { name: "View on austlii.edu.au" })).toBeNull();
  });

  // STD-020: `lawCiteUrl` is offered for AU cases only.
  test("does not offer AustLII's LawCite lookup", async () => {
    renderPanel(FONOTIA, "nzlsg3");
    await openPanel();
    expect(screen.queryByRole("button", { name: "LawCite" })).toBeNull();
  });

  // STD-020: the "Cases citing this" row offers NZLII's search on the
  // neutral citation as the NZ equivalent of LawCite.
  test("'Cases citing this' opens NZLII's search on the neutral citation", async () => {
    renderPanel(FONOTIA, "nzlsg3");
    await openPanel();
    expect(screen.getByText("Cases citing this")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "NZLII" }));
    expect(lastOpenedUrl()).toBe(
      `https://www.nzlii.org/cgi-bin/sinosrch.cgi?query=${encodeURIComponent("[2007] NZCA 188")}`
    );
  });
});

// ─── Provenance and versions per standard ───────────────────────────────────

describe.each(STANDARDS)("STD-009 record details under %s", (standardId) => {
  const { citation } = CARD_CASE[standardId];

  test("provenance is shown regardless of the standard", async () => {
    renderPanel(withProvenance(citation), standardId);
    await openPanel();
    expect(screen.getByText(/^Imported from RIS \(Zotero\) on .+/)).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  test("previous versions load on open and list the changed fields", async () => {
    const older: Citation = { ...citation, data: { ...citation.data, year: "1900" } };
    const { loadVersions } = renderPanel(citation, standardId, [
      version("2026-09-02T10:00:00.000Z", ["Year"], older),
    ]);
    expect(loadVersions).not.toHaveBeenCalled();
    await openPanel();
    await waitFor(() => expect(loadVersions).toHaveBeenCalledTimes(1));
    const list = await screen.findByRole("list", { name: "Previous versions" });
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("changed: Year");
    expect(screen.getByRole("button", { name: "Restore this version" })).toBeInTheDocument();
  });

  test.todo(
    "DECISION-040: whether a previous-version row should show the version's rendering in the active standard (the row lists changed fields only today)"
  );

  test("has no axe violations open with links and versions", async () => {
    const { container } = renderPanel(withProvenance(citation), standardId, [
      version("2026-09-02T10:00:00.000Z", ["Year"], citation),
    ]);
    await openPanel();
    await screen.findByRole("list", { name: "Previous versions" });
    expect(await axe(container)).toHaveNoViolations();
  });
});
