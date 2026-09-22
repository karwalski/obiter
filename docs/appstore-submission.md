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

The listing text below is the v1.17.0 refresh (22 September 2026) and is the text to paste into Partner Center. `docs/appstore-listing.md` is the single source; keep the two in step.

### App name

```
Obiter — AGLC4 Citation Engine
```

### Short description (96/100 characters)

```
AGLC4 citation engine for Word: 80+ source types, ibid, bibliography, validation and court mode.
```

### Long description (under 4000 characters; 7172 characters)

```
Obiter is a free, open-source Microsoft Word add-in that implements the full Australian Guide to Legal Citation, 4th Edition (AGLC4). It covers 80+ source types across all 26 chapters, including international materials and 12 foreign jurisdictions, and handles the position-dependent rules (ibid, short references, cross-references, parallel citations) as you write.

CITATION ENGINE:

- Automatic citation formatting for cases, legislation, journal articles, books, reports, treaties, and 80+ other source types
- Ibid and subsequent reference resolution — automatically determines when to use Ibid, short references (n X), or full citations based on footnote position
- Cross-reference fields that auto-renumber when footnotes are reordered
- Short titles assigned on first citation and used throughout subsequent references
- Linking phrases — quoting, cited in, affirmed by, and other connecting phrases between sources (Rule 1.3)
- Explanatory footnotes — add commentary alongside citations with correct separator formatting
- Live citation preview before insertion
- Click-to-edit citations via content controls

DOCUMENT TOOLS:

- One-click bibliography generation with AGLC4 section headings (A Articles/Books/Reports, B Cases, C Legislation, D Treaties, E Other)
- Document validation against AGLC4 formatting rules with "Go to" navigation for each finding
- Scan and Repair — rebuilds the citation library from an existing document, relinks Obiter citations that have become detached, and adopts plain-text citations found in footnotes, including documents not created with Obiter
- AGLC4 heading styles (5 levels with auto-numbering per Rule 1.12.2)
- AGLC4 document template — margins, fonts, spacing applied in one step
- Quotation formatting tools — auto block quote detection, ellipsis insertion, [sic], editorial brackets, emphasis annotation (Rules 1.5.1-1.5.7)
- Inline body-text formatting — automatic italicisation of case names on subsequent mention, and italics preserved inside titles (eg a case name within an article title)
- Latin and foreign term handling — common legal terms italicised per Rule 1.8.3, with Macquarie-listed terms correctly left in roman
- Searchable reference guide covering all AGLC4 rules, abbreviations, and source types
- Quote from a source — paste a passage from a judgment or load a PDF (text is read in your browser and never uploaded); paragraph markers such as [42] become the pinpoint; three or more lines become an AGLC4 block quote, shorter passages are set in single quotation marks, and the footnote with its pinpoint is placed after the quotation (Rules 1.1.3, 1.5.1, 1.7.1)

CITATION LIBRARY:

- Tags — group sources by matter, chapter or topic, filter the library by tag, and carry tags as keywords when you export
- Find duplicates — one sweep over the library matches records by DOI, ISBN, citation key, medium neutral or report citation, statute title and year, or title, year and author; keep one record, merge the fields you choose, and every footnote follows the survivor
- Record details — see where a citation came from, its identifiers, abstract and notes, links to the source (URL, DOI, AustLII, Jade), cases citing it via LawCite and Jade, and previous versions saved in the document with one-click restore
- Update from source — re-query the online source a citation was found in and merge new or corrected fields side by side
- Cited by — for journal articles with a DOI, see how often and by whom the article is cited (OpenAlex and Crossref) and add a citing work to the library in one step
- Import from RIS, EndNote XML, BibTeX, CSL-JSON and Word's Source Manager with a preview before anything is written; export the library or a selection in any of those formats or as formatted text, so a library moves between Obiter and any reference manager

COURT SUBMISSION MODE:

- 12+ jurisdictional presets — HCA, FCA, NSW, Vic, Qld, WA, SA, Tas, ACT, NT, and more
- Parallel citations — dual MNC + authorised report formatting per court practice directions
- List of Authorities generation — simple, Part A/B, or HCA Joint Book format
- Ibid suppression — replaces ibid with explicit short references for court filings

ADDITIONAL CITATION STANDARDS:

- OSCOLA 5 — Oxford University Standard for Citation of Legal Authorities (England and Wales, Scotland, Northern Ireland, EU, ECHR)
- NZLSG 3 — New Zealand Law Style Guide (including Maori Land Court, Waitangi Tribunal, and general/commercial citation styles)

INTERNATIONAL AND FOREIGN COVERAGE:

- Treaties, UN documents, ICJ, PCIJ, ICC, international arbitration, WTO, GATT, EU, ECHR, and other supranational courts (Chapters 8-14)
- 12 foreign jurisdictions — Canada, China, France, Germany, Hong Kong, Malaysia, New Zealand, Singapore, South Africa, United Kingdom, United States, and others (Chapters 15-26)

AI-ASSISTED CITATION (OPTIONAL):

- Multi-turn AI parser — paste a raw citation and extract structured fields automatically
- Source type classification — describe your source and get a recommendation
- Citation verification — check citation details against known legal databases
- Suggested short titles for first citations
- Summarise or ask about a passage you have loaded into the Quote panel — only the text you loaded is sent, and only after a button that shows the provider and the size of what will be sent
- BYO API key. No data is sent without explicit user action. Works fully without AI enabled.
- Supports OpenAI, Anthropic, Google Gemini, Grok, and DeepSeek providers

OTHER:

- Optional Obiter account — keep provider keys in a server-side vault, sync your settings across devices, and have your AI configuration restored when you sign in; multi-factor authentication, data export and account deletion included
- Typeahead search across the Open Australian Legal Corpus, NSW Caselaw, court and Hansard feeds, the Federal Register of Legislation, Crossref, OpenAlex and DOAJ, with links out to AustLII and Jade
- Open Australian Legal Corpus integration (232,000+ entries for offline lookup)
- Dark mode support (respects Word theme)
- WCAG 2.1 AA accessible
- Works offline — no internet connection required for core features
- Error reporting with optional anonymous diagnostics
- AGLC5-ready architecture

WHO IS IT FOR:

Australian law students, legal academics, practitioners, and anyone who needs to cite legal sources according to AGLC4. Particularly useful for thesis writers, journal editors, court practitioners preparing submissions, and researchers working with international and foreign legal materials.

PRIVACY:

Obiter collects no personal data and no document content. When it opens, it sends a single anonymous load count (the app version, your Word version, and your operating system — no identifying information). All citation data remains in your document. Optional AI features require user-provided API keys and only process text that users explicitly select or load and submit. PDFs opened in the Quote panel are read in the browser and never uploaded. Optional error reporting is anonymous and requires explicit user consent. See our full privacy policy at https://obiter.com.au/privacy.html.
```

### Release notes (v1.17.0)

```
Obiter 1.17.0

- Quote from a source: paste a passage or load a judgment PDF (read on your device, never uploaded); paragraph markers become the pinpoint; block or inline quotation per Rule 1.5.1 with the footnote placed after it
- Citation library: tags and a tag filter; Find duplicates with a field-by-field merge and footnotes retargeted; Record details with source links, cases citing (LawCite, Jade) and restorable previous versions; Update from source; Cited by for journal articles (OpenAlex, Crossref)
- Import and export: RIS, EndNote XML (UTS AGLC4 reference types), BibTeX, CSL-JSON and Word Source Manager, with a preview before anything is written
- Optional AI: summarise or ask about a loaded passage with your own key; only the text you loaded is sent, only when you press the button that names the provider and the size
- Accounts: settings now sync across devices and the AI provider is restored on sign-in
- Fixes: multi-author short forms; book chapter editors; paste text cleared after insert; sign-in restoring AI settings
```

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
| Broken functionality | Run `npm test` (2,000+ tests) + manual QA on all platforms |
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
