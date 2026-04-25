/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useEffect, useState, useCallback } from "react";
import { getSharedStore } from "../../store/singleton";
import { AVAILABLE_STANDARDS, type CitationStandardId, type WritingMode } from "../../engine/standards";
import {
  COURT_PRESETS,
  COURT_GROUPS,
  getJurisdictionsByGroup,
  getCourtPreset,
  isCourtJurisdiction,
  type CourtJurisdiction,
  type CourtPreset,
  type ParallelCitationMode,
  type PinpointStyle,
  type UnreportedGate,
  type IbidSuppression,
  type LoaType,
} from "../../engine/court/presets";
import { hasAttribution, insertAcknowledgment, getAcknowledgmentText } from "../../word/branding";
import { writeObiterProperties } from "../../word/documentProperties";
// styleInstaller import removed — XSL now downloaded via button
import { applyAglc4Styles } from "../../word/styles";
import { applyAglc4Template } from "../../word/template";
import { loadTemplatePreferences, saveTemplatePreferences, type TemplatePreferences } from "../../word/documentMeta";
import { APP_NAME, APP_VERSION, GITHUB_REPO } from "../../constants";
import { loadLlmConfig, saveLlmConfig, testConnection, type LLMConfig } from "../../llm/config";
import { loadSearchConfig, saveSearchConfig, type SearchConfig } from "../../api/searchConfig";
import { getDevicePref, setDevicePref } from "../../store/devicePreferences";
import { useVersionCheck, clearVersionCache } from "../hooks/useVersionCheck";
import { useCitationContext } from "../context/CitationContext";
import { enableDebug, disableDebug, isDebugEnabled, getLogHistory, clearLogHistory, exportLogs, runAllTests, getTestResults, setStatusCallback, prepareTestEssay, SCREENSHOT_PREPS } from "../../debug";

type AglcVersion = "4" | "5";

