/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * names.ts — converts the name forms used by each interchange format to and
 * from InterchangeCreator and Obiter's Author.
 *
 * RIS and EndNote store "Last, First, Suffix"; CSL-JSON stores
 * {family, given, suffix} or {literal}; BibTeX stores "First von Last",
 * "von Last, First" or "von Last, Jr, First" with braces protecting a
 * corporate name. Obiter stores {givenNames, surname, suffix?}. A body
 * (commission, department, company) is a single Author whose surname holds
 * the whole name and whose given names are empty, matching how the engine
 * already renders string authors (rule 4.1.4).
 */

import type { Author } from "../../../types/citation";
import { parseFreeTextAuthors } from "../../../engine/rules/v4/secondary/authors";
import type { CreatorRole, InterchangeCreator } from "../model";

/** Words that mark a name as a body rather than a person (rule 4.1.4). */
const BODY_WORDS = new Set([
  "commission",
  "committee",
  "department",
  "council",
  "association",
  "institute",
  "office",
  "ltd",
  "pty",
  "inc",
  "co",
  "limited",
  "government",
  "university",
  "society",
  "board",
  "authority",
  "bureau",
  "court",
  "tribunal",
  "group",
  "centre",
  "center",
  "foundation",
  "bank",
  "corporation",
  "company",
  "ministry",
  "parliament",
  "union",
  "agency",
  "service",
  "services",
  "australia",
  "australian",
  "international",
  "national",
  "federal",
  "state",
  "organisation",
  "organization",
  "network",
  "school",
  "faculty",
  "college",
  "library",
  "press",
  "review",
  "journal",
  "media",
  "news",
  "team",
  "project",
  "fund",
  "trust",
  "party",
  "secretariat",
  "chamber",
  "chambers",
  "firm",
  "partners",
  "forum",
  "alliance",
  "coalition",
  "federation",
  "league",
  "club",
  "church",
  "hospital",
  "editorial",
  "staff",
  "anonymous",
  "of",
  "for",
  "the",
  "and",
  "&",
]);

const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "md", "qc", "kc", "sc"]);

/** Lower-case particles that belong to the surname ("van de Pol"). */
const PARTICLES = new Set([
  "van",
  "von",
  "de",
  "der",
  "den",
  "del",
  "della",
  "di",
  "da",
  "du",
  "la",
  "le",
  "al",
  "bin",
  "ibn",
  "ter",
  "ten",
  "des",
  "dos",
  "das",
  "st",
  "st.",
]);

/** True when the text reads as an organisation rather than a person. */
export function looksLikeBody(name: string): boolean {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  if (tokens.length === 1) {
    // A lone word is a body ("Deloitte") unless it is clearly a surname
    // supplied without given names, which we cannot tell apart; treat as body.
    return true;
  }
  if (tokens.length > 6) return true;
  if (/\d/.test(name)) return true;
  return tokens.some((t) => BODY_WORDS.has(t.toLowerCase().replace(/[.,]/g, "")));
}

/**
 * Parses "Last, First, Suffix" (RIS, EndNote) or "First Last". A body name
 * becomes a literal creator.
 */
export function parseCommaName(raw: string, role: CreatorRole): InterchangeCreator {
  const text = raw.trim();
  if (!text) return { role, raw };
  if (text.includes(",")) {
    const parts = text.split(",").map((p) => p.trim());
    const family = parts[0];
    let given = parts[1] ?? "";
    let suffix = parts[2] || undefined;
    if (!suffix && given && SUFFIXES.has(given.toLowerCase())) {
      suffix = given;
      given = "";
    }
    if (!family) return { role, raw, literal: text };
    // "Australian Law Reform Commission, The" style catalogue inversions
    if (looksLikeBody(family) && !given) return { role, raw, literal: family };
    return {
      role,
      raw,
      family,
      given: given || undefined,
      suffix: suffix?.replace(/\.$/, "") || undefined,
    };
  }
  if (looksLikeBody(text)) return { role, raw, literal: text };
  return { ...splitNaturalOrder(text), role, raw };
}

/**
 * Splits "First Middle Last", "First van der Last" or "First Last Jr" into
 * parts. Lower-case particles join the surname.
 */
export function splitNaturalOrder(text: string): {
  family: string;
  given?: string;
  suffix?: string;
} {
  const tokens = text.trim().split(/\s+/);
  let end = tokens.length;
  let suffix: string | undefined;
  if (end >= 3 && SUFFIXES.has(tokens[end - 1].toLowerCase())) {
    suffix = tokens[end - 1].replace(/\.$/, "");
    end -= 1;
  }
  let start = end - 1;
  while (start > 1 && PARTICLES.has(tokens[start - 1].toLowerCase())) {
    start -= 1;
  }
  const family = tokens.slice(start, end).join(" ");
  const given = tokens.slice(0, start).join(" ");
  return { family, given: given || undefined, suffix };
}

/**
 * Parses one BibTeX name: "First von Last", "von Last, First",
 * "von Last, Jr, First" or "{Corporate Name}". Braces must already be
 * balanced; the caller splits the field on " and " at brace depth zero.
 */
