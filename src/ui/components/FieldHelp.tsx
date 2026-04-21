/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export interface FieldHelpProps {
  ruleNumber?: string;
  description: string;
  example?: string;
}

/**
 * Inline help button that shows a popover with an AGLC4 rule reference,
 * description, and optional example. Includes a link to view the full
 * entry in the reference guide panel.
 */
export default function FieldHelp({
  ruleNumber,
  description,
  example,
}: FieldHelpProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const navigate = useNavigate();

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    },
    [open],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (open && e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    },
    [open],
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  const handleViewInGuide = (): void => {
    setOpen(false);
    if (ruleNumber) {
      navigate(`/abbreviations?rule=${encodeURIComponent(ruleNumber)}`);
    }
  };

  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const popoverWidth = Math.min(viewportWidth - 32, 280);
    // Position below the button, centred but clamped to viewport
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < 16) left = 16;
    if (left + popoverWidth > viewportWidth - 16) left = viewportWidth - 16 - popoverWidth;
    setPopoverStyle({
      top: rect.bottom + 4,
      left,
      width: popoverWidth,
    });
  }, []);

  useEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  return (
    <span className="field-help" ref={containerRef}>
      <button
        ref={btnRef}
        className="field-help-btn"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ruleNumber ? `Help for Rule ${ruleNumber}` : "Help"}
        aria-expanded={open}
      >
        ?
      </button>
      {open && (
        <div className="field-help-popover" role="tooltip" style={popoverStyle}>
          {ruleNumber && <div className="field-help-rule">Rule {ruleNumber}</div>}
          <p className="field-help-desc">{description}</p>
          {example && (
            <div className="field-help-example">
              <strong>Example:</strong> {example}
            </div>
          )}
          {ruleNumber && (
            <button
              className="field-help-link"
              type="button"
              onClick={handleViewInGuide}
            >
              View in guide
            </button>
          )}
        </div>
      )}
    </span>
  );
}
