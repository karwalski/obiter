/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Visible, re-readable status region driven by StatusContext. Rendered once in
 * the Layout so its aria-live region persists across view changes and announces
 * outcomes politely (WCAG 4.1.3). Level is conveyed by text label + colour +
 * position, never colour alone (style guide §9.4).
 */

import { useStatus, StatusLevel } from "../context/StatusContext";

function levelLabel(level: StatusLevel): string {
  switch (level) {
    case "error":
      return "Error";
    case "success":
      return "Done";
    default:
      return "Status";
  }
}

export default function StatusLog(): JSX.Element {
  const { entries, clear } = useStatus();
  const hasEntries = entries.length > 0;

  // The role="log" live region stays mounted (visually hidden when empty) so the
  // first announcement is reliably read. The <ul> keeps plain list semantics.
  return (
    <section
      className={hasEntries ? "obiter-status-log" : "obiter-visually-hidden"}
      aria-label="Recent activity"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {hasEntries && (
        <>
          <ul className="obiter-status-list">
            {entries.map((e) => (
              <li key={e.id} className={`obiter-status-item obiter-status-item--${e.level}`}>
                <span className="obiter-status-level">{levelLabel(e.level)}</span>
                <span className="obiter-status-text">{e.message}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="obiter-status-clear" onClick={clear}>
            Clear
          </button>
        </>
      )}
    </section>
  );
}
