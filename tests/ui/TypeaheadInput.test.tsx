/**
 * @jest-environment jsdom
 *
 * A11Y-007 — keyboard-operable typeahead combobox (WCAG 2.1.1, 4.1.2).
 * Verifies the ARIA APG editable-combobox pattern: required ARIA props,
 * Down/Up/Enter/Escape behaviour, aria-activedescendant, and axe-cleanliness.
 */
import * as React from "react";
import { render, fireEvent, waitFor, within } from "@testing-library/react";
import { axe } from "jest-axe";
import TypeaheadInput from "../../src/ui/components/TypeaheadInput";

const RESULTS = [
  { sourceId: "a", title: "Mabo v Queensland (No 2)", snippet: "(1992) 175 CLR 1" },
  { sourceId: "b", title: "Cole v Whitfield", snippet: "(1988) 165 CLR 360" },
];

// Controlled wrapper so typing into the input updates the `value` prop and
// re-runs the typeahead hook, mirroring real usage on the Insert Citation form.
function Harness({ onSelect }: { onSelect: (r: unknown) => void }): JSX.Element {
  const [value, setValue] = React.useState("");
  return (
    <TypeaheadInput
      label="Case name"
      id="case"
      value={value}
      onChange={setValue}
      onSelect={onSelect as (r: never) => void}
      searchFn={async () => RESULTS as never}
      minChars={1}
      debounceMs={0}
    />
  );
}

async function openWithResults(container: HTMLElement) {
  const input = within(container).getByRole("combobox");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "ca" } });
  // Wait past the (zero) debounce and the async searchFn so options are present.
  await waitFor(() => expect(within(container).getAllByRole("option")).toHaveLength(RESULTS.length));
  return input as HTMLInputElement;
}

describe("TypeaheadInput combobox", () => {
  it("exposes required combobox ARIA props", async () => {
    const { container } = render(<Harness onSelect={jest.fn()} />);
    const input = await openWithResults(container);
    expect(input).toHaveAttribute("aria-controls");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("has no axe violations when open", async () => {
    const { container } = render(<Harness onSelect={jest.fn()} />);
    await openWithResults(container);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ArrowDown activates the first option and sets aria-activedescendant", async () => {
    const { container } = render(<Harness onSelect={jest.fn()} />);
    const input = await openWithResults(container);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const options = within(container).getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);
  });

  it("ArrowDown wraps from last back to first", async () => {
    const { container } = render(<Harness onSelect={jest.fn()} />);
    const input = await openWithResults(container);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const options = within(container).getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter selects the active option", async () => {
    const onSelect = jest.fn();
    const { container } = render(<Harness onSelect={onSelect} />);
    const input = await openWithResults(container);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(RESULTS[0]);
  });

  it("Escape closes the listbox", async () => {
    const { container } = render(<Harness onSelect={jest.fn()} />);
    const input = await openWithResults(container);
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => {
      expect(within(container).queryByRole("listbox")).toBeNull();
    });
  });

  it("announces the result count via a live region", async () => {
    const { container } = render(<Harness onSelect={jest.fn()} />);
    await openWithResults(container);
    const status = within(container).getByRole("status");
    expect(status).toHaveTextContent("2 results available");
  });
});
