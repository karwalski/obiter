/**
 * @jest-environment jsdom
 *
 * A11Y-013 — persistent status log / surfaced messages (WCAG 4.1.3 Status Messages).
 */
import * as React from "react";
import { render, fireEvent, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { StatusProvider, useStatus } from "../../src/ui/context/StatusContext";
import StatusLog from "../../src/ui/components/StatusLog";

function Emitter(): JSX.Element {
  const { announce } = useStatus();
  return (
    <button type="button" onClick={() => announce("All footnotes refreshed.", "success")}>
      go
    </button>
  );
}

function Harness(): JSX.Element {
  return (
    <StatusProvider>
      <Emitter />
      <StatusLog />
    </StatusProvider>
  );
}

describe("StatusLog", () => {
  it("renders a polite live region with the announced message", () => {
    const { container, getByText } = render(<Harness />);
    fireEvent.click(getByText("go"));
    const log = within(container).getByRole("log");
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveTextContent("All footnotes refreshed.");
  });

  it("messages are re-readable (persist until cleared)", () => {
    const { getByText, queryByText } = render(<Harness />);
    fireEvent.click(getByText("go"));
    expect(queryByText("All footnotes refreshed.")).not.toBeNull();
    fireEvent.click(getByText("Clear"));
    expect(queryByText("All footnotes refreshed.")).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container, getByText } = render(<Harness />);
    fireEvent.click(getByText("go"));
    expect(await axe(container)).toHaveNoViolations();
  });
});
