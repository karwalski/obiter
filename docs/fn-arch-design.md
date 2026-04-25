# FN-ARCH: Parent-Child Footnote Content Control Model

**Story:** FN-001 | **Status:** Design
**Date:** 2026-04-25
**Author:** Matthew Watt

---

## 1. Current Model Analysis

### 1.1 How Content Controls Work Today

The current implementation in `src/word/footnoteManager.ts` already uses the parent-child CC model. The code was rebuilt during the FN-ARCH epic planning phase to implement this structure:

- **Parent CC** (line 11): A constant `PARENT_CC_TAG = "obiter-fn"` defines the tag for the parent content control that wraps all citations in a single footnote.
- **Child CCs** (lines 85-102): The `insertChildCitation()` function creates a child RichText content control inside the parent, tagged with the citation UUID, titled with a human-readable label, and set to `"Hidden"` appearance.
- **Insertion** (lines 268-368): `insertCitationFootnote()` creates a new footnote with `selection.insertFootnote("")`, then inserts a parent CC at the end of the first paragraph (after the reference mark), and a child CC inside it.
- **Appending** (lines 198-214): `appendCitationToParent()` finds the existing parent CC via `findParentCC()` and calls `insertChildCitation()` at the `"End"` range of the parent.
- **Deletion** (lines 466-543): `deleteCitationFootnote()` finds the child CC by tag inside the parent CC, calls `cc.delete(false)` to remove both the control and its content, then checks if the parent has remaining children -- if not, it deletes the entire footnote via `noteItem.delete()`.
- **Refresh** (lines 119-341 in `citationRefresher.ts`): `refreshAllCitations()` scans all footnotes, collects parent-child CC structures, rebuilds content from scratch when text has changed (clearing the parent CC and re-inserting child CCs with separators and closing punctuation).

### 1.2 What Breaks (Known Issues)

**Problem 1: `parentCC.clear()` and the Footnote Reference Mark**

In `citationRefresher.ts` line 294, the refresher calls `fnEntry.parentCC.clear()` before rebuilding content. If the parent CC inadvertently wraps the footnote reference mark (the superscript number at the start of the footnote body), `clear()` will destroy it. The current insertion code mitigates this by inserting the parent CC at `firstPara.getRange("End")` (footnoteManager.ts line 322), which should place it after the reference mark. However, if the reference mark is the only content in the paragraph, `getRange("End")` and `getRange("Start")` may collapse to the same point, causing the parent CC to encompass the reference mark.

**Problem 2: Separator and Punctuation as Plain Text Inside the Parent CC**

The refresher inserts `"; "` (line 315) and `"."` (line 320) as plain text directly inside the parent CC but outside any child CC. This text is not wrapped in its own content control, so it cannot be distinguished from citation content programmatically. If a user manually edits this text, the refresher's text comparison (`expectedText === existingText`, line 289) will detect a mismatch and trigger a full rebuild, which is the correct self-healing behaviour but may be disruptive.

**Problem 3: `cc.delete(false)` Leaves Behind Orphan Text**

When `deleteCitationFootnote()` removes a child CC (line 519), the `"; "` separator text between that child and its neighbours remains inside the parent CC. The refresher must run to clean up these orphan separators. If the refresher does not run immediately after deletion, the footnote will contain extra semicolons (e.g., `Source A; ; Source C.`).

**Problem 4: Mac and Web Platform Differences**

- Word for Mac has known issues with content control nesting: `insertContentControl()` on a range inside another content control sometimes fails silently or produces flat (non-nested) structures.
- Word for Web (Office Online) has limited footnote API support. The `selection.insertFootnote("")` call may throw. The try/catch wrapper at footnoteManager.ts line 361 handles this with a user-facing error message.
- The `"Hidden"` appearance value for content controls requires casting (`as Word.ContentControlAppearance`) because the TypeScript definitions may not include all enum values depending on the WordApi version targeted.

**Problem 5: Race Conditions During Rapid Insertion**

