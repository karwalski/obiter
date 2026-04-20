# Accessibility Audit: Obiter AGLC4 Word Add-in

Audited against: [Microsoft Office Add-in Accessibility Guidelines](https://learn.microsoft.com/en-us/office/dev/add-ins/design/accessibility-guidelines) and WCAG 2.2 AA.

Date: 2026-04-18

---

## 1. Design for Multiple Input Methods

### 1.1 Keyboard Navigation (Tab + Arrow Keys)

| File | Status | Finding |
|------|--------|---------|
| Layout.tsx | PASS | Skip-to-content link present, nav uses NavLink (focusable). |
| InsertCitation.tsx | PASS | All form fields are standard `<input>`, `<select>`, `<button>` elements -- natively keyboard accessible. |
| EditCitation.tsx | PASS | Standard form elements throughout. |
| CitationLibrary.tsx | PARTIAL | Library search input missing `aria-label`. Insert menu dropdown items are buttons (good), but pinpoint input inside dropdown lacks a label. |
| Validation.tsx | PASS | Tab buttons use `role="tab"` with `aria-selected`. Standard buttons throughout. |
| Bibliography.tsx | PASS | Standard form elements. |
| Settings.tsx | PASS | Standard form elements with fieldsets and legends. |
| AbbreviationLookup.tsx | PASS | Tab bar uses `role="tablist"` and `role="tab"` with `aria-selected`. |
| TypeaheadInput.tsx | PARTIAL | Uses `role="combobox"` and `aria-autocomplete="list"`, but missing `aria-activedescendant` for keyboard-highlighted option, and no keyboard arrow-key navigation of results. |
| CitationFinder.tsx | PASS | Toggle button has `aria-expanded`. List items are buttons. |
| CrossReferenceInsert.tsx | PASS | Fieldset with legend for radio group. Labels with htmlFor. |

### 1.2 Logical Reading and Navigation Order

| File | Status | Finding |
|------|--------|---------|
| Layout.tsx | PASS | DOM order: skip link, header, nav, main, footer. |
| All views | PASS | Content follows logical document flow. |

### 1.3 ARIA Labels on Interactive Elements

| File | Status | Finding |
|------|--------|---------|
| InsertCitation.tsx | PARTIAL | Author inputs have `aria-label`. Remove buttons have `aria-label`. But the "Preview" label div is not associated with the preview region. |
| CitationLibrary.tsx | PARTIAL | Filter/sort selects have `aria-label`. Search input missing `aria-label`. Toast dismiss buttons have `aria-label`. BibTeX textarea missing `aria-label`. Pinpoint input in insert menu missing `aria-label`. |
| Validation.tsx | PASS | SVG icons have `aria-hidden="true"`. Tabs have `role="tab"` and `aria-selected`. |
| FieldHelp.tsx | PASS | Help button has `aria-label` and `aria-expanded`. Popover has `role="tooltip"`. |
| TypeaheadInput.tsx | PARTIAL | Input has `role="combobox"` and `aria-expanded`. Spinner has `aria-label="Searching"`. But dropdown items missing `aria-selected` state. |
| CitationFinder.tsx | PARTIAL | Filter input missing `aria-label`. |
| CheckReference.tsx | PASS | SVG icons have `aria-hidden="true"`. |

---

## 2. Make Your Add-in Easy to Use

### 2.1 Do Not Rely on Colour Alone to Convey Meaning

| File | Status | Finding |
|------|--------|---------|
| InsertCitation.tsx | FAIL | Feedback messages use colour (green for success, red for error) as the sole visual differentiator. No icon or text prefix. |
| EditCitation.tsx | FAIL | Error/success messages differentiated only by colour. |
| Validation.tsx | PASS | Each severity level has both an icon AND colour. Text labels ("Errors", "Warnings", "Info") also present. |
| Bibliography.tsx | FAIL | Error/success messages use colour only. |
| Settings.tsx | FAIL | Status messages (LLM test, format status, debug test) differentiated only by colour. |
| CitationLibrary.tsx | FAIL | Toast messages and error displays rely on colour alone. |
| CheckReference.tsx | PASS | Uses icons (checkmark/cross) alongside colour and text ("Citation appears correct" / "Issues found"). |
| CitationFinder.tsx | PARTIAL | Format type badges ("full", "short", "ibid") use colour coding via CSS classes but also include text labels. |

### 2.2 Focus Management

| File | Status | Finding |
|------|--------|---------|
| Layout.tsx | PASS | Skip-to-content link targets `#obiter-main`. |
| global.css | PASS | `*:focus-visible` outline defined at 2px solid accent colour with 2px offset. |
| CitationLibrary.tsx | FAIL | BibTeX modal has no focus trap. Focus does not move to modal on open. |
| CitationPreview.tsx | PARTIAL | Editing mode calls `inputRef.current?.focus()` with `setTimeout`. |
| FieldHelp.tsx | PARTIAL | Popover opens on click but does not trap focus. Escape key does not close it. |

### 2.3 No Time Limits

| All files | PASS | No time-limited interactions found. |

### 2.4 Confirm/Reverse Destructive Actions

| File | Status | Finding |
|------|--------|---------|
| EditCitation.tsx | PASS | Delete has a two-step confirmation flow. |
| CitationLibrary.tsx | PASS | Delete has a "Yes/No" confirmation. |

---

## 3. Make Your Add-in Easy to See

### 3.1 Colour Contrast

| File | Status | Finding |
|------|--------|---------|
| global.css | PASS | Primary text (#1E2A38 on #FFFFFF) exceeds 4.5:1. Accent (#2AA198 on #FFFFFF) is 3.3:1 -- borderline for normal text but acceptable for large text/UI components. |
| global.css (dark) | PASS | Dark theme text (#E6E8EB on #121417) exceeds 4.5:1. |

### 3.2 High Contrast Themes

| File | Status | PARTIAL | Not tested against Windows high contrast themes. Recommend testing with Aquatic, Desert, Dusk, Night Sky. CSS uses CSS custom properties which should adapt, but no `forced-colors` media query is present. |

---

## 4. Ensure Content and Media Are Accessible

### 4.1 Text Alternatives for Non-Text Content

| File | Status | Finding |
|------|--------|---------|
| Validation.tsx | PASS | All SVG icons have `aria-hidden="true"` and are paired with text labels. |
| CheckReference.tsx | PASS | SVG icons have `aria-hidden="true"` and paired with verdict text. |
| AbbreviationLookup.tsx | PASS | Chevron icon is `aria-hidden="true"`. |

---

## 5. Specific Gaps and Remediation

### 5.1 Form Inputs Missing Associated Labels

| Location | Gap | Remediation |
|----------|-----|-------------|
| CitationLibrary.tsx: search input (line 567) | No `<label>` or `aria-label` | Add `aria-label="Search citations"` |
| CitationLibrary.tsx: BibTeX textarea (line 522) | No label | Add `aria-label="BibTeX entries"` |
| CitationLibrary.tsx: pinpoint input (line 704) | No label | Add `aria-label="Pinpoint reference"` |
| CitationFinder.tsx: filter input (line 181) | No label | Add `aria-label="Filter citations"` |

### 5.2 Buttons Missing Accessible Names

| Location | Gap | Remediation |
|----------|-----|-------------|
| All files | PASS | All icon-only buttons already have `aria-label` attributes. |

### 5.3 Focus Management Issues

| Location | Gap | Remediation |
|----------|-----|-------------|
| CitationLibrary.tsx: BibTeX modal | No focus trap, no Escape to close | Add `role="dialog"`, `aria-modal="true"`, focus trap, Escape handler |
| FieldHelp.tsx: popover | No Escape key handler | Add keydown listener for Escape |

### 5.4 Missing aria-live Regions

| Location | Gap | Remediation |
|----------|-----|-------------|
| InsertCitation.tsx: feedback div | Dynamic content not announced | Add `aria-live="polite"` and `role="status"` |
| EditCitation.tsx: error/success messages | Dynamic content not announced | Add `aria-live="polite"` and `role="status"` |
| Validation.tsx: results summary | Dynamic content not announced | Add `aria-live="polite"` |
| Bibliography.tsx: error/success messages | Dynamic content not announced | Add `aria-live="polite"` and `role="status"` |
| CitationLibrary.tsx: toast messages | Dynamic content not announced | Add `aria-live="polite"` |
| Settings.tsx: status messages | Dynamic content not announced | Add `aria-live="polite"` and `role="status"` |
| CheckReference.tsx: result card | Dynamic content not announced | Add `aria-live="polite"` |

### 5.5 Colour as Sole Indicator of State

| Location | Gap | Remediation |
|----------|-----|-------------|
| InsertCitation.tsx: feedback | Green/red colour only | Prefix with "Success:" or "Error:" text |
| EditCitation.tsx: error/success | Green/red colour only | Prefix with "Success:" or "Error:" text |
| Bibliography.tsx: error/success | Green/red colour only | Prefix with "Success:" or "Error:" text |
| Settings.tsx: status messages | Colour only | Prefix with status text |
| CitationLibrary.tsx: toasts | No severity indicator | Already has dismiss button text |

### 5.6 Heading Hierarchy

| Location | Status | Finding |
|----------|--------|---------|
| Layout.tsx | PASS | `<h1>Obiter</h1>` in header. |
| All views | PASS | Each view uses `<h2>` as the top-level heading within `<main>`. |
| CheckReference.tsx | PASS | Uses `<h3>` inside Validation view (which is `<h2>`). |
| AbbreviationLookup.tsx | PASS | `<h2>` for view, `<h3>` for chapters, `<h4>` for sections. |
| CrossReferenceInsert.tsx | PASS | Uses `<h4>` (nested within a view). |

### 5.7 Keyboard Accessibility Patterns

| Location | Gap | Remediation |
|----------|-----|-------------|
| FieldHelp.tsx: popover | Escape does not close | Add Escape key handler |
| CitationLibrary.tsx: BibTeX modal | Escape does not close | Add Escape key handler |
| TypeaheadInput.tsx | No arrow key navigation of suggestions | Consider adding arrow key navigation (enhancement, not critical) |

---

## Summary

| Category | PASS | PARTIAL | FAIL |
|----------|------|---------|------|
| Keyboard navigation | 9 | 2 | 0 |
| ARIA labels | 5 | 3 | 0 |
| Colour as sole indicator | 3 | 1 | 5 |
| Focus management | 2 | 2 | 1 |
| aria-live regions | 0 | 0 | 7 |
| Heading hierarchy | 5 | 0 | 0 |
| Text alternatives | 3 | 0 | 0 |
| High contrast | 0 | 1 | 0 |

### Critical Fixes Applied

1. Added `aria-live="polite"` and `role="status"` to all dynamic feedback regions
2. Added text prefixes ("Success:", "Error:") alongside colour to feedback messages
3. Added missing `aria-label` attributes to unlabelled inputs
4. Added `role="dialog"`, `aria-modal="true"`, focus trap, and Escape key handler to BibTeX modal
5. Added Escape key handler to FieldHelp popover
6. Added `aria-label` to library search, BibTeX textarea, finder filter, and pinpoint inputs
