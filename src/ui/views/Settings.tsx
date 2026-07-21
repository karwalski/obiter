/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useEffect, useState, useCallback } from "react";
import { getSharedStore } from "../../store/singleton";
import { lockAllObiterFootnotes } from "../../word/footnoteManager";
import { AVAILABLE_STANDARDS, type CitationStandardId, type WritingMode } from "../../engine/standards";
import {
  COURT_PRESETS,
  COURT_GROUPS,
  getJurisdictionsByGroup,
  getCourtPreset,
  isCourtJurisdiction,
  type CourtJurisdiction,
  type ParallelCitationMode,
  type PinpointStyle,
  type UnreportedGate,
  type IbidSuppression,
  type LoaType,
  type ParallelOrder,
} from "../../engine/court/presets";
import { hasAttribution, insertAcknowledgment, getAcknowledgmentText } from "../../word/branding";
import { writeObiterProperties } from "../../word/documentProperties";
// styleInstaller import removed — XSL now downloaded via button
import { applyAglc4Styles } from "../../word/styles";
import { applyAglc4Template } from "../../word/template";
import { loadTemplatePreferences, saveTemplatePreferences, type TemplatePreferences } from "../../word/documentMeta";
import { APP_NAME, APP_VERSION, GITHUB_REPO } from "../../constants";
import { loadLlmConfig, saveLlmConfig, testConnection, clearStoredKeys, type LLMConfig } from "../../llm/config";
import {
  isSignedIn as authIsSignedIn,
  getEmail as authGetEmail,
  signOut as authSignOut,
  deleteAccount as authDeleteAccount,
  exportData as authExportData,
  fetchMe as authFetchMe,
  clearSession as authClearSession,
  type StepUp,
} from "../../api/authClient";
import { openAuthDialog, isDialogAuthSupported, type AuthMode } from "../../api/authDialog";
import {
  listVaultKeys,
  deleteVaultKey,
  type VaultKeyMeta,
  type StepUpCredential,
} from "../../api/vaultKeys";
import {
  setVaultKeyProviders,
  hasLocalKeyOverride,
  setLocalKeyOverride,
  clearVaultMode,
} from "../../llm/vaultMode";
import {
  getAllAdapters,
  getAdaptersByTier,
  isAdapterEnabled,
  setAdapterEnabled,
  isMasterEnabled,
  setMasterEnabled,
  TIER_LABELS,
  type AdapterTier,
  type HealthStatus,
} from "../../api/sourceRegistry";
import { getAdapterInstance, initialiseAdapters } from "../../api/adapterSearch";
import { saveKey, getKey, removeKey, hasKey } from "../../api/keyVault";
import { getDevicePref, setDevicePref } from "../../store/devicePreferences";
import { useComfortMode } from "../hooks/useComfortMode";
import {
  checkCorpusAvailable,
  getCorpusStatus,
  getCorpusIndex,
  getCorpusMeta,
  downloadCorpusIndex,
  deleteCorpus,
  clearCorpusSkip,
  isCorpusSkipped,
  skipCorpus,
  type CorpusStatus,
} from "../../api/corpus/corpusDownload";
import { registerCorpusAfterDownload } from "../../api/initializeAdapters";
import { useVersionCheck, clearVersionCache } from "../hooks/useVersionCheck";
import { useCitationContext } from "../context/CitationContext";
import { enableDebug, disableDebug, isDebugEnabled, getLogHistory, clearLogHistory, exportLogs, runAllTests, setStatusCallback, prepareTestEssay, SCREENSHOT_PREPS } from "../../debug";

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
    { value: "claude-opus-4-8", label: "Claude Opus 4.8" },
    { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
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

/**
 * Builds the non-blocking notice shown after a writing-mode or jurisdiction
 * change. Same mechanism as the standardNotice (WEB-013: window.confirm is
 * blocked in the Office web add-in iframe, so a hard confirm is never used).
 *
 * Always includes the locked-footnote line — counting locked footnotes would
 * need a Word.run scan, and the refresher already reports them via
 * lockedSkipped — and adds the Manual Citations Mode line only when that
 * device preference is on (refreshes are gated off entirely in that mode).
 */
function buildReformatNotice(lead: string): string {
  const parts = [
    lead,
    "Existing citations reformat on the next refresh.",
    "Locked footnotes keep their current formatting. Unlock a footnote and run Refresh All to update it.",
  ];
  if (getDevicePref("manualCitationMode") === true) {
    parts.push("Manual Citations Mode is on, so citations will not update until it is turned off.");
  }
  return parts.join(" ");
}

export default function Settings(): JSX.Element {
  // Ensure adapters are instantiated and registered in the sourceRegistry
  // before any state initialisation reads from it.
  initialiseAdapters();

  const [comfortMode, setComfortMode] = useComfortMode();

  const [, setVersion] = useState<AglcVersion>("4");
  const [standardId, setStandardId] = useState<CitationStandardId>("aglc4");
  const [loading, setLoading] = useState(true);
  const [migrationNotice, setMigrationNotice] = useState(false);
  const [ackStatus, setAckStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [standardNotice, setStandardNotice] = useState<string | null>(null);
  // Non-blocking warning after a writing-mode / jurisdiction change (WEB-013).
  const [modeNotice, setModeNotice] = useState<string | null>(null);
  const [, setFormatStatus] = useState<string | null>(null);
  const [autoRefreshCitations, setAutoRefreshCitations] = useState(true);
  // Confirmation shown when leaving Manual Citations Mode (resuming auto would
  // re-apply formatting and could overwrite manual edits).
  const [manualExitConfirm, setManualExitConfirm] = useState(false);
  const [writingMode, setWritingMode] = useState<WritingMode>("academic");
  const [courtJurisdiction, setCourtJurisdiction] = useState<CourtJurisdiction | "">("");
  const [courtToggles, setCourtToggles] = useState<{
    parallelCitations: ParallelCitationMode;
    pinpointStyle: PinpointStyle;
    unreportedGate: UnreportedGate;
    ibidSuppression: IbidSuppression;
    loaType: LoaType;
    /** PD-driven parallel citation order (e.g. WA MNC-first); no UI control. */
    parallelOrder?: ParallelOrder;
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
  // TRUST-006: the stored key is never echoed back into the input. The field
  // holds only what the user types this session; llmKeyHint carries at most
  // the last 4 characters of the stored key for the "key on file" notice.
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmKeyHint, setLlmKeyHint] = useState("");
  const [removeKeysConfirm, setRemoveKeysConfirm] = useState(false);
  const [llmModel, setLlmModel] = useState(LLM_MODELS.openai[0].value);
  const [llmEndpoint, setLlmEndpoint] = useState("");
  const [llmMaxTokens, setLlmMaxTokens] = useState(1024);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [llmTestStatus, setLlmTestStatus] = useState<string | null>(null);
  const [llmSaveStatus, setLlmSaveStatus] = useState<string | null>(null);

  // ACCT-005: Account state (sign in / out, vault keys, step-up).
  const [signedIn, setSignedIn] = useState(() => authIsSignedIn());
  const [accountEmail, setAccountEmail] = useState<string | null>(() => authGetEmail());
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [vaultKeys, setVaultKeys] = useState<VaultKeyMeta[]>([]);
  const [syncedSettings, setSyncedSettings] = useState<boolean>(
    () => getDevicePref("syncedSettings") === true
  );
  // Local-BYOK override for the active LLM provider (per-device, ACCT-005).
  const [localKeyOverride, setLocalKeyOverrideState] = useState(false);
  // Step-up modal for removing a vaulted key (WEB-013: never window.confirm).
  const [stepUpProvider, setStepUpProvider] = useState<string | null>(null);
  const [stepUpCode, setStepUpCode] = useState("");
  const [stepUpPassword, setStepUpPassword] = useState("");
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  // Delete-account confirmation modal (step-up).
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  // ACCT-007: live MFA status from GET /api/user/me (null until loaded).
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);

  // Source registry master toggle + adapter state (17.2 / 17.3)
  const [masterEnabled, setMasterEnabledState] = useState(() => isMasterEnabled());
  const [adapterHealthDots, setAdapterHealthDots] = useState<Record<string, HealthStatus>>(() => {
    const map: Record<string, HealthStatus> = {};
    for (const a of getAllAdapters()) {
      map[a.id] = a.health;
    }
    return map;
  });
  const [adapterHealthErrors, setAdapterHealthErrors] = useState<Record<string, string>>({});

  // Source registry state (17.2 / 17.3)
  const [adapterToggles, setAdapterToggles] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const a of getAllAdapters()) {
      map[a.id] = isAdapterEnabled(a.id);
    }
    return map;
  });
  // TRUST-006: stored adapter keys are never echoed back into the inputs.
  // adapterKeys holds only what the user types this session; adapterKeyHints
  // carries at most the last 4 characters of each stored key.
  const [adapterKeys, setAdapterKeys] = useState<Record<string, string>>({});
  const [adapterKeyHints, setAdapterKeyHints] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const a of getAllAdapters()) {
      if (a.requiresKey) {
        const stored = getKey(a.id);
        if (stored) map[a.id] = stored.slice(-4);
      }
    }
    return map;
  });
  const [keyVisibility, setKeyVisibility] = useState<Record<string, boolean>>({});

  // Corpus state (IndexedDB persistence)
  const [corpusEnabled, setCorpusEnabledState] = useState(() => getDevicePref("corpusEnabled") !== false);
  const [corpusAvailable, setCorpusAvailable] = useState(() => checkCorpusAvailable());
  const [corpusStatusState, setCorpusStatusState] = useState<CorpusStatus>(() => getCorpusStatus());
  const [corpusEntryCount, setCorpusEntryCount] = useState<number | null>(() => {
    const idx = getCorpusIndex();
    return idx ? idx.entryCount : null;
  });
  const [corpusVersion, setCorpusVersion] = useState<string | null>(() => {
    const idx = getCorpusIndex();
    return idx ? idx.version : null;
  });
  const [corpusSavedAt, setCorpusSavedAt] = useState<string | null>(null);
  const [corpusProgress, setCorpusProgress] = useState(0);
  const [corpusTotal, setCorpusTotal] = useState(0);
  const [corpusActionStatus, setCorpusActionStatus] = useState<string | null>(null);
  const [corpusSkipped, setCorpusSkippedState] = useState(() => isCorpusSkipped());

  // Load corpus metadata from IndexedDB on mount
  useEffect(() => {
    void getCorpusMeta().then((meta) => {
      if (meta.version) setCorpusVersion(meta.version);
      if (meta.entryCount) setCorpusEntryCount(meta.entryCount);
      if (meta.savedAt) setCorpusSavedAt(meta.savedAt);
    });
  }, []);

  // ─── ACCT-005: Account handlers ───────────────────────────────────────────

  const refreshVaultKeys = useCallback(async () => {
    if (!authIsSignedIn()) {
      setVaultKeys([]);
      return;
    }
    try {
      const keys = await listVaultKeys();
      setVaultKeys(keys);
      // Cache which providers have a vaulted key so the LLM client can decide
      // to omit the local key (ACCT-005).
      setVaultKeyProviders(keys.map((k) => k.provider));
    } catch {
      /* leave the previous list; a transient network error is non-fatal */
    }
  }, []);

  // Load vault keys when signed in on mount.
  useEffect(() => {
    if (signedIn) void refreshVaultKeys();
  }, [signedIn, refreshVaultKeys]);

  // Track the local-BYOK override for the currently selected provider.
  useEffect(() => {
    setLocalKeyOverrideState(hasLocalKeyOverride(llmProvider));
  }, [llmProvider]);

  const handleSignIn = useCallback(async (mode: AuthMode) => {
    setAccountStatus(null);
    setAccountBusy(true);
    try {
      const result = await openAuthDialog(mode);
      if (result.status === "success") {
        setSignedIn(true);
        setAccountEmail(result.email);
        setAccountStatus("Signed in.");
        await refreshVaultKeys();
      } else if (result.status === "cancelled") {
        setAccountStatus(null);
      } else if (result.status === "unavailable") {
        setAccountStatus(result.message);
      } else {
        setAccountStatus(result.message);
      }
    } finally {
      setAccountBusy(false);
    }
  }, [refreshVaultKeys]);

  const handleSignOut = useCallback(async () => {
    setAccountBusy(true);
    try {
      await authSignOut();
    } finally {
      clearVaultMode();
      setSignedIn(false);
      setAccountEmail(null);
      setVaultKeys([]);
      setAccountStatus("Signed out.");
      setAccountBusy(false);
    }
  }, []);

  const handleSyncedSettingsToggle = useCallback((next: boolean) => {
    setSyncedSettings(next);
    setDevicePref("syncedSettings", next);
  }, []);

  const handleLocalKeyOverrideToggle = useCallback(
    (next: boolean) => {
      setLocalKeyOverride(llmProvider, next);
      setLocalKeyOverrideState(next);
    },
    [llmProvider]
  );

  const handleConfirmRemoveKey = useCallback(async () => {
    if (!stepUpProvider) return;
    setStepUpError(null);
    const credential: StepUpCredential = stepUpCode.trim()
      ? { code: stepUpCode.trim() }
      : { password: stepUpPassword };
    try {
      await deleteVaultKey(stepUpProvider, credential);
      setStepUpProvider(null);
      setStepUpCode("");
      setStepUpPassword("");
      setAccountStatus("Stored key removed.");
      await refreshVaultKeys();
    } catch (err: unknown) {
      setStepUpError(err instanceof Error ? err.message : "Could not remove the key.");
    }
  }, [stepUpProvider, stepUpCode, stepUpPassword, refreshVaultKeys]);

  // ACCT-007: load live account status (MFA flag) so the header shows the real
  // state rather than a static note. Non-fatal on error.
  const refreshMe = useCallback(async () => {
    if (!authIsSignedIn()) {
      setMfaEnabled(null);
      return;
    }
    try {
      const me = await authFetchMe();
      setMfaEnabled(me.mfaEnabled);
    } catch {
      /* leave the previous value; a transient network error is non-fatal */
    }
  }, []);

  useEffect(() => {
    if (signedIn) void refreshMe();
  }, [signedIn, refreshMe]);

  // ACCT-007: self-service delete. Step-up gated (TOTP code or password). On
  // success revoke server-side, clear local auth, and return to signed-out.
  const handleConfirmDeleteAccount = useCallback(async () => {
    setStepUpError(null);
    const credential: StepUp = stepUpCode.trim()
      ? { code: stepUpCode.trim() }
      : { password: stepUpPassword };
    setAccountBusy(true);
    try {
      await authDeleteAccount(credential);
      // The account is gone server-side; drop all local session + vault state.
      authClearSession();
      clearVaultMode();
      setDeleteAccountOpen(false);
      setStepUpCode("");
      setStepUpPassword("");
      setSignedIn(false);
      setAccountEmail(null);
      setVaultKeys([]);
      setMfaEnabled(null);
      setAccountStatus("Your account has been deleted.");
    } catch (err: unknown) {
      setStepUpError(err instanceof Error ? err.message : "Could not delete the account.");
    } finally {
      setAccountBusy(false);
    }
  }, [stepUpCode, stepUpPassword]);

  // ACCT-007: export the caller's own data as a downloaded JSON file (Blob).
  const handleExportData = useCallback(async () => {
    setAccountStatus(null);
    setAccountBusy(true);
    try {
      const data = await authExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "obiter-account-data.json";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setAccountStatus("Your data was exported.");
    } catch (err: unknown) {
      setAccountStatus(
        err instanceof Error ? err.message : "Could not export your data."
      );
    } finally {
      setAccountBusy(false);
    }
  }, []);

  const handleCorpusDownload = useCallback(async () => {
    setCorpusStatusState("downloading");
    setCorpusActionStatus(null);
    try {
      await downloadCorpusIndex((loaded, total) => {
        setCorpusProgress(loaded);
        setCorpusTotal(total);
      });
      registerCorpusAfterDownload();
      const idx = getCorpusIndex();
      setCorpusAvailable(true);
      setCorpusStatusState("ready");
      setCorpusEntryCount(idx?.entryCount ?? null);
      setCorpusVersion(idx?.version ?? null);
      setCorpusSavedAt(new Date().toISOString());
      setCorpusSkippedState(false);
      clearCorpusSkip();
      setCorpusActionStatus("Download complete");
      setTimeout(() => setCorpusActionStatus(null), 3000);
    } catch {
      setCorpusStatusState("error");
      setCorpusActionStatus("Download failed");
    }
  }, []);

  const handleCorpusDelete = useCallback(async () => {
    try {
      await deleteCorpus();
      setCorpusAvailable(false);
      setCorpusStatusState("not-downloaded");
      setCorpusEntryCount(null);
      setCorpusVersion(null);
      setCorpusSavedAt(null);
      setCorpusActionStatus("Corpus deleted");
      setTimeout(() => setCorpusActionStatus(null), 3000);
    } catch {
      setCorpusActionStatus("Failed to delete corpus");
    }
  }, []);

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
              // Load saved toggle overrides, falling back to preset defaults.
              // Document metadata is authoritative (cross-device); the device
              // pref is a legacy fallback for documents customised before the
              // migration — adopted into the store on the next court save.
              const savedToggles =
                store.getCourtToggles() ??
                (getDevicePref("courtToggles") as Record<string, string> | undefined);
              setCourtToggles({
                // Spread first so unknown (future engine) toggle keys are
                // preserved opaquely through subsequent saves.
                ...(savedToggles as Partial<Record<string, string>>),
                parallelCitations: (savedToggles?.parallelCitations as ParallelCitationMode) ?? preset.parallelCitations,
                pinpointStyle: (savedToggles?.pinpointStyle as PinpointStyle) ?? preset.pinpointStyle,
                unreportedGate: (savedToggles?.unreportedGate as UnreportedGate) ?? preset.unreportedGate,
                ibidSuppression: (savedToggles?.ibidSuppression as IbidSuppression) ?? preset.ibidSuppression,
                loaType: (savedToggles?.loaType as LoaType) ?? preset.loaType,
                parallelOrder: (savedToggles?.parallelOrder as ParallelOrder) ?? preset.parallelOrder,
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
            // TRUST-006: never echo the stored key back — surface last 4 only.
            setLlmKeyHint(savedLlmConfig.apiKey ? savedLlmConfig.apiKey.slice(-4) : "");
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

  const handleStandardChange = useCallback(async (newStandardId: CitationStandardId) => {
    if (standardId === newStandardId) return;
    // Note when changing standard mid-document. We must NOT use window.confirm():
    // it is blocked in the Office web add-in iframe (returns false immediately),
    // which silently aborted the change so the dropdown snapped back to AGLC on
    // Word online (WEB-013). A non-blocking notice works on web + desktop, and
    // switching standards is non-destructive/reversible so a hard confirm isn't
    // warranted — existing citations reflow on the next Refresh All.
    const store = await getSharedStore();
    const hadExistingCitations = store.getAll().length > 0;
    try {
      await store.setStandardId(newStandardId);
      setStandardId(newStandardId);
      setStandardNotice(
        hadExistingCitations
          ? "Standard updated. Run Refresh All to reformat existing citations to the new standard."
          : null
      );
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
          await store.setCourtToggles(undefined);
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
      const hadExistingCitations = store.getAll().length > 0;
      await store.setWritingMode(mode);
      setWritingMode(mode);
      setDocSetting("obiter-writingMode", mode);
      if (mode === "academic") {
        // Clear jurisdiction and toggle overrides when switching to academic
        setCourtJurisdiction("");
        await store.setCourtJurisdiction(undefined);
        await store.setCourtToggles(undefined);
        setDevicePref("courtToggles", undefined);
      } else if (store.getCourtToggles() === undefined) {
        // One-release migration: toggle overrides used to live only in the
        // device prefs, so a document customised before the migration lost
        // them on other devices. Adopt the legacy device value into the
        // document store here (a Settings save — the refresher stays
        // read-only) and delete the legacy key.
        const legacyToggles = getDevicePref("courtToggles") as Record<string, string> | undefined;
        if (legacyToggles) {
          await store.setCourtToggles(legacyToggles);
          setDevicePref("courtToggles", undefined);
        }
      }
      setModeNotice(hadExistingCitations ? buildReformatNotice("Writing mode updated.") : null);
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save writing mode";
      setError(message);
    }
  }, [triggerRefresh]);

  // Leave Manual Citations Mode and resume automatic formatting. When
  // `lockFirst` is true, every existing footnote is frozen first so manual
  // edits survive the resumed refresh (auto then applies only to new citations).
  const resumeAutoFormatting = useCallback(async (lockFirst: boolean) => {
    setManualExitConfirm(false);
    try {
      if (lockFirst) {
        await lockAllObiterFootnotes();
      }
      setDevicePref("manualCitationMode", undefined);
      setAutoRefreshCitations(true);
      setAutoRefreshEnabled(true);
      setDocSetting("obiter-autoRefresh", true);
      // Explicit refresh (not the debounced trigger) so it runs deterministically
      // now that manual mode is cleared. Locked footnotes are skipped.
      const store = await getSharedStore();
      await Word.run(async (ctx) => {
        const { refreshAllCitations } = await import("../../word/citationRefresher");
        await refreshAllCitations(ctx, store);
      });
      triggerRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resume automatic formatting");
    }
  }, [setAutoRefreshEnabled, triggerRefresh]);

  const handleJurisdictionChange = useCallback(async (jurisdictionId: string) => {
    try {
      const store = await getSharedStore();
      const hadExistingCitations = store.getAll().length > 0;
      if (!jurisdictionId) {
        setCourtJurisdiction("");
        await store.setCourtJurisdiction(undefined);
        await store.setCourtToggles(undefined);
        setDevicePref("courtToggles", undefined);
        setModeNotice(hadExistingCitations ? buildReformatNotice("Jurisdiction cleared.") : null);
        triggerRefresh();
        return;
      }
      if (!isCourtJurisdiction(jurisdictionId)) return;
      const preset = getCourtPreset(jurisdictionId);
      if (!preset) return;

      setCourtJurisdiction(jurisdictionId as CourtJurisdiction);
      await store.setCourtJurisdiction(jurisdictionId);

      // Apply preset defaults and clear any previous overrides. Toggles are
      // document metadata now; the device pref is only deleted (legacy key).
      const newToggles = {
        parallelCitations: preset.parallelCitations,
        pinpointStyle: preset.pinpointStyle,
        unreportedGate: preset.unreportedGate,
        ibidSuppression: preset.ibidSuppression,
        loaType: preset.loaType,
        ...(preset.parallelOrder ? { parallelOrder: preset.parallelOrder } : {}),
      };
      setCourtToggles(newToggles);
      await store.setCourtToggles(newToggles);
      setDevicePref("courtToggles", undefined);
      setModeNotice(hadExistingCitations ? buildReformatNotice("Jurisdiction updated.") : null);
      triggerRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save jurisdiction";
      setError(message);
    }
  }, [triggerRefresh]);

  const handleToggleOverride = useCallback(<K extends keyof typeof courtToggles>(
    key: K,
    value: (typeof courtToggles)[K],
  ) => {
    const updated = { ...courtToggles, [key]: value };
    setCourtToggles(updated);
    void (async () => {
      try {
        // Persist into the DOCUMENT so the override applies on every device,
        // and delete the legacy device-level copy.
        const store = await getSharedStore();
        await store.setCourtToggles(updated);
        setDevicePref("courtToggles", undefined);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to save court toggles");
      }
    })();
  }, [courtToggles]);

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
        <legend className="settings-section-title">Manual Citations Mode</legend>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={getDevicePref("manualCitationMode") === true}
            onChange={(e) => {
              if (e.target.checked) {
                // Turn Manual Mode ON — pause auto-formatting.
                setDevicePref("manualCitationMode", true);
                setAutoRefreshCitations(false);
                setAutoRefreshEnabled(false);
                setDocSetting("obiter-autoRefresh", false);
                triggerRefresh();
              } else {
                // Turning OFF resumes auto-formatting and can overwrite manual
                // edits — confirm first and offer to lock current footnotes.
                setManualExitConfirm(true);
              }
            }}
          />
          <span className="settings-toggle-label">
            Switch to Manual Citations
          </span>
        </label>
        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "4px 0 0" }}>
          Disable Obiter's automatic citation corrections. When enabled, footnote
          text is not automatically reformatted — you can edit citation text
          directly in the document. Re-enable to resume automatic formatting.
        </p>
        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "6px 0 0", fontStyle: "italic" }}>
          Tip: to protect specific corrections, lock individual footnotes
          (open a citation in Edit → Occurrences → Lock) instead of Manual Mode.
          Auto-formatting keeps working everywhere else.
        </p>
        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "8px 0 0" }}>
          Before submitting an assignment, official or court document, review the
          final version and <strong>export a PDF</strong> — citations can update
          automatically, and a PDF preserves exactly what you reviewed.
        </p>
      </fieldset>

      {manualExitConfirm && (
        <div className="error-reporter-overlay" role="dialog" aria-modal="true">
          <div className="error-reporter-modal">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Resume automatic formatting?</h3>
            <p style={{ fontSize: 12, color: "var(--colour-text-secondary)" }}>
              Obiter will re-apply its formatting to every footnote, which can
              overwrite manual edits you made in Manual Mode. You can keep your
              current footnotes frozen instead — auto-formatting will then apply
              only to new citations.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="error-reporter-btn-primary"
                onClick={() => void resumeAutoFormatting(true)}
              >
                Lock current footnotes &amp; resume
              </button>
              <button
                type="button"
                className="error-reporter-btn"
                onClick={() => void resumeAutoFormatting(false)}
              >
                Resume &amp; overwrite
              </button>
              <button
                type="button"
                className="error-reporter-btn"
                onClick={() => setManualExitConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
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

        {standardNotice && (
          <p style={{ fontSize: 11, margin: "8px 0 0", color: "var(--colour-text-secondary)" }}>
            {standardNotice}
          </p>
        )}
      </fieldset>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Accessibility</legend>
        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={comfortMode}
            onChange={(e) => setComfortMode(e.target.checked)}
          />
          <span>Comfort mode</span>
        </label>
        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "4px 0 0" }}>
          Larger buttons and text, wider spacing, and no motion. Stored on this device.
        </p>
      </fieldset>

      {standardId.startsWith("aglc") && (
      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Writing Mode</legend>

        <div style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
          <select
            className="ic-select"
            style={{ width: "100%", marginTop: 4 }}
            aria-label="Writing mode"
            value={writingMode}
            onChange={(e) => void handleWritingModeChange(e.target.value as WritingMode)}
          >
            <option value="academic">Academic</option>
            <option value="court">Court Submission</option>
          </select>
        </div>
        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 0" }}>
          {writingMode === "court"
            ? "Court mode: no ibid, short case names without (n X), parallel citations by default, List of Authorities instead of bibliography."
            : "Standard academic footnote citation with ibid, short references, and bibliography."}
        </p>

        {modeNotice && (
          <p style={{ fontSize: 11, margin: "8px 0 0", color: "var(--colour-text-secondary)" }}>
            {modeNotice}
          </p>
        )}

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
                    <option value="part-abc">Part A / B / C (Vic Court of Appeal)</option>
                    <option value="two-part-read">Two parts (read / not read)</option>
                    <option value="three-part-tas">Three parts (Tas, legislation separate)</option>
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

        <div style={{ fontSize: 11, color: "var(--colour-text-secondary)", marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ margin: 0 }}>
            AGLC4 — Australian Guide to Legal Citation, 4th Edition (Melbourne University Law Review)
          </p>
          <p style={{ margin: 0 }}>
            Open Australian Legal Corpus (CC BY 4.0, Isaacus)
            {corpusAvailable && corpusEntryCount != null && (
              <span> — {corpusEntryCount.toLocaleString()} entries downloaded</span>
            )}
          </p>
          <p style={{ margin: 0 }}>
            Obiter is free and open-source software under the GNU General Public License v3.0
          </p>
          <p style={{ margin: 0 }}>
            <a
              href={`https://github.com/${GITHUB_REPO}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Source code on GitHub
            </a>
          </p>
          <p style={{ margin: 0 }}>
            <a
              href="https://obiter.com.au"
              target="_blank"
              rel="noopener noreferrer"
            >
              obiter.com.au
            </a>
          </p>
          <p style={{ margin: 0 }}>
            Developed by Matthew Watt
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
          <p style={{ fontSize: 12, margin: 0 }}>
            <a
              href={`https://github.com/${GITHUB_REPO}/releases`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View all releases on GitHub
            </a>
          </p>
          <p style={{ fontSize: 12, margin: 0 }}>
            <a
              href="https://marketplace.microsoft.com/en-us/product/WA200010629?tab=Reviews"
              target="_blank"
              rel="noopener noreferrer"
            >
              Rate and review on AppSource
            </a>
          </p>
          <p style={{ fontSize: 12, margin: 0 }}>
            <a
              href="https://obiter.com.au/contact"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report an issue or request a feature
            </a>
          </p>
        </div>
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
            <p style={{ fontSize: "var(--text-min)", color: "var(--colour-text-secondary)", margin: "4px 0 0" }}>
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
        <legend className="settings-section-title">Corpus</legend>

        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 8px" }}>
          The Open Australian Legal Corpus (CC BY 4.0, Isaacus) provides
          offline citation lookup for ~232,000 cases and legislation. Data is
          stored locally in your browser via IndexedDB.
        </p>

        {corpusAvailable && (
          <label className="settings-toggle" style={{ marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={corpusEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                setCorpusEnabledState(checked);
                setDevicePref("corpusEnabled", checked);
              }}
            />
            <span className="settings-toggle-label">
              Use local corpus for citation lookup
            </span>
          </label>
        )}

        {corpusAvailable && corpusStatusState === "ready" ? (
          <div style={{
            padding: "8px 10px",
            background: "var(--colour-surface)",
            borderRadius: 4,
            border: "1px solid var(--colour-border)",
            marginBottom: 8,
          }}>
            <p style={{ fontSize: 12, margin: "0 0 4px", fontWeight: 600 }}>
              Downloaded
              {corpusEntryCount != null && ` (${corpusEntryCount.toLocaleString()} entries)`}
            </p>
            {corpusVersion && (
              <p style={{ fontSize: 11, margin: "0 0 2px", color: "var(--colour-text-secondary)" }}>
                Version: {corpusVersion}
              </p>
            )}
            {corpusSavedAt && (
              <p style={{ fontSize: 11, margin: "0 0 0", color: "var(--colour-text-secondary)" }}>
                Saved: {new Date(corpusSavedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <div style={{
            padding: "8px 10px",
            background: "var(--colour-surface)",
            borderRadius: 4,
            border: "1px solid var(--colour-border)",
            marginBottom: 8,
          }}>
            <p style={{ fontSize: 12, margin: 0 }}>
              Not downloaded
            </p>
          </div>
        )}

        {corpusStatusState === "downloading" && (
          <div style={{ marginBottom: 8 }}>
            <div className="obiter-corpus-banner__progress-track" style={{ height: 6, borderRadius: 3, background: "var(--colour-border)" }}>
              <div
                style={{
                  width: `${corpusTotal > 0 ? Math.round((corpusProgress / corpusTotal) * 100) : 0}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: "var(--colour-accent)",
                  transition: "width 0.2s",
                }}
              />
            </div>
            <p style={{ fontSize: 11, margin: "4px 0 0", color: "var(--colour-text-secondary)" }}>
              Downloading... {corpusTotal > 0 ? `${Math.round((corpusProgress / corpusTotal) * 100)}%` : ""}
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {corpusAvailable ? (
            <>
              <button
                className="library-btn library-btn--insert"
                disabled={corpusStatusState === "downloading"}
                onClick={() => void handleCorpusDownload()}
              >
                Re-download
              </button>
              <button
                className="library-btn"
                onClick={() => void handleCorpusDelete()}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                className="library-btn library-btn--insert"
                disabled={corpusStatusState === "downloading"}
                onClick={() => void handleCorpusDownload()}
              >
                Download now
              </button>
              <label className="settings-toggle" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={corpusSkipped}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setCorpusSkippedState(checked);
                    if (checked) {
                      skipCorpus();
                    } else {
                      clearCorpusSkip();
                    }
                  }}
                />
                <span className="settings-toggle-label" style={{ fontSize: 12 }}>
                  Use online only
                </span>
              </label>
            </>
          )}
        </div>

        {corpusActionStatus && (
          <p style={{
            fontSize: 11,
            margin: "6px 0 0",
            color: corpusActionStatus.includes("failed") || corpusActionStatus.includes("Failed")
              ? "var(--colour-error)"
              : "var(--colour-success)",
          }}>
            {corpusActionStatus}
          </p>
        )}
      </fieldset>

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Source Registry</legend>

        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 8px" }}>
          Enable typeahead search in citation fields. Queries are sent directly
          to external legal databases. No data is sent unless you type in a
          citation field with lookup enabled.
        </p>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={masterEnabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              setMasterEnabled(enabled);
              setMasterEnabledState(enabled);
            }}
          />
          <span className="settings-toggle-label">
            Enable source lookup
          </span>
        </label>

        <div style={{ marginTop: 8, opacity: masterEnabled ? 1 : 0.5, pointerEvents: masterEnabled ? "auto" : "none" }}>
        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 8px" }}>
          Manage individual source adapters. Open-access sources are enabled by
          default; live services and link-only sources must be enabled manually.
        </p>

        {(["open", "live", "link-only"] as AdapterTier[]).map((tier) => {
          const group = getAdaptersByTier()[tier];
          if (group.length === 0) return null;
          return (
            <div key={tier} style={{ marginBottom: 10 }}>
              <p style={{
                fontSize: 11,
                fontWeight: 600,
                margin: "0 0 4px",
                color: "var(--colour-text-secondary)",
              }}>
                {TIER_LABELS[tier]}
              </p>
              {group.map((adapter) => {
                const healthDot = adapterHealthDots[adapter.id] ?? adapter.health;
                const healthError = adapterHealthErrors[adapter.id];
                return (
                <div
                  key={adapter.id}
                  style={{
                    padding: "6px 8px",
                    marginBottom: 4,
                    background: "var(--colour-surface)",
                    borderRadius: 4,
                    border: "1px solid var(--colour-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      role="img"
                      aria-label={`Status: ${healthDot === "green" ? "Healthy" : healthDot === "amber" ? "Degraded" : "Unavailable"}`}
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background:
                          healthDot === "green" ? "var(--colour-success)"
                          : healthDot === "amber" ? "var(--colour-warning)"
                          : "var(--colour-error)",
                      }}
                    />
                    <label className="settings-toggle" style={{ flex: 1, margin: 0, padding: 0, borderRadius: 0 }}>
                      <input
                        type="checkbox"
                        checked={adapterToggles[adapter.id] ?? false}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setAdapterEnabled(adapter.id, enabled);
                          setAdapterToggles((prev) => ({ ...prev, [adapter.id]: enabled }));
                          // Auto-healthcheck when enabling
                          if (enabled) {
                            initialiseAdapters();
                            const instance = getAdapterInstance(adapter.id);
                            if (instance) {
                              void instance.healthcheck().then((result) => {
                                const dot: HealthStatus =
                                  result === "healthy" ? "green"
                                  : result === "degraded" ? "amber"
                                  : "red";
                                setAdapterHealthDots((prev) => ({ ...prev, [adapter.id]: dot }));
                                if (result !== "healthy") {
                                  setAdapterHealthErrors((prev) => ({
                                    ...prev,
                                    [adapter.id]: `Health check returned: ${result}`,
                                  }));
                                } else {
                                  setAdapterHealthErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[adapter.id];
                                    return next;
                                  });
                                }
                              }).catch((err: unknown) => {
                                setAdapterHealthDots((prev) => ({ ...prev, [adapter.id]: "red" }));
                                setAdapterHealthErrors((prev) => ({
                                  ...prev,
                                  [adapter.id]: `Connection failed: ${err instanceof Error ? err.message : "Unknown error"}`,
                                }));
                              });
                            }
                          } else {
                            // Clear error when disabling
                            setAdapterHealthErrors((prev) => {
                              const next = { ...prev };
                              delete next[adapter.id];
                              return next;
                            });
                          }
                        }}
                      />
                      <span className="settings-toggle-label" style={{ fontSize: 12 }}>
                        {adapter.name}
                      </span>
                    </label>
                    {adapter.requiresKey && (
                      <span className="settings-badge" style={{ flexShrink: 0 }}>Requires key</span>
                    )}
                    {adapter.fragile && (
                      <span className="settings-badge" aria-label="Scraper — may break if the source site changes" style={{ flexShrink: 0 }}>
                        {"\u26A0\uFE0F"} Fragile
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "var(--text-min)", color: "var(--colour-text-secondary)", margin: "2px 0 0 14px" }}>
                    {adapter.jurisdictions.join(", ")} — {adapter.licence}
                  </p>

                  {healthError && (
                    <p style={{ fontSize: "var(--text-min)", color: "var(--colour-error)", margin: "4px 0 0 14px" }}>
                      {healthError}
                    </p>
                  )}

                  {adapter.requiresKey && (
                    <div style={{ marginTop: 6, marginLeft: 14 }}>
                      <label style={{ fontSize: 11, display: "block" }}>
                        API Key
                        <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                          <input
                            type={keyVisibility[adapter.id] ? "text" : "password"}
                            className="ic-input"
                            style={{ flex: 1 }}
                            value={adapterKeys[adapter.id] ?? ""}
                            placeholder={
                              adapterKeyHints[adapter.id]
                                ? `Key stored (ends in ${adapterKeyHints[adapter.id]})`
                                : "Enter API key"
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdapterKeys((prev) => ({ ...prev, [adapter.id]: val }));
                              setAdapterKeyHints((prev) => ({
                                ...prev,
                                [adapter.id]: val ? val.slice(-4) : "",
                              }));
                              saveKey(adapter.id, val);
                            }}
                          />
                          <button
                            className="library-btn"
                            style={{ fontSize: "var(--text-min)", padding: "2px 6px" }}
                            onClick={() =>
                              setKeyVisibility((prev) => ({
                                ...prev,
                                [adapter.id]: !prev[adapter.id],
                              }))
                            }
                          >
                            {keyVisibility[adapter.id] ? "Hide" : "Show"}
                          </button>
                          {hasKey(adapter.id) && (
                            <button
                              className="library-btn"
                              style={{ fontSize: "var(--text-min)", padding: "2px 6px" }}
                              onClick={() => {
                                removeKey(adapter.id);
                                setAdapterKeys((prev) => ({ ...prev, [adapter.id]: "" }));
                                setAdapterKeyHints((prev) => ({ ...prev, [adapter.id]: "" }));
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </label>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          );
        })}
        </div>
      </fieldset>

      {/* ── ACCT-005: Account ────────────────────────────────────────────── */}
      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">Account</legend>

        {!signedIn ? (
          <>
            <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 8px" }}>
              Obiter works fully without an account; sign in only to sync
              settings and store your API key across devices.
            </p>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                className="library-btn library-btn--insert"
                disabled={accountBusy}
                onClick={() => void handleSignIn("login")}
              >
                Sign in
              </button>
              <button
                className="library-btn"
                disabled={accountBusy}
                onClick={() => void handleSignIn("register")}
              >
                Create account
              </button>
            </div>
            {!isDialogAuthSupported() && (
              <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "8px 0 0" }}>
                Signing in from Word requires a newer version of Word. You can
                also manage your account at obiter.com.au.
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, margin: "0 0 8px" }}>
              Signed in as{" "}
              <strong>{accountEmail ?? "your account"}</strong>.
            </p>
            <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 8px" }}>
              {mfaEnabled === null
                ? "Multi-factor authentication is set up when you enrol an authenticator app; you are prompted for a code at sign-in when it is enabled."
                : mfaEnabled
                  ? "Multi-factor authentication is on. You are prompted for an authenticator code at sign-in."
                  : "Multi-factor authentication is off. Enrol an authenticator app to be prompted for a code at sign-in."}
            </p>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={syncedSettings}
                onChange={(e) => handleSyncedSettingsToggle(e.target.checked)}
              />
              <span className="settings-toggle-label">Sync settings to my account</span>
            </label>

            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 4px" }}>Stored API keys</p>
              {vaultKeys.length === 0 ? (
                <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: 0 }}>
                  No API keys are stored on your account. Save a key in the AI
                  Assistant section below to use it across devices.
                </p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {vaultKeys.map((k) => (
                    <li
                      key={k.provider}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 12,
                        padding: "4px 0",
                        borderBottom: "1px solid var(--colour-border)",
                      }}
                    >
                      <span>
                        {LLM_PROVIDER_LABELS[k.provider] ?? k.provider} — ending {k.last4}
                      </span>
                      <button
                        className="library-btn"
                        onClick={() => {
                          setStepUpError(null);
                          setStepUpCode("");
                          setStepUpPassword("");
                          setStepUpProvider(k.provider);
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 12 }}>
              <button
                className="library-btn"
                disabled={accountBusy}
                onClick={() => void handleSignOut()}
              >
                Sign out
              </button>
              <button
                className="library-btn"
                disabled={accountBusy}
                onClick={() => void handleExportData()}
              >
                Export my data
              </button>
              <button
                className="library-btn"
                disabled={accountBusy}
                onClick={() => {
                  setStepUpError(null);
                  setStepUpCode("");
                  setStepUpPassword("");
                  setDeleteAccountOpen(true);
                }}
              >
                Delete account
              </button>
            </div>
          </>
        )}

        <div aria-live="polite" role="status">
          {accountStatus && (
            <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "8px 0 0" }}>
              {accountStatus}
            </p>
          )}
        </div>
      </fieldset>

      {/* ACCT-005: step-up modal for removing a vaulted key (WEB-013 — no
          window.confirm/prompt in the Word web iframe). */}
      {stepUpProvider && (
        <div className="error-reporter-overlay" role="dialog" aria-modal="true">
          <div className="error-reporter-modal">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Remove stored key?</h3>
            <p style={{ fontSize: 12, color: "var(--colour-text-secondary)" }}>
              To remove the {LLM_PROVIDER_LABELS[stepUpProvider] ?? stepUpProvider} key
              from your account, confirm it is you. Enter a current authenticator
              code if you use multi-factor authentication, otherwise your account
              password.
            </p>
            <label style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              Authenticator code
              <input
                type="text"
                className="ic-input"
                style={{ width: "100%", marginTop: 4 }}
                value={stepUpCode}
                inputMode="numeric"
                onChange={(e) => setStepUpCode(e.target.value)}
                placeholder="123456"
              />
            </label>
            <label style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              Or account password
              <input
                type="password"
                className="ic-input"
                style={{ width: "100%", marginTop: 4 }}
                value={stepUpPassword}
                onChange={(e) => setStepUpPassword(e.target.value)}
                placeholder="Your password"
              />
            </label>
            {stepUpError && (
              <p style={{ fontSize: 11, color: "var(--colour-error)", margin: "8px 0 0" }}>
                {stepUpError}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="error-reporter-btn-primary"
                onClick={() => void handleConfirmRemoveKey()}
              >
                Remove key
              </button>
              <button
                type="button"
                className="error-reporter-btn"
                onClick={() => setStepUpProvider(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACCT-005: delete-account confirmation (step-up). */}
      {deleteAccountOpen && (
        <div className="error-reporter-overlay" role="dialog" aria-modal="true">
          <div className="error-reporter-modal">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Delete your account?</h3>
            <p style={{ fontSize: 12, color: "var(--colour-text-secondary)" }}>
              This permanently removes your account, synced settings, and every
              stored API key, and signs you out on all devices. This cannot be
              undone. Confirm it is you with a current authenticator code, or
              your account password.
            </p>
            <label style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              Authenticator code
              <input
                type="text"
                className="ic-input"
                style={{ width: "100%", marginTop: 4 }}
                value={stepUpCode}
                inputMode="numeric"
                onChange={(e) => setStepUpCode(e.target.value)}
                placeholder="123456"
              />
            </label>
            <label style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              Or account password
              <input
                type="password"
                className="ic-input"
                style={{ width: "100%", marginTop: 4 }}
                value={stepUpPassword}
                onChange={(e) => setStepUpPassword(e.target.value)}
                placeholder="Your password"
              />
            </label>
            {stepUpError && (
              <p style={{ fontSize: 11, color: "var(--colour-error)", margin: "8px 0 0" }}>
                {stepUpError}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="error-reporter-btn-primary"
                disabled={accountBusy}
                onClick={() => void handleConfirmDeleteAccount()}
              >
                Delete account
              </button>
              <button
                type="button"
                className="error-reporter-btn"
                onClick={() => {
                  setDeleteAccountOpen(false);
                  setStepUpError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <fieldset className="settings-section" style={{ marginTop: 12 }}>
        <legend className="settings-section-title">AI Assistant (Optional)</legend>

        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 8px" }}>
          Connect an AI provider to verify citations, parse raw citation text,
          and suggest short titles. You provide your own API key — no data is
          sent without your explicit action.
        </p>

        {/* TRUST-006: plain-language disclosure of where key material lives. */}
        <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 8px" }}>
          Your API key is stored only on this device, in the add-in&rsquo;s browser
          storage. It is never written to the document, and it is sent only to the
          provider you select (or to the obiter.com.au proxy when you use a custom
          endpoint). Use a key with the lowest privileges your provider allows, and
          set a spending cap on it. Use Remove stored keys below to delete all keys
          from this device.
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

        {/* ACCT-005: when signed in with a vaulted key for this provider, the
            request omits the local key and the proxy injects the stored key.
            The user can override to force local BYOK on this device. */}
        {signedIn && vaultKeys.some((k) => k.provider === llmProvider) && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "0 0 4px" }}>
              {localKeyOverride
                ? "Using the key entered on this device for this provider."
                : `Using your stored ${LLM_PROVIDER_LABELS[llmProvider] ?? llmProvider} key across devices. Your key stays on the server and is never sent to this device.`}
            </p>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={localKeyOverride}
                onChange={(e) => handleLocalKeyOverrideToggle(e.target.checked)}
              />
              <span className="settings-toggle-label">Use my own key on this device instead</span>
            </label>
          </div>
        )}

        {llmKeyHint && !llmApiKey && (
          <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "4px 0 0" }}>
            A key ending in {llmKeyHint} is stored on this device. Leave this field
            blank to keep using it, or enter a new key to replace it.
          </p>
        )}
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
          <>
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
            <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "4px 0 0" }}>
              Custom endpoints must use HTTPS and accept the OpenAI-compatible chat completions
              format. Requests are relayed through the obiter.com.au proxy, as the add-in&rsquo;s
              security policy permits direct connections only to the built-in providers. The
              proxy does not log or retain requests.
            </p>
          </>
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
              // TRUST-006: the input never echoes the stored key, so a blank
              // field means "keep using the key already stored on this device".
              const config: LLMConfig = {
                provider: llmProvider,
                apiKey: llmApiKey.trim() !== "" ? llmApiKey : (loadLlmConfig()?.apiKey ?? ""),
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
              // TRUST-006: blank key field means "keep the stored key".
              const config: LLMConfig = {
                provider: llmProvider,
                apiKey: llmApiKey.trim() !== "" ? llmApiKey : (loadLlmConfig()?.apiKey ?? ""),
                model: llmModel,
                endpoint: llmProvider === "custom" ? llmEndpoint : undefined,
                maxTokens: llmMaxTokens,
                enabled: llmEnabled,
              };
              saveLlmConfig(config);
              // Drop the typed key from component state once persisted; keep
              // only the last-4 hint so the full key is never rendered back.
              setLlmApiKey("");
              setLlmKeyHint(config.apiKey ? config.apiKey.slice(-4) : "");
              setLlmSaveStatus("Saved");
              setTimeout(() => setLlmSaveStatus(null), 2000);
            }}
          >
            Save
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <button
            className="library-btn"
            onClick={() => setRemoveKeysConfirm(true)}
          >
            Remove stored keys
          </button>
          <p style={{ fontSize: 11, color: "var(--colour-text-secondary)", margin: "4px 0 0" }}>
            Deletes the AI provider key and every source lookup key stored on this
            device. Other settings are kept.
          </p>
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

      {/* TRUST-006: in-pane confirmation — window.confirm is blocked in the
          add-in iframe on Word web (see WEB-013), so reuse the modal pattern. */}
      {removeKeysConfirm && (
        <div className="error-reporter-overlay" role="dialog" aria-modal="true">
          <div className="error-reporter-modal">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Remove stored keys?</h3>
            <p style={{ fontSize: 12, color: "var(--colour-text-secondary)" }}>
              This deletes the AI provider key and every source lookup key stored
              on this device, including keys saved by earlier versions of Obiter.
              Your other settings are kept. AI features and source lookups that
              require a key will stop working until you enter new keys.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="error-reporter-btn-primary"
                onClick={() => {
                  const result = clearStoredKeys();
                  setLlmApiKey("");
                  setLlmKeyHint("");
                  setAdapterKeys({});
                  setAdapterKeyHints({});
                  setKeyVisibility({});
                  setRemoveKeysConfirm(false);
                  const removed =
                    (result.llmKeyCleared ? 1 : 0) + result.vaultKeysRemoved;
                  setLlmSaveStatus(
                    removed > 0
                      ? `Removed ${removed} stored ${removed === 1 ? "key" : "keys"} from this device.`
                      : "No stored keys were found on this device."
                  );
                  setTimeout(() => setLlmSaveStatus(null), 5000);
                }}
              >
                Remove keys
              </button>
              <button
                type="button"
                className="error-reporter-btn"
                onClick={() => setRemoveKeysConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
            fontSize: "var(--text-min)",
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
