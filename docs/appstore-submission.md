# AppSource Submission Guide — Obiter

Complete guide for submitting Obiter to Microsoft AppSource.

---

## 1. Partner Center Registration

| Field | Value |
|-------|-------|
| Dashboard | https://partner.microsoft.com/dashboard |
| Account type | Individual developer |
| Legal name | Matthew Watt |
| Fee | ~USD $19 (one-time) |
| Email | mr.matthew.watt@gmail.com |

Sign in with a Microsoft account, complete identity verification, and pay the registration fee. Account is approved within 48 hours.

---

## 2. Product Type

When creating a new product in Partner Center, select:

**Office add-in**

This is not an MSIX, PWA, EXE, MSI, or Game. Office Add-ins are a distinct product type in Partner Center under "Office and SharePoint" > "Office add-in". The manifest.xml is uploaded directly.

---

## 3. App Listing Details

### App name

```
Obiter — AGLC4 Citation Engine
```

### Short description (96/100 characters)

```
Full AGLC4 citation formatting, ibid resolution, and bibliography generation for Microsoft Word.
```

### Long description (under 4000 characters)

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

### Release notes (v1.0.0)

```
Initial release of Obiter — AGLC4 Citation Engine.

- Full AGLC4 citation formatting across all 26 chapters and ~80 source types
- Ibid and subsequent reference resolution
- Cross-reference fields with automatic renumbering
- One-click bibliography generation with AGLC4 section headings
- Document validation against AGLC4 formatting rules
- AGLC4 heading styles (5 levels)
- Searchable reference guide for all AGLC4 rules
- Click-to-edit citations via content controls
- BibTeX and Word Source Manager import
- Optional AI integration (user-provided API key)
- Dark mode support
- WCAG 2.1 AA accessible
- Works offline
```

---

## 4. Metadata

| Field | Value |
|-------|-------|
| Categories | Productivity, Reference |
| Supported products | Word (Desktop, Web, iPad) |
| Supported locales | en-US (default), en-AU, en-GB |
| Markets | All markets (Australia primary) |
| Age rating | All ages |
| Language | English |
| Pricing | Free |

---

## 5. URLs

| Field | URL |
|-------|-----|
| Support URL | https://obiter.com.au/contact.html |
| Privacy policy | https://obiter.com.au/privacy.html |
| Terms of use | https://obiter.com.au/terms.html |
| Source location | https://obiter.com.au/app/taskpane.html |

All URLs must be live and returning 200 before submission.

---

## 6. Icon Assets

| Asset | Size | Format | Status |
|-------|------|--------|--------|
| Store icon | 300x300 | PNG | `assets/icons/obiter-300.png` |
| Icon 16px | 16x16 | PNG | `assets/icon-16.png` |
| Icon 32px | 32x32 | PNG | `assets/icon-32.png` |
| Icon 48px | 48x48 | PNG | `assets/icons/obiter-48.png` |
| Icon 64px | 64x64 | PNG | `assets/icon-64.png` |
| Icon 80px | 80x80 | PNG | `assets/icon-80.png` |
| Icon 128px | 128x128 | PNG | `assets/icon-128.png` |

---

## 7. Screenshots

Capture at **1280x720** or **1366x768**. Use a clean document with realistic legal content. Save as PNG.

| # | View | What to show |
|---|------|-------------|
| 1 | Insert Citation | Case citation form filled out with live preview |
| 2 | Citation Library | Multiple citations of varied types |
| 3 | Validation | Scan results showing errors, warnings, passes |
| 4 | Bibliography | Preview with AGLC4 section headings (A-E) |
| 5 | Reference Guide | Search field with results and rule details |
| 6 | Settings | Configuration options visible |
| 7 | Ribbon Tab | The AGLC4 tab showing all button groups |

---

## 8. Production Manifest

The production manifest (`manifest.prod.xml`) replaces all `https://localhost:3000` URLs with `https://obiter.com.au/app`. There are **13 URLs** total — a find-and-replace covers all of them.

Build the production version: `npm run build:prod`

This copies `manifest.prod.xml` into `dist/manifest.xml` with the correct URLs.

---

## 9. Certification Checklist

- [ ] All URLs use HTTPS
- [ ] Privacy policy URL accessible
- [ ] Terms of use URL accessible
- [ ] Support URL accessible
- [ ] No external scripts from untrusted domains
- [ ] Office.js loaded from official CDN
- [ ] Manifest validates: `npm run validate`
- [ ] Production manifest validates: `npx office-addin-manifest validate manifest.prod.xml`
- [ ] Works on Word for Windows
- [ ] Works on Word for Mac
- [ ] Works on Word for Web
- [ ] No console errors on load
- [ ] All features work offline (except API search and LLM)
- [ ] No advertising or promotional content
- [ ] Description accurately represents functionality
- [ ] All 7 screenshots captured
- [ ] 300x300 store icon ready

---

## 10. Common Rejection Reasons

| Reason | Mitigation |
|--------|-----------|
| Missing privacy policy | Created at obiter.com.au/privacy.html |
| Broken functionality | Run `npm test` (464 tests) + manual QA on all platforms |
| External script loading | Only Office.js from Microsoft CDN |
| Missing screenshots | Capture all 7 listed in Section 7 |
| Description too vague | Use the specific text from Section 3 |
| Icons missing or wrong size | All sizes generated including 300x300 |
| Manifest validation errors | Run `npm run validate` before submission |
| Privacy policy lacks substance | Policy covers data handling, LLM, APIs in detail |

---

## 11. Notes for Certification Team

Paste this into the "Notes for certification" field:

```
Obiter is a citation formatting tool for Australian legal citations. To test:
1. Open a Word document with footnotes.
2. Go to the AGLC4 tab in the ribbon.
3. Click "Insert Citation" to open the task pane.
4. Select a source type (e.g. "Reported Case") and fill in the fields.
5. Click "Insert" to add a formatted citation as a footnote.
6. Use "Validate" to check the document against AGLC4 rules.
7. Use "Bibliography" to generate a formatted bibliography.

No login or account is required. The add-in works fully offline.
Optional AI features require the user to provide their own API key in Settings.
```

---

## 12. Submission Steps

1. Log in to https://partner.microsoft.com/dashboard
2. Go to **Marketplace offers** > **Office and SharePoint**
3. Click **+ New offer** > **Office add-in**
4. Upload `manifest.prod.xml`
5. Fill in listing details from Sections 3-4
6. Upload screenshots from Section 7
7. Upload store icon (300x300) from Section 6
8. Enter URLs from Section 5
9. Set pricing to Free
10. Paste certification notes from Section 11
11. Click **Submit for review**

---

## 13. Post-Submission

1. **Review period**: 3-5 business days
2. **If rejected**: Fix cited issues and resubmit (restarts the review timer)
3. **Once approved**: Add-in appears in AppSource within 24 hours
4. **After listing**: Update the download page with the AppSource URL
