# R01: Court mode and citation storage audit (OBI-R01)

- **Commit audited:** `69b9c40ec3a7e0b963dece8f8c5db981029e4097` (v1.17.7, "chore: release v1.17.7", 27 Sep 2026)
- **Audit date:** 6 October 2026
- **Method:** static reading of source and tests at the pinned commit. Nothing was run in Word. Any behaviour inferred from code, rather than seen in a document, is labelled as interpretation and given a confidence rating.
- **Scope:** court presets and toggles, writing mode, subsequent references, pinpoints, parallel citations, List of Authorities (LOA), practice-direction reminders, storage, refresh, commentary, Scan & Repair, export and finalisation, tracked changes, behaviour without the add-in, styles, and manifest requirement sets.

## 1. Platform baseline

| Item | Observation | Evidence |
|---|---|---|
| Manifest requirement | `WordApi` MinVersion 1.5. The same requirement appears in `manifest.prod.xml` | `manifest.xml:18-22` |
| Permissions | `ReadWriteDocument` | `manifest.xml:26` |
| Runtime gate | The task pane refuses to load below WordApi 1.5 | `src/taskpane/taskpane.ts:88-95` |
| Optional features | `apiCompat.ts` lists flags for 1.6 to 1.8 (styles, comments, tracked changes). The `trackedChanges` flag has no consumer outside `apiCompat.ts` (found by grep) | `src/word/apiCompat.ts:33-74` |
| 1.6-gated writes | Custom styles (`addStyle`) and the `Obiter.*` custom properties written by `writeObiterProperties` | `src/word/styles.ts:138`, `src/word/documentProperties.ts:30-33` |
| Platform docs | Microsoft Learn lists `Document.changeTrackingMode` and `customXmlParts` as WordApi 1.4 and `properties` as WordApi 1.3 (https://learn.microsoft.com/en-us/javascript/api/word/word.document, retrieved 6 Oct 2026). The extract gave `getStyles()` as WordApiDesktop 1.4. Confidence in that last point is low; recheck it in R8 | external |
| Tested clients | `docs/compatibility.md` is a checklist with no ticked items. `docs/web-test-results-1.14.md` records one automated Word for the web pass on v1.14.1 (7 Jul 2026). No matrix for desktop Windows or Mac at this commit | `docs/compatibility.md`, `docs/web-test-results-1.14.md:1` |

## 2. Architecture map

### 2.1 Court presets and toggles

- `CourtPreset` is typed data with six toggles plus `parallelOrder`, keyed by 20 jurisdiction ids grouped under federal, state and tribunal headings (`src/engine/court/presets.ts:150-173`, `185-455`). Sources and sign-off dates are recorded only as **code comments** (`presets.ts:14-36` and the per-preset comments).
- Every preset sets `ibidSuppression: "on"` (`presets.ts:194-452`).
- `buildDocumentConfig` and `buildCourtConfig` merge the document's toggles into the standard's config. Court mode is limited to AGLC standards and is ignored, with a diagnostic, under OSCOLA or NZLSG (`src/engine/standards/index.ts:114-145`, `174-201`).
- The `authorisedReportHierarchy` comes from the **live preset** whenever the stored toggles carry none. Settings never stores it (`index.ts:191-197`; `Settings.tsx:921-930` omits it). Result: a code release that changes a preset's hierarchy changes what existing documents get.
- In Settings, toggles show as plain selects. Nothing marks a value as inherited from the preset or as an override (`src/ui/views/Settings.tsx:1323-1416`). The hierarchy field is a disabled text box (`Settings.tsx:1366-1377`).
- `handleToggleOverride` persists the change but does **not** call `triggerRefresh`, while the jurisdiction and mode handlers do (`Settings.tsx:944-962` compared with `867`, `937`). Interpretation: existing footnotes do not re-render until the next refresh. Confidence: medium (the code path is clear, but no live run was done).
- **Writing mode** is `academic` or `court` (`src/engine/standards/types.ts:19`). Switching to academic clears the jurisdiction and toggles (`Settings.tsx:840-872`). Court mode **without a jurisdiction** keeps ibid, because the base config has `ibidSuppressionMode: "off"` (`src/engine/standards/profiles.ts:37`; the test is `tests/word/modeSwitchRefresh.test.ts:214-229`). Short forms still drop `(n X)` (see 2.2). The Settings help text nonetheless says "Court mode: no ibid …" (`Settings.tsx:1291`).
- `reportHierarchy.ts` (`getPreferredReportOrder`, `suggestPreferredReport`) and `getReportSeriesPreference` (`src/engine/rules/v4/domestic/cases.ts:250`) are covered by tests but have **no runtime caller in `src/`** (grep). The hierarchy is neither applied to rendering nor checked by validation.
- `deadlines.ts` (`calculateDeadlines`) and the AI-use reminder data (`practiceDirections.ts:306-660`) are used only in tests. No UI consumer was found (grep).
- Practice-direction reminders shown in the UI:
  - NSW and Qld selectivity reminders, and the Vic AGLC adoption note, on Insert (`src/ui/views/InsertCitation.tsx:1844-1866`)
  - Practice-direction links in Abbreviation Lookup (`src/ui/views/AbbreviationLookup.tsx:585`)
  - Validation issues labelled with the practice-direction source (`src/engine/validator.ts:371-375`)

### 2.2 Subsequent references, pinpoints and parallels (court mode)

| Behaviour | Observation | Evidence |
|---|---|---|
| Ibid | Turned off when `ibidSuppressionMode === "on"`. An explicit "ibid" preference falls back to a short form | `src/engine/resolver.ts:1237-1258` |
| `(n X)` | Dropped **whenever** `writingMode === "court"`, whatever the toggle says. The toggle is labelled "Ibid / (n X) suppression" | `resolver.ts:495-497`, `835-873`; `Settings.tsx:1394-1404` |
| Court short form | Short title (italic), or the author's surname for secondary sources, then the pinpoint | `resolver.ts:835-873` |
| Within-footnote `at` | Rule 1.4.6 path is unchanged in court mode | `resolver.ts:1277-1280` |
| Pinpoint styles | `page-only`, `para-only`, `para-and-page`. **`para-only` drops the starting page**, giving `… CLR [45]`; the test expects exactly that | `cases.ts:372-420`; `tests/engine/court-mode.test.ts:436,485-486` |
| Parallels | In court mode the MNC is added automatically when a reported case has no explicit parallels. WA puts the MNC first | `src/engine/engine.ts:499-525` |
| Parallel validation | The academic r 2.2.7 prohibition is skipped in court mode. Enforcement follows `parallelCitationMode` | `validator.ts:304-313` |
| Unreported gate, Qld treatment | Validation warnings only | `validator.ts:324-335` |
| Pinpoint types | 23 locator types, plus `subPinpoint` | `src/types/citation.ts:18-44` |
| Judicial officers | Rendered after the pinpoint | `engine.ts:483-490` |

Interpretation: the `para-only` result (`175 CLR [45]`) has not been checked against NSW SC Gen 20 or Qld PD 1 of 2024. Route it to R2 before any profile claims it. Confidence that it reflects court practice: low.

### 2.3 Citation storage

- **Custom XML part**, namespace `urn:obiter:aglc`, schema v2 (`src/store/xmlSerializer.ts:26-34`). The root attributes hold standard, writing mode, `courtJurisdiction`, `courtToggles` (JSON stored as an opaque bag), `nzlsgStyle`, `genaiWording` and `ccModel` (`xmlSerializer.ts:146-190`). There is no profile version or provenance.
- **Citation record:** `id` (UUID), `sourceType`, a loose `data` record, `commentaryBefore`/`commentaryAfter`, `signal`, `linkingPhrase`, `loaPart` (`"A"|"B"`), `isKeyAuthority` and `overrideText` (`src/types/citation.ts:239-314`). `SourceData = Record<string, unknown>` (`citation.ts:235`).
- **Duplicate parts** (copy, paste, save-as) are merged on initialisation. Unreadable parts are quarantined rather than deleted (`src/store/citationStore.ts:107-230`).
- **Document settings:** `obiter-writingMode`, `obiter-autoRefresh` and others are written through `Office.context.document.settings` (`Settings.tsx:130-136`). This means a second store location, held in the add-in's web-extension part.
- **Device-only state:** Manual Citations Mode gates every refresh from a **device** preference (`src/word/citationRefresher.ts:360`).
- **Content controls:** each footnote has a parent `RichText` control (tag `obiter-fn`, title `Obiter Footnote`, `Obiter Footnote [r:<hash>]` or `Obiter Footnote (locked)`, appearance Hidden) wrapping child controls tagged with the **citation UUID** and titled `Citation:<pref>[:<pinpoint>]` (`src/word/footnoteManager.ts:47-63`, `85-120`, `336-356`, `665-685`). Separators and the closing full stop are plain text inside the parent (`footnoteManager.ts:7-31`).
- **Identity:** the citation id is stable. Occurrences share the tag, so there is **no per-occurrence id**. The occurrence pinpoint and preference live in the child control's title.
- **Custom document properties written on every task-pane open:**
  - `setDocumentMetadata` writes `Obiter.Version`, `Obiter.CitationStyle` (always `"AGLC4"`), `Obiter.Author` (a hard-coded personal name), `Obiter.ManagedDocument="true"`, `Obiter.CreatedDate` (overwritten each time) and `Obiter.Website`. It runs unconditionally, whether or not the document has Obiter citations (`src/word/documentMeta.ts:21-37`; called at `src/taskpane/taskpane.ts:116`).
  - `writeObiterProperties` also writes `Obiter.Version`, `Obiter.Standard` and `Obiter.Mode` (`documentProperties.ts:22-46`; `taskpane.ts:166-180`).

### 2.4 Refresh: what gets rewritten

- Every refresh scans all footnotes, resolves full, short or ibid forms by position, and classifies each footnote as `unchanged`, `rebuild` or `user-edited`. A footnote is `user-edited` when its text matches neither the expected render nor the stored hash (`citationRefresher.ts:602-614`, `745-772`).
- `user-edited` footnotes are **skipped and reported**, never overwritten. Locked footnotes are skipped too (`citationRefresher.ts:740-760`).
- When a footnote is rebuilt, the **whole parent control's content** is regenerated:
  1. old child controls are deleted;
  2. the parent is written with `insertText`/`insertHtml(…, "Replace")`, then chained "After" inserts;
  3. each citation range is re-wrapped in a new child control (`citationRefresher.ts:871-904`, `1128-1179`).
- The rewrite is **footnote-granular, not citation-granular**. Text typed outside the parent control (it sits after the reference mark, at the end of paragraph 1) is outside the managed range. Text typed inside it makes the footnote `user-edited`, which stops all future refreshes of that footnote.
- Before any rebuild, the previous texts are snapshotted into a backup part. If the snapshot fails, the rebuild is aborted (`citationRefresher.ts:778-797`; `src/word/footnoteBackup.ts:1-40`). The Recovery panel can restore a footnote (which leaves it locked) or accept Obiter's version.
- Formatting is written as inline HTML (`i`, `b`, `sup`, small-caps span, optional font and size) with no paragraph style (`src/word/formattedRunsHtml.ts`). No footnote paragraph style is assigned on insert or refresh (grep of `footnoteManager.ts` and `citationRefresher.ts`).

### 2.5 Commentary

- `commentaryBefore` and `commentaryAfter` are **plain-text fields on the citation record**, not on the occurrence (`citation.ts:264-270`). They are applied to full **and** subsequent forms (`engine.ts:5315-5345`, `5511`).
  - Interpretation: if the same library citation is cited in two footnotes, its commentary appears in both. Confidence: medium. A fixture test is needed to confirm whether Insert creates a new record per use.
- Commentary loses italics and links because it is plain text. A free-text `explanatory_note` source type exists for prose notes and is rendered as a pseudo-citation inside a child control (`citation.ts:225`; `citationRefresher.ts:1027`).

### 2.6 Scan & Repair (adoption)

- The plan builder is pure logic (`src/word/scanRepair.ts:6-27`).
  - Pass A rebuilds lost store entries from orphaned controls.
  - Pass B treats **each whole plain-text note as one candidate**. If the deterministic parser handles it, the note is adopted as managed (selected by default); otherwise it becomes a verbatim override (offered but not selected) (`scanRepair.ts:416-466`).
- There is no splitting of several authorities or commentary inside one note, and no numeric confidence score.
- Managed adoption **deletes the original note text** and re-inserts the normalised text as plain text inside new controls. No backup snapshot is taken first (`src/word/documentScanner.ts:296-322`; grep finds no snapshot or backup call). Original italics are lost until the refresher re-renders. Reversal relies on Word's Undo.
- Word bibliography sources can be imported separately (`src/word/sourceImporter.ts:92-240`).

### 2.7 List of Authorities

- The court LOA variants are `simple`, `part-ab`, `part-abc` (Vic CA), `two-part-read` (SA, FCFCOA) and `three-part-tas` (`src/engine/rules/v4/general/bibliography.ts:1730-1830`, `2255-2290`).
- Entries **strip pinpoints** (`bibliography.ts:404-412`).
- Placement depends on `loaPart` and `isKeyAuthority`. These are serialised (`xmlSerializer.ts:117-118`, `338-339`), but **no UI sets them** (grep of `src/ui` and `src/actions`). In practice every authority falls into Part B or Part 2, and the generator warns that Part A is empty (`bibliography.ts:1540-1549`). `src/ui/data/courtReferenceGuide.ts:161` nonetheless advertises a key-authority marker.
- The LOA is inserted as **static paragraphs** with direct formatting. Entries are forced to the `Normal` style (`src/ui/views/Bibliography.tsx:62-140`, line 107). It uses no TOA, TA, bookmark or REF/NOTEREF fields (grep finds no field or bookmark API use anywhere in `src/`).
- Possible preset and guide mismatch: the HCA preset uses `part-ab` (`presets.ts:195`), while the court reference guide describes the HCA Joint Book of Authorities in five parts, A to E (`courtReferenceGuide.ts:65`). Route to R2. Confidence: medium.

### 2.8 Styles and template side effects

- **On every task-pane open in Word** (unless the `obiter-autoSetup` localStorage key is `"false"`, which has no UI), `applyAglc4Styles` runs:
  - It creates the `AGLC4 *` styles.
  - It **modifies the built-in Heading 1 to 5 styles**: size 12, colour black, alignment, indent and spacing (`taskpane.ts:39-61`, `101`; `styles.ts:134-286`).
  - It is gated to WordApi 1.6 and above (`styles.ts:138`).
- Interpretation: on current clients, simply opening Obiter in a court template can restyle that template's headings. This is the highest-risk finding for OBI-201. Confidence: high for the code path; medium for the visible effect, which depends on whether the template's headings use the built-in names.
- There is no style-mapping feature. `AGLC4 Footnote Text` is created but never assigned automatically. Insertion leaves the document's own footnote style alone.

### 2.9 Export, finalisation, tracked changes and absence of the add-in

| Topic | Observation | Evidence |
|---|---|---|
| Clean copy / finalise | **Absent.** No feature removes controls, the custom XML part or `Obiter.*` properties. `prepareAsTemplate` only adds a notice | grep (`finali`, `clean`, `unlink`, `convertToText`); `src/word/templateExporter.ts:31-88` |
| PDF | An LOA `pdfExportNote` tells the user to use Word's Save As PDF | `bibliography.ts:2199-2205` |
| Tracked changes | No detection or handling. Interpretation: with Track Changes on, each rebuild will probably record a deletion and an insertion of the whole managed footnote, and `parentCC.text` behaviour with pending deletions is unknown. Confidence: low; needs a fixture | grep for `changeTrackingMode`, `trackedChanges` (no consumers) |
| Without add-in | Citations are ordinary footnote text inside Hidden-appearance controls, so they read as normal text. Interpretation: edits by a user without Obiter are detected on the next Obiter refresh as `user-edited` and skipped. Confidence: medium | `footnoteManager.ts:7-31`; `citationRefresher.ts:602-614` |
| Read-only documents | Degrades rather than failing | `src/word/documentAccess.ts:36-45` |
| Co-authoring | Untested; checklist item unticked | `docs/compatibility.md` "Custom XML Parts survive co-authoring sessions" |
| Endnotes | Not managed by the refresher. Scan & Repair wraps them as flat controls only | `scanRepair.ts:444-446` |
| Body-text citations | Not supported. Citation insertion always targets footnotes | `InsertCitation.tsx:935`, `CitationLibrary.tsx:626`, `Quote.tsx:426` |

## 3. Gap table

Status key: S = supported, P = partial, A = absent, U = unknown.

| Story | Status | Summary and evidence |
|---|---|---|
| **101** Profiles separate from templates | P | Jurisdiction presets are data (`presets.ts:150-455`) and toggles are stored per document (`xmlSerializer.ts:165-171`). **Missing:** division, document type, profile version and provenance in data (sources are code comments only); inherited and overridden values look the same (`Settings.tsx:1323-1416`); the hierarchy comes from the live preset (`index.ts:191-197`); court mode without a jurisdiction is an undeclared hybrid (ibid kept, `(n X)` dropped). Styles are a separate module but are auto-applied on open (`taskpane.ts:52-58`) |
| **102** Footnote and subsequent-reference engine | P | **Have:** stable citation UUIDs (`footnoteManager.ts:240`); occurrence pinpoint in the control title (`:336-356`); several citations per footnote; full recompute on refresh; ibid toggle (`resolver.ts:1237`). **Gaps:** no occurrence id; commentary sits on the record, not the occurrence (`citation.ts:264-270`, `engine.ts:5511`); `(n X)` cannot be toggled separately (`resolver.ts:495`); no flags for ambiguous dependencies |
| **103** Authority and pinpoint conventions | P | **Have:** MNC, report and parallels are distinct (`citation.ts:47-53`, `engine.ts:499-525`); 23 pinpoint types; judicial officers; WA MNC-first order. **Gaps:** report hierarchy not applied (no caller of `getReportSeriesPreference`); `para-only` drops the starting page, unverified (`cases.ts:375-392`); no provenance on party abbreviation or preferred-report rules; nothing on legislation versions |
| **104** Verified profiles released incrementally | P | `lastVerified` dates exist on practice-direction links (`practiceDirections.ts:18-27`), and preset comments record the CRIT-004 sign-off. **Absent:** draft or verified labels in the UI; per-profile evidence page; split between official rule, observed convention and preference; a documented review process in product data |
| **201** Preserve styles and numbering | P (risk) | Insert and refresh assign no paragraph style (good). **However:** built-in Heading 1 to 5 are modified on every pane open (`styles.ts:268-285`); the LOA forces `Normal` and direct formatting (`Bibliography.tsx:96-107`); no style mapping; the effect of `insertHtml` on footnote runs is unverified (U) |
| **202** Commentary and mixed footnotes | P | Child control per citation; `explanatory_note`; footnote-level edit detection and Recovery (`citationRefresher.ts:602-614`, `footnoteBackup.ts`); lock. **Gaps:** the whole footnote is regenerated when any citation changes (`citationRefresher.ts:1128-1179`); commentary is plain text only; no per-citation edit detection; no "convert to unmanaged text" |
| **203** Adopt existing citations with review | P | Preview, per-item selection and verbatim items not selected by default (`scanRepair.ts:416-466`). **Gaps:** one candidate per whole note; no confidence score; the original text is deleted with no snapshot (`documentScanner.ts:312`); no batch limits; quotations are not excluded |
| **204** Cross-references and authority lists | A/P | LOA variants exist (`bibliography.ts:1730-2290`) but produce static text with no pinpoints, and Part A cannot be set from the UI. No bookmarks, REF/NOTEREF or TOA fields (grep). `(n X)` and above/below are rendered text recomputed on refresh |
| **205** Collaboration and handover | P | Readable plain content; duplicate-part merge (`citationStore.ts:107-230`); stale-edit protection; backups. **Gaps:** no tracked-changes handling (U); co-authoring untested (U); Manual mode is per device (`citationRefresher.ts:360`); no detection of duplicate occurrences or orphans outside Scan & Repair |
| **206** Finalisation and clean handover | A | No finalise or clean-copy path. On every open, `Obiter.*` properties are written, including a personal name and `ManagedDocument=true` (`documentMeta.ts:29-34`). No pre-export validation gate |
| **301** Reasons, orders, submissions | A | Only `academic` and `court` writing modes exist (`types.ts:19`). The court UI is labelled "Court Submission" (`Settings.tsx:1286`) |
| **302** Transcript-derived reasons | A | Nothing found |
| **303** Transcript and evidentiary pinpoints | P | `case.transcript` follows AGLC4 r 2.7, with page/line and speaker pinpoints (`cases-supplementary.ts:435-448`). No exhibit, court-book, timestamp, volume or transcript-version locators |
| **401** Compatibility matrix | P | WordApi 1.5 manifest; runtime gates (`apiCompat.ts`); unticked checklist; one web result set (v1.14.1, 7 Jul 2026). No published matrix; no record of desktop Windows or Mac versions tested |
| **402** Regression fixtures | P | Unit tests for court mode (`tests/engine/court-*.test.ts`), refresh, lock, mode switch and Scan & Repair (`tests/word/*`). **Absent:** OOXML or `.docx` fixtures (`tests/fixtures` holds only `interchange`, `pdf`, `standards`), third-party field fixtures, tracked-revision fixtures and golden examples per profile |

## 4. Low-risk enhancements supported by existing code

1. **Refresh after a toggle change:** call `triggerRefresh()` in `handleToggleOverride` (`Settings.tsx:944-962`).
2. **Make `(n X)` honour its toggle:** either gate `resolver.ts:495` on a separate `crossReferenceSuppression` toggle, or relabel the setting "Ibid suppression" and document that court short forms never carry `(n X)`.
3. **Court mode without a jurisdiction:** correct the help text (`Settings.tsx:1291`), or show a "Select a court to apply court rules" state.
4. **Part A and key-authority controls:** add them to Edit Citation and the Library. The model, serialiser and generator already support both (`xmlSerializer.ts:117-118`, `bibliography.ts:1522-1550`). Also fixes the empty-Part-A warning and the guide's unsupported claim (`courtReferenceGuide.ts:161`).
5. **Stop restyling built-in headings on open:** run `applyAglc4Styles` only from the explicit Template or Styling actions, or behind a visible setting that defaults off for documents that already have content (`taskpane.ts:52-58`). This is the main P0 safeguard for OBI-201.
6. **Correct the startup metadata:** remove the personal-name property, write the real standard, set `CreatedDate` only once, and write only when the document has an Obiter store with citations (`documentMeta.ts:29-34`, `taskpane.ts:116`).
7. **LOA styling:** stop forcing `Normal` (`Bibliography.tsx:107`). Inherit the paragraph style at the cursor, or offer a style picker.
8. **Snapshot before Scan & Repair:** reuse `addFootnoteGeneration` and `snapshotFootnotesBeforeRebuild` before managed adoption deletes text (`documentScanner.ts:312`), so the Recovery panel can restore the original.
9. **Tracked-changes warning:** read `document.changeTrackingMode` (WordApi 1.4, within the 1.5 baseline, per Microsoft Learn retrieved 6 Oct 2026). Warn or pause automatic refresh when tracking is on.
10. **Report hierarchy:** either wire the existing `suggestPreferredReport` into court validation as an info or warning issue, or remove the disabled hierarchy field so the UI does not imply that it is enforced.
11. **Profile provenance:** promote the preset comments into a typed `{ sources[], lastVerified, status: "draft" | "reviewed" }` field (data already exists in `practiceDirections.ts`). Show it next to the jurisdiction select with an "experimental" label.
12. **Freeze the profile in the document:** persist the full resolved toggle set, including hierarchy and a preset version, at selection time, so later preset edits need an explicit migration. This follows the `courtToggles` opaque-bag pattern (`xmlSerializer.ts:165-171`).
13. **"Convert to plain text" action (first step towards OBI-206):** remove `obiter-fn` and child controls while keeping their text, and optionally remove the custom XML part and `Obiter.*` properties. The user would run it on a copy saved with Save As. Platform behaviour (web versus desktop) needs R8 checks before it ships.

## 5. Migration and licensing notes

- **Migration:** documents store `courtJurisdiction` plus a toggle bag. Adding profile ids or versions needs a schema v3 step through `src/store/migrations.ts` (version guard at `xmlSerializer.ts:394-406`). Legacy documents that have a jurisdiction but no toggles currently follow live presets; any migration has to freeze their current effective values first.
- **Licensing:** no new dependency is proposed. All of the enhancements above use existing GPLv3 code and Office.js.

## 6. Open items for other tracks

- **R2:** verify the `para-only` rendering, the HCA LOA structure (part-ab or five-part Joint Book of Authorities), and whether LOA entries need pinpoints for Tas Part 1 and the WA "pages/paras to be read" requirement.
- **R8:** check tracked-changes, co-authoring and `insertHtml` styling behaviour on Windows, Mac and web; confirm the `getStyles` requirement set.
- **R3, R4:** Obiter's own markers (namespace `urn:obiter:aglc`, control tag `obiter-fn`, `Obiter.*` custom properties) are a documented signature for the false-positive catalogue.
