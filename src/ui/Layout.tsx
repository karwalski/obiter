/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
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
import StatusLog from "./components/StatusLog";
import { useStatus } from "./context/StatusContext";
import { useComfortMode } from "./hooks/useComfortMode";
import CommandPalette, { type PaletteCommand } from "./components/CommandPalette";
import ShortcutsHelp from "./components/ShortcutsHelp";
import { areShortcutsEnabled, getPaletteKey, modifierLabel } from "./shortcuts";

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
  // Apply the persisted comfort-mode preference to <html> on load.
  const [comfortMode, setComfortMode] = useComfortMode();
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // On view/route change, move focus to the new view's heading (or the main region)
  // so keyboard and screen-reader users are not stranded at the top of the pane
  // (WCAG 2.4.3 Focus Order). Skipped on first render to preserve the skip link.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const main = mainRef.current;
    if (!main) return;
    const target = main.querySelector<HTMLElement>("h1, h2, [role='heading']") ?? main;
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus();
  }, [location.pathname]);
  const { triggerRefresh, refreshCounter } = useCitationContext();
  const { announce } = useStatus();
  const { setSelectedCategory, setSelectedSourceType, resetForm } = useInsertCitationContext();
  const [standardId, setStandardId] = useState<CitationStandardId>("aglc4");
  const [writingMode, setWritingMode] = useState<"academic" | "court">("academic");
  const [refreshing, setRefreshing] = useState(false);
  const [corpusBannerVisible, setCorpusBannerVisible] = useState(false);
  const [manualMode, setManualMode] = useState(() => getDevicePref("manualCitationMode") === true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);

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
    announce("Refreshing all footnotes…");
    try {
      const store = await getSharedStore();
      await Word.run(async (context) => {
        await refreshAllCitations(context, store);
        await renumberAllHeadings(context);
      });
      triggerRefresh();
      announce("All footnotes refreshed.", "success");
    } catch {
      // Surface the failure instead of swallowing it (WCAG 3.3.1).
      announce("Could not refresh footnotes. Please check the document and try again.", "error");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, triggerRefresh, announce]);

  // Global keyboard shortcuts: Ctrl/Cmd-K opens the command palette, Ctrl/Cmd-/ the
  // shortcuts reference. Both honour the per-device enable/customise preferences.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (!areShortcutsEnabled()) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === getPaletteKey()) {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (e.key === "/") {
        e.preventDefault();
        setShortcutsHelpOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // The actions offered by the command palette (A11Y-029). Navigation plus the
  // quick actions, so common tasks cost a few keystrokes rather than precise pointing.
  const commands = useMemo<PaletteCommand[]>(() => {
    const navCommands: PaletteCommand[] = NAV_ITEMS.map((item) => ({
      id: `nav-${item.to}`,
      label: `Go to ${item.label}`,
      hint: "View",
      run: () => navigate(item.to),
    }));
    return [
      {
        id: "insert-citation",
        label: "Insert a citation",
        hint: "View",
        keywords: "new add footnote citation",
        run: () => {
          resetForm();
          navigate("/");
        },
      },
      ...navCommands,
      {
        id: "add-note",
        label: "Add an explanatory note",
        keywords: "discursive commentary",
        run: () => {
          resetForm();
          setSelectedCategory("Other");
          setSelectedSourceType("explanatory_note");
          navigate("/");
        },
      },
      {
        id: "refresh-all",
        label: "Refresh all footnotes",
        keywords: "rebuild update ibid renumber",
        run: () => {
          if (manualMode) {
            navigate("/settings");
          } else {
            void handleRefreshAll();
          }
        },
      },
      {
        id: "scan-repair",
        label: "Scan and repair citations",
        hint: "View",
        keywords: "deep scan recover rebuild relink adopt unlinked library lost store",
        run: () => navigate("/scan-repair"),
      },
      {
        id: "comfort-mode",
        label: comfortMode ? "Turn off Comfort mode" : "Turn on Comfort mode",
        keywords: "accessibility larger text targets motion",
        run: () => setComfortMode(!comfortMode),
      },
      {
        id: "shortcuts",
        label: "Keyboard shortcuts",
        hint: `${modifierLabel()} + /`,
        run: () => setShortcutsHelpOpen(true),
      },
    ];
  }, [navigate, resetForm, setSelectedCategory, setSelectedSourceType, manualMode, handleRefreshAll, comfortMode, setComfortMode]);

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
        <div className="obiter-manual-banner" role="status">
          <span>Manual Mode — automatic citation corrections disabled</span>
          <button
            type="button"
            className="obiter-manual-banner-action"
            onClick={() => navigate("/settings")}
          >
            Open Settings
          </button>
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
          aria-describedby="obiter-refresh-desc"
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
          aria-describedby="obiter-addnote-desc"
        >
          Add Note
        </button>
        {/* Persistent, AT-readable descriptions replace timing-dependent `title` tooltips (1.4.13). */}
        <span id="obiter-refresh-desc" className="obiter-visually-hidden">
          {manualMode
            ? "Manual mode is active. Open Settings to re-enable automatic corrections."
            : "Rebuilds all footnote text: updates ibid, short references, cross-references, numbering, and heading prefixes."}
        </span>
        <span id="obiter-addnote-desc" className="obiter-visually-hidden">
          Inserts a free-text explanatory or commentary footnote.
        </span>
        {refreshing && (
          <p className="obiter-refreshing-note" role="status" aria-live="polite">
            Rebuilding all footnotes. This may take a moment for large documents.
          </p>
        )}
      </div>
      <main id="obiter-main" className="obiter-content" role="main" ref={mainRef}>
        <Outlet />
      </main>
      <StatusLog />
      <footer className="obiter-footer">
        <a href="https://obiter.com.au" target="_blank" rel="noopener noreferrer">
          Obiter v{APP_VERSION}
        </a>
        <span>Watt, Matthew 2026</span>
      </footer>
      {paletteOpen && <CommandPalette commands={commands} onClose={() => setPaletteOpen(false)} />}
      {shortcutsHelpOpen && <ShortcutsHelp onClose={() => setShortcutsHelpOpen(false)} />}
    </div>
  );
}
