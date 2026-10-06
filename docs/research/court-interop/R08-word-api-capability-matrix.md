# R08: Word JavaScript API capability matrix

Track R8, which covers OBI-201, OBI-204, OBI-205, OBI-206 and OBI-401 (with notes for OBI-202, OBI-203 and OBI-P01 to P04).
Prepared 6 October 2026. Research only: no Obiter source was changed.

## 1. Method and sources

- **Primary source:** the Microsoft Learn Word requirement-set pages and API reference. All were retrieved on **6 October 2026**.
  - Learn renders these pages from the `OfficeDev/office-js-docs-reference` repository (branch `live`, commit `b10ec28`, dated 30 Sep 2026). I parsed the raw API tables (`docs/includes/word-*.md`) and reference YAML (`docs-ref-autogen/word/word/*.yml`) for that commit into a list of 2,680 class and member rows. The set assignments below come from those tables, not from summaries.
  - Fields guidance came from `OfficeDev/office-js-docs-pr` (commit `dccd221`, dated 5 Oct 2026).
- **Methodological caution (high confidence):** a WebFetch model summary of the `Word.Range` page gave the wrong requirement sets. It reported `insertField` as 1.4, `getTrackedChanges` as WordApiDesktop 1.4 and `insertBookmark` as 1.1. The raw reference YAML gives 1.5, 1.6 and 1.4. Use only raw-table or YAML values for future matrix updates.
- **Requirement-set membership is not tested behaviour.** This matrix shows what Microsoft documents. OBI-401 still needs device tests that record the client build and test date.

### Key Learn URLs (retrieved 6 Oct 2026)

| Ref | URL |
|---|---|
| L1 | https://learn.microsoft.com/en-us/javascript/api/requirement-sets/word/word-api-requirement-sets (page ms.date 10 Sep 2026) |
| L2 | https://learn.microsoft.com/en-us/javascript/api/requirement-sets/word/word-api-1-{1..9}-requirement-set |
| L3 | https://learn.microsoft.com/en-us/javascript/api/requirement-sets/word/word-api-desktop-1-{1..5}-requirement-set |
| L4 | https://learn.microsoft.com/en-us/javascript/api/requirement-sets/word/word-api-online-requirement-set |
| L5 | https://learn.microsoft.com/en-us/javascript/api/requirement-sets/word/word-preview-apis |
| L6 | https://learn.microsoft.com/en-us/javascript/api/word/word.range?view=word-js-preview (insertField, insertBookmark, getTrackedChanges remarks) |
| L7 | https://learn.microsoft.com/en-us/javascript/api/word/word.field and https://learn.microsoft.com/en-us/javascript/api/word/word.fieldtype |
| L8 | https://learn.microsoft.com/en-us/office/dev/add-ins/word/fields-guidance |
| L9 | https://learn.microsoft.com/en-us/javascript/api/word/word.document (save, insertFileFromBase64, compareFromBase64, tablesOfAuthorities, bibliography, removeDocumentInformation) |
| L10 | https://learn.microsoft.com/en-us/javascript/api/requirement-sets/common/office-add-in-requirement-sets (File, CompressedFile, DocumentEvents) |
| L11 | https://learn.microsoft.com/en-us/javascript/api/word/word.eventsource and https://learn.microsoft.com/en-us/javascript/api/word/word.font (smallCaps) |

## 2. Requirement-set availability (L1)

| Set | Web | Windows (M365 / retail) | Windows LTSC | Mac | iPad |
|---|---|---|---|---|---|
| WordApi 1.1–1.3 | Yes | 1509–1612 | Office 2016/2019 | 15.19–15.32 | Yes |
| WordApi 1.4 | Yes | 2208 | Office 2024 | 16.64 | 16.64 |
| **WordApi 1.5 (Obiter baseline)** | Yes | 2302 | Office 2024 | 16.70 | 16.70 |
| WordApi 1.6 | Yes | 2308 | Office 2024 | 16.76 | 16.76 |
| WordApi 1.7 | Yes | 2311 | Office 2024 | 16.79 | 16.79 |
| WordApi 1.8 | Yes | 2405 | Office 2024 | 16.85 | 16.85 |
| WordApi 1.9 (latest numbered) | Yes | 2411 | **Not available** | 16.91 | 16.91 |
| WordApiDesktop 1.1 | No | 2408 | Office 2024 | 16.88 | 16.88 |
| WordApiDesktop 1.2 | No | 2502 | No | 16.94 | 16.94 |
| WordApiDesktop 1.3 | No | 2507 | No | 16.99.2 | **No** |
| WordApiDesktop 1.4 | No | 2508 | No | 16.100.4 | **No** |
| WordApiDesktop 1.5 | No | 2603 | No | 16.108 | **No** |
| WordApiHiddenDocument 1.3–1.5 | No | 1612–2302 | Office 2019/2024 | Yes | No |
| WordApiOnline 1.1 | Web only | n/a | n/a | n/a | n/a |
| Preview | Insider/latest only; not for production | | | | |

