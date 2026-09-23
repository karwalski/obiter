/**
 * @jest-environment jsdom
 *
 * STD-009: the Citation Library under each standard and under court mode.
 *
 * The library card itself shows the citation label, not the rendered text;
 * the text the library renders in the active standard reaches the user
 * through Insert as, the Find duplicates rows and the Update from source
 * dialog (whose `citationText` is the library's rendering). Those are the
 * surfaces asserted here.
 *
 * Tests assert the correct behaviour. Where the current code fails, the
 * assertion is kept and the test is `test.failing` with the fix story named,
 * so the suite is green now and flips red when the story lands.
 */

import * as React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import CitationLibrary from "../../../src/ui/views/CitationLibrary";
import type { Citation } from "../../../src/types/citation";
import {
  CARD_CASE,
  CORR_NEUTRAL,
  EDELMAN_BOOK,
  FONOTIA,
  MABO_COURT_HCA_TEXT,
  MABO_MNC,
  MABO_REPORTED,
  STANDARDS,
  courtHca,
  mockStoreFor,
  runsText,
  withShortTitle,
} from "./storeMock";
import type { MockStore, MockStoreOptions, StandardKey } from "./storeMock";

// ─── Mocks (the library suite's set, with the store parameterised) ──────────

const mockTriggerRefresh = jest.fn();
jest.mock("../../../src/ui/context/CitationContext", () => ({
  useCitationContext: (): unknown => ({
    setSelectedCitationId: jest.fn(),
    triggerRefresh: mockTriggerRefresh,
    refreshCounter: 0,
  }),
}));

const mockAnnounce = jest.fn();
jest.mock("../../../src/ui/context/StatusContext", () => ({
  useStatus: (): unknown => ({ announce: mockAnnounce, entries: [], clear: jest.fn() }),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: (): unknown => mockNavigate,
}));

const mockFetchSourceUpdate = jest.fn();
jest.mock("../../../src/api/updateFromSource", () => ({
  canUpdateFromSource: (): unknown => ({ ok: true }),
  fetchSourceUpdate: (...args: unknown[]): unknown => mockFetchSourceUpdate(...args),
}));

jest.mock("../../../src/word/footnoteManager", () => {
  const { pinpointToTitleString } = jest.requireActual(
    "../../../src/engine/rules/v4/general/pinpoints"
  ) as { pinpointToTitleString: (p: { type: string; value: string }) => string };
  return {
    insertCitationFootnote: jest.fn(),
    getAllCitationFootnotes: jest.fn(async () => []),
    deleteAllOccurrences: jest.fn(),
    buildOccurrenceTitle: jest.fn(
      (pref: string, pin?: string | { type: string; value: string }): string => {
        const encoded = typeof pin === "string" ? pin : pin ? pinpointToTitleString(pin) : "";
        return encoded ? `Citation:${pref}:${encoded}` : `Citation:${pref}`;
      }
    ),
  };
});
jest.mock("../../../src/word/sourceImporter", () => ({
  getWordSourcesXml: jest.fn(async () => null),
}));
jest.mock("../../../src/actions/citationService", () => ({
  mergeDuplicateCitation: jest.fn(async () => 1),
  ignoreDuplicatePair: jest.fn(async () => 2),
}));

let mockStore: MockStore;
jest.mock("../../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
  getSharedStoreIfReady: (): unknown => mockStore,
}));
jest.mock("../../../src/store/devicePreferences", () => ({
  getDevicePref: (): unknown => undefined,
  setDevicePref: (): void => undefined,
}));

