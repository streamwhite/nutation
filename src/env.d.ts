/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_PROVIDER: string;
  readonly VITE_DEFAULT_BASE_URL: string;
  readonly VITE_DEFAULT_MODEL: string;
  readonly VITE_DEFAULT_TARGET_LANG: string;
  readonly VITE_DEFAULT_TRANSLATION_MODE: string;
  readonly VITE_DEFAULT_CACHE_MAX_ENTRIES: string;
  readonly VITE_DEFAULT_SUMMARY_POSITION: string;
  readonly VITE_DEFAULT_SUMMARY_FONT_PX: string;
  readonly VITE_DEV_API_KEY: string;
  readonly VITE_SUMMARIZE_MAX_CHARS: string;
  readonly VITE_SUMMARY_CACHE_MAX_ENTRIES: string;
  readonly VITE_OPENCC_T2S_FROM: string;
  readonly VITE_OPENCC_T2S_TO: string;
  readonly VITE_OPENCC_S2T_FROM: string;
  readonly VITE_OPENCC_S2T_TO: string;
  readonly VITE_OPENCC_S2T_HK_TO: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