Notes:
- WordApiOnline 1.1 currently lists **no** online-only APIs. Its feature table reads "None" (L4).
- WordApiDesktop APIs count as "preview" on web and may never ship there (L3).
- From WordApiDesktop 1.3 onwards the sets exclude iPad. A feature built on them must treat iPad and web as unsupported.

## 3. Capability matrix

Platform key: **W** = Windows, **M** = Mac, **Web** = Word on the web, **i** = iPad. The availability column follows from the set (section 2) unless the notes say otherwise.

### 3.1 Footnotes and endnotes

| API | Set | Availability | Notes |
|---|---|---|---|
| `Range.insertFootnote(text?)`, `Range.insertEndnote(text?)` | WordApi 1.5 | W M Web i | The reference mark goes after the range. |
| `Body/Range/Paragraph/ContentControl.footnotes`, `.endnotes` | 1.5 | W M Web i | Returns a `NoteItemCollection`. |
| `NoteItem.body`, `.reference`, `.type`, `.delete()`, `getNext()` | 1.5 | W M Web i | |
| `Document.getFootnoteBody()`, `getEndnoteBody()` | 1.5 | W M Web i | All notes in one Body. Useful for bulk scans with O(1) syncs. |
| Footnote numbering format, restart or position options | none found | n/a | No `FootnoteOptions` or equivalent in any set, including preview. The only related API is `PageSetup.suppressEndnotes` (Desktop 1.3). Medium–high confidence. |
| `BuiltInStyleName.footnoteText`, `footnoteReference`, `endnoteText`, `endnoteReference` | 1.3 (`styleBuiltIn`) | W M Web i | Locale-independent way to target the document's own note styles. |

### 3.2 Content controls

| API | Set | Availability | Notes |
|---|---|---|---|
| `insertContentControl()` (rich text by default); `tag`, `title`, `appearance`, `cannotEdit`, `cannotDelete`, `placeholderText`, `removeWhenEdited` | 1.1 | W M Web i | Tags are invisible identifiers. |
| `ContentControl.subtype` | 1.3 | all | |
| `getContentControls(options)` on Body, Range, Paragraph, ContentControl and Document (nesting traversal) | 1.5 | all | Learn warns that type-filtered calls return only "supported types". |
| `onDataChanged`, `onDeleted`, `onEntered`, `onExited`, `onSelectionChanged`; `Document.onContentControlAdded` | 1.5 | all | Event args carry `source` (local or remote, 1.5). Lets an add-in detect manual edits or deletion of managed citations (OBI-202, 205). |
| `ContentControlCollection.getByChangeTrackingStates` | 1.5 | all | Finds managed controls that sit inside tracked insertions or deletions. |
| Checkbox CC (1.7); combo box and drop-down CC (1.9) | 1.7 / 1.9 | all (1.9 not on LTSC) | Not needed for citations. |
| Group, date-picker and building-block CC; `lockContents` | WordApiDesktop 1.3 | W M | |
| `ContentControl.setState` / `resetState` | Preview | none | |

### 3.3 Custom XML parts and document properties

| API | Set | Availability | Notes |
|---|---|---|---|
| `Document.customXmlParts`: `add`, `getByNamespace`, `getXml`, `setXml`, `query`, `insertElement` and similar | WordApi 1.4 | all | Obiter's citation store. |
| `InsertFileOptions.importCustomXmlParts` / `importCustomProperties` | 1.6 | all | Controls what carries over on `insertFileFromBase64`. |
| `CustomXmlNode` tree API, schemas, `XmlMapping` | WordApiDesktop 1.3 | W M | |
| `Document.properties` (`DocumentProperties`: author, title, comments, `revisionNumber` and so on) | **1.3** | all | |
| `DocumentProperties.customProperties` (`add`, `getItemOrNullObject`, `deleteAll`) | **1.3** | all | Note that Obiter guards this at 1.6 (section 4). |
| `Office.context.document.settings` (Common API) | Common | all | Hidden add-in settings part. |

