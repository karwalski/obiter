/**
 * @jest-environment jsdom
 *
 * Field report 27 Sep 2026: a refresh requested while another was running
 * was dropped, so an "auto" Ibid stayed Ibid after a different source was
 * inserted before it. It must run once the current refresh finishes.
 */
import * as React from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let release: (() => void) | null = null;
const mockRefresh = jest.fn(
  () =>
    new Promise((resolve) => {
      release = () => resolve({ failures: [], userEdits: [], updated: 0, unchanged: 0 });
    })
);
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

(globalThis as Record<string, unknown>).Word = {
  run: (fn: (ctx: unknown) => Promise<unknown>) => fn({}),
};

let trigger: () => void = () => undefined;
function Grab(): null {
  trigger = useCitationContext().triggerRefresh;
  return null;
}

test("a refresh requested mid-refresh runs after it instead of being dropped", async () => {
  jest.useFakeTimers();
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

  // First insert: refresh starts and stays running.
  await act(async () => {
    trigger();
    jest.advanceTimersByTime(1500);
  });
  expect(mockRefresh).toHaveBeenCalledTimes(1);

  // Second insert while the first refresh is still running.
  await act(async () => {
    trigger();
    jest.advanceTimersByTime(1500);
  });
  expect(mockRefresh).toHaveBeenCalledTimes(1);

  // The first refresh finishes: the queued one runs.
  await act(async () => {
    release?.();
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockRefresh).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});
