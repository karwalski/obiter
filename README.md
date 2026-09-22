# Obiter v1.17.0

**AGLC4, applied automatically.**

![CI](https://github.com/karwalski/obiter/actions/workflows/ci.yml/badge.svg)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Obiter is a free, open-source Microsoft Word add-in that automates AGLC4 citation formatting. Insert footnotes, generate bibliographies, and validate references -- all without leaving your document.

From *obiter dictum* -- a remark in passing. Citations are the remarks that support the argument.

**Website:** [obiter.com.au](https://obiter.com.au)
**AppSource:** [Get Obiter from Microsoft AppSource](https://marketplace.microsoft.com/en-au/product/office/WA200010629)

---

## Install

Install Obiter from [Microsoft AppSource](https://marketplace.microsoft.com/en-au/product/office/WA200010629). Click **Get it now**, confirm your details, and open in Word. Obiter appears in its own **Obiter** tab in the Word ribbon, ready to use.

Automatic updates are handled by AppSource. No manual steps required after installation.

## Features

### Inserting citations

- **Every AGLC4 source type** -- all 26 chapters, 80+ source types across domestic, secondary, international and foreign materials. See [AGLC4 Feature Coverage](docs/aglc4-coverage.md) for the rule-by-rule audit
- **Insert by source type** -- pick the source type, fill in the fields the rule requires, and Obiter inserts the footnote at the cursor. Typeahead search draws on AustLII, Jade.io and the Federal Register of Legislation
- **Live preview** -- the formatted citation, with its italics and punctuation, is shown before you insert. The preview is editable: click into it to adjust an unusual citation, and the edited text is inserted as a manual override
- **Parse with AI (optional)** -- paste a citation into **Paste Citation** and click **Parse** to have the fields extracted, or use **Help me choose** to identify the source type from a description. Bring your own API key
- **Short titles, linking phrases and explanatory footnotes** -- short titles are assigned on first citation; quoting, cited in, affirmed by and the other Rule 1.3 phrases connect citations; commentary and citations mix in one footnote
- **Click to edit** -- click any citation Obiter inserted and the Edit view opens with its data loaded

### Subsequent references

- **Ibid** -- repeated sources get *ibid* when the preceding footnote cites that single source (Rule 1.4.3), and a short form otherwise
- **Short forms with cross-reference notes** -- `Short Title (n X)` where X is the footnote of the first full citation, held as fields so the numbers follow reordering (Rules 1.4.1--1.4.6)
- **Refresh All** -- one action rescans the document and recalculates every ibid, short form and cross-reference number. Auto-refresh runs it after every insert if you leave it on
- **Occurrences and locks** -- see every footnote a source appears in, change one occurrence's format or pinpoint, or lock a footnote so a refresh never overwrites a hand correction

### Checking the document

- **Validation** -- scans the whole document for footnote structure, missing required fields, typography (dashes, quotation marks, ellipses), date and number formatting, and abbreviations against the AGLC4 appendices; results are grouped by severity and click through to the footnote
- **Check Reference with AI (optional)** -- verifies a citation's details against known sources and returns suggestions for you to confirm
- **Format inline references** -- finds citation-like text in the body of a draft and offers to convert it to footnote citations

### Bibliography

- **One-step bibliography** -- every citation sorted into the AGLC4 sections (Articles/Books/Reports, Cases, Legislation, Treaties, Other) and ordered within each (Rule 1.13); previewed in the pane, inserted at the end of the document, replaced on regeneration
- **Include only cited sources** -- leave out library entries you no longer cite

### Styling and quotations

- **AGLC4 document setup** -- margins, fonts, spacing and footnote formatting applied in one step, with a Title & Author section (Rule 1.12.1) and the five heading levels I--V (Rule 1.12.2)
- **Quotation tools** -- **Format Quotation** sets a selection as a block quotation for three or more lines or in single quotation marks otherwise (Rule 1.5.1); **Apply Block Quote**, **Insert Ellipsis** (Rule 1.5.3), **Editorial [Brackets]** (Rule 1.5.4), **Insert [sic]** (Rule 1.5.5), the five **Insert Annotation** clauses of Rule 1.5.7, and **Add Emphasis**, which italicises the selection and appends "(emphasis added)" (Rule 1.8.1)
- **Latin auto-italicisation** -- common Latin legal terms italicised in body text and footnotes
- **Inline body-text formatting** -- case names italicised on subsequent mention in the body

### Quote from a source (paste or PDF)

- **Quote panel** -- reached from **Quote from a source…** in Styling, the **Quote** button on a library card, or the command palette. Paste a passage, choose the source and its pinpoint, and Obiter inserts the quotation and a footnote carrying the pinpoint (Rule 1.7.1), placed after the quotation (Rule 1.1.3)
- **Paragraph markers become pinpoints** -- a judgment's own `[42]` markers are detected, removed from the quotation and offered as the paragraph pinpoint, set in square brackets with an en dash for spans (Rules 1.1.6 and 1.1.7)
- **Block or inline** -- three or more lines become an indented block quotation without quotation marks; shorter passages are set inline in single quotation marks (Rule 1.5.1)
- **Load a PDF** -- the text of a judgment or article is extracted on your device; pick a page, select the passage, click **Use selection**, and the printed page number (PDF page plus a **Page offset**) is offered as the page pinpoint. Nothing is uploaded

### Summarise and ask (optional AI)

- **Summarise** the passage or PDF pages you loaded, or **Ask** a question about them, with your own API key. Only the text you loaded and ticked is sent, and only when you press the button, which names the provider and the number of words it will send. Answers are drawn only from that text. Insert the result as a note or copy it

### Citation library

- **Library view** -- every citation in the document with search, source-type filter and sort; insert as Auto, Full, Short or Ibid with a pinpoint
- **Tags** -- add tags in the Edit view (Enter or a comma adds one; system tags from imports are shown read-only). Tags appear as chips on library cards, filter the library, and travel as keywords when you export and import
- **Find duplicates** -- a library-wide sweep groups records that share a DOI, ISBN, citation key, medium neutral or report citation, or statute title and year, or that have a similar title and year. Choose which record to keep, pick the value of every field that differs, and **Merge**: the other records' footnotes are retargeted to the survivor and a snapshot is taken first. **Not a duplicate** is remembered so the group does not return
- **Record details** -- in the Edit view: when a record was created and modified, where it came from (import format or the online source it was found through), its identifiers (DOI, ISBN, ISSN, cite key, accession and call numbers), abstract and notes, the passthrough fields kept for export, links to the source (URL, DOI, AustLII, Jade), **Cases citing this** via LawCite and Jade, and the previous versions held in the document's backups, each restorable
- **Update from source** -- re-query the online source a citation was found through (or any enabled source for its type) and lay the result beside the current values; fields the library has blank are pre-selected, every other difference waits for you, and **Apply selected** writes the merge. Honours the source lookup toggles in Settings
- **Cited by** -- for a journal article with a DOI, **Look up citing works** lists the works that cite it (OpenAlex) with a count (Crossref); **Add to library** stores a citing work as a journal article linked to the article it cites with the Rule 1.3 phrase "citing"
- **Import** -- RIS from library catalogues, EndNote XML (including libraries built with the UTS AGLC4 reference types), BibTeX, CSL-JSON and Word's Source Manager. Every record is previewed with the AGLC source type Obiter chose, the formatted citation and its status; retype or exclude rows, and tick **Update existing** to refresh a record exported from this document rather than duplicate it
- **Export** -- the whole library, the selected citations, or the ones shown by the current search, as RIS, EndNote XML (UTS AGLC4 or generic reference types), BibTeX, CSL-JSON or a formatted AGLC list; download, copy to the clipboard or show as text

### Repair and recovery

- **Scan & Repair** -- a read-only deep scan of body, footnotes and endnotes that relinks Obiter citation markers, rebuilds lost library entries and adopts plain-text citations; nothing changes until you confirm the preview
- **Recovery** -- restore the library from an in-document snapshot, put back a footnote's previous text, review footnotes a refresh skipped because you had edited them, and salvage quarantined data

### Court submission mode

- **12+ jurisdictional presets** -- HCA, FCA, NSW, Vic, Qld, WA, SA, Tas, ACT, NT and more
- **Parallel citations** -- medium neutral plus authorised report, as court practice directions require
- **List of Authorities** -- generated for the selected jurisdiction
- **Ibid suppression** -- explicit short forms in place of ibid for filed documents

### Other standards and jurisdictions

- **OSCOLA 5** -- Oxford University Standard for Citation of Legal Authorities, 5th edition: England and Wales, Scotland, Northern Ireland, EU and ECHR materials
- **NZLSG 3** -- New Zealand Law Style Guide, 3rd edition, including Maori Land Court, Waitangi Tribunal, and general and commercial styles
- **International materials** -- treaties, UN documents, ICJ, PCIJ, ICC, international arbitration, WTO, GATT, EU, ECHR and other supranational courts (Chapters 8--14)
- **12 foreign jurisdictions** -- Canada, China, France, Germany, Hong Kong, Malaysia, New Zealand, Singapore, South Africa, United Kingdom, United States and others (Chapters 15--26)
- **AGLC5 ready** -- version-parameterised rule engine designed for a clean upgrade path

### Reference guide

- **Searchable rules** -- the rules of the active standard by keyword or rule number, with an **Abbreviations** tab for Appendices A--C and a **Source Types** tab listing the required and optional fields of every type

### Accounts (optional)

- **Sign in** from Settings to keep your provider API keys in an encrypted vault and to sync settings across devices. Sync carries the AI configuration (never the key), auto-refresh, template preferences and court toggles; signing in on another device restores the provider and turns the AI features back on
- **Multi-factor authentication** with an authenticator app, **Export my data**, and **Delete account**, all from the task pane or the web portal. Obiter works fully without an account, and citation data is never synced

### Everywhere

- **Command palette** (Ctrl/Cmd + K) runs any action by name; **dark mode** follows the Word theme; **WCAG 2.2 AA** accessible with Comfort mode, reduced-motion and Windows Contrast Themes support; works offline after installation

## Accessibility and keyboard

Obiter is built to be usable without a mouse and under assistive technology. See
[ACCESSIBILITY.md](ACCESSIBILITY.md) and the
[accessibility statement](https://obiter.com.au/accessibility.html) for the full conformance picture.

**Quick start (keyboard only):**

1. Open the **Obiter** tab in the Word ribbon and launch the task pane.
2. Press **Ctrl/Cmd + K** to open the command palette, type `insert`, and press **Enter** -- or **Tab** to the Insert view.
3. **Tab** to the citation field, type to search, use the **arrow keys** to choose a result, and **Enter** to select it.
4. **Tab** to **Insert** and press **Enter**. The footnote is inserted as a native Word footnote.
5. Press **Ctrl/Cmd + K** again and run **Refresh all footnotes**, or **Generate bibliography**, the same way.

**Keyboard shortcuts:**

| Keys | Action |
|------|--------|
| `Ctrl/Cmd + K` | Open the command palette (run any action) |
| `Ctrl/Cmd + /` | Open the keyboard shortcuts reference |
| `Tab` / `Shift + Tab` | Move between controls |
| Arrow keys | Move within a list or the citation search results |
| `Enter` | Activate the focused control or selected result |
| `Esc` | Close a menu, dialog, or the command palette |

The palette trigger key is customisable, and **Comfort mode** (Settings, or via the palette) enlarges
targets and text, widens spacing, and turns off motion.

## System Requirements

- Microsoft Word 2024 or Microsoft 365
- Windows 10+, macOS 12+, Word for Web, or iPad
- Internet required only for initial installation

## Development

### Setup

```bash
git clone https://github.com/karwalski/obiter.git
cd obiter
npm install
```

### Commands

```bash
npm start            # Start dev server and sideload into Word
npm run dev-server   # Start webpack dev server with HTTPS
npm run build        # Production build
npm test             # Run tests
npm run lint         # Lint
npm run typecheck    # Type check
npm run validate     # Validate Office Add-in manifest
```

### Architecture

Obiter is a pure-function citation engine with a thin Office.js adapter layer:

```
src/
  engine/             Pure TypeScript rule engine (no DOM, no Office.js)
    rules/v4/         AGLC4 rules by chapter
    rules/v5/         Future AGLC5 overrides (scaffolded)
    data/             Report series, court identifiers, pinpoint abbreviations
    resolver.ts       Subsequent reference resolution (ibid, short titles)
    validator.ts      Document-wide validation checks
  store/              Custom XML Part persistence (citation data in .docx)
  word/               Office.js adapter layer (footnotes, content controls, styles)
  ui/                 React 18 task pane
  llm/                Optional LLM integration (OpenAI, Anthropic, Gemini, Grok, DeepSeek, custom)
  api/                External API clients (AustLII, Jade.io, legislation.gov.au) and
                      interchange codecs (RIS, EndNote XML, BibTeX, CSL-JSON)
tests/
  engine/             Unit tests per chapter
```

The document is the database. All citation metadata persists in a Custom XML Part bound to the `.docx` file. No external database required.

### Testing

Comprehensive test suites covering all AGLC4 chapters, the engine, the Word
integration layer, the API adapters, and the UI — each chapter tested against the
guide's own examples. **2,000+ tests** in total:

```
npm test
# Test Suites: all passed
# Tests:       2,000+ passed
```

## Security and privacy

Obiter has no remote-control channel and no server-side copy of your work: citation data lives
in a Custom XML Part inside your own `.docx`, and document content leaves your machine only via
optional, user-initiated LLM or source-lookup calls. A PDF loaded into the Quote panel is read in
the browser and its text never leaves your device; the AI summarise and ask features send only
the text you loaded and submitted, and only when you press the button that names the provider
and the size of the request. Trust boundaries, threat classes, mitigations, and accepted risks
are documented in the [threat model](docs/THREAT-MODEL.md).

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines.

- **Bug reports and feature requests:** [GitHub Issues](https://github.com/karwalski/obiter/issues)
- **Code contributions:** Fork, branch (`feat/*` or `fix/*`), PR against `develop`
- **AGLC4 rule corrections:** If you find a formatting discrepancy, open an issue referencing the rule number and expected output

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Commit messages should reference AGLC4 rule numbers where applicable:

```
feat: implement ibid resolution (Rule 1.4.3)
```

## Support

Obiter is free to use and always will be. If you find it useful, you can support its development on [Ko-fi](https://ko-fi.com/matthewwatt).

## Author

**Matthew Watt**

## License

GNU General Public License v3.0 -- see [LICENSE](LICENSE).

Obiter is free software. You can redistribute it and/or modify it under the terms of the GPL. The AGLC4 rules implemented in this software are functional procedures; the reference data (report series abbreviations, court identifiers) is independently compiled from public domain sources.
