/**
 * @jest-environment jsdom
 *
 * ENP-005: the Record details panel. Provenance and identifiers for an
 * imported record, source and "Cases citing this" links for a case (ENP-009,
 * link-only), and previous versions loaded lazily on first open with a
 * confirmed restore. ENP-008: the nested "Cited by" section appears for
 * journal types only; its lookup is mocked here and covered in its own suite.
 */
import * as React from "react";
import { render, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { axe } from "jest-axe";
import RecordDetails from "../../src/ui/components/RecordDetails";
import { lawCiteUrl } from "../../src/api/sourceLinks";
import type { CitationVersion } from "../../src/store/citationHistory";
import type { Citation, SourceType } from "../../src/types/citation";

const mockCitedByForCitation = jest.fn(async () => ({ count: 0, works: [] }));
const mockAddCitingWorkToLibrary = jest.fn(async () => undefined);

jest.mock("../../src/api/citedBy", () => ({
  CITED_BY_NO_DOI: "Citing works need a DOI.",
  citedByForCitation: (...args: unknown[]): Promise<unknown> => mockCitedByForCitation(...(args as [])),
  addCitingWorkToLibrary: (...args: unknown[]): Promise<unknown> => mockAddCitingWorkToLibrary(...(args as [])),
  doiForCitation: (citation: { data?: Record<string, unknown> }): string =>
    typeof citation.data?.doi === "string" ? citation.data.doi : "",
  isCitedByUnavailable: (outcome: { unavailable?: unknown }): boolean => typeof outcome.unavailable === "string",
}));

function cite(sourceType: SourceType, data: Record<string, unknown>, overrides: Partial<Citation> = {}): Citation {
  return {
    id: "c1",
    aglcVersion: "4",
    sourceType,
    data,
    tags: [],
    createdAt: "2026-01-15T10:30:00.000Z",
    modifiedAt: "2026-03-20T14:45:00.000Z",
    ...overrides,
  };
}

const RIS_BOOK = cite("book", {
  authors: [{ givenNames: "James", surname: "Edelman" }],
  title: "Unjust Enrichment",
  publisher: "Hart Publishing",
  year: "2016",
  interchange: {
    v: 1,
    provenance: {
      format: "ris",
      sourceLabel: "Zotero",
      rawType: "BOOK",
      rawId: "42",
      importedAt: "2026-09-01T10:00:00.000Z",
    },
    identifiers: { doi: "10.1000/abc123", isbn: "9781849466417", citeKey: "edelman2016" },
    abstract: "An account of the law of unjust enrichment.",
    notes: ["Read chapter 3 first."],
    passthrough: { M1: "shelf 4", L2: "https://example.com/pdf" },
  },
});

const HCA_CASE = cite("case.unreported.mnc", {
  party1: "Smith",
  party2: "Jones",
  court: "HCA",
  year: "2020",
  caseNumber: "41",
});

const CASE_TEXT = "Smith v Jones [2020] HCA 41";

function version(timestamp: string, changedFields: string[]): CitationVersion {
  return {
    timestamp,
    reason: "persist",
    changedFields,
    citation: cite("book", { title: "Older title", year: "2015" }),
  };
}

interface Rendered {
  container: HTMLElement;
  loadVersions: jest.Mock<Promise<CitationVersion[]>, []>;
  onRestore: jest.Mock<Promise<void>, [CitationVersion]>;
}

function renderPanel(
  citation: Citation,
  opts: { versions?: CitationVersion[]; pending?: boolean; citationText?: string; initiallyOpen?: boolean } = {}
): Rendered {
  const loadVersions = jest.fn(
    (): Promise<CitationVersion[]> =>
      opts.pending ? new Promise<CitationVersion[]>(() => undefined) : Promise.resolve(opts.versions ?? [])
  );
  const onRestore = jest.fn(async (_version: CitationVersion): Promise<void> => undefined);
  const { container } = render(
    <RecordDetails
      citation={citation}
      citationText={opts.citationText ?? "Unjust Enrichment"}
      onRestore={onRestore}
      loadVersions={loadVersions}
      initiallyOpen={opts.initiallyOpen}
    />
  );
  return { container, loadVersions, onRestore };
}

/**
 * jsdom flips `open` on a summary click but does not dispatch the toggle
 * event synchronously, so the toggle is fired explicitly as Word's webview
 * would.
 */
function openPanel(): HTMLDetailsElement {
  const details = document.querySelector("details.record-details") as HTMLDetailsElement;
  fireEvent.click(screen.getByText("Record details"));
  details.open = true;
  fireEvent(details, new Event("toggle"));
  return details;
}

let openSpy: jest.SpyInstance;
let confirmSpy: jest.SpyInstance;

beforeEach(() => {
  openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
  confirmSpy = jest.spyOn(window, "confirm").mockImplementation(() => true);
  mockCitedByForCitation.mockClear();
  mockAddCitingWorkToLibrary.mockClear();
});

afterEach(() => {
  openSpy.mockRestore();
  confirmSpy.mockRestore();
});

describe("ENP-005: record details for an imported record", () => {
  it("shows the import format, source label, identifiers, abstract, notes and passthrough keys", () => {
    renderPanel(RIS_BOOK);
    openPanel();

    expect(screen.getByText(/^Imported from RIS \(Zotero\) on .+/)).toBeInTheDocument();
    const identifiers = within(screen.getByRole("list", { name: "Identifiers" }));
    expect(identifiers.getByText("DOI")).toBeInTheDocument();
    expect(identifiers.getByText("10.1000/abc123")).toBeInTheDocument();
    expect(identifiers.getByText("ISBN")).toBeInTheDocument();
    expect(identifiers.getByText("9781849466417")).toBeInTheDocument();
    expect(identifiers.getByText("Cite key")).toBeInTheDocument();
    expect(identifiers.queryByText("ISSN")).toBeNull();

    expect(screen.getByText("Abstract")).toBeInTheDocument();
    expect(screen.getByText("An account of the law of unjust enrichment.")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Read chapter 3 first.")).toBeInTheDocument();
    expect(screen.getByText("2 passthrough fields kept for export")).toBeInTheDocument();
    expect(screen.getByText("L2")).toBeInTheDocument();
    expect(screen.getByText("M1")).toBeInTheDocument();

    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Modified")).toBeInTheDocument();
    expect(screen.getByText(new Date(RIS_BOOK.createdAt).toLocaleString())).toBeInTheDocument();
  });

  it("opens the DOI link in a new window and offers no case rows", () => {
    renderPanel(RIS_BOOK);
    openPanel();

    fireEvent.click(screen.getByRole("button", { name: "View on doi.org" }));
    expect(openSpy).toHaveBeenCalledWith("https://doi.org/10.1000/abc123", "_blank", "noopener");
    expect(screen.queryByText("Cases citing this")).toBeNull();
    expect(screen.queryByRole("button", { name: "LawCite" })).toBeNull();
  });

  it("omits Created and Modified when the record carries no dates", () => {
    renderPanel({ ...RIS_BOOK, createdAt: "", modifiedAt: "" });
    openPanel();
    expect(screen.queryByText("Created")).toBeNull();
    expect(screen.queryByText("Modified")).toBeNull();
  });
});

describe("ENP-005: record details for a hand-entered case", () => {
  it("reports no import record and offers AustLII and Jade source links", () => {
    renderPanel(HCA_CASE, { citationText: CASE_TEXT });
    openPanel();

    expect(screen.getByText("Created in Obiter; no import record")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Identifiers" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "View on austlii.edu.au" }));
    expect(openSpy).toHaveBeenLastCalledWith(
      "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/HCA/2020/41.html",
      "_blank",
      "noopener"
    );
    fireEvent.click(screen.getByRole("button", { name: "View on jade.io" }));
    expect(openSpy).toHaveBeenLastCalledWith("https://jade.io/article/HCA/2020/41", "_blank", "noopener");
  });

  it("ENP-009: 'Cases citing this' opens LawCite for the citation text and Jade when a Jade link exists", () => {
    renderPanel(HCA_CASE, { citationText: CASE_TEXT });
    openPanel();

    expect(screen.getByText("Cases citing this")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "LawCite" }));
    expect(openSpy).toHaveBeenLastCalledWith(lawCiteUrl(CASE_TEXT), "_blank", "noopener");
    expect(lawCiteUrl(CASE_TEXT)).toContain(encodeURIComponent(CASE_TEXT));
    fireEvent.click(screen.getByRole("button", { name: "Jade" }));
    expect(openSpy).toHaveBeenLastCalledWith("https://jade.io/article/HCA/2020/41", "_blank", "noopener");
  });

  it("offers LawCite but not Jade for a case without an MNC", () => {
    renderPanel(cite("case.reported", { party1: "Mabo", party2: "Queensland", year: "1992" }), {
      citationText: "Mabo v Queensland (No 2) (1992) 175 CLR 1",
    });
    openPanel();
    expect(screen.getByRole("button", { name: "LawCite" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Jade" })).toBeNull();
    expect(screen.queryByText("Links")).toBeNull();
  });
});

describe("ENP-005: previous versions", () => {
  it("loads versions only after the panel is opened and lists the changed fields", async () => {
    const { loadVersions } = renderPanel(RIS_BOOK, {
      versions: [version("2026-09-02T10:00:00.000Z", ["Title", "Year"])],
    });
    expect(loadVersions).not.toHaveBeenCalled();

    openPanel();
    await waitFor(() => expect(loadVersions).toHaveBeenCalledTimes(1));
    const list = await screen.findByRole("list", { name: "Previous versions" });
    const row = within(list).getAllByRole("listitem")[0];
    expect(row).toHaveTextContent(new Date("2026-09-02T10:00:00.000Z").toLocaleString());
    expect(row).toHaveTextContent("automatic backup");
    expect(row).toHaveTextContent("changed: Title, Year");

    // Closing and reopening does not read the backup again.
    const details = document.querySelector("details.record-details") as HTMLDetailsElement;
    details.open = false;
    fireEvent(details, new Event("toggle"));
    openPanel();
    expect(loadVersions).toHaveBeenCalledTimes(1);
  });

  it("loads straight away when asked to open initially", async () => {
    const { loadVersions } = renderPanel(RIS_BOOK, { initiallyOpen: true, versions: [] });
    await waitFor(() => expect(loadVersions).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("No previous versions in this document's backup.")).toBeInTheDocument();
  });

  it("shows the loading text while the backup is read", () => {
    renderPanel(RIS_BOOK, { pending: true });
    openPanel();
    expect(screen.getByText("Looking for previous versions…")).toBeInTheDocument();
  });

  it("asks for confirmation before restoring, and restores when confirmed", async () => {
    const v = version("2026-09-02T10:00:00.000Z", ["Title"]);
    const { onRestore } = renderPanel(RIS_BOOK, { versions: [v] });
    openPanel();
    const button = await screen.findByRole("button", { name: "Restore this version" });

    confirmSpy.mockImplementationOnce(() => false);
    fireEvent.click(button);
    expect(confirmSpy).toHaveBeenCalledWith(
      `Restore the version from ${new Date(v.timestamp).toLocaleString()}? The current values will be replaced.`
    );
    expect(onRestore).not.toHaveBeenCalled();

    fireEvent.click(button);
    await waitFor(() => expect(onRestore).toHaveBeenCalledTimes(1));
    expect(onRestore).toHaveBeenCalledWith(v);
  });

  it("reports a failed backup read without throwing", async () => {
    const loadVersions = jest.fn((): Promise<CitationVersion[]> => Promise.reject(new Error("Backup unreadable")));
    render(
      <RecordDetails
        citation={RIS_BOOK}
        citationText="Unjust Enrichment"
        onRestore={jest.fn(async () => undefined)}
        loadVersions={loadVersions}
      />
    );
    openPanel();
    expect(await screen.findByText("Backup unreadable")).toBeInTheDocument();
  });
});

describe("ENP-008: cited by section", () => {
  const ARTICLE = cite("journal.article", {
    authors: [{ givenNames: "Joseph", surname: "Raz" }],
    title: "The Rule of Law and Its Virtue",
    journal: "Law Quarterly Review",
    year: "1977",
    doi: "10.1093/lqr/93.2.195",
  });

  it("appears for a journal article, lazily, and adds through the default handler", async () => {
    mockCitedByForCitation.mockResolvedValueOnce({
      count: 1,
      works: [{ title: "Citing work", snippet: "", sourceId: "10.5555/x", confidence: 1 }],
    });
    renderPanel(ARTICLE, { citationText: "Joseph Raz, 'The Rule of Law and Its Virtue' (1977) 93 LQR 195" });
    openPanel();
    expect(screen.getByText("Cited by")).toBeInTheDocument();
    expect(mockCitedByForCitation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    expect(await screen.findByText("Cited by 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Citing work to library" }));
    await waitFor(() => expect(mockAddCitingWorkToLibrary).toHaveBeenCalledTimes(1));
    expect(mockAddCitingWorkToLibrary.mock.calls[0]).toEqual([
      ARTICLE,
      expect.objectContaining({ sourceId: "10.5555/x" }),
    ]);
  });

  it("uses a supplied onAddCitingWork instead of the store", async () => {
    mockCitedByForCitation.mockResolvedValueOnce({
      count: 1,
      works: [{ title: "Citing work", snippet: "", sourceId: "10.5555/x", confidence: 1 }],
    });
    const onAddCitingWork = jest.fn(async () => undefined);
    render(
      <RecordDetails
        citation={ARTICLE}
        citationText="Raz"
        onRestore={jest.fn(async () => undefined)}
        loadVersions={jest.fn(async () => [])}
        onAddCitingWork={onAddCitingWork}
      />
    );
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    await screen.findByText("Cited by 1");
    fireEvent.click(screen.getByRole("button", { name: "Add Citing work to library" }));
    await waitFor(() => expect(onAddCitingWork).toHaveBeenCalledTimes(1));
    expect(mockAddCitingWorkToLibrary).not.toHaveBeenCalled();
  });

  it("does not appear for a book or a case", () => {
    renderPanel(RIS_BOOK);
    openPanel();
    expect(screen.queryByText("Cited by")).toBeNull();
    document.body.innerHTML = "";
    renderPanel(HCA_CASE, { citationText: CASE_TEXT });
    openPanel();
    expect(screen.queryByText("Cited by")).toBeNull();
  });

  it("has no axe violations with the cited-by rows shown", async () => {
    mockCitedByForCitation.mockResolvedValueOnce({
      count: 1,
      works: [{ title: "Citing work", snippet: "A snippet", sourceId: "10.5555/x", confidence: 1 }],
    });
    const { container } = renderPanel(ARTICLE, { versions: [] });
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    await screen.findByText("Cited by 1");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("ENP-005: accessibility", () => {
  it("has no axe violations closed", async () => {
    const { container } = renderPanel(RIS_BOOK);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations open, with links, case rows and versions", async () => {
    const { container } = renderPanel(HCA_CASE, {
      citationText: CASE_TEXT,
      versions: [version("2026-09-02T10:00:00.000Z", ["Year"])],
    });
    openPanel();
    await screen.findByRole("list", { name: "Previous versions" });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations open for an imported record with nested details", async () => {
    const { container } = renderPanel(RIS_BOOK, { versions: [] });
    openPanel();
    await screen.findByText("No previous versions in this document's backup.");
    expect(await axe(container)).toHaveNoViolations();
  });
});
