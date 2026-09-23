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
 *   childCC.delete(false)                                (old children removed)
 *   parentCC.insertHtml(html, "Replace" | "End") → range.insertContentControl()
 *   parentCC.insertText(sep | ".", "End");  parentCC.title = "<hash title>"
 *
 * The fake document is LIVE and models Word for the web, the stricter host:
 * a write updates the parent's text ("Replace" resets it, "End" appends), a
 * child wrapped through `insertContentControl` joins the parent's
 * `contentControls`, and only an explicit `delete()` removes a child — a
 * "Replace" insert on the parent does NOT (the v1.17.2 defect), so a rebuild
 * that forgets to delete shows up as accumulating children.
 *
 * The old `getRange("Whole").search(text)` fake is kept for callers that
 * still wrap by search; the refresher no longer does.
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

/**
 * A fake child citation content control (tag = citation id) — either seeded
 * from a spec or wrapped by a rebuild through `insertContentControl`.
 */
export interface FakeChildCC {
  tag: string;
  title: string;
  /** The child's text: "" when seeded, the wrapped fragment's text when wrapped. */
  text: string;
  appearance: string;
  /** `delete(keepContent)` as the rebuild issues it; marks the control removed. */
  delete: jest.Mock;
  /** True once the refresher deleted this control from its parent. */
  removed: boolean;
}

/** @deprecated Wrapped children are {@link FakeChildCC}s; kept as an alias. */
export type FakeWrappedCC = FakeChildCC;

/** One write the refresher issued on a parent CC, in call order. */
export interface FakeWrite {
  /** `insertHtml` or `insertText`. */
  kind: "html" | "text";
  /** The fragment (HTML) or the plain text passed in. */
  content: string;
  /** The insert location passed in ("Replace" or "End"). */
  location: string;
  /** The child CC wrapped around this write's returned range, if any. */
  child?: FakeChildCC;
}

/** The range an `insertHtml` / `insertText` on a fake parent returns. */
export interface FakeInsertedRange {
  insertContentControl: jest.Mock;
}

/** A fake `obiter-fn` parent content control with write capture. */
export interface FakeParentCC {
  tag: string;
  title: string;
  /** The footnote's current text; updated live by every write. */
  text: string;
  load: jest.Mock;
  /**
   * Captures every `insertHtml(html, location)` the refresher issues and
   * returns a {@link FakeInsertedRange} whose `insertContentControl` records
   * the wrapped child.
   */
  insertHtml: jest.Mock;
  /** Captures every `insertText(text, location)` call; returns a range too. */
  insertText: jest.Mock;
  /** Captures `clear()` (the restore path clears before re-inserting). */
  clear: jest.Mock;
  /** The legacy search fake (`getRange("Whole").search(text)`), for old callers. */
  getRange: jest.Mock;
  /** The parent's live children: seeded ones not yet deleted, plus wrapped ones. */
  contentControls: { load: jest.Mock; readonly items: FakeChildCC[] };
  /** Every write issued on this parent, in order. */
  writes: FakeWrite[];
}

/** The fake refresh context plus its per-footnote proxies. */
export interface FakeFootnoteContext {
  context: Word.RequestContext;
  /** The `obiter-fn` parent CC of each footnote, in document order. */
  parents: FakeParentCC[];
  /** The child citation CCs each footnote was SEEDED with, in document order. */
  children: FakeChildCC[][];
  /**
   * The CCs rebuilds wrapped around each footnote's citation text, in the
   * order `insertContentControl` was called (one per rendered citation),
   * accumulated across every refresh run over this context.
   */
  wrapped: FakeChildCC[][];
}

// ─── Builder ────────────────────────────────────────────────────────────────

/**
 * Builds a fake refresh context over `doc` with one `obiter-fn` parent CC per
 * footnote spec, each containing the spec's child citation CC(s).
 *
 * Word's `body.contentControls` includes nested descendants, so each
 * footnote body lists the parent followed by its children, and the parent's
 * own `contentControls` lists the children only — the refresher relies on
 * both views. Both views are live (see the module comment).
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
    const live: FakeChildCC[] = [];

    const makeChild = (tag: string, title: string, text: string): FakeChildCC => {
      const child: FakeChildCC = {
        tag,
        title,
        text,
        appearance: "",
        removed: false,
        delete: jest.fn(() => {
          child.removed = true;
          const at = live.indexOf(child);
          if (at >= 0) live.splice(at, 1);
        }),
      };
      live.push(child);
      return child;
    };

    const children: FakeChildCC[] = occurrences.map((occ) =>
      makeChild(occ.citationId, buildOccurrenceTitle(occ.pref ?? "auto", occ.pinpoint), "")
    );

    const wrapped: FakeChildCC[] = [];
    const writes: FakeWrite[] = [];

    // Every write updates the footnote's text the way Word presents it to
    // the next scan and returns the inserted range; wrapping that range
    // records one child per citation.
    const write = (kind: "html" | "text", content: string, location: string): FakeInsertedRange => {
      const text = kind === "html" ? htmlToText(content) : content;
      parentCC.text = location === "Replace" ? text : parentCC.text + text;
      const entry: FakeWrite = { kind, content, location };
      writes.push(entry);
      return {
        insertContentControl: jest.fn(() => {
          const child = makeChild("", "", text);
          wrapped.push(child);
          entry.child = child;
          return child;
        }),
      };
    };

    // Legacy search fake: every search returns one match whose
    // insertContentControl yields a fresh wrapped CC.
    const parentRange = {
      search: jest.fn(() => {
        const matchRange = {
          insertContentControl: jest.fn(() => {
            const child = makeChild("", "", "");
            wrapped.push(child);
            return child;
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
      insertHtml: jest.fn((html: string, location: string) => write("html", html, location)),
      insertText: jest.fn((text: string, location: string) => write("text", text, location)),
      clear: jest.fn(() => {
        parentCC.text = "";
      }),
      getRange: jest.fn(() => parentRange),
      contentControls: {
        load: jest.fn(),
        get items(): FakeChildCC[] {
          return [...live];
        },
      },
      writes,
    };
    const noteItem = {
      body: {
        contentControls: {
          load: jest.fn(),
          get items(): Array<FakeParentCC | FakeChildCC> {
            return [parentCC, ...live];
          },
        },
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

/** Plain text of one write: the fragment's text for HTML, the text itself otherwise. */
function writeText(write: FakeWrite): string {
  return write.kind === "html" ? htmlToText(write.content) : write.content;
}

/**
 * The text a sequence of writes leaves in a footnote ("Replace" resets,
 * anything else appends), or `undefined` when nothing was written.
 */
export function textOfWrites(writes: readonly FakeWrite[]): string | undefined {
  if (writes.length === 0) return undefined;
  let text = "";
  for (const write of writes) {
    text = write.location === "Replace" ? writeText(write) : text + writeText(write);
  }
  return text;
}

/**
 * The text each footnote holds after the refresh: reconstructed from the
 * sequence of `insertHtml` / `insertText` calls when the footnote was
 * rebuilt, otherwise the text it started with (unchanged, user-edited or
 * locked).
 */
export function footnoteTexts(ctx: FakeFootnoteContext): string[] {
  return ctx.parents.map((parent) => textOfWrites(parent.writes) ?? parent.text);
}

/** The child CCs each footnote's parent currently holds, in document order. */
export function liveChildren(ctx: FakeFootnoteContext): FakeChildCC[][] {
  return ctx.parents.map((parent) => parent.contentControls.items);
}
