/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState } from "react";
import type { CourtProfileRecord } from "../../types/citation";
import {
  diffCourtProfile,
  formatToggleValue,
  LEGACY_PRESET_VERSION,
  type CourtToggleKey,
} from "../../engine/court/profile";
import {
  experimentalLabel,
  formatIsoDate,
  getFieldProvenance,
  PROFILE_SOURCES,
  PROVENANCE_KIND_LABELS,
} from "../../engine/court/provenance";

const NOTE_STYLE = {
  fontSize: 10,
  color: "var(--colour-text-secondary)",
  margin: "2px 0 0",
} as const;

/**
 * COURT-115: every court shows that its profile is experimental, with the
 * instruments it was checked against and when.
 */
export function CourtExperimentalLabel({ jurisdiction }: { jurisdiction: string }): JSX.Element {
  return (
    <p
      style={{ ...NOTE_STYLE, fontSize: 11, margin: "6px 0 0" }}
      data-testid="court-experimental-label"
    >
      {experimentalLabel(jurisdiction)}
    </p>
  );
}

/**
 * COURT-115: whether a toggle's value came from the court profile or was
 * changed for this document.
 */
export function inheritanceLabel(
  profile: CourtProfileRecord | undefined,
  key: CourtToggleKey
): string {
  if (!profile) return "From the court profile";
  if (profile.overridden.includes(key)) return "Changed for this document";
  if (profile.overridesKnown === false || profile.presetVersion === LEGACY_PRESET_VERSION) {
    return "Saved with this document";
  }
  return "From the court profile";
}

/**
 * COURT-115: one line under a court toggle: inherited or overridden, the
 * kind of source, and a link to the instrument.
 */
export function ToggleProvenanceNote({
  jurisdiction,
  toggleKey,
  profile,
}: {
  jurisdiction: string;
  toggleKey: CourtToggleKey;
  profile: CourtProfileRecord | undefined;
}): JSX.Element | null {
  const prov = getFieldProvenance(jurisdiction, toggleKey);
  if (!prov) return null;
  // B4: name only published sources; an internal Obiter decision is a
  // developer reference (docs/court-profiles.md), not user-facing text.
  // The clause belongs to the first source, so it is shown only with it.
  const sourceIndex = prov.sourceIds.findIndex((id) => PROFILE_SOURCES[id]?.internal !== true);
  const source = sourceIndex >= 0 ? PROFILE_SOURCES[prov.sourceIds[sourceIndex]] : undefined;
  const sourceText = source
    ? `${source.title}${prov.clause && sourceIndex === 0 ? ` ${prov.clause}` : ""}`
    : undefined;
  return (
    <span
      style={{ ...NOTE_STYLE, display: "block", margin: "0 0 6px" }}
      data-testid={`provenance-${toggleKey}`}
    >
      {inheritanceLabel(profile, toggleKey)}. {PROVENANCE_KIND_LABELS[prov.kind]}
      {sourceText && (
        <>
          {": "}
          {source?.url ? (
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {sourceText}
            </a>
          ) : (
            sourceText
          )}
        </>
      )}
      .{prov.note ? ` ${prov.note}` : ""}
    </span>
  );
}

interface CourtProfileUpdateProps {
  jurisdiction: string;
  toggles: Record<string, string> | undefined;
  profile: CourtProfileRecord | undefined;
  /** Apply the ticked rows. */
  onAccept: (acceptedKeys: string[]) => void;
  /** Keep the document's current values for this preset version. */
  onDecline: () => void;
}

/**
 * COURT-106 / DECISION-043 item 4: the per-document "Update court profile"
 * prompt. Lists each value that differs from the current court profile;
 * nothing changes until the user applies it. Values the user changed for
 * the document start unticked.
 */
export function CourtProfileUpdatePrompt({
  jurisdiction,
  toggles,
  profile,
  onAccept,
  onDecline,
}: CourtProfileUpdateProps): JSX.Element | null {
  const changes = diffCourtProfile(toggles, profile, jurisdiction);
  const [ticked, setTicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(changes.map((c) => [c.key, !c.overridden]))
  );
  if (changes.length === 0) return null;
  const accepted = changes.filter((c) => ticked[c.key] ?? !c.overridden).map((c) => c.key);
  const migrated = profile?.overridesKnown === false;
  return (
    <div
      role="group"
      aria-label="Update court profile"
      style={{
        marginTop: 8,
        padding: 8,
        border: "1px solid var(--colour-border)",
        borderRadius: 4,
        fontSize: 11,
      }}
    >
      <p style={{ margin: "0 0 4px", fontWeight: 600 }}>Update court profile</p>
      <p style={{ margin: "0 0 4px" }}>
        This document&rsquo;s court settings differ from Obiter&rsquo;s current profile for this
        court. The document keeps its settings unless you apply the update.
        {profile?.frozenAt ? ` Settings saved ${formatIsoDate(profile.frozenAt)}.` : ""}
      </p>
      {migrated && (
        <p style={{ margin: "0 0 4px", color: "var(--colour-text-secondary)" }}>
          This document was set up before Obiter recorded which settings you changed. Untick any
          setting you chose yourself.
        </p>
      )}
      <ul
        style={{ margin: "2px 0 4px", paddingLeft: 0, listStyle: "none" }}
        aria-label="Settings that will change"
      >
        {changes.map((c) => (
          <li key={c.key} style={{ marginBottom: 2 }}>
            <label>
              <input
                type="checkbox"
                checked={ticked[c.key] ?? !c.overridden}
                onChange={(e) => setTicked({ ...ticked, [c.key]: e.target.checked })}
              />{" "}
              {c.label}: {formatToggleValue(c.key, c.current)} to{" "}
              {formatToggleValue(c.key, c.proposed)}
              {c.overridden ? " (you changed this)" : ""}
            </label>
            {c.detail && (
              <span
                style={{ display: "block", marginLeft: 18, color: "var(--colour-text-secondary)" }}
                data-testid={`profile-change-detail-${c.key}`}
              >
                {c.detail}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p style={{ margin: "0 0 4px", color: "var(--colour-text-secondary)" }}>
        Applying the update reformats existing citations.
      </p>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        <button
          className="library-btn library-btn--insert"
          disabled={accepted.length === 0}
          onClick={() => onAccept(accepted)}
        >
          Apply update
        </button>
        <button className="library-btn" onClick={onDecline}>
          Keep current settings
        </button>
      </div>
    </div>
  );
}
