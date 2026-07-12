export const TRANSLATION_MODES = ["bulk", "progressive"] as const;

export type TranslationMode = (typeof TRANSLATION_MODES)[number];

export const DEFAULT_TRANSLATION_MODE: TranslationMode = "bulk";

export const TRANSLATION_MODE_LABELS: Record<TranslationMode, string> = {
  bulk: "Full page (fewer requests)",
  progressive: "Viewport first (faster first paint)",
};

export const TRANSLATION_MODE_NOTES: Record<TranslationMode, string> = {
  bulk: [
    "Translates the whole page in fewer, larger requests (default).",
    "Best when you can keep reading other tabs while this page finishes.",
    "New content after scroll uses smaller, faster batches.",
  ].join(" "),
  progressive: [
    "Translates near-viewport text first with small batches.",
    "Best when you want visible text to update as soon as possible.",
    "Uses more API requests overall and probably cost you more money.",
  ].join(" "),
};

export function isTranslationMode(value: unknown): value is TranslationMode {
  return (
    typeof value === "string" &&
    (TRANSLATION_MODES as readonly string[]).includes(value)
  );
}

export function resolveTranslationMode(value: unknown): TranslationMode {
  if (isTranslationMode(value)) {
    return value;
  }
  const fromEnv = import.meta.env.VITE_DEFAULT_TRANSLATION_MODE;
  return isTranslationMode(fromEnv) ? fromEnv : DEFAULT_TRANSLATION_MODE;
}
