/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * BUG-002 — the free-text parse chain ('Parse citation' button) must keep
 * '&'/'and' inside party names: parties split only on ' v ' (AGLC4 rule
 * 2.1.1). Exercises the deterministic path of parseWithCorpusFirst (no
 * corpus loaded, no LLM configured).
 */

import { parseWithCorpusFirst } from "../../src/llm/corpusEnhancedParse";

describe("parseWithCorpusFirst — deterministic path (BUG-002)", () => {
  it("parses the reported field citation keeping the '&' party whole", async () => {
    const res = await parseWithCorpusFirst(
      "Smith v Land & House Property Corporation (1884) 28 Ch D 7",
      "case.reported",
      null
    );
    expect(res.source).toBe("parser");
    expect(res.data.party1).toBe("Smith");
    expect(res.data.party2).toBe("Land & House Property Corporation");
    expect(res.data.year).toBe(1884);
    expect(res.data.yearType).toBe("round");
    expect(res.data.volume).toBe(28);
    expect(res.data.reportSeries).toBe("Ch D");
    expect(res.data.startingPage).toBe(7);
  });

  it("parses the 'and' variant keeping the party whole", async () => {
    const res = await parseWithCorpusFirst(
      "Smith v Land and House Property Corporation (1884) 28 Ch D 7",
      "case.reported",
      null
    );
    expect(res.source).toBe("parser");
    expect(res.data.party1).toBe("Smith");
    expect(res.data.party2).toBe("Land and House Property Corporation");
    expect(res.data.reportSeries).toBe("Ch D");
  });

  it("regression: MNC-style citation still parses with parties intact", async () => {
    const res = await parseWithCorpusFirst("R v Adams [2019] UKSC 5", "case.reported", null);
    expect(res.source).toBe("parser");
    expect(res.data.party1).toBe("R");
    expect(res.data.party2).toBe("Adams");
    expect(res.data.year).toBe(2019);
    expect(res.data.court).toBe("UKSC");
    expect(res.data.mnc).toBe("5");
  });
});
