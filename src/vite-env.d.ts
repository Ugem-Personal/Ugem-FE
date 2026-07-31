/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_VIETMAP_API_KEY?: string;
  readonly VITE_VIETMAP_SERVICE_KEY?: string;
  readonly VITE_VIETMAP_TILE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
