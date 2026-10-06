/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-115: render `docs/court-profiles.md` from the preset and provenance
 * data, so the published profile list is never a hand-maintained copy.
 *
 * Regenerate with `npx ts-node scripts/generate-court-profiles.ts`; a test
 * fails when the committed file and the data disagree.
 */

import { COURT_GROUPS, COURT_PRESETS, getJurisdictionsByGroup } from "./presets";
import {
  COURT_PRESET_PROVENANCE,
  PROFILE_SOURCES,
  PROVENANCE_KIND_LABELS,
  experimentalLabel,
  formatIsoDate,
  type FieldProvenance,
} from "./provenance";
import {
  COURT_TOGGLE_KEYS,
  COURT_TOGGLE_LABELS,
  formatToggleValue,
  getPresetToggles,
} from "./profile";

/** Escape a table cell (pipes and line breaks). */
function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function describeSource(field: FieldProvenance): string {
  if (field.sourceIds.length === 0) return "None";
  return field.sourceIds
    .map((id, i) => {
      const src = PROFILE_SOURCES[id];
      const name = src ? `${id} (${src.title})` : id;
      return i === 0 && field.clause ? `${name} ${field.clause}` : name;
    })
    .join("; ");
}

/** The full Markdown text of docs/court-profiles.md. */
export function renderCourtProfilesMarkdown(): string {
  const lines: string[] = [];
  lines.push("# Court profiles");
  lines.push("");
  lines.push(
    "<!-- Generated from src/engine/court/presets.ts and src/engine/court/provenance.ts by scripts/generate-court-profiles.ts. Do not edit by hand. -->"
  );
  lines.push("");
  lines.push(
    "Every court profile in Obiter is **experimental**. A profile is checked against the court's own instruments where they were found, but no court has endorsed it, and no profile yet meets the evidence rule for a verified profile (a documented rule plus representative current examples of the same document type)."
  );
  lines.push("");
  lines.push("## How profiles reach a document");
  lines.push("");
  lines.push(
    "- When a court is selected, the document stores the full set of values, the profile version and which values the user changes (COURT-106). The engine reads the document, not the live profile."
  );
  lines.push(
    '- When a profile changes, existing documents keep their values. Settings offers "Update court profile" and lists each change; nothing changes until the user applies it (DECISION-043 item 4).'
  );
  lines.push(
    "- Settings shows, for each value, whether it comes from the profile or was changed for the document, the kind of source, and a link to it (COURT-115)."
  );
  lines.push("");
  lines.push("## Kinds of source");
  lines.push("");
  lines.push("| Kind | Meaning |");
  lines.push("|---|---|");
  lines.push(
    `| ${PROVENANCE_KIND_LABELS.official} | A court instrument states the value or gives it as its example. |`
  );
  lines.push(
    `| ${PROVENANCE_KIND_LABELS.observed} | Repeated practice in published court documents; not a rule for submissions. |`
  );
  lines.push(
    `| ${PROVENANCE_KIND_LABELS.preference} | Obiter's default where the instrument is silent, including the AGLC4 form. |`
  );
  lines.push(
    `| ${PROVENANCE_KIND_LABELS.unsourced} | No instrument supports the value, or the instrument contradicts it. The note names the correcting story. |`
  );
  lines.push("");
  lines.push("## Review process");
  lines.push("");
  lines.push(
    "- Every profile is re-checked against its instruments each quarter, and whenever the practice-direction link checker (COURT-114) reports a changed or moved instrument."
  );
  lines.push(
    "- A change to any value updates its provenance in `src/engine/court/provenance.ts`, bumps that profile's version, and regenerates this file. Existing documents are then offered the update."
  );
  lines.push(
    "- A value is marked as checked only when it was compared with the instrument on that date."
  );
  lines.push("");
  lines.push("## Coverage");
  lines.push("");
  lines.push("| Court | Profile version | Checked against | Last review |");
  lines.push("|---|---|---|---|");
  for (const group of COURT_GROUPS) {
    for (const id of getJurisdictionsByGroup(group)) {
      const prov = COURT_PRESET_PROVENANCE[id];
      const sources =
        prov.checkedAgainst.length > 0 ? prov.checkedAgainst.join(", ") : "No instrument found";
      lines.push(
        `| ${cell(COURT_PRESETS[id].label)} (\`${id}\`) | ${prov.version} | ${cell(sources)} | ${
          prov.reviewed ? formatIsoDate(prov.reviewed) : "Not reviewed"
        } |`
      );
    }
  }
  lines.push("");
  lines.push("## Profiles");
  for (const group of COURT_GROUPS) {
    lines.push("");
    lines.push(`### ${group}`);
    for (const id of getJurisdictionsByGroup(group)) {
      const prov = COURT_PRESET_PROVENANCE[id];
      const toggles = getPresetToggles(id)!;
      lines.push("");
      lines.push(`#### ${COURT_PRESETS[id].label} (\`${id}\`)`);
      lines.push("");
      lines.push(experimentalLabel(id));
      lines.push("");
      lines.push("| Setting | Value | Kind | Source | Checked | Note |");
      lines.push("|---|---|---|---|---|---|");
      for (const key of COURT_TOGGLE_KEYS) {
        const field = prov.fields[key];
        lines.push(
          `| ${COURT_TOGGLE_LABELS[key]} | ${cell(formatToggleValue(key, toggles[key]))} | ${
            PROVENANCE_KIND_LABELS[field.kind]
          } | ${cell(describeSource(field))} | ${field.checked ? formatIsoDate(field.checked) : "No"} | ${cell(
            field.note ?? ""
          )} |`
        );
      }
      if (prov.exceptions.length > 0) {
        lines.push("");
        lines.push("Known exceptions:");
        lines.push("");
        for (const exception of prov.exceptions) lines.push(`- ${exception}`);
      }
    }
  }
  lines.push("");
  lines.push("## Sources");
  lines.push("");
  lines.push("| Id | Instrument | Effective | Link |");
  lines.push("|---|---|---|---|");
  for (const src of Object.values(PROFILE_SOURCES)) {
    lines.push(`| ${src.id} | ${cell(src.title)} | ${cell(src.effective)} | ${src.url ?? ""} |`);
  }
  lines.push("");
  lines.push(
    "Source ids are those of the court-interop evidence register (`docs/research/court-interop/EVIDENCE-REGISTER.md`), retrieved 6 October 2026."
  );
  lines.push("");
  return lines.join("\n");
}
