// Project ESLint flat config (ESLint 9). office-addin-lint prefers this file over its
// bundled config. Extends the office-addins recommended rules and layers jsx-a11y on the
// React surfaces so accessibility regressions are caught at lint time (A11Y-005).
//
// Note: the bundled office-addins config does not match .tsx files, so the block below is
// the only thing that lints the task-pane components. It runs jsx-a11y only; type-level
// symbol resolution (Word, Office, JSX) stays with `tsc --noEmit`, so core `no-undef`
// is disabled here to avoid false positives on ambient Office.js / JSX globals.
import officeAddins from "eslint-plugin-office-addins";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default [
  ...officeAddins.configs.recommended,
  {
    plugins: {
      "office-addins": officeAddins,
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      // TypeScript (`tsc --noEmit`, run separately in CI) resolves every symbol, so core
      // `no-undef` is redundant here and only misfires on ambient Office.js globals
      // (Office, Word, OfficeExtension, DOMParser, …). Disabling it is the standard
      // typescript-eslint guidance. See INFRA-010.
      "no-undef": "off",
      // Honour the `_`-prefix convention for intentionally-unused symbols. Adapter
      // interface methods (search/lookup/format/getById) must keep their positional
      // params even when an adapter doesn't use them all; these are marked `_`, not dead.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Debug integration-test harness (INFRA-010). The `retrieved` objects it reads are
    // plain in-memory Citation objects returned by CitationStore.getById() — a custom
    // XML Part store, not Word.* Office proxy objects — so load()/context.sync() do not
    // apply. The office-addins proxy heuristics fire 19 false positives here; disabled
    // file-wide rather than repeating 19 identical inline justifications.
    files: ["src/debug/testRunner.ts"],
    rules: {
      "office-addins/load-object-before-read": "off",
      "office-addins/call-sync-before-read": "off",
    },
  },
  {
    files: ["src/ui/**/*.tsx", "src/ui/**/*.jsx"],
    plugins: { "jsx-a11y": jsxA11y },
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // This block exists to add the jsx-a11y gate to the React surfaces. It deliberately
      // does not take on the project's broader pre-existing lint debt: core rules that
      // misfire on TS positions (no-undef/no-unused-vars on type-annotation parameters) or
      // that flag unrelated legacy code (no-useless-escape in regexes) are left to
      // `tsc --noEmit` and the existing .ts lint pass.
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-useless-escape": "off",
    },
  },
];
