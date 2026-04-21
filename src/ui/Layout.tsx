/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useCallback, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "./hooks/useTheme";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { APP_VERSION } from "../constants";
import { renumberAllHeadings } from "../word/styles";
import { refreshAllCitations } from "../word/citationRefresher";
import { CitationStore } from "../store/citationStore";
import type { CitationStandardId } from "../engine/standards/types";
import { getStandardConfig } from "../engine/standards";
import { useCitationContext } from "./context/CitationContext";

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

let layoutStoreInstance: CitationStore | null = null;

async function getLayoutStore(): Promise<CitationStore> {
  if (!layoutStoreInstance) {
    layoutStoreInstance = new CitationStore();
    await layoutStoreInstance.initStore();
  }
  return layoutStoreInstance;
}

export default function Layout(): JSX.Element {
  useTheme();
  const online = useOnlineStatus();
  const { triggerRefresh } = useCitationContext();
  const [standardId, setStandardId] = useState<CitationStandardId>("aglc4");
  const [writingMode, setWritingMode] = useState<"academic" | "court">("academic");
  const [refreshing, setRefreshing] = useState(false);

  // Load the active standard and writing mode on mount
  useEffect(() => {
    void (async () => {
      try {
        const store = await getLayoutStore();
        setStandardId(store.getStandardId());
        setWritingMode(store.getWritingMode());
      } catch {
        // Default to aglc4, academic
      }
    })();
  }, []);

  const handleRefreshAll = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const store = await getLayoutStore();
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
          onClick={() => void handleRefreshAll()}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh All"}
        </button>
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
