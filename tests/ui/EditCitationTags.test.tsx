/**
 * @jest-environment jsdom
 *
 * ENP-001: the tag editor in the Edit view. Adding a tag then saving
 * persists it on the citation; system tags are read-only labels, never
 * editable chips, and survive the save untouched.
 */
import * as React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import EditCitation from "../../src/ui/views/EditCitation";
import TagEditor from "../../src/ui/components/TagEditor";
import { buildCitationFromRequest } from "../../src/actions/citationRequest";
import type { Citation } from "../../src/types/citation";

// ─── Mocks ──────────────────────────────────────────────────────────────────

let mockCitation: Citation;
let mockLibrary: Citation[] = [];

const mockStore = {
  getById: jest.fn((id: string) => (id === mockCitation.id ? mockCitation : undefined)),
  getAll: jest.fn(() => mockLibrary),
  getStandardId: jest.fn(() => "aglc4"),
  getCourtToggles: jest.fn(() => undefined),
  update: jest.fn(async () => undefined),
};

jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve(mockStore),
  getSharedStoreIfReady: (): unknown => null,
}));

jest.mock("../../src/store/devicePreferences", () => ({
  getDevicePref: jest.fn(() => undefined),
}));

jest.mock("../../src/word/footnoteManager", () => ({
  updateCitationContent: jest.fn(async () => undefined),
  deleteCitationFootnote: jest.fn(async () => undefined),
  getAllCitationFootnotes: jest.fn(async () => []),
  appendToFootnoteByIndex: jest.fn(async () => undefined),
  updateOccurrenceMetadata: jest.fn(async () => undefined),
  setFootnoteLock: jest.fn(async () => undefined),
  getFootnoteText: jest.fn(async () => ""),
  setOccurrenceText: jest.fn(async () => undefined),
}));

jest.mock("../../src/ui/views/CitationLibrary", () => ({
  getCitationLabel: (c: { id: string }) => c.id,
}));

jest.mock("../../src/word/citationRefresher", () => ({
  refreshAllCitations: jest.fn(async () => undefined),
}));

(globalThis as unknown as { Word: { run: (cb: (ctx: unknown) => unknown) => unknown } }).Word = {
  run: async (cb: (ctx: unknown) => unknown) => cb({}),
};

jest.mock("../../src/ui/components/CitationPreview", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../src/ui/context/CitationContext", () => ({
  useCitationContext: () => ({
    selectedCitationId: mockCitation.id,
    setSelectedCitationId: jest.fn(),
    focusField: null,
    setFocusField: jest.fn(),
    refreshCounter: 0,
  }),
}));

function makeCitation(tags: string[]): Citation {
  const c = buildCitationFromRequest(
    {
      sourceType: "book",
      data: {
        authors: [{ givenNames: "James", surname: "Edelman" }],
        title: "Unjust Enrichment",
        publisher: "Hart Publishing",
        year: "2016",
      },
    },
    "4"
  );
  return { ...c, tags };
}

async function renderEdit(): Promise<HTMLElement> {
  const { container } = render(<MemoryRouter><EditCitation /></MemoryRouter>);
  await waitFor(() => expect(screen.getByLabelText("Tags")).toBeInTheDocument());
  return container;
}

describe("ENP-001: tags in the Edit view", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCitation = makeCitation(["import", "import:ris", "existing"]);
    const other = { ...makeCitation(["remedies", "import"]), id: "other" };
    mockLibrary = [mockCitation, other];
  });

  it("adding a tag then saving persists it after the system tags", async () => {
    await renderEdit();
    const input = screen.getByLabelText("Tags");
    fireEvent.change(input, { target: { value: "  Contract Law " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("button", { name: "Remove contract law" })).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Update Citation" }));
    await waitFor(() => expect(mockStore.update).toHaveBeenCalledTimes(1));
    const saved = mockStore.update.mock.calls[0][0] as unknown as Citation;
    expect(saved.tags).toEqual(["import", "import:ris", "existing", "contract law"]);
    expect(saved.data.title).toBe("Unjust Enrichment");
  });

  it("system tags are read-only labels, not editable chips, and survive a save", async () => {
    await renderEdit();
    expect(screen.getByLabelText("System tag import")).toBeInTheDocument();
    expect(screen.getByLabelText("System tag import:ris")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove import" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove import:ris" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove existing" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove existing" }));
    fireEvent.click(screen.getByRole("button", { name: "Update Citation" }));
    await waitFor(() => expect(mockStore.update).toHaveBeenCalledTimes(1));
    const saved = mockStore.update.mock.calls[0][0] as unknown as Citation;
    expect(saved.tags).toEqual(["import", "import:ris"]);
  });

  it("offers other citations' user tags as suggestions, never system tags", async () => {
    await renderEdit();
    const input = screen.getByLabelText("Tags") as HTMLInputElement;
    const list = document.getElementById(input.getAttribute("list") ?? "");
    expect(list).not.toBeNull();
    const values = Array.from(list?.querySelectorAll("option") ?? []).map((o) => o.value);
    expect(values).toEqual(["remedies"]);
  });

  it("has no axe violations", async () => {
    const container = await renderEdit();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("ENP-001: TagEditor keyboard and comma handling", () => {
  function Harness({ initial }: { initial: string[] }): JSX.Element {
    const [tags, setTags] = React.useState(initial);
    return (
      <div>
        <TagEditor tags={tags} onChange={setTags} suggestions={["Remedies", "contract"]} />
        <output data-testid="tags">{tags.join("|")}</output>
      </div>
    );
  }

  it("a comma commits the text before it, duplicates are ignored", () => {
    render(<Harness initial={["waitangi_tribunal", "contract"]} />);
    const input = screen.getByLabelText("Tags");
    fireEvent.change(input, { target: { value: "Contract, tort," } });
    expect(screen.getByTestId("tags")).toHaveTextContent("waitangi_tribunal|contract|tort");
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("Backspace on an empty input removes the last chip", () => {
    render(<Harness initial={["import", "one", "two"]} />);
    const input = screen.getByLabelText("Tags");
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(screen.getByTestId("tags")).toHaveTextContent("import|one");
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(screen.getByTestId("tags")).toHaveTextContent("import|one");
  });

  it("suggestions exclude tags already on the citation", () => {
    render(<Harness initial={["contract"]} />);
    const input = screen.getByLabelText("Tags") as HTMLInputElement;
    const list = document.getElementById(input.getAttribute("list") ?? "");
    const values = Array.from(list?.querySelectorAll("option") ?? []).map((o) => o.value);
    expect(values).toEqual(["remedies"]);
  });

  it("has no axe violations", async () => {
    const { container } = render(<Harness initial={["import", "contract"]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
