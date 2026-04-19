# Obiter

**AGLC4, applied automatically.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Obiter is a free, open-source Microsoft Word add-in that implements the full [Australian Guide to Legal Citation, 4th Edition (AGLC4)](https://law.unimelb.edu.au/mulr/aglc) as an integrated citation engine, document formatter, and research layer.

From *obiter dictum* — a remark in passing. Citations are the remarks that support the argument. Also sounds like "oh, better" — which is what your citations become.

**Website:** [obiter.com.au](https://obiter.com.au)

---

## Why Obiter?

Nothing comparable exists. The closest tools — Zotero's community AGLC4 CSL style and EndNote's UTS output style — cover roughly 30% of AGLC4 source types, have known bugs with subsequent references and parallel citations, and cannot handle international materials (Parts IV–V). No existing Word add-in targets AGLC4 at all.

Obiter covers all ~80 source types across all 26 chapters, including:
- Domestic cases and legislation (Chapters 2–3)
- All secondary sources — journals, books, reports, Hansard, newspapers, interviews, social media (Chapters 4–7)
- International materials — treaties, UN documents, ICJ, ICC, WTO, EU, ECHR (Chapters 8–14)
- Foreign jurisdictions — Canada, China, France, Germany, Hong Kong, Malaysia, New Zealand, Singapore, South Africa, UK, USA (Chapters 15–26)

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
| AGLC4 source types | ~80 (all) | ~15 (AU only) | ~20 |
| International materials | Yes (Parts IV–V) | No | No |
| Foreign jurisdictions | 12 countries | No | No |
| Automatic ibid | Full (Rule 1.4.3) | Partial (bugs) | Partial (manual) |
| Cross-reference fields | Auto `(n X)` | Manual | Manual |
| Document validation | Full Ch 1 rules | No | No |
| Bibliography generation | Automatic (Rule 1.13) | Partial | Partial |
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

Obiter's architecture is designed for a clean upgrade path to AGLC5. The rule engine is version-parameterised (`rules/v4/`, `rules/v5/`), and a one-click migration tool is planned.

We have published an [open letter](https://obiter.com.au/aglc5.html) to the MULR and AGLC5 Committee requesting early preview access to draft rules, to ensure Obiter can support AGLC5 from day one of publication. If you support this initiative, please [add your name](https://obiter.com.au/aglc5.html).

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
