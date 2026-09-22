/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * LLM provider catalogue: the model choices offered per provider and the
 * display labels. Shared by the Settings pane and the sign-in resolver
 * (BUG-007) so both pick the same default model for a provider.
 */

import type { LLMConfig } from "./config";

export interface ModelOption {
  value: string;
  label: string;
}

/** Model choices per fixed provider (first entry is the default). */
export const LLM_MODELS: Record<string, ModelOption[]> = {
  openai: [
    { value: "gpt-5.5", label: "GPT-5.5" },
    { value: "gpt-5.4", label: "GPT-5.4" },
    { value: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  anthropic: [
    { value: "claude-opus-4-8", label: "Claude Opus 4.8" },
    { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  ],
  gemini: [
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
  grok: [
    { value: "grok-3", label: "Grok 3" },
    { value: "grok-3-mini", label: "Grok 3 Mini" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  ],
};

/** Display label per provider id. */
export const LLM_PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  grok: "xAI Grok",
  deepseek: "DeepSeek",
  custom: "Custom Endpoint",
};

/** True when `value` is one of the provider ids LLMConfig accepts. */
export function isLlmProvider(value: unknown): value is LLMConfig["provider"] {
  return typeof value === "string" && value in LLM_PROVIDER_LABELS;
}

/** The default model for a provider ("" for custom endpoints). */
export function defaultModelFor(provider: string): string {
  return LLM_MODELS[provider]?.[0]?.value ?? "";
}
