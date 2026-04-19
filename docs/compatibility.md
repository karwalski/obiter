# Obiter — Platform Compatibility Testing Guide

This document lists the features and concerns to verify on each supported
Microsoft Word platform. All testing should confirm that core AGLC4 formatting
functionality works correctly and that graceful degradation occurs where
platform capabilities differ.

## Word for Web (Office Online)

### Footnotes

- [ ] Insert a citation footnote via the task pane
- [ ] Verify footnote numbering updates when footnotes are reordered
- [ ] Confirm footnote text renders with correct AGLC4 formatting (italic, small caps, etc.)
- [ ] Delete a footnote and verify remaining footnotes renumber

### Content Controls

- [ ] Rich-text content controls render citation content correctly
- [ ] Content control tags and titles are preserved on save/reopen
- [ ] Editing inside a content control does not corrupt surrounding content
- [ ] Content controls survive round-trip (save to OneDrive, reopen)

### Custom XML Parts

- [ ] Citation data persists in Custom XML Parts after save
- [ ] Custom XML Parts survive co-authoring sessions
- [ ] Verify read/write of Custom XML Parts does not error in the web runtime
- [ ] Round-trip: save in Word for Web, open in desktop Word, and vice versa

### Task Pane

- [ ] Task pane loads and renders the React UI without errors
- [ ] Task pane communicates with the document via Office.js correctly
- [ ] Task pane resizes responsively at various browser window widths
- [ ] Verify keyboard navigation within the task pane (accessibility)

### General

- [ ] Confirm `Office.context.requirements.isSetSupported("WordApi", "1.5")` returns true
- [ ] Verify features gated on WordApi 1.6+ degrade gracefully (styles via `addStyle`)
- [ ] Check that no console errors appear during normal citation workflows
- [ ] Test with multiple browsers: Chrome, Edge, Firefox, Safari

---

## Word for iPad

### Touch-Friendly Concerns

- [ ] Task pane buttons and form inputs are large enough for touch targets (minimum 44x44 pt)
- [ ] Dropdown menus and pickers are usable with touch (no hover-dependent interactions)
- [ ] Scroll behaviour in the task pane works smoothly with touch gestures
- [ ] No elements overlap or become unreachable in portrait or landscape orientation

### Task Pane Width

- [ ] Task pane renders correctly at iPad task pane width (320 pt minimum)
- [ ] Long citation titles and field labels wrap or truncate gracefully
- [ ] Verify that horizontal scrolling is not required for any form fields
- [ ] Test at both minimum and maximum task pane widths (drag handle, if available)

### Footnotes and Content Controls

- [ ] Insert a citation footnote and verify formatting
- [ ] Content controls are editable via on-screen keyboard
- [ ] Footnote navigation (tap footnote reference to jump to footnote body) works

### Custom XML Parts

- [ ] Custom XML Part read/write operations succeed on iPad runtime
- [ ] Citation data persists across app backgrounding and resume

### General

- [ ] Confirm WordApi 1.5 baseline features are available
- [ ] Verify graceful degradation for any features above the iPad-supported API version
- [ ] Test with external keyboard attached (keyboard shortcuts, if any)
- [ ] Confirm no performance regressions with large documents (50+ footnotes)

---

## Word 2024 Perpetual (Desktop)

### WordApi 1.5 Feature Verification (Core — Must Work)

- [ ] `context.document.body` read/write operations
- [ ] Footnote insertion via `body.insertFootnote()` or equivalent
- [ ] Content control creation (`body.insertContentControl()`)
- [ ] Content control tag and title properties
- [ ] Custom XML Part CRUD operations
- [ ] Range-based font formatting (italic, bold, small caps, superscript)
- [ ] Document selection and range manipulation
- [ ] `context.sync()` batch operations complete without error

### WordApi 1.6+ Degradation (Graceful Fallback Required)

- [ ] `document.addStyle()` (1.6): verify styles are created when available;
      confirm no error when API is unavailable and manual formatting is applied instead
- [ ] Confirm that the absence of 1.6+ APIs does not block citation insertion
- [ ] Verify warning or informational message is shown when optional features are unavailable

### WordApi 1.7+ Degradation

- [ ] Annotations API: confirm feature is hidden or disabled when unavailable
- [ ] Checkbox content controls: confirm graceful fallback
- [ ] Verify `isFeatureAvailable()` returns `false` for 1.7 features on 1.5/1.6 runtimes

### WordApi 1.8+ Degradation

- [ ] Comments API: confirm feature is hidden or disabled when unavailable
- [ ] Verify no runtime errors from attempting to use unavailable comment APIs

### General Desktop Testing

- [ ] AGLC4 styles applied correctly (block quote, heading levels, footnote text)
- [ ] Citation round-trip: insert, save, close, reopen, verify formatting preserved
- [ ] Large document performance (100+ footnotes, 50+ unique sources)
- [ ] Verify add-in manifest validates and sideloads correctly
- [ ] Test on both Windows and macOS builds of Word 2024