### 3.4 Fields

| API | Set | Availability | Notes |
|---|---|---|---|
| `Body/Range/Paragraph/ContentControl.fields`, `Field.code`, `Field.result`, `getNext()` | 1.4 | all | Reading works on every platform (L8). |
| `Field.type`, `.kind`, `.locked`, `.data`, `.delete()`, `.updateResult()`, `FieldCollection.getByTypes([...])`; setting `code` | 1.5 | **W M** (Web mostly read-only) | L6: "In Word on Windows and on Mac, the API supports inserting and managing all types listed in Word.FieldType except `others`. In Word on the web, fields are mainly read-only." `isSetSupported("WordApi","1.5")` is **true** on web, so a set check alone cannot gate field writes. |
| `Range.insertField(location, type, text, removeFormatting)` | 1.5 | **W M** | `FieldType` includes `ta`, `toa`, `ref`, `noteRef`, `pageRef`, `citation`, `bibliography`, `addin`, `seq`, `styleRef`, `docProperty`, `hyperlink`, `xe`, `index`, `toc` and others (L7). |
| `Field.data` on `addin` fields | 1.5 | W M (read on web) | Hidden add-in payload. Zotero, Mendeley and EndNote-type tools also use ADDIN fields, so Obiter should read them and never write to them (OBI-P01). |
| `Field.showCodes` | WordApiDesktop 1.1 | W M i | |
| `Document.fields`, `Field.unlink()`, `updateSource()`, `linkFormat` | WordApiDesktop 1.4 | W M | `unlink()` is relevant to finalisation (flattening managed fields in a **copy**). |

### 3.5 Tables of authorities, bibliography, cross-references and bookmarks

| API | Set | Availability | Notes |
|---|---|---|---|
| `Range.insertBookmark(name)`, `Range.getBookmarks(includeHidden, includeAdjacent)`, `Document.getBookmarkRange(OrNullObject)`, `deleteBookmark` | 1.4 | all | Enough for REF/NOTEREF anchors. Hidden bookmarks are those whose names start with `_`. |
| `Document.bookmarks` / `Bookmark` object (`exists`, `storyType`, `copyTo`) | WordApiDesktop 1.4 | W M | |
| `BookmarkCollection.add`, `Document.goTo` | Preview | none | |
| `Document.tablesOfAuthorities`, `TableOfAuthoritiesCollection.add / markCitation / markAllCitations`, `tableOfAuthoritiesCategories`, `TableOfAuthorities.isPassimUsed` and similar | **WordApiDesktop 1.4** | **W M only** | Native TA/TOA object model. Not available on web or iPad. |
| `Document.bibliography`, `Bibliography.sources`, `Source.xml`, `isCited`, `bibliographyStyle` | WordApiDesktop 1.3 | W M | Word's Source Manager. Obiter already reads the same data through custom XML on every platform. |
| `Document.tablesOfContents`, `TableOfContents` | WordApiDesktop 1.4 | W M | |

### 3.6 Tracked changes, comments and co-authoring

| API | Set | Availability | Notes |
|---|---|---|---|
| `Document.changeTrackingMode` (off, trackAll, trackMineOnly) | **1.4** | all | Read it before writing so that managed edits respect the user's Track Changes setting. |
| `Body/Range/Paragraph/ContentControl.getReviewedText(current \| original)` | 1.4 | all | Lets an add-in compare original and current text without accepting anything. |
| `getTrackedChanges()`, `TrackedChange.accept/reject/author/date/type/text/getRange`, `TrackedChangeCollection.acceptAll/rejectAll` | **1.6** | all | |
| `Document.revisions`, `Revision`, `trackRevisions`, `acceptAllRevisions`, `RevisionsFilter` | WordApiDesktop 1.4 | W M | |
| `Range.insertComment`, `getComments()`, `Comment.reply/resolved/delete/contentRange` | **1.4** | all | |
| `Body/Range/Paragraph/ContentControl.onCommentAdded/Changed/Deleted/Selected` | Preview | none | |
| `Document.onParagraphAdded/Changed/Deleted` with `source` = `local` or `remote` ("through coauthoring", L11) | 1.6 | all | The only cross-platform co-authoring signal. |
| `Document.coauthoring`: authors, locks, `conflicts`, `pendingUpdates`, `canCoauthor` | WordApiDesktop 1.4 | W M | |
| `Document.compare(filePath)` (Desktop 1.1); `compareFromBase64` (Desktop 1.2) | Desktop | W M i (1.1, 1.2) | Can produce a redline against an earlier version. |

