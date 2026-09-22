/**
 * @jest-environment jsdom
 *
 * ENP-008: the "Cited by" section for a journal article. The lookup itself is
 * mocked; the citation builder and the store write are exercised for real
 * through a mocked shared store.
 */
import * as React from "react";
import { render, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { axe } from "jest-axe";
import CitedByPanel from "../../src/ui/components/CitedByPanel";
import {
  CITED_BY_LOOKUP_OFF,
  CITED_BY_NO_DOI,
  addCitingWorkToLibrary,
  type CitedByOutcome,
} from "../../src/api/citedBy";
import type { CitedByResult, LookupResult } from "../../src/api/sourceAdapter";
import type { Citation } from "../../src/types/citation";

const mockCitedByForCitation = jest.fn(
  (_citation: Citation): Promise<CitedByOutcome> => Promise.resolve({ count: 0, works: [] })
);

jest.mock("../../src/api/citedBy", () => {
  const actual = jest.requireActual<typeof import("../../src/api/citedBy")>("../../src/api/citedBy");
  return {
    ...actual,
    citedByForCitation: (citation: Citation): Promise<CitedByOutcome> => mockCitedByForCitation(citation),
  };
});

const mockStoreAdd = jest.fn(async (_citation: Citation): Promise<void> => undefined);

jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve({ add: mockStoreAdd }),
  getSharedStoreIfReady: (): unknown => null,
}));

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

function cite(data: Record<string, unknown>): Citation {
  return {
    id: "parent-1",
    aglcVersion: "4",
    sourceType: "journal.article",
    data,
    tags: [],
    createdAt: "2026-01-15T10:30:00.000Z",
    modifiedAt: "2026-03-20T14:45:00.000Z",
  };
}

const ARTICLE = cite({
  authors: [{ givenNames: "Joseph", surname: "Raz" }],
  title: "The Rule of Law and Its Virtue",
  journal: "Law Quarterly Review",
  volume: 93,
  year: 1977,
  doi: "10.1093/lqr/93.2.195",
});

function work(n: number): LookupResult {
  return {
    title: `Citing work ${n}`,
    snippet: `Author ${n}, Melbourne University Law Review ${40 + n}(1) ${2000 + n}`,
    sourceId: `10.5555/citing.${n}`,
    confidence: 1,
    sourceUrl: `https://doi.org/10.5555/citing.${n}`,
    attribution: "Data from OpenAlex (CC0)",
    metadata: {
      title: `Citing work ${n}`,
      authors: [`Author ${n}`],
      journal: "Melbourne University Law Review",
      volume: 40 + n,
      issue: "1",
      startingPage: 100 + n,
      year: 2000 + n,
      doi: `10.5555/citing.${n}`,
    },
  };
}

const TEN: CitedByResult = {
  count: 12,
  works: Array.from({ length: 10 }, (_, i) => work(i + 1)),
  attribution: "Data from OpenAlex (CC0); Count from Crossref",
};

interface Rendered {
  container: HTMLElement;
  onAdd: jest.Mock<Promise<void>, [LookupResult]>;
}

function renderPanel(citation: Citation, onAdd?: (w: LookupResult) => Promise<void>): Rendered {
  const handler = jest.fn(onAdd ?? (async (_w: LookupResult): Promise<void> => undefined));
  const { container } = render(<CitedByPanel citation={citation} onAdd={handler} />);
  return { container, onAdd: handler };
}

function openSection(): void {
  const details = document.querySelector("details.cited-by") as HTMLDetailsElement;
  details.open = true;
  fireEvent(details, new Event("toggle"));
}

let openSpy: jest.SpyInstance;

beforeEach(() => {
  mockCitedByForCitation.mockReset();
  mockCitedByForCitation.mockResolvedValue(TEN);
  mockStoreAdd.mockClear();
  mockFetch.mockReset();
  openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
});

afterEach(() => {
  openSpy.mockRestore();
});

