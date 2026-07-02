/**
 * @jest-environment jsdom
 *
 * A11Y-029 — keyboard-first command palette (WCAG 2.1.1, 4.1.2).
 */
import * as React from "react";
import { render, fireEvent, within } from "@testing-library/react";
import { axe } from "jest-axe";
import CommandPalette, { type PaletteCommand } from "../../src/ui/components/CommandPalette";

function makeCommands(run: jest.Mock): PaletteCommand[] {
  return [
    { id: "insert", label: "Insert a citation", keywords: "footnote", run },
    { id: "biblio", label: "Go to Biblio", run: jest.fn() },
    { id: "refresh", label: "Refresh all footnotes", run: jest.fn() },
  ];
}

describe("CommandPalette", () => {
  it("exposes the combobox/listbox ARIA structure", () => {
    const { container } = render(<CommandPalette commands={makeCommands(jest.fn())} onClose={jest.fn()} />);
    const input = within(container).getByRole("combobox");
    expect(input).toHaveAttribute("aria-controls");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(within(container).getByRole("listbox")).toBeInTheDocument();
  });

  it("filters commands by typed query", () => {
    const { container } = render(<CommandPalette commands={makeCommands(jest.fn())} onClose={jest.fn()} />);
    const input = within(container).getByRole("combobox");
    fireEvent.change(input, { target: { value: "refresh" } });
    const options = within(container).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Refresh all footnotes");
  });

  it("runs the active command on Enter and closes", () => {
    const run = jest.fn();
    const onClose = jest.fn();
    const { container } = render(<CommandPalette commands={makeCommands(run)} onClose={onClose} />);
    const input = within(container).getByRole("combobox");
    // First command is active by default; Enter runs it.
    fireEvent.keyDown(input, { key: "Enter" });
    expect(run).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ArrowDown moves the active option and sets aria-activedescendant", () => {
    const { container } = render(<CommandPalette commands={makeCommands(jest.fn())} onClose={jest.fn()} />);
    const input = within(container).getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const options = within(container).getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", options[1].id);
  });

  it("Escape closes the palette", () => {
    const onClose = jest.fn();
    const { container } = render(<CommandPalette commands={makeCommands(jest.fn())} onClose={onClose} />);
    fireEvent.keyDown(within(container).getByRole("combobox"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(<CommandPalette commands={makeCommands(jest.fn())} onClose={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