### 3.7 Styles, lists and numbering

| API | Set | Availability | Notes |
|---|---|---|---|
| `Range/Paragraph/Body.styleBuiltIn`; `.style` (localised name) | 1.1 / 1.3 | all | |
| `Document.getStyles()`, `StyleCollection.getByNameOrNullObject`, `Style.builtIn / nameLocal / inUse / type / baseStyle / delete`, `Document.addStyle` | **1.5** | all | Enough for a style-mapping preview (OBI-201). Note that Obiter treats `addStyle` as 1.6. |
| `Document.importStylesFromJson`, `Application.retrieveStylesFromBase64` | 1.6 / 1.5 | all | Conflict behaviour parameter is Desktop 1.1. |
| `Paragraph.listItem / list / isListItem / startNewList / attachToList / detachFromList`, `List.setLevelNumbering / setLevelStartingNumber`, `ListItem.listString / level` | 1.3 | all | Reads the existing paragraph numbering string. Useful to cite "[12]" judgment paragraphs without touching numbering definitions. |
| `ListTemplate`, `ListLevel.linkedStyle / numberFormat / startAt`, `Style.listTemplate` | WordApiDesktop 1.1 | W M i | Needed to *inspect* how a court template links multilevel numbering to styles. |
| `Style.linkToListTemplate`, `ListFormat.applyListTemplateWithLevel` | WordApiDesktop 1.3 | W M | |
| `Font.smallCaps` | WordApiDesktop 1.3 | W M | Has no effect on web or iPad (Obiter already notes this: `src/word/footnoteManager.ts:180`). |

### 3.8 Hyperlinks, search and ranges

| API | Set | Availability | Notes |
|---|---|---|---|
| `Range.hyperlink` (get or set first link), `Range.getHyperlinkRanges()` | 1.3 | all | Setting a link deletes the existing links in the range. |
| `Document.hyperlinks`, `Hyperlink.address / subAddress / textToDisplay` | WordApiDesktop 1.3 | W M | |
| `Range.search(text, {matchWildcards, matchCase, ...})` | 1.1 | all | Learn notes a maximum result limit. `Document.search` is 1.7. |
| `Range.compareLocationWith`, `intersectWith`, `expandTo`, `getTextRanges` | 1.3 | all | |
| `Paragraph.getText({includeHiddenText, includeTextMarkedAsDeleted})` | 1.7 | all | |
| `Range.getOoxml()` / `insertOoxml()` / `insertHtml()` | 1.1 | all | OOXML before/after snapshots for OBI-201 fixtures. |
| `Document.getRange(start, end)` | Preview | none | |

### 3.9 Files, copies and finalisation

| API | Set | Availability | Notes |
|---|---|---|---|
| `Office.context.document.getFileAsync(Office.FileType.Compressed)` + `getSliceAsync` | Common: File / CompressedFile | W M Web i | Returns the **whole current .docx** as bytes without changing it. This is the cross-platform route to a separate finalised copy (L10). |
| `Application.createDocument(base64)` + `DocumentCreated.open()` | 1.3 | all | Opens a new document from a .docx in base64 form. |
| `Document.insertFileFromBase64(base64, location, options)` | 1.5 | all | Limited to 4 MB. Document settings are not preserved and ActiveX content is not supported. Imports into the *current* document, so it is not a save-as. |
| `Document.save(saveBehavior, fileName)` | 1.1 (params 1.5) | all | `fileName` "only takes effect for a new document". No save-as or copy of an existing file. |
| `Document.close(closeBehavior)` | 1.5 | all | |
| `DocumentCreated.*` (hidden document: insert, getStyles, save) | WordApiHiddenDocument 1.3–1.5 | W M (desktop) | Builds a copy without showing it. Not on web or iPad. |
| `Document.removeDocumentInformation(type)`, `removePersonalInformationOnSave`, `deleteAllComments` | WordApiDesktop 1.4 | W M | Destructive. Use only on a copy and only after explicit user choice (OBI-206). |
| `Document.exportAsFixedFormat` (PDF/XPS) | **Preview only** | none | No production PDF export from an add-in. |

