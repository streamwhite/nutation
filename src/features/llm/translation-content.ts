import type { TextChunk } from '@/features/translate/types';

const LINE_PATTERN = /^([^|\t\n]+)[|\t](.+)$/;
const FENCE_PATTERN = /^```(?:[\w-]+)?\s*([\s\S]*?)```$/i;
const OPEN_FENCE_PATTERN = /^```(?:[\w-]+)?\s*/i;
const PREVIEW_LENGTH = 160;

function stripCodeFence(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(FENCE_PATTERN);
  if (fenced) {
    return fenced[1].trim();
  }

  const openFence = trimmed.match(OPEN_FENCE_PATTERN);
  if (!openFence) {
    return trimmed;
  }

  let body = trimmed.slice(openFence[0].length);
  if (body.endsWith('```')) {
    body = body.slice(0, -3);
  }
  return body.trim();
}

function extractCandidateLines(content: string): string[] {
  return stripCodeFence(content)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => (
      line.length > 0
      && !line.startsWith('lang=')
      && LINE_PATTERN.test(line)
    ));
}

function parseLineFormat(content: string): TextChunk[] | null {
  const lines = extractCandidateLines(content);
  if (lines.length === 0) {
    return null;
  }

  return lines.map((line) => {
    const match = line.match(LINE_PATTERN);
    return { id: match![1], text: match![2].trim() };
  });
}

function toTextChunks(parsed: unknown): TextChunk[] {
  if (!Array.isArray(parsed)) {
    throw new Error('Model response is not a JSON array');
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid translation item at index ${index}`);
    }
    const record = item as { id?: unknown; text?: unknown; translation?: unknown };
    const id = record.id === undefined || record.id === null
      ? String(index)
      : String(record.id);
    const textValue = record.text ?? record.translation;
    if (typeof textValue !== 'string') {
      throw new Error(`Missing translation text for id ${id}`);
    }
    return { id, text: textValue };
  });
}

function unwrapJsonPayload(parsed: unknown): unknown {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  const record = parsed as Record<string, unknown>;
  if (Array.isArray(record.items)) {
    return record.items;
  }
  if (Array.isArray(record.translations)) {
    return record.translations;
  }
  if (Array.isArray(record.results)) {
    return record.results;
  }
  return parsed;
}

function extractJsonText(content: string): string {
  const stripped = stripCodeFence(content);
  try {
    JSON.parse(stripped);
    return stripped;
  } catch {
    // Fall through and try to locate an embedded JSON value.
  }

  const objectStart = stripped.indexOf('{');
  const arrayStart = stripped.indexOf('[');
  if (objectStart < 0 && arrayStart < 0) {
    return stripped;
  }

  const start = objectStart < 0
    ? arrayStart
    : arrayStart < 0
      ? objectStart
      : Math.min(objectStart, arrayStart);
  const candidate = stripped.slice(start);
  const endObject = candidate.lastIndexOf('}');
  const endArray = candidate.lastIndexOf(']');
  const end = Math.max(endObject, endArray);
  if (end < 0) {
    return stripped;
  }
  return candidate.slice(0, end + 1);
}

function findMatchingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function recoverPartialItems(content: string): TextChunk[] | null {
  const stripped = stripCodeFence(content);
  const marker = stripped.match(/"items"\s*:\s*\[/);
  if (!marker || marker.index === undefined) {
    return null;
  }

  // Truncated mid-item yields [] so callers can retry missing ids.
  const items: TextChunk[] = [];
  let index = marker.index + marker[0].length;

  while (index < stripped.length) {
    while (index < stripped.length && /[\s,]/.test(stripped[index])) {
      index += 1;
    }
    if (stripped[index] === ']' || stripped[index] === undefined) {
      break;
    }
    if (stripped[index] !== '{') {
      break;
    }

    const end = findMatchingBrace(stripped, index);
    if (end < 0) {
      break;
    }

    try {
      const record = JSON.parse(stripped.slice(index, end + 1)) as {
        id?: unknown;
        text?: unknown;
        translation?: unknown;
      };
      const textValue = record.text ?? record.translation;
      if (typeof textValue === 'string' && textValue.trim()) {
        items.push({
          id: record.id === undefined || record.id === null
            ? String(items.length)
            : String(record.id),
          text: textValue,
        });
      }
    } catch {
      break;
    }

    index = end + 1;
  }

  return items;
}

function parseJsonFormat(content: string): TextChunk[] {
  try {
    const jsonText = extractJsonText(content);
    const parsed = JSON.parse(jsonText) as unknown;
    return toTextChunks(unwrapJsonPayload(parsed));
  } catch {
    const partial = recoverPartialItems(content);
    if (partial !== null) {
      return partial;
    }
    throw new Error('Unable to parse translation JSON');
  }
}

function previewContent(content: string): string {
  const compact = content.replace(/\s+/g, ' ').trim();
  if (compact.length <= PREVIEW_LENGTH) {
    return compact;
  }
  return `${compact.slice(0, PREVIEW_LENGTH)}…`;
}

function looksLikeJsonTranslation(content: string): boolean {
  const stripped = stripCodeFence(content);
  return /"items"\s*:/.test(stripped)
    || /"translations"\s*:/.test(stripped)
    || /^\s*[{\[]/.test(stripped);
}

function isPlausibleLineId(id: string): boolean {
  return /^[\w.-]+$/.test(id);
}

export function parseTranslationContent(content: string): TextChunk[] {
  if (looksLikeJsonTranslation(content)) {
    try {
      return parseJsonFormat(content);
    } catch {
      // Fall through to line format for mixed responses.
    }
  }

  const lineParsed = parseLineFormat(content);
  if (lineParsed && lineParsed.every((item) => isPlausibleLineId(item.id))) {
    return lineParsed;
  }

  try {
    return parseJsonFormat(content);
  } catch {
    throw new Error(
      `Model response is not valid line or JSON format: ${previewContent(content)}`,
    );
  }
}
