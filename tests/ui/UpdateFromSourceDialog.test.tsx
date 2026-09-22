/**
 * @jest-environment jsdom
 *
 * ENP-007: the Update from source dialog — the checking state, the merge
 * table with blank fields pre-selected from the source, Apply's merged data
 * and provenance stamp, the same and unavailable states, and axe.
 */

import * as React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import UpdateFromSourceDialog from "../../src/ui/components/UpdateFromSourceDialog";
import type { SourceUpdateResult } from "../../src/api/updateFromSource";
import type { Citation, SourceData } from "../../src/types/citation";

const mockFetchSourceUpdate = jest.fn();
jest.mock("../../src/api/updateFromSource", () => ({
  fetchSourceUpdate: (...args: unknown[]): unknown => mockFetchSourceUpdate(...args),
}));

const mabo: Citation = {
  id: "c1",
  aglcVersion: "4",
  sourceType: "case.reported",
  data: {
    party1: "Mabo",
    party2: "Queensland (No 2)",
    year: "1991",
    volume: "175",
    reportSeries: "CLR",
    interchange: {
      v: 1,
      provenance: { format: "ris", rawType: "CASE", sourceLabel: "Zotero", rawId: "42" },
    },
  },
  tags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  modifiedAt: "2026-01-01T00:00:00.000Z",
};

const updated: SourceUpdateResult = {
  status: "updated",
  adapterId: "mock",
  adapterLabel: "Mock Adapter",
  attribution: "Mock Adapter (test data)",
  rawId: "mock-case-1",
  metadata: { year: 1992, startingPage: 1, sourceUrl: "https://mock.obiter.test/mock-case-1" },
  fields: { year: "1992", startingPage: "1" },
  confidence: 0.9,
  differences: ["year", "startingPage"],
};

interface Handlers {
  onApply: jest.Mock;
  onClose: jest.Mock;
}

function renderDialog(citation: Citation = mabo): Handlers & { container: HTMLElement } {
  const onApply = jest.fn(async () => undefined);
  const onClose = jest.fn();
  const { container } = render(
    <UpdateFromSourceDialog
      citation={citation}
      citationText="Mabo v Queensland (No 2) (1991) 175 CLR"
      onApply={onApply}
      onClose={onClose}
    />
  );
  return { onApply, onClose, container };
}

describe("UpdateFromSourceDialog", () => {
  beforeEach(() => {
    mockFetchSourceUpdate.mockReset();
  });

  test("shows the source being checked while the fetch is pending", async () => {
    mockFetchSourceUpdate.mockImplementation(
      (_c: Citation, _t: string, opts: { onAttempt: (a: { id: string; label: string }) => void }) => {
        opts.onAttempt({ id: "mock", label: "Mock Adapter" });
        return new Promise(() => undefined);
      }
    );
    renderDialog();
    expect(screen.getByRole("dialog", { name: "Update from source" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Checking Mock Adapter"));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  test("blank fields pre-select the source; a differing year is shown but keeps the current value", async () => {
    mockFetchSourceUpdate.mockResolvedValue(updated);
    const { onApply, onClose, container } = renderDialog();
    await screen.findByRole("table", { name: "Fields to merge" });
    expect(mockFetchSourceUpdate).toHaveBeenCalledWith(
      mabo,
      "Mabo v Queensland (No 2) (1991) 175 CLR",
      expect.objectContaining({ onAttempt: expect.any(Function) })
    );
    expect(screen.getByText("Mock Adapter (test data)")).toBeInTheDocument();
    expect(screen.getByText("Match confidence: 90%")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "From Mock Adapter" })).toBeInTheDocument();

    expect(screen.getByLabelText("Starting Page: 1 (From Mock Adapter)")).toBeChecked();
    expect(screen.getByLabelText("Starting Page: empty (Current)")).not.toBeChecked();
    expect(screen.getByLabelText("Year: 1991 (Current)")).toBeChecked();
    expect(screen.getByLabelText("Year: 1992 (From Mock Adapter)")).not.toBeChecked();
    // Fields the source did not supply are not offered as differences.
    expect(screen.queryByLabelText(/^Party 1:/)).toBeNull();

    expect(await axe(container)).toHaveNoViolations();

    fireEvent.click(screen.getByRole("button", { name: "Apply selected" }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    const [data, applied, result] = onApply.mock.calls[0] as unknown as [
      SourceData,
      number,
      SourceUpdateResult,
    ];
    expect(applied).toBe(1);
    expect(result).toBe(updated);
    expect(data).toMatchObject({ party1: "Mabo", year: "1991", startingPage: "1" });
    expect(data.interchange).toEqual({
      v: 1,
      provenance: {
        format: "adapter",
        rawType: "CASE",
        adapterId: "mock",
        sourceLabel: "Mock Adapter",
        rawId: "mock-case-1",
        sourceUrl: "https://mock.obiter.test/mock-case-1",
        retrievedAt: expect.any(String),
      },
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  test("choosing the source year applies both fields; deselecting everything disables Apply", async () => {
    mockFetchSourceUpdate.mockResolvedValue(updated);
    const { onApply } = renderDialog();
    await screen.findByRole("table", { name: "Fields to merge" });
    fireEvent.click(screen.getByLabelText("Year: 1992 (From Mock Adapter)"));
    fireEvent.click(screen.getByRole("button", { name: "Apply selected" }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(onApply.mock.calls[0][0]).toMatchObject({ year: "1992", startingPage: "1" });
    expect(onApply.mock.calls[0][1]).toBe(2);
  });

  test("nothing selected disables Apply", async () => {
    mockFetchSourceUpdate.mockResolvedValue(updated);
    renderDialog();
    await screen.findByRole("table", { name: "Fields to merge" });
    fireEvent.click(screen.getByLabelText("Starting Page: empty (Current)"));
    expect(screen.getByRole("button", { name: "Apply selected" })).toBeDisabled();
  });

  test("a failed apply is reported and the dialog stays open", async () => {
    mockFetchSourceUpdate.mockResolvedValue(updated);
    const onApply = jest.fn(async () => {
      throw new Error("Store is locked.");
    });
    const onClose = jest.fn();
    render(
      <UpdateFromSourceDialog citation={mabo} citationText="x" onApply={onApply} onClose={onClose} />
    );
    await screen.findByRole("table", { name: "Fields to merge" });
    fireEvent.click(screen.getByRole("button", { name: "Apply selected" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Store is locked.");
    expect(onClose).not.toHaveBeenCalled();
  });

  test("same: already up to date with the adapter", async () => {
    mockFetchSourceUpdate.mockResolvedValue({
      status: "same",
      adapterId: "mock",
      adapterLabel: "Mock Adapter",
      fields: { year: "1991" },
      differences: [],
    });
    const { onClose } = renderDialog();
    expect(await screen.findByText("Already up to date with Mock Adapter.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("unavailable: the message and Close", async () => {
    mockFetchSourceUpdate.mockResolvedValue({
      status: "unavailable",
      message: "Source lookup is off. Turn it on in Settings.",
    });
    const { onClose, container } = renderDialog();
    expect(
      await screen.findByText("Source lookup is off. Turn it on in Settings.")
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("a fetch that throws is shown as unavailable", async () => {
    mockFetchSourceUpdate.mockRejectedValue(new Error("Network down."));
    renderDialog();
    expect(await screen.findByText("Network down.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
