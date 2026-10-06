/**
 * @jest-environment jsdom
 *
 * COURT-108 follow-up (owner, 7 Oct 2026): Refresh All, the refresh after an
 * insert or edit, and a refresh a Settings change starts ASK FIRST while
 * Track Changes is on (Document.changeTrackingMode, WordApi 1.4, read
 * through apiCompat). The question is an in-pane prompt, never
 * window.confirm or alert (they block Office add-ins), offering "Refresh
 * anyway (as tracked changes)" or "Skip for now". Where the mode cannot be
 * read, or no pane is showing to ask, behaviour is as before. The read
 * costs one sync, whatever the footnote count.
 */
import * as React from "react";
import { render, act, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockRefresh = jest.fn(async () => ({ failures: [], userEdits: [], updated: 0, unchanged: 0 }));
const mockRefreshNow = jest.fn(async () => ({ failures: [], userEdits: [], updated: 1, unchanged: 0 }));
jest.mock("../../src/word/citationRefresher", () => ({
  refreshAllCitations: (...a: unknown[]) => mockRefresh(...(a as [])),
  refreshAllCitationsNow: (...a: unknown[]) => mockRefreshNow(...(a as [])),
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

import {
  ASK_IF_TRACKED,
  CitationProvider,
  useCitationContext,
  type TriggerRefreshOptions,
} from "../../src/ui/context/CitationContext";
import TrackedRefreshConfirm, {
  TRACKED_REFRESH_EXPLANATION,
} from "../../src/ui/components/TrackedRefreshConfirm";
import TrackChangesBanner from "../../src/ui/components/TrackChangesBanner";
import { getTrackChangesGate, resetTrackChangesGate } from "../../src/ui/trackChangesGate";
import { getPendingTrackedRefresh, resetTrackedRefresh } from "../../src/ui/trackedRefreshConsent";
import {
  confirmManagedRefresh,
  hasTrackedWriteConsentHandler,
  refreshAllCitationsWithConsent,
  setTrackedWriteConsentHandler,
} from "../../src/word/trackedWriteConsent";
import type { CitationStore } from "../../src/store/citationStore";

let trackingMode = "TrackAll";
let syncs = 0;
let wordRuns = 0;

function installWord(): void {
  (globalThis as Record<string, unknown>).Word = {
    run: (fn: (ctx: unknown) => Promise<unknown>) => {
      wordRuns++;
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

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

beforeEach(() => {
  mockRefresh.mockClear();
  mockRefreshNow.mockClear();
  resetTrackChangesGate();
  resetTrackedRefresh();
  syncs = 0;
  wordRuns = 0;
  trackingMode = "TrackAll";
  installWord();
  installOffice(1.5);
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).Office;
});

describe("COURT-108: confirmManagedRefresh (word layer)", () => {
  test("with no pane to ask, refreshes as before and reads nothing", async () => {
    expect(hasTrackedWriteConsentHandler()).toBe(false);
    expect(await confirmManagedRefresh("refresh-all")).toBe(true);
    expect(wordRuns).toBe(0);
  });

  test("Track Changes on: asks the pane, with one sync, and returns its answer", async () => {
    const ask = jest.fn(async () => false);
    const unregister = setTrackedWriteConsentHandler(ask);
    expect(await confirmManagedRefresh("insert")).toBe(false);
    expect(ask).toHaveBeenCalledWith({ reason: "insert", mode: "TrackAll" });
    expect(syncs).toBe(1);
    ask.mockResolvedValueOnce(true);
    expect(await confirmManagedRefresh("edit")).toBe(true);
    unregister();
    expect(hasTrackedWriteConsentHandler()).toBe(false);
  });

  test("Track Changes off: no question", async () => {
    trackingMode = "Off";
    const ask = jest.fn(async () => false);
    const unregister = setTrackedWriteConsentHandler(ask);
    expect(await confirmManagedRefresh("refresh-all")).toBe(true);
    expect(ask).not.toHaveBeenCalled();
    unregister();
  });

  test("below WordApi 1.4 the mode is not readable: no read, no question", async () => {
    installOffice(1.3);
    const ask = jest.fn(async () => false);
    const unregister = setTrackedWriteConsentHandler(ask);
    expect(await confirmManagedRefresh("refresh-all")).toBe(true);
    expect(syncs).toBe(0);
    expect(ask).not.toHaveBeenCalled();
    unregister();
  });

  test("a failed read behaves as before", async () => {
    (globalThis as Record<string, unknown>).Word = {
      run: () => Promise.reject(new Error("host busy")),
    };
    const ask = jest.fn(async () => false);
    const unregister = setTrackedWriteConsentHandler(ask);
    expect(await confirmManagedRefresh("refresh-all")).toBe(true);
    expect(ask).not.toHaveBeenCalled();
    unregister();
  });

  test("refreshAllCitationsWithConsent skips the refresh when the user skips", async () => {
    const store = {} as CitationStore;
    const unregister = setTrackedWriteConsentHandler(async () => false);
    expect(await refreshAllCitationsWithConsent(store, "insert")).toBeNull();
    expect(mockRefreshNow).not.toHaveBeenCalled();
    unregister();
    const accept = setTrackedWriteConsentHandler(async () => true);
    expect(await refreshAllCitationsWithConsent(store, "insert")).toMatchObject({ updated: 1 });
    expect(mockRefreshNow).toHaveBeenCalledTimes(1);
    accept();
  });
});

describe("COURT-108: the in-pane prompt", () => {
  test("shows the question in plain words and resolves with the user's choice", async () => {
    const { unmount } = render(<TrackedRefreshConfirm />);
    expect(hasTrackedWriteConsentHandler()).toBe(true);
    expect(screen.queryByRole("alertdialog")).toBeNull();

    let answer: boolean | undefined;
    await act(async () => {
      void confirmManagedRefresh("refresh-all").then((a) => (answer = a));
      await flush();
    });
    const dialog = screen.getByRole("alertdialog", { name: "Refresh with Track Changes on?" });
    expect(dialog.textContent).toContain(TRACKED_REFRESH_EXPLANATION);
    expect(dialog.textContent).toContain("Refresh All updates every managed footnote");
    expect(dialog.textContent).not.toContain("!");
    expect(document.activeElement?.textContent).toBe("Refresh anyway (as tracked changes)");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh anyway (as tracked changes)" }));
      await flush();
    });
    expect(answer).toBe(true);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    // The automatic refresh that follows does not raise the banner again.
    expect(getTrackChangesGate()).toMatchObject({ paused: true, acknowledged: true });
    unmount();
    expect(hasTrackedWriteConsentHandler()).toBe(false);
  });

  test("two requests while the question shows are answered together", async () => {
    render(<TrackedRefreshConfirm />);
    const answers: boolean[] = [];
    await act(async () => {
      void confirmManagedRefresh("insert").then((a) => answers.push(a));
      void confirmManagedRefresh("edit").then((a) => answers.push(a));
      await flush();
    });
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
    expect(getPendingTrackedRefresh()?.reason).toBe("insert");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
      await flush();
    });
    expect(answers).toEqual([false, false]);
  });

  test("unmounting with a question showing answers skip, so nothing waits or writes", async () => {
    const { unmount } = render(<TrackedRefreshConfirm />);
    let answer: boolean | undefined;
    await act(async () => {
      void confirmManagedRefresh("edit").then((a) => (answer = a));
      await flush();
    });
    unmount();
    await act(flush);
    expect(answer).toBe(false);
  });

  test("never uses window.confirm or alert", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => undefined);
    render(<TrackedRefreshConfirm />);
    await act(async () => {
      void confirmManagedRefresh("refresh-all");
      await flush();
    });
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });
});

