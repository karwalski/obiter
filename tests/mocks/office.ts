/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Office.js mock for Node.js test environment.
 *
 * Provides a minimal mock of the Office.js and Word.js APIs sufficient
 * to test the src/word/ layer without a running Word host. All proxy
 * objects support property assignment, load/sync patterns, and the
 * core collection/navigation APIs used in production code.
 *
 * WordApi baseline: 1.5 (default). Tests can override isSetSupported
 * to simulate different API versions.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

/** Minimal mock of a Word.Font object. */
interface MockFont {
  bold: boolean | undefined;
  italic: boolean | undefined;
  smallCaps: boolean | undefined;
  superscript: boolean | undefined;
  name: string | undefined;
  size: number | undefined;
  color: string | undefined;
}

/** Minimal mock of a Word.ParagraphFormat object. */
interface MockParagraphFormat {
  alignment: string | undefined;
  leftIndent: number;
  firstLineIndent: number;
  lineSpacing: number;
  spaceAfter: number;
  spaceBefore: number;
}

// ─── Factory: Font ──────────────────────────────────────────────────────────

function createMockFont(): MockFont {
  return {
    bold: undefined,
    italic: undefined,
    smallCaps: undefined,
    superscript: undefined,
    name: undefined,
    size: undefined,
    color: undefined,
  };
}

// ─── Factory: ParagraphFormat ───────────────────────────────────────────────

function createMockParagraphFormat(): MockParagraphFormat {
  return {
    alignment: undefined,
    leftIndent: 0,
    firstLineIndent: 0,
    lineSpacing: 0,
    spaceAfter: 0,
    spaceBefore: 0,
  };
}

// ─── Factory: Range ─────────────────────────────────────────────────────────

export interface MockRange {
  text: string;
  font: MockFont;
  isEmpty: boolean;
  insertText: jest.Mock;
  insertContentControl: jest.Mock;
  insertFootnote: jest.Mock;
  insertParagraph: jest.Mock;
  getRange: jest.Mock;
  select: jest.Mock;
  compareLocationWith: jest.Mock;
  load: jest.Mock;
  contentControls: MockContentControlCollection;
  parentContentControlOrNullObject: MockContentControl;
  parentBody: MockBody;
  search: jest.Mock;
  paragraphs: MockParagraphCollection;
}

export function createMockRange(text = ""): MockRange {
  const font = createMockFont();
  const range: MockRange = {
    text,
    font,
    isEmpty: true,
    insertText: jest.fn().mockImplementation(() => createMockRange()),
    insertContentControl: jest.fn().mockImplementation((type?: string) =>
      createMockContentControl({ type }),
    ),
    insertFootnote: jest.fn().mockImplementation(() => createMockNoteItem()),
    insertParagraph: jest.fn().mockImplementation((_text: string) =>
      createMockParagraph(_text),
    ),
    getRange: jest.fn().mockImplementation(() => createMockRange()),
    select: jest.fn(),
    compareLocationWith: jest.fn().mockImplementation(() => ({
      value: "Before",
    })),
    load: jest.fn(),
    contentControls: createMockContentControlCollection(),
    parentContentControlOrNullObject: createMockContentControl({ isNullObject: true }),
    parentBody: createMockBody(),
    search: jest.fn().mockImplementation(() => createMockRangeCollection()),
    paragraphs: createMockParagraphCollection(),
  };
  return range;
}

// ─── Factory: RangeCollection ───────────────────────────────────────────────

export interface MockRangeCollection {
  items: MockRange[];
  load: jest.Mock;
}

export function createMockRangeCollection(items: MockRange[] = []): MockRangeCollection {
  return {
    items,
    load: jest.fn(),
  };
}

// ─── Factory: ContentControl ────────────────────────────────────────────────

export interface MockContentControl {
  tag: string;
  title: string;
  text: string;
  appearance: string;
  type: string;
  cannotDelete: boolean;
  cannotEdit: boolean;
  isNullObject: boolean;
  font: MockFont;
  paragraphFormat: MockParagraphFormat;
  contentControls: MockContentControlCollection;
  insertText: jest.Mock;
  insertContentControl: jest.Mock;
  getRange: jest.Mock;
  clear: jest.Mock;
  delete: jest.Mock;
  load: jest.Mock;
}

