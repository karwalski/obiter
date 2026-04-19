# Obiter — AGLC4 Word Add-in

## Project Overview

**Obiter** is a Microsoft Word add-in implementing the full Australian Guide to Legal Citation, 4th Edition (AGLC4) as an integrated citation engine, document formatter, and optional AI-assisted research layer. Licensed under GPLv3.

## Absolute Reference

**AGLC4 is the single source of truth.** Every formatting decision must trace to a numbered AGLC4 rule. The reference PDF is located at `../AGLC4-with-Bookmarks-1.pdf`. When in doubt about a rule interpretation, document the question in `docs/decisions.md` for researcher review rather than guessing.

**The Obiter Style Guide** (`../obiter-style-guide.md`) governs all UI, branding, colour, typography, and component design decisions. All CSS must use the style guide's design tokens. No emoji, no exclamation marks, no casual tone in UI copy.

**Author:** Matthew Watt. Use this name on all published content, AppSource listings, and marketing. Not "karwalski".

## Architecture

- **Rule engine**: Pure TypeScript functions in `src/engine/` — no side effects, no DOM, no Office.js
- **Office.js layer**: Thin adapter in `src/word/` — the engine never imports Office.js directly
- **Data persistence**: Custom XML Parts bound to the `.docx` file
- **UI**: React + TypeScript task pane in `src/ui/`
- **Enhancement layer**: Optional LLM (`src/llm/`) and external API (`src/api/`) integrations
- **Build**: Webpack (official Office Add-in tooling) with Babel for TypeScript transpilation

## Coding Standards

- **Language**: TypeScript strict mode, no `any`
- **Linting**: ESLint with `eslint-plugin-office-addins` + Prettier (via `office-addin-prettier-config`)
- **Naming**: `camelCase` for variables/functions, `PascalCase` for types/interfaces/components, `UPPER_SNAKE_CASE` for constants
- **Tests**: Jest with babel-jest for TypeScript. Every rule module has a corresponding test file. Test names reference AGLC4 rule numbers and example numbers
- **Commits**: Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`)
- **Branches**: `main` (stable), `develop` (integration), `feat/*`, `fix/*`

## Key Constraints

- When implementing a rule, quote the AGLC4 rule text in a JSDoc comment above the function
- All rule engine code must be accompanied by unit tests referencing AGLC4 example numbers
- Commit messages must reference the AGLC4 rule number where applicable (e.g. `feat: implement ibid resolution (Rule 1.4.3)`)
- Minimum API target: WordApi 1.5. Use runtime checks for anything above 1.5
- The engine is version-parameterised: rules live in `src/engine/rules/v4/` (future `v5/`)
- Never reference specific file paths in prompts — use general descriptors

## File Structure

```
src/
  taskpane/       — Task pane entry point (HTML, CSS, TS)
  commands/       — Ribbon command entry point
  engine/         — AGLC rule engine (pure TypeScript, no DOM)
    rules/v4/     — AGLC4 rules by chapter
    rules/v5/     — Future AGLC5 overrides
    data/         — Appendices A, B, C as typed data
    formatter.ts  — Citation -> FormattedRun[]
    resolver.ts   — Subsequent reference resolution
    validator.ts  — Document-wide validation checks
  store/          — Custom XML Part read/write
  word/           — Office.js API integration layer
  ui/             — React task pane components
  llm/            — LLM integration (optional)
  api/            — External API clients (optional)
  types/          — Shared TypeScript interfaces
tests/
  engine/         — Unit tests per rule module
  integration/    — Full document scenario tests
  fixtures/       — AGLC4 example data
docs/
  decisions.md    — Pending decisions for researchers
  progress.md     — Epic/story tracking
```

## Build & Dev

- `npm run dev-server` — Start webpack dev server with HTTPS for sideloading
- `npm start` — Start dev server and sideload into Word
- `npm run build` — Production build
- `npm test` — Run Jest tests
- `npm run lint` — Lint check
- `npm run typecheck` — TypeScript type check
- `npm run validate` — Validate Office Add-in manifest

## Spec and Backlog

- Full architecture spec: `../aglc4-addin-spec.md`
- Story backlog: `../footnote-backlog.md`
