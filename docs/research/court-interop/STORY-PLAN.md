# Court interoperability: refined story plan

- **Version:** 1.0, 6 October 2026. Obiter commit `69b9c40` (v1.17.7). Research only; no source changed.
- **Inputs:** backlog `../obiter_court_interoperability_backlog.md (outside the repo)`; reports R01, R02, R03 (federal, state), R07, R08 in this folder; `EVIDENCE-REGISTER.md` (cited as `O-…` observation IDs and source IDs such as `VIC-1`).
- **Story IDs:** `COURT-101` onwards. `COURT-001`–`COURT-012` already exist in code comments from the earlier court-mode epic, so this plan starts at 101 to avoid collisions.

## 1. Status rules used

A story is **implement-now** only if all four hold: (a) supported by register evidence; (b) feasible on WordApi 1.5 with runtime checks; (c) low risk to existing AGLC4 documents; (d) engine, UI, docs or test work with no vendor access. Otherwise:

- **ready-for-refinement:** evidence supports the problem, but design, a dependency decision or a migration still needs work.
- **research-gated:** a rule, sample or practitioner input is missing.
- **placeholder:** integration not evidenced (backlog decision rule 6 applies: preserve, do not integrate).
- **closed-by-research:** the research answered or ruled out the item.

Court profiles stay labelled **experimental** throughout. No profile meets backlog decision rule 1 (rule plus representative current examples of the same document type), because submissions were sampled only for NSWCA (9 PDFs). Instrument-backed corrections remove contradictions; they do not make a profile "verified".

## 2. Summary and order

Ordered by priority, then dependency. "Deps" lists stories that must land first.

| # | ID | Title | Backlog | Pri | Status | Effort | Deps |
|---|---|---|---|---|---|---|---|
| 1 | COURT-101 | Stop restyling built-in headings when the pane opens | 201, P04 | P0 | implement-now | S | – |
| 2 | COURT-102 | Correct Obiter's startup document metadata | 206, 205 | P0 | implement-now | S | – |
| 3 | COURT-103 | Fix the API capability layer and add runtime probes | 401 | P0 | implement-now | S | – |
| 4 | COURT-104 | Publish the capability and compatibility matrix | 401 | P0 | implement-now | S | 103 |
| 5 | COURT-105 | Synthetic OOXML regression fixtures and golden examples | 402, 201, 202 | P0 | implement-now | M | – |
| 6 | COURT-106 | Freeze the court profile in the document, with provenance | 101, 104 | P0 | implement-now | M | – |
| 7 | COURT-107 | Court toggle semantics: refresh, ibid vs (n X), no-court state | 101, 102 | P0 | implement-now | S | 106 |
| 8 | COURT-108 | Respect Track Changes during managed writes | 205 | P0 | implement-now | M | 103 |
| 9 | COURT-109 | Detect and preserve foreign fields, bookmarks and template parts | 201, 204, P01, P04 | P0 | implement-now | M | 105 |
| 10 | COURT-124 | Commentary and signal per occurrence | 202, 102 | P0 | ready-for-refinement | M | 105 |
| 11 | COURT-125 | Citation-granular refresh | 202 | P0 | ready-for-refinement | L | 105, 109 |
| 12 | COURT-110 | Pinpoint correctness: never drop the starting page; page + paragraph | 103 | P1 | implement-now | S | 105 |
| 13 | COURT-111 | Rule-backed court preset corrections | 103, 104 | P1 | implement-now | M | 106, 110 |
| 14 | COURT-112 | Pinpoint connector option ("at") | 103 | P1 | implement-now | S | 106 |
| 15 | COURT-113 | Subsequent-reference modes per profile; ibid labelled as preference | 102, 104 | P1 | implement-now | M | 106, 107 |
| 16 | COURT-114 | Practice-direction register repair and link checker | 104 | P1 | implement-now | S | – |
| 17 | COURT-115 | Show profile provenance and experimental labels | 104, 101 | P1 | implement-now | M | 106, 114 |
| 18 | COURT-116 | List of Authorities: Part A / key-authority controls; inherit styles | 204, 201 | P1 | implement-now | S | – |
| 19 | COURT-117 | Instrument-backed List of Authorities layouts | 204, 301 | P1 | implement-now | L | 116, 118 |
| 20 | COURT-118 | Legislation version ("as at") field | 103 | P1 | implement-now | M | – |
| 21 | COURT-119 | Missing and mislabelled courts; Tas treatment; WASCSR | 103, 104 | P1 | implement-now | M | 106, 111 |
| 22 | COURT-120 | AGLC4 r 2.7 / 2.8 transcript and submission defects | 303 | P1 | implement-now | S | – |
| 23 | COURT-121 | Scan & Repair safety: snapshot, run and NBSP normalisation | 203 | P1 | implement-now | S | – |
| 24 | COURT-122 | Pre-finalisation check and Obiter metadata review | 206 | P1 | implement-now | M | 102 |
| 25 | COURT-123 | Separate clean copy via getFileAsync + OOXML transform | 206, P03 | P1 | ready-for-refinement | L | 122, 105 |
| 26 | COURT-126 | Document-type axis (submissions, reasons, orders, case notes) | 301, 101 | P1 | ready-for-refinement | L | 106 |
| 27 | COURT-127 | Judgment-drafting options from observed conventions | 102, 103, 301 | P1 | ready-for-refinement | M | 126, 112, 113 |
| 28 | COURT-129 | Record-locator model (transcript, books, exhibits, MFI) | 303, 302 | P1 | ready-for-refinement | L | 120, 106 |
| 29 | COURT-131 | Template style inventory and mapping preview | 201 | P1 | ready-for-refinement | M | 101, 103 |
| 30 | COURT-132 | Collaboration signals: CC events, duplicates, orphans, co-authoring | 205 | P1 | ready-for-refinement | M | 103, 108 |
| 31 | COURT-133 | Complete the corpus (gaps, orders, submissions, gold set) | R02, R03 | P1 | research-gated | M | – |
| 32 | COURT-134 | Practitioner validation and pilots | R04, 403 | P1 | research-gated | M | 133 |
| 33 | COURT-135 | Transcript-derived reasons with provenance | 302 | P1 | research-gated | M | 129, 134 |
| 34 | COURT-128 | In-text (body) citation mode | 103, 301 | P2 | ready-for-refinement | L | 126, 125 |
| 35 | COURT-130 | Paragraph cross-references (bookmarks; REF fields on desktop) | 204 | P2 | ready-for-refinement | M | 103, 109 |
| 36 | COURT-136 | SA Form 91 hyperlinks and NT r 82.10 list format | 204 | P2 | research-gated | S | 117 |
| 37 | COURT-137 | Coexistence with citation managers (import/export) | P01 | P2 | placeholder | – | 109 |
| 38 | COURT-138 | Transcript platform locator import | P02 | P2 | placeholder | – | 129 |
| 39 | COURT-139 | Case-management and filing compatibility | P03 | P2 | placeholder | – | 123 |
| 40 | COURT-140 | Institutional templates and macros | P04 | P2 | placeholder | – | 101, 109 |
| 41 | COURT-141 | Audit current court mode and storage | R01 | P0 | closed-by-research | XS | – |
| 42 | COURT-142 | Identify courts' citation tooling from published DOCX | R03, P01 | P1 | closed-by-research | XS | – |
| 43 | COURT-143 | Native TOA/REF fields as the default authority list | 204 | P2 | closed-by-research | XS | – |
| 44 | COURT-144 | PDF export from the add-in | 206 | P2 | closed-by-research | XS | – |

