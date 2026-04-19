# Obiter

**AGLC4, applied automatically.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Obiter is a free, open-source Microsoft Word add-in that implements the full [Australian Guide to Legal Citation, 4th Edition (AGLC4)](https://law.unimelb.edu.au/mulr/aglc) as an integrated citation engine, document formatter, and research layer.

From *obiter dictum* — a remark in passing. Citations are the remarks that support the argument. Also sounds like "oh, better" — which is what your citations become.

**Website:** [obiter.com.au](https://obiter.com.au)

---

## Why Obiter Exists

AGLC4 has no working, comprehensive software implementation. Seven years after publication, this is the state of play:

**The official CSL style is frozen and deliberately narrow.** The AGLC4 CSL style in Zotero's official repository has not been updated since 2020. Its creator, Adam Smith, was candid about its scope: it was "deliberately scoped to cover Australian cases and legislation and wouldn't try to handle anything else." International materials (Rules 8--14) -- treaties, UN documents, ICJ, international arbitration, international criminal tribunals, and supranational materials -- have zero tool support. Smith's explanation is structural: "Zotero simply doesn't have the ability to properly store/identify such materials and so we can't implement them in any citation style."

**The style is broken enough that users are generating patches with AI.** Two independent, AI-generated community patches for the AGLC4 CSL now exist on GitHub because no other mechanism has worked. One practitioner working on an 80,000-word research piece bypassed the official style entirely, recruiting Claude to produce a CSL patch because Zotero's style mangles dual MNC-plus-authorised-report citations (the format every Federal Court practitioner is required to produce under court practice directions like Supreme Court of Queensland Practice Direction 1 of 2024). A second researcher did the same with Claude Code in February 2026.

**EndNote fares no better.** The UTS-developed AGLC4 EndNote style is the de facto national standard -- UWA, SCU, ECU, ANU, Macquarie, UTas, Wollongong, Notre Dame, Deakin, and ACU all redirect users to download UTS's files. Yet the UTS User Guide admits that EndNote "doesn't know what the required first footnote number is," so every `(n X)` cross-reference must be inserted as a Word cross-reference field by hand and re-pressed with F9 before submission. A custom Legal Reference Types Table had to be distributed separately because EndNote's default types do not include Case (Reported), Case (Medium Neutral), Statute, Treaty, Parliamentary Debate, Committee Report, Gazette, Legal Encyclopedia, or Looseleaf Service. Macquarie's LibGuide tells users to "Ignore Part 6: EndNote and Word -- categorising your reference list" and follow a divergent method -- institutional forking of the official guidance to route around tool limits.

**The guide itself required early correction.** The AGLC4 Erratum, dated 29 July 2019, acknowledged errors on 17 pages of the 337-page guide within nine months of publication. If a portion of the printed guide required correction that quickly, the case for software-first review during drafting is difficult to dispute.

**Five community repositories currently shoulder the gap** between AGLC4 and usable software (see [Community](#community) below). Obiter joins that effort as an open-source Word add-in that covers all ~80 source types across all 26 chapters, including:

- Domestic cases and legislation (Chapters 2--3)
- All secondary sources -- journals, books, reports, Hansard, newspapers, interviews, social media (Chapters 4--7)
- International materials -- treaties, UN documents, ICJ, ICC, WTO, EU, ECHR (Chapters 8--14)
- Foreign jurisdictions -- Canada, China, France, Germany, Hong Kong, Malaysia, New Zealand, Singapore, South Africa, UK, USA (Chapters 15--26)

## Features

| Feature | Status |
|---------|--------|
| Full AGLC4 citation formatting (all source types) | Implemented |
| Automatic ibid and subsequent reference resolution | Implemented |
| Cross-reference fields (`(n X)`) that auto-renumber | Implemented |
| Click-to-edit citations via content controls | Implemented |
| Document validation against AGLC4 rules | Implemented |
| Bibliography generation (Rule 1.13) | Implemented |
| AGLC4 heading styles (5 levels with auto-numbering) | Implemented |
| AGLC4 document template (margins, fonts, spacing) | Implemented |
| Inline body-text formatting (auto-italicise case names) | Implemented |
| Live citation refresh on footnote reorder | Implemented |
| Citation find panel with go-to navigation | Implemented |
| Import from Word's built-in Source Manager | Implemented |
| AGLC4 XSL style for Word's citation style picker | Included |
| Reference guide — searchable rules, abbreviations, source types | Implemented |
| Typeahead search via AustLII, Jade.io, Federal Register | Implemented |
| Optional LLM integration (citation parsing, verification) | Implemented |
| Dark mode (respects Word theme) | Implemented |
| WCAG 2.1 AA accessibility | Implemented |
| AGLC5-ready architecture (version-parameterised engine) | Scaffolded |

## Competitive Positioning

| Feature | Obiter | Zotero + AGLC4 CSL | EndNote + UTS Style |
|---------|--------|---------------------|---------------------|
| AGLC4 source types | ~80 (all) | ~15 (AU cases and legislation only; creator confirms style was deliberately scoped to exclude all else) | ~20 (custom Legal Reference Types Table required; default types lack Case, Statute, Treaty, Gazette, etc.) |
| International materials (Rules 8--14) | Yes -- treaties, UN, ICJ, ICC, WTO, EU, ECHR | No ("Zotero simply doesn't have the ability to properly store/identify such materials") | No |
| Foreign jurisdictions (Chs 15--26) | 12 countries | No | No |
| Parallel citations (Rule 2.2.7) | Full (MNC + authorised report) | Broken -- populating both fields "mangles" output; two AI-generated community patches exist to work around it | No support |
| Automatic ibid (Rule 1.4.3) | Full | Partial -- short titles rendered in italics when parent is roman (violating Rule 1.4.4); Bill type wraps subsequent refs in stray quotes | Partial (manual) |
| Cross-reference fields `(n X)` | Auto-inserted, auto-renumbering | Manual | Manual -- UTS guide requires hand-inserted Word cross-reference for every `(n X)`, re-pressed with F9 before submission |
| "Below n" references (Rule 1.4.2) | Supported | Architecturally impossible in CSL (processor is forward-only) | Not supported |
| Jurisdiction-conditional brackets | Automatic (round vs square per reporter) | CSL spec forbids content-testing of variables; cannot express round-vs-square bracket rules | Not supported |
| GenAI citation | Supported | No rule exists in AGLC4; interim guidance only (via Rule 7.12 analogy) | No rule exists |
| Document validation | Full Ch 1 rules | No | No |
| Bibliography generation | Automatic (Rule 1.13) | Partial | Partial -- "some reference types may not be able to be categorised" |
| Pandoc / LaTeX workflow | N/A (Word add-in) | CSL behaves differently in pandoc-citeproc vs citeproc-js due to deprecated `match` default | No |
| Style last updated | Active development | 2020 (no updates in 6 years) | Maintained by UTS |
| Works offline | Yes | Yes | Yes |
| Price | Free (GPLv3) | Free | Institutional |

## Requirements

- Microsoft Word 2024 or Microsoft 365 (WordApi 1.5+)
- Supported on Windows, Mac, Web, and iPad
- Node.js 22 LTS (for development)

## Getting Started

### Install from AppSource

*Coming soon — submission in progress.*

### Sideload for Development

```bash
git clone https://github.com/karwalski/obiter.git
cd obiter
npm install
npm start            # Starts dev server + sideloads into Word
```

### Development Commands

```bash
npm run dev-server   # Start webpack dev server with HTTPS
npm start            # Start dev server and sideload into Word
npm run build        # Production build
npm test             # Run tests (464 tests across 7 suites)
npm run lint         # Lint
npm run typecheck    # Type check
npm run validate     # Validate Office Add-in manifest
```

## Architecture

Obiter is designed as a pure-function citation engine with a thin Office.js adapter layer:

```
src/
  engine/             Pure TypeScript rule engine (no DOM, no Office.js)
    rules/v4/         AGLC4 rules by chapter
    rules/v5/         Future AGLC5 overrides (scaffolded)
    data/             Report series, court identifiers, pinpoint abbreviations
    resolver.ts       Subsequent reference resolution (ibid, short titles)
    validator.ts      Document-wide validation checks
    engine.ts         Main dispatcher: Citation + Context → FormattedRun[]
  store/              Custom XML Part persistence (citation data in .docx)
  word/               Office.js adapter layer (footnotes, content controls, styles)
  ui/                 React 18 task pane with routing
  llm/                Optional LLM integration (OpenAI, Anthropic)
  api/                External API clients (AustLII, Jade.io, legislation.gov.au)
tests/
  engine/             Unit tests per chapter (464 tests using AGLC4's own examples)
website/              Marketing site + backend (Node.js, SQLite, Gmail API)
```

**Key design decisions:**
- **AGLC4 is the single source of truth.** Every formatting decision traces to a numbered rule.
- **The document is the database.** All citation metadata persists in a Custom XML Part bound to the `.docx` file. No external database required.
- **Version-aware rule engine.** Rules are parameterised by AGLC version. The engine supports AGLC4 at launch and is structurally ready for AGLC5.
- **Progressive enhancement.** The add-in works fully offline with manual data entry. LLM and API integrations are opt-in enhancements.

## AGLC5

Obiter's architecture is designed for a clean upgrade path to AGLC5. The rule engine is version-parameterised (`rules/v4/`, `rules/v5/`), and a one-click migration tool is planned. On the AGLC's ~8-year edition cycle (1998, 2002, 2010, 2018), AGLC5 publication is most likely in late 2026 or 2027. See the [Community](#community) section for our open letter to the AGLC5 Committee.

## Community

Five open-source repositories currently shoulder the gap between AGLC4 and usable citation software:

| Repository | Description |
|------------|-------------|
| [citation-style-language/styles](https://github.com/citation-style-language/styles) | The official AGLC4 CSL file. Last substantive update 2020. Covers Australian cases and legislation only. |
| [LawData-user/zotero-aglc4](https://github.com/LawData-user/zotero-aglc4) | Claude-assisted CSL patch for dual MNC + authorised report citations, by a practitioner who describes the work as "not great... but functional for me." |
| [ybanens/AGLC4-CSL-with-Case-fix](https://github.com/ybanens/AGLC4-CSL-with-Case-fix) | Claude Code-assisted CSL patch for the same case-citation problem (February 2026). |
| [McJones/AGLCLaTeX](https://github.com/McJones/AGLCLaTeX) | LaTeX BibLaTeX implementation. Catalogues unsupported materials honestly; open issue since 2020 reports breakage on current TeX Live distributions. |
| [cormacrelf/aglc4](https://github.com/cormacrelf/aglc4) | Cormac Relf's CSL fork with a test corpus, noting that "some of the error messages from citeproc-js are extremely unhelpful." |

Obiter joins this ecosystem as the sixth major community effort and the only Word-native implementation.

**AGLC5 Open Letter:** We have published an [open letter to the AGLC5 Committee](https://obiter.com.au/aglc5.html) requesting that draft rules be shared with tool implementers during the drafting phase. If you support this initiative, please [add your name](https://obiter.com.au/aglc5.html).

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines.

- **Bug reports and feature requests:** [GitHub Issues](https://github.com/karwalski/obiter/issues)
- **Code contributions:** Fork, branch (`feat/*` or `fix/*`), PR against `develop`
- **AGLC4 rule corrections:** If you find a formatting discrepancy, please open an issue referencing the rule number and expected output

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new feature
- `fix:` bug fix
- `test:` adding tests
- `docs:` documentation
- `refactor:` code restructuring

Commit messages should reference AGLC4 rule numbers where applicable:
```
feat: implement ibid resolution (Rule 1.4.3)
```

## Testing

464 tests across 7 test suites, each testing against AGLC4's own examples from the guide:

```
PASS tests/engine/chapter1.test.ts      (95 tests — General Rules)
PASS tests/engine/chapter2.test.ts      (81 tests — Cases)
PASS tests/engine/chapter3.test.ts      (85 tests — Legislation)
PASS tests/engine/chapter4-6.test.ts    (69 tests — Secondary Sources)
PASS tests/engine/chapter7.test.ts      (19 tests — Other Sources)
PASS tests/engine/chapter8-14.test.ts   (39 tests — International)
PASS tests/engine/chapter15-26.test.ts  (73 tests — Foreign Jurisdictions)
```

## Author

**Matthew Watt**

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).

Obiter is free software. You can redistribute it and/or modify it under the terms of the GPL. The AGLC4 rules implemented in this software are functional procedures; the reference data (report series abbreviations, court identifiers) is independently compiled from public domain sources.