const footnoteManagerMock = jest.requireMock("../../../src/word/footnoteManager") as {
  insertCitationFootnote: jest.Mock;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function renderLibrary(opts: MockStoreOptions): Promise<HTMLElement> {
  mockStore = mockStoreFor(opts);
  const { container } = render(
    <MemoryRouter>
      <CitationLibrary />
    </MemoryRouter>
  );
  await waitFor(() => expect(screen.queryByText("Loading citations...")).toBeNull());
  return container;
}

const academic = (standardId: StandardKey, citations: Citation[]): MockStoreOptions => ({
  standardId,
  citations,
});

/** The text the library renders for a citation, read through Update from source. */
async function libraryTextOf(): Promise<string> {
  mockFetchSourceUpdate.mockResolvedValue({
    status: "same",
    adapterId: "mock",
    adapterLabel: "Mock Adapter",
    fields: {},
    differences: [],
  });
  fireEvent.click(screen.getByRole("button", { name: "Update from source" }));
  await waitFor(() => expect(mockFetchSourceUpdate).toHaveBeenCalledTimes(1));
  return mockFetchSourceUpdate.mock.calls[0][1] as string;
}

interface Inserted {
  title: string;
  text: string;
}

async function insertWithPinpoint(mode: "Full citation" | RegExp, pinpoint: string): Promise<Inserted> {
  fireEvent.click(screen.getByRole("button", { name: "Insert ▾" }));
  fireEvent.change(screen.getByLabelText("Pinpoint reference"), { target: { value: pinpoint } });
  fireEvent.click(screen.getByRole("button", { name: mode }));
  await waitFor(() => expect(footnoteManagerMock.insertCitationFootnote).toHaveBeenCalledTimes(1));
  const [, title, runs] = footnoteManagerMock.insertCitationFootnote.mock.calls[0] as [
    string,
    string,
    Array<{ text: string }>,
  ];
  return { title, text: runsText(runs) };
}

beforeEach(() => {
  mockAnnounce.mockClear();
  mockTriggerRefresh.mockClear();
  mockNavigate.mockClear();
  mockFetchSourceUpdate.mockReset();
  footnoteManagerMock.insertCitationFootnote.mockClear();
});

// ─── Scenario 1: the library's rendering per standard ───────────────────────

describe.each(STANDARDS)("STD-009 library rendering under %s", (standardId) => {
  const { citation, expected, rule } = CARD_CASE[standardId];

  test(`renders the case in the active standard (${rule})`, async () => {
    await renderLibrary(academic(standardId, [citation]));
    expect(await libraryTextOf()).toBe(expected);
  });

  test("the card lists the case and offers Insert, Details, Quote and Update from source", async () => {
    await renderLibrary(academic(standardId, [citation, EDELMAN_BOOK]));
    expect(screen.getAllByRole("button", { name: "Insert ▾" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Details" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Quote" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Update from source" })).toHaveLength(2);
  });

  test("has no axe violations with the insert menu open", async () => {
    const container = await renderLibrary(academic(standardId, [citation, EDELMAN_BOOK]));
    fireEvent.click(screen.getAllByRole("button", { name: "Insert ▾" })[0]);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("STD-009 library rendering under court mode (AGLC4, HCA preset)", () => {
  // STD-013: fails until the library resolves its config through the one
  // document config resolver (writing mode from the store, not the academic
  // base); today `buildCourtConfig(getStandardConfig(id), toggles)` drops
  // the toggles and renders the report alone.
  test("renders Mabo with its parallel MNC (HCA PD 2 of 2024; court preset parallelCitations mandatory)", async () => {
    await renderLibrary(courtHca([MABO_REPORTED]));
    expect(await libraryTextOf()).toBe(MABO_COURT_HCA_TEXT);
  });

  test("renders Mabo by MNC unchanged", async () => {
    await renderLibrary(courtHca([MABO_MNC]));
    expect(await libraryTextOf()).toBe("Mabo v Queensland (No 2) [1992] HCA 23");
  });

  test("has no axe violations", async () => {
    const container = await renderLibrary(courtHca([MABO_REPORTED, MABO_MNC]));
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── Scenario 2: Insert as with a typed pinpoint per standard ───────────────

describe("STD-009 Insert as with a typed [42] under aglc4", () => {
  test("full: paragraph pinpoint in AGLC form (r 1.1.6, r 2.2.5) and the typed pinpoint in the title", async () => {
    await renderLibrary(academic("aglc4", [MABO_REPORTED]));
    const { title, text } = await insertWithPinpoint("Full citation", "[42]");
    expect(title).toBe("Citation:full:[42]");
    expect(text).toBe("Mabo v Queensland (No 2) (1992) 175 CLR 1 [42].");
    expect(mockTriggerRefresh).toHaveBeenCalled();
  });

  test("short: (n X) form carries the paragraph pinpoint (r 1.4.1)", async () => {
    await renderLibrary(academic("aglc4", [withShortTitle(MABO_REPORTED, "Mabo")]));
    const { title, text } = await insertWithPinpoint(/^Short reference/, "[42]");
    expect(title).toBe("Citation:short:[42]");
    expect(text).toContain("Mabo (n 1)");
    expect(text).toContain("[42]");
  });
});

describe("STD-009 Insert as with a typed [42] under oscola5", () => {
  // STD-014: the standard-aware pinpoint formatter renders a paragraph
  // pinpoint after a neutral citation without the comma (OSCOLA 5 r 1.1:
  // "[45]" after a neutral citation, ", 42" after a page).
  test("full: paragraph pinpoint follows the neutral citation without a comma (OSCOLA 5 r 1.1)", async () => {
    await renderLibrary(academic("oscola5", [CORR_NEUTRAL]));
    const { title, text } = await insertWithPinpoint("Full citation", "[42]");
    expect(title).toBe("Citation:full:[42]");
    expect(text).toBe("Corr v IBC Vehicles Ltd [2008] UKHL 15 [42].");
  });

  test("full: the title carries the typed pinpoint and the runs carry the neutral citation", async () => {
    await renderLibrary(academic("oscola5", [CORR_NEUTRAL]));
    const { title, text } = await insertWithPinpoint("Full citation", "[42]");
    expect(title).toBe("Citation:full:[42]");
    expect(text).toContain("Corr v IBC Vehicles Ltd [2008] UKHL 15");
    expect(text).toContain("[42]");
  });

  test("short: (n X) form carries the paragraph pinpoint (OSCOLA 5 r 1.2)", async () => {
    await renderLibrary(academic("oscola5", [withShortTitle(CORR_NEUTRAL, "Corr")]));
    const { title, text } = await insertWithPinpoint(/^Short reference/, "[42]");
    expect(title).toBe("Citation:short:[42]");
    expect(text).toContain("Corr (n 1)");
    expect(text).toContain("[42]");
    expect(text).not.toContain("above n");
  });
});

describe("STD-009 Insert as with a typed [42] under nzlsg3", () => {
  test("full: 'at [42]' pinpoint form (NZLSG 3 r 2.2) and the typed pinpoint in the title", async () => {
    await renderLibrary(academic("nzlsg3", [FONOTIA]));
    const { title, text } = await insertWithPinpoint("Full citation", "[42]");
    expect(title).toBe("Citation:full:[42]");
    expect(text).toBe("R v Fonotia [2007] NZCA 188 at [42].");
  });

  test("full: a bare 42 is a page, 'at 42' (NZLSG 3 r 2.2)", async () => {
    await renderLibrary(academic("nzlsg3", [FONOTIA]));
    const { title, text } = await insertWithPinpoint("Full citation", "42");
    expect(title).toBe("Citation:full:42");
    expect(text).toBe("R v Fonotia [2007] NZCA 188 at 42.");
  });

  // STD-014: resolveNzlsgSubsequent renders the occurrence's typed pinpoint
  // through the standard-aware formatter (', at [42]').
  test("short: 'above n' form carries the typed pinpoint as 'at [42]' (NZLSG 3 rr 2.2, 2.3)", async () => {
    await renderLibrary(academic("nzlsg3", [withShortTitle(FONOTIA, "Fonotia")]));
    const { title, text } = await insertWithPinpoint(/^Short reference/, "[42]");
    expect(title).toBe("Citation:short:[42]");
    expect(text).toContain("above n 1");
    expect(text).toContain("at [42]");
  });

  test("short: the title carries the typed pinpoint and the runs use the 'above n' form", async () => {
    await renderLibrary(academic("nzlsg3", [withShortTitle(FONOTIA, "Fonotia")]));
    const { title, text } = await insertWithPinpoint(/^Short reference/, "[42]");
    expect(title).toBe("Citation:short:[42]");
    expect(text).toContain("Fonotia, above n 1");
  });
});

describe("STD-009 Insert as under court mode (AGLC4, HCA preset)", () => {
  // STD-013: fails until the insert path resolves the document config with
  // the store's writing mode; today the parallel MNC is dropped at insert
  // time and only appears after the next refresh.
  test("full with [42]: the inserted runs carry the parallel MNC", async () => {
    await renderLibrary(courtHca([MABO_REPORTED]));
    const { title, text } = await insertWithPinpoint("Full citation", "[42]");
    expect(title).toBe("Citation:full:[42]");
    expect(text).toContain("[1992] HCA 23");
    expect(text).toContain("[42]");
  });

  test.todo(
    "DECISION-040: whether the Insert menu hides Ibid when the court preset's ibidSuppression is on (HCA preset) — not settled by the rule authority"
  );
});

// ─── Scenario 3: Find duplicates under court mode ───────────────────────────

describe("STD-009 Find duplicates under court mode (AGLC4, HCA preset)", () => {
  async function openDuplicates(): Promise<HTMLElement> {
    fireEvent.click(screen.getByRole("button", { name: "Find duplicates" }));
    return screen.findByRole("dialog", { name: "Find duplicates" });
  }

  test("Mabo by report and by MNC form one cluster", async () => {
    await renderLibrary(courtHca([MABO_REPORTED, MABO_MNC, EDELMAN_BOOK]));
    const dialog = await openDuplicates();
    expect(dialog).toHaveTextContent("1 of 1");
    expect(screen.getAllByRole("radio", { name: /^Keep this one:/ })).toHaveLength(2);
  });

  // STD-020: the dedupe legal key includes every parallel citation and the
  // MNC, so a report record carrying "[1992] HCA 23" as a parallel citation
  // and the MNC record cluster on the legal key rather than the loose
  // title-and-year match.
  test("the cluster is a legal match (same medium neutral citation), not a loose title match", async () => {
    await renderLibrary(courtHca([MABO_REPORTED, MABO_MNC]));
    const dialog = await openDuplicates();
    expect(dialog).not.toHaveTextContent("Similar title and year");
    expect(dialog).toHaveTextContent(/Same (medium neutral|report) citation/);
  });

  test("the MNC member row renders in the active configuration", async () => {
    await renderLibrary(courtHca([MABO_REPORTED, MABO_MNC]));
    const dialog = await openDuplicates();
    expect(dialog).toHaveTextContent("Mabo v Queensland (No 2) [1992] HCA 23.");
  });

  // STD-013: fails until the library's duplicates formatter resolves the
  // court config; today the report member renders without its parallel MNC.
  test("the report member row renders with its parallel MNC under the HCA preset", async () => {
    await renderLibrary(courtHca([MABO_REPORTED, MABO_MNC]));
    const dialog = await openDuplicates();
    expect(dialog).toHaveTextContent(`${MABO_COURT_HCA_TEXT}.`);
  });

  test("has no axe violations with the duplicates dialog open", async () => {
    const container = await renderLibrary(courtHca([MABO_REPORTED, MABO_MNC]));
    await openDuplicates();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe.each(STANDARDS)("STD-009 Find duplicates under %s", (standardId) => {
  test("member rows render in the active standard", async () => {
    const { citation, expected } = CARD_CASE[standardId];
    const twin: Citation = {
      ...citation,
      id: `${citation.id}-twin`,
      createdAt: "2026-03-01T00:00:00.000Z",
    };
    await renderLibrary(academic(standardId, [citation, twin]));
    fireEvent.click(screen.getByRole("button", { name: "Find duplicates" }));
    const dialog = await screen.findByRole("dialog", { name: "Find duplicates" });
    expect(dialog).toHaveTextContent(`${expected}.`);
  });
});
