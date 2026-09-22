module.exports = {
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.tsx"],
  transform: {
    "^.+\\.tsx?$": "babel-jest",
  },
  // jest-axe matcher (toHaveNoViolations) is registered globally for every suite.
  // Component suites that need a DOM opt in per-file with `@jest-environment jsdom`.
  setupFilesAfterEnv: ["<rootDir>/tests/setup-axe.ts"],
  passWithNoTests: true,
  // UI suites run axe on every render; under a full parallel run the 5 s default
  // trips on whichever suite is scheduled last. 30 s keeps the gate meaningful.
  testTimeout: 30000,
};
