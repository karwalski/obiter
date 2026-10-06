# Obiter: Word capability and compatibility matrix

- **Story:** COURT-104 (backlog OBI-401). Companion to the runtime capability layer in `src/word/apiCompat.ts` (COURT-103).
- **Sources:** Microsoft Learn Word requirement-set tables, retrieved 6 October 2026 (evidence register MS-1 to MS-5; full method and per-API tables in `docs/research/court-interop/R08-word-api-capability-matrix.md`). Obiter test evidence: `docs/web-test-results-1.14.md`.
- **Last reviewed:** 6 October 2026, against Obiter 1.17.7.

## How to read this

Every cell has one of three statuses. They mean different things, and Obiter keeps them apart.

| Status | Meaning |
|---|---|
| `documented` | Microsoft's requirement-set tables say the API is available on this client. Obiter has **not** tested it there. A documented cell is not a promise that the feature works. |
| `tested <client build> <date>` | Obiter ran the feature on this client and recorded the build and date in the device test log below. |
| `unsupported` | Microsoft documents the API as unavailable on this client, or Obiter does not offer the feature there. |

Some rows add `not used`: the API is available but Obiter does not use it yet. They are listed so planning work can see what each client allows.

Obiter does **not** claim that every Word client behaves the same. Requirement-set membership is what Microsoft documents; for example, Word on the web reports WordApi 1.5, yet Microsoft says fields there are "mainly read-only" (MS-4). Obiter checks such behaviour at run time rather than inferring it from the requirement set.

## Clients and minimum builds

Obiter's manifest minimum is **WordApi 1.5**. Builds below come from MS-1 (R08 §2).

| Client | WordApi 1.5 from | Highest WordApi | WordApiDesktop | Notes |
|---|---|---|---|---|
| Windows, Microsoft 365 | 2302 | 1.9 (2411) | 1.1–1.5 (2408–2603) | |
| Windows, Office LTSC 2024 | Office 2024 | 1.8 | 1.1 only | No WordApi 1.9, no Desktop 1.2+ |
| Mac | 16.70 | 1.9 (16.91) | 1.1–1.5 (16.88–16.108) | |
| Word on the web | yes | 1.9 | none | Desktop sets are preview-only on the web |
| iPad | 16.70 | 1.9 (16.91) | 1.1–1.2 only | No Desktop 1.3+ |

## Feature matrix

Columns: **Win M365**, **Win LTSC 2024**, **Mac**, **Web**, **iPad**. "Set" is the requirement set the feature needs.

### Features Obiter ships

| Feature | Set | Win M365 | Win LTSC 2024 | Mac | Web | iPad |
|---|---|---|---|---|---|---|
| Task pane loads (baseline check) | WordApi 1.5 | documented | documented | documented | tested (Obiter 1.14.2; build not recorded) 2026-07-08 | documented |
| Insert a citation footnote (`insertFootnote`) | WordApi 1.5 | documented | documented | documented | tested (Obiter 1.14.2; build not recorded) 2026-07-08 | documented |
| Nested citation content controls | WordApi 1.1 / 1.5 | documented | documented | documented | tested (Obiter 1.14.2; build not recorded) 2026-07-08 | documented |
| Citation store in custom XML parts | WordApi 1.4 | documented | documented | documented | tested (Obiter 1.14.1; build not recorded) 2026-07-07 | documented |
| Refresh All (ibid and subsequent references) | WordApi 1.1–1.5 | documented | documented | documented | tested (Obiter 1.14.2; build not recorded) 2026-07-08 | documented |
| Insert bibliography | WordApi 1.1 | documented | documented | documented | tested (Obiter 1.14.2; build not recorded) 2026-07-08 | documented |
| Document custom properties (`Obiter.Version`, `Obiter.CitationStyle`) | WordApi 1.3 | documented | documented | documented | documented | documented |
| Create missing AGLC4 named styles (`addStyle`) | WordApi 1.5 | documented | documented | documented | documented | documented |
| Restyle built-in Heading 1–5 (explicit Set Up Document action only) | WordApi 1.5 (`getStyles`) | documented | documented | documented | documented | documented |
| Heading levels I–V (style plus direct formatting) | WordApi 1.1 / 1.3 | documented | documented | documented | tested (Obiter 1.14.1; build not recorded) 2026-07-07, Level I only | documented |
| Set small capitals through the API (`Font.smallCaps`) | WordApiDesktop 1.3 | documented | unsupported | documented | unsupported | unsupported |
| Click a citation to edit (selection events) | Common DocumentEvents | documented | documented | documented | tested (Obiter 1.14.1; build not recorded) 2026-07-07 | documented |
| Read fields and bookmarks inside managed footnotes and notes (COURT-109) | WordApi 1.4 | documented | documented | documented | documented | documented |
| Read Track Changes mode before automatic refresh, and before Refresh All, insert/edit and Settings refreshes (COURT-108) | WordApi 1.4 | documented | documented | documented | documented | documented |
| Find managed controls in pending revisions (`getByChangeTrackingStates`, COURT-108) | WordApi 1.5 | documented | documented | documented | documented | documented |
| Count pending revisions in managed footnotes, read-only (`getTrackedChanges`, COURT-108) | WordApi 1.6 | documented | documented | documented | documented | documented |
| Scan and Repair | WordApi 1.1–1.5 | documented | documented | documented | tested (Obiter 1.14.1; build not recorded) 2026-07-07, healthy document only | documented |

