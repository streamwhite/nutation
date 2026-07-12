import { MESSAGE_TYPES } from '@/shared/constants';
import type { StageTimingSummary } from '@/features/translate/stage-timer';
import type { ExtensionSettings } from '@/shared/settings';

export type TextChunk = {
  id: string;
  text: string;
  sourceLang?: string;
};

export type TranslateBatchRequest = {
  type: typeof MESSAGE_TYPES.TRANSLATE_BATCH;
  texts: TextChunk[];
  targetLang: string;
  settings: ExtensionSettings;
};

export type WarmProviderRequest = {
  type: typeof MESSAGE_TYPES.WARM_PROVIDER;
  settings: ExtensionSettings;
};

export type TranslateBatchResponse = {
  ok: true;
  translations: TextChunk[];
  timing?: StageTimingSummary;
} | {
  ok: false;
  error: string;
  retryable?: boolean;
  status?: number | null;
};

export type PersistTranslationsRequest = {
  type: typeof MESSAGE_TYPES.PERSIST_TRANSLATIONS;
  entries: Array<{ text: string; translation: string }>;
  targetLang: string;
  model: string;
};

export type StartTranslateRequest = {
  type: typeof MESSAGE_TYPES.START_TRANSLATE;
  targetLang?: string;
};

export type StopTranslateRequest = {
  type: typeof MESSAGE_TYPES.STOP_TRANSLATE;
};

export type GetTabStatusRequest = {
  type: typeof MESSAGE_TYPES.GET_TAB_STATUS;
};

export type TabStatus = {
  active: boolean;
  error: string | null;
  translatedCount: number;
  cacheHits?: number;
  cacheLookups?: number;
  timing?: StageTimingSummary;
};

export type EnsureContentScriptRequest = {
  type: typeof MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT;
  tabId: number;
};

export type EnsureContentScriptResponse = {
  ok: boolean;
  recovered: boolean;
  method?: 'inject' | 'reload' | 'none';
  error?: string;
};

export type ContentScriptMessage =
  | StartTranslateRequest
  | StopTranslateRequest
  | GetTabStatusRequest;

export type BackgroundMessage =
  | TranslateBatchRequest
  | WarmProviderRequest
  | PersistTranslationsRequest
  | EnsureContentScriptRequest;
