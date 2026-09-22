/**
 * @jest-environment jsdom
 *
 * ENP-003: the Find duplicates dialog — cluster heading and count, the
 * default survivor, the field table, Merge and Not a duplicate callbacks,
 * advancing between clusters, the empty state, Escape and focus return, and
 * axe with the dialog open.
 */

import * as React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import DuplicatesDialog, {
  NO_DUPLICATES_MESSAGE,
  buildMergedTags,
  clusterKindLabel,
} from "../../src/ui/components/DuplicatesDialog";
import type { DuplicatesDialogCluster } from "../../src/ui/components/DuplicatesDialog";
import { findDuplicateClusters } from "../../src/api/interchange/dedupe";
import type { Citation, SourceData } from "../../src/types/citation";

const maboReported: Citation = {
  id: "rep",
  aglcVersion: "4",
  sourceType: "case.reported",
  data: {
    party1: "Mabo",
    party2: "Queensland (No 2)",
    year: "1992",
    volume: "175",
    reportSeries: "CLR",
    startingPage: "1",
  },
  tags: ["native title"],
  createdAt: "2026-01-01T00:00:00.000Z",
  modifiedAt: "2026-01-01T00:00:00.000Z",
};
const maboMnc: Citation = {
  id: "mnc",
  aglcVersion: "4",
  sourceType: "case.unreported.mnc",
  data: {
    party1: "Mabo",
    party2: "Queensland (No 2)",
    year: "1992",
    court: "HCA",
    caseNumber: "23",
  },
  tags: ["import", "import:ris", "land"],
  createdAt: "2026-02-01T00:00:00.000Z",
  modifiedAt: "2026-02-01T00:00:00.000Z",
};
const book: Citation = {
  id: "book",
  aglcVersion: "4",
  sourceType: "book",
  data: {
    authors: [{ givenNames: "James", surname: "Edelman" }],
    title: "Unjust Enrichment",
    publisher: "Hart Publishing",
    year: 2016,
  },
  tags: [],
  createdAt: "2026-03-01T00:00:00.000Z",
  modifiedAt: "2026-03-01T00:00:00.000Z",
};

const formatCitation = (c: Citation): string =>
  c.sourceType === "case.unreported.mnc"
    ? "Mabo v Queensland (No 2) [1992] HCA 23."
    : c.sourceType === "case.reported"
      ? "Mabo v Queensland (No 2) (1992) 175 CLR 1."
      : "James Edelman, Unjust Enrichment (Hart Publishing, 2016).";

interface Handlers {
  onMerge: jest.Mock;
  onIgnore: jest.Mock;
  onClose: jest.Mock;
}

function renderDialog(
  clusters: DuplicatesDialogCluster[],
  occurrenceCounts: Record<string, number> = { rep: 1 },
  overrides: Partial<Handlers> = {}
): Handlers & { container: HTMLElement } {
  const handlers: Handlers = {
    onMerge: jest.fn(async () => 1),
    onIgnore: jest.fn(async () => undefined),
    onClose: jest.fn(),
    ...overrides,
  };
  const { container } = render(
    <DuplicatesDialog
      clusters={clusters}
      formatCitation={formatCitation}
      occurrenceCounts={occurrenceCounts}
      onMerge={handlers.onMerge}
      onIgnore={handlers.onIgnore}
      onClose={handlers.onClose}
    />
  );
  return { ...handlers, container };
}

const maboClusters = (): DuplicatesDialogCluster[] =>
  findDuplicateClusters([maboReported, maboMnc, book]);

