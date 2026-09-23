/**
 * Shared fake footnote harness for refresher-level suites (STD-001).
 *
 * Layers a fake `document.body.footnotes` over {@link makeFakeContext} so the
 * real `refreshAllCitations` can run end to end against an in-memory
 * document: every footnote has one parent content control tagged
 * `obiter-fn` whose children are citation content controls carrying the
 * occurrence title (`Citation:<pref>` or `Citation:<pref>:<pinpoint>`), the
 * parent's current text and title, and jest mocks that capture what the
 * refresher writes back (`insertHtml`, `insertText`, `clear`).
 *
 * The shape mirrors what the refresher reads (footnoteTracker.buildFootnoteMap
 * and citationRefresher.scanFootnotes) and writes (executeRebuildChunk):
 *
 *   body.footnotes.items[i].body.contentControls.items = [parentCC, childCC…]
 *   parentCC.contentControls.items                     = [childCC…]
 *   parentCC.insertHtml(html, "Replace"); parentCC.title = "<hash title>"
 *   parentCC.getRange("Whole").search(text) → [{ insertContentControl }]
 *
 * Promoted from tests/word/modeSwitchRefresh.test.ts (SAFE-002/004 pattern);
 * the same mock style lives inline in tests/word/footnoteBackup.test.ts.
 *
 * Not a Jest test file — jest.config.js only matches *.test.ts.
 */

import { buildOccurrenceTitle, PARENT_CC_TAG } from "../../src/word/footnoteManager";
import type { Pinpoint } from "../../src/types/citation";
import { FakeDocState, makeFakeContext } from "./fakeWordHarness";

// ─── Specs ──────────────────────────────────────────────────────────────────

/** Per-occurrence format preference, as stored in the child-CC title. */
export type OccurrencePreference = "full" | "short" | "ibid" | "auto";

/** The default parent-CC title of a footnote Obiter has not yet hashed. */
export const DEFAULT_PARENT_TITLE = "Obiter Footnote";

/** One further citation occurrence inside the same footnote. */
export interface OccurrenceSpec {
  /** The citation id (the child-CC tag). */
  citationId: string;
  /** Format preference written into the child-CC title. Defaults to "auto". */
  pref?: OccurrencePreference;
  /**
   * Per-occurrence pinpoint written into the child-CC title. A string is
   * stored verbatim (`"42"`, `"[42]"`, `"s 5"`); a typed Pinpoint is encoded
   * with `pinpointToTitleString` exactly as footnoteManager does.
   */
  pinpoint?: string | Pinpoint;
}

/** One footnote of the fake document. */
export interface FootnoteSpec extends OccurrenceSpec {
  /**
   * The footnote's current text as Word holds it before the refresh. The
   * refresher compares this with its expected render (SAFE-002): an exact
   * match is "unchanged", a hash match is "rebuild", anything else is a
   * user edit. Defaults to "" so a fresh document is always rebuilt.
   */
  text?: string;
  /**
   * Parent-CC title. Carries the lock flag (`LOCKED_PARENT_CC_TITLE`) and the
   * rendered-text hash stamped by a previous rebuild. Defaults to
   * {@link DEFAULT_PARENT_TITLE} (no hash, unlocked).
   */
  title?: string;
  /** Further citations in this footnote, in document order after the first. */
  additional?: OccurrenceSpec[];
}

// ─── Fake proxies ───────────────────────────────────────────────────────────

/** A fake child citation content control (tag = citation id). */
export interface FakeChildCC {
  tag: string;
  title: string;
  text: string;
}

/** A fake `obiter-fn` parent content control with write capture. */
export interface FakeParentCC {
  tag: string;
  title: string;
  text: string;
  load: jest.Mock;
  /** Captures every `insertHtml(html, location)` the refresher issues. */
  insertHtml: jest.Mock;
  /** Captures every `insertText(text, location)` call (footnoteManager paths). */
  insertText: jest.Mock;
  /** Captures `clear()` (the restore path clears before re-inserting). */
  clear: jest.Mock;
  getRange: jest.Mock;
  contentControls: { load: jest.Mock; items: FakeChildCC[] };
}

/** A content control wrapped around a citation's text during a rebuild. */
export interface FakeWrappedCC {
  tag: string;
  title: string;
  appearance: string;
}

