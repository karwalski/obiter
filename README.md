# Obiter v1.13.0

**AGLC4, applied automatically.**

![CI](https://github.com/karwalski/obiter/actions/workflows/ci.yml/badge.svg)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Obiter is a free, open-source Microsoft Word add-in that automates AGLC4 citation formatting. Insert footnotes, generate bibliographies, and validate references -- all without leaving your document.

From *obiter dictum* -- a remark in passing. Citations are the remarks that support the argument.

**Website:** [obiter.com.au](https://obiter.com.au)
**AppSource:** [Get Obiter from Microsoft AppSource](https://marketplace.microsoft.com/en-au/product/office/WA200010629)

---

## Install

Install Obiter from [Microsoft AppSource](https://marketplace.microsoft.com/en-au/product/office/WA200010629). Click **Get it now**, confirm your details, and open in Word. Obiter appears in the Home tab of the Word ribbon, ready to use.

Automatic updates are handled by AppSource. No manual steps required after installation.

## Features

### Citation Engine

- **Full AGLC4 coverage** -- all 26 chapters, 90+ source types across domestic, secondary, international, and foreign materials. See [AGLC4 Feature Coverage](docs/aglc4-coverage.md) for the complete rule-by-rule audit
- **Automatic ibid and subsequent references** -- Obiter detects repeated sources and applies ibid, short titles, and cross-reference note numbers following Rules 1.4.1--1.4.6
- **Cross-references** -- `(n X)` fields that auto-renumber when footnotes are reordered
- **Short titles** -- assigned on first citation and used throughout subsequent references
- **Linking phrases** -- quoting, cited in, affirmed by, and other connecting phrases (Rule 1.3)
- **Explanatory footnotes** -- mixed citation and commentary within a single footnote
- **Live citation preview** -- see the formatted output before inserting
- **Click-to-edit** -- click any citation in a footnote to edit it in the task pane

### Document Tools

- **Bibliography generation** -- one-click bibliography with correct AGLC4 section ordering (Rule 1.13)
- **Document validation** -- scan for formatting issues, broken references, and missing fields
- **AGLC4 document template** -- margins, fonts, spacing, and five heading levels applied in one step
- **Quotation formatting** -- auto block quote, ellipsis insertion, [sic], editorial brackets, emphasis annotation
- **Inline body-text formatting** -- automatic italicisation of case names on subsequent mention
- **Latin term auto-italicisation** -- automatic italicisation of common Latin legal terms
- **Live refresh** -- ibid, short references, and cross-reference numbers recalculate when footnotes change
- **Citation find panel** -- search and navigate to any citation in the document

### Court Submission Mode

- **12+ jurisdictional presets** -- HCA, FCA, NSW, Vic, Qld, WA, SA, Tas, ACT, NT, and more
- **Parallel citations** -- dual MNC + authorised report formatting as required by court practice directions
- **List of Authorities generation** -- formatted for the selected jurisdiction
- **Ibid suppression** -- replaces ibid with explicit short references for court filings

### Additional Citation Standards

- **OSCOLA 5** -- Oxford University Standard for Citation of Legal Authorities, 5th edition. England and Wales, Scotland, Northern Ireland, EU, and ECHR materials
- **NZLSG 3** -- New Zealand Law Style Guide, 3rd edition. Includes Maori Land Court, Waitangi Tribunal, and general/commercial citation styles

### International and Foreign Coverage

- **International materials** -- treaties, UN documents, ICJ, PCIJ, ICC, international arbitration, WTO, GATT, EU, ECHR, and other supranational courts (Chapters 8--14)
- **15+ foreign jurisdictions** -- Canada, China, France, Germany, Hong Kong, Malaysia, New Zealand, Singapore, South Africa, United Kingdom, United States, and others (Chapters 15--26)

### AI-Assisted Citation (Optional)

- **Parse with AI** -- paste a raw citation string and extract fields automatically via multi-turn conversation
- **Help Me Choose** -- describe your source and get a source type recommendation
- **Check Reference** -- verify citation details against known legal databases
- **Error reporting** -- AI-assisted explanation of validation errors with suggested fixes
- BYO API key. No data is sent without explicit user action. Works fully without AI enabled.

### Other

- **Reference guide** -- searchable index of AGLC4 rules, abbreviations, and source types
- **Import from Word Source Manager and BibTeX**
- **Typeahead search** via AustLII, Jade.io, and Federal Register of Legislation
- **Dark mode** -- respects the Word theme
- **WCAG 2.1 AA accessible**
- **Works offline** after initial installation
- **AGLC5 ready** -- version-parameterised rule engine designed for a clean upgrade path

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
  llm/                Optional LLM integration (OpenAI, Anthropic)
  api/                External API clients (AustLII, Jade.io, legislation.gov.au)
tests/
  engine/             Unit tests per chapter
```

The document is the database. All citation metadata persists in a Custom XML Part bound to the `.docx` file. No external database required.

### Testing

Comprehensive test suites covering all AGLC4 chapters, each testing against the guide's own examples:

```
PASS tests/engine/chapter1.test.ts      (95 tests -- General Rules)
PASS tests/engine/chapter2.test.ts      (81 tests -- Cases)
PASS tests/engine/chapter3.test.ts      (85 tests -- Legislation)
PASS tests/engine/chapter4-6.test.ts    (69 tests -- Secondary Sources)
PASS tests/engine/chapter7.test.ts      (19 tests -- Other Sources)
PASS tests/engine/chapter8-14.test.ts   (39 tests -- International)
PASS tests/engine/chapter15-26.test.ts  (73 tests -- Foreign Jurisdictions)
```

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