export function createMockContentControl(
  opts: Partial<{
    tag: string;
    title: string;
    text: string;
    type: string;
    isNullObject: boolean;
  }> = {},
): MockContentControl {
  const cc: MockContentControl = {
    tag: opts.tag ?? "",
    title: opts.title ?? "",
    text: opts.text ?? "",
    appearance: "Hidden",
    type: opts.type ?? "RichText",
    cannotDelete: false,
    cannotEdit: false,
    isNullObject: opts.isNullObject ?? false,
    font: createMockFont(),
    paragraphFormat: createMockParagraphFormat(),
    contentControls: createMockContentControlCollection(),
    insertText: jest.fn().mockImplementation(() => createMockRange()),
    insertContentControl: jest.fn().mockImplementation(() =>
      createMockContentControl(),
    ),
    getRange: jest.fn().mockImplementation(() => createMockRange()),
    clear: jest.fn(),
    delete: jest.fn(),
    load: jest.fn(),
  };
  return cc;
}

// ─── Factory: ContentControlCollection ──────────────────────────────────────

export interface MockContentControlCollection {
  items: MockContentControl[];
  load: jest.Mock;
  getByTag: jest.Mock;
}

export function createMockContentControlCollection(
  items: MockContentControl[] = [],
): MockContentControlCollection {
  return {
    items,
    load: jest.fn(),
    getByTag: jest.fn().mockImplementation((tag: string) => {
      const filtered = items.filter((cc) => cc.tag === tag);
      return createMockContentControlCollection(filtered);
    }),
  };
}

// ─── Factory: Paragraph ─────────────────────────────────────────────────────

export interface MockParagraph {
  text: string;
  style: string;
  font: MockFont;
  alignment: string;
  leftIndent: number;
  firstLineIndent: number;
  lineSpacing: number;
  lineUnitAfter: number;
  lineUnitBefore: number;
  isListItem: boolean;
  paragraphFormat: MockParagraphFormat;
  contentControls: MockContentControlCollection;
  insertText: jest.Mock;
  insertContentControl: jest.Mock;
  insertParagraph: jest.Mock;
  getRange: jest.Mock;
  startNewList: jest.Mock;
  attachToList: jest.Mock;
  load: jest.Mock;
  list: MockList;
  listItem: MockListItem;
}

export function createMockParagraph(text = ""): MockParagraph {
  return {
    text,
    style: "",
    font: createMockFont(),
    alignment: "Left",
    leftIndent: 0,
    firstLineIndent: 0,
    lineSpacing: 0,
    lineUnitAfter: 0,
    lineUnitBefore: 0,
    isListItem: false,
    paragraphFormat: createMockParagraphFormat(),
    contentControls: createMockContentControlCollection(),
    insertText: jest.fn().mockImplementation(() => createMockRange()),
    insertContentControl: jest.fn().mockImplementation(() =>
      createMockContentControl(),
    ),
    insertParagraph: jest.fn().mockImplementation((_text: string) =>
      createMockParagraph(_text),
    ),
    getRange: jest.fn().mockImplementation(() => createMockRange()),
    startNewList: jest.fn().mockImplementation(() => createMockList()),
    attachToList: jest.fn(),
    load: jest.fn(),
    list: createMockList(),
    listItem: createMockListItem(),
  };
}

// ─── Factory: ParagraphCollection ───────────────────────────────────────────

export interface MockParagraphCollection {
  items: MockParagraph[];
  load: jest.Mock;
}

export function createMockParagraphCollection(
  items: MockParagraph[] = [],
): MockParagraphCollection {
  return {
    items,
    load: jest.fn(),
  };
}

// ─── Factory: List ──────────────────────────────────────────────────────────

export interface MockList {
  id: number;
  setLevelNumbering: jest.Mock;
  setLevelStartingNumber: jest.Mock;
  load: jest.Mock;
}

export function createMockList(): MockList {
  return {
    id: 1,
    setLevelNumbering: jest.fn(),
    setLevelStartingNumber: jest.fn(),
    load: jest.fn(),
  };
}

// ─── Factory: ListItem ──────────────────────────────────────────────────────

export interface MockListItem {
  level: number;
  load: jest.Mock;
}

export function createMockListItem(): MockListItem {
  return {
    level: 0,
    load: jest.fn(),
  };
}

// ─── Factory: NoteItem ──────────────────────────────────────────────────────

export interface MockNoteItem {
  body: MockBody;
  reference: MockRange;
  delete: jest.Mock;
  load: jest.Mock;
}

export function createMockNoteItem(
  contentControls: MockContentControl[] = [],
): MockNoteItem {
  return {
    body: createMockBody(contentControls),
    reference: createMockRange(),
    delete: jest.fn(),
    load: jest.fn(),
  };
}

// ─── Factory: NoteItemCollection ────────────────────────────────────────────

export interface MockNoteItemCollection {
  items: MockNoteItem[];
  load: jest.Mock;
}

