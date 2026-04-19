/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * A text input with a typeahead dropdown powered by an external search
 * function. Used on the Insert Citation form to suggest cases and
 * legislation from AustLII, Jade, and the Federal Register.
 */

import { useRef, useState, useCallback } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, loading, error } = useTypeahead(searchFn, value, minChars, debounceMs);

  const showDropdown = open && (results.length > 0 || loading || error !== null);

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
    },
    [onSelect],
  );

  return (
    <div className="ta-container" ref={containerRef}>
      {label && (
        <label className="ic-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="ta-input-wrapper">
        <input
          id={id}
          className={className ?? "ic-input"}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown || undefined}
          aria-autocomplete="list"
        />
        {loading && <span className="ta-spinner" aria-label="Searching" />}
      </div>

      {showDropdown && (
        <ul className="ta-dropdown" role="listbox">
          {error && <li className="ta-dropdown-error">{error}</li>}
          {!error &&
            results.map((result, idx) => (
              <li
                key={`${result.sourceId}-${idx}`}
                className="ta-dropdown-item"
                role="option"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  handleSelect(result);
                }}
              >
                <span className="ta-item-title">{result.title}</span>
                {result.snippet && (
                  <span className="ta-item-snippet">{result.snippet}</span>
                )}
              </li>
            ))}
          {!error && results.length === 0 && loading && (
            <li className="ta-dropdown-loading">Searching...</li>
          )}
        </ul>
      )}
    </div>
  );
}
