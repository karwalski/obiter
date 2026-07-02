// Registers the jest-axe `toHaveNoViolations` matcher for accessibility assertions.
// Component suites that render JSX must declare `@jest-environment jsdom` at the top
// of the file so axe-core has a DOM to evaluate. (WCAG conformance — see docs/progress.md A11Y-005.)
import { toHaveNoViolations } from "jest-axe";
// DOM assertion matchers (toHaveAttribute, toHaveTextContent, …) for component suites.
import "@testing-library/jest-dom";

expect.extend(toHaveNoViolations);