When a user inserts multiple citations quickly (e.g., clicking "Insert" twice in rapid succession), the `getAdjacentFootnote()` detection (line 114) relies on the cursor being positioned after the footnote reference mark. If the first insertion's `context.sync()` has not completed by the time the second begins, the cursor position may be stale, leading to a second footnote being created instead of appending to the first.

### 1.3 Engine-Level Punctuation

The engine module `src/engine/rules/v4/general/footnotes.ts` exports two functions:

- `ensureClosingPunctuation()` (line 22): Appends `.` to the last run if it does not already end with `.`, `!`, or `?`. Per the FN-ARCH architecture notes (progress.md line 951), this function should NOT be called by the insertion flow -- the refresher handles closing punctuation. Currently, this function is only used in the test suite (`tests/engine/chapter1.test.ts` line 9) and is not called from `footnoteManager.ts` or `citationRefresher.ts`.
- `joinMultipleCitations()` (line 61): Joins multiple citation run arrays with `"; "` separators. This is a pure-engine utility that predates the parent-child model. In the new model, the refresher handles joining, so this function is only relevant for preview rendering or bibliography generation.

---

## 2. Proposed CC Structure

### 2.1 Tag Naming Convention

| Level | Tag | Title | Appearance | Purpose |
|-------|-----|-------|------------|---------|
| Parent | `obiter-fn` | `"Obiter Footnote"` | `Hidden` | Wraps all citation content in one footnote; sits after the reference mark |
| Child | `{citation-uuid}` | Short title or source label | `Hidden` | Wraps a single citation's formatted text (no punctuation) |

**Tag rules:**
- Parent CC tags always start with `obiter-` (the `PARENT_CC_TAG` constant, currently `"obiter-fn"`).
- Child CC tags are UUIDs (v4 format, e.g., `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`).
- The convention `cc.tag.startsWith("obiter-")` distinguishes parent/internal CCs from child citation CCs. This check is used in `getAllCitationFootnotes()` (line 422), `buildFootnoteMap()` (footnoteTracker.ts line 37), and the refresher's child-scanning loop (citationRefresher.ts line 171).

### 2.2 Nesting Structure in the Footnote Body

```
Footnote body:
  [footnote reference mark (superscript number)]
  [PARENT CC tag="obiter-fn" appearance="Hidden"]
    [CHILD CC tag="uuid-1" appearance="Hidden"]
      FormattedRun[] for citation 1 (no trailing punctuation)
    [/CHILD CC]
    "; "                    <-- plain text, inserted by refresher
    [CHILD CC tag="uuid-2" appearance="Hidden"]
      FormattedRun[] for citation 2 (no trailing punctuation)
    [/CHILD CC]
    "."                     <-- plain text, inserted by refresher
  [/PARENT CC]
```

**Key invariants:**
1. The footnote reference mark is OUTSIDE the parent CC. The parent CC is inserted at `getRange("End")` of the first paragraph, which places it after the reference mark.
2. Separators (`"; "`) are plain text between child CCs, inside the parent CC.
3. Closing punctuation (`"."`) is plain text after the last child CC, inside the parent CC.
4. Child CCs contain only the citation's `FormattedRun[]` output -- no separators, no trailing period.
5. For a single-citation footnote, the structure simplifies to: `[parent][child]citation text[/child].[/parent]`.

### 2.3 Content Control Type

Both parent and child CCs use `"RichText"` type (the parameter to `insertContentControl()`). This is required because:
- Citation text contains mixed formatting (italic case names, regular text, small caps for authors).
- `"PlainText"` content controls strip formatting.
- `"RichText"` supports nested content controls (parent containing children).

### 2.4 Content Control Appearance

Both levels use `"Hidden"` appearance. This means:
- No visible border or bounding box in the document.
- The user sees only the formatted citation text.
- Content controls are still detectable programmatically via `body.contentControls` or `getByTag()`.
- Developers can toggle to `"BoundingBox"` for debugging by changing the appearance value.

---

## 3. Insertion Flow

### 3.1 First Citation in a New Footnote

