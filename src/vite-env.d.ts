/// <reference types="vite/client" />

interface ImportMetaEnv {
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  readonly __TAURI_INTERNALS__?: unknown;
}