### Delivery waves

1. **Release A (patch-sized safety, P0):** COURT-101, 102, 103, 107, 120. No schema change. Under the versioning policy these are fixes, but 101 changes visible behaviour, so call it out in release notes.
2. **Release B (foundations):** COURT-104, 105, 106, 108, 109, 114. Schema v3 migration (106).
3. **Release C (court correctness):** COURT-110, 111, 112, 113, 115, 116, 118, 119, 121, 122, then 117.
4. **Refinement track:** COURT-124, 125, 126, 123, 129, 131, 132, then 127, 128, 130.
5. **Research track (parallel):** COURT-133, 134, 135, 136.

## 3. Stories

### COURT-101 Stop restyling built-in headings when the pane opens (P0, implement-now, S)

- **Backlog:** OBI-201, OBI-P04. **Evidence:** O-K1 (`src/taskpane/taskpane.ts:39-61,101`; `src/word/styles.ts:138,268-285`); court templates use their own style systems (O-F2, O-F6; FCA-5 style names).
- **Acceptance criteria**
  - Opening the task pane never modifies any existing style (built-in or custom). Verified by a unit test that mocks `getStyles()` and asserts no property writes on open.
  - AGLC4 heading formatting runs only from an explicit action (Template or Styling view), shows which styles will change, and can be cancelled.
  - On a new blank document, creating *new* `AGLC4 *` styles may remain automatic (create-only, never modify) behind a visible Settings switch; default off in court mode.
  - The hidden `obiter-autoSetup` localStorage key is replaced by the visible setting (migrate its value).
  - Release notes say headings are no longer changed on open.
- **Code paths:** `src/taskpane/taskpane.ts`, `src/word/styles.ts`, `src/ui/views/Settings.tsx`, template/styling view.
- **Risk:** academic users who relied on automatic heading styles lose them silently; mitigate with a one-time notice and the explicit action.

### COURT-102 Correct Obiter's startup document metadata (P0, implement-now, S)

- **Backlog:** OBI-206, OBI-205. **Evidence:** O-K2 (`src/word/documentMeta.ts:21-37`; `taskpane.ts:116`; `src/word/template.ts:39`); O-K11 (`src/word/documentProperties.ts:29-33`).
- **Acceptance criteria**
  - Remove `Obiter.Author` (a hard-coded personal name) from every write path; existing values are left alone until COURT-122 offers removal.
  - `Obiter.CitationStyle` writes the document's actual standard id; `Obiter.CreatedDate` is written once and never overwritten.
  - Properties are written only when the document has an Obiter store containing at least one citation; opening the pane on an unrelated court document writes nothing.
  - Lower the custom-properties guard from WordApi 1.6 to 1.3 (or route through COURT-103).
  - Tests cover: blank document (no writes), document with citations (writes), second open (CreatedDate unchanged).
- **Code paths:** `src/word/documentMeta.ts`, `src/word/documentProperties.ts`, `src/taskpane/taskpane.ts`, `src/word/template.ts`.
- **Risk:** low. Tools that read `Obiter.ManagedDocument` on non-citation documents would no longer see it (none known).

### COURT-103 Fix the API capability layer and add runtime probes (P0, implement-now, S)

- **Backlog:** OBI-401. **Evidence:** O-K11, O-P1–O-P6; MS-1, MS-2, MS-4.
- **Acceptance criteria**
  - `FEATURE_FLAGS` corrected: addStyle 1.5, comments 1.4, changeTrackingMode 1.4, trackedChanges 1.6, customProperties 1.3, bookmarks 1.4, fields-read 1.4.
  - Probes for WordApi 1.1–1.9, WordApiDesktop 1.1–1.5 and WordApiHiddenDocument; records `Office.context.diagnostics` platform and version.
  - A separate behaviour flag `fieldsWritable` = platform is Windows or Mac **and** a guarded probe succeeds; never inferred from `isSetSupported` alone (web reports 1.5).
  - Ad-hoc guards (`styles.ts:138`, `documentProperties.ts:29-33`, `headingTracker.ts:83`) route through the layer.
  - Diagnostics view (or debug log) prints the capability snapshot for issue reports.
- **Code paths:** `src/word/apiCompat.ts`, `src/word/styles.ts`, `src/word/documentProperties.ts`, `src/word/headingTracker.ts`.
- **Risk:** low; lowering the style guard to 1.5 means 1.5-only hosts start creating AGLC4 styles, but only via the explicit action after COURT-101.

### COURT-104 Publish the capability and compatibility matrix (P0, implement-now, S)

