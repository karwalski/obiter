/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * A text input with a typeahead dropdown powered by an external search
 * function. Used on the Insert Citation form to suggest cases and
 * legislation from AustLII, Jade, and the Federal Register.
 *
 * Implements the ARIA APG "editable combobox with list autocomplete" pattern
 * (WCAG 2.1.1 Keyboard, 4.1.2 Name/Role/Value): the listbox is referenced via
 * aria-controls, the active option via aria-activedescendant, options carry
 * aria-selected, and Down/Up/Enter/Escape/Home/End are all keyboard-operable.
 * A polite live region announces the result count for screen-reader users.
 */

import { useRef, useState, useCallback, useEffect, useId } from "react";
import { LookupResult } from "../../api/types";
import { useTypeahead } from "../hooks/useTypeahead";

export interface TypeaheadInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: LookupResult) => void;
  placeholder?: string;
  label?: string;
  searchFn: (query: string) => Promise<LookupResult[]>;
  minChars?: number;
  debounceMs?: number;
  id?: string;
  className?: string;
}

/**
 * Text input with a dropdown of typeahead suggestions. Delegates the
 * actual searching to `searchFn` via the `useTypeahead` hook and renders
 * results in a positioned list below the input.
 */
export default function TypeaheadInput({
  value,
  onChange,
  onSelect,
  placeholder,
  label,
  searchFn,
  minChars = 3,
  debounceMs = 300,
  id,
  className,
}: TypeaheadInputProps): JSX.Element {
  const [open, setOpen] = useState(false);
  // Index of the option highlighted by the keyboard; -1 means none active.
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { results, loading, error } = useTypeahead(searchFn, value, minChars, debounceMs);

  const showDropdown = open && (results.length > 0 || loading || error !== null);

  // Stable ids so the input can point at the listbox and the active option.
  const reactId = useId();
  const baseId = id ?? `ta-${reactId}`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (idx: number): string => `${baseId}-opt-${idx}`;
  const activeOptionId =
    showDropdown && activeIndex >= 0 && activeIndex < results.length
      ? optionId(activeIndex)
      : undefined;

  // Reset the active option whenever the result set or query changes so Enter
  // never selects a stale row (APG: typing returns to "no active option").
  useEffect(() => {
    setActiveIndex(-1);
  }, [results, value]);

  // Keep the active option scrolled into view as the user arrows through.
  useEffect(() => {
    if (activeOptionId) {
      const el = listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(activeOptionId)}`);
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeOptionId]);

  const handleFocus = useCallback(() => {
    setOpen(true);
  }, []);

  // Close on blur with a small delay so that a click on a dropdown item
  // can register before the list disappears.
  const handleBlur = useCallback(() => {
    setTimeout(() => setOpen(false), 200);
  }, []);

  const handleSelect = useCallback(
    (result: LookupResult) => {
      onSelect(result);
      setOpen(false);
      setActiveIndex(-1);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const count = results.length;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!open) {
            setOpen(true);
            return;
          }
          if (count > 0) {
            setActiveIndex((i) => (i + 1) % count);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (!open) {
            setOpen(true);
            return;
          }
          if (count > 0) {
            setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
          }
          break;
        case "Home":
          if (open && count > 0) {
            e.preventDefault();
            setActiveIndex(0);
          }
          break;
        case "End":
          if (open && count > 0) {
            e.preventDefault();
            setActiveIndex(count - 1);
          }
          break;
        case "Enter":
          if (open && activeIndex >= 0 && activeIndex < count) {
            e.preventDefault();
            handleSelect(results[activeIndex]);
          }
          break;
        case "Escape":
          if (open) {
            e.preventDefault();
            setOpen(false);
            setActiveIndex(-1);
          }
          break;
        default:
          break;
      }
    },
    [open, results, activeIndex, handleSelect]
  );

  // Polite announcement of the current dropdown state for assistive tech.
  let statusMessage = "";
  if (showDropdown) {
    if (error) {
      statusMessage = error;
    } else if (loading && results.length === 0) {
      statusMessage = "Searching";
    } else if (results.length > 0) {
      statusMessage = `${results.length} ${results.length === 1 ? "result" : "results"} available`;
    }
  }

  return (
    <div className="ta-container" ref={containerRef}>
      {label && (
        <label className="ic-label" htmlFor={baseId}>
          {label}
        </label>
      )}
      <div className="ta-input-wrapper">
        <input
          id={baseId}
          className={className ?? "ic-input"}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
        />
        {loading && <span className="ta-spinner" aria-hidden="true" />}
      </div>

      {showDropdown && (
        <ul className="ta-dropdown" role="listbox" id={listboxId} ref={listRef}>
          {error && <li className="ta-dropdown-error">{error}</li>}
          {!error &&
            results.map((result, idx) => (
              <li
                key={`${result.sourceId}-${idx}`}
                id={optionId(idx)}
                className={
                  idx === activeIndex
                    ? "ta-dropdown-item ta-dropdown-item--active"
                    : "ta-dropdown-item"
                }
                role="option"
                aria-selected={idx === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  handleSelect(result);
                }}
                onMouseMove={() => setActiveIndex(idx)}
              >
                <span className="ta-item-title">{result.title}</span>
                {result.snippet && <span className="ta-item-snippet">{result.snippet}</span>}
              </li>
            ))}
          {!error && results.length === 0 && loading && (
            <li className="ta-dropdown-loading">Searching...</li>
          )}
        </ul>
      )}

      <span className="obiter-visually-hidden" role="status" aria-live="polite">
        {statusMessage}
      </span>
    </div>
  );
}
