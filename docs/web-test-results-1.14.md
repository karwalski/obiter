# Phase 2 Web Test Results — v1.14.1 on Word online (2026-07-07)

Automated Playwright pass against the M365 trial tenant (planatrading), pane served from
`obiter.com.au/app/` (production slot, v1.14.1 — note: the sideloaded manifest was prod, not
beta; both slots serve the same 1.14.1 build). Verification method: UI driving + download of
the .docx after each step and assertion against `document.xml`/`footnotes.xml` (exact strings
and italic runs). Test artifacts in the tenant OneDrive: `Obiter-Web-Test-A.docx`,
`LF-Copy-Persist.docx`, `LF-Copy-Mutate.docx`, `LF-Copy-ScanRepair.docx`,
`Obiter-Never-Obiter.docx`. `Lane Filterings.docx` untouched.

Stories filed: **WEB-001 … WEB-011 + WEB-WATCH** in `../footnote-backlog.md`.

## Release blockers for the web channel (P0)

| Story | Finding |
|-------|---------|
| WEB-001 | Insert breaks the CC contract: parent `obiter-fn` keeps visible "Click or tap here to enter text." placeholder in EVERY footnote; citation CC inserted as sibling (or nested inside another citation CC when cursor is in one) |
| WEB-002 | Run-format leak: every run after the first italic span renders italic (`(NSW)`, `(1884) 28 Ch D 7`, publisher parens, pinpoints, `art I § 8 cl 3` all wrongly italic) |
| WEB-003 | Refresh All silent no-op: reports "All footnotes refreshed", changes nothing; no Ibid/(n X)/short-title resolution on web (likely WEB-001 cascade) |
| WEB-004 | Insert Bibliography fails (`OfficeExtension` InvalidArgument), leaves a partial "A Articles/Books/Reports" heading; pane preview itself is correct |

## P1/P2

- WEB-005: `*Mabo*` markup literal in biblio preview; no roman-in-italic toggle in footnotes (PARITY-122 gap)
- WEB-006: validator false "missing author" on populated journal/book + shows raw UUIDs as labels
- WEB-007: `Barton v Chibber (, )`, report `()` — empty-field punctuation beyond BUG-005(b); silent insert of incomplete citations (BUG-005(c))
- WEB-008: GenAI renders ISO date `2026-07-07` + empty prompt `()`
- WEB-009: Hansard `Cth,` instead of `Commonwealth,`; pinpoint dropped
- WEB-010: cursor left inside footnote after insert → immediate second insert stacks, prepended
- WEB-011: heading "I " numbering prefix absent after Level apply on web (verify)

## What passed on web

- Store persistence: v1.10.31 store migrated; 18-citation library correct after duplication and 3 reload cycles; single customXml part throughout; new doc creates store exactly once (§2 all green)
- Engine text content (independent of the italic leak): reported case incl `&` parties (BUG-001 string), statute (`Road Rules 2014 (NSW)` — no year duplication on fresh insert), journal, book, ebook (book + URL, no Platform field, DECISION-019), treaty (rule 8.1 string exact), UN doc, ICJ, US Constitution fields (DECISION-027), foreign sub-type forms
- Validation: catches genuinely missing fields (Barton year/series), Rule 1.10.1 numeral suggestions with Go-to
- Bibliography preview: correct grouping (A Articles/Books/Reports, B Cases), ordering, surname-first
- Styling: Set Up Document buttons present; Level I applied scoped exactly to the selected paragraph — BUG-006 fix holds on web; block-quote path present
- Scan & Repair: healthy-document scan = correct no-op (5 linked / 0 rebuild / 0 adopt / 0 unparseable, "Repair 0 items", preview-before-apply honoured)
- Selection handler: clicking a citation opens Edit view (by design; note it also fires when the caret is merely adjacent to a marker)
- Baseline `[^n]` markers in Lane Filterings: pre-existing drafting artifacts, not Obiter output
- Baseline `Road Rules 2014 2014 (NSW)`: stale stored data from the v1.10.x identify flow (title contains year + separate year field); current engine renders fresh inserts correctly — consider a formatter guard (advisory)

## Not covered (needs a follow-up pass)

Never-Obiter adopt/verbatim Scan & Repair path, Edit round-trips (§6), multi-standard switch
(§12), Manual Citations Mode (§13), Settings/LLM/corpus (§15), lookup adapters (§16), command
palette/shortcuts (§17), keyboard/screen-reader pass (§18), Word-online co-authoring races
(§19.1–19.3), BibTeX/Word import (§7.4–7.5). Recommend rerunning after WEB-001..004 fixes since
most depend on insert producing sound structure.

## Recommendation

Desktop 1.14.1 is unaffected by the P0s (Phase 1 evidence) — AppSource desktop release can
proceed. The web channel has four release blockers rooted in the Word-online Office.js path;
fix WEB-001 first (WEB-003 and possibly WEB-002 may collapse into it), then rerun this pass
(harness + snippets preserved in the session scratchpad).

## Update — 2026-07-08 (v1.14.2)

All four P0s and WEB-005..010 fixed in v1.14.2 and re-verified live on Word online through
the same harness (see `../footnote-backlog.md` for per-story root causes). Key engineering
notes for the web host, established empirically:

- Font assignments on `insertText` result ranges silently no-op on web.
- `insertHtml` fragments: `<i>/<b>/<sup>` + bare text nodes import exactly; styled
  "normal" spans poison the fragment; cross-call fragments get smart-paste join spaces.
- `insertHtml(Replace)` invalidates the target paragraph proxy (anchor before writing).
- `insertOoxml` throws unsupportedSelection inside footnotes on web.
- Writing into a same-batch content-control proxy lands content outside it; sync first.

Remaining open from the Phase 2 findings: BUG-005(c) insert-warning for incomplete
citations; legacy footnotes created by 1.14.0/1.14.1 web sessions keep the broken sibling
structure until repaired (Scan & Repair enhancement candidate); WEB-011 heading-prefix
verify; the not-covered list from the original pass still stands for a follow-up run.
