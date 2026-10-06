/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * A11Y-019 (ATAG Part B / WCAG 1.3.1): the AGLC4 Bibliography Heading style must
 * carry an outline level so the bibliography appears in Word's Navigation pane and
 * document outline. It is a named paragraph style, not a numbered Heading, so the
 * outline level must be set explicitly.
 */

import {
  installOfficeGlobals,
  removeOfficeGlobals,
  createMockContext,
  createMockStyle,
  supportUpTo,
  type MockStyle,
} from "../mocks/office";
import { applyAglc4Styles } from "../../src/word/styles";

describe("A11Y-019: bibliography heading outline level (Part B)", () => {
  afterEach(() => removeOfficeGlobals());

  it("sets OutlineLevel1 on the AGLC4 Bibliography Heading style", async () => {
    // addStyle/getStyles are WordApi 1.5 (COURT-103; R08 §3.7).
    installOfficeGlobals(supportUpTo("1.5"));

    const context = createMockContext();
    // No AGLC4 style exists yet, so every one is created (create-only, COURT-101).
    (context.document.getStyles as jest.Mock).mockReturnValue({
      getByNameOrNullObject: () => ({ isNullObject: true, load: jest.fn() }),
    });
    const created = new Map<string, MockStyle>();
    // Track each style addStyle hands back so we can inspect the bib heading.
    (context.document.addStyle as jest.Mock).mockImplementation((name: string) => {
      const style = createMockStyle();
      created.set(name, style);
      return style;
    });

    await applyAglc4Styles(context as unknown as Word.RequestContext);

    const bibHeading = created.get("AGLC4 Bibliography Heading");
    expect(bibHeading).toBeDefined();
    expect(bibHeading?.paragraphFormat.outlineLevel).toBe("OutlineLevel1");
  });

  it("does nothing below WordApi 1.5 (no custom-style API)", async () => {
    installOfficeGlobals(supportUpTo("1.4"));
    const context = createMockContext();
    await applyAglc4Styles(context as unknown as Word.RequestContext);
    expect(context.document.addStyle as jest.Mock).not.toHaveBeenCalled();
  });
});
