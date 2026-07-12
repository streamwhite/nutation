/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_PROVIDER: string;
  readonly VITE_DEFAULT_BASE_URL: string;
  readonly VITE_DEFAULT_MODEL: string;
  readonly VITE_DEFAULT_TARGET_LANG: string;
  readonly VITE_DEFAULT_TRANSLATION_MODE: string;
  readonly VITE_OPENCC_FROM: string;
  readonly VITE_OPENCC_TO: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
