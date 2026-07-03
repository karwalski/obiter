/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COPILOT-009 — the agent-callable skill functions validate a caller-supplied
 * request at the boundary and dispatch to the headless citationService (the one
 * code path), accepting either a structured object or a JSON string.
 */

jest.mock("../../src/actions/citationService");

import * as citationService from "../../src/actions/citationService";
import {
  parseInsertRequest,
  skillInsertCitation,
  skillFormatCitation,
  skillUpdateCitation,
  skillDeleteCitation,
  skillRefreshFootnotes,
  SKILL_DISPATCHERS,
  SkillRequestError,
} from "../../src/actions/skillFunctions";
import { OBITER_ACTIONS } from "../../src/actions/actionCatalogue";

const mocked = citationService as jest.Mocked<typeof citationService>;

const validRequest = {
  sourceType: "case.reported",
  data: { party1: "Mabo", party2: "Queensland (No 2)", year: "1992" },
  shortTitle: "Mabo",
};

describe("parseInsertRequest", () => {
  it("accepts a structured object and normalises optional fields", () => {
    const parsed = parseInsertRequest({ ...validRequest, signal: "" });
    expect(parsed.sourceType).toBe("case.reported");
    expect(parsed.shortTitle).toBe("Mabo");
    // Empty-string optionals collapse to undefined.
    expect(parsed.signal).toBeUndefined();
  });

  it("accepts a JSON string (Copilot may pass the input serialised)", () => {
    const parsed = parseInsertRequest(JSON.stringify(validRequest));
    expect(parsed.sourceType).toBe("case.reported");
    expect(parsed.data.party1).toBe("Mabo");
  });

  it("rejects a missing sourceType", () => {
    expect(() => parseInsertRequest({ data: {} })).toThrow(SkillRequestError);
  });

  it("rejects a missing data object", () => {
    expect(() => parseInsertRequest({ sourceType: "book" })).toThrow(SkillRequestError);
  });

  it("rejects invalid JSON and non-objects", () => {
    expect(() => parseInsertRequest("{not json")).toThrow(SkillRequestError);
    expect(() => parseInsertRequest(42)).toThrow(SkillRequestError);
  });

  it("only allows aglcVersion '4' or '5'", () => {
    expect(parseInsertRequest({ ...validRequest, aglcVersion: "6" }).aglcVersion).toBeUndefined();
    expect(parseInsertRequest({ ...validRequest, aglcVersion: "5" }).aglcVersion).toBe("5");
  });
});

describe("skill dispatchers", () => {
  beforeEach(() => jest.clearAllMocks());

  it("skillInsertCitation dispatches the parsed request to citationService.insertCitation", async () => {
    mocked.insertCitation.mockResolvedValue({
      status: "inserted",
      citationId: "id-1",
      mode: "new",
    });
    const result = await skillInsertCitation(validRequest);
    expect(mocked.insertCitation).toHaveBeenCalledTimes(1);
    expect(mocked.insertCitation.mock.calls[0][0].sourceType).toBe("case.reported");
    expect(result.citationId).toBe("id-1");
  });

  it("skillFormatCitation returns engine text without inserting", async () => {
    mocked.formatCitationForRequest.mockResolvedValue({
      runs: [{ text: "Mabo v Queensland (No 2) (1992) 175 CLR 1" }],
      text: "Mabo v Queensland (No 2) (1992) 175 CLR 1",
    });
    const result = await skillFormatCitation(validRequest);
    expect(result.text).toContain("Mabo");
    expect(mocked.insertCitation).not.toHaveBeenCalled();
  });

  it("skillUpdateCitation requires a citationId and forwards the nested request", async () => {
    await expect(skillUpdateCitation({ request: validRequest })).rejects.toThrow(SkillRequestError);
    mocked.updateCitation.mockResolvedValue(undefined);
    const result = await skillUpdateCitation({ citationId: "id-9", request: validRequest });
    expect(mocked.updateCitation).toHaveBeenCalledWith(
      "id-9",
      expect.objectContaining({ sourceType: "case.reported" })
    );
    expect(result).toEqual({ status: "updated", citationId: "id-9" });
  });

  it("skillDeleteCitation requires citationId and a numeric footnoteIndex", async () => {
    await expect(skillDeleteCitation({ citationId: "id-9" })).rejects.toThrow(SkillRequestError);
    mocked.deleteCitation.mockResolvedValue(undefined);
    const result = await skillDeleteCitation({ citationId: "id-9", footnoteIndex: 3 });
    expect(mocked.deleteCitation).toHaveBeenCalledWith("id-9", 3);
    expect(result).toEqual({ status: "deleted", citationId: "id-9", footnoteIndex: 3 });
  });

  it("skillRefreshFootnotes calls the service refresh", async () => {
    mocked.refreshFootnotes.mockResolvedValue(undefined);
    await expect(skillRefreshFootnotes()).resolves.toEqual({ status: "refreshed" });
    expect(mocked.refreshFootnotes).toHaveBeenCalledTimes(1);
  });
});

describe("SKILL_DISPATCHERS coverage", () => {
  it("has a dispatcher for every catalogued action", () => {
    for (const action of OBITER_ACTIONS) {
      expect(typeof SKILL_DISPATCHERS[action.name]).toBe("function");
    }
  });
});