Small capitals: this row is about setting the attribute through the API, which Microsoft documents only in WordApiDesktop 1.3 (R08 §3.7). Obiter still sets it on every client; Word on the web ignores it rather than throwing (web passes in the device test log). How each client displays small capitals stored in a document is a separate question and has not been tested; see the Word for the web note on the website's documentation page.

### APIs available for planned work (not used yet)

| Capability | Set | Win M365 | Win LTSC 2024 | Mac | Web | iPad |
|---|---|---|---|---|---|---|
| Write or update fields (`insertField`, `updateResult`) | WordApi 1.5 plus `fieldsWritable` probe | documented, not used | documented, not used | documented, not used | unsupported (MS-4) | unsupported (MS-4) |
| Bookmarks: insert or resolve | WordApi 1.4 | documented, not used | documented, not used | documented, not used | documented, not used | documented, not used |
| Comments | WordApi 1.4 | documented, not used | documented, not used | documented, not used | documented, not used | documented, not used |
| Accept or reject tracked changes | WordApi 1.6 | not used by design (COURT-108) | not used by design (COURT-108) | not used by design (COURT-108) | not used by design (COURT-108) | not used by design (COURT-108) |
| Paragraph events with local or remote source | WordApi 1.6 | documented, not used | documented, not used | documented, not used | documented, not used | documented, not used |
| List templates linked to styles (inspect) | WordApiDesktop 1.1 | documented, not used | documented, not used | documented, not used | unsupported | documented, not used |
| Native table of authorities | WordApiDesktop 1.4 | documented, not used | unsupported | documented, not used | unsupported | unsupported |
| Hidden-document copy | WordApiHiddenDocument | documented, not used | documented, not used | documented, not used | unsupported | unsupported |
| Whole-document copy (`getFileAsync`, compressed) | Common File | documented, not used | documented, not used | documented, not used | documented, not used | documented, not used |
| PDF export from the add-in | Preview only | unsupported | unsupported | unsupported | unsupported | unsupported |
| Save-as or copy of the current file | none | unsupported | unsupported | unsupported | unsupported | unsupported |

## Runtime checks

`src/word/apiCompat.ts` holds the minimum version for each feature (`FEATURE_FLAGS`). Guards in `src/word/` call `isFeatureAvailable()` rather than hard-coding a version. The layer also:

- probes WordApi 1.1–1.9, WordApiDesktop 1.1–1.5 and WordApiHiddenDocument 1.3–1.5;
- records `Office.context.diagnostics` platform and build;
- keeps `fieldsWritable` as a separate behaviour flag: true only on Windows or Mac **and** after a guarded probe succeeds. It is never inferred from `isSetSupported`.

### Track Changes, fields and bookmarks (COURT-108, COURT-109, COURT-121)

