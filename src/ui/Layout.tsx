/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useCallback, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTheme } from "./hooks/useTheme";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { APP_VERSION } from "../constants";
import { renumberAllHeadings } from "../word/styles";
import { refreshAllCitations } from "../word/citationRefresher";
import { getSharedStore } from "../store/singleton";
import type { CitationStandardId } from "../engine/standards/types";
import { getStandardConfig } from "../engine/standards";
import { useCitationContext } from "./context/CitationContext";
import { useInsertCitationContext } from "./context/InsertCitationContext";
import { getDevicePref } from "../store/devicePreferences";
import {
  initializeSourceLookup,
  shouldShowCorpusBanner,
} from "../api/initializeAdapters";
import CorpusDownloadBanner from "./components/CorpusDownloadBanner";

const NAV_ITEMS = [
  { to: "/", label: "Insert" },
  { to: "/edit", label: "Edit" },
  { to: "/library", label: "Library" },
  { to: "/guide", label: "Guide" },
  { to: "/validation", label: "Validate" },
  { to: "/bibliography", label: "Biblio" },
  { to: "/styling", label: "Styling" },
  { to: "/settings", label: "Settings" },
] as const;


export default function Layout(): JSX.Element {
  useTheme();
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const { triggerRefresh, refreshCounter } = useCitationContext();
  const { setSelectedCategory, setSelectedSourceType, resetForm } = useInsertCitationContext();
  const [standardId, setStandardId] = useState<CitationStandardId>("aglc4");
  const [writingMode, setWritingMode] = useState<"academic" | "court">("academic");
  const [refreshing, setRefreshing] = useState(false);
  const [corpusBannerVisible, setCorpusBannerVisible] = useState(false);
  const [manualMode, setManualMode] = useState(() => getDevicePref("manualCitationMode") === true);

  // Re-read manual mode when refreshCounter changes (toggled from Settings)
  useEffect(() => {
    setManualMode(getDevicePref("manualCitationMode") === true);
  }, [refreshCounter]);

  // Initialize source lookup adapters on mount
  useEffect(() => {
    void (async () => {
      await initializeSourceLookup();
      if (shouldShowCorpusBanner()) {
        setCorpusBannerVisible(true);
      }
    })();
  }, []);

  // Load the active standard and writing mode on mount
  useEffect(() => {
    void (async () => {
      try {
        const store = await getSharedStore();
        setStandardId(store.getStandardId());
        setWritingMode(store.getWritingMode());
      } catch {
        // Default to aglc4, academic
      }
    })();
  }, [refreshCounter]);

  const handleRefreshAll = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const store = await getSharedStore();
      await Word.run(async (context) => {
        await refreshAllCitations(context, store);
        await renumberAllHeadings(context);
      });
      triggerRefresh();
    } catch {
      // Silently fail
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, triggerRefresh]);

  return (
    <div className="obiter-layout">
      <a href="#obiter-main" className="obiter-skip-link">
        Skip to content
      </a>
      <header className="obiter-header">
        <h1>Obiter</h1>
        <span>{writingMode === "court" ? `${getStandardConfig(standardId).standardLabel} (Court)` : getStandardConfig(standardId).standardLabel}</span>
      </header>
      {!online && (
        <div className="obiter-offline-banner" role="alert">
          Offline — search and AI features unavailable
        </div>
      )}
      {corpusBannerVisible && (
        <CorpusDownloadBanner
          onDismiss={() => setCorpusBannerVisible(false)}
        />
      )}
      {manualMode && (
        <div
          role="status"
          style={{
            fontSize: 11,
            padding: "6px 10px",
            background: "var(--colour-warning-surface, #fff8e1)",
            borderBottom: "1px solid var(--colour-warning, #f59e0b)",
            color: "var(--colour-warning-text, #92400e)",
            cursor: "pointer",
            textAlign: "center",
          }}
          onClick={() => navigate("/settings")}
          title="Go to Settings to re-enable automatic citation corrections"
        >
          Manual Mode — automatic citation corrections disabled
        </div>
      )}
      <nav className="obiter-nav" role="navigation" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="obiter-actions-bar" role="toolbar" aria-label="Quick actions">
        <button
          className="obiter-action-btn"
          type="button"
          onClick={() => {
            if (manualMode) {
              navigate("/settings");
            } else {
              void handleRefreshAll();
            }
          }}
          disabled={refreshing}
          title={manualMode
            ? "Manual mode is active. Go to Settings to re-enable automatic corrections."
            : "Rebuild all footnote text: updates ibid, short references, cross-references, numbering, and heading prefixes"}
        >
          {refreshing ? "Refreshing..." : manualMode ? "Manual Mode" : "Refresh All"}
        </button>
        <button
          className="obiter-action-btn"
          type="button"
          onClick={() => {
            resetForm();
            setSelectedCategory("Other");
            setSelectedSourceType("explanatory_note");
            navigate("/");
          }}
          title="Insert a free-text explanatory or commentary footnote"
        >
          Add Note
        </button>
        {refreshing && (
          <p style={{ fontSize: 10, color: "var(--colour-text-secondary)", margin: "2px 0 0", textAlign: "center" }}>
            Rebuilding all footnotes. This may take a moment for large documents.
          </p>
        )}
      </div>
      <main id="obiter-main" className="obiter-content" role="main">
        <Outlet />
      </main>
      <footer className="obiter-footer">
        <a href="https://obiter.com.au" target="_blank" rel="noopener noreferrer">
          Obiter v{APP_VERSION}
        </a>
        <span>Watt, Matthew 2026</span>
      </footer>
    </div>
  );
}
