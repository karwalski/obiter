/**
 * @jest-environment jsdom
 *
 * B7 / COURT-122: "Open Validate for details" in Prepare for Handover
 * opens Validate with the results already shown; the user does not have to
 * press Validate Document again.
 */
import * as React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Handover from "../../src/ui/views/Handover";
import Validation from "../../src/ui/views/Validation";
import type { HandoverSnapshot } from "../../src/word/handoverCheck";
import {
  readValidationRouteState,
  validationRouteState,
} from "../../src/ui/views/validationRouteState";

const mockReadSnapshot = jest.fn();
jest.mock("../../src/word/handoverCheck", () => {
  const actual = jest.requireActual("../../src/word/handoverCheck");
  return {
    ...actual,
    readHandoverSnapshot: (...args: unknown[]): unknown => mockReadSnapshot(...args),
  };
});

jest.mock("../../src/ui/components/CheckReference", () => ({
  __esModule: true,
  default: () => null,
}));

const mockStore = {
  getAll: jest.fn((): unknown[] => []),
  getPropertyOptOut: jest.fn(() => []),
  setPropertyOptOut: jest.fn(async () => undefined),
  getById: jest.fn(() => undefined),
  getStandardId: jest.fn(() => "aglc4"),
  getWritingMode: jest.fn(() => "academic"),
  getCourtJurisdiction: jest.fn(() => undefined),
  getCourtToggles: jest.fn(() => undefined),
};
jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
}));

// Two footnotes with a missing closing full stop (AGLC4 r 1.1.4) so the
// check has issues to carry across.
const SNAPSHOT: HandoverSnapshot = {
  footnoteTexts: ["Example Pty Ltd v Sample Council (2001) 1 CLR 1", "Second note"],
  bodyText: "Synthetic submissions fixture",
  headingLevels: [1],
  properties: [],
  storeParts: 1,
  backupParts: 0,
  controls: { footnotes: 2, locked: 0, citations: 0, notices: 0 },
  comments: 0,
  pendingRevisions: 0,
  trackingMode: "Off",
};

const wordRun = jest.fn(async <T,>(cb: (ctx: unknown) => Promise<T>): Promise<T> => cb({}));

beforeEach(() => {
  jest.clearAllMocks();
  mockReadSnapshot.mockResolvedValue(SNAPSHOT);
  (global as Record<string, unknown>).Word = { run: wordRun };
});

afterEach(() => {
  delete (global as Record<string, unknown>).Word;
});

describe("B7: Handover hands its results to Validate", () => {
  test("Validate shows the handover results without another run", async () => {
    render(
      <MemoryRouter initialEntries={["/handover"]}>
        <Routes>
          <Route path="/handover" element={<Handover />} />
          <Route path="/validation" element={<Validation />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: "Check document" }));
    const open = await screen.findByRole("button", { name: "Open Validate for details" });
    const summary = screen.getByText(/for information\./).textContent ?? "";
    const runsBefore = wordRun.mock.calls.length;

    fireEvent.click(open);

    expect(await screen.findByRole("heading", { name: "Validation" })).toBeTruthy();
    // The empty state ("Click 'Validate Document' ...") is not shown.
    expect(screen.queryByText(/to check your document against citation rules/)).toBeNull();
    expect(screen.getByTestId("validation-origin-note").textContent).toBe(
      "Results from the pre-handover check. Press Validate Document after making changes."
    );
    // The counts match the handover summary.
    const errors = /(\d+) error/.exec(summary)?.[1];
    const warnings = /(\d+) warning/.exec(summary)?.[1];
    expect(errors).toBeDefined();
    const bar = document.querySelector(".validation-summary");
    expect(bar?.textContent).toContain(`${errors} error`);
    expect(bar?.textContent).toContain(`${warnings} warning`);
    // Validate did not read the document again.
    expect(wordRun.mock.calls.length).toBe(runsBefore);
  });

  test("opening Validate directly still starts empty", () => {
    render(
      <MemoryRouter initialEntries={["/validation"]}>
        <Routes>
          <Route path="/validation" element={<Validation />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/to check your document against citation rules/)).toBeTruthy();
    expect(screen.queryByTestId("validation-origin-note")).toBeNull();
  });

  test("route state helpers reject malformed state", () => {
    const result = { errors: [], warnings: [], info: [] };
    expect(readValidationRouteState(validationRouteState(result))?.validationResult).toBe(result);
    expect(readValidationRouteState(undefined)).toBeUndefined();
    expect(
      readValidationRouteState({ validationResult: { errors: [] }, origin: "handover" })
    ).toBeUndefined();
    expect(readValidationRouteState({ validationResult: result })).toBeUndefined();
  });
});
