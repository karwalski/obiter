/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-114: the court link checker's pure classification (no network).
 * Cases are drawn from the R02 §5 link table (checked 6 Oct 2026): NSW
 * missing pages redirect to /errors/404.html with a 200, the WA
 * /P/practice_directions.aspx page says "Page Not Found" with a 200, and the
 * Federal Court and NT sites answer automated requests with 403.
 */

import { classifyLinkResponse, collectCourtLinks, exitCodeFor } from "../../scripts/courtLinkCheck";
import { PRACTICE_DIRECTION_LINKS } from "../../src/engine/court/practiceDirections";

describe("COURT-114: court link checker", () => {
  test("collects every practice-direction, AI and profile-source URL once", () => {
    const links = collectCourtLinks();
    const urls = links.map((l) => l.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const pd of PRACTICE_DIRECTION_LINKS) expect(urls).toContain(pd.url);
    // A URL cited twice keeps both citations.
    const gen20 = links.find((l) => l.url.endsWith("sc-gen-20.html"))!;
    expect(gen20.citedBy.length).toBeGreaterThan(1);
    // The WA consolidated directions carry a version string to match.
    const wa = links.find((l) => l.url.includes("consolidated_practice_directions"))!;
    expect(wa.expectText).toBe("as at 25 September 2026");
  });

  test("a 200 page is ok, and the version string is matched when expected", () => {
    const ok = classifyLinkResponse(
      {
        status: 200,
        finalUrl: "https://example.test/cpd",
        body: "<p>(as at 25 September 2026)</p>",
      },
      "as at 25 September 2026"
    );
    expect(ok).toEqual({ outcome: "ok", reason: "200", versionMatch: true });
    const stale = classifyLinkResponse(
      { status: 200, finalUrl: "https://example.test/cpd", body: "<p>as at 1 July 2027</p>" },
      "as at 25 September 2026"
    );
    expect(stale.outcome).toBe("ok");
    expect(stale.versionMatch).toBe(false);
  });

  test("a 404 is broken", () => {
    expect(classifyLinkResponse({ status: 404, finalUrl: "https://x.test/a" }).outcome).toBe(
      "broken"
    );
  });

  test("a redirect to an error page is a soft 404 (NSW /errors/404.html)", () => {
    const r = classifyLinkResponse({
      status: 200,
      finalUrl: "https://supremecourt.nsw.gov.au/errors/404.html",
      body: "<title>404</title>",
    });
    expect(r.outcome).toBe("broken");
    expect(r.reason).toContain("soft 404");
  });

  test("a 200 page that says 'Page Not Found' is broken (WA /P/practice_directions.aspx)", () => {
    const r = classifyLinkResponse({
      status: 200,
      finalUrl: "https://www.supremecourt.wa.gov.au/P/practice_directions.aspx",
      body: "<h1>Page Not Found</h1>",
    });
    expect(r.outcome).toBe("broken");
  });

  test("403 is reported as blocked and never fails the run (Cloudflare)", () => {
    const blocked = classifyLinkResponse({
      status: 403,
      finalUrl: "https://www.fedcourt.gov.au/x",
    });
    expect(blocked.outcome).toBe("blocked");
    expect(exitCodeFor([blocked], false)).toBe(0);
  });

  test("broken or unreachable links fail the run unless --warn-only", () => {
    const broken = classifyLinkResponse({ status: 404, finalUrl: "https://x.test/a" });
    const unreachable = classifyLinkResponse({
      status: 0,
      finalUrl: "https://x.test/b",
      error: "TLS",
    });
    expect(unreachable.outcome).toBe("unreachable");
    expect(exitCodeFor([broken], false)).toBe(1);
    expect(exitCodeFor([unreachable], false)).toBe(1);
    expect(exitCodeFor([broken, unreachable], true)).toBe(0);
  });
});
