/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * B6: the Insert view's Recent "Re-insert" menu was cramped at the default
 * ~320px pane: the menu sat beside the card's header row in a non-wrapping
 * flex row, so it got half the width and the pinpoint input was cut off.
 * The card now wraps and the menu takes its own full-width line. jsdom does
 * no layout, so this checks the stylesheet rules and the markup hook.
 */

import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "../..");
const css = fs.readFileSync(path.join(root, "src/ui/styles/global.css"), "utf-8");
const insertView = fs.readFileSync(path.join(root, "src/ui/views/InsertCitation.tsx"), "utf-8");

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  if (!m) throw new Error(`no rule for ${selector}`);
  return m[2];
}

describe("B6: Recent re-insert menu fits a 320px pane", () => {
  test("the recent card wraps so the menu can take its own line", () => {
    expect(rule(".ic-recent-card")).toMatch(/flex-wrap:\s*wrap/);
  });

  test("the menu spans the card's full width", () => {
    const menu = rule(".ic-recent-reinsert-menu");
    expect(menu).toMatch(/flex:\s*1 1 100%/);
    expect(menu).toMatch(/width:\s*100%/);
    expect(menu).toMatch(/min-width:\s*0/);
  });

  test("the pinpoint input sizes inside its padding and options wrap", () => {
    expect(rule(".library-insert-pinpoint-input")).toMatch(/box-sizing:\s*border-box/);
    expect(rule(".ic-recent-reinsert-menu .library-insert-option")).toMatch(
      /white-space:\s*normal/
    );
  });

  test("the new rules use style-guide spacing tokens, not raw pixels", () => {
    for (const sel of [
      ".ic-recent-reinsert-menu",
      ".ic-recent-reinsert-menu .library-insert-pinpoint",
      ".ic-recent-reinsert-menu .library-insert-option",
    ]) {
      expect(rule(sel)).not.toMatch(/\d+px/);
    }
  });

  test("the Insert view uses the class instead of an inline width", () => {
    expect(insertView).toContain('className="library-insert-menu ic-recent-reinsert-menu"');
    expect(insertView).not.toContain('style={{ marginTop: 6, width: "100%" }}');
  });
});