- **Backlog:** OBI-401. **Evidence:** R08 §2–5; O-P1–O-P6; `docs/compatibility.md` checklist unticked; one web pass on v1.14.1 (`docs/web-test-results-1.14.md`).
- **Acceptance criteria**
  - `docs/compatibility-matrix.md` lists each Obiter feature × Windows M365, Windows LTSC 2024, Mac, web, iPad, with the requirement set and status `documented` / `tested <build> <date>` / `unsupported`.
  - Clearly separates "documented by Microsoft" from "tested"; untested cells say so.
  - Includes a device test log template (client build, date, document fixture from COURT-105, result).
  - Website/help page links to it; no claim that all Word variants are equivalent.
- **Code paths:** `docs/compatibility-matrix.md` (new), `docs/compatibility.md`, website help page.
- **Risk:** none to documents.

### COURT-105 Synthetic OOXML regression fixtures and golden examples (P0, implement-now, M)

- **Backlog:** OBI-402, 201, 202. **Evidence:** O-K15; corpus features O-C3, O-C6, O-C7, O-F2, O-F6; official examples in FCA-1 cl 2.5, VIC-1 cl 5.5, WA-1 PD 8.2.2, TAS-1 cl 3(a).
- **Acceptance criteria**
  - A script generates **synthetic** `.docx` fixtures (no court bytes): style-linked paragraph numbering (`ParaNumbering`-like), `Orders`/`quotation2`-like styles, `REF _Ref \r \h` fields and `_Ref` bookmarks inside footnotes, a TOC field, docVars, a data-bound CC with a vendor-like custom XML namespace (synthetic name), an `ADDIN` field, a tracked insertion and deletion, a comment, mixed prose/multi-citation footnotes, NBSPs and split italic runs.
  - A Node test parses fixtures (package-level, no Word) and asserts a semantic inventory; a helper compares before/after inventories ignoring rsids and timestamps.
  - Golden citation strings, each with its register ID: `D'Arcy … [2014] FCAFC 115; (2014) 224 FCR 479` (FCA-1), `(2023) 72 VR 394, 410 [60]` (VIC-1), `Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15] (Smith J)` (WA-1), `Jackson v Building Appeal Board [2010] TASSC 29; (2010) 20 Tas R 1` (TAS-1).
  - The R03 inspector (standard library only) is committed under `scripts/research/` with `--no-text` as default; real corpus files stay out of the repo.
