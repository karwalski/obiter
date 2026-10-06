/**
 * @jest-environment jsdom
 *
 * COURT-101: opening the task pane never modifies an existing style
 * (built-in or custom). Built-in Heading 1–5 formatting (AGLC4 Rule 1.12.2)
 * runs only from the explicit, previewed set-up action. On a new blank
 * academic document, missing AGLC4 styles may be created (create-only).
 *
 * Evidence: O-K1 (task-pane open restyled Heading 1–5 on WordApi 1.6+);
 * addStyle/getStyles are WordApi 1.5 (MS-2, R08 §3.7).
 */

import {
  applyAglc4HeadingFormatting,
  applyAglc4Styles,
  AGLC4_STYLE_NAMES,
  createAglc4Styles,
} from "../../src/word/styles";
import { runStartupDocumentTasks } from "../../src/word/startupSetup";
import { describeBuiltInHeadingChanges } from "../../src/word/aglc4HeadingStyles";
import {
  AUTO_CREATE_STYLES_PREF,
  LEGACY_AUTO_SETUP_KEY,
} from "../../src/store/autoSetupPreference";

// ─── Recording mocks ─────────────────────────────────────────────────────────

/** Every property write on any style object: "<style>.<path>=<value>". */
let writes: string[];

/** A style object whose every property set (at any depth) is recorded. */
function recordingStyle(name: string): Record<string, unknown> {
  const make = (path: string): Record<string, unknown> =>
    new Proxy({} as Record<string, unknown>, {
      get(target, prop) {
        if (prop === "load") return jest.fn();
        if (typeof prop !== "string") return undefined;
        if (!(prop in target)) target[prop] = make(`${path}.${prop}`);
        return target[prop];
      },
      set(_target, prop, value) {
        writes.push(`${path}.${String(prop)}=${String(value)}`);
        return true;
      },
    });
  return make(name);
}

interface MockDoc {
  existing: Set<string>;
  bodyText: string;
  addStyle: jest.Mock;
  getStyles: jest.Mock;
  getByName: jest.Mock;
}

function makeContext(existing: string[], bodyText = "Some court text") {
  const doc: MockDoc = {
    existing: new Set(existing),
    bodyText,
    addStyle: jest.fn((name: string) => recordingStyle(`new:${name}`)),
    getStyles: jest.fn(),
    getByName: jest.fn((name: string) => recordingStyle(name)),
  };
  doc.getStyles.mockImplementation(() => ({
    getByName: doc.getByName,
    getByNameOrNullObject: (name: string) => ({
      isNullObject: !doc.existing.has(name),
      load: jest.fn(),
    }),
  }));
  const customProps = {
    getItemOrNullObject: jest.fn(() => ({
      isNullObject: true,
      value: undefined,
      load: jest.fn(),
      delete: jest.fn(),
    })),
    add: jest.fn(),
  };
  const context = {
    sync: jest.fn().mockResolvedValue(undefined),
    document: {
      addStyle: doc.addStyle,
      getStyles: doc.getStyles,
      body: { text: bodyText, load: jest.fn() },
      properties: { customProperties: customProps },
    },
  };
  return { context: context as unknown as Word.RequestContext, doc, customProps };
}

function installOffice(maxWordApi: number): void {
  (globalThis as Record<string, unknown>).Office = {
    context: {
      requirements: {
        isSetSupported: (set: string, v: string) =>
          set === "WordApi" && parseFloat(v) <= maxWordApi,
      },
      diagnostics: { platform: "PC", version: "16.0.19000" },
    },
  };
}

function store(mode: "academic" | "court", citations = 0) {
  return {
    getAll: () => new Array(citations).fill({}),
    getStandardId: () => "aglc4",
    getWritingMode: () => mode,
  };
}

const ALL_EXISTING = [
  ...AGLC4_STYLE_NAMES,
  "Heading 1",
  "Heading 2",
  "Heading 3",
  "Heading 4",
  "Heading 5",
];

beforeEach(() => {
  writes = [];
  localStorage.clear();
  installOffice(1.9);
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).Office;
});

// ─── Opening the pane ────────────────────────────────────────────────────────