**Entry point:** `insertCitationFootnote()` in `footnoteManager.ts` (line 268)

**Precondition:** Cursor is in the document body, not adjacent to an existing footnote reference mark.

**Steps:**

1. **Check for explicit append target** (line 277): If `appendToFootnote` parameter is provided, skip to the append flow (section 3.2).

2. **Detect adjacent footnote** (line 292): Call `getAdjacentFootnote(context)` to check if the cursor is immediately after an existing footnote reference mark.
   - Loads `selection` and checks `isEmpty` (must be a collapsed cursor).
   - Iterates footnotes from last to first, comparing `afterRef` range with cursor position.
   - If an adjacent footnote is found, delegates to `appendCitationToParent()` (section 3.2).

3. **Record pre-insertion footnote count** (line 300): Load all footnotes and record the count for post-insertion verification.

4. **Create the footnote** (line 306): `selection.insertFootnote("")` creates a new footnote at the cursor position with empty initial content. Word automatically:
   - Inserts a superscript reference number in the document body.
   - Creates a footnote body with a reference mark and an empty paragraph.

5. **Get the first paragraph** (line 311): Load the footnote body's paragraphs. The first paragraph contains the auto-generated footnote reference mark.

6. **Create parent CC** (line 322-326):
   ```typescript
   const paraEndRange = firstPara.getRange("End");
   const parentCC = paraEndRange.insertContentControl("RichText");
   parentCC.tag = PARENT_CC_TAG;       // "obiter-fn"
   parentCC.title = "Obiter Footnote";
   parentCC.appearance = "Hidden";
   ```
   This places the parent CC after the reference mark, ensuring `clear()` on the parent CC will not destroy the reference mark.

7. **Create child CC** (line 329): `insertChildCitation(parentCC, citationId, title, formattedRuns)` creates a child CC at the `"End"` range of the parent, tagged with the citation UUID.

8. **Sync** (line 331): `await context.sync()` commits all proxy operations to the document.

9. **No closing punctuation inserted here** (line 333-335): The comment explicitly states that the refresher adds `"."` on its first cycle. This avoids duplicate periods.

10. **Verify footnote creation** (line 339-350): Re-count footnotes and log a warning if the count did not increase (defensive check for Word for Web failures).

11. **Reposition cursor** (line 356-358): Move the cursor to immediately after the footnote reference mark in the document body. This ensures the next citation insertion will detect the adjacent footnote and append rather than creating a new one.

### 3.2 Additional Citation in an Existing Footnote

**Entry point:** `appendCitationToParent()` in `footnoteManager.ts` (line 198)

**Precondition:** A footnote exists with a parent CC (`obiter-fn` tag).

**Steps:**

1. **Find the parent CC** (line 205): `findParentCC(noteItem, context)` loads the footnote body's content controls and finds the one tagged `"obiter-fn"`.

2. **Insert child CC** (line 212): `insertChildCitation(parentCC, citationId, title, formattedRuns)` inserts a new child CC at the `"End"` range of the parent CC.

3. **Sync** (line 213): Commits the operation.

4. **Refresher responsibility:** The separator `"; "` between the new child and any existing children, plus the closing `"."`, will be rendered by the refresher on its next cycle. Until then, the footnote may temporarily lack proper separators.

### 3.3 Explicit Append by Footnote Index

**Entry point:** `appendToFootnoteByIndex()` in `footnoteManager.ts` (line 225)

Used by the UI when the user selects a specific footnote to append to (e.g., from the "Add to existing footnote" toggle in InsertCitation).

1. Load all footnotes and index into the array with `footnoteIndex - 1` (0-based).
2. Delegate to `appendCitationToParent()`.

---

## 4. Refresh Flow

### 4.1 Overview

**Entry point:** `refreshAllCitations()` in `citationRefresher.ts` (line 119)

The refresher is the single authority for rendered footnote content. It:
- Rebuilds the footnote-number map for ibid/short-form resolution.
- Scans every footnote for parent-child CC structures.
- Re-formats each citation using the rule engine.
- Compares the expected text against the current text in the parent CC.
- If different, clears the parent CC and rebuilds from scratch with fresh child CCs, separators, and closing punctuation.

