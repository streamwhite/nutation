import type { TextChunk } from '@/features/translate/types';
import {
  API_MAX_TOKENS_CEILING,
  API_MAX_TOKENS_FLOOR,
  API_MAX_TOKENS_CHAR_RATIO,
} from '@/shared/constants';
import type { ExtensionSettings } from '@/shared/settings';

const SYSTEM_PROMPT = 'Translate each id<TAB>text line to the target language. Output id<TAB>translation lines only.';

export function estimateMaxTokens(texts: TextChunk[]): number {
  const inputChars = texts.reduce((sum, item) => sum + item.text.length, 0);
  const estimated = Math.ceil(inputChars * API_MAX_TOKENS_CHAR_RATIO) + API_MAX_TOKENS_FLOOR;
  return Math.min(Math.max(estimated, API_MAX_TOKENS_FLOOR), API_MAX_TOKENS_CEILING);
}

function buildUserPrompt(texts: TextChunk[], targetLang: string): string {
  const lines = texts.map((item) => `${item.id}\t${item.text}`);
  return [`lang=${targetLang}`, ...lines].join('\n');
}

export function buildChatCompletionBody(
  settings: ExtensionSettings,
  texts: TextChunk[],
  targetLang: string,
): Record<string, unknown> {
  return {
    model: settings.model,
    temperature: 0,
    max_tokens: estimateMaxTokens(texts),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(texts, targetLang) },
    ],
  };
}
