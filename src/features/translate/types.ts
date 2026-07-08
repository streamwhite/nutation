import { MESSAGE_TYPES } from '@/shared/constants';

export type TextChunk = {
  id: string;
  text: string;
};

export type TranslateBatchRequest = {
  type: typeof MESSAGE_TYPES.TRANSLATE_BATCH;
  texts: TextChunk[];
  targetLang: string;
};

export type TranslateBatchResponse = {
  ok: true;
  translations: TextChunk[];
} | {
  ok: false;
  error: string;
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
};

export type ExtensionMessage =
  | TranslateBatchRequest
  | StartTranslateRequest
  | StopTranslateRequest
  | GetTabStatusRequest;