### 3.10 Events and selection

| API | Set | Availability | Notes |
|---|---|---|---|
| `Office.context.document.addHandlerAsync(DocumentSelectionChanged)` | Common: DocumentEvents | all | |
| `ContentControl.onSelectionChanged`, `onEntered`, `onExited` | 1.5 | all | |
| `Document.onParagraph*` | 1.6 | all | See section 3.6. |
| Annotations (`onAnnotationClicked` and similar), critiques | 1.7 / 1.8 | all | |
| A save or close event | none | n/a | No Word.js event before save, close or print. "On save" validation is not possible. |

## 4. What Obiter already uses (code audit)

### 4.1 Manifests and guards

| Item | Evidence | Observation |
|---|---|---|
| Manifest baseline | `manifest.prod.xml:20`, `manifest.xml:20`, `manifest.beta.xml:26`, `manifest.skill.xml:44` | `WordApi` MinVersion 1.5 everywhere. The skill manifest also requires `SharedRuntime` 1.1 (`manifest.skill.xml:54`). |
| Runtime baseline check | `src/taskpane/taskpane.ts:89` | `isSetSupported("WordApi","1.5")`. |
| Compatibility layer | `src/word/apiCompat.ts:38-74, 79, 121-127` | `FEATURE_FLAGS` lists `customStyles`=1.6, `comments`=**1.8**, `trackedChanges`=**1.8** and annotations/checkbox=1.7. Learn gives addStyle as **1.5**, comments as **1.4** and tracked changes as **1.6**. The version probe stops at 1.8 (it misses 1.9) and has no `WordApiDesktop` or hidden-document probes. **`isFeatureAvailable` and `getApiVersion` have no callers outside the module** (repo grep). The layer is effectively unused. |
| Style creation guard | `src/word/styles.ts:138-143` | `addStyle` is gated at 1.6, but Learn says 1.5. On 1.5-only hosts (Windows 2302–2307, Mac 16.70–16.75) all AGLC4 styles are silently skipped. |
| Custom properties guard | `src/word/documentProperties.ts:29-33` | Gated at 1.6, but Learn says 1.3. `src/word/documentMeta.ts:27-34` writes the same API with no guard, which is fine. |
| List API probe | `src/word/headingTracker.ts:83, 91` | `canUseListApi` is computed and then discarded with `void`. |
| Other sets | `src/api/authDialog.ts:44` | `DialogApi` 1.1. |

### 4.2 API usage (repo grep, `src/`)

| Capability | Used? | Evidence |
|---|---|---|
| `insertFootnote` | Yes | `src/word/footnoteManager.ts:653` |
| Footnote and endnote collections | Yes (endnotes read-only) | `src/word/documentScanner.ts:75-84, 214-218`; `footnoteManager.ts:647` |
| Nested rich-text CCs (parent and child, `Hidden`, tags) | Yes. This is the core model. | `footnoteManager.ts:239-242, 674-677, 978-981`; `citationRefresher.ts:891-894`; `footnoteModelMigration.ts:267-278`; `documentScanner.ts:291-321` |
| CC events (`onDataChanged`, `onDeleted`, `onContentControlAdded`) | **No** | 0 hits |
| `insertHtml` for formatted runs | Yes | `footnoteManager.ts:201-202` |
| Custom XML parts | Yes | `src/store/citationStore.ts:8-9, 124, 795`; Word Source Manager read at `src/word/sourceImporter.ts:93, 105` |
| Custom properties | Yes | `documentMeta.ts:27-34`, `documentProperties.ts:37-41` |
| Document settings | Yes | `src/ui/views/Settings.tsx:120-134` |
| `getStyles` / `addStyle` / `styleBuiltIn` / `.style` | Yes | `styles.ts:153, 186, 270`; `quotationInserter.ts:61, 105`; `template.ts:110, 125` |
| List APIs (`startNewList`, `listItem`) | Yes | `styles.ts:337, 395-397, 500` |
| `compareLocationWith` | Yes | `footnoteManager.ts:494` |
| `search` | Yes | `documentScanner.ts`, `inlineFormatter.ts` (grep) |
| `DocumentSelectionChanged` / `ActiveViewChanged` | Yes | `src/word/changeListener.ts:59-90`; `selectionHandler.ts:86-87` |
| Fields, bookmarks, tracked changes, comments, `changeTrackingMode`, `getReviewedText`, `getOoxml`/`insertOoxml`, `getFileAsync`, `createDocument`, `onParagraph*` | **No** | 0 hits for each (grep, 6 Oct 2026) |