describe("ENP-008: cited-by panel lookup", () => {
  it("fetches nothing until the button is pressed, then lists the count and ten rows", async () => {
    renderPanel(ARTICLE);
    openSection();
    expect(screen.getByText("Cited by")).toBeInTheDocument();
    expect(mockCitedByForCitation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    expect(mockCitedByForCitation).toHaveBeenCalledWith(ARTICLE);

    expect(await screen.findByText("Cited by 12")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Citing works" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(10);
    expect(rows[0]).toHaveTextContent("Citing work 1");
    expect(rows[0]).toHaveTextContent("Author 1, Melbourne University Law Review 41(1) 2001");
    expect(screen.getByText("Data from OpenAlex (CC0); Count from Crossref")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Look up citing works" })).toBeNull();
  });

  it("shows the loading text while the lookup runs", () => {
    mockCitedByForCitation.mockReturnValue(new Promise<CitedByOutcome>(() => undefined));
    renderPanel(ARTICLE);
    openSection();
    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    expect(screen.getByText("Looking up citing works…")).toBeInTheDocument();
  });

  it("opens a citing work in a new window with noopener", async () => {
    renderPanel(ARTICLE);
    openSection();
    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    await screen.findByText("Cited by 12");
    fireEvent.click(screen.getByRole("button", { name: "Open Citing work 2" }));
    expect(openSpy).toHaveBeenCalledWith("https://doi.org/10.5555/citing.2", "_blank", "noopener");
  });

  it("explains that citing works need a DOI, with no button and no lookup", () => {
    renderPanel(cite({ title: "No identifier" }));
    openSection();
    expect(screen.getByText(CITED_BY_NO_DOI)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Look up citing works" })).toBeNull();
    expect(mockCitedByForCitation).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows the Settings message when source lookup is off and fetches nothing", async () => {
    mockCitedByForCitation.mockResolvedValue({ unavailable: CITED_BY_LOOKUP_OFF });
    renderPanel(ARTICLE);
    openSection();
    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    expect(await screen.findByText(CITED_BY_LOOKUP_OFF)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Citing works" })).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("reports no citing works when the count is zero", async () => {
    mockCitedByForCitation.mockResolvedValue({ count: null, works: [], attribution: "Data from OpenAlex (CC0)" });
    renderPanel(ARTICLE);
    openSection();
    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    expect(await screen.findByText("No citing works found.")).toBeInTheDocument();
  });

  it("shows a plain error when the lookup fails, and can try again", async () => {
    mockCitedByForCitation.mockRejectedValueOnce(new Error("The citing-works services could not be reached."));
    renderPanel(ARTICLE);
    openSection();
    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    expect(await screen.findByText("The citing-works services could not be reached.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Cited by 12")).toBeInTheDocument();
    expect(mockCitedByForCitation).toHaveBeenCalledTimes(2);
  });

  it("returns to the button when the citation changes", async () => {
    const { container } = renderPanel(ARTICLE);
    openSection();
    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    await screen.findByText("Cited by 12");

    const other = cite({ title: "Another", doi: "10.1000/other" });
    const onAdd = jest.fn(async (_w: LookupResult): Promise<void> => undefined);
    render(<CitedByPanel citation={other} onAdd={onAdd} />, { container });
    expect(screen.getByRole("button", { name: "Look up citing works" })).toBeInTheDocument();
    expect(screen.queryByText("Cited by 12")).toBeNull();
  });
});

describe("ENP-008: adding a citing work", () => {
  it("adds a linked journal article to the library through the store", async () => {
    renderPanel(ARTICLE, (w) => addCitingWorkToLibrary(ARTICLE, w).then(() => undefined));
    openSection();
    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    await screen.findByText("Cited by 12");

    fireEvent.click(screen.getByRole("button", { name: "Add Citing work 3 to library" }));
    await waitFor(() => expect(mockStoreAdd).toHaveBeenCalledTimes(1));

    const added = mockStoreAdd.mock.calls[0][0];
    expect(added.sourceType).toBe("journal.article");
    expect(added.linkedCitationId).toBe("parent-1");
    expect(added.linkingPhrase).toBe("citing");
    expect(added.tags).toEqual([]);
    expect(added.id).not.toBe("parent-1");
    expect(added.data).toEqual({
      authors: [{ givenNames: "Author", surname: "3" }],
      title: "Citing work 3",
      journal: "Melbourne University Law Review",
      volume: 43,
      issue: "1",
      startingPage: 103,
      year: 2003,
      doi: "10.5555/citing.3",
    });

    expect(await screen.findByText("Added to the library.")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Added Citing work 3 to library" });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Added");
  });

  it("passes the row to the supplied handler and reports its failure plainly", async () => {
    const { onAdd } = renderPanel(ARTICLE, async () => {
      throw new Error("The document is read-only.");
    });
    openSection();
    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    await screen.findByText("Cited by 12");

    fireEvent.click(screen.getByRole("button", { name: "Add Citing work 1 to library" }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ sourceId: "10.5555/citing.1" }));
    expect(await screen.findByText("The document is read-only.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Citing work 1 to library" })).not.toBeDisabled();
  });
});

describe("ENP-008: accessibility", () => {
  it("has no axe violations before and after the lookup", async () => {
    const { container } = renderPanel(ARTICLE);
    openSection();
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole("button", { name: "Look up citing works" }));
    await screen.findByText("Cited by 12");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations for a record without a DOI", async () => {
    const { container } = renderPanel(cite({ title: "No identifier" }));
    openSection();
    expect(await axe(container)).toHaveNoViolations();
  });
});
