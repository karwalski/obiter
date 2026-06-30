# Contributing to Obiter

Thanks for your interest in improving Obiter, the AGLC4 Word add-in. This guide
covers how to report issues and contribute code. Obiter is free software under
the GPLv3.

## Ways to contribute

- **Bug reports and feature requests** — open a [GitHub issue](https://github.com/karwalski/obiter/issues)
  using the templates in `.github/ISSUE_TEMPLATE`.
- **AGLC4 rule corrections** — if a citation formats incorrectly, open an issue
  that references the **AGLC4 rule number**, the input you used, the output you
  got, and the output you expected.
- **Code contributions** — see below.

## Guiding principle: AGLC4 is the source of truth

Every formatting decision must trace to a numbered AGLC4 rule. Quote the rule
text in a JSDoc comment above the function that implements it. If a rule is
ambiguous, document the question in `docs/decisions.md` for researcher review
rather than guessing.

## Development setup

```
npm install
npm run dev-server   # HTTPS dev server for sideloading
npm start            # dev server + sideload into Word
```

Useful checks:

```
npm test             # Jest (2,000+ tests)
npm run lint         # ESLint (office-addins + prettier)
npm run typecheck    # TypeScript, strict mode
npm run validate     # validate the Office manifest
```

## Coding standards

- **TypeScript strict mode** — no `any`.
- **Naming** — `camelCase` for variables/functions, `PascalCase` for
  types/interfaces/components, `UPPER_SNAKE_CASE` for constants.
- **Engine purity** — code in `src/engine/` is pure TypeScript: no DOM, no
  Office.js, no side effects. The Office.js adapter lives in `src/word/`.
- **Tests** — every rule module has a matching test file. Test names should
  reference AGLC4 rule and example numbers.
- **Minimum API target** — WordApi 1.5; guard anything above it with a runtime
  check.

## Branches and commits

- Branch from `develop` using `feat/*` or `fix/*`; open pull requests against
  `develop` (`main` is the stable release branch).
- Use [Conventional Commits](https://www.conventionalcommits.org/), referencing
  the AGLC4 rule number where applicable:

  ```
  feat: implement ibid resolution (Rule 1.4.3)
  fix: keep case year roman in footnotes (Rule 2.2)
  ```

## Pull request checklist

- [ ] `npm test`, `npm run lint`, and `npm run typecheck` pass.
- [ ] New or changed rule logic has tests referencing AGLC4 examples.
- [ ] Rule implementations quote the AGLC4 rule text in a JSDoc comment.
- [ ] User-facing copy follows the Obiter style guide (no emoji, no exclamation
      marks, no casual tone).

By contributing, you agree that your contributions are licensed under the GPLv3.