### 4.2 Step-by-Step

1. **Build config** (line 124-127): Load the citation standard and writing mode from the store.

2. **Rebuild footnote map** (line 130-131): Call `buildFootnoteMap(context)` from `footnoteTracker.ts` to scan all footnotes and map citation IDs to their first footnote numbers. Then `updateFirstFootnoteNumbers()` persists these values to the store.

3. **Scan footnotes** (line 134-186): Iterate all `NoteItem` objects:
   - Load each footnote body's content controls.
   - Find the parent CC with tag `"obiter-fn"`.
   - If no parent CC, skip (non-Obiter footnote or legacy format).
   - Load child CCs inside the parent CC.
   - Collect children whose tags do not start with `"obiter-"` (citation UUIDs).
   - Build a `FootnoteEntry` with the parent CC proxy, footnote number, and ordered child list.

4. **Render citations** (line 199-260): For each `FootnoteEntry`:
   - Track `seenCitationIds` for first-vs-subsequent reference resolution.
   - Track preceding footnote state for ibid detection (`prevFootnoteNumber`, `prevFootnoteCitationIds`, `prevFootnotePinpoint`).
   - For each child, look up the `Citation` from the store.
   - Build a `CitationContext` with `isFirstCitation`, `isSameAsPreceding`, `firstFootnoteNumber`, etc.
   - Call `formatCitation(citation, citationContext, config)` to get the formatted runs (no closing punctuation).
   - Call `applySignalAndCommentary(runs, citation)` to prepend signals and commentary.

5. **Assemble expected text** (line 273-281): Concatenate all rendered citation texts with `"; "` separators and a trailing `"."`.

6. **Compare with existing content** (line 284-288): Load the parent CC's `.text` property and compare with the expected text string.

7. **If unchanged** (line 289-290): Increment `unchanged` counter. Skip rebuild.

8. **If changed** (line 292-323): Full rebuild:
   - `fnEntry.parentCC.clear()` removes all content from the parent CC.
   - For each citation: create a new child CC at the parent's end range, write formatted runs into it.
   - After each child (except the last): insert `"; "` as plain text at the parent's end.
   - After the last child: insert `"."` as plain text at the parent's end.
   - `await context.sync()` to commit.

9. **Update tracking state** (line 326-335): Record the current footnote's citation IDs and the last citation's pinpoint for the next footnote's ibid resolution.

### 4.3 Separator Logic (Rule 1.1.3)

The refresher currently always uses `"; "` as the separator between citations (line 315). Per AGLC4 Rule 1.1.3, when a subsequent citation uses a different introductory signal from the preceding one, a new sentence should begin (`. ` instead of `; `). This logic exists in the pure-engine function `joinMultipleCitations()` (footnotes.ts line 61) but is NOT yet implemented in the refresher.

**Recommendation for FN-003:** The refresher should check each child's signal against the preceding child's signal and use `. ` when they differ.

### 4.4 Closing Punctuation (Rule 1.1.4)

The refresher appends `"."` after the last child CC (line 320). Per AGLC4 Rule 1.1.4, if the citation already ends with `?` or `!`, no additional period should be added. Currently the refresher always appends `"."` unconditionally.

**Recommendation for FN-003:** Check the last character of the last child's rendered text. If it is `?` or `!`, skip the period. The engine's `ensureClosingPunctuation()` function in `footnotes.ts` (line 22) has this logic and can be referenced.

---

## 5. Edit Flow

### 5.1 Loading a Citation for Editing

**Entry point:** `EditCitation.tsx` in `src/ui/views/EditCitation.tsx`

When the user navigates to the edit view for a citation:

1. The citation is loaded from the `CitationStore` by ID.
2. `loadOccurrences()` calls `getAllCitationFootnotes()` (footnoteManager.ts line 404) to find all footnotes containing child CCs with the citation's UUID tag.
3. The occurrences list shows each footnote index where the citation appears, enabling per-occurrence removal.

