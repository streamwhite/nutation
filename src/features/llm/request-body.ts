import type { TextChunk } from '@/features/translate/types';
import {
  API_MAX_TOKENS_CEILING,
  API_MAX_TOKENS_FLOOR,
  API_MAX_TOKENS_CHAR_RATIO,
  API_MAX_TOKENS_OVERHEAD,
} from '@/shared/constants';
import { resolveRequestModel } from '@/shared/providers';
import type { ExtensionSettings } from '@/shared/settings';

const SYSTEM_PROMPT = [
  'Translate each id<TAB>text line to the target language.',
  'Return JSON only as {"items":[{"id":"...","text":"..."}]}',
  'Translate every item fully. Keep the same ids. No markdown or explanations.',
].join(' ');

export function getTranslationSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildTranslationUserPrompt(texts: TextChunk[], targetLang: string): string {
  const lines = texts.map((item) => `${item.id}\t${item.text}`);
  return [`lang=${targetLang}`, ...lines].join('\n');
}

export function estimateMaxTokens(texts: TextChunk[]): number {
  const inputChars = texts.reduce((sum, item) => sum + item.text.length, 0);
  const estimated = Math.ceil(inputChars * API_MAX_TOKENS_CHAR_RATIO) + API_MAX_TOKENS_OVERHEAD;
  return Math.min(Math.max(estimated, API_MAX_TOKENS_FLOOR), API_MAX_TOKENS_CEILING);
}

function buildUserPrompt(texts: TextChunk[], targetLang: string): string {
  return buildTranslationUserPrompt(texts, targetLang);
}

export function buildChatCompletionBody(
  settings: ExtensionSettings,
  texts: TextChunk[],
  targetLang: string,
): Record<string, unknown> {
  return {
    model: resolveRequestModel(settings),
    temperature: 0,
    max_tokens: estimateMaxTokens(texts),
    messages: [
      { role: 'system', content: getTranslationSystemPrompt() },
      { role: 'user', content: buildUserPrompt(texts, targetLang) },
    ],
  };
}