export function parseBibTeXName(raw: string, role: CreatorRole): InterchangeCreator {
  const text = raw.trim();
  if (!text) return { role, raw };
  if (text.startsWith("{") && text.endsWith("}") && !text.slice(1, -1).includes("{")) {
    return { role, raw, literal: text.slice(1, -1).trim() };
  }
  const stripped = text.replace(/[{}]/g, "");
  if (stripped.toLowerCase() === "others") {
    return { role, raw, literal: "others" };
  }
  const parts = stripped.split(",").map((p) => p.trim());
  if (parts.length >= 3) {
    // von Last, Jr, First
    return {
      role,
      raw,
      family: parts[0],
      suffix: parts[1] || undefined,
      given: parts[2] || undefined,
    };
  }
  if (parts.length === 2) {
    // von Last, First
    if (looksLikeBody(parts[0]) && !parts[1]) return { role, raw, literal: parts[0] };
    return { role, raw, family: parts[0], given: parts[1] || undefined };
  }
  // First von Last
  if (looksLikeBody(stripped)) return { role, raw, literal: stripped };
  return { ...splitNaturalOrder(stripped), role, raw };
}

/** Splits a BibTeX author field on " and " outside braces. */
export function splitBibTeXNames(field: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  const lower = field.toLowerCase();
  for (let i = 0; i < field.length; i += 1) {
    const ch = field[i];
    if (ch === "{") depth += 1;
    if (ch === "}") depth = Math.max(0, depth - 1);
    if (depth === 0 && lower.startsWith(" and ", i)) {
      out.push(current.trim());
      current = "";
      i += 4;
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out.filter(Boolean);
}

/** CSL-JSON name object. */
export interface CslName {
  family?: string;
  given?: string;
  suffix?: string;
  literal?: string;
  "dropping-particle"?: string;
  "non-dropping-particle"?: string;
}

export function parseCslName(name: CslName, role: CreatorRole): InterchangeCreator {
  if (name.literal) {
    return { role, raw: name.literal, literal: name.literal };
  }
  const family = [name["non-dropping-particle"], name.family].filter(Boolean).join(" ").trim();
  const given = [name.given, name["dropping-particle"]].filter(Boolean).join(" ").trim();
  const raw = [given, family, name.suffix].filter(Boolean).join(" ");
  if (!family && !given) return { role, raw };
  if (!given && looksLikeBody(family)) return { role, raw, literal: family };
  return { role, raw, family: family || undefined, given: given || undefined, suffix: name.suffix };
}

/** Converts a creator to Obiter's Author shape. */
export function creatorToAuthor(creator: InterchangeCreator): Author {
  if (creator.literal !== undefined) {
    return { givenNames: "", surname: creator.literal };
  }
  return {
    givenNames: creator.given ?? "",
    surname: creator.family ?? creator.raw,
    ...(creator.suffix ? { suffix: creator.suffix } : {}),
  };
}

/** Converts an Obiter Author back to a creator. */
export function authorToCreator(author: Author, role: CreatorRole): InterchangeCreator {
  const given = (author.givenNames ?? "").trim();
  const surname = (author.surname ?? "").trim();
  const raw = [author.judicialTitle, given, surname, author.suffix].filter(Boolean).join(" ");
  if (!given && looksLikeBody(surname)) {
    return { role, raw: surname, literal: surname };
  }
  return {
    role,
    raw,
    family: surname || undefined,
    given: given || undefined,
    suffix: author.suffix,
  };
}

/** "Family, Given, Suffix" for RIS and EndNote. Bodies are written whole. */
export function formatCommaName(creator: InterchangeCreator): string {
  if (creator.literal !== undefined) return creator.literal;
  const parts = [creator.family ?? creator.raw];
  if (creator.given) parts.push(creator.given);
  if (creator.suffix) {
    if (!creator.given) parts.push("");
    parts.push(creator.suffix);
  }
  return parts.join(", ");
}

/** "Given Family" display form; bodies whole. */
export function formatNaturalName(creator: InterchangeCreator): string {
  if (creator.literal !== undefined) return creator.literal;
  return [creator.given, creator.family, creator.suffix].filter(Boolean).join(" ") || creator.raw;
}

/** BibTeX form: "Family, Suffix, Given" or "{Body}". */
export function formatBibTeXName(creator: InterchangeCreator): string {
  if (creator.literal !== undefined) return `{${creator.literal}}`;
  const family = creator.family ?? creator.raw;
  if (creator.suffix)
    return `${family}, ${creator.suffix}, ${creator.given ?? ""}`.replace(/, $/, "");
  return creator.given ? `${family}, ${creator.given}` : family;
}

/** CSL name object. */
export function formatCslName(creator: InterchangeCreator): CslName {
  if (creator.literal !== undefined) return { literal: creator.literal };
  const name: CslName = { family: creator.family ?? creator.raw };
  if (creator.given) name.given = creator.given;
  if (creator.suffix) name.suffix = creator.suffix;
  return name;
}

/** Joins creators for a flat Obiter string field ("A, B and C"). */
export function joinCreatorsAsText(creators: InterchangeCreator[]): string {
  const names = creators.map(formatNaturalName).filter(Boolean);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function creatorsWithRole(
  creators: InterchangeCreator[],
  role: CreatorRole
): InterchangeCreator[] {
  return creators.filter((c) => c.role === role);
}

/**
 * Parses a flat Obiter author string ("Jane Smith and Bob Jones", or a
 * body name) into creators, using the engine's own free-text name parser
 * so bodies stay whole.
 */
export function parseFreeTextCreators(text: string, role: CreatorRole): InterchangeCreator[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const authors = parseFreeTextAuthors(trimmed);
  if (!authors) return [{ role, raw: trimmed, literal: trimmed }];
  return authors.map((a) => authorToCreator(a, role));
}
