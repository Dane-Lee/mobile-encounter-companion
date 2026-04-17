/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SYNC_API_BASE_URL?: string;
  readonly VITE_SYNC_USER_ID?: string;
  readonly VITE_SYNC_WORKSITE_ID?: string;
  readonly VITE_SYNC_DEVICE_ID?: string;
  readonly VITE_SYNC_CONTRACT_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