describe("COURT-108: a refresh a Settings change starts asks first", () => {
  let trigger: (options?: TriggerRefreshOptions) => void = () => undefined;
  function Grab(): null {
    trigger = useCitationContext().triggerRefresh;
    return null;
  }

  async function mountAndTrigger(options?: TriggerRefreshOptions): Promise<void> {
    render(
      <MemoryRouter>
        <CitationProvider>
          <Grab />
          <TrackChangesBanner onRefreshNow={jest.fn()} />
          <TrackedRefreshConfirm />
        </CitationProvider>
      </MemoryRouter>
    );
    await act(async () => {
      jest.advanceTimersByTime(3000); // startup gate
    });
    await act(async () => {
      trigger(options);
      jest.advanceTimersByTime(1500);
      await flush();
    });
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("Track Changes on: the prompt shows and nothing is written until the user answers", async () => {
    await mountAndTrigger(ASK_IF_TRACKED);
    expect(screen.getByRole("alertdialog").textContent).toContain(
      "The new setting reaches existing footnotes when they are refreshed."
    );
    expect(mockRefresh).not.toHaveBeenCalled();
    // Not the silent pause: the banner is not shown.
    expect(screen.queryByText(/Automatic refresh is\s+paused/)).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh anyway (as tracked changes)" }));
      await flush();
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  test("Skip for now leaves the footnotes alone", async () => {
    await mountAndTrigger(ASK_IF_TRACKED);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
      await flush();
    });
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  test("Track Changes off: refreshes at once without asking", async () => {
    trackingMode = "Off";
    await mountAndTrigger(ASK_IF_TRACKED);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  test("an automatic refresh (no option) still pauses with the banner, as in COURT-108", async () => {
    await mountAndTrigger();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(getTrackChangesGate()).toMatchObject({ paused: true, mode: "TrackAll" });
  });

  test("a click event passed as the argument is not taken as the option", async () => {
    await mountAndTrigger({ type: "click" } as unknown as TriggerRefreshOptions);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(getTrackChangesGate().paused).toBe(true);
  });
});