export function createMockNoteItemCollection(
  items: MockNoteItem[] = [],
): MockNoteItemCollection {
  return {
    items,
    load: jest.fn(),
  };
}

// ─── Factory: Body ──────────────────────────────────────────────────────────

export interface MockBody {
  text: string;
  type: string;
  font: MockFont;
  paragraphs: MockParagraphCollection;
  contentControls: MockContentControlCollection;
  footnotes: MockNoteItemCollection;
  insertParagraph: jest.Mock;
  search: jest.Mock;
  load: jest.Mock;
}

export function createMockBody(
  contentControls: MockContentControl[] = [],
): MockBody {
  const para = createMockParagraph();
  return {
    text: "",
    type: "MainDocument",
    font: createMockFont(),
    paragraphs: createMockParagraphCollection([para]),
    contentControls: createMockContentControlCollection(contentControls),
    footnotes: createMockNoteItemCollection(),
    insertParagraph: jest.fn().mockImplementation((_text: string) =>
      createMockParagraph(_text),
    ),
    search: jest.fn().mockImplementation(() => createMockRangeCollection()),
    load: jest.fn(),
  };
}

// ─── Factory: Style ─────────────────────────────────────────────────────────

export interface MockStyle {
  font: MockFont;
  paragraphFormat: MockParagraphFormat;
  load: jest.Mock;
}

export function createMockStyle(): MockStyle {
  return {
    font: createMockFont(),
    paragraphFormat: createMockParagraphFormat(),
    load: jest.fn(),
  };
}

// ─── Factory: StyleCollection ───────────────────────────────────────────────

export interface MockStyleCollection {
  getByName: jest.Mock;
}

export function createMockStyleCollection(): MockStyleCollection {
  return {
    getByName: jest.fn().mockImplementation(() => createMockStyle()),
  };
}

// ─── Factory: CustomProperty / CustomPropertyCollection ─────────────────────

export interface MockCustomProperty {
  key: string;
  value: string;
}

export interface MockCustomPropertyCollection {
  items: MockCustomProperty[];
  add: jest.Mock;
  load: jest.Mock;
}

export function createMockCustomPropertyCollection(): MockCustomPropertyCollection {
  return {
    items: [],
    add: jest.fn(),
    load: jest.fn(),
  };
}

// ─── Factory: Properties ────────────────────────────────────────────────────

export interface MockProperties {
  author: string;
  title: string;
  customProperties: MockCustomPropertyCollection;
  load: jest.Mock;
}

export function createMockProperties(): MockProperties {
  return {
    author: "",
    title: "",
    customProperties: createMockCustomPropertyCollection(),
    load: jest.fn(),
  };
}

// ─── Factory: Section ───────────────────────────────────────────────────────

export interface MockSection {
  getFooter: jest.Mock;
  setMargins: jest.Mock;
}

export function createMockSection(): MockSection {
  return {
    getFooter: jest.fn().mockImplementation(() => createMockBody()),
    setMargins: jest.fn(),
  };
}

export interface MockSectionCollection {
  items: MockSection[];
  load: jest.Mock;
}

export function createMockSectionCollection(): MockSectionCollection {
  return {
    items: [createMockSection()],
    load: jest.fn(),
  };
}

// ─── Factory: CustomXmlPart ─────────────────────────────────────────────────

export interface MockCustomXmlPart {
  getXml: jest.Mock;
}

export interface MockCustomXmlPartCollection {
  items: MockCustomXmlPart[];
  load: jest.Mock;
  getByNamespace: jest.Mock;
}

export function createMockCustomXmlPartCollection(): MockCustomXmlPartCollection {
  return {
    items: [],
    load: jest.fn(),
    getByNamespace: jest.fn().mockImplementation(() =>
      createMockCustomXmlPartCollection(),
    ),
  };
}

// ─── Factory: Document ──────────────────────────────────────────────────────

export interface MockDocument {
  body: MockBody;
  properties: MockProperties;
  sections: MockSectionCollection;
  contentControls: MockContentControlCollection;
  customXmlParts: MockCustomXmlPartCollection;
  getSelection: jest.Mock;
  addStyle: jest.Mock;
  getStyles: jest.Mock;
  load: jest.Mock;
}

export function createMockDocument(): MockDocument {
  const body = createMockBody();
  return {
    body,
    properties: createMockProperties(),
    sections: createMockSectionCollection(),
    contentControls: createMockContentControlCollection(),
    customXmlParts: createMockCustomXmlPartCollection(),
    getSelection: jest.fn().mockImplementation(() => createMockRange()),
    addStyle: jest.fn().mockImplementation(() => createMockStyle()),
    getStyles: jest.fn().mockImplementation(() => createMockStyleCollection()),
    load: jest.fn(),
  };
}

