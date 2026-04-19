/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "./hooks/useTheme";

const NAV_ITEMS = [
  { to: "/", label: "Insert" },
  { to: "/edit", label: "Edit" },
  { to: "/library", label: "Library" },
  { to: "/guide", label: "Guide" },
  { to: "/validation", label: "Validate" },
  { to: "/bibliography", label: "Biblio" },
  { to: "/settings", label: "Settings" },
] as const;

export default function Layout(): JSX.Element {
  useTheme();

  return (
    <div className="obiter-layout">
      <a href="#obiter-main" className="obiter-skip-link">
        Skip to content
      </a>
      <header className="obiter-header">
        <h1>Obiter</h1>
        <span>AGLC4</span>
      </header>
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
      <main id="obiter-main" className="obiter-content" role="main">
        <Outlet />
      </main>
      <footer className="obiter-footer">
        <a href="#" target="_blank" rel="noopener noreferrer">
          Obiter v0.1.0
        </a>
        <span>Watt, Matthew 2026</span>
      </footer>
    </div>
  );
}
