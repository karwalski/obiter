/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/** A5-WS-2: the AGLC5 watcher never mistakes an unreadable page for "no change". */

import { checkReadable, diffSignals, extractSignals } from "../../scripts/aglc5WatchSignals";

const CURRENT =
  "<html><body><h1>AGLC5</h1><p>The Melbourne University Law Review and the Melbourne " +
  "Journal of International Law have embarked on consultations for a prospective new " +
  "edition of the AGLC, spearheaded by the AGLC5 Committee. Across 2023–2026, the " +
  "Committee sought feedback from key stakeholders in legal academia, the legal " +
  "profession and the general public; they are now considering the outcomes of this " +
  "consultation. The Committee is not accepting further feedback at this time.</p></body></html>";

describe("A5-WS-2: AGLC5 watcher signals", () => {
  test("a 403 is unreadable", () => {
    expect(checkReadable(403, "Forbidden")).toEqual({ readable: false, reason: "HTTP 403" });
  });

  test("a 200 Cloudflare challenge page is unreadable, not unchanged", () => {
    const r = checkReadable(200, "<title>Just a moment...</title><div id='cf-challenge'>");
    expect(r.readable).toBe(false);
  });

  test("a 200 page that never mentions AGLC5 is unreadable", () => {
    expect(checkReadable(200, "<p>Maintenance</p>").readable).toBe(false);
  });

  test("the September 2026 page reads as closed, prospective, no address, no publication", () => {
    expect(checkReadable(200, CURRENT).readable).toBe(true);
    const s = extractSignals(CURRENT);
    expect(s.consideringOutcomes).toBe(true);
    expect(s.feedbackClosed).toBe(true);
    expect(s.prospectiveEdition).toBe(true);
    expect(s.feedbackAddress).toBe(false);
    // "general public" is not a publication mention.
    expect(s.publicationMentions).toBe(0);
    expect(s.launchTerms).toEqual([]);
  });

  test("the same page diffs as unchanged", () => {
    expect(diffSignals(extractSignals(CURRENT), extractSignals(CURRENT))).toEqual([]);
  });

  test("a publication announcement is reported as a change", () => {
    const announced = CURRENT.replace(
      "The Committee is not accepting further feedback at this time.",
      "AGLC5 will be published in March 2027 (ISBN 978-0-0000-0000-0). Pre-order now."
    );
    const changes = diffSignals(extractSignals(CURRENT), extractSignals(announced));
    expect(changes).toContain("feedbackClosed: true -> false");
    expect(changes.some((c) => c.startsWith("launch terms appeared: ISBN, pre-order"))).toBe(true);
    expect(changes.some((c) => c.startsWith("publicationMentions"))).toBe(true);
  });
});
