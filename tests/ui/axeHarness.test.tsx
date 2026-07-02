/**
 * @jest-environment jsdom
 *
 * Smoke test for the jest-axe accessibility harness (A11Y-005).
 * Confirms axe-core runs under jsdom and the toHaveNoViolations matcher is wired.
 */
import * as React from "react";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";

describe("a11y harness", () => {
  it("flags an accessible control as clean", async () => {
    const { container } = render(
      <button type="button" aria-label="Insert citation">
        Insert
      </button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("detects a known violation (button with no accessible name)", async () => {
    const { container } = render(<button type="button" />);
    const results = await axe(container);
    expect(results.violations.length).toBeGreaterThan(0);
  });
});