- **Track Changes.** Office.js writes are recorded as revisions whenever Track Changes is on; an add-in cannot write around it. Before each automatic refresh Obiter reads `Document.changeTrackingMode`. While it is `TrackAll` or `TrackMineOnly`, automatic refresh pauses and the pane shows "Track Changes is on: refresh will be recorded as revisions" with **Refresh now** (one refresh, recorded as revisions) and **Keep paused** (the banner stays hidden until Track Changes is turned off). Refresh All, the refresh that follows inserting or editing a citation, and a refresh a Settings change starts ask first (owner follow-up, 7 Oct 2026): an in-pane prompt explains that the refresh will appear as tracked revisions and offers **Refresh anyway (as tracked changes)** or **Skip for now**. The prompt is part of the pane, never `window.confirm` or `alert`, which block Office add-ins. The read costs one sync. A ribbon command with no pane open, and a host that cannot report the mode, refresh as before. A managed footnote whose controls sit inside a pending tracked insertion or deletion is never rebuilt: refresh skips it and Recovery lists it. On WordApi 1.6 the banner shows the number of pending revisions in managed footnotes. Obiter never accepts or rejects a revision. Below WordApi 1.4 the mode cannot be read and refresh behaves as before.
- **Fields, bookmarks and other controls.** Obiter creates no fields and no bookmarks. Before rebuilding a footnote, refresh reads the fields and bookmarks inside its managed control (in the same batch as the text it already reads) and checks the controls nested in it. Any field, any bookmark other than Word's own `_GoBack` and `_Hlk…` markers, or any nested control that is not Obiter's makes the footnote "user-edited": it is skipped and listed in Recovery with the reason, and "Use Obiter's version" is not offered. Obiter never updates, deletes or rewrites a field, and never edits docVars, custom XML parts outside its own namespaces, or controls it did not tag. If a host rejects the field or bookmark reads, refresh falls back to its earlier behaviour.
- **Scan and Repair.** The scan lists fields (by type: ADDIN, CITATION, TA, TOA, REF, NOTEREF and others) and bookmarks as "Preserved"; notes that hold them are not offered for adoption. Before a managed adoption replaces a footnote's text, the original text is saved to the footnote history in the backup part; if that save fails the adoption is not made. **Recovery > Footnote history** can restore the original. Candidate text is normalised before parsing (non-breaking and other special spaces, zero-width characters, optional hyphens, Word's note and field marks), quotations are offered but not pre-selected, and Repair asks for a count confirmation of the selected items.

To include the snapshot in an issue report, open **Settings > About > Show Word API capabilities** and copy the text. With debug logging on, the snapshot is also written to the debug log when the task pane opens.

## Device test log

Add one row per run. A `tested` cell in the matrix must point to a row here. Use the synthetic fixtures from COURT-105 once they exist; until then, name the document used.

| Date | Obiter version | Client | Client build (`Office.context.diagnostics.version`) | Capability snapshot attached | Fixture | Features exercised | Result | Tester |
|---|---|---|---|---|---|---|---|---|
| 2026-07-07 | 1.14.1 | Word on the web (M365 tenant, Playwright) | not recorded | no | `Obiter-Web-Test-A.docx` and copies (see `docs/web-test-results-1.14.md`) | Store, insert, styling Level I, Scan and Repair, selection edit | Four P0 failures (WEB-001 to WEB-004), fixed in 1.14.2 | automated pass |
| 2026-07-08 | 1.14.2 | Word on the web (M365 tenant, Playwright) | not recorded | no | same | Re-run of WEB-001 to WEB-010 | Passed | automated pass |
| | | Windows M365 | | | | | | |
| | | Windows LTSC 2024 | | | | | | |
| | | Mac | | | | | | |
| | | iPad | | | | | | |

The two web rows predate the capability snapshot and did not record the client build. They count as evidence for Obiter 1.14.x only; re-test on the current release before relying on them.

## Gaps

- No Windows, LTSC, Mac or iPad run has been logged with a client build. Every desktop and iPad cell is `documented` until one is.
- The heading change made by COURT-101 (no restyling on open) has not been checked on a real court template on any client.
- Field writes on Mac, content controls inside footnotes on iPad, and `getFileAsync` slice limits on large documents are untested (R08 §7).