// ─── Factory: RequestContext ────────────────────────────────────────────────

export interface MockRequestContext {
  document: MockDocument;
  sync: jest.Mock;
}

export function createMockContext(): MockRequestContext {
  return {
    document: createMockDocument(),
    sync: jest.fn().mockResolvedValue(undefined),
  };
}

// ─── Office Error Classes ───────────────────────────────────────────────────

/**
 * Simulates an OfficeExtension.Error thrown by the Office.js runtime.
 * Real Office.js errors have a `code` property with values like
 * "GeneralException", "ItemNotFound", "InvalidArgument", "AccessDenied".
 */
export class OfficeError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? `Office.js error: ${code}`);
    this.name = "OfficeExtension.Error";
    this.code = code;
  }
}

// ─── Global Setup ───────────────────────────────────────────────────────────

/** Default isSetSupported: WordApi 1.5 baseline, nothing above. */
function defaultIsSetSupported(apiSet: string, version: string): boolean {
  if (apiSet !== "WordApi") return false;
  const v = parseFloat(version);
  return v <= 1.5;
}

/**
 * Installs Office and Word globals with the specified API version support.
 *
 * @param isSetSupported - Optional override for the isSetSupported function.
 *   Defaults to supporting WordApi 1.5 only.
 */
export function installOfficeGlobals(
  isSetSupported: (apiSet: string, version: string) => boolean = defaultIsSetSupported,
): void {
  const mockOffice = {
    context: {
      requirements: {
        isSetSupported,
      },
      diagnostics: {
        version: "16.0",
        platform: "Mac",
      },
      document: {
        addHandlerAsync: jest.fn().mockImplementation(
          (
            _eventType: unknown,
            _handler: unknown,
            callback: (result: { status: string }) => void,
          ) => {
            if (callback) {
              callback({ status: "succeeded" });
            }
          },
        ),
        removeHandlerAsync: jest.fn(),
      },
    },
    onReady: jest.fn().mockImplementation(
      (cb: (info: { host: string; platform: string }) => void) => {
        cb({ host: "Word", platform: "Mac" });
      },
    ),
    EventType: {
      DocumentSelectionChanged: "documentSelectionChanged",
      ActiveViewChanged: "activeViewChanged",
    },
    AsyncResultStatus: {
      Succeeded: "succeeded",
      Failed: "failed",
    },
    PlatformType: {
      PC: "PC",
      Mac: "Mac",
      OfficeOnline: "OfficeOnline",
    },
    InsertLocation: {
      start: "Start",
      end: "End",
      replace: "Replace",
    },
    Alignment: {
      centered: "Centered",
      left: "Left",
      right: "Right",
    },
    ContentControlAppearance: {
      hidden: "Hidden",
      boundingBox: "BoundingBox",
    },
    HeaderFooterType: {
      primary: "Primary",
    },
    BodyType: {
      footnote: "Footnote",
      mainDocument: "MainDocument",
    },
    actions: {
      associate: jest.fn(),
    },
  };

  const mockWord = {
    run: jest.fn().mockImplementation(
      async (callback: (context: MockRequestContext) => Promise<unknown>) => {
        const context = createMockContext();
        return callback(context);
      },
    ),
    InsertLocation: {
      start: "Start",
      end: "End",
      replace: "Replace",
    },
    Alignment: {
      centered: "Centered",
      left: "Left",
    },
    ContentControlAppearance: {
      hidden: "Hidden",
      boundingBox: "BoundingBox",
    },
    HeaderFooterType: {
      primary: "Primary",
    },
    BodyType: {
      footnote: "Footnote",
      mainDocument: "MainDocument",
    },
  };

  (globalThis as Record<string, unknown>).Office = mockOffice;
  (globalThis as Record<string, unknown>).Word = mockWord;
}

/**
 * Removes Office and Word globals.
 */
export function removeOfficeGlobals(): void {
  delete (globalThis as Record<string, unknown>).Office;
  delete (globalThis as Record<string, unknown>).Word;
}

/**
 * Returns an isSetSupported function that supports up to the given
 * WordApi version (inclusive).
 */
export function supportUpTo(maxVersion: string): (apiSet: string, version: string) => boolean {
  const max = parseFloat(maxVersion);
  return (apiSet: string, version: string) => {
    if (apiSet !== "WordApi") return false;
    return parseFloat(version) <= max;
  };
}
