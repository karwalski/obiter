/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Keyboard shortcuts reference (A11Y-030). A dialog that lists every global
 * shortcut and the in-pane keyboard conventions, and lets the user customise the
 * command-palette trigger key or turn the global shortcuts off entirely.
 */

/* global document */

import { useEffect, useRef, useState } from "react";
import {
  getShortcutDocs,
  getPaletteKey,
  setPaletteKey,
  areShortcutsEnabled,
  setShortcutsEnabled,
  modifierLabel,
  PALETTE_KEY_CHOICES,
} from "../shortcuts";

interface ShortcutsHelpProps {
  onClose: () => void;
}

export default function ShortcutsHelp({ onClose }: ShortcutsHelpProps): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [paletteKey, setPaletteKeyState] = useState(getPaletteKey());
  const [enabled, setEnabledState] = useState(areShortcutsEnabled());
  // Recomputed on each open so the table reflects the current binding.
  const docs = getShortcutDocs();

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    // Backdrop click closes; the dialog is keyboard-closable via Escape (WCAG 2.1.1 met).
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="cmdp-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        ref={dialogRef}
      >
        <div className="shortcuts-head">
          <h2 id="shortcuts-title" className="shortcuts-title">
            Keyboard shortcuts
          </h2>
          <button type="button" className="shortcuts-close" onClick={onClose} ref={closeRef}>
            Close
          </button>
        </div>

        <table className="shortcuts-table">
          <thead>
            <tr>
              <th scope="col">Keys</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.action}>
                <td>
                  <kbd>{d.keys}</kbd>
                </td>
                <td>{d.action}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <fieldset className="shortcuts-custom">
          <legend>Customise</legend>

          <label className="settings-toggle-row" htmlFor="palette-key">
            <span>Command palette key ({modifierLabel()} +)</span>
          </label>
          <select
            id="palette-key"
            className="ic-select"
            value={paletteKey}
            onChange={(e) => {
              setPaletteKey(e.target.value);
              setPaletteKeyState(e.target.value);
            }}
          >
            {PALETTE_KEY_CHOICES.map((k) => (
              <option key={k} value={k}>
                {k.toUpperCase()}
              </option>
            ))}
          </select>

          <label className="settings-toggle-row">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setShortcutsEnabled(e.target.checked);
                setEnabledState(e.target.checked);
              }}
            />
            <span>Global keyboard shortcuts enabled</span>
          </label>
        </fieldset>
      </div>
    </div>
  );
}
