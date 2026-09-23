/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * STD-017 — the formerly orphaned OSCOLA and NZLSG formatters are reached
 * from `formatCitation` for their source type and data gate, and render the
 * forms recorded in docs/standards-rule-notes.md.
 *
 * Every rule module is replaced with a call-recording wrapper (as
 * tests/standards/coverage.test.ts does) so the formatter actually invoked
 * is observable; the wrappers call the real implementation, so the text is
 * the engine's real output. Citations carry no `shortTitle`, so no
 * first-citation short-title suffix is appended.
 */
import * as fs from "fs";
import * as path from "path";
import type { Citation, SourceType } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";

const RULES_DIR = path.resolve(__dirname, "..", "..", "src", "engine", "rules");

function mockWrap(modulePath: string): Record<string, unknown> {
  const actual = jest.requireActual(modulePath) as Record<string, unknown>;
  const wrapped: Record<string, unknown> = {};
  for (const key of Object.keys(actual)) {
    const value = actual[key];
    wrapped[key] =
      typeof value === "function" ? jest.fn(value as (...args: unknown[]) => unknown) : value;
  }
  return wrapped;
}

for (const std of ["oscola", "nzlsg"]) {
  for (const file of fs.readdirSync(path.join(RULES_DIR, std))) {
    if (!file.endsWith(".ts")) continue;
    const mockPath = `../../src/engine/rules/${std}/${file.replace(/\.ts$/, "")}`;
    jest.doMock(mockPath, () => mockWrap(mockPath));
  }
}

const engine: typeof import("../../src/engine/engine") = require("../../src/engine/engine");
const standards: typeof import("../../src/engine/standards") = require("../../src/engine/standards");

function formatterMock(std: "oscola" | "nzlsg", mod: string, name: string): jest.Mock {
  const module = require(`../../src/engine/rules/${std}/${mod}`) as Record<string, unknown>;
  const fn = module[name];
  if (!jest.isMockFunction(fn)) throw new Error(`${std}/${mod}.${name} is not a mock`);
  return fn as jest.Mock;
}

function cite(sourceType: SourceType, data: Record<string, unknown>): Citation {
  return {
    id: `wire-${sourceType}`,
    aglcVersion: "4",
    sourceType,
    data,
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
  };
}

const text = (runs: FormattedRun[]): string => runs.map((r) => r.text).join("");
const italics = (runs: FormattedRun[]): string[] => runs.filter((r) => r.italic).map((r) => r.text);

function render(
  sourceType: SourceType,
  data: Record<string, unknown>,
  standardId = "oscola5"
): FormattedRun[] {
  return engine.formatCitation(
    cite(sourceType, data),
    undefined,
    standards.getStandardConfig(standardId as never)
  );
}

beforeEach(() => jest.clearAllMocks());

// ─── OSCOLA 5 ───────────────────────────────────────────────────────────────

