# AppSource Submission Guide — Obiter

This document covers everything required to submit Obiter to Microsoft AppSource (the Office Add-in marketplace).

---

## 1. Partner Center Registration

| Field         | Value                                              |
|---------------|----------------------------------------------------|
| Dashboard     | https://partner.microsoft.com/dashboard            |
| Account type  | Individual developer                               |
| Legal name    | Matthew Watt                                       |
| Fee           | ~USD $19 (one-time)                                |
| Email         | mr.matthew.watt@gmail.com                          |

Sign in with a Microsoft account, complete identity verification, and pay the registration fee. The account is approved within 48 hours.

---

## 2. App Listing Details

### App name

```
Obiter — AGLC4 Citation Engine
```

### Short description (100 chars max)

```
Full AGLC4 citation formatting, ibid resolution, and bibliography generation for Microsoft Word.
```

### Long description (4000 chars max)

```
Obiter is a free, open-source Microsoft Word add-in that implements the full
Australian Guide to Legal Citation, 4th Edition (AGLC4). It covers all ~80
source types across all 26 chapters — including international materials and
foreign jurisdictions that no existing tool supports.

FEATURES:
• Automatic citation formatting for cases, legislation, journal articles,
  books, reports, treaties, and 70+ other source types
• Ibid and subsequent reference resolution — automatically determines when
  to use Ibid, short references (n X), or full citations based on footnote
  position
• Cross-reference fields that auto-renumber when footnotes are reordered
• One-click bibliography generation with AGLC4 section headings
  (A Articles/Books/Reports, B Cases, C Legislation, D Treaties, E Other)
• Document validation against AGLC4 formatting rules (punctuation, dashes,
  abbreviations, dates, numbers, footnote structure)
• AGLC4 heading styles (5 levels with auto-numbering)
• Searchable reference guide covering all AGLC4 rules, abbreviations, and
  source types
• Click-to-edit citations via content controls
• Import citations from Word's Source Manager or BibTeX files
• Optional AI integration for citation parsing and verification (user
  provides their own API key — no data sent without explicit user action)
• Dark mode support (respects Word's theme)
• WCAG 2.1 AA accessible
• Works offline — no internet connection required for core features
• AGLC5-ready architecture

WHO IS IT FOR:
Australian law students, legal academics, practitioners, and anyone who
needs to cite legal sources according to AGLC4. Particularly useful for
thesis writers, journal editors, and researchers working with international
and foreign legal materials that existing tools cannot handle.

PRIVACY:
Obiter does not collect any usage data, analytics, or telemetry. All
citation data remains in your document. Optional AI features require
user-provided API keys and only process text that users explicitly select.
See our full privacy policy at https://obiter.com.au/privacy.html.
```

### Metadata

| Field              | Value                           |
|--------------------|---------------------------------|
| Categories         | Productivity, Reference         |
| Supported products | Word (Desktop, Web, iPad)       |
| Supported locales  | en-US, en-AU, en-GB             |

---

## 3. Screenshots Needed

Capture each screenshot at **1280x720** or **1366x768** resolution. Use a clean document with realistic legal content.

| #  | View                   | What to show                                                               |
|----|------------------------|----------------------------------------------------------------------------|
| 1  | Insert Citation        | Case citation form filled out with a live preview of the formatted output  |
| 2  | Citation Library       | Multiple citations of varied types (case, legislation, journal article)    |
| 3  | Validation             | Scan results showing a mix of errors, warnings, and passes                 |
| 4  | Bibliography           | Preview pane with AGLC4 section headings (A through E)                    |
| 5  | Reference Guide        | Search field with results displayed, showing rule details                  |
| 6  | Settings               | Settings view showing configuration options                                |
| 7  | Ribbon Tab             | The AGLC4 ribbon tab showing all button groups (Citation, Document, Tools) |

Save as PNG. AppSource also accepts JPEG but PNG preserves text clarity in UI screenshots.

---

## 4. Icon Assets Required

| Asset       | Size      | Format | Notes                                          |
|-------------|-----------|--------|-------------------------------------------------|
| Store icon  | 300x300   | PNG    | Create from `obiter.png` — required for listing |
| Icon 16px   | 16x16     | PNG    | Already exists at `assets/icon-16.png`          |
| Icon 32px   | 32x32     | PNG    | Already exists at `assets/icon-32.png`          |
| Icon 48px   | 48x48     | PNG    | Already exists at `assets/icon-48.png`          |
| Icon 64px   | 64x64     | PNG    | Already exists at `assets/icon-64.png`          |
| Icon 80px   | 80x80     | PNG    | Already exists at `assets/icon-80.png`          |
| Icon 128px  | 128x128   | PNG    | Already exists at `assets/icon-128.png`         |

The 300x300 store icon is the only new asset needed. Generate it from the source `obiter.png` with padding appropriate for the AppSource tile grid.

---

## 5. URLs for Submission

