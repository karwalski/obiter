/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Keyboard-first command palette (A11Y-029). Opens with Ctrl/Cmd-K and lets a
 * user run any common action in a few keystrokes instead of pointing across a
 * dense pane — lowering motor effort for the heaviest workflows. Implements the
 * ARIA APG combobox pattern over a filterable list of commands.
 */

/* global HTMLElement */

import { useEffect, useRef, useState, useCallback, useMemo, useId } from "react";

export interface PaletteCommand {
  id: string;
  label: string;
  /** Optional short hint shown on the right (e.g. a destination or shortcut). */
  hint?: string;
  /** Extra words to match against, beyond the label. */
  keywords?: string;
  run: () => void;
}

interface CommandPaletteProps {
  commands: PaletteCommand[];
  onClose: () => void;
}

export default function CommandPalette({ commands, onClose }: CommandPaletteProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reactId = useId();
  const listboxId = `cmdp-${reactId}-listbox`;
  const optionId = (idx: number): string => `cmdp-${reactId}-opt-${idx}`;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [query, commands]);

  // Focus the input when the palette opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset the highlight whenever the filtered set changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep the active option in view.
  useEffect(() => {
    const id = filtered[activeIndex] ? optionId(activeIndex) : undefined;
    if (!id) return;
    const el = listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, filtered]);

  const runIndex = useCallback(
    (idx: number) => {
      const cmd = filtered[idx];
      if (!cmd) return;
      onClose();
      cmd.run();
    },
    [filtered, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const count = filtered.length;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (count > 0) setActiveIndex((i) => (i + 1) % count);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (count > 0) setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
          break;
        case "Home":
          if (count > 0) {
            e.preventDefault();
            setActiveIndex(0);
          }
          break;
        case "End":
          if (count > 0) {
            e.preventDefault();
            setActiveIndex(count - 1);
          }
          break;
        case "Enter":
          e.preventDefault();
          runIndex(activeIndex);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    },
    [filtered, activeIndex, runIndex, onClose]
  );

  const activeOptionId = filtered[activeIndex] ? optionId(activeIndex) : undefined;

  return (
    // Backdrop click closes; the dialog is keyboard-closable via Escape (WCAG 2.1.1 met).
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="cmdp-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cmdp-dialog" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={inputRef}
          type="text"
          className="cmdp-input"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={true}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-label="Search commands"
        />
        <ul className="cmdp-list" role="listbox" id={listboxId} ref={listRef} aria-label="Commands">
          {filtered.length === 0 && <li className="cmdp-empty">No matching commands</li>}
          {filtered.map((cmd, idx) => (
            <li
              key={cmd.id}
              id={optionId(idx)}
              role="option"
              aria-selected={idx === activeIndex}
              className={idx === activeIndex ? "cmdp-item cmdp-item--active" : "cmdp-item"}
              onMouseDown={(e) => {
                e.preventDefault();
                runIndex(idx);
              }}
              onMouseMove={() => setActiveIndex(idx)}
            >
              <span className="cmdp-item-label">{cmd.label}</span>
              {cmd.hint && <span className="cmdp-item-hint">{cmd.hint}</span>}
            </li>
          ))}
        </ul>
        <p className="cmdp-foot">
          <span aria-hidden="true">↑↓ to move · Enter to run · Esc to close</span>
        </p>
      </div>
    </div>
  );
}
