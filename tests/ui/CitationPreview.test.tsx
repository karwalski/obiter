/**
 * @jest-environment jsdom
 *
 * BUG-002 — free-text ('edit directly') citation parser and manual-citation
 * escape hatch.
 *
 * The field defect: pasting `Smith v Land & House Property Corporation
 * (1884) 28 Ch D 7` into 'edit directly' produced a parse error and there
 * was no way to force an override. Parties must split ONLY on ' v '
 * (AGLC4 rule 2.1.1) — '&'/'and' are part of the party name — and a parse
 * failure must never be a dead end.
 */
import * as React from "react";
import { render, fireEvent, within } from "@testing-library/react";
import CitationPreview, { parseCitationText } from "../../src/ui/components/CitationPreview";
import type { FormattedRun } from "../../src/types/formattedRun";

describe("parseCitationText (BUG-002)", () => {
  describe("'&' and 'and' inside party names (AGLC4 rule 2.1.1)", () => {
    it("parses the reported field citation with '&' in the second party", () => {
      const { data, warnings } = parseCitationText(
        "Smith v Land & House Property Corporation (1884) 28 Ch D 7",
        "case.reported",
      );
      expect(warnings).toEqual([]);
      expect(data.party1).toBe("Smith");
      expect(data.party2).toBe("Land & House Property Corporation");
      expect(data.year).toBe(1884);
      expect(data.yearType).toBe("round");
      expect(data.volume).toBe(28);
      expect(data.reportSeries).toBe("Ch D");
      expect(data.startingPage).toBe(7);
    });

    it("parses the 'and' variant identically", () => {
      const { data, warnings } = parseCitationText(
        "Smith v Land and House Property Corporation (1884) 28 Ch D 7",
        "case.reported",
      );
      expect(warnings).toEqual([]);
      expect(data.party1).toBe("Smith");
      expect(data.party2).toBe("Land and House Property Corporation");
      expect(data.year).toBe(1884);
      expect(data.volume).toBe(28);
      expect(data.reportSeries).toBe("Ch D");
      expect(data.startingPage).toBe(7);
    });

    it("keeps '&' in the first party whole (only ' v ' splits parties)", () => {
      const { data, warnings } = parseCitationText(
        "Herald & Weekly Times Ltd v Popovic (2003) 9 VR 1",
        "case.reported",
      );
      expect(warnings).toEqual([]);
      expect(data.party1).toBe("Herald & Weekly Times Ltd");
      expect(data.party2).toBe("Popovic");
      expect(data.volume).toBe(9);
      expect(data.reportSeries).toBe("VR");
      expect(data.startingPage).toBe(1);
    });
  });

  describe("historical UK pattern and existing patterns (regression)", () => {
    it("parses a round-bracket year with multi-word series and trailing full stop", () => {
      const { data, warnings } = parseCitationText(
        "Smith v Land & House Property Corporation (1884) 28 Ch D 7.",
        "case.reported",
      );
      expect(warnings).toEqual([]);
      expect(data.reportSeries).toBe("Ch D");
      expect(data.startingPage).toBe(7);
    });

    it("survives a Word paste containing a line break inside the citation", () => {
      const { data, warnings } = parseCitationText(
        "Smith v Land & House Property\r\nCorporation (1884) 28 Ch D 7",
        "case.reported",
      );
      expect(warnings).toEqual([]);
      expect(data.party2).toBe("Land & House Property Corporation");
      expect(data.reportSeries).toBe("Ch D");
    });

    it("regression: [2019] UKSC 5-style MNC parses to court and number, not series/page", () => {
      const { data, warnings } = parseCitationText("R v Adams [2019] UKSC 5", "case.reported");
      expect(warnings).toEqual([]);
      expect(data.party1).toBe("R");
      expect(data.party2).toBe("Adams");
      expect(data.year).toBe(2019);
      expect(data.yearType).toBe("square");
      expect(data.courtId).toBe("UKSC");
      expect(data.mnc).toBe("5");
      // aliases for case.unreported.mnc consumers
      expect(data.court).toBe("UKSC");
      expect(data.caseNumber).toBe("5");
    });

    it("regression: (2002) 123 FCR 298-style volume/series/page still parses", () => {
      const { data, warnings } = parseCitationText(
        "NAAV v Minister for Immigration and Multicultural and Indigenous Affairs (2002) 123 FCR 298",
        "case.reported",
      );
      expect(warnings).toEqual([]);
      expect(data.party2).toBe("Minister for Immigration and Multicultural and Indigenous Affairs");
      expect(data.volume).toBe(123);
      expect(data.reportSeries).toBe("FCR");
      expect(data.startingPage).toBe(298);
    });

    it("regression: statute pattern still parses", () => {
      const { data, warnings } = parseCitationText(
        "Competition and Consumer Act 2010 (Cth)",
        "legislation.statute",
      );
      expect(warnings).toEqual([]);
      expect(data.title).toBe("Competition and Consumer Act");
      expect(data.year).toBe(2010);
      expect(data.jurisdiction).toBe("Cth");
    });

    it("still warns (non-blocking) when a case citation is unrecognisable", () => {
      const { data, warnings } = parseCitationText("complete nonsense", "case.reported");
      expect(data).toEqual({});
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toMatch(/Could not parse case name/);
    });
  });
});