### 4.3 Code observations relevant to the backlog

1. **OBI-201 risk (high confidence from the code; not yet tested on a device).** `autoSetupDocument()` runs on every task-pane open unless the user has opted out with the `obiter-autoSetup` localStorage key. It calls `applyAglc4Styles` (`taskpane.ts:39-61, 101`). On hosts with WordApi 1.6 or later, `applyAglc4Styles` **redefines the built-in Heading 1–5 styles** (`styles.ts:212-281`). In a court or firm template, this changes the template's own heading styles just because the add-in was opened. Alternative explanation: the user may have accepted this as AGLC4 behaviour. Even so, it conflicts with OBI-201 ("honour the document's ... styles unless the user explicitly applies another style").
2. `quotationInserter.ts:105` resets inserted paragraphs to the built-in `Normal` style. In a template whose body style is not `Normal`, this departs from house style.
3. Footnote insertion does not assign a style (`footnoteManager.ts:653-677`). The document's own Footnote Text style applies. This is consistent with OBI-201.
4. **OBI-206 and privacy.** `setDocumentMetadata` writes six `Obiter.*` custom properties, including a hard-coded personal name under `Obiter.Author` (`documentMeta.ts:29-34`). It runs on every task-pane open (`taskpane.ts:116`) and on template creation (`template.ts:39`). Every handled document therefore carries [author] metadata. A finalised copy must make this visible and removable.
5. Obiter has no listener for managed CCs being deleted or edited by hand. It relies on a debounced selection-change refresh (`changeListener.ts:58-90`). The 1.5 CC events would support OBI-202 and OBI-205 detection without a full-document rescan.

## 5. Feasibility by backlog story