describe("COURT-101: opening the task pane", () => {
  it("never writes a property of any existing style on an existing document", async () => {
    const { context, doc } = makeContext(ALL_EXISTING, "I INTRODUCTION");
    await runStartupDocumentTasks(context, store("academic", 3), "1.17.7");
    expect(writes).toEqual([]);
    expect(doc.getByName).not.toHaveBeenCalled();
    expect(doc.addStyle).not.toHaveBeenCalled();
  });

  it("never touches styles on a court-mode document, even when blank", async () => {
    const { context, doc } = makeContext([], "");
    await runStartupDocumentTasks(context, store("court"), "1.17.7");
    expect(writes).toEqual([]);
    expect(doc.addStyle).not.toHaveBeenCalled();
    expect(doc.getStyles).not.toHaveBeenCalled();
  });

  it("leaves a non-blank document with no citations alone (eg an unrelated court template)", async () => {
    const { context, doc } = makeContext([], "IN THE FEDERAL COURT OF AUSTRALIA");
    await runStartupDocumentTasks(context, store("academic"), "1.17.7");
    expect(doc.addStyle).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  });

  it("on a new blank academic document creates only missing AGLC4 styles", async () => {
    const { context, doc } = makeContext(["AGLC4 Title"], "");
    const result = await runStartupDocumentTasks(context, store("academic"), "1.17.7");
    expect(result.stylesCreated).not.toContain("AGLC4 Title");
    expect(result.stylesCreated).toContain("AGLC4 Block Quote");
    expect(doc.addStyle).not.toHaveBeenCalledWith("AGLC4 Title", expect.anything());
    // Only freshly created styles were written to; Heading 1–5 untouched.
    expect(writes.every((w) => w.startsWith("new:"))).toBe(true);
    expect(doc.getByName).not.toHaveBeenCalled();
  });

  it("creates no style when the host reports the document read-only", async () => {
    const office = (globalThis as Record<string, unknown>).Office as Record<string, unknown>;
    office.DocumentMode = { ReadOnly: "readOnly", ReadWrite: "readWrite" };
    (office.context as Record<string, unknown>).document = { mode: "readOnly" };
    const { context, doc } = makeContext([], "");
    const result = await runStartupDocumentTasks(context, store("academic"), "1.17.7");
    expect(result.stylesCreated).toEqual([]);
    expect(doc.addStyle).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  });

  it("respects the visible setting when switched off", async () => {
    localStorage.setItem(`obiter-device.${AUTO_CREATE_STYLES_PREF}`, "false");
    const { context, doc } = makeContext([], "");
    await runStartupDocumentTasks(context, store("academic"), "1.17.7");
    expect(doc.addStyle).not.toHaveBeenCalled();
  });

  it("migrates the hidden obiter-autoSetup opt-out to the visible setting", async () => {
    localStorage.setItem(LEGACY_AUTO_SETUP_KEY, "false");
    const { context, doc } = makeContext([], "");
    await runStartupDocumentTasks(context, store("academic"), "1.17.7");
    expect(doc.addStyle).not.toHaveBeenCalled();
    expect(localStorage.getItem(LEGACY_AUTO_SETUP_KEY)).toBeNull();
    expect(localStorage.getItem(`obiter-device.${AUTO_CREATE_STYLES_PREF}`)).toBe("false");
  });
});

// ─── createAglc4Styles / applyAglc4Styles ────────────────────────────────────

describe("COURT-101 / COURT-103: AGLC4 style creation", () => {
  it("creates styles on WordApi 1.5 (addStyle is 1.5, not 1.6)", async () => {
    installOffice(1.5);
    const { context } = makeContext([], "");
    const created = await createAglc4Styles(context);
    expect(created).toEqual([...AGLC4_STYLE_NAMES]);
  });

  it("does nothing below WordApi 1.5", async () => {
    installOffice(1.4);
    const { context, doc } = makeContext([], "");
    expect(await createAglc4Styles(context)).toEqual([]);
    expect(doc.addStyle).not.toHaveBeenCalled();
  });

  it("creates nothing when every AGLC4 style already exists", async () => {
    const { context, doc } = makeContext(ALL_EXISTING);
    expect(await createAglc4Styles(context)).toEqual([]);
    expect(doc.addStyle).not.toHaveBeenCalled();
  });

  it("applyAglc4Styles without options never restyles built-in headings", async () => {
    const { context, doc } = makeContext(ALL_EXISTING);
    await applyAglc4Styles(context);
    expect(doc.getByName).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  });

  it("explicit action restyles Heading 1–5 per Rule 1.12.2", async () => {
    const { context, doc } = makeContext(ALL_EXISTING);
    await applyAglc4Styles(context, { formatBuiltInHeadings: true });
    expect(doc.getByName.mock.calls.map((c) => c[0])).toEqual([
      "Heading 1",
      "Heading 2",
      "Heading 3",
      "Heading 4",
      "Heading 5",
    ]);
    // Rule 1.12.2: Level I small capitals, centred; Level III italic, left-aligned.
    expect(writes).toContain("Heading 1.font.smallCaps=true");
    expect(writes).toContain("Heading 1.paragraphFormat.alignment=Centered");
    expect(writes).toContain("Heading 3.font.italic=true");
    expect(writes).toContain("Heading 3.paragraphFormat.alignment=Left");
  });

  it("applyAglc4HeadingFormatting is a no-op below WordApi 1.5", async () => {
    installOffice(1.4);
    const { context, doc } = makeContext(ALL_EXISTING);
    await applyAglc4HeadingFormatting(context);
    expect(doc.getByName).not.toHaveBeenCalled();
  });

  it("describes every heading change before the explicit action runs", () => {
    const lines = describeBuiltInHeadingChanges();
    expect(lines).toHaveLength(5);
    expect(lines[0]).toMatch(/^Heading 1 \(Level I\): .*small capitals.*centred/);
    expect(lines[1]).toMatch(/^Heading 2 \(Level II\): .*italic.*centred/);
    expect(lines[4]).toMatch(/^Heading 5 \(Level V\): .*left-aligned.*indented 1 in/);
  });
});
