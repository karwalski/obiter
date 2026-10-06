/**
 * @jest-environment jsdom
 *
 * COURT-122 (OBI-206) — Prepare for handover view.
 *
 * The contract: the view states that output is "compatibility-checked, not
 * guaranteed accepted for filing"; nothing is read or changed until the
 * user runs the check; the check lists validation counts, edited and
 * locked footnotes, Obiter.* properties (never other tools' properties),
 * Obiter's data part and controls, and comment and revision counts with
 * no action on them; each property removal is its own explicit choice
 * and can be undone.
 */
import * as React from "react";
import { render, fireEvent, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import Handover, { HANDOVER_DISCLAIMER } from "../../src/ui/views/Handover";
import type { HandoverSnapshot } from "../../src/word/handoverCheck";
import { clearRefreshIssues, recordRefreshIssues } from "../../src/ui/recoveryQueue";

const mockReadSnapshot = jest.fn();
const mockRemove = jest.fn();
const mockRestore = jest.fn();
jest.mock("../../src/word/handoverCheck", () => {
  const actual = jest.requireActual("../../src/word/handoverCheck");
  return {
    ...actual,
    readHandoverSnapshot: (...args: unknown[]): unknown => mockReadSnapshot(...args),
    removeObiterProperty: (...args: unknown[]): unknown => mockRemove(...args),
    restoreObiterProperty: (...args: unknown[]): unknown => mockRestore(...args),
  };
});

let mockOptOut: string[] = [];
const mockStore = {
  getAll: jest.fn((): unknown[] => []),
  getPropertyOptOut: jest.fn(() => [...mockOptOut]),
  setPropertyOptOut: jest.fn(async (keys: string[]) => {
    mockOptOut = [...keys];
  }),
  getById: jest.fn(() => undefined),
  getStandardId: jest.fn(() => "aglc4"),
  getWritingMode: jest.fn(() => "academic"),
  getCourtJurisdiction: jest.fn(() => undefined),
  getCourtToggles: jest.fn(() => undefined),
};
const mockWriteProps = jest.fn();
jest.mock("../../src/word/documentProperties", () => {
  const actual = jest.requireActual("../../src/word/documentProperties");
  return {
    ...actual,
    writeObiterProperties: (...args: unknown[]): unknown => mockWriteProps(...args),
  };
});
jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
}));

const SNAPSHOT: HandoverSnapshot = {
  footnoteTexts: ["Example Pty Ltd v Sample Council (2001) 1 CLR 1."],
  bodyText: "Synthetic submissions fixture",
  headingLevels: [1],
  properties: [
    { key: "Obiter.Version", value: "1.17.7", type: "String" },
    { key: "Obiter.Author", value: "[legacy placeholder]", type: "String" },
    { key: "ClientMatter", value: "EX-0001", type: "String" },
  ],
  storeParts: 1,
  backupParts: 0,
  controls: { footnotes: 4, locked: 1, citations: 4, notices: 0 },
  comments: 1,
  pendingRevisions: 2,
  trackingMode: "TrackAll",
};

beforeEach(() => {
  jest.clearAllMocks();
  clearRefreshIssues();
  mockReadSnapshot.mockResolvedValue(SNAPSHOT);
  mockRemove.mockImplementation(async (_ctx: unknown, key: string) => ({
    key,
    value: "[legacy placeholder]",
  }));
  mockRestore.mockResolvedValue(undefined);
  mockOptOut = [];
  mockWriteProps.mockResolvedValue({ written: ["Obiter.Version"], removed: [] });
  (global as Record<string, unknown>).Word = {
    run: async <T,>(cb: (ctx: unknown) => Promise<T>): Promise<T> => cb({}),
  };
});

afterEach(() => {
  delete (global as Record<string, unknown>).Word;
});

function renderView(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <Handover />
    </MemoryRouter>
  );
}

