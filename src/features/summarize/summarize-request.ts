import { estimateMaxTokens } from '@/features/llm/request-body';
import { resolveRequestModel } from '@/shared/providers';
import { SUMMARIZE_MAX_OUTPUT_TOKENS } from '@/shared/constants';
import { getUiStrings } from '@/shared/ui-strings';
import type { ExtensionSettings } from '@/shared/settings';

export function getSummarizeSystemPrompt(): string {
  return getUiStrings().summarize.systemPrompt;
}

export function buildSummarizeUserPrompt(pageText: string, targetLang: string): string {
  const prefix = getUiStrings().summarize.userPromptPrefix;
  return [`lang=${targetLang}`, prefix, '', pageText].join('\n');
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