/** The fake refresh context plus its per-footnote proxies. */
export interface FakeFootnoteContext {
  context: Word.RequestContext;
  /** The `obiter-fn` parent CC of each footnote, in document order. */
  parents: FakeParentCC[];
  /** The child citation CCs of each footnote, in document order. */
  children: FakeChildCC[][];
  /**
   * The CCs the rebuild wrapped around each footnote's citation text, in the
   * order `insertContentControl` was called (one per rendered citation).
   */
  wrapped: FakeWrappedCC[][];
}

// ─── Builder ────────────────────────────────────────────────────────────────

/**
 * Builds a fake refresh context over `doc` with one `obiter-fn` parent CC per
 * footnote spec, each containing the spec's child citation CC(s).
 *
 * Word's `body.contentControls` includes nested descendants, so each
 * footnote body lists the parent followed by its children, and the parent's
 * own `contentControls` lists the children only — the refresher relies on
 * both views.
 *
 * `opts.bodyText` seeds `document.body.text` for callers that read the body
 * (the refresher does not).
 */
export function makeRefreshContext(
  doc: FakeDocState,
  specs: FootnoteSpec[],
  opts: { bodyText?: string } = {}
): FakeFootnoteContext {
  const handle = makeFakeContext(doc);

  const fns = specs.map((spec) => {
    const occurrences: OccurrenceSpec[] = [spec, ...(spec.additional ?? [])];
    const children: FakeChildCC[] = occurrences.map((occ) => ({
      tag: occ.citationId,
      title: buildOccurrenceTitle(occ.pref ?? "auto", occ.pinpoint),
      text: "",
    }));

    const wrapped: FakeWrappedCC[] = [];
    // Every search returns one match whose insertContentControl yields a
    // fresh wrapped CC, so the rebuild's stage 3 records one CC per citation.
    const parentRange = {
      search: jest.fn(() => {
        const wrappedChild: FakeWrappedCC = { tag: "", title: "", appearance: "" };
        const matchRange = {
          insertContentControl: jest.fn(() => {
            wrapped.push(wrappedChild);
            return wrappedChild;
          }),
        };
        return { items: [matchRange], load: jest.fn() };
      }),
    };

    const parentCC: FakeParentCC = {
      tag: PARENT_CC_TAG,
      title: spec.title ?? DEFAULT_PARENT_TITLE,
      text: spec.text ?? "",
      load: jest.fn(),
      insertHtml: jest.fn(),
      insertText: jest.fn(),
      clear: jest.fn(),
      getRange: jest.fn(() => parentRange),
      contentControls: { load: jest.fn(), items: children },
    };
    const noteItem = {
      body: {
        contentControls: { load: jest.fn(), items: [parentCC, ...children] },
      },
    };
    return { parentCC, children, wrapped, noteItem };
  });

  const context = handle.context as unknown as {
    document: { body?: unknown; customXmlParts: unknown };
  };
  context.document.body = {
    text: opts.bodyText ?? "",
    load: jest.fn(),
    footnotes: { load: jest.fn(), items: fns.map((f) => f.noteItem) },
  };

  return {
    context: context as unknown as Word.RequestContext,
    parents: fns.map((f) => f.parentCC),
    children: fns.map((f) => f.children),
    wrapped: fns.map((f) => f.wrapped),
  };
}

// ─── Readers ────────────────────────────────────────────────────────────────

/**
 * Plain text of an `insertHtml` fragment (the refresher's expected text).
 *
 * Uses DOMParser under jsdom; under the node environment it decodes the
 * inline-only fragments `runsToHtml` emits (tags stripped, the three
 * entities `escapeHtml` produces decoded).
 */
export function htmlToText(html: string): string {
  if (typeof DOMParser !== "undefined") {
    return new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
  }
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** The last HTML fragment written to each footnote, or undefined if untouched. */
export function footnoteHtml(ctx: FakeFootnoteContext): Array<string | undefined> {
  return ctx.parents.map((parent) => {
    const calls = parent.insertHtml.mock.calls;
    return calls.length > 0 ? (calls[calls.length - 1][0] as string) : undefined;
  });
}

/**
 * The text each footnote holds after the refresh: the plain text of the last
 * `insertHtml` fragment when the footnote was rebuilt, otherwise the text it
 * started with (unchanged, user-edited or locked).
 */
export function footnoteTexts(ctx: FakeFootnoteContext): string[] {
  return footnoteHtml(ctx).map((html, i) =>
    html === undefined ? ctx.parents[i].text : htmlToText(html)
  );
}
