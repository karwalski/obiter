/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useEffect, useState, useCallback } from "react";
import { CitationStore } from "../../store";
import { insertAttribution, removeAttribution, hasAttribution } from "../../word/branding";
import { getInstallInstructions } from "../../word/styleInstaller";
import { applyAglc4Styles, applyHeadingLevel } from "../../word/styles";
import { applyAglc4Template } from "../../word/template";
import { APP_NAME, APP_VERSION, GITHUB_REPO } from "../../constants";
import { useVersionCheck, clearVersionCache } from "../hooks/useVersionCheck";

type AglcVersion = "4" | "5";

const store = new CitationStore();

/** Read a setting, using Office.context.document.settings (Word) with localStorage fallback. */
function getSetting(key: string): unknown {
  try {
    if (typeof Office !== "undefined" && Office.context?.document?.settings) {
      return Office.context.document.settings.get(key);
    }
  } catch { /* fall through */ }
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch { /* fall through */ }
  return undefined;
}

/** Write a setting, using Office.context.document.settings (Word) with localStorage fallback. */
function setSetting(key: string, value: unknown): void {
  try {
    if (typeof Office !== "undefined" && Office.context?.document?.settings) {
      Office.context.document.settings.set(key, value);
      Office.context.document.settings.saveAsync();
    }
  } catch { /* fall through */ }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

export default function Settings(): JSX.Element {
  const [version, setVersion] = useState<AglcVersion>("4");
  const [showAttribution, setShowAttribution] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formatStatus, setFormatStatus] = useState<string | null>(null);

  const {
    currentVersion,
    latestVersion,
    updateAvailable,
    updateUrl,
    loading: versionLoading,
  } = useVersionCheck();

  const handleCheckForUpdates = useCallback(() => {
    clearVersionCache();
    window.location.reload();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        await store.initStore();
        if (!cancelled) {
          setVersion(store.getAglcVersion());

          // Load attribution preference
          const savedPref = getSetting("obiter-showAttribution");
          const prefValue = savedPref === undefined || savedPref === null ? true : (savedPref as boolean);
          setShowAttribution(prefValue);

          // Check current document for existing attribution
          await Word.run(async (context) => {
            const exists = await hasAttribution(context);
            if (prefValue && !exists) {
              await insertAttribution(context);
            }
          });

          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load settings";
          setError(message);
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAttributionChange = useCallback(async (enabled: boolean) => {
    try {
      setShowAttribution(enabled);
      setSetting("obiter-showAttribution", enabled);
      await Word.run(async (context) => {
        if (enabled) {
          await insertAttribution(context);
        } else {
          await removeAttribution(context);
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update attribution";
      setError(message);
    }
  }, []);

  const handleVersionChange = useCallback(async (newVersion: AglcVersion) => {
    try {
      await store.setAglcVersion(newVersion);
      setVersion(newVersion);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save version";
      setError(message);
    }
  }, []);

  const handleApplyStyles = useCallback(async () => {
    try {
      setFormatStatus(null);
      await Word.run(async (context) => {
        await applyAglc4Styles(context);
      });
      setFormatStatus("AGLC4 styles applied successfully.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to apply styles";
      setError(message);
    }
  }, []);

  const handleApplyTemplate = useCallback(async () => {
    try {
      setFormatStatus(null);
      await Word.run(async (context) => {
        await applyAglc4Template(context);
      });
      setFormatStatus("AGLC4 template applied successfully.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to apply template";
      setError(message);
    }
  }, []);

  const handleApplyHeading = useCallback(async (level: string) => {
    const levelMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
      I: 1, II: 2, III: 3, IV: 4, V: 5,
    };
    const numericLevel = levelMap[level];
    if (!numericLevel) return;

    try {
      setFormatStatus(null);
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("paragraphs");
        await context.sync();

        let existingListId: number | undefined;

        for (let i = 0; i < selection.paragraphs.items.length; i++) {
          const para = selection.paragraphs.items[i];
          const sequenceNumber = i + 1;
          const list = await applyHeadingLevel(
            context,
            para,
            numericLevel,
            sequenceNumber,
            existingListId
          );
          if (list && existingListId === undefined) {
            existingListId = list.id;
          }
        }
      });
      setFormatStatus(`Applied AGLC4 Level ${level} heading style.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to apply heading style";
      setError(message);
    }
  }, []);

  if (loading) {
    return (
      <div>
        <h2>Settings</h2>
        <p>Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2>Settings</h2>
        <p style={{ color: "var(--colour-error)" }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Settings</h2>

      <p style={{ fontSize: 13, margin: "0 0 8px", color: "var(--colour-text-secondary)" }}>
        {APP_NAME} v{currentVersion}
      </p>

      {updateAvailable && latestVersion && (
        <div
          style={{
            fontSize: 12,
            padding: "8px 10px",
            marginBottom: 12,
            borderRadius: 4,
            background: "var(--colour-surface)",
            border: "1px solid var(--colour-border)",
          }}
        >
          Update available: v{latestVersion}.{" "}
          {updateUrl ? (
            <a href={updateUrl} target="_blank" rel="noopener noreferrer">
              View release
            </a>
          ) : (
            <a
              href={`https://github.com/${GITHUB_REPO}/releases/latest`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View release
            </a>
          )}
        </div>
      )}

      <fieldset className="settings-section">
        <legend className="settings-section-title">AGLC Version</legend>

        <label className="settings-radio">
          <input
            type="radio"
            name="aglcVersion"
            value="4"
            checked={version === "4"}
            onChange={() => void handleVersionChange("4")}
          />
          <span className="settings-radio-label">AGLC4</span>
        </label>

        <label className="settings-radio settings-radio--disabled">
          <input
            type="radio"
            name="aglcVersion"
            value="5"
            disabled
          />
          <span className="settings-radio-label">
            AGLC5
            <span className="settings-badge">Coming soon</span>
          </span>
        </label>
      </fieldset>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Branding</legend>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={showAttribution}
            onChange={(e) => void handleAttributionChange(e.target.checked)}
          />
          <span className="settings-toggle-label">
            Show &ldquo;Formatted with Obiter&rdquo; in document
          </span>
        </label>
      </fieldset>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Document Formatting</legend>

        <p style={{ fontSize: 12, margin: "4px 0 8px" }}>
          Apply AGLC4 formatting styles and template settings to the
          current document.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            className="bib-insert-btn"
            onClick={() => void handleApplyStyles()}
          >
            Apply AGLC4 Styles
          </button>

          <button
            className="bib-insert-btn"
            onClick={() => void handleApplyTemplate()}
          >
            Apply AGLC4 Template
          </button>
        </div>

        <p style={{ fontSize: 12, fontWeight: 600, margin: "12px 0 4px", color: "var(--colour-text-secondary)" }}>
          Heading Levels
        </p>

        <p style={{ fontSize: 12, margin: "0 0 6px" }}>
          Apply an AGLC4 heading style to the selected paragraph(s).
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {(["I", "II", "III", "IV", "V"] as const).map((level) => (
            <button
              key={level}
              className="library-btn library-btn--insert"
              style={{ flex: "1 1 auto", minWidth: 48, textAlign: "center" }}
              onClick={() => void handleApplyHeading(level)}
            >
              Level {level}
            </button>
          ))}
        </div>

        {formatStatus && (
          <p style={{ fontSize: 12, color: "var(--colour-success)", margin: "8px 0 0" }}>
            {formatStatus}
          </p>
        )}
      </fieldset>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Built-in Style Picker</legend>

        <p style={{ fontSize: 12, margin: "4px 0 8px" }}>
          Obiter includes an AGLC4.xsl file that adds AGLC4 to
          Word&rsquo;s built-in <strong>References &gt; Style</strong> dropdown.
          This is optional &mdash; the add-in works without it &mdash; but it
          lets you use Word&rsquo;s native citation tools with AGLC4 formatting.
        </p>

        <pre
          style={{
            fontSize: 11,
            background: "var(--colour-surface)",
            color: "var(--colour-ink)",
            padding: 8,
            borderRadius: 4,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            lineHeight: 1.5,
          }}
        >
          {getInstallInstructions()}
        </pre>
      </fieldset>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">About</legend>

        <p style={{ fontSize: 12, margin: "4px 0 6px" }}>
          {APP_NAME} v{currentVersion}
          {latestVersion && !updateAvailable && !versionLoading && (
            <span style={{ color: "var(--colour-text-secondary)" }}> — up to date</span>
          )}
          {updateAvailable && latestVersion && (
            <span style={{ color: "var(--colour-error)" }}> — v{latestVersion} available</span>
          )}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            className="bib-insert-btn"
            onClick={handleCheckForUpdates}
            disabled={versionLoading}
          >
            {versionLoading ? "Checking..." : "Check for updates"}
          </button>
        </div>

        <p style={{ fontSize: 12, margin: "10px 0 4px" }}>
          <a
            href={`https://github.com/${GITHUB_REPO}/releases`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View all releases on GitHub
          </a>
        </p>

        <details style={{ fontSize: 12, marginTop: 8 }}>
          <summary style={{ cursor: "pointer", color: "var(--colour-text-secondary)" }}>
            Sideloading instructions
          </summary>
          <ol style={{ paddingLeft: 18, margin: "6px 0 0", lineHeight: 1.6 }}>
            <li>
              Download the latest release from{" "}
              <a
                href={`https://github.com/${GITHUB_REPO}/releases/latest`}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Releases
              </a>
              .
            </li>
            <li>Extract the downloaded archive.</li>
            <li>
              In Word, go to <strong>Insert &gt; My Add-ins &gt; Upload My Add-in</strong>.
            </li>
            <li>Browse to the extracted <code>manifest.xml</code> file and confirm.</li>
            <li>The updated add-in will load in the task pane.</li>
          </ol>
        </details>
      </fieldset>
    </div>
  );
}
