/**
 * @jest-environment jsdom
 *
 * A11Y-013 — persistent status log / surfaced messages (WCAG 4.1.3 Status Messages).
 */
import * as React from "react";
import { render, fireEvent, within, act } from "@testing-library/react";
import { axe } from "jest-axe";
import { StatusProvider, useStatus } from "../../src/ui/context/StatusContext";
import StatusLog from "../../src/ui/components/StatusLog";
import { getRefreshIssues, clearRefreshIssues } from "../../src/ui/recoveryQueue";
import type { RefreshIssuesDetail } from "../../src/word/citationRefresher";

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

  // SAFE-005: the provider relays `obiter:refresh-issues` into a status
  // line pointing at the Recovery view and records the detail so the
  // Recovery view can list it later.
  it("announces refresh issues and records them in the recovery queue", () => {
    clearRefreshIssues();
    const { container } = render(<Harness />);

    const detail: RefreshIssuesDetail = {
      failures: [{ footnoteNumbers: [3], error: "insertHtml failed" }],
      userEdits: [{ footnoteNumber: 7, currentText: "mine", expectedText: "obiter" }],
    };
    act(() => {
      window.dispatchEvent(new CustomEvent("obiter:refresh-issues", { detail }));
    });

    const log = within(container).getByRole("log");
    expect(log).toHaveTextContent("1 manually edited footnote was left unchanged");
    expect(log).toHaveTextContent("1 footnote failed to rebuild");
    expect(log).toHaveTextContent("Open the Recovery view to review them.");

    const recorded = getRefreshIssues();
    expect(recorded.userEdits).toEqual(detail.userEdits);
    expect(recorded.failures).toEqual(detail.failures);
    clearRefreshIssues();
  });
});
