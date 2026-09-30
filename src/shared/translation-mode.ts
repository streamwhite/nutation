import type { MessageId } from '@/i18n';

export const TRANSLATION_MODES = ["bulk", "progressive"] as const;

export type TranslationMode = (typeof TRANSLATION_MODES)[number];

export const DEFAULT_TRANSLATION_MODE: TranslationMode = "bulk";

export const TRANSLATION_MODE_LABEL_IDS: Record<TranslationMode, MessageId> = {
  bulk: 'options.translationMode.bulk.label',
  progressive: 'options.translationMode.progressive.label',
};

export const TRANSLATION_MODE_NOTE_IDS: Record<TranslationMode, MessageId> = {
  bulk: 'options.translationMode.bulk.note',
  progressive: 'options.translationMode.progressive.note',
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
