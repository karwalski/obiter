module.exports = {
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "babel-jest",
  },
  passWithNoTests: true,
};