### 5.2 Updating Citation Content

When the user saves edits:

1. The updated `Citation` object is written to the `CitationStore` via `store.update()`.
2. `updateCitationContent()` (footnoteManager.ts line 378) is called:
   - Uses `context.document.contentControls.getByTag(citationId)` to find ALL content controls with the citation's UUID tag across the entire document.
   - Calls `writeFormattedRunsToControl(cc, formattedRuns)` for each matching CC.
   - `writeFormattedRunsToControl()` (line 59) uses `cc.insertText(runs[0].text, "Replace")` for the first run (avoiding `cc.clear()` which could destroy structure), then appends remaining runs with `"End"`.
3. After the content update, the refresher is triggered to recalculate ibid/short-form references for all citations in the document.

### 5.3 Clicking a Child CC to Edit

Currently, there is no click-to-edit mechanism tied directly to content controls. The user navigates to the edit view from the citation library or the occurrences panel. A future enhancement (FN-004) could use the `Word.ContentControlDataChanged` event or selection tracking to detect when the cursor enters a child CC and automatically open the edit view for that citation.

**Potential approach for FN-004:**
- Register a handler for `document.onContentControlSelectionChanged` (WordApi 1.5+).
- When the event fires, read the selected CC's tag.
- If the tag is a UUID (does not start with `"obiter-"`), navigate to the edit view for that citation ID.

---

## 6. Delete Flow

### 6.1 Removing a Single Citation from a Multi-Citation Footnote

**Entry point:** `deleteCitationFootnote()` in `footnoteManager.ts` (line 466)

**Steps:**

1. **Load the footnote** (line 472-478): Access the `NoteItem` at `footnoteIndex - 1` (0-based array index from 1-based parameter).

2. **Find the parent CC** (line 483): Call `findParentCC(noteItem, context)`.

3. **Legacy fallback** (line 485-510): If no parent CC is found (legacy document), fall back to:
   - Search all content controls in the footnote body for a tag match.
   - Delete the matching CC with `cc.delete(false)`.
   - Check if the footnote body is now empty; if so, delete the entire footnote.

4. **Delete the child CC** (line 513-523): Load the parent CC's child content controls, find the one with a matching tag, and call `childCC.delete(false)`. The `false` parameter means "delete the control and its content" (not just the control wrapper).

5. **Check for remaining children** (line 532-541): Load the parent CC's content controls again. If no children remain, delete the entire footnote with `noteItem.delete()`.

6. **Refresher cleanup:** The refresher must run after deletion to remove orphaned separator text. For example, if citation 2 of 3 is deleted, the parent CC will temporarily contain: `[child1]citation1[/child1]; ; [child3]citation3[/child3].` The refresher will detect the text mismatch and rebuild cleanly as: `[child1]citation1[/child1]; [child3]citation3[/child3].`

### 6.2 Deleting All Occurrences

In `EditCitation.tsx` (line 586-593), deleting a citation entirely loops through all occurrences and calls `deleteCitationFootnote()` for each one, then removes the citation from the store.

### 6.3 Edge Case: Last Citation in Footnote

When the last child CC is removed from a parent CC (line 538-541), the entire footnote is deleted via `noteItem.delete()`. This removes the footnote reference mark from the document body and the footnote content from the footnote area. Word renumbers all subsequent footnotes automatically.

---

## 7. Migration Plan

### 7.1 Detecting Old-Model Documents

**FN-005** must handle documents created before the parent-child model was implemented. Detection strategy:

1. **On document open** (during `initStore()`), scan all footnotes for content controls.
2. **Old-model signature:** A footnote contains one or more content controls tagged with citation UUIDs, but NO content control tagged `"obiter-fn"`. The child CCs sit directly in the footnote body, not nested inside a parent.
3. **New-model signature:** A footnote contains a content control tagged `"obiter-fn"` which itself contains child CCs tagged with UUIDs.

