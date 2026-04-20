/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useCallback, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "./hooks/useTheme";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { APP_VERSION } from "../constants";
import { applyHeadingLevel, hasCustomHeadings, renumberAllHeadings } from "../word/styles";
import { refreshAllCitations } from "../word/citationRefresher";
import { CitationStore } from "../store/citationStore";
import type { CitationStandardId } from "../engine/standards/types";
import { useCitationContext } from "./context/CitationContext";

const NAV_ITEMS = [
  { to: "/", label: "Insert" },
  { to: "/edit", label: "Edit" },
  { to: "/library", label: "Library" },
  { to: "/guide", label: "Guide" },
  { to: "/validation", label: "Validate" },
  { to: "/bibliography", label: "Biblio" },
  { to: "/settings", label: "Settings" },
] as const;

const HEADING_LEVELS = ["I", "II", "III", "IV", "V"] as const;

let layoutStoreInstance: CitationStore | null = null;
let aglcHeadingListId: number | undefined;

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

  // MULTI-014: Court mode suppresses heading bar
  const showHeadingBar = hasCustomHeadings(standardId) && writingMode !== "court";

  const handleApplyHeading = useCallback(async (level: string) => {
    const levelMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
      I: 1, II: 2, III: 3, IV: 4, V: 5,
    };
    const numericLevel = levelMap[level];
    if (!numericLevel) return;

    try {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("paragraphs");
        await context.sync();

        for (let i = 0; i < selection.paragraphs.items.length; i++) {
          const para = selection.paragraphs.items[i];
          const list = await applyHeadingLevel(
            context,
            para,
            numericLevel,
            i + 1,
            aglcHeadingListId
          );
          if (list && aglcHeadingListId === undefined) {
            aglcHeadingListId = list.id;
          }
        }
      });
    } catch {
      // Silently fail — user can retry
    }
  }, []);

  const handleBlockQuote = useCallback(async () => {
    try {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("paragraphs");
        await context.sync();

        for (const para of selection.paragraphs.items) {
          para.style = "AGLC4 Block Quote";
        }
        await context.sync();
      });
    } catch {
      // Style may not exist yet — apply inline formatting as fallback
      try {
        await Word.run(async (context) => {
          const selection = context.document.getSelection();
          selection.load("paragraphs");
          await context.sync();

          for (const para of selection.paragraphs.items) {
            para.font.size = 10;
            para.leftIndent = 36;
            para.lineSpacing = 12;
          }
          await context.sync();
        });
      } catch {
        // Silently fail
      }
    }
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
        <span>{writingMode === "court" ? "AGLC4 (Court)" : "AGLC4"}</span>
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
      {showHeadingBar && (
        <div className="obiter-heading-bar" role="toolbar" aria-label="Heading levels">
          <span className="obiter-heading-label">Headings</span>
          {HEADING_LEVELS.map((level) => (
            <button
              key={level}
              className="obiter-heading-btn"
              type="button"
              onClick={() => void handleApplyHeading(level)}
              title={`Level ${level}: ${level === "I" ? "Small caps, centred" : level === "II" ? "Italic, centred" : "Italic, left-aligned"}`}
              aria-label={`Apply heading level ${level}`}
            >
              {level}
            </button>
          ))}
        </div>
      )}
      <div className="obiter-actions-bar" role="toolbar" aria-label="Quick actions">
        <button
          className="obiter-action-btn"
          type="button"
          onClick={() => void handleBlockQuote()}
        >
          Block Quote
        </button>
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
