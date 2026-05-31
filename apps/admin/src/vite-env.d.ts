/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: "local" | "cloud" | "custom";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
