/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_PROVIDER: string;
  readonly VITE_DEFAULT_BASE_URL: string;
  readonly VITE_DEFAULT_MODEL: string;
  readonly VITE_DEFAULT_TARGET_LANG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