- **Code paths:** `tests/fixtures/ooxml/` (new), `tests/word/`, `scripts/research/`.
- **Risk:** none to documents. A ZIP reader is needed for tests only (dev dependency or Node's zlib with a minimal ZIP parser).

### COURT-106 Freeze the court profile in the document, with provenance (P0, implement-now, M)

- **Backlog:** OBI-101, OBI-104. **Evidence:** O-K7 (`src/engine/standards/index.ts:191-197` reads the live preset); R01 §5 migration notes (`src/store/xmlSerializer.ts:165-171,394-406`; `src/store/migrations.ts`).
- **Acceptance criteria**
  - Schema v3 stores, at selection time: preset id, preset version, the full resolved toggle set (including report hierarchy and parallel order), and which values the user overrode.
  - Migration from v2: documents with a jurisdiction but no stored toggles get their *current effective* values frozen (no output change on upgrade); a test proves identical rendering before and after migration for every preset.
  - Preset data gains typed provenance per field: `{ sourceIds[], clause?, kind: "official" | "observed" | "preference" | "unsourced", checked }`, moved out of code comments.
  - When a newer preset version exists, Settings offers "Update to current court rules" with a diff; nothing changes without consent.
  - Unknown future fields round-trip unchanged (opaque bag rule).
- **Code paths:** `src/engine/court/presets.ts`, `src/engine/standards/index.ts`, `src/store/xmlSerializer.ts`, `src/store/migrations.ts`, `src/ui/views/Settings.tsx`.
- **Risk:** medium (schema migration); mitigated by the frozen-values test and quarantine of unreadable parts (`src/store/citationStore.ts:107-230`).

### COURT-107 Court toggle semantics: refresh, ibid vs (n X), no-court state (P0, implement-now, S)

- **Backlog:** OBI-101, OBI-102. **Evidence:** O-K5, O-K6 (`src/engine/resolver.ts:494-497`; `src/ui/views/Settings.tsx:944-962,1291`).
- **Acceptance criteria**
  - `handleToggleOverride` triggers a refresh and shows the reformat notice, like the jurisdiction handler.
  - Toggle relabelled "Ibid suppression"; a separate stored toggle `crossReferenceSuppression` controls `(n X)` (default on for existing court documents, so output is unchanged).
  - Court mode with no jurisdiction shows "Select a court to apply court rules"; help text matches actual behaviour.
  - Tests: toggle change re-renders an existing footnote; `(n X)` returns when the new toggle is off.
- **Code paths:** `src/ui/views/Settings.tsx`, `src/engine/resolver.ts`, `src/engine/court/presets.ts`, `tests/word/modeSwitchRefresh.test.ts`.
- **Risk:** low.

### COURT-108 Respect Track Changes during managed writes (P0, implement-now, M)

- **Backlog:** OBI-205. **Evidence:** O-K12; O-P1 (`changeTrackingMode`, `getReviewedText` 1.4; `getByChangeTrackingStates` 1.5); R01 §2.9 (rebuild with tracking on likely records whole-footnote delete/insert).
- **Acceptance criteria**
  - Before any automatic refresh, read `document.changeTrackingMode`; when tracking is on, pause automatic refresh and show "Track Changes is on: refresh will be recorded as revisions" with Refresh now / Keep paused.
  - Managed controls inside pending tracked insertions or deletions (`getByChangeTrackingStates`) are skipped and listed, never rebuilt.
  - On WordApi 1.6+, the panel can show the count of pending revisions in managed footnotes (read-only); no accept/reject by Obiter.
  - Fixture test with COURT-105 tracked-revision fixture; device check recorded in COURT-104.
- **Code paths:** `src/word/citationRefresher.ts`, `src/word/changeListener.ts`, `src/word/apiCompat.ts`, refresh UI.
- **Risk:** low; adds a pause, never a destructive action.

### COURT-109 Detect and preserve foreign fields, bookmarks and template parts (P0, implement-now, M)

- **Backlog:** OBI-201, OBI-204, OBI-P01, OBI-P04. **Evidence:** O-C3 (REF fields inside HCA footnotes), O-C7, O-F2 (docVars, DOCPROPERTY, bound CC, vendor custom XML), O-F4; O-P1 (field reading 1.4, bookmarks 1.4). Decision rule 6.
- **Acceptance criteria**
  - Before rebuilding a managed footnote, read fields and bookmarks in the parent control's range; if any exist that Obiter did not create, classify the footnote as user-edited (skip and report) rather than rebuild.
  - Obiter never calls `updateResult`, `delete` or code writes on fields it does not own; never edits docVars, non-Obiter custom XML parts or content controls without an `obiter` tag.
  - Scan & Repair lists foreign fields by type (ADDIN, CITATION, TA, TOA, REF, NOTEREF) as "preserved" and excludes their ranges from adoption.
  - Tests with COURT-105 fixtures prove byte-level inventory is unchanged outside managed ranges after insert + refresh.
- **Code paths:** `src/word/citationRefresher.ts`, `src/word/footnoteManager.ts`, `src/word/scanRepair.ts`, `src/word/documentScanner.ts`.
- **Risk:** low; may skip more footnotes than today, which is safe.

### COURT-110 Pinpoint correctness: never drop the starting page; page + paragraph (P1, implement-now, S)

- **Backlog:** OBI-103. **Evidence:** O-K8 (`src/engine/rules/v4/domestic/cases.ts:375-412`; `tests/engine/court-mode.test.ts:436,485-486`); AGLC4 r 2.2.4–2.2.5 (derived reference §2.2.5, PDF p 77: a page must always appear in report pinpoints); VIC-1 cl 5.5 example `394, 410 [60]`. No instrument supports a report citation without its starting page (NSW-1 and QLD-1 make MNC paragraphs "sufficient", which is about MNCs).
- **Acceptance criteria**
  - `para-only` keeps the starting page for report citations; paragraph-only pinpoints apply to MNC citations.
  - `para-and-page` accepts a pinpoint page plus paragraph from the UI (one input: page and paragraph) and renders `«start», «page» [para]`.
  - Validator warns (court mode, AGLC-based profile) when a report citation has a paragraph pinpoint but no pinpoint page.
  - Tests updated: the `CLR [45]` expectation is replaced; golden VIC-1 example passes.
- **Code paths:** `src/engine/rules/v4/domestic/cases.ts`, `src/engine/validator.ts`, pinpoint input in `src/ui/views/InsertCitation.tsx`, `tests/engine/court-mode.test.ts`.
- **Risk:** changes output for existing NSW/Qld court documents (intended fix); release note required. Exact separator for NSW/Qld report + paragraph is open question Q4.

### COURT-111 Rule-backed court preset corrections (P1, implement-now, M)

- **Backlog:** OBI-103, OBI-104. **Evidence:** O-R1–O-R11, O-R18 and R02 §5 rows 1, 2, 4, 6, 7, 11, 13, 18, 21, 23, 24.
- **Acceptance criteria** (each change carries provenance per COURT-106):
  - FCA: `parallelOrder: "mnc-first"` (FCA-1 cl 2.5); LOA no longer `part-ab` (temporarily `simple` until COURT-117 adds the eBook layout).
  - TASSC: `parallelOrder: "mnc-first"` (TAS-1 cl 3(a)).
  - VSC, VSCA, FCFCOA, ACTSC, NTSC: `parallelCitations: "off"` (report replaces MNC; MNC only for unreported) (VIC-1, VIC-2, FCF-1, ACT-1, NT-1).
  - SASC: `parallelCitations: "mandatory"` for post-1997 reported cases (SA-1).
  - QLD_DISTRICT_MAG: `preferred` (QLD-3).
  - FCFCOA hierarchy drops `FamCAFC`; `reportHierarchy.ts` reference to revoked PD 1/2019 replaced with HCA-1.
  - HCA `parallelCitations` flagged `unsourced` (value unchanged pending Q3).
  - Report hierarchy: either wire `suggestPreferredReport` into court validation as an info issue, or remove the disabled field (pick one in refinement; both are evidence-neutral).
  - Existing documents keep frozen values (COURT-106) and are offered the update.
  - `court-practice-matrix.test.ts` updated; each assertion cites its register ID.
- **Code paths:** `src/engine/court/presets.ts`, `src/engine/court/reportHierarchy.ts`, `src/ui/data/courtReferenceGuide.ts`, `src/engine/validator.ts`, tests.
- **Risk:** medium for court-mode users; nil for academic AGLC4 documents.

### COURT-112 Pinpoint connector option ("at") (P1, implement-now, S)

- **Backlog:** OBI-103. **Evidence:** FCA-1 cl 2.6 ("at [29]", "at 481"); TAS-1 ("at [15]"); observed in ~99% of state judgments (O-C5, DR2).
- **Acceptance criteria**
  - Toggle `pinpointConnector: "aglc" | "at"`; `aglc` is the default and unchanged.
  - Presets set `at` only where an instrument shows it (FCA, TASSC); provenance recorded.
  - Applies to full and short forms; ibid behaviour unchanged.
  - Tests with FCA and Tas golden strings.
- **Code paths:** `src/engine/rules/v4/domestic/cases.ts`, `src/engine/resolver.ts`, `src/engine/court/presets.ts`, Settings toggles.
- **Risk:** low.

### COURT-113 Subsequent-reference modes per profile; ibid labelled as preference (P1, implement-now, M)

- **Backlog:** OBI-102, OBI-104. **Evidence:** O-R9 (WA-1 PD 2.1 cl 14: later references by case name only); O-R14 (no instrument mentions ibid); `src/engine/resolver.ts:835-873`.
- **Acceptance criteria**
  - Toggle `subsequentForm: "aglc" | "short-title" | "case-name"`; current court behaviour = `short-title`.
  - WASC preset uses `case-name` (official); others keep `short-title`.
  - Ibid suppression provenance set to `preference` everywhere; Settings and `courtReferenceGuide.ts` stop saying courts forbid ibid and instead say "not specified by the court; Obiter default".
  - Tests per mode, including a duplicate-case-name disambiguation case (PD 2.1 cl 14 exception).
- **Code paths:** `src/engine/resolver.ts`, `src/engine/court/presets.ts`, `src/ui/data/courtReferenceGuide.ts`, `src/ui/views/Settings.tsx`.
- **Risk:** low.

### COURT-114 Practice-direction register repair and link checker (P1, implement-now, S)

- **Backlog:** OBI-104. **Evidence:** O-R17 (R02 §5 link table; synthesis re-check: HCA registry 404, Tas 404).
- **Acceptance criteria**
  - Every URL in `practiceDirections.ts` replaced per R02 §5 or marked "not located"; titles corrected (GPN-AUTH, NT PD 2/2007); versions updated (WA CPD 23 Sep 2026; WA AI PD 9.21); keys unified with preset ids (`QLD_DISTRICT_MAG`, `NSW_DISTRICT_LOCAL`).
  - `lastVerified` only set for links actually re-checked.
  - `npm run check-court-links` reports status codes and optional version-string matches; runs in CI as a warning (sites behind Cloudflare return 403, so it must not fail the build on 403).
- **Code paths:** `src/engine/court/practiceDirections.ts`, `src/ui/data/courtReferenceGuide.ts`, `scripts/`, `tests/engine/court-integration.test.ts:321`.
- **Risk:** none.

### COURT-115 Show profile provenance and experimental labels (P1, implement-now, M)

- **Backlog:** OBI-104, OBI-101. **Evidence:** R01 gap 104; COURT-106 provenance data.
- **Acceptance criteria**
  - Settings shows each toggle as inherited or overridden, with its kind (official / observed / preference / unsourced) and source link.
  - Every court shows an "Experimental: checked against <instrument> on <date>; not endorsed by the court" label.
  - `docs/court-profiles.md` is generated from preset data (no hand-maintained copy) and lists coverage, known exceptions and review date.
  - Review process documented: quarterly re-check, and on any instrument change detected by COURT-114.
- **Code paths:** `src/ui/views/Settings.tsx`, `src/engine/court/presets.ts`, `scripts/`, `docs/court-profiles.md` (new).
- **Risk:** none.

### COURT-116 List of Authorities: Part A / key-authority controls; inherit styles (P1, implement-now, S)

- **Backlog:** OBI-204, OBI-201. **Evidence:** O-K9 (`src/store/xmlSerializer.ts:117-118`; `bibliography.ts:1540-1549`; `Bibliography.tsx:107`), O-K16 (`quotationInserter.ts:105`); Part A/B still applies to QCA (QLD-2), VSCA Parts A–C (VIC-2).
- **Acceptance criteria**
  - Edit Citation and the Library expose `loaPart` and `isKeyAuthority` when the active profile's LOA uses parts; the empty-Part-A warning disappears once set.
  - LOA entries and inserted quotations take the paragraph style at the insertion point (or a user-chosen style), not forced `Normal`.
  - Tests for Part A placement and style inheritance.
- **Code paths:** `src/ui/views/EditCitation.tsx`, `src/ui/views/CitationLibrary.tsx`, `src/ui/views/Bibliography.tsx`, `src/word/quotationInserter.ts`.
- **Risk:** low.

### COURT-117 Instrument-backed List of Authorities layouts (P1, implement-now, L)

- **Backlog:** OBI-204, OBI-301. **Evidence:** O-R1, O-R3, O-R12, O-R13; WA-1 PD 2.1 cl 11–13.
- **Acceptance criteria**
  - New `loaType` values, each with a fixture and register ID: `hca-jba-five-part` (Parts A–E, legislation-version column; HCA-1); `nswca-four-category` (legislation with version date; cases read with CLR/NSWLR cap warnings; cited not read; secondary; NSW-2 cl 37); `vsca-abc` with "None" under empty parts (VIC-2 cl 14.2); `fca-ebook-sections` (authorities / legislation / bills, alphabetical; FCA-2 cl 7.2); `nswcca-single` (NSW-3, after an eye check of the OCR text); `wa-outline-asterisk` (asterisk for cases to be read, pages/paragraphs to be read, "no cases will be read" statement).
  - HCA, NSWCA, FCA, NSWCCA (COURT-119) and WA presets switch to these layouts via the COURT-106 update flow.
  - LOA remains static text on all platforms (fields are not cross-platform: O-P2, O-P3).
  - VSCA amended-list redline output is out of scope (refinement note).
- **Code paths:** `src/engine/rules/v4/general/bibliography.ts`, `src/engine/court/presets.ts`, `src/ui/views/Bibliography.tsx`.
- **Risk:** low (new layouts; existing ones untouched).

### COURT-118 Legislation version ("as at") field (P1, implement-now, M)

- **Backlog:** OBI-103. **Evidence:** O-R15 (HCA-2 Form 27A annexure; NSW-2 cl 37(1); FCA-1 cl 2.3; FCA-2 cl 7.4).
- **Acceptance criteria**
  - Optional legislation fields: version date ("as at"), version kind (as enacted / compilation / point in time), and reason note.
  - Emitted only in court LOA layouts that require it (COURT-117); never in AGLC4 footnote output (AGLC4 does not use it).
  - Round-trips through the XML store (use `toText()` for numeric-looking values).
- **Code paths:** `src/types/citation.ts`, legislation form in `src/ui/views/InsertCitation.tsx`, `src/store/xmlSerializer.ts`, `bibliography.ts`.
- **Risk:** low.

### COURT-119 Missing and mislabelled courts; Tas treatment; WASCSR (P1, implement-now, M)

- **Backlog:** OBI-103, OBI-104. **Evidence:** O-R7, O-R8, O-R12, O-R18, O-R19; R02 §6.
- **Acceptance criteria**
  - New presets: `NSWCCA` (single oral list; Caselaw MNC not a reported judgment), `SA_DISTRICT_MAG_CIVIL` (UCR applies).
  - `NSW_DISTRICT_LOCAL` and the District part of `QLD_DISTRICT_MAG` labelled "no instrument found; AGLC4 fallback" (provenance `unsourced`).
  - "Doubted or not followed" prompt extended to TASSC (TAS-1 cl 3(f)); Qld options narrowed to the PD wording.
  - Recognise `[yyyy] WASCSR n` as a WA sentencing-remarks MNC.
- **Code paths:** `src/engine/court/presets.ts`, `src/engine/court/practiceDirections.ts`, case parsing and validator.
- **Risk:** low.

### COURT-120 AGLC4 r 2.7 / 2.8 transcript and submission defects (P1, implement-now, S)

- **Backlog:** OBI-303. **Evidence:** O-K14 (`src/engine/rules/v4/domestic/cases-supplementary.ts:569-571`; `src/engine/engine.ts:889-894`); AGLC4 r 2.7.1, 2.7.2, 2.8 (derived reference).
- **Acceptance criteria**
  - r 2.8 omits title and proceeding number when absent (no `‘’` or `, ,`).
  - Validator error for "(during argument)" in an r 2.7 speaker.
  - Missing HCATrans number is a validation error, never `HCATrans 0`.
  - Transcript form supports multiple pinpoint + speaker rows (r 2.7.2), using the existing array model.
  - Add a test for `normalisePinpoint` with a numeric `value` (XML round-trip hazard); fix if it drops the pinpoint.
- **Code paths:** `cases-supplementary.ts`, `engine.ts`, `src/engine/validator.ts`, `src/ui/views/InsertCitation.tsx` (transcript form), `tests/engine/chapter2.test.ts`.
- **Risk:** low; AGLC4 output gets more correct.

### COURT-121 Scan & Repair safety: snapshot, run and NBSP normalisation (P1, implement-now, S)

- **Backlog:** OBI-203. **Evidence:** O-K10 (`src/word/documentScanner.ts:296-322`); O-C9.
- **Acceptance criteria**
  - Managed adoption snapshots original notes (reuse `footnoteBackup` / `snapshotFootnotesBeforeRebuild`); abort if the snapshot fails; Recovery can restore the original.
  - Matching normalises NBSP and joins split runs before parsing; quotations and prose-only notes are not pre-selected.
  - Batch adoption limited to selected items with a count confirmation.
- **Code paths:** `src/word/documentScanner.ts`, `src/word/scanRepair.ts`, `src/word/footnoteBackup.ts`.
- **Risk:** low.

### COURT-122 Pre-finalisation check and Obiter metadata review (P1, implement-now, M)

- **Backlog:** OBI-206. **Evidence:** O-K2, O-F9; O-P1 (comments 1.4, tracked-change state 1.5/1.6).
- **Acceptance criteria**
  - A "Prepare for handover" panel lists: validation issues; user-edited and locked footnotes; Obiter custom properties (with remove buttons, including any legacy `Obiter.Author`); presence of the Obiter custom XML part and managed controls; counts of comments and pending revisions (read-only).
  - Removing properties is explicit per item; no tracked changes, comments or author metadata are removed silently.
  - Text states output is "compatibility-checked, not guaranteed accepted for filing".
- **Code paths:** new view under `src/ui/views/`, `src/word/documentMeta.ts`, `src/word/documentProperties.ts`, `src/engine/validator.ts`.
- **Risk:** low (read-mostly; property removal is user-confirmed).

### COURT-123 Separate clean copy via getFileAsync + OOXML transform (P1, ready-for-refinement, L)

- **Backlog:** OBI-206, OBI-P03. **Evidence:** O-P1, O-P5 (MS-5: `getFileAsync(Compressed)` all platforms; no save-as; PDF preview-only); no ZIP library in `package.json:47-54`.
- **Why not now:** needs a ZIP dependency (licence check; e.g. a permissive library compatible with GPLv3) and device tests of slice limits on large judgments.
- **Acceptance criteria (for refinement)**
  - Copy built from `getFileAsync` bytes; original never modified.
  - Choices: remove Obiter custom XML part; remove `Obiter.*` properties; unwrap `obiter`-tagged controls keeping text and formatting; keep comments and revisions unless the user chooses otherwise.
  - Delivered as a download, or opened via `createDocument` (1.3).
  - Round-trip test with COURT-105 fixtures: text, footnotes, styles, numbering and foreign fields identical; Obiter markers absent.
- **Code paths:** new `src/word/finalise/`, `package.json`.
- **Risk:** low to originals; medium implementation risk.

### COURT-124 Commentary and signal per occurrence (P0, ready-for-refinement, M)

- **Backlog:** OBI-202, OBI-102. **Evidence:** O-K4 (record-level commentary; library re-cite reuses the record id).
- **Acceptance criteria (for refinement)**
  - Fixture test first proves (or disproves) repetition across two footnotes.
  - Commentary and signal stored per occurrence (CC title payload or an occurrence map keyed by CC id); record-level values migrate to the first occurrence only.
  - Commentary keeps italics and links (formatted runs), not plain text.
- **Code paths:** `src/types/citation.ts`, `src/engine/engine.ts`, `src/word/footnoteManager.ts`, `src/word/citationRefresher.ts`, `src/store/xmlSerializer.ts`.
- **Risk:** medium (data model and migration).

### COURT-125 Citation-granular refresh (P0, ready-for-refinement, L)

- **Backlog:** OBI-202. **Evidence:** O-K3 (whole parent rewritten); backlog AC "never regenerate an entire footnote to refresh one citation".
- **Acceptance criteria (for refinement)**
  - Only changed child controls are rewritten; separators and text outside children are untouched.
  - Text typed outside child controls (inside the parent) no longer marks the whole footnote user-edited.
  - O(1) Office.js syncs per refresh pass (perf rule); measured on a 700-footnote fixture.
- **Code paths:** `src/word/citationRefresher.ts`, `src/word/footnoteManager.ts`.
- **Risk:** high (core refresh path); needs design spike.

### COURT-126 Document-type axis (P1, ready-for-refinement, L)

- **Backlog:** OBI-301, OBI-101. **Evidence:** O-C1–O-C6 (judgments differ from submission instruments); FCA-5 and corpus (orders embedded, citation-free).
- **Acceptance criteria (for refinement)**
  - Profile key becomes court × document type (`submissions`, `reasons`, `orders`, `case-note`); stored per document (COURT-106).
  - `submissions` = instrument-backed presets; `reasons` = observed conventions only, opt-in, labelled; `orders` = citation insertion warns; `case-note` = AGLC4.
  - Writing-mode label "Court Submission" replaced accordingly.
- **Code paths:** `src/engine/standards/types.ts`, `src/engine/court/presets.ts`, `src/ui/views/Settings.tsx`.
- **Risk:** medium.

### COURT-127 Judgment-drafting options from observed conventions (P1, ready-for-refinement, M)

- **Backlog:** OBI-102, 103, 301. **Evidence:** DR2 only: O-C1 (FCA MNC-first, `at [n]`), O-C2 (HCA repeat-full short form, report-only), O-C4, O-C5 (ACT MNC-first without report year; short titles unquoted or double-quoted).
- **Acceptance criteria (for refinement)**
  - Available only under document type `reasons`; each option labelled "observed in <n> published judgments, <dates>; not a court rule".
  - Options: `subsequentForm: "repeat-full"`; parallel variant `mnc-first-no-year`; short-title quote style (single / double / none); judge attribution placement.
  - Never applied to submissions or case notes.
- **Code paths:** `src/engine/resolver.ts`, `src/engine/rules/v4/domestic/cases.ts`, `src/engine/court/presets.ts`.
- **Risk:** low once gated by document type.

### COURT-128 In-text (body) citation mode (P2, ready-for-refinement, L)

- **Backlog:** OBI-103, OBI-301. **Evidence:** O-C1 (FCA 0 footnotes), O-C6 (most state reasons cite in body); `src/ui/views/InsertCitation.tsx:935` (footnote-only).
- **Acceptance criteria (for refinement):** insert a managed citation as an inline CC in body text; subsequent-reference positions computed over body order; a "Cases cited" list generator. **Risk:** high (resolver assumes footnote positions).

### COURT-129 Record-locator model (P1, ready-for-refinement, L)

- **Backlog:** OBI-303, OBI-302. **Evidence:** O-R16, O-C8; R07 §5 sketch.
- **Acceptance criteria (for refinement)**
  - Document-level `RecordSource` and locators (transcript page.line with optional date/day/volume; book with part/volume/tab/page/margin letters/PDF page; exhibit/MFI with "formerly"; judgment-below paragraph), stored separately from citations, with `version` and the user's original text.
  - Renderers: NSWCA (NSW-2 cl 31, 33) and QCA appeal record book page (QLD-2 para 34) first; VSCA after re-reading the 2026 reissue (Q9); FCA after the APP 2 primary text is read (Q10).
  - Timestamps stored as provenance only, never rendered by default.
  - Structural validation only; Obiter never claims to verify evidence.
- **Code paths:** `src/types/`, `src/store/`, new `src/engine/record/`, insertion UI.
- **Risk:** medium.

### COURT-130 Paragraph cross-references (P2, ready-for-refinement, M)

- **Backlog:** OBI-204. **Evidence:** O-C3, O-C7; O-P1 (bookmarks 1.4 all platforms), O-P2 (REF field writes Windows/Mac only).
- **Acceptance criteria (for refinement):** bookmark a numbered paragraph and insert "[n] above" as a REF `\r \h` field where `fieldsWritable`, otherwise as text tracked by bookmark and refreshed by Obiter; never alter numbering definitions. **Risk:** medium (platform split).

### COURT-131 Template style inventory and mapping preview (P1, ready-for-refinement, M)

- **Backlog:** OBI-201. **Evidence:** O-F2, O-F6, FCA-5 style names; O-P1 (`getStyles`, `builtIn`, `inUse` 1.5).
- **Acceptance criteria (for refinement):** read-only style inventory; user maps Obiter outputs (LOA heading/entries, quotations, footnote text) to document styles; preview before applying; idempotent. **Risk:** low.

### COURT-132 Collaboration signals (P1, ready-for-refinement, M)

- **Backlog:** OBI-205. **Evidence:** O-K12 (no CC events); O-P1 (CC events 1.5); R01 (Manual mode per device at `src/word/citationRefresher.ts:360`; co-authoring untested).
- **Acceptance criteria (for refinement):** `onDeleted`/`onDataChanged` handlers for managed controls; duplicate-occurrence and orphan detection with a reversible repair preview; Manual Citations Mode stored per document; co-authoring test protocol in COURT-104. **Risk:** medium.

### COURT-133 Complete the corpus (P1, research-gated, M)

- **Backlog:** OBI-R02, OBI-R03. **Evidence:** register §3.5 gaps.
- **Gate / next steps:** user downloads 2–3 originals per court from AustLII (FCFCOA, VIC, SA, TAS), NT and WA (WA needs the user to accept eCourts terms); request QLD originals through authorised channels; collect separate orders and published submissions; extend to 24 months; build a reviewed gold set of about 200 footnotes. Re-run the inspector; append to the register.

### COURT-134 Practitioner validation and pilots (P1, research-gated, M)

- **Backlog:** OBI-R04, OBI-403. **Gate:** interview guide for associates, judgment editors, solicitors, barristers and transcript providers; sanitised fixtures through authorised channels; this plan does not authorise outreach. Questions include whether chambers use any citation tool (O-F4 is DR5) and whether HCA templates rely on DOTM macros (O-F3).

### COURT-135 Transcript-derived reasons with provenance (P1, research-gated, M)

- **Backlog:** OBI-302. **Evidence:** FCA-5 (historical) transcript layout; O-F7 (dictation marker). **Gate:** one lawful, current, sanitised transcript sample; synthetic fixture built to FCA-5 layout until then. Preserve DRAFT labels and paragraph structure; Obiter never transcribes or approves reasons.

### COURT-136 SA Form 91 hyperlinks and NT r 82.10 list format (P2, research-gated, S)

- **Backlog:** OBI-204. **Evidence:** O-R7 (SA r 217.8(4)–(10)); NT-2 (r 82.10 not read). **Gate:** read NT r 82.10; confirm publisher link forms for SA hyperlinks.

### COURT-137 to COURT-140 Placeholders (P2)

| ID | Backlog | Evidence | Keep as placeholder because | Promotion criteria |
|---|---|---|---|---|
| COURT-137 | OBI-P01 | O-F4: no citation-manager markers in 222 published DOCX (DR5) | No product identified; preservation already covered by COURT-109 | A sanitised fixture from a named tool, plus a documented field format |
| COURT-138 | OBI-P02 | O-V1–O-V5: export formats only; no AU API or licence | No lawful, documented locator feed | Vendor-documented export with page/line semantics and licence |
| COURT-139 | OBI-P03 | None gathered on JusticeLink, RedCrest, ECMS | Not researched; filing needs separate scope | Public filing format rules; round-trip tests via COURT-123 |
| COURT-140 | OBI-P04 | O-F2, O-F3: templates with docVars, bound CCs and DOTM attachment; macros cannot be read (O-P5) | Template contents need owner permission | Sanitised template fixture plus coexistence spec |

### COURT-141 to COURT-144 Closed by research

| ID | Backlog | Closure reason |
|---|---|---|
| COURT-141 | OBI-R01 | Done: R01 audit at commit `69b9c40` (gap table, storage map, migration notes). Remaining actions are COURT-101–125. |
| COURT-142 | OBI-R03 (tool attribution), OBI-P01 | Published DOCX cannot establish chambers tooling: NSW exports are platform-generated, ACT files are publication saves, HCA strips personal information, and no citation-tool marker survives (O-F4, O-F5, O-F6). Only workflow interviews (COURT-134) can answer it. |
| COURT-143 | OBI-204 | Native TOA object model is WordApiDesktop 1.4 (Windows/Mac only) and field writes are not supported on web (O-P2, O-P3). Text LOA stays the default; fields are a desktop option inside COURT-130. |
| COURT-144 | OBI-206 | `exportAsFixedFormat` is preview-only (MS-6). Users use Word's Save as PDF; Obiter must not claim PDF export. |

## 4. Corrections to the backlog's assumptions

1. **Repository unavailable** (backlog "Evidence and limitations"): now audited at `69b9c40`; court mode is a working AGLC-only layer with 20 presets, not "basic" (R01).
2. **OBI-201 is not just a refinement item:** Obiter itself modifies built-in Heading 1–5 whenever the pane opens (O-K1). This is a P0 defect.
3. **OBI-206 privacy:** every opened document receives `Obiter.*` properties including a hard-coded personal name (O-K2). This is P0, not P1.
4. **FCA Transcript Style Guide and Judgment Templates** is a 2019 procurement attachment naming abolished courts; historical design reference only (FCA-5).
5. **"Recent DOCX may reveal tooling":** largely not. NSW Caselaw DOCX are server-generated, ACT DOCX are fresh publication saves, HCA files strip personal information (O-F5, O-F6, O-F3).
6. **"A citation add-in used by a court":** no citation-tool marker in 222 published DOCX; the only third-party markers are a template-builder namespace (FCA) and Dragon dictation docVars (ACT). Tool use remains unknown (DR5).
7. **Court mode assumed footnote-centred:** FCA reasons have no footnotes; most NSW and all sampled ACT reasons cite in the body (O-C1, O-C6).
8. **Timestamps as transcript locators (OBI-303):** no sampled judgment or submission uses recording timestamps as citation locators; treat as provenance (O-C8).
9. **Ibid:** no instrument read mentions ibid; Obiter's "courts do not use ibid" is a preference, not a rule (O-R14).
10. **FCA Part A/B list** (Obiter preset and guide): removed from GPN-AUTH on 7 May 2025 (O-R1). **HCA Part A/B**: the HCA requires a five-part JBA (O-R3).
11. **Parallel citations:** VSC, VSCA, FCFCOA, ACT and NT do not require them (report replaces MNC); SA requires both (O-R5–O-R10).
12. **OBI-204 native TOA / REF fields:** not cross-platform (web read-mostly; TOA desktop-only) (O-P2, O-P3).
13. **OBI-206 "verify PDF appearance":** the add-in cannot export PDF (O-P5).
14. **OBI-401 platforms:** Windows LTSC 2024 and iPad must be in the matrix; `isSetSupported` does not prove behaviour (fields on web).
15. **OBI-R02 first-wave courts:** FCFCOA originals are unobtainable by automated retrieval; separate orders documents were not found for any court.
16. **Para-only pinpoints** (Obiter COURT-005): no source supports dropping the report's starting page (O-K8).

## 5. Open questions (proposed DECISION-043)

1. **Q1 Parallel order default** where the instrument is silent or only gives an example: court example (MNC-first: FCA, Tas, WA, AIJA) vs Obiter report-first vs user choice? NSW judgments are report-first (DR2).
2. **Q2 Ibid default in court mode:** keep suppression as a labelled Obiter preference, or default to AGLC4 ibid unless a profile says otherwise?
3. **Q3 HCA parallel citations:** instruments are silent; HCA reasons are report-only (DR2). Keep `mandatory`, change to `off`, or `preferred`?
4. **Q4 NSW/Qld report + paragraph pinpoint form:** `1 [45]`, `1, [45]` or `1 at [45]`? No instrument gives a report example.
5. **Q5 Preset updates for existing documents:** prompt per document (proposed) or apply silently with release notes?
6. **Q6 First document type to ship** under COURT-126: submissions only, or submissions plus reasons (observed)?
7. **Q7 ZIP dependency** for COURT-123 and test fixtures: which library, licence compatibility with GPLv3.
8. **Q8 Automatic AGLC4 styles on new blank documents** (COURT-101): keep create-only automation for academic mode, or always explicit?
9. **Q9 VSCA SC CA 3 (10 Mar 2026):** confirm 13.3(i)–(j) and Annexure B record-locator wording against the reissue.
10. **Q10 Federal Court manual checks:** confirm GPN-AUTH not reissued after 7 May 2025 and read APP 2 (1 Dec 2025) primary text (site blocks automation).
11. **Q11 Fixture reuse:** may court-published DOCX be kept as private test inputs? Until answered, commit only synthetic fixtures and derived counts.
12. **Q12 OCR verification:** eye-check ACT PD 2/2022 and NSW SC CCA 1 before encoding COURT-111 and COURT-119 values.
13. **Q13 WA corpus:** may the researcher accept WA eCourts conditions of use?
14. **Q14 `Obiter.Author`:** confirm removal; if attribution is wanted, keep only `Obiter.Website` and `Obiter.Version`.
