import { estimateMaxTokens } from '@/features/llm/request-body';
import { resolveRequestModel } from '@/shared/providers';
import { SUMMARIZE_MAX_OUTPUT_TOKENS } from '@/shared/constants';
import type { ExtensionSettings } from '@/shared/settings';

export const SUMMARIZE_SYSTEM_PROMPT = 'You summarize web page content clearly and accurately. Write a concise summary in the target language. Use short paragraphs. Do not invent facts. No markdown fences or titles unless needed for clarity.';

export const SUMMARIZE_USER_PROMPT_PREFIX = 'Summarize the following page content.';

export function getSummarizeSystemPrompt(): string {
  return SUMMARIZE_SYSTEM_PROMPT;
}

export function buildSummarizeUserPrompt(pageText: string, targetLang: string): string {
  return [`lang=${targetLang}`, SUMMARIZE_USER_PROMPT_PREFIX, '', pageText].join('\n');
}

export function estimateSummarizeMaxTokens(pageText: string): number {
  const estimated = estimateMaxTokens([{ id: '0', text: pageText }]);
  return Math.min(estimated, SUMMARIZE_MAX_OUTPUT_TOKENS);
}

export function buildSummarizeChatBody(
  settings: ExtensionSettings,
  pageText: string,
  targetLang: string,
): Record<string, unknown> {
  return {
    model: resolveRequestModel(settings),
    temperature: 0,
    max_tokens: estimateSummarizeMaxTokens(pageText),
    messages: [
      { role: 'system', content: getSummarizeSystemPrompt() },
      { role: 'user', content: buildSummarizeUserPrompt(pageText, targetLang) },
    ],
  };
}
