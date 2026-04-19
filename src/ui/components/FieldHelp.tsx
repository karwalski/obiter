/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export interface FieldHelpProps {
  ruleNumber: string;
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

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const handleViewInGuide = (): void => {
    setOpen(false);
    navigate(`/abbreviations?rule=${encodeURIComponent(ruleNumber)}`);
  };

  return (
    <span className="field-help" ref={containerRef}>
      <button
        className="field-help-btn"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Help for Rule ${ruleNumber}`}
        aria-expanded={open}
      >
        ?
      </button>
      {open && (
        <div className="field-help-popover" role="tooltip">
          <div className="field-help-rule">Rule {ruleNumber}</div>
          <p className="field-help-desc">{description}</p>
          {example && (
            <div className="field-help-example">
              <strong>Example:</strong> {example}
            </div>
          )}
          <button
            className="field-help-link"
            type="button"
            onClick={handleViewInGuide}
          >
            View in guide
          </button>
        </div>
      )}
    </span>
  );
}
