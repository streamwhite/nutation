import { TranslationRequestError } from '@/features/llm/retry';
import { buildChatCompletionsUrl } from '@/features/llm/api-url';
import { buildChatCompletionBody } from '@/features/llm/request-body';
import type { TextChunk } from '@/features/translate/types';
import { RETRYABLE_HTTP_STATUSES } from '@/shared/constants';
import { buildRequestHeaders } from '@/shared/providers';
import type { ExtensionSettings } from '@/shared/settings';

export { estimateMaxTokens } from '@/features/llm/request-body';

const LINE_PATTERN = /^([^|\t\n]+)[|\t](.+)$/;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function parseLineFormat(content: string): TextChunk[] | null {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('lang='));

  if (lines.length === 0) {
    return null;
  }

  const parsed: TextChunk[] = [];
  for (const line of lines) {
    const match = line.match(LINE_PATTERN);
    if (!match) {
      return null;
    }
    parsed.push({ id: match[1], text: match[2].trim() });
  }
  return parsed;
}

function parseJsonFormat(content: string): TextChunk[] {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  const parsed = JSON.parse(jsonText) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('Model response is not a JSON array');
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid translation item at index ${index}`);
    }
    const record = item as { id?: unknown; text?: unknown; translation?: unknown };
    const id = typeof record.id === 'string' ? record.id : String(index);
    const textValue = record.text ?? record.translation;
    if (typeof textValue !== 'string') {
      throw new Error(`Missing translation text for id ${id}`);
    }
    return { id, text: textValue };
  });
}

export function parseTranslationContent(content: string): TextChunk[] {
  const lineParsed = parseLineFormat(content);
  if (lineParsed) {
    return lineParsed;
  }

  try {
    return parseJsonFormat(content);
  } catch {
    throw new Error('Model response is not valid line or JSON format');
  }
}

export async function translateBatchWithOpenAI(
  settings: ExtensionSettings,
  texts: TextChunk[],
  targetLang: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TextChunk[]> {
  if (texts.length === 0) {
    return [];
  }

  if (!settings.apiKey.trim()) {
    throw new Error('API key is missing. Configure it in extension options.');
  }

  const endpoint = buildChatCompletionsUrl(settings.baseUrl);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: buildRequestHeaders(settings),
    body: JSON.stringify(buildChatCompletionBody(settings, texts, targetLang)),
  });

  const payload = await response.json() as ChatCompletionResponse;
  if (!response.ok) {
    const message = payload.error?.message || `HTTP ${response.status}`;
    const retryable = RETRYABLE_HTTP_STATUSES.includes(
      response.status as typeof RETRYABLE_HTTP_STATUSES[number],
    );
    throw new TranslationRequestError(
      `Translation request failed: ${message}`,
      response.status,
      retryable,
    );
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty model response');
  }

  return parseTranslationContent(content);
}
