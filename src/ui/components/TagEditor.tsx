/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-001: chip editor for a citation's user tags. System tags (import
 * provenance, dedupe and rule markers) are shown as read-only labels and
 * always handed back unchanged; `onChange` receives the FULL tags array
 * with system tags first and user tags after them.
 */

import { useCallback, useId, useMemo, useState } from "react";
import { normaliseTag, systemTags, userTags, withUserTags } from "../../engine/tags";

export interface TagEditorProps {
  /** The citation's stored tags, system and user together. */
  tags: string[];
  /** Called with the full replacement tags array. */
  onChange(tags: string[]): void;
  /** Tags used elsewhere in the library, offered as completions. */
  suggestions: string[];
  /** Visible label for the input (default "Tags"). */
  label?: string;
}

export default function TagEditor({
  tags,
  onChange,
  suggestions,
  label = "Tags",
}: TagEditorProps): JSX.Element {
  const reactId = useId();
  const inputId = `tag-editor-input-${reactId}`;
  const listId = `tag-editor-list-${reactId}`;
  const hintId = `tag-editor-hint-${reactId}`;
  const [draft, setDraft] = useState("");

  const user = useMemo(() => userTags(tags), [tags]);
  const system = useMemo(() => systemTags(tags), [tags]);
  const options = useMemo(() => {
    const current = new Set(user);
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of suggestions) {
      const tag = normaliseTag(raw);
      if (!tag || current.has(tag) || seen.has(tag)) continue;
      seen.add(tag);
      result.push(tag);
    }
    return result.sort((a, b) => a.localeCompare(b));
  }, [suggestions, user]);

  const commitDraft = useCallback(
    (raw: string): void => {
      const tag = normaliseTag(raw);
      setDraft("");
      if (!tag || user.includes(tag)) return;
      onChange(withUserTags(tags, [...user, tag]));
    },
    [onChange, tags, user]
  );

  const removeTag = useCallback(
    (tag: string): void => {
      onChange(
        withUserTags(
          tags,
          user.filter((t) => t !== tag)
        )
      );
    },
    [onChange, tags, user]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        commitDraft(draft);
        return;
      }
      if (e.key === "Backspace" && draft === "" && user.length > 0) {
        e.preventDefault();
        removeTag(user[user.length - 1]);
      }
    },
    [commitDraft, draft, removeTag, user]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const value = e.target.value;
      // A comma typed or pasted mid-string commits everything before it.
      if (value.includes(",")) {
        const parts = value.split(",");
        const rest = parts.pop() ?? "";
        let next = tags;
        let current = user;
        for (const part of parts) {
          const tag = normaliseTag(part);
          if (tag && !current.includes(tag)) {
            current = [...current, tag];
            next = withUserTags(next, current);
          }
        }
        if (next !== tags) onChange(next);
        setDraft(rest);
        return;
      }
      setDraft(value);
    },
    [onChange, tags, user]
  );

  return (
    <div className="tag-editor">
      <label htmlFor={inputId} className="tag-editor-label">
        {label}
      </label>
      {(user.length > 0 || system.length > 0) && (
        <ul className="tag-editor-chips" aria-label={`${label} on this citation`}>
          {system.map((tag) => (
            <li key={`system:${tag}`} aria-label={`System tag ${tag}`}>
              <span className="tag-chip tag-chip--system">{tag}</span>
            </li>
          ))}
          {user.map((tag) => (
            <li key={`user:${tag}`}>
              <span className="tag-chip">
                {tag}
                <button
                  type="button"
                  className="tag-chip-remove"
                  aria-label={`Remove ${tag}`}
                  onClick={() => removeTag(tag)}
                >
                  &times;
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <input
        id={inputId}
        className="edit-field-input tag-editor-input"
        type="text"
        value={draft}
        list={options.length > 0 ? listId : undefined}
        autoComplete="off"
        maxLength={40}
        placeholder="Add a tag"
        aria-describedby={hintId}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim()) commitDraft(draft);
        }}
      />
      {options.length > 0 && (
        <datalist id={listId}>
          {options.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      )}
      <div id={hintId} className="tag-editor-hint">
        Press Enter or type a comma to add a tag. Backspace on an empty box removes the last tag.
      </div>
    </div>
  );
}
