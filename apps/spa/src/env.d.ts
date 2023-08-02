/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MEDIA_URL: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
