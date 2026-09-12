/**
 * @jest-environment jsdom
 *
 * INTEROP-013: the Export dialog. Scope, format, destination, device
 * preference, download, clipboard fallback, show as text, empty scope, axe.
 */

import * as React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import ExportDialog, { EXPORT_FORMAT_PREF } from "../../src/ui/components/ExportDialog";
import type { Citation } from "../../src/types/citation";

const mockDownload = jest.fn();
const mockCopy = jest.fn(async () => true);
jest.mock("../../src/ui/fileTransfer", () => ({
  downloadTextFile: (...args: unknown[]): unknown => mockDownload(...args),
  copyTextToClipboard: (...args: unknown[]): Promise<boolean> => mockCopy(...args),
  todayStamp: (): string => "2026-09-12",
}));

const prefs = new Map<string, unknown>();
jest.mock("../../src/store/devicePreferences", () => ({
  getDevicePref: (key: string): unknown => prefs.get(key),
  setDevicePref: (key: string, value: unknown): void => {
    prefs.set(key, value);
  },
}));

const citation = (id: string, title: string): Citation => ({
  id,
  aglcVersion: "4",
  sourceType: "book",
  data: { authors: [{ givenNames: "A", surname: "Author" }], title, publisher: "P", year: 2020 },
  tags: [],
  createdAt: "",
  modifiedAt: "",
});
const all = [citation("a", "First"), citation("b", "Second"), citation("c", "Third")];
const formatCitation = (c: Citation): { footnote: string } => ({ footnote: `Formatted ${c.id}` });

function renderDialog(overrides: Partial<React.ComponentProps<typeof ExportDialog>> = {}): {
  onExported: jest.Mock;
  container: HTMLElement;
} {
  const onExported = jest.fn();
  const { container } = render(
    <ExportDialog
      all={all}
      selected={[]}
      shown={all}
      hasActiveFilter={false}
      formatCitation={formatCitation}
      standardLabel="AGLC4"
      onClose={jest.fn()}
      onExported={onExported}
      {...overrides}
    />
  );
  return { onExported, container };
}

beforeEach(() => {
  prefs.clear();
  mockDownload.mockClear();
  mockCopy.mockClear();
  mockCopy.mockResolvedValue(true);
});

describe("ExportDialog", () => {
  test("scope radios follow selection and filter state", () => {
    renderDialog();
    expect(screen.getByLabelText("All 3 citations in the library")).toBeChecked();
    expect(screen.queryByLabelText(/selected$/)).toBeNull();
    expect(screen.queryByLabelText(/shown by the current search/)).toBeNull();
  });

  test("a selection is preselected and a filter adds the shown option", () => {
    renderDialog({ selected: [all[0]], shown: [all[0], all[1]], hasActiveFilter: true });
    expect(screen.getByLabelText("1 selected")).toBeChecked();
    expect(screen.getByLabelText("2 shown by the current search and filter")).toBeInTheDocument();
  });

  test("downloads the chosen format, remembers it, and reports the file name", async () => {
    const { onExported } = renderDialog();
    fireEvent.click(screen.getByLabelText(/BibTeX/));
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() =>
      expect(onExported).toHaveBeenCalledWith(
        "Downloaded 3 citations as BibTeX (obiter-library-2026-09-12.bib)."
      )
    );
    expect(mockDownload).toHaveBeenCalledWith(
      "obiter-library-2026-09-12.bib",
      expect.stringContaining("Formatted a"),
      "application/x-bibtex"
    );
    expect(prefs.get(EXPORT_FORMAT_PREF)).toBe("bibtex");
  });

  test("the last format is the default next time", () => {
    prefs.set(EXPORT_FORMAT_PREF, "csl-json");
    renderDialog();
    expect(screen.getByLabelText(/CSL-JSON/)).toBeChecked();
  });

  test("copies to the clipboard, and explains when that fails", async () => {
    const { onExported } = renderDialog({ selected: [all[1]] });
    fireEvent.click(screen.getByLabelText("Copy to clipboard"));
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() =>
      expect(onExported).toHaveBeenCalledWith("Copied 1 citation as RIS to the clipboard.")
    );
    mockCopy.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not copy to the clipboard in this window. Choose Download file or Show as text instead."
      )
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("shows the text with a Select all button, including the formatted list", async () => {
    renderDialog();
    fireEvent.click(screen.getByLabelText(/Formatted text/));
    fireEvent.click(screen.getByLabelText("Show as text"));
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    await waitFor(() => expect(screen.getByLabelText("Exported text")).toBeInTheDocument());
    expect((screen.getByLabelText("Exported text") as HTMLTextAreaElement).value).toBe(
      "1. Formatted a\n2. Formatted b\n3. Formatted c\n"
    );
    expect(screen.getByRole("button", { name: "Select all" })).toBeInTheDocument();
  });

  test("an empty shown scope disables the primary button", () => {
    renderDialog({ shown: [], hasActiveFilter: true });
    fireEvent.click(screen.getByLabelText("0 shown by the current search and filter"));
    expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
  });

  test("has no axe violations", async () => {
    const { container } = renderDialog();
    expect(await axe(container)).toHaveNoViolations();
  });
});
