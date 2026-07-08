import type { TextChunk } from '@/features/translate/types';
import type { ExtensionSettings } from '@/shared/settings';

const SYSTEM_PROMPT = [
  'You are a translation engine.',
  'Translate each item to the requested target language.',
  'Preserve meaning and tone. Do not add explanations.',
  'Return only a JSON array of objects with keys id and text.',
  'Keep the same id for each item. text must be the translation.',
].join(' ');

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

function buildUserPrompt(texts: TextChunk[], targetLang: string): string {
  return [
    `Target language: ${targetLang}`,
    'Items:',
    JSON.stringify(texts),
  ].join('\n');
}

function parseTranslationContent(content: string): TextChunk[] {
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

  const endpoint = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(texts, targetLang) },
      ],
    }),
  });

  const payload = await response.json() as ChatCompletionResponse;
  if (!response.ok) {
    const message = payload.error?.message || `HTTP ${response.status}`;
    throw new Error(`Translation request failed: ${message}`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty model response');
  }

  return parseTranslationContent(content);
}