describe("Prepare for handover (COURT-122)", () => {
  test("states the filing disclaimer and reads nothing until the user runs the check", async () => {
    const { container } = renderView();
    expect(screen.getByText(HANDOVER_DISCLAIMER)).toBeTruthy();
    expect(HANDOVER_DISCLAIMER).toContain("compatibility-checked, not guaranteed accepted for filing");
    expect(mockReadSnapshot).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  test("lists Obiter properties with Remove buttons and never other tools' properties", async () => {
    recordRefreshIssues({
      failures: [],
      userEdits: [
        {
          footnoteNumber: 3,
          currentText: "a",
          expectedText: "b",
          reason: "edited",
        } as never,
      ],
    });
    const { container } = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Check document" }));

    await screen.findByText("Obiter.Author");
    expect(screen.getByRole("button", { name: "Remove the property Obiter.Version" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove the property Obiter.Author" })).toBeTruthy();
    expect(screen.queryByText("ClientMatter")).toBeNull();
    expect(screen.getByText(/1 property from other tools is not shown and never changed/)).toBeTruthy();
    expect(screen.getByText(/Written by an earlier release/)).toBeTruthy();

    // Footnotes, data and review state are reported, read-only.
    expect(screen.getByText(/footnote 3\./)).toBeTruthy();
    expect(screen.getByText(/1 locked footnote/)).toBeTruthy();
    expect(screen.getByText(/Citation library part:/).textContent).toContain("present");
    expect(screen.getByText(/Comments:/).textContent).toContain("1");
    expect(screen.getByText(/Pending tracked changes:/).textContent).toContain("2");
    expect(screen.queryByRole("button", { name: /comment|tracked/i })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  test("removal is per item and can be undone with the original value", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Check document" }));
    const remove = await screen.findByRole("button", { name: "Remove the property Obiter.Author" });

    fireEvent.click(remove);
    const undo = await screen.findByRole("button", { name: "Undo the removal of Obiter.Author" });
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove.mock.calls[0][1]).toBe("Obiter.Author");
    // The other property is untouched and still offers its own Remove.
    expect(screen.getByRole("button", { name: "Remove the property Obiter.Version" })).toBeTruthy();

    fireEvent.click(undo);
    await screen.findByRole("button", { name: "Remove the property Obiter.Author" });
    expect(mockRestore).toHaveBeenCalledWith(expect.anything(), {
      key: "Obiter.Author",
      value: "[legacy placeholder]",
    });
    const status = screen.getAllByRole("status")[0];
    expect(within(status).getByText(/Put back Obiter.Author/)).toBeTruthy();
  });

  test("a removed property keeps its Undo after Check again reads it as absent", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Check document" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove the property Obiter.Author" })
    );
    await screen.findByRole("button", { name: "Undo the removal of Obiter.Author" });

    // The document no longer holds the property when the check runs again.
    mockReadSnapshot.mockResolvedValueOnce({
      ...SNAPSHOT,
      properties: SNAPSHOT.properties?.filter((p) => p.key !== "Obiter.Author"),
    });
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    await screen.findByRole("button", { name: "Remove the property Obiter.Version" });
    fireEvent.click(screen.getByRole("button", { name: "Undo the removal of Obiter.Author" }));
    await screen.findByText(/Put back Obiter.Author/);
    expect(mockRestore).toHaveBeenCalledWith(expect.anything(), {
      key: "Obiter.Author",
      value: "[legacy placeholder]",
    });
  });

  test("a refused write shows the read-only message and changes nothing", async () => {
    const { DocumentReadOnlyError, READ_ONLY_MESSAGE } = jest.requireActual(
      "../../src/word/documentAccess"
    );
    mockRemove.mockRejectedValueOnce(new DocumentReadOnlyError(undefined));
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Check document" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove the property Obiter.Author" })
    );
    await screen.findByText(READ_ONLY_MESSAGE);
    expect(screen.queryByRole("button", { name: /Undo/ })).toBeNull();
  });

  test("hosts without property access say where to review them instead", async () => {
    mockReadSnapshot.mockResolvedValueOnce({ ...SNAPSHOT, properties: undefined, comments: undefined });
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Check document" }));
    await screen.findByText(/does not let add-ins read document properties/);
    expect(screen.getByText(/Comments:/).textContent).toContain("not available");
  });
});

describe("COURT-122 follow-up: a removed property stays removed (owner, 7 Oct 2026)", () => {
  test("removing Obiter.Version records the opt-out in the document's Obiter store", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Check document" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove the property Obiter.Version" })
    );
    await screen.findByText(/Removed Obiter.Version. Obiter will not write it again./);
    expect(mockStore.setPropertyOptOut).toHaveBeenCalledWith(["Obiter.Version"]);
    expect(screen.getByTestId("handover-property-optout").textContent).toContain(
      "Obiter does not write Obiter.Version to this document."
    );
    expect(
      screen.getByRole("button", { name: "Turn Obiter properties back on" })
    ).toBeTruthy();
  });

  test("removing the retired Obiter.Author records no opt-out (it is never written)", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Check document" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove the property Obiter.Author" })
    );
    await screen.findByRole("button", { name: "Undo the removal of Obiter.Author" });
    expect(mockStore.setPropertyOptOut).not.toHaveBeenCalled();
    expect(screen.queryByTestId("handover-property-optout")).toBeNull();
  });

  test("Undo puts the property back and clears its opt-out", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Check document" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove the property Obiter.Version" })
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Undo the removal of Obiter.Version" })
    );
    await screen.findByText(/Put back Obiter.Version/);
    expect(mockStore.setPropertyOptOut).toHaveBeenLastCalledWith([]);
    expect(screen.queryByTestId("handover-property-optout")).toBeNull();
  });

  test("an opt-out saved in the document is shown, and turning properties back on writes them", async () => {
    mockOptOut = ["Obiter.Version", "Obiter.CreatedDate"];
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Check document" }));
    const panel = await screen.findByTestId("handover-property-optout");
    expect(panel.textContent).toContain("Obiter.Version, Obiter.CreatedDate");
    // The document holds one citation when the properties are turned back on.
    mockStore.getAll.mockReturnValueOnce([{ id: "c1" }]);

    fireEvent.click(screen.getByRole("button", { name: "Turn Obiter properties back on" }));
    await screen.findByText(/Obiter will write its properties again. Written: Obiter.Version./);
    expect(mockStore.setPropertyOptOut).toHaveBeenCalledWith([]);
    // Written now with an empty opt-out, for a document holding citations.
    expect(mockWriteProps).toHaveBeenCalledWith(expect.anything(), expect.any(String), "aglc4", 1, []);
    expect(screen.queryByTestId("handover-property-optout")).toBeNull();
  });

  test("the copy says a removal sticks and no longer says Obiter writes it again", async () => {
    const { container } = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Check document" }));
    await screen.findByText("Obiter.Author");
    expect(container.textContent).toContain("A property you remove stays removed");
    expect(container.textContent).not.toContain("writes Obiter.Version, Obiter.CitationStyle");
  });
});
