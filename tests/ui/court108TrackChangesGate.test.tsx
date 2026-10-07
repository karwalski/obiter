/**
 * @jest-environment jsdom
 *
 * COURT-108 (OBI-205): before any automatic refresh, read
 * Document.changeTrackingMode (WordApi 1.4, R08 §3.6). With Track Changes on,
 * the automatic refresh pauses and the banner offers "Refresh now" (one
 * refresh, recorded as revisions) or "Keep paused". With it off, or on a host
 * that cannot report it, refresh runs as before.
 */
import * as React from "react";
import { render, act, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockRefresh = jest.fn(async () => ({ failures: [], userEdits: [], updated: 0, unchanged: 0 }));
jest.mock("../../src/word/citationRefresher", () => ({
  refreshAllCitations: (...a: unknown[]) => mockRefresh(...(a as [])),
}));
jest.mock("../../src/word/selectionHandler", () => ({
  registerSelectionHandler: jest.fn(async () => undefined),
  unregisterSelectionHandler: jest.fn(async () => undefined),
}));
jest.mock("../../src/word/changeListener", () => ({
  registerChangeListener: jest.fn(async () => undefined),
  unregisterChangeListener: jest.fn(async () => undefined),
}));
jest.mock("../../src/store/singleton", () => ({ getSharedStore: jest.fn(async () => ({})) }));

import { CitationProvider, useCitationContext } from "../../src/ui/context/CitationContext";
import TrackChangesBanner from "../../src/ui/components/TrackChangesBanner";
import { getTrackChangesGate, resetTrackChangesGate } from "../../src/ui/trackChangesGate";
import { EARLY_CLICK_GUARD_MS } from "../../src/ui/noticeGuard";

let trackingMode = "TrackAll";
let syncs = 0;

function installWord(): void {
  (globalThis as Record<string, unknown>).Word = {
    run: (fn: (ctx: unknown) => Promise<unknown>) => {
      const doc = { changeTrackingMode: undefined as string | undefined, load: jest.fn() };
      return fn({
        document: doc,
        sync: async () => {
          syncs++;
          doc.changeTrackingMode = trackingMode;
        },
      });
    },
  };
}

function installOffice(max: number): void {
  (globalThis as Record<string, unknown>).Office = {
    context: {
      requirements: {
        isSetSupported: (set: string, version: string): boolean =>
          set === "WordApi" && parseFloat(version) <= max,
      },
    },
  };
}

let trigger: () => void = () => undefined;
function Grab(): null {
  trigger = useCitationContext().triggerRefresh;
  return null;
}

async function mountAndTrigger(): Promise<void> {
  render(
    <MemoryRouter>
      <CitationProvider>
        <Grab />
      </CitationProvider>
    </MemoryRouter>
  );
  await act(async () => {
    jest.advanceTimersByTime(3000); // startup gate
  });
  await act(async () => {
    trigger();
    jest.advanceTimersByTime(1500);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockRefresh.mockClear();
  resetTrackChangesGate();
  syncs = 0;
  installWord();
});

afterEach(() => {
  jest.useRealTimers();
  delete (globalThis as Record<string, unknown>).Office;
});

test("Track Changes on: the automatic refresh pauses and records the pause", async () => {
  installOffice(1.5);
  trackingMode = "TrackAll";
  await mountAndTrigger();
  expect(mockRefresh).not.toHaveBeenCalled();
  expect(getTrackChangesGate()).toMatchObject({ paused: true, mode: "TrackAll" });
});

test("Track Changes off: the automatic refresh runs as before", async () => {
  installOffice(1.5);
  trackingMode = "Off";
  await mountAndTrigger();
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(getTrackChangesGate().paused).toBe(false);
});

test("a host below WordApi 1.4 never reads the mode and refreshes as before", async () => {
  installOffice(1.3);
  trackingMode = "TrackAll";
  await mountAndTrigger();
  expect(syncs).toBe(0);
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});

describe("TrackChangesBanner", () => {
  test("is hidden until a pause is recorded", () => {
    render(<TrackChangesBanner onRefreshNow={jest.fn()} />);
    expect(screen.queryByText(/Track Changes is on/)).toBeNull();
  });

  test("shows the warning, the revision count and both choices", async () => {
    const { recordTrackingMode } = await import("../../src/ui/trackChangesGate");
    recordTrackingMode("TrackAll", 2);
    const onRefreshNow = jest.fn();
    render(<TrackChangesBanner onRefreshNow={onRefreshNow} />);

    expect(
      screen.getByText(/Track Changes is on: refresh will be recorded as revisions/)
    ).toBeTruthy();
    expect(screen.getByText(/2 pending revisions/)).toBeTruthy();
    expect(screen.queryByText(/!/)).toBeNull();

    // A click at once is double-click carry-over and is ignored (N1).
    fireEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(onRefreshNow).not.toHaveBeenCalled();
    const later = Date.now() + EARLY_CLICK_GUARD_MS + 100;
    const clock = jest.spyOn(Date, "now").mockImplementation(() => later);
    fireEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    clock.mockRestore();
    expect(onRefreshNow).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Track Changes is on/)).toBeNull();
    expect(getTrackChangesGate()).toMatchObject({ paused: true, acknowledged: true });
  });

  test("Keep paused hides the banner and keeps automatic refresh paused", async () => {
    const { recordTrackingMode } = await import("../../src/ui/trackChangesGate");
    recordTrackingMode("TrackMineOnly");
    const onRefreshNow = jest.fn();
    render(<TrackChangesBanner onRefreshNow={onRefreshNow} />);

    fireEvent.click(screen.getByRole("button", { name: "Keep paused" }));
    expect(onRefreshNow).not.toHaveBeenCalled();
    expect(screen.queryByText(/Track Changes is on/)).toBeNull();
    expect(getTrackChangesGate().paused).toBe(true);
  });
});
