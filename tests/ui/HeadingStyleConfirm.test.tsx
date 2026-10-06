/**
 * @jest-environment jsdom
 *
 * COURT-101: the explicit set-up action shows which styles will change
 * (AGLC4 Rule 1.12.2 heading formats) and can be cancelled.
 */
import * as React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import HeadingStyleConfirm, { TEMPLATE_OTHER_CHANGES } from "../../src/ui/components/HeadingStyleConfirm";

describe("COURT-101: HeadingStyleConfirm", () => {
  it("lists Heading 1–5 changes and confirms with the heading choice", () => {
    const onConfirm = jest.fn();
    render(
      <HeadingStyleConfirm
        otherChanges={TEMPLATE_OTHER_CHANGES}
        defaultFormatHeadings={true}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );
    const list = screen.getByRole("list", { name: "Heading styles that will change" });
    expect(list.querySelectorAll("li")).toHaveLength(5);
    expect(screen.getByText(/Heading 1 \(Level I\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it("can leave built-in headings alone", () => {
    const onConfirm = jest.fn();
    render(
      <HeadingStyleConfirm
        otherChanges={[]}
        defaultFormatHeadings={true}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.queryByRole("list", { name: "Heading styles that will change" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it("starts unticked in court mode and can be cancelled", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <HeadingStyleConfirm
        otherChanges={[]}
        defaultFormatHeadings={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not offer heading restyling for non-AGLC standards", () => {
    const onConfirm = jest.fn();
    render(
      <HeadingStyleConfirm
        otherChanges={[]}
        defaultFormatHeadings={true}
        offerHeadings={false}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onConfirm).toHaveBeenCalledWith(false);
  });
});