describe("CitationPreview escape hatch (BUG-002)", () => {
  const runs: FormattedRun[] = [{ text: "Smith v Land (1884) 28 Ch D 7." }];

  function renderEditing(onParsed = jest.fn(), onOverride = jest.fn()) {
    const utils = render(
      <CitationPreview
        runs={runs}
        sourceType="case.reported"
        onParsed={onParsed}
        onOverride={onOverride}
      />,
    );
    fireEvent.click(within(utils.container).getByText("Edit directly"));
    const textarea = within(utils.container).getByLabelText("Edit citation text");
    return { ...utils, textarea, onParsed, onOverride };
  }

  it("parses the corrected '&' citation typed over the truncated one", () => {
    const { textarea, onParsed } = renderEditing();
    fireEvent.change(textarea, {
      target: { value: "Smith v Land & House Property Corporation (1884) 28 Ch D 7" },
    });
    expect(onParsed).toHaveBeenCalled();
    const [data, warnings] = onParsed.mock.calls[onParsed.mock.calls.length - 1];
    expect(data.party2).toBe("Land & House Property Corporation");
    expect(warnings).toEqual([]);
  });

  it("offers 'Insert as manual citation' even when nothing is wrong", () => {
    const { container } = renderEditing();
    expect(within(container).getByText("Insert as manual citation")).toBeEnabled();
  });

  it("parse failure is non-blocking: warning shown AND manual-citation hatch available", () => {
    const { container, textarea, onOverride } = renderEditing();
    fireEvent.change(textarea, { target: { value: "some unparseable scribble" } });

    // Non-blocking warning with escape-hatch hint
    expect(within(container).getByText(/Could not parse case name/)).toBeInTheDocument();
    expect(within(container).getByText(/never block insertion/)).toBeInTheDocument();

    // Escape hatch: keeps the user's text verbatim
    fireEvent.click(within(container).getByText("Insert as manual citation"));
    expect(onOverride).toHaveBeenCalledWith("some unparseable scribble");
    expect(within(container).getByText(/inserted exactly as typed/)).toBeInTheDocument();
  });

  it("'Done editing' pushes the latest text when the manual hatch is active", () => {
    const { container, textarea, onOverride } = renderEditing();
    fireEvent.change(textarea, { target: { value: "verbatim citation text" } });
    fireEvent.click(within(container).getByText("Insert as manual citation"));
    fireEvent.change(textarea, { target: { value: "verbatim citation text, amended" } });
    fireEvent.click(within(container).getByText("Done editing"));
    expect(onOverride).toHaveBeenLastCalledWith("verbatim citation text, amended");
  });
});