| Story | Feasible on WordApi 1.5 with runtime checks | Needs higher or desktop-only sets | Infeasible in an Office.js add-in |
|---|---|---|---|
| **OBI-201** styles and numbering | Style inventory and mapping preview (`getStyles`, `builtIn`, `nameLocal`, `inUse`: 1.5). Targeting note styles through `styleBuiltIn` footnoteText/Reference (1.3). Reading paragraph numbering (`listItem.listString`: 1.3). OOXML before/after snapshots (`getOoxml`: 1.1). Fix: do not auto-modify Heading 1–5. | Inspecting list templates and linked styles (Desktop 1.1, W M i). Linking styles to a list template (Desktop 1.3, W M). `smallCaps` (Desktop 1.3, so web and iPad need a fallback). | None |
| **OBI-202** mixed footnotes | Nested CC edits that leave surrounding text alone (already used). Edit detection through `onDataChanged`/`onDeleted` (1.5). `getContentControls` (1.5). | None | None |
| **OBI-203** adopt existing citations | `search` with wildcards (1.1, mind the result limit), `getTextRanges` (1.3), wrapping in a CC (1.1). Reversible: store the original text in the CC tag or the custom XML store. | None | None |
| **OBI-204** cross-references and authority lists | Bookmarks: insert, read and resolve (1.4, all platforms). **Reading** REF, NOTEREF, TA, TOA, CITATION and ADDIN fields (`fields`, `getByTypes`: 1.4/1.5, all). Obiter-rendered authority lists as ordinary text (current approach). | **Inserting or updating** REF, NOTEREF, TA or TOA fields: `insertField`/`updateResult` (1.5 but **W M only**; web is "mainly read-only"). Gate with a platform check plus try/catch, not with `isSetSupported`. Native TOA object model (`markCitation`, `tablesOfAuthorities.add`): **WordApiDesktop 1.4, W M only, not iPad**. Bibliography sources: Desktop 1.3. | Updating fields on web or iPad through the native TOA. The add-in cannot force an update when the document is printed or saved, because no save event exists. |
| **OBI-205** collaboration and tracked changes | `changeTrackingMode` (1.4) to respect Track Changes. `getReviewedText` (1.4). `getByChangeTrackingStates` (1.5). CC events (1.5). Comments for review notes (1.4). | `getTrackedChanges` and accept/reject (**1.6**, all platforms). Local or remote paragraph events (**1.6**). Co-authoring locks and conflicts (Desktop 1.4, W M). Comment events (Preview). | Behaviour with the add-in closed must be tested, not built: Word preserves CCs and custom XML without the add-in. Office.js cannot run while the add-in is not loaded. |
| **OBI-206** finalised copy | **Separate copy via `getFileAsync(Compressed)`** (Common, all platforms). Transform the OOXML client-side (strip `Obiter.*` properties and custom XML, unwrap CCs, optionally keep comments and revisions). Then offer it as a download or open it with `createDocument` (1.3). The original is never touched. Pre-export validation with existing scanners. | Hidden-document build (WordApiHiddenDocument, desktop). `Field.unlink` (Desktop 1.4). `removeDocumentInformation` (Desktop 1.4, copy only). `compareFromBase64` redline check (Desktop 1.2). | **PDF export** (`exportAsFixedFormat` is preview-only; users must use Word's Save as PDF). **Save-as or copy of the current file** (`save(fileName)` applies only to new documents). Promising filing acceptance. |
| **OBI-401** compatibility matrix | Probe at runtime for WordApi 1.1–1.9, WordApiDesktop 1.1–1.5 and WordApiHiddenDocument. Record `Office.context.diagnostics` (platform and version). Show unsupported states. | n/a | Treating `isSetSupported` as proof of behaviour (fields on web show why). |
| OBI-P01 coexistence with other citation tools | Read ADDIN, CITATION and BIBLIOGRAPHY fields and their `code` (1.4/1.5). Read the Source Manager XML (already done). Never call `updateResult` or `delete` on fields Obiter does not own. | `Bibliography.sources` (Desktop 1.3). | Inspecting other add-ins' runtime state |
| OBI-P02 transcript import | Only through files or clipboard paste supplied by the user. | None | Live feeds into Word through the Word API |
| OBI-P03 filing | Round-trip a .docx copy (as in OBI-206). | None | Direct filing through the Word API. That needs separate server or API scope. |
| OBI-P04 templates and macros | Read styles, CCs and custom XML of the open document. | `Document` template info (Desktop) | **Running, reading or reconstructing VBA or DOTM macros**. Office.js exposes no VBA object model. |

## 6. Recommendations

1. **Fix the compatibility layer before building on it** (OBI-401). Correct `FEATURE_FLAGS`: addStyle 1.5, comments 1.4, trackedChanges 1.6, customProperties 1.3. Add probes for 1.9, WordApiDesktop 1.1–1.5 and WordApiHiddenDocument. Add a separate *behaviour* flag for "fields writable", based on platform plus a try/catch probe, because web reports WordApi 1.5 but treats fields as mostly read-only. Then route the existing ad-hoc guards (`styles.ts:138`, `documentProperties.ts:32`, `headingTracker.ts:83`) through the layer.
2. **Stop auto-modifying built-in heading styles on open** (OBI-201). Make AGLC4 heading formatting an explicit, previewed action. Disable it by default in court mode.
3. **Cross-references (OBI-204):** bookmarks (1.4) work everywhere. Native REF, NOTEREF and TA/TOA field authoring should be a desktop-only enhancement, with Obiter's text-based List of Authorities as the default on all platforms.
4. **Tracked changes (OBI-205):** read `changeTrackingMode` before every managed write. Use `getReviewedText` and `getByChangeTrackingStates` to detect managed citations inside pending revisions. Add `onDeleted`/`onDataChanged` handlers to support repair previews.
5. **Finalisation (OBI-206):** build the copy pipeline on `getFileAsync(Compressed)` with client-side OOXML transforms. Surface the `Obiter.*` properties (including the hard-coded [author] value) as explicit keep or remove choices. Do not claim PDF export.
6. **Device testing (OBI-401):** test Windows M365 (≥2603), Windows LTSC 2024 (no WordApi 1.9 or Desktop 1.2+), Mac (≥16.108), web and iPad. Record build numbers and dates. iPad is the platform most likely to lack desktop features (no Desktop 1.3+).

## 7. Confidence and gaps

- **High:** set assignments in section 3 (taken from raw Microsoft tables at commit `b10ec28`). The code facts in section 4 (file:line).
- **Medium:** "no footnote-options API" and "no save or close event". These rest on absence from the published tables, which documents the API surface but does not prove a capability is missing.
- **Not tested:** any real client behaviour, including CCs inside footnotes on iPad, field writes on Mac, `getFileAsync` slice limits on large judgments, and the heading-style side effect on a real court template. All of these belong to OBI-401 device tests.