interface ModelOption { value: string; label: string }
const LLM_MODELS: Record<string, ModelOption[]> = {
  openai: [
    { value: "gpt-5.5", label: "GPT-5.5" },
    { value: "gpt-5.4", label: "GPT-5.4" },
    { value: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  anthropic: [
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  ],
  gemini: [
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
  grok: [
    { value: "grok-3", label: "Grok 3" },
    { value: "grok-3-mini", label: "Grok 3 Mini" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  ],
};

const LLM_API_KEY_URLS: Record<string, string> = {
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  gemini: "https://aistudio.google.com/apikey",
  grok: "https://console.x.ai",
  deepseek: "https://platform.deepseek.com/api_keys",
};

const LLM_PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  grok: "xAI Grok",
  deepseek: "DeepSeek",
  custom: "Custom Endpoint",
};


/** Persists the AGLC4 heading list ID across button clicks so all headings join the same list. */
/**
 * INFRA-009: Read a document-level setting from Office.context.document.settings.
 * Used only for per-document preferences (writing mode, auto-refresh, attribution).
 */
function getDocSetting(key: string): unknown {
  try {
    if (typeof Office !== "undefined" && Office.context?.document?.settings) {
      return Office.context.document.settings.get(key);
    }
  } catch { /* fall through */ }
  return undefined;
}

/**
 * INFRA-009: Write a document-level setting to Office.context.document.settings.
 * Used only for per-document preferences (writing mode, auto-refresh, attribution).
 */
function setDocSetting(key: string, value: unknown): void {
  try {
    if (typeof Office !== "undefined" && Office.context?.document?.settings) {
      Office.context.document.settings.set(key, value);
      Office.context.document.settings.saveAsync();
    }
  } catch { /* fall through */ }
}

/** Debug/test/screenshot tools only visible on localhost (dev server). */
const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";

export default function Settings(): JSX.Element {
  const [version, setVersion] = useState<AglcVersion>("4");
  const [standardId, setStandardId] = useState<CitationStandardId>("aglc4");
  const [loading, setLoading] = useState(true);
  const [migrationNotice, setMigrationNotice] = useState(false);
  const [ackStatus, setAckStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formatStatus, setFormatStatus] = useState<string | null>(null);
  const [autoRefreshCitations, setAutoRefreshCitations] = useState(true);
  const [writingMode, setWritingMode] = useState<WritingMode>("academic");
  const [courtJurisdiction, setCourtJurisdiction] = useState<CourtJurisdiction | "">("");
  const [courtToggles, setCourtToggles] = useState<{
    parallelCitations: ParallelCitationMode;
    pinpointStyle: PinpointStyle;
    unreportedGate: UnreportedGate;
    ibidSuppression: IbidSuppression;
    loaType: LoaType;
  }>({
    parallelCitations: "mandatory",
    pinpointStyle: "para-and-page",
    unreportedGate: "off",
    ibidSuppression: "on",
    loaType: "part-ab",
  });
  const { autoRefreshEnabled: _are, setAutoRefreshEnabled, triggerRefresh } = useCitationContext();
  const [templatePrefs, setTemplatePrefs] = useState<TemplatePreferences>(loadTemplatePreferences());
  const [debugEnabled, setDebugEnabled] = useState(isDebugEnabled());
  const [debugLogs, setDebugLogs] = useState<ReturnType<typeof getLogHistory>>([]);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // LLM configuration state
  const [llmProvider, setLlmProvider] = useState<LLMConfig["provider"]>("openai");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("gpt-4o");
  const [llmEndpoint, setLlmEndpoint] = useState("");
  const [llmMaxTokens, setLlmMaxTokens] = useState(1024);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [llmTestStatus, setLlmTestStatus] = useState<string | null>(null);
  const [llmSaveStatus, setLlmSaveStatus] = useState<string | null>(null);

  // Search configuration state
  const [searchConfig, setSearchConfig] = useState<SearchConfig>(loadSearchConfig);

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
        const store = await getSharedStore();
        if (!cancelled) {
          // INFRA-009: For new documents, apply device-level default standard
          const docStandard = getDocSetting("obiter-standardId") as CitationStandardId | undefined;
          if (!docStandard) {
            const deviceDefault = getDevicePref("defaultStandard") as CitationStandardId | undefined;
            if (deviceDefault) {
              await store.setStandardId(deviceDefault);
              setDocSetting("obiter-standardId", deviceDefault);
              // Keep AGLC version in sync
              if (deviceDefault === "aglc4" || deviceDefault === "aglc5") {
                const aglcVer = deviceDefault === "aglc5" ? "5" : "4";
                await store.setAglcVersion(aglcVer);
              }
            }
          }

          setVersion(store.getAglcVersion());
          setStandardId(store.getStandardId());
          setWritingMode(store.getWritingMode());

          // Load court jurisdiction and toggles (COURT-002)
          const savedJurisdiction = store.getCourtJurisdiction();
          if (savedJurisdiction && isCourtJurisdiction(savedJurisdiction)) {
            setCourtJurisdiction(savedJurisdiction);
            const preset = getCourtPreset(savedJurisdiction);
            if (preset) {
              // Load saved toggle overrides, falling back to preset defaults
              const savedToggles = getDevicePref("courtToggles") as Record<string, string> | undefined;
              setCourtToggles({
                parallelCitations: (savedToggles?.parallelCitations as ParallelCitationMode) ?? preset.parallelCitations,
                pinpointStyle: (savedToggles?.pinpointStyle as PinpointStyle) ?? preset.pinpointStyle,
                unreportedGate: (savedToggles?.unreportedGate as UnreportedGate) ?? preset.unreportedGate,
                ibidSuppression: (savedToggles?.ibidSuppression as IbidSuppression) ?? preset.ibidSuppression,
                loaType: (savedToggles?.loaType as LoaType) ?? preset.loaType,
              });
            }
          }

          // Load auto-refresh preference
          const savedAutoRefresh = getDocSetting("obiter-autoRefresh");
          const autoRefreshValue = savedAutoRefresh === undefined || savedAutoRefresh === null ? true : (savedAutoRefresh as boolean);
          setAutoRefreshCitations(autoRefreshValue);
          setAutoRefreshEnabled(autoRefreshValue);

          // Load LLM configuration
          const savedLlmConfig = loadLlmConfig();
          if (savedLlmConfig) {
            setLlmProvider(savedLlmConfig.provider);
            setLlmApiKey(savedLlmConfig.apiKey);
            setLlmModel(savedLlmConfig.model);
            setLlmEndpoint(savedLlmConfig.endpoint ?? "");
            setLlmMaxTokens(savedLlmConfig.maxTokens);
            setLlmEnabled(savedLlmConfig.enabled);
          }

          // INFRA-008: Migration detection — check for legacy footer branding
          const migrationShown = getDevicePref("migrationNoticeShown");
          if (!migrationShown) {
            await Word.run(async (context) => {
              const exists = await hasAttribution(context);
              if (exists) {
                setMigrationNotice(true);
              }
            });
          }

          // INFRA-008 Layer 1: Write document properties
          const currentStandard = store.getStandardId();
          const currentMode = store.getWritingMode();
          await Word.run(async (context) => {
            await writeObiterProperties(context, APP_VERSION, currentStandard, currentMode);
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

  const handleVersionChange = useCallback(async (newVersion: AglcVersion) => {
    try {
      const store = await getSharedStore();
      await store.setAglcVersion(newVersion);
      setVersion(newVersion);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save version";
      setError(message);
    }
  }, []);

  const handleStandardChange = useCallback(async (newStandardId: CitationStandardId) => {
    // Warn when changing standard mid-document
    const store = await getSharedStore();
    if (standardId !== newStandardId && store.getAll().length > 0) {
      const confirmed = window.confirm(
        "This will not reformat existing citations. Continue?"
      );
      if (!confirmed) return;
    }
    try {
      await store.setStandardId(newStandardId);
      setStandardId(newStandardId);
      // INFRA-009: Persist as document-level and device-level default
      setDocSetting("obiter-standardId", newStandardId);
      setDevicePref("defaultStandard", newStandardId);
      // Keep aglcVersion in sync for backward compatibility
      if (newStandardId === "aglc4" || newStandardId === "aglc5") {
        const aglcVer = newStandardId === "aglc5" ? "5" : "4";
        await store.setAglcVersion(aglcVer);
        setVersion(aglcVer);
      } else {
        // Court mode is AGLC-only — reset when switching to another standard
        if (writingMode === "court") {
          await store.setWritingMode("academic");
          setWritingMode("academic");
          setCourtJurisdiction("");
          await store.setCourtJurisdiction(undefined);
          setDocSetting("obiter-writingMode", "academic");
          setDevicePref("courtToggles", undefined);
        }
      }
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save standard";
      setError(message);
    }
  }, [standardId, writingMode, triggerRefresh]);

  const handleWritingModeChange = useCallback(async (mode: WritingMode) => {
    try {
      const store = await getSharedStore();
      await store.setWritingMode(mode);
      setWritingMode(mode);
      setDocSetting("obiter-writingMode", mode);
      // Clear jurisdiction when switching to academic mode
      if (mode === "academic") {
        setCourtJurisdiction("");
        await store.setCourtJurisdiction(undefined);
        setDevicePref("courtToggles", undefined);
      }
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save writing mode";
      setError(message);
    }
  }, [triggerRefresh]);

  const handleJurisdictionChange = useCallback(async (jurisdictionId: string) => {
    try {
      const store = await getSharedStore();
      if (!jurisdictionId) {
        setCourtJurisdiction("");
        await store.setCourtJurisdiction(undefined);
        setDevicePref("courtToggles", undefined);
        return;
      }
      if (!isCourtJurisdiction(jurisdictionId)) return;
      const preset = getCourtPreset(jurisdictionId);
      if (!preset) return;

      setCourtJurisdiction(jurisdictionId as CourtJurisdiction);
      await store.setCourtJurisdiction(jurisdictionId);

      // Apply preset defaults and clear any previous overrides
      const newToggles = {
        parallelCitations: preset.parallelCitations,
        pinpointStyle: preset.pinpointStyle,
        unreportedGate: preset.unreportedGate,
        ibidSuppression: preset.ibidSuppression,
        loaType: preset.loaType,
      };
      setCourtToggles(newToggles);
      setDevicePref("courtToggles", newToggles);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save jurisdiction";
      setError(message);
    }
  }, []);

  const handleToggleOverride = useCallback(<K extends keyof typeof courtToggles>(
    key: K,
    value: (typeof courtToggles)[K],
  ) => {
    setCourtToggles((prev) => {
      const updated = { ...prev, [key]: value };
      setDevicePref("courtToggles", updated);
      return updated;
    });
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

      {migrationNotice && (
        <div
          style={{
            fontSize: 12,
            padding: "8px 10px",
            marginBottom: 12,
            borderRadius: 4,
            background: "var(--colour-surface)",
            border: "1px solid var(--colour-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <span>
            Obiter no longer adds visible branding to documents. The footer line
            has been preserved but can be safely deleted.
          </span>
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "var(--colour-text-secondary)",
              flexShrink: 0,
              padding: 0,
              lineHeight: 1,
            }}
            aria-label="Dismiss notice"
            onClick={() => {
              setMigrationNotice(false);
              setDevicePref("migrationNoticeShown", true);
            }}
          >
            ×
          </button>
        </div>
      )}

      <fieldset className="settings-section">
        <legend className="settings-section-title">Citation Standard</legend>

        <label style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
          Standard
          <select
            className="ic-select"
            style={{ width: "100%", marginTop: 4 }}
            value={
              standardId.startsWith("aglc") ? "AGLC"
                : standardId.startsWith("oscola") ? "OSCOLA"
                : "NZLSG"
            }
            onChange={(e) => {
              const family = e.target.value;
              // Select the first non-coming-soon edition for the family
              const firstAvailable = AVAILABLE_STANDARDS.find(
                (s) => s.family === family && !s.comingSoon
              );
              if (firstAvailable) {
                void handleStandardChange(firstAvailable.id);
              }
            }}
          >
            <option value="AGLC">AGLC</option>
            <option value="OSCOLA">OSCOLA</option>
            <option value="NZLSG">NZLSG</option>
          </select>
        </label>

        <label style={{ fontSize: 12, display: "block" }}>
          Edition
          <div style={{ marginTop: 4 }}>
            {AVAILABLE_STANDARDS
              .filter((s) => {
                const currentFamily = standardId.startsWith("aglc") ? "AGLC"
                  : standardId.startsWith("oscola") ? "OSCOLA"
                  : "NZLSG";
                return s.family === currentFamily;
              })
              .map((s) => (
                <label key={s.id} className={`settings-radio${s.comingSoon ? " settings-radio--disabled" : ""}`}>
                  <input
                    type="radio"
                    name="standardEdition"
                    value={s.id}
                    checked={standardId === s.id}
                    disabled={s.comingSoon}
                    onChange={() => void handleStandardChange(s.id)}
                  />
                  <span className="settings-radio-label">
                    {s.label} — {s.edition}
                    {s.comingSoon && (
                      <span className="settings-badge">Coming soon</span>
                    )}
                  </span>
                </label>
              ))}
          </div>
        </label>
      </fieldset>

      {standardId.startsWith("aglc") && (
      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Writing Mode</legend>

        <label style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
          <select
            className="ic-select"
            style={{ width: "100%", marginTop: 4 }}
            value={writingMode}
            onChange={(e) => void handleWritingModeChange(e.target.value as WritingMode)}
          >
            <option value="academic">Academic</option>
            <option value="court">Court Submission</option>
          </select>
        </label>
        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 0" }}>
          {writingMode === "court"
            ? "Court mode: no ibid, short case names without (n X), parallel citations by default, List of Authorities instead of bibliography."
            : "Standard academic footnote citation with ibid, short references, and bibliography."}
        </p>

        {writingMode === "court" && (
          <>
            <label style={{ fontSize: 12, display: "block", marginTop: 10, marginBottom: 6 }}>
              Jurisdiction
              <select
                className="ic-select"
                style={{ width: "100%", marginTop: 4 }}
                value={courtJurisdiction}
                onChange={(e) => void handleJurisdictionChange(e.target.value)}
              >
                <option value="">Select a court...</option>
                {COURT_GROUPS.map((group) => (
                  <optgroup key={group} label={group}>
                    {getJurisdictionsByGroup(group).map((id) => (
                      <option key={id} value={id}>{COURT_PRESETS[id].label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            {courtJurisdiction && (
              <div style={{ marginTop: 8, padding: "8px 10px", background: "var(--colour-surface)", borderRadius: 4, border: "1px solid var(--colour-border)" }}>
                <p style={{ fontSize: 11, fontWeight: 600, margin: "0 0 6px", color: "var(--colour-text-secondary)" }}>
                  Court toggles (override preset defaults)
                </p>

                <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                  Parallel citations
                  <select
                    className="ic-select"
                    style={{ width: "100%", marginTop: 2 }}
                    value={courtToggles.parallelCitations}
                    onChange={(e) => handleToggleOverride("parallelCitations", e.target.value as ParallelCitationMode)}
                  >
                    <option value="off">Off</option>
                    <option value="preferred">Preferred</option>
                    <option value="mandatory">Mandatory</option>
                  </select>
                </label>

                <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                  Pinpoint style
                  <select
                    className="ic-select"
                    style={{ width: "100%", marginTop: 2 }}
                    value={courtToggles.pinpointStyle}
                    onChange={(e) => handleToggleOverride("pinpointStyle", e.target.value as PinpointStyle)}
                  >
                    <option value="page-only">Page only</option>
                    <option value="para-only">Paragraph only</option>
                    <option value="para-and-page">Paragraph and page</option>
                  </select>
                </label>

                <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                  Authorised-report hierarchy
                  <input
                    type="text"
                    className="ic-input"
                    style={{ width: "100%", marginTop: 2 }}
                    value={getCourtPreset(courtJurisdiction)?.authorisedReportHierarchy.join(" \u2192 ") ?? "MNC only"}
                    disabled
                  />
                </label>

                <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                  Unreported-judgment gate
                  <select
                    className="ic-select"
                    style={{ width: "100%", marginTop: 2 }}
                    value={courtToggles.unreportedGate}
                    onChange={(e) => handleToggleOverride("unreportedGate", e.target.value as UnreportedGate)}
                  >
                    <option value="off">Off</option>
                    <option value="warn">Warn</option>
                  </select>
                </label>

                <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                  Ibid / (n X) suppression
                  <select
                    className="ic-select"
                    style={{ width: "100%", marginTop: 2 }}
                    value={courtToggles.ibidSuppression}
                    onChange={(e) => handleToggleOverride("ibidSuppression", e.target.value as IbidSuppression)}
                  >
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </label>

                <label style={{ fontSize: 11, display: "block", marginBottom: 0 }}>
                  List of Authorities
                  <select
                    className="ic-select"
                    style={{ width: "100%", marginTop: 2 }}
                    value={courtToggles.loaType}
                    onChange={(e) => handleToggleOverride("loaType", e.target.value as LoaType)}
                  >
                    <option value="off">Off</option>
                    <option value="simple">Simple</option>
                    <option value="part-ab">Part A / Part B</option>
                  </select>
                </label>
              </div>
            )}
          </>
        )}
      </fieldset>
      )}

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Citation Management</legend>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={autoRefreshCitations}
            onChange={(e) => {
              setAutoRefreshCitations(e.target.checked);
              setAutoRefreshEnabled(e.target.checked);
              setDocSetting("obiter-autoRefresh", e.target.checked);
            }}
          />
          <span className="settings-toggle-label">
            Auto-refresh ibid and subsequent references
          </span>
        </label>
        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "4px 0 0" }}>
          Automatically updates ibid, short references, and cross-reference
          numbers when footnotes are added, moved, or deleted.
        </p>
      </fieldset>

      <details style={{ marginTop: 16 }}>
        <summary style={{
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          color: "var(--colour-text-secondary)",
          padding: "var(--space-sm) 0",
        }}>
          Advanced Settings
        </summary>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Acknowledgment</legend>

        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 8px" }}>
          Obiter is free and open-source. If you find it useful, consider
          acknowledging it in your document.
        </p>

        <div style={{ display: "flex", gap: 4 }}>
          <button
            className="library-btn library-btn--insert"
            onClick={async () => {
              try {
                const store = await getSharedStore();
                const stdId = store.getStandardId();
                const label = AVAILABLE_STANDARDS.find((s) => s.id === stdId)?.label ?? "AGLC4";
                await Word.run(async (context) => {
                  await insertAcknowledgment(context, label);
                });
                setAckStatus("Inserted");
                setTimeout(() => setAckStatus(null), 2000);
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to insert acknowledgment");
              }
            }}
          >
            Insert acknowledgment
          </button>
          <button
            className="library-btn"
            onClick={async () => {
              try {
                const store = await getSharedStore();
                const stdId = store.getStandardId();
                const label = AVAILABLE_STANDARDS.find((s) => s.id === stdId)?.label ?? "AGLC4";
                await navigator.clipboard.writeText(getAcknowledgmentText(label));
                setAckStatus("Copied");
                setTimeout(() => setAckStatus(null), 2000);
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to copy acknowledgment");
              }
            }}
          >
            Copy acknowledgment
          </button>
        </div>

        {ackStatus && (
          <p style={{ fontSize: 11, margin: "6px 0 0", color: "var(--colour-success)" }}>
            {ackStatus}
          </p>
        )}
      </fieldset>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Template Defaults</legend>

        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 12, cursor: "pointer", color: "var(--colour-accent)" }}>
            Customise template defaults
          </summary>
          <div style={{ padding: "8px 0", display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11 }}>
              Font
              <select
                className="ic-select"
                style={{ marginLeft: 8, width: "auto" }}
                value={templatePrefs.fontName}
                onChange={(e) => {
                  const updated = { ...templatePrefs, fontName: e.target.value };
                  setTemplatePrefs(updated);
                  saveTemplatePreferences(updated);
                }}
              >
                <option value="Times New Roman">Times New Roman</option>
                <option value="Calibri">Calibri</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Garamond">Garamond</option>
              </select>
            </label>
            <label style={{ fontSize: 11 }}>
              Font size
              <select
                className="ic-select"
                style={{ marginLeft: 8, width: "auto" }}
                value={templatePrefs.fontSize}
                onChange={(e) => {
                  const updated = { ...templatePrefs, fontSize: Number(e.target.value) };
                  setTemplatePrefs(updated);
                  saveTemplatePreferences(updated);
                }}
              >
                <option value={10}>10pt</option>
                <option value={11}>11pt</option>
                <option value={12}>12pt</option>
                <option value={13}>13pt</option>
                <option value={14}>14pt</option>
              </select>
            </label>
            <label style={{ fontSize: 11 }}>
              Line spacing
              <select
                className="ic-select"
                style={{ marginLeft: 8, width: "auto" }}
                value={templatePrefs.lineSpacing}
                onChange={(e) => {
                  const updated = { ...templatePrefs, lineSpacing: Number(e.target.value) };
                  setTemplatePrefs(updated);
                  saveTemplatePreferences(updated);
                }}
              >
                <option value={12}>Single</option>
                <option value={18}>1.5</option>
                <option value={24}>Double</option>
              </select>
            </label>
            <label style={{ fontSize: 11 }}>
              <input
                type="checkbox"
                checked={templatePrefs.includeTitle}
                onChange={(e) => {
                  const updated = { ...templatePrefs, includeTitle: e.target.checked };
                  setTemplatePrefs(updated);
                  saveTemplatePreferences(updated);
                }}
              />
              {" "}Include title placeholder
            </label>
            <label style={{ fontSize: 11 }}>
              <input
                type="checkbox"
                checked={templatePrefs.includeAuthor}
                onChange={(e) => {
                  const updated = { ...templatePrefs, includeAuthor: e.target.checked };
                  setTemplatePrefs(updated);
                  saveTemplatePreferences(updated);
                }}
              />
              {" "}Include author placeholder
            </label>
            <label style={{ fontSize: 11 }}>
              <input
                type="checkbox"
                checked={templatePrefs.includeNotice}
                onChange={(e) => {
                  const updated = { ...templatePrefs, includeNotice: e.target.checked };
                  setTemplatePrefs(updated);
                  saveTemplatePreferences(updated);
                }}
              />
              {" "}Include install notice in templates
            </label>

            <button
              className="library-btn library-btn--insert"
              style={{ marginTop: 8, width: "100%" }}
              onClick={async () => {
                try {
                  setFormatStatus(null);
                  const { prepareAsTemplate } = await import("../../word/templateExporter");
                  await Word.run(async (context) => {
                    try { await applyAglc4Styles(context); } catch { /* */ }
                    await applyAglc4Template(context);
                    await prepareAsTemplate(context);
                  });
                  setFormatStatus(
                    "Template prepared. Save as .dotx: File > Save As > " +
                    "choose 'Word Template (.dotx)'. New documents created " +
                    "from this template will have AGLC4 formatting pre-configured."
                  );
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : "Failed to prepare template");
                }
              }}
            >
              Prepare as Template (.dotx)
            </button>
            <p style={{ fontSize: 10, color: "var(--colour-text-secondary)", margin: "4px 0 0" }}>
              Sets up AGLC4 styles, formatting, and an install notice, then
              prompts you to save as a Word Template. New documents created
              from this template inherit all AGLC4 formatting.
              The install notice is automatically removed when Obiter is loaded.
            </p>
          </div>
        </details>

      </fieldset>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Word Citation Style (Optional)</legend>

        <p style={{ fontSize: 12, margin: "4px 0 8px" }}>
          Add AGLC4 to Word&rsquo;s built-in <strong>References &gt; Style</strong> dropdown.
          This is optional &mdash; Obiter&rsquo;s own citation tools are more capable.
        </p>

        <button
          className="library-btn library-btn--insert"
          onClick={async () => {
            try {
              // Fetch the real XSL from the same server hosting the add-in
              const response = await fetch("/AGLC4.xsl");
              let xslContent: string;
              if (response.ok) {
                xslContent = await response.text();
              } else {
                // Fallback: direct the user to the website
                window.open("https://obiter.com.au/AGLC4.xsl", "_blank");
                setFormatStatus("Download started from obiter.com.au.");
                return;
              }
              const blob = new Blob([xslContent], { type: "application/xml" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "AGLC4.xsl";
              a.click();
              URL.revokeObjectURL(url);
              setFormatStatus(
                "AGLC4.xsl downloaded. Copy it to Word's Style folder and restart Word."
              );
            } catch {
              window.open("https://obiter.com.au", "_blank");
              setFormatStatus("Visit obiter.com.au to download the style file.");
            }
          }}
        >
          Download AGLC4.xsl
        </button>
        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "4px 0 0" }}>
          After downloading, copy to Word&rsquo;s Style folder and restart Word.
          See <a href="https://obiter.com.au" target="_blank" rel="noopener noreferrer" style={{ color: "var(--colour-accent)" }}>obiter.com.au</a> for
          step-by-step instructions.
        </p>
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

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Source Lookup (Optional)</legend>

        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 8px" }}>
          Enable typeahead search in citation fields. Queries are routed through
          the Obiter proxy to external legal databases. No data is sent unless
          you type in a citation field with lookup enabled.
        </p>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={searchConfig.enabled}
            onChange={(e) => {
              const updated = { ...searchConfig, enabled: e.target.checked };
              setSearchConfig(updated);
              saveSearchConfig(updated);
            }}
          />
          <span className="settings-toggle-label">
            Enable source lookup
          </span>
        </label>

        <div style={{ marginTop: 8, paddingLeft: 4, opacity: searchConfig.enabled ? 1 : 0.5 }}>
          <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 6px" }}>
            Select which providers to search:
          </p>
          <label className="settings-toggle" style={{ fontSize: 12 }}>
            <input
              type="checkbox"
              checked={searchConfig.providers.austlii}
              disabled={!searchConfig.enabled}
              onChange={(e) => {
                const updated = { ...searchConfig, providers: { ...searchConfig.providers, austlii: e.target.checked } };
                setSearchConfig(updated);
                saveSearchConfig(updated);
              }}
            />
            <span className="settings-toggle-label">AustLII (cases and legislation)</span>
          </label>
          <label className="settings-toggle" style={{ fontSize: 12 }}>
            <input
              type="checkbox"
              checked={searchConfig.providers.jade}
              disabled={!searchConfig.enabled}
              onChange={(e) => {
                const updated = { ...searchConfig, providers: { ...searchConfig.providers, jade: e.target.checked } };
                setSearchConfig(updated);
                saveSearchConfig(updated);
              }}
            />
            <span className="settings-toggle-label">Jade.io (Australian cases)</span>
          </label>
          <label className="settings-toggle" style={{ fontSize: 12 }}>
            <input
              type="checkbox"
              checked={searchConfig.providers.legislation}
              disabled={!searchConfig.enabled}
              onChange={(e) => {
                const updated = { ...searchConfig, providers: { ...searchConfig.providers, legislation: e.target.checked } };
                setSearchConfig(updated);
                saveSearchConfig(updated);
              }}
            />
            <span className="settings-toggle-label">Federal Register of Legislation</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">AI Assistant (Optional)</legend>

        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 8px" }}>
          Connect an AI provider to verify citations, parse raw citation text,
          and suggest short titles. You provide your own API key — no data is
          sent without your explicit action.
        </p>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={llmEnabled}
            onChange={(e) => setLlmEnabled(e.target.checked)}
          />
          <span className="settings-toggle-label">
            Enable AI features
          </span>
        </label>

        <label style={{ fontSize: 12, display: "block", marginTop: 8 }}>
          Provider
          <select
            className="ic-select"
            style={{ width: "100%", marginTop: 4 }}
            value={llmProvider}
            onChange={(e) => {
              const provider = e.target.value as LLMConfig["provider"];
              setLlmProvider(provider);
              if (LLM_MODELS[provider]) {
                setLlmModel(LLM_MODELS[provider][0].value);
              } else {
                setLlmModel("");
              }
            }}
          >
            {Object.entries(LLM_PROVIDER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 12, display: "block", marginTop: 8 }}>
          API Key
          <input
            type="password"
            className="ic-input"
            style={{ width: "100%", marginTop: 4 }}
            value={llmApiKey}
            onChange={(e) => setLlmApiKey(e.target.value)}
            placeholder={llmProvider === "openai" ? "sk-..." : llmProvider === "anthropic" ? "sk-ant-..." : "Enter API key"}
          />
        </label>
        {llmProvider !== "custom" && LLM_API_KEY_URLS[llmProvider] && (
          <p style={{ fontSize: 11, margin: "4px 0 0" }}>
            <a
              href={LLM_API_KEY_URLS[llmProvider]}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--colour-accent)" }}
            >
              Get {LLM_PROVIDER_LABELS[llmProvider] ?? llmProvider} API key
            </a>
            {" — requires an account. Usage is billed per request."}
          </p>
        )}

        <label style={{ fontSize: 12, display: "block", marginTop: 8 }}>
          Model
          {!LLM_MODELS[llmProvider] ? (
            <input
              type="text"
              className="ic-input"
              style={{ width: "100%", marginTop: 4 }}
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
              placeholder="Enter model name"
            />
          ) : (
            <select
              className="ic-select"
              style={{ width: "100%", marginTop: 4 }}
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
            >
              {LLM_MODELS[llmProvider].map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          )}
        </label>

        {llmProvider === "custom" && (
          <label style={{ fontSize: 12, display: "block", marginTop: 8 }}>
            Custom Endpoint
            <input
              type="text"
              className="ic-input"
              style={{ width: "100%", marginTop: 4 }}
              value={llmEndpoint}
              onChange={(e) => setLlmEndpoint(e.target.value)}
              placeholder="https://api.example.com/v1/chat"
            />
          </label>
        )}

        <label style={{ fontSize: 12, display: "block", marginTop: 8 }}>
          Max Tokens
          <input
            type="number"
            className="ic-input"
            style={{ width: "100%", marginTop: 4 }}
            value={llmMaxTokens}
            min={1}
            onChange={(e) => setLlmMaxTokens(Number(e.target.value) || 1024)}
          />
        </label>

        <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
          <button
            className="library-btn library-btn--insert"
            onClick={async () => {
              setLlmTestStatus("Testing...");
              const config: LLMConfig = {
                provider: llmProvider,
                apiKey: llmApiKey,
                model: llmModel,
                endpoint: llmProvider === "custom" ? llmEndpoint : undefined,
                maxTokens: llmMaxTokens,
                enabled: llmEnabled,
              };
              const result = await testConnection(config);
              setLlmTestStatus(result.ok ? "Connected" : `Failed: ${result.error ?? "Unknown error"}`);
            }}
          >
            Test Connection
          </button>
          <button
            className="library-btn library-btn--insert"
            onClick={() => {
              const config: LLMConfig = {
                provider: llmProvider,
                apiKey: llmApiKey,
                model: llmModel,
                endpoint: llmProvider === "custom" ? llmEndpoint : undefined,
                maxTokens: llmMaxTokens,
                enabled: llmEnabled,
              };
              saveLlmConfig(config);
              setLlmSaveStatus("Saved");
              setTimeout(() => setLlmSaveStatus(null), 2000);
            }}
          >
            Save
          </button>
        </div>

        <div aria-live="polite" role="status">
          {llmTestStatus && (
            <p style={{
              fontSize: 11,
              margin: "6px 0 0",
              color: llmTestStatus === "Connected" ? "var(--colour-success)"
                : llmTestStatus === "Testing..." ? "var(--colour-text-secondary)"
                : "var(--colour-error)",
            }}>
              {llmTestStatus === "Connected" ? "Success: " : llmTestStatus === "Failed" ? "Error: " : ""}
              {llmTestStatus}
            </p>
          )}

          {llmSaveStatus && (
            <p style={{ fontSize: 11, margin: "6px 0 0", color: "var(--colour-success)" }}>
              {llmSaveStatus}
            </p>
          )}
        </div>
      </fieldset>

      {isDev && <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Debug</legend>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={debugEnabled}
            onChange={(e) => {
              if (e.target.checked) {
                enableDebug();
              } else {
                disableDebug();
              }
              setDebugEnabled(e.target.checked);
            }}
          />
          <span className="settings-toggle-label">
            Enable verbose logging
          </span>
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          <button
            className="library-btn library-btn--insert"
            onClick={async () => {
              setTestStatus("Running tests...");
              enableDebug();
              setDebugEnabled(true);
              // Register live status callback
              setStatusCallback((status) => {
                setTestStatus(status);
              });
              try {
                const testResults = await runAllTests();
                const passed = testResults.filter((r) => r.passed).length;
                const failed = testResults.filter((r) => !r.passed).length;
                setTestStatus(`Complete: ${passed} passed, ${failed} failed`);
                setDebugLogs(getLogHistory().slice(-100));
              } catch (err: unknown) {
                setTestStatus(err instanceof Error ? err.message : "Test run failed");
              } finally {
                setStatusCallback(null);
              }
            }}
          >
            Run Tests
          </button>
          <button
            className="library-btn"
            onClick={() => {
              setDebugLogs(getLogHistory().slice(-50));
            }}
          >
            Show Logs
          </button>
          <button
            className="library-btn"
            onClick={() => {
              const text = exportLogs();
              const blob = new Blob([text], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `obiter-debug-${new Date().toISOString().slice(0, 19)}.log`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export
          </button>
          <button
            className="library-btn"
            onClick={() => {
              clearLogHistory();
              setDebugLogs([]);
              setTestStatus(null);
            }}
          >
            Clear
          </button>
        </div>

        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 12, cursor: "pointer", color: "var(--colour-accent)" }}>
            Screenshot Preparation
          </summary>
          <div style={{ padding: "8px 0", display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              className="library-btn library-btn--insert"
              style={{ width: "100%" }}
              onClick={async () => {
                setTestStatus("Preparing test essay...");
                try {
                  await prepareTestEssay();
                  setTestStatus("Essay prepared with citations. Use screenshot buttons below.");
                } catch (err: unknown) {
                  setTestStatus(err instanceof Error ? err.message : "Failed to prepare essay");
                }
              }}
            >
              Prepare Test Essay
            </button>
            {SCREENSHOT_PREPS.map((s) => (
              <button
                key={s.id}
                className="library-btn"
                style={{ width: "100%", textAlign: "left", fontSize: 11 }}
                onClick={async () => {
                  setTestStatus(`Preparing screenshot ${s.id}...`);
                  try {
                    await s.fn();
                    setTestStatus(`Ready for screenshot ${s.id}: ${s.label}`);
                  } catch (err: unknown) {
                    setTestStatus(err instanceof Error ? err.message : "Failed");
                  }
                }}
              >
                Screenshot {s.id}: {s.label}
              </button>
            ))}
          </div>
        </details>

        <div aria-live="polite" role="status">
          {testStatus && (
            <p style={{ fontSize: 11, margin: "8px 0 0", color: testStatus.includes("failed") ? "var(--colour-error)" : "var(--colour-success)" }}>
              {testStatus}
            </p>
          )}
        </div>

        {debugLogs.length > 0 && (
          <div style={{
            marginTop: 8,
            maxHeight: 200,
            overflow: "auto",
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            background: "var(--colour-surface)",
            borderRadius: "var(--radius-md)",
            padding: 8,
            lineHeight: 1.4,
          }}>
            {debugLogs.map((entry, i) => (
              <div key={i} style={{
                color: entry.level === "error" ? "var(--colour-error)"
                  : entry.level === "warn" ? "var(--colour-warning)"
                  : entry.level === "info" ? "var(--colour-accent)"
                  : "var(--colour-text-secondary)",
                marginBottom: 2,
              }}>
                [{entry.level.toUpperCase()}] [{entry.module}] {entry.message}
                {entry.data !== undefined && entry.data !== "" ? ` | ${JSON.stringify(entry.data)}` : ""}
              </div>
            ))}
          </div>
        )}
      </fieldset>}
      </details>
    </div>
  );
}
