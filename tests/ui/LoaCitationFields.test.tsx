/**
 * @jest-environment jsdom
 *
 * COURT-116 / COURT-118: the List of Authorities fields in Edit Citation.
 * Shown only for the controls the document's layout reads (register O-K9:
 * `loaPart` and `isKeyAuthority` had no UI); the legislation version only
 * for layouts that state it (HCA Form 27A; NSW SC CA 1 cl 37(1); FCA
 * GPN-eBOOKS cl 7.4).
 */
import * as React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import LoaCitationFields from "../../src/ui/components/LoaCitationFields";
import type { LoaType } from "../../src/engine/standards/types";

function renderFields(
  loaType: LoaType | undefined,
  sourceType: string,
  loaPart?: "A" | "B",
  isKeyAuthority = false
) {
  const onPartChange = jest.fn();
  const onKeyAuthorityChange = jest.fn();
  const onDataChange = jest.fn();
  const utils = render(
    <LoaCitationFields
      loaType={loaType}
      sourceType={sourceType}
      loaPart={loaPart}
      isKeyAuthority={isKeyAuthority}
      data={{}}
      onPartChange={onPartChange}
      onKeyAuthorityChange={onKeyAuthorityChange}
      onDataChange={onDataChange}
    />
  );
  return { ...utils, onPartChange, onKeyAuthorityChange, onDataChange };
}

describe("COURT-116: LoaCitationFields", () => {
  test("nothing is shown for an academic document or a simple list", () => {
    expect(renderFields(undefined, "case.reported").container.innerHTML).toBe("");
    expect(renderFields("simple", "case.reported").container.innerHTML).toBe("");
  });

  test("Part A / Part B: the placement and the key-authority marker can be set", () => {
    const { onPartChange, onKeyAuthorityChange } = renderFields("part-ab", "case.reported");
    fireEvent.change(screen.getByLabelText(/Placement/), { target: { value: "A" } });
    expect(onPartChange).toHaveBeenCalledWith("A");
    fireEvent.click(screen.getByLabelText(/Key authority/));
    expect(onKeyAuthorityChange).toHaveBeenCalledWith(true);
  });

  test("WA PD 2.1 cl 13: pages or paragraphs to be read appear once the case is to be read", () => {
    renderFields("wa-outline-asterisk", "case.reported", "B");
    expect(screen.queryByLabelText("Pages or paragraphs to be read")).toBeNull();
  });

  test("WA PD 2.1 cl 13: the passages field writes loaReadPassages", () => {
    const { onDataChange } = renderFields("wa-outline-asterisk", "case.reported", "A");
    fireEvent.change(screen.getByLabelText("Pages or paragraphs to be read"), {
      target: { value: "[29]–[35]" },
    });
    expect(onDataChange).toHaveBeenCalledWith("loaReadPassages", "[29]–[35]");
  });

  test("WA PD 2.1 cl 13: an older key-authority flag shows as to be read and is cleared on moving out", () => {
    const { onPartChange, onKeyAuthorityChange } = renderFields(
      "wa-outline-asterisk",
      "case.reported",
      undefined,
      true
    );
    const select = screen.getByLabelText(/Placement/) as HTMLSelectElement;
    expect(select.value).toBe("A");
    fireEvent.change(select, { target: { value: "B" } });
    expect(onPartChange).toHaveBeenCalledWith("B");
    expect(onKeyAuthorityChange).toHaveBeenCalledWith(false);
  });

  test("HCA: principal legislation and the legislation version (COURT-118)", () => {
    const { onDataChange } = renderFields("hca-jba-five-part", "legislation.statute");
    fireEvent.click(screen.getByLabelText(/Principal legislation/));
    expect(onDataChange).toHaveBeenCalledWith("jbaPrincipal", true);
    fireEvent.change(screen.getByLabelText("Version date (as at)"), {
      target: { value: "2019-12-15" },
    });
    expect(onDataChange).toHaveBeenCalledWith("versionDate", "2019-12-15");
    fireEvent.change(screen.getByLabelText("Legislation version"), {
      target: { value: "compilation" },
    });
    expect(onDataChange).toHaveBeenCalledWith("versionKind", "compilation");
  });

  test("a case under the FCA eBook layout has no List of Authorities fields", () => {
    expect(renderFields("fca-ebook-sections", "case.reported").container.innerHTML).toBe("");
  });

  test("has no axe violations", async () => {
    const { container } = renderFields("nswca-four-category", "legislation.statute");
    expect(await axe(container)).toHaveNoViolations();
  });
});
