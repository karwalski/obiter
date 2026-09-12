/**
 * @jest-environment jsdom
 *
 * INTEROP-012: the Import dialog. Sources step with detection copy, files
 * and the paste area; preview step with type override, bulk controls,
 * paging, commit and error copy; keyboard behaviour; axe.
 */

import * as React from "react";
import { render, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { axe } from "jest-axe";
import ImportDialog from "../../src/ui/components/ImportDialog";
import type { CitationStore } from "../../src/store/citationStore";
import type { Citation } from "../../src/types/citation";

const RIS = `TY  - JOUR
AU  - Luntz, Harold
TI  - A Personal Journey through the Law of Torts
JO  - Sydney Law Review
VL  - 27
SP  - 393
PY  - 2005
ER  -
TY  - BOOK
TI  - Untitled Fragment
ER  -
`;

function fakeStore(existing: Citation[] = []): CitationStore {
  return {
    getAll: () => existing,
    getStandardId: () => "aglc4",
    addMany: jest.fn(async (cs: Citation[]) => cs.length),
    updateMany: jest.fn(async () => 0),
  } as unknown as CitationStore;
}

const renderCitation = (c: Citation): string =>
  `Rendered ${String(c.data.title ?? c.data.party1 ?? "")}`;

async function typeAndPreview(container: HTMLElement, text: string): Promise<void> {
  fireEvent.change(screen.getByLabelText("Pasted records"), { target: { value: text } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Preview" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await waitFor(() =>
    expect(within(container).getByLabelText("Records to import")).toBeInTheDocument()
  );
}

describe("ImportDialog: sources step", () => {
  test("detects pasted RIS and reports the count", async () => {
    render(
      <ImportDialog
        store={fakeStore()}
        renderCitation={renderCitation}
        onClose={jest.fn()}
        onImported={jest.fn()}
      />
    );
    expect(screen.getByRole("dialog", { name: "Import citations" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Pasted records"), { target: { value: RIS } });
    await waitFor(() => expect(screen.getByText("Detected: RIS · 2 records")).toBeInTheDocument());
    expect(screen.getByText("1 source · 2 records ready to preview")).toBeInTheDocument();
  });

  test("unrecognised text shows the exact guidance", async () => {
    render(
      <ImportDialog
        store={fakeStore()}
        renderCitation={renderCitation}
        onClose={jest.fn()}
        onImported={jest.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText("Pasted records"), {
      target: { value: "just some prose" },
    });
    await waitFor(() =>
      expect(
        screen.getByText(
          "Format not recognised. Paste RIS, EndNote XML, BibTeX or CSL-JSON records, or choose the exported file instead."
        )
      ).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
  });

  test("reads an uploaded file, lists it, and can remove it", async () => {
    const { container } = render(
      <ImportDialog
        store={fakeStore()}
        renderCitation={renderCitation}
        onClose={jest.fn()}
        onImported={jest.fn()}
      />
    );
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    const file = new File([RIS], "zotero.ris", { type: "text/plain" });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("RIS · 2 records")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Remove zotero.ris" }));
    expect(screen.queryByText("RIS · 2 records")).toBeNull();
  });

  test("Escape closes when idle and focus lands inside", () => {
    const onClose = jest.fn();
    render(
      <ImportDialog
        store={fakeStore()}
        renderCitation={renderCitation}
        onClose={onClose}
        onImported={jest.fn()}
      />
    );
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("ImportDialog: preview step", () => {
  test("shows rows with type, preview and status, and commits the included rows", async () => {
    const store = fakeStore();
    const onImported = jest.fn();
    const { container } = render(
      <ImportDialog
        store={store}
        renderCitation={renderCitation}
        onClose={jest.fn()}
        onImported={onImported}
      />
    );
    await typeAndPreview(container, RIS);
    expect(
      screen.getByText(/2 records: 1 ready · 1 need more details · 0 already in library/)
    ).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText(/required fields missing: /)).toBeInTheDocument();
    expect(
      screen.getByText("Rendered A Personal Journey through the Law of Torts")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add 2 citations" }));
    await waitFor(() => expect(onImported).toHaveBeenCalled());
    expect(store.addMany).toHaveBeenCalledTimes(1);
    expect(onImported.mock.calls[0][0]).toMatchObject({
      added: 2,
      incomplete: 1,
      formats: ["RIS"],
    });
  });

  test("type override, bulk controls and Nothing selected", async () => {
    const { container } = render(
      <ImportDialog
        store={fakeStore()}
        renderCitation={renderCitation}
        onClose={jest.fn()}
        onImported={jest.fn()}
      />
    );
    await typeAndPreview(container, RIS);
    const select = screen.getByLabelText("Source type for record 1") as HTMLSelectElement;
    expect(select.value).toBe("journal.article");
    fireEvent.change(select, { target: { value: "journal.online" } });
    expect((screen.getByLabelText("Source type for record 1") as HTMLSelectElement).value).toBe(
      "journal.online"
    );
    fireEvent.click(screen.getByRole("button", { name: "Exclude incomplete" }));
    expect(screen.getByRole("button", { name: "Add 1 citation" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Include none" }));
    expect(screen.getByRole("button", { name: "Nothing selected" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect((screen.getByLabelText("Pasted records") as HTMLTextAreaElement).value).toBe(RIS);
  });

  test("marks library duplicates and offers Update existing for round trips", async () => {
    const existing: Citation = {
      id: "abc",
      aglcVersion: "4",
      sourceType: "journal.article",
      data: {
        authors: [{ givenNames: "Harold", surname: "Luntz" }],
        title: "A Personal Journey through the Law of Torts",
        year: 2005,
        journal: "SLR",
        startingPage: 393,
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    const { container } = render(
      <ImportDialog
        store={fakeStore([existing])}
        renderCitation={renderCitation}
        onClose={jest.fn()}
        onImported={jest.fn()}
      />
    );
    await typeAndPreview(
      container,
      `${RIS}TY  - JOUR\nTI  - Round trip\nAN  - obiter:abc\nER  -\n`
    );
    expect(screen.getByText("Already in library")).toBeInTheDocument();
    expect(screen.getByText("Already in library (exported from here)")).toBeInTheDocument();
    expect(screen.getByLabelText("Update the existing citation for record 3")).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Include record 3/));
    expect(screen.getByLabelText("Update the existing citation for record 3")).toBeEnabled();
  });

  test("pages long imports at 50 rows", async () => {
    const many = Array.from(
      { length: 120 },
      (_, i) => `TY  - JOUR\nAU  - A, B\nTI  - Title ${i}\nJO  - J\nSP  - 1\nPY  - 2000\nER  -\n`
    ).join("");
    const { container } = render(
      <ImportDialog
        store={fakeStore()}
        renderCitation={renderCitation}
        onClose={jest.fn()}
        onImported={jest.fn()}
      />
    );
    await typeAndPreview(container, many);
    expect(screen.getByText("Showing 1–50 of 120")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next 50 records" }));
    expect(screen.getByText("Showing 51–100 of 120")).toBeInTheDocument();
  });

  test("a failed commit keeps the dialog open with the error copy", async () => {
    const store = fakeStore();
    (store.addMany as jest.Mock).mockRejectedValueOnce(new Error("document is read-only"));
    const onImported = jest.fn();
    const { container } = render(
      <ImportDialog
        store={store}
        renderCitation={renderCitation}
        onClose={jest.fn()}
        onImported={onImported}
      />
    );
    await typeAndPreview(container, RIS);
    fireEvent.click(screen.getByRole("button", { name: "Add 2 citations" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not add the citations: document is read-only. Nothing was added."
      )
    );
    expect(onImported).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("has no axe violations on either step", async () => {
    const { container } = render(
      <ImportDialog
        store={fakeStore()}
        renderCitation={renderCitation}
        onClose={jest.fn()}
        onImported={jest.fn()}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
    await typeAndPreview(container, RIS);
    expect(await axe(container)).toHaveNoViolations();
  });
});