describe("STD-017: OSCOLA formatters reached from formatCitation", () => {
  test("thesis → formatOscolaThesis (§3.7.6 italic title; OSCOLA 4 §3.4.7 quoted)", () => {
    const data = {
      authors: [{ givenNames: "Javan", surname: "Herberg" }],
      title: "Injunctive Relief for Wrongful Termination of Employment",
      thesisType: "DPhil thesis",
      university: "University of Oxford",
      year: 1989,
    };
    const runs = render("thesis", data);
    expect(formatterMock("oscola", "secondary", "formatOscolaThesis")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe(
      "Javan Herberg, Injunctive Relief for Wrongful Termination of Employment (DPhil thesis, University of Oxford 1989)"
    );
    expect(italics(runs)).toEqual(["Injunctive Relief for Wrongful Termination of Employment"]);

    // Page pinpoint: bare, after the bracket (§3.1.3)
    expect(text(render("thesis", { ...data, pinpoint: "42" }))).toBe(
      "Javan Herberg, Injunctive Relief for Wrongful Termination of Employment (DPhil thesis, University of Oxford 1989) 42"
    );

    const o4 = render("thesis", data, "oscola4");
    expect(text(o4)).toBe(
      "Javan Herberg, ‘Injunctive Relief for Wrongful Termination of Employment’ (DPhil thesis, University of Oxford 1989)"
    );
    expect(italics(o4)).toEqual([]);
  });

  test("internet_material → formatOscolaWebsite (§3.7.1; persistent link, no access date)", () => {
    const runs = render("internet_material", {
      author: "Cyclefree",
      title: "Is This Really Necessary, Minister?",
      websiteName: "Legal Feminist",
      documentType: "Web Page",
      date: "27 April 2023",
      url: "https://perma.cc/3THK-P4AX",
    });
    expect(formatterMock("oscola", "digital", "formatOscolaWebsite")).toHaveBeenCalledTimes(1);
    expect(formatterMock("oscola", "digital", "formatOscolaBlog")).not.toHaveBeenCalled();
    expect(text(runs)).toBe(
      "Cyclefree, ‘Is This Really Necessary, Minister?’ (Legal Feminist, 27 April 2023) <https://perma.cc/3THK-P4AX>"
    );
    expect(italics(runs)).toEqual(["Legal Feminist"]);
  });

  test("internet_material with documentType 'Blog Post' → formatOscolaBlog; the form's accessDate is rendered", () => {
    const runs = render("internet_material", {
      author: "Sarah Cole",
      title: "Virtual Friend Fires Employee",
      websiteName: "Naked Law",
      documentType: "Blog Post",
      date: "1 May 2009",
      url: "www.nakedlaw.com/2009/05/index.html",
      accessDate: "19 November 2009",
    });
    expect(formatterMock("oscola", "digital", "formatOscolaBlog")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe(
      "Sarah Cole, ‘Virtual Friend Fires Employee’ (Naked Law, 1 May 2009) <www.nakedlaw.com/2009/05/index.html> accessed 19 November 2009"
    );
  });

  test("social_media → formatOscolaSocialMedia (§3.7.1: username, (platform, date, time), link)", () => {
    const runs = render("social_media", {
      author: "The Criminal Bar Association",
      handle: "@The Criminal Bar",
      platform: "Twitter",
      date: "26 June 2023",
      time: "9:13pm GMT+1",
      url: "https://perma.cc/HD6K-3GZQ",
    });
    expect(formatterMock("oscola", "digital", "formatOscolaSocialMedia")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe(
      "@The Criminal Bar (Twitter, 26 June 2023, 9:13pm GMT+1) <https://perma.cc/HD6K-3GZQ>"
    );
  });

  test("film_tv_media with medium Podcast → formatOscolaPodcast (§3.7.2)", () => {
    const runs = render("film_tv_media", {
      medium: "Podcast",
      seriesTitle: "Double Jeopardy podcast",
      episodeTitle: "Episode 27: Dr Bryn Harris – Free Speech, Harm and the Internet",
      date: "7 April 2023",
      timePinpoint: "3:40–3:56",
      url: "https://example.org/double-jeopardy/27",
      accessDate: "21 July 2023",
    });
    expect(formatterMock("oscola", "digital", "formatOscolaPodcast")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe(
      "Double Jeopardy podcast, ‘Episode 27: Dr Bryn Harris – Free Speech, Harm and the Internet’ (7 April 2023) 3:40–3:56 <https://example.org/double-jeopardy/27> accessed 21 July 2023"
    );
  });

  test("film_tv_media with medium Online Video → formatOscolaVideo (§3.7.1: timestamp before the link)", () => {
    const runs = render("film_tv_media", {
      medium: "Online Video",
      author: "UK Supreme Court",
      title: "Lady Hale’s Valedictory Remarks – 18 December 2019",
      platform: "YouTube",
      date: "18 December 2019",
      timePinpoint: "42:41–51:17",
      url: "https://perma.cc/7YZV-Y43A",
    });
    expect(formatterMock("oscola", "digital", "formatOscolaVideo")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe(
      "UK Supreme Court, ‘Lady Hale’s Valedictory Remarks – 18 December 2019’ (YouTube, 18 December 2019) 42:41–51:17 <https://perma.cc/7YZV-Y43A>"
    );
  });

  test("film_tv_media with medium Film keeps the AGLC 7.14 form (no OSCOLA formatter invoked)", () => {
    render("film_tv_media", {
      medium: "Film",
      title: "Sample Film",
      productionCompany: "Studio",
      year: 2000,
    });
    expect(formatterMock("oscola", "digital", "formatOscolaPodcast")).not.toHaveBeenCalled();
    expect(formatterMock("oscola", "digital", "formatOscolaVideo")).not.toHaveBeenCalled();
  });

  test("eu.court with a T- case number → formatGeneralCourtCase (§4.4.2)", () => {
    const runs = render("eu.court", {
      caseNumber: "T-344/99",
      caseName: "Arne Mathisen AS v Council",
      ecli: "EU:T:2002:174",
    });
    expect(formatterMock("oscola", "eu", "formatGeneralCourtCase")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe("Case T-344/99 Arne Mathisen AS v Council EU:T:2002:174");
    expect(italics(runs)).toEqual(["Arne Mathisen AS v Council"]);

    jest.clearAllMocks();
    render("eu.court", {
      caseNumber: "C-403/03",
      caseName: "Schempp v Finanzamt",
      ecli: "EU:C:2005:446",
    });
    expect(formatterMock("oscola", "eu", "formatGeneralCourtCase")).not.toHaveBeenCalled();
    expect(formatterMock("oscola", "eu", "formatCjeuCase")).toHaveBeenCalledTimes(1);
  });

  test("eu.official_journal with assimilated → formatAssimilatedEuLaw (§2.4.9)", () => {
    const runs = render("eu.official_journal", {
      assimilated: true,
      instrumentType: "Regulation (EC)",
      number: "No 593/2008",
      title: "on the law applicable to contractual obligations",
      amendingSi: "2019/834",
      amendingProvision: "reg 10",
    });
    expect(formatterMock("oscola", "eu", "formatAssimilatedEuLaw")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe(
      "Assimilated Regulation (EC) No 593/2008 on the law applicable to contractual obligations, as amended by SI 2019/834, reg 10"
    );
  });

  test("echr.decision with commission → formatEcommhrDecision (§4.4.5)", () => {
    const runs = render("echr.decision", {
      party1: "P",
      party2: "UK",
      respondentState: "UK",
      commission: true,
      applicationNumber: "13473/87",
      date: "11 July 1988",
    });
    expect(formatterMock("oscola", "echr", "formatEcommhrDecision")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe("P v UK App No 13473/87 (Commission Decision, 11 July 1988)");
  });

  test("supranational.decision with body ECommHR → formatEcommhrDecision; other bodies keep the AGLC form", () => {
    const runs = render("supranational.decision", {
      caseName: "X v United Kingdom",
      body: "ECommHR",
      applicationNumber: "7215/75",
      date: "12 July 1978",
    });
    expect(formatterMock("oscola", "echr", "formatEcommhrDecision")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe(
      "X v United Kingdom App No 7215/75 (Commission Decision, 12 July 1978)"
    );

    jest.clearAllMocks();
    render("supranational.decision", {
      caseName: "A v B",
      court: "Inter-American Court of Human Rights",
      caseNumber: "1",
      date: "1 January 2000",
    });
    expect(formatterMock("oscola", "echr", "formatEcommhrDecision")).not.toHaveBeenCalled();
  });

  test("supranational.document from the Committee of Ministers → formatCouncilOfEuropeDocument", () => {
    const runs = render("supranational.document", {
      body: "Committee of Ministers",
      title:
        "Recommendation Rec(2004)6 of the Committee of Ministers to Member States on the Improvement of Domestic Remedies",
      date: "12 May 2004",
    });
    expect(formatterMock("oscola", "echr", "formatCouncilOfEuropeDocument")).toHaveBeenCalledTimes(
      1
    );
    expect(text(runs)).toBe(
      "Committee of Ministers, Recommendation Rec(2004)6 of the Committee of Ministers to Member States on the Improvement of Domestic Remedies (12 May 2004)"
    );

    jest.clearAllMocks();
    render("supranational.document", {
      body: "African Union",
      title: "Sample",
      documentNumber: "1",
      date: "1 January 2000",
    });
    expect(formatterMock("oscola", "echr", "formatCouncilOfEuropeDocument")).not.toHaveBeenCalled();
  });

  test("un.document with a resolution number and no title → formatUnResolution (§4.2.2)", () => {
    const runs = render("un.document", {
      body: "UNSC",
      resolutionNumber: "1373",
      date: "28 September 2001",
      documentSymbol: "S/RES/1373",
    });
    expect(formatterMock("oscola", "international", "formatUnResolution")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe("UNSC Res 1373 (28 September 2001) UN Doc S/RES/1373");

    jest.clearAllMocks();
    render("un.document", {
      body: "UNGA",
      title: "Sample Resolution",
      resolutionNumber: "1",
      date: "1 January 2000",
      documentSymbol: "A/RES/1",
    });
    expect(formatterMock("oscola", "international", "formatUnResolution")).not.toHaveBeenCalled();
    expect(formatterMock("oscola", "international", "formatUnDocument")).toHaveBeenCalledTimes(1);
  });

  test("icj.decision with tribunal ITLOS → formatItlosCase", () => {
    const runs = render("icj.decision", {
      caseName: "The M/V “Saiga” (No 2) Case (Saint Vincent and the Grenadines v Guinea)",
      tribunal: "ITLOS",
      phase: "Merits",
      year: 1999,
      page: 10,
    });
    expect(formatterMock("oscola", "international", "formatItlosCase")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe(
      "The M/V “Saiga” (No 2) Case (Saint Vincent and the Grenadines v Guinea) (Merits) (1999) ITLOS Reports 10"
    );

    jest.clearAllMocks();
    render("icj.decision", { caseName: "A v B", year: 2000, page: 1 });
    expect(formatterMock("oscola", "international", "formatItlosCase")).not.toHaveBeenCalled();
    expect(formatterMock("oscola", "international", "formatIcjCase")).toHaveBeenCalledTimes(1);
  });

  test("legislation.constitution with jurisdiction IE → formatBunreachtNaHEireann; the article pinpoint follows", () => {
    const runs = render("legislation.constitution", {
      title: "Bunreacht na hÉireann",
      jurisdiction: "IE",
      pinpoint: { type: "article", value: "40.3.1" },
    });
    expect(formatterMock("oscola", "ireland", "formatBunreachtNaHEireann")).toHaveBeenCalledTimes(
      1
    );
    expect(text(runs)).toBe("Bunreacht na hÉireann, art 40.3.1");
    expect(italics(runs)).toEqual(["Bunreacht na hÉireann"]);

    jest.clearAllMocks();
    render("legislation.constitution", {
      title: "Constitution Act",
      jurisdiction: "Vic",
      year: 1975,
    });
    expect(formatterMock("oscola", "ireland", "formatBunreachtNaHEireann")).not.toHaveBeenCalled();
  });
});

// ─── NZLSG 3 ────────────────────────────────────────────────────────────────

describe("STD-017: NZLSG formatters reached from formatCitation", () => {
  test("internet_material → formatNZWebsite (§7.1.1: (date), site, <URL> without http:// for www)", () => {
    const runs = render(
      "internet_material",
      {
        author: "Dean Knight",
        title: "Parliament and the Bill of Rights – a blasé attitude?",
        websiteName: "LAWS179 Elephants and the Law",
        date: "6 April 2009",
        url: "http://www.laws179.co.nz",
      },
      "nzlsg3"
    );
    expect(formatterMock("nzlsg", "digital", "formatNZWebsite")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe(
      "Dean Knight “Parliament and the Bill of Rights – a blasé attitude?” (6 April 2009) LAWS179 Elephants and the Law <www.laws179.co.nz>"
    );
  });

  test("internet_material: undated page whose author is the site (§7.1.1: no date, no repeated site)", () => {
    const runs = render(
      "internet_material",
      {
        author: "Ministry of Justice",
        title: "Frequently Asked Questions – Electoral Finance Reform",
        websiteName: "Ministry of Justice",
        url: "http://www.justice.govt.nz",
      },
      "nzlsg3"
    );
    expect(text(runs)).toBe(
      "Ministry of Justice “Frequently Asked Questions – Electoral Finance Reform” <www.justice.govt.nz>"
    );
  });

  test("internet_material with documentType 'Blog Post' → formatNZBlog; 'at' pinpoint after the URL", () => {
    const runs = render(
      "internet_material",
      {
        author: "Andrew Geddis",
        title: "The Bill of Rights and Parliament",
        websiteName: "Pundit",
        documentType: "Blog Post",
        date: "15 March 2024",
        url: "https://example.com",
        pinpoint: { type: "paragraph", value: "5" },
      },
      "nzlsg3"
    );
    expect(formatterMock("nzlsg", "digital", "formatNZBlog")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe(
      "Andrew Geddis “The Bill of Rights and Parliament” (15 March 2024) Pundit <https://example.com> at [5]"
    );
  });

  test("social_media → formatNZSocialMedia", () => {
    const runs = render(
      "social_media",
      {
        author: "Andrew Little",
        handle: "@AndrewLittleMP",
        title: "Justice reforms announced today",
        platform: "Twitter",
        date: "15 March 2024",
        url: "https://example.com",
      },
      "nzlsg3"
    );
    expect(formatterMock("nzlsg", "digital", "formatNZSocialMedia")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe(
      "Andrew Little (@AndrewLittleMP) “Justice reforms announced today” (Twitter, 15 March 2024) <https://example.com>"
    );
  });

  test("newspaper → formatNZNewspaper (§7.2: italic paper, (place, date), 'at' page)", () => {
    const runs = render(
      "newspaper",
      {
        author: "Rob Hosking",
        title: "Messy Allowance Law Finally Gets Clarity",
        newspaper: "The National Business Review",
        place: "New Zealand",
        date: "17 July 2009",
        page: "2",
      },
      "nzlsg3"
    );
    expect(formatterMock("nzlsg", "digital", "formatNZNewspaper")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe(
      "Rob Hosking “Messy Allowance Law Finally Gets Clarity” The National Business Review (New Zealand, 17 July 2009) at 2"
    );
    expect(italics(runs)).toEqual(["The National Business Review"]);
  });

  test("newspaper online edition (§7.2: (online ed, place, date), no URL)", () => {
    const runs = render(
      "newspaper",
      {
        author: "Audrey Young",
        title: "Entire NZ China trade board resigns",
        newspaper: "The New Zealand Herald",
        place: "Auckland",
        date: "24 June 2011",
        isElectronic: true,
        url: "https://www.nzherald.co.nz/x",
      },
      "nzlsg3"
    );
    expect(text(runs)).toBe(
      "Audrey Young “Entire NZ China trade board resigns” The New Zealand Herald (online ed, Auckland, 24 June 2011)"
    );
  });

  test("film_tv_media → formatNZBroadcast", () => {
    const runs = render(
      "film_tv_media",
      {
        medium: "Radio",
        title: "The Case for Justice",
        presenter: "Kim Hill",
        network: "RNZ",
        date: "15 March 2024",
      },
      "nzlsg3"
    );
    expect(formatterMock("nzlsg", "digital", "formatNZBroadcast")).toHaveBeenCalledTimes(1);
    expect(text(runs)).toBe("“The Case for Justice” (Kim Hill, RNZ, 15 March 2024)");
  });
});

// ─── AGLC4 is untouched ─────────────────────────────────────────────────────

describe("STD-017: no OSCOLA or NZLSG formatter is invoked under aglc4", () => {
  test.each<[SourceType, Record<string, unknown>]>([
    [
      "thesis",
      { author: "Jane Doe", title: "T", thesisType: "PhD Thesis", university: "U", year: 2020 },
    ],
    [
      "internet_material",
      {
        author: "A",
        title: "T",
        websiteName: "W",
        documentType: "Blog Post",
        date: "1 January 2020",
        url: "https://x",
      },
    ],
    [
      "social_media",
      {
        author: "A",
        handle: "@a",
        title: "T",
        platform: "Twitter",
        date: "1 January 2020",
        url: "https://x",
      },
    ],
    [
      "film_tv_media",
      {
        medium: "Podcast",
        episodeTitle: "E",
        seriesTitle: "S",
        date: "1 January 2020",
        url: "https://x",
      },
    ],
    [
      "newspaper",
      { author: "A", title: "T", newspaper: "N", place: "P", date: "1 January 2020", page: "2" },
    ],
    ["legislation.constitution", { title: "Bunreacht na hÉireann", jurisdiction: "IE" }],
    ["eu.court", { caseNumber: "T-1/00", caseName: "A v B", ecli: "EU:T:2000:1" }],
    [
      "un.document",
      {
        body: "UNSC",
        resolutionNumber: "1373",
        date: "28 September 2001",
        documentSymbol: "S/RES/1373",
      },
    ],
  ])("%s", (sourceType, data) => {
    render(sourceType, data, "aglc4");
    for (const std of ["oscola", "nzlsg"] as const) {
      for (const file of fs.readdirSync(path.join(RULES_DIR, std))) {
        if (!file.endsWith(".ts")) continue;
        const module = require(
          `../../src/engine/rules/${std}/${file.replace(/\.ts$/, "")}`
        ) as Record<string, unknown>;
        for (const name of Object.keys(module)) {
          const fn = module[name];
          if (jest.isMockFunction(fn)) expect(fn).not.toHaveBeenCalled();
        }
      }
    }
  });
});
