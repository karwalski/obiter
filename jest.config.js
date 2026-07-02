module.exports = {
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.tsx"],
  transform: {
    "^.+\\.tsx?$": "babel-jest",
  },
  // jest-axe matcher (toHaveNoViolations) is registered globally for every suite.
  // Component suites that need a DOM opt in per-file with `@jest-environment jsdom`.
  setupFilesAfterEnv: ["<rootDir>/tests/setup-axe.ts"],
  passWithNoTests: true,
};
