const cache = new Map<string, string>();

async function hashText(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildCacheKey(
  text: string,
  targetLang: string,
  model: string,
): Promise<string> {
  return hashText(`${model}::${targetLang}::${text}`);
}

export async function getCachedTranslation(
  text: string,
  targetLang: string,
  model: string,
): Promise<string | null> {
  const key = await buildCacheKey(text, targetLang, model);
  return cache.get(key) ?? null;
}

export async function setCachedTranslation(
  text: string,
  targetLang: string,
  model: string,
  translation: string,
): Promise<void> {
  const key = await buildCacheKey(text, targetLang, model);
  cache.set(key, translation);
}

export function clearTranslationCache(): void {
  cache.clear();
}