**Detection algorithm:**
```
for each footnote:
  load body.contentControls
  hasParent = any CC with tag == "obiter-fn"
  hasLegacyChildren = any CC with tag not starting with "obiter-"

  if hasLegacyChildren && !hasParent:
    → this footnote needs migration
  if hasParent:
    → already in new model, skip
  if !hasLegacyChildren && !hasParent:
    → not an Obiter footnote, skip
```

### 7.2 Migration Steps per Footnote

For each footnote flagged as needing migration:

1. **Collect legacy child CCs:** Load all content controls in the footnote body. Filter to those whose tags do not start with `"obiter-"`.

2. **Extract content from each legacy CC:**
   - Load the CC's text and any formatted runs.
   - Record the tag (citation UUID) and title.

3. **Strip separators and closing punctuation:** The legacy model stored `"; "` and `"."` inside the citation text runs. The migration must detect and remove:
   - A trailing `"."` from the last citation's text.
   - Leading `"; "` from all citations after the first (or equivalently, trailing `"; "` from all but the last).

4. **Delete the legacy CCs:** Call `cc.delete(false)` for each legacy CC. This removes both the control and its text from the footnote body.

5. **Create the parent CC:** Insert a RichText content control at the end of the footnote's first paragraph, tagged `"obiter-fn"`.

6. **Re-insert child CCs inside the parent:** For each legacy citation (in document order), create a child CC inside the parent CC with the original UUID tag.

7. **Run the refresher:** After migration completes, the refresher will re-render all citations with proper separators and closing punctuation.

### 7.3 Migration Trigger