```
Support URL:      https://obiter.com.au/contact.html
Privacy policy:   https://obiter.com.au/privacy.html
Terms of use:     https://obiter.com.au/terms.html
Source location:  https://obiter.com.au/app/taskpane.html  (production)
```

All four URLs must be live and returning 200 before submission.

---

## 6. Manifest Changes for Production

Every `localhost:3000` URL in `manifest.xml` must be changed to `obiter.com.au/app` for the production manifest. The full list:

| Resource ID                  | Development (localhost)                              | Production                                              |
|------------------------------|------------------------------------------------------|---------------------------------------------------------|
| `IconUrl`                    | `https://localhost:3000/assets/icon-32.png`          | `https://obiter.com.au/app/assets/icon-32.png`          |
| `HighResolutionIconUrl`      | `https://localhost:3000/assets/icon-64.png`          | `https://obiter.com.au/app/assets/icon-64.png`          |
| `SourceLocation`             | `https://localhost:3000/taskpane.html`               | `https://obiter.com.au/app/taskpane.html`               |
| `Icon.16x16`                 | `https://localhost:3000/assets/icon-16.png`          | `https://obiter.com.au/app/assets/icon-16.png`          |
| `Icon.32x32`                 | `https://localhost:3000/assets/icon-32.png`          | `https://obiter.com.au/app/assets/icon-32.png`          |
| `Icon.80x80`                 | `https://localhost:3000/assets/icon-80.png`          | `https://obiter.com.au/app/assets/icon-80.png`          |
| `Commands.Url`               | `https://localhost:3000/commands.html`               | `https://obiter.com.au/app/commands.html`               |
| `Taskpane.Url`               | `https://localhost:3000/taskpane.html`               | `https://obiter.com.au/app/taskpane.html`               |
| `Taskpane.Library.Url`       | `https://localhost:3000/taskpane.html#library`       | `https://obiter.com.au/app/taskpane.html#library`       |
| `Taskpane.Validate.Url`      | `https://localhost:3000/taskpane.html#validation`    | `https://obiter.com.au/app/taskpane.html#validation`    |
| `Taskpane.Bibliography.Url`  | `https://localhost:3000/taskpane.html#bibliography`  | `https://obiter.com.au/app/taskpane.html#bibliography`  |
| `Taskpane.Guide.Url`         | `https://localhost:3000/taskpane.html#guide`         | `https://obiter.com.au/app/taskpane.html#guide`         |
| `Taskpane.Settings.Url`      | `https://localhost:3000/taskpane.html#settings`      | `https://obiter.com.au/app/taskpane.html#settings`      |

That is **13 URLs** total. A find-and-replace of `https://localhost:3000` with `https://obiter.com.au/app` covers all of them.

Maintain a separate production manifest (e.g. `manifest.prod.xml`) or use a build-time substitution so the development manifest is never accidentally submitted.

---

## 7. Certification Checklist

Before submitting, verify every item:

- [ ] All URLs use HTTPS
- [ ] Privacy policy URL accessible (`https://obiter.com.au/privacy.html`)
- [ ] Terms of use URL accessible (`https://obiter.com.au/terms.html`)
- [ ] Support URL accessible (`https://obiter.com.au/contact.html`)
- [ ] No external scripts from untrusted domains
- [ ] Office.js loaded from official CDN (`https://appsforoffice.microsoft.com/lib/1/hosted/office.js`)
- [ ] Manifest validates with `npm run validate`
- [ ] Works on Word for Windows
- [ ] Works on Word for Mac
- [ ] Works on Word for Web
- [ ] No console errors on load
- [ ] All features work offline (except API search and LLM)
- [ ] No advertising or promotional content in the add-in
- [ ] Description accurately represents functionality

---

## 8. Common Rejection Reasons

| Rejection reason                | How we address it                                                        |
|---------------------------------|--------------------------------------------------------------------------|
| Missing privacy policy          | Created at `https://obiter.com.au/privacy.html`                         |
| Broken functionality            | Run full test suite (`npm test`) and manual QA on all three platforms    |
| External script loading         | Only Office.js from the Microsoft CDN; no other external scripts        |
| Missing screenshots             | Capture all 7 screenshots listed in Section 3                           |
| Description too vague           | Use the specific long description text from Section 2                   |
| Icons missing or wrong size     | Provide all required sizes including the 300x300 store icon             |
| Manifest validation errors      | Run `npm run validate` and fix any issues before submission             |
| Privacy policy lacks substance  | Policy explicitly states no data collection, no telemetry, no analytics |

---

## 9. Post-Submission

1. **Review period**: 3-5 business days. Microsoft reviews the manifest, tests basic functionality, and checks policy compliance.
2. **If rejected**: Read the rejection report, fix every cited issue, and resubmit. Each resubmission restarts the review timer.
3. **Once approved**: The add-in appears in AppSource within 24 hours of approval.
4. **After listing**: Update the Obiter website download page (`https://obiter.com.au`) with the AppSource link so users can install directly from Word.