describe("DuplicatesDialog (ENP-003)", () => {
  test("two Mabo records and an unrelated book form one cluster on title and year", () => {
    const clusters = maboClusters();
    expect(clusters).toHaveLength(1);
    expect(clusters[0].members.map((m) => m.id)).toEqual(["rep", "mnc"]);
    renderDialog(clusters);
    expect(screen.getByRole("dialog", { name: "Find duplicates" })).toBeInTheDocument();
    expect(screen.getByText("1 of 1")).toBeInTheDocument();
    expect(screen.getByText("Similar title and year")).toBeInTheDocument();
    expect(screen.getByText("Mabo v Queensland (No 2) (1992) 175 CLR 1.")).toBeInTheDocument();
    expect(screen.getByText("Mabo v Queensland (No 2) [1992] HCA 23.")).toBeInTheDocument();
    expect(screen.getByText(/1 footnote, added/)).toBeInTheDocument();
    expect(screen.getByText(/0 footnotes, added/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous duplicate group" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next duplicate group" })).toBeDisabled();
  });

  test("kind labels read from the cluster kind and key", () => {
    const base = { members: [] as Citation[] };
    expect(clusterKindLabel({ ...base, kind: "doi", key: "x" })).toBe("Same DOI");
    expect(clusterKindLabel({ ...base, kind: "isbn", key: "x" })).toBe("Same ISBN");
    expect(clusterKindLabel({ ...base, kind: "cite-key", key: "x" })).toBe("Same citation key");
    expect(clusterKindLabel({ ...base, kind: "legal", key: "mnc|1992|hca|23" })).toBe(
      "Same medium neutral citation"
    );
    expect(clusterKindLabel({ ...base, kind: "legal", key: "report|1992|clr|1" })).toBe(
      "Same report citation"
    );
    expect(clusterKindLabel({ ...base, kind: "legal", key: "statute|x|1993|cth" })).toBe(
      "Same statute"
    );
    expect(clusterKindLabel({ ...base, kind: "loose", key: "x", label: "Manual merge" })).toBe(
      "Manual merge"
    );
  });

  test("the survivor defaults to the oldest member with footnotes, else the oldest", () => {
    const { container } = renderDialog(maboClusters(), { mnc: 2 });
    expect(screen.getByRole("radio", { name: /^Keep this one: 2,/ })).toBeChecked();
    container.remove();
    renderDialog(maboClusters(), {});
    expect(screen.getByRole("radio", { name: /^Keep this one: 1,/ })).toBeChecked();
  });

  test("the field table shows the differing fields with the survivor's values chosen", () => {
    renderDialog(maboClusters(), { rep: 1 });
    expect(screen.getByRole("table", { name: "Fields to merge" })).toBeInTheDocument();
    // Agreed fields render once.
    expect(screen.queryByRole("radio", { name: /^Party 1:/ })).toBeNull();
    // The survivor's report citation is chosen; the MNC's fields fill its blanks.
    expect(screen.getByRole("radio", { name: "Report Series: CLR (1 (keep))" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Report Series: empty (2)" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "court: HCA (2)" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "caseNumber: 23 (2)" })).toBeChecked();
  });

  test("Merge passes the survivor, removed ids, merged data with both citations, and merged tags", async () => {
    const { onMerge, onClose } = renderDialog(maboClusters(), { rep: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() => expect(onMerge).toHaveBeenCalledTimes(1));
    const [survivorId, removedIds, data, tags] = onMerge.mock.calls[0] as [
      string,
      string[],
      SourceData,
      string[],
    ];
    expect(survivorId).toBe("rep");
    expect(removedIds).toEqual(["mnc"]);
    expect(data).toMatchObject({
      reportSeries: "CLR",
      volume: "175",
      startingPage: "1",
      court: "HCA",
      caseNumber: "23",
    });
    expect(tags).toEqual(["native title", "land"]);
    // The only cluster is done, so the dialog closes.
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("choosing the other survivor keeps its system tags and the union of user tags", () => {
    expect(buildMergedTags(maboMnc, [maboReported, maboMnc])).toEqual([
      "import",
      "import:ris",
      "land",
      "native title",
    ]);
  });

  test("a changed field choice reaches the merged data", async () => {
    const { onMerge } = renderDialog(maboClusters(), { rep: 1 });
    fireEvent.click(screen.getByRole("radio", { name: "Report Series: empty (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() => expect(onMerge).toHaveBeenCalledTimes(1));
    const data = onMerge.mock.calls[0][2] as SourceData;
    expect(data.reportSeries).toBeUndefined();
    expect(data.court).toBe("HCA");
  });

  test("Not a duplicate calls onIgnore with the cluster key and member ids, then closes", async () => {
    const clusters = maboClusters();
    const { onIgnore, onClose } = renderDialog(clusters);
    fireEvent.click(screen.getByRole("button", { name: "Not a duplicate" }));
    await waitFor(() => expect(onIgnore).toHaveBeenCalledWith(clusters[0].key, ["rep", "mnc"]));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("with two clusters, Merge advances and announces; Previous and Next move between them", async () => {
    const second: DuplicatesDialogCluster = {
      kind: "isbn",
      key: "9781849464826",
      members: [book, { ...book, id: "book2", createdAt: "2026-04-01T00:00:00.000Z" }],
    };
    const { onMerge, onClose } = renderDialog([...maboClusters(), second]);
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next duplicate group" }));
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Same ISBN")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous duplicate group" }));
    expect(screen.getByText("1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() => expect(onMerge).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Merged 2 citations into one.")).toBeInTheDocument();
    expect(screen.getByText("1 of 1")).toBeInTheDocument();
    expect(screen.getByText("Same ISBN")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("a failed merge is reported inline with read-only copy and the dialog stays open", async () => {
    const err = Object.assign(new Error("NotAllowed"), { code: "NotAllowed" });
    const { onClose } = renderDialog(maboClusters(), { rep: 1 }, {
      onMerge: jest.fn(async () => {
        throw err;
      }),
    });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/read-only|cannot be edited|protected/i);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Merge" })).toBeEnabled();
  });

  test("no clusters shows the empty state and a Close button", () => {
    const { onClose } = renderDialog([]);
    expect(screen.getByText(NO_DUPLICATES_MESSAGE)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  test("Escape closes and focus returns to the opener", async () => {
    function Host(): JSX.Element {
      const [open, setOpen] = React.useState(false);
      const ref = React.useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={ref} onClick={() => setOpen(true)}>
            Find duplicates
          </button>
          {open && (
            <DuplicatesDialog
              clusters={maboClusters()}
              formatCitation={formatCitation}
              occurrenceCounts={{}}
              onMerge={jest.fn(async () => 0)}
              onIgnore={jest.fn(async () => undefined)}
              onClose={() => setOpen(false)}
              returnFocusTo={ref.current}
            />
          )}
        </>
      );
    }
    render(<Host />);
    const opener = screen.getByRole("button", { name: "Find duplicates" });
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Find duplicates" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  test("has no axe violations with a cluster open and in the empty state", async () => {
    const { container } = renderDialog(maboClusters(), { rep: 1 });
    expect(await axe(container)).toHaveNoViolations();
    container.remove();
    const empty = renderDialog([]);
    expect(await axe(empty.container)).toHaveNoViolations();
  });
});