Migration should run:
- **On document open**, after `initStore()` completes, before the first refresh.
- **Only once per document session.** Set a flag (`migrationChecked = true`) to avoid re-scanning.
- **Non-destructively.** If migration fails partway through, the legacy model CCs remain functional (the refresher's legacy-detection code in `deleteCitationFootnote()` lines 485-510 already handles flat CCs).

### 7.4 Store Metadata

Consider adding a `ccModel` field to `StoreMetadata`:
```typescript
interface StoreMetadata {
  // ... existing fields ...
  ccModel?: "flat" | "parent-child"; // defaults to "flat" for backward compat
}
```
After successful migration, set `ccModel: "parent-child"` and persist. On subsequent opens, if `ccModel === "parent-child"`, skip the migration scan entirely.

---

## 8. API Requirements

### 8.1 Baseline: WordApi 1.5

The project's minimum API target is WordApi 1.5 (per `CLAUDE.md` line 38 and the runtime check in `taskpane.ts` line 79). All CC operations used in the parent-child model are available at 1.5:

| Feature | API | Available Since |
|---------|-----|-----------------|
| `Range.insertContentControl("RichText")` | WordApi 1.1 | Baseline |
| `ContentControl.tag` | WordApi 1.1 | Baseline |
| `ContentControl.title` | WordApi 1.1 | Baseline |
| `ContentControl.appearance` (Hidden) | WordApi 1.1 | Baseline |
| `ContentControl.clear()` | WordApi 1.1 | Baseline |
| `ContentControl.delete(keepContent)` | WordApi 1.1 | Baseline |
| `ContentControl.insertText()` | WordApi 1.1 | Baseline |
| `ContentControl.contentControls` (nested) | WordApi 1.1 | Baseline |
| `ContentControl.getRange("End")` | WordApi 1.1 | Baseline |
| `Body.footnotes` | WordApi 1.4 | Baseline |
| `Range.insertFootnote()` | WordApi 1.4 | Baseline |
| `NoteItem.body` | WordApi 1.4 | Baseline |
| `NoteItem.reference` | WordApi 1.4 | Baseline |
| `NoteItem.delete()` | WordApi 1.4 | Baseline |
| `Document.customXmlParts` | WordApi 1.4 | Baseline |
| `Range.compareLocationWith()` | WordApi 1.3 | Baseline |
| `Font.smallCaps` | WordApiDesktop 1.3 | Desktop only |

### 8.2 Features Requiring Runtime Checks

| Feature | API Set | Used For |
|---------|---------|----------|
| `Font.smallCaps` | WordApiDesktop 1.3 | Author name formatting in AGLC4 secondary sources |
| Content control selection events | WordApi 1.5 | Click-to-edit (potential future enhancement) |

The `smallCaps` property is applied unconditionally in `applyRunFormatting()` (footnoteManager.ts line 49, citationRefresher.ts line 89). On Word for Web, this property is silently ignored rather than throwing, so no runtime guard is currently needed. However, if Word for Web starts throwing on this property, a guard should be added:
```typescript
if (run.smallCaps !== undefined && Office.context.requirements.isSetSupported("WordApiDesktop", "1.3")) {
  range.font.smallCaps = run.smallCaps;
}
```

### 8.3 API Compatibility Layer

The existing `src/word/apiCompat.ts` provides:
- `getApiVersion()`: Probes WordApi versions from 1.8 down to 1.1.
- `isFeatureAvailable(feature)`: Checks named feature flags against the host's capability.
- Current feature flags cover WordApi 1.6-1.8 (customStyles, annotations, comments, trackedChanges).

No additional feature flags are needed for the parent-child CC model since all required APIs are within the 1.5 baseline.

---

## 9. Risk Assessment

### 9.1 Platform-Specific Content Control Behaviour

| Platform | Risk | Severity | Mitigation |
|----------|------|----------|------------|
| **Word for Windows (Desktop)** | Lowest risk. Content control nesting, appearance, and footnote APIs work as documented. | Low | Primary development and testing platform. |
| **Word for Mac (Desktop)** | Nested content controls may not render `"Hidden"` appearance correctly in some versions. `insertContentControl()` inside another CC has been reported to produce flat structures on older Mac builds. | Medium | Test on macOS 13+ with Microsoft 365 current channel. If nesting fails, detect via post-insertion child count check and retry. |
| **Word for Web (Online)** | `insertFootnote()` may throw `GeneralException` on some tenant configurations. Content control nesting is limited -- some Web builds flatten nested CCs. `Font.smallCaps` is silently ignored. | High | The existing try/catch in `insertCitationFootnote()` (line 361) provides a user-facing error message. Consider a Web-specific feature flag that disables the parent-child model and falls back to a flat CC model if nesting is detected as unsupported. |
| **Word for iPad** | Similar to Mac. Footnote API support is present but content control editing can be awkward due to touch input. | Medium | No code changes needed; UX testing recommended. |

### 9.2 Content Control Integrity Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **User deletes parent CC** | If a user selects all content in a footnote and deletes it, both parent and child CCs are destroyed. The store retains the citation data, but the CC-to-footnote link is broken. | The refresher's scan will detect that the citation has no CC in any footnote. The `buildFootnoteMap()` result will not include it, and `updateFirstFootnoteNumbers()` will set `firstFootnoteNumber` to `undefined`. The citation remains in the library for re-insertion. |
| **User types inside parent CC but outside child CCs** | Text entered between child CCs or after the closing period becomes orphan text. | The refresher detects the text mismatch and rebuilds from scratch, discarding the orphan text. |
| **User drags a child CC outside the parent CC** | This would break the nesting model. The orphaned child CC would not be found by the refresher's parent-child scan. | The `getAllCitationFootnotes()` scan would still find the CC (it scans all CCs in the footnote body, not just those inside parents). Consider adding a repair step that detects orphaned child CCs and re-parents them. |
| **Undo after insertion** | Word's undo may partially revert the CC insertion, leaving a parent CC without children or a child CC without a parent. | The refresher's rebuild logic handles empty parents (no children detected = skip). The deletion flow's legacy fallback (line 485-510) handles flat CCs. |
| **Copy-paste of footnotes** | Pasting a footnote duplicates the content controls, including their tags. This creates duplicate UUID tags in different footnotes, which is correct behaviour -- it represents the same citation appearing in multiple footnotes. `buildFootnoteMap()` records only the lowest footnote number. | No additional handling needed; this is the expected multi-occurrence behaviour. |

### 9.3 Performance Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Large documents with many footnotes** | The refresher's O(n) scan of all footnotes with multiple `context.sync()` calls per footnote can be slow. Each footnote requires at least 2 syncs (load CCs, load child CCs). A document with 500 footnotes = 1000+ round trips. | Batch loading: load all footnote CCs in fewer sync calls. Consider caching footnote scan results and only re-scanning changed footnotes (requires tracking which footnotes were modified). |
| **Frequent refresher invocations** | The refresher is triggered after every insert, edit, and delete operation. If the user performs rapid operations, multiple refresh cycles may overlap. | Debounce the refresh trigger. The UI should queue refreshes and only execute the most recent request after a short delay (e.g., 500ms). |
| **Parent CC clear + rebuild** | On every refresh cycle where text has changed, the parent CC is cleared and all child CCs are re-created from scratch. This is destructive and expensive. | The text comparison (`expectedText === existingText`) avoids unnecessary rebuilds. For future optimisation, consider per-child comparison and targeted updates rather than full rebuilds. |

### 9.4 Data Consistency Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Store and document out of sync** | If the store contains a citation that has no CC in any footnote, or a footnote contains a CC whose tag does not match any citation in the store, the data is inconsistent. | `buildFootnoteMap()` only records CCs that match store entries. The refresher skips child CCs whose `store.getById()` returns `undefined` (citationRefresher.ts line 211). A future validation step could report orphaned CCs or store entries. |
| **Concurrent editing (co-authoring)** | If two users edit the same document simultaneously, CC operations may conflict. One user's refresh may overwrite another's insertion before it syncs. | Word's co-authoring merges at the paragraph level. Footnotes in different paragraphs should not conflict. Footnotes in the same paragraph may see merge conflicts. This is an inherent limitation of the Office.js co-authoring model and is not specific to the parent-child CC design. |

---

## Appendix A: File Reference

| File | Purpose |
|------|---------|
| `src/word/footnoteManager.ts` | Footnote insertion, deletion, update, and CC management |
| `src/word/citationRefresher.ts` | Full-document refresh of citation formatting |
| `src/word/footnoteTracker.ts` | Footnote-number map building and first-footnote tracking |
| `src/word/apiCompat.ts` | Runtime API version detection and feature flags |
| `src/store/citationStore.ts` | Custom XML Part CRUD for citation data |
| `src/store/xmlSerializer.ts` | XML serialization/deserialization for the store |
| `src/types/citation.ts` | Citation, SourceType, StoreMetadata type definitions |
| `src/types/formattedRun.ts` | FormattedRun interface for styled text segments |
| `src/engine/rules/v4/general/footnotes.ts` | Pure-engine footnote utilities (ensureClosingPunctuation, joinMultipleCitations) |
| `src/engine/engine.ts` | Main formatting engine (formatCitation, applySignalAndCommentary) |
| `src/ui/views/InsertCitation.tsx` | Insert citation UI, calls insertCitationFootnote |
| `src/ui/views/EditCitation.tsx` | Edit citation UI, calls updateCitationContent, deleteCitationFootnote |
| `src/ui/views/CitationLibrary.tsx` | Citation library UI, calls insertCitationFootnote, refreshAllCitations |
| `src/taskpane/taskpane.ts` | Entry point with WordApi 1.5 baseline check |

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **CC** | Content Control -- a Word document element that wraps and protects a range of text |
| **Parent CC** | The outer content control (tag `obiter-fn`) that wraps all citations in a single footnote |
| **Child CC** | An inner content control (tag = citation UUID) that wraps a single citation's text |
| **Reference mark** | The superscript footnote number that appears in both the document body and the footnote area |
| **NoteItem** | The Word.js proxy object representing a footnote's content (body, reference, type) |
| **FormattedRun** | A text segment with formatting metadata (italic, bold, smallCaps, etc.) |
| **Refresher** | The `refreshAllCitations()` function that rebuilds all citation formatting in document order |
| **Store** | The CitationStore backed by a Custom XML Part embedded in the .docx file |
