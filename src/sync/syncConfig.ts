export interface SyncConfig {
  apiBaseUrl: string | null;
  userId: string | null;
  worksiteId: string | null;
  deviceId: string | null;
  version: string | null;
}

const normalizeOptionalValue = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeBaseUrl = (value: string | undefined) => {
  const normalized = normalizeOptionalValue(value);
  return normalized ? normalized.replace(/\/+$/, '') : null;
};

export const getSyncConfig = (): SyncConfig => ({
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_SYNC_API_BASE_URL),
  userId: normalizeOptionalValue(import.meta.env.VITE_SYNC_USER_ID),
  worksiteId: normalizeOptionalValue(import.meta.env.VITE_SYNC_WORKSITE_ID),
  deviceId: normalizeOptionalValue(import.meta.env.VITE_SYNC_DEVICE_ID),
  version: normalizeOptionalValue(import.meta.env.VITE_SYNC_CONTRACT_VERSION) ?? '1.0.0',
});

export const getSyncConfigErrors = (config: SyncConfig) => {
  const errors: string[] = [];

  if (!config.apiBaseUrl) {
    errors.push('Set VITE_SYNC_API_BASE_URL to enable backend sync.');
  }

  if (!config.userId) {
    errors.push('Set VITE_SYNC_USER_ID to scope sync to one user.');
  }

  if (!config.worksiteId) {
    errors.push('Set VITE_SYNC_WORKSITE_ID to scope sync to one worksite.');
  }

  return errors;
};

export const isSyncConfigured = (config: SyncConfig) => getSyncConfigErrors(config).length === 0;
