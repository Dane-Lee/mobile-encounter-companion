import {
  getDesktopSyncSettings,
  getDesktopSyncSettingsErrors,
  isDesktopSyncConfigured,
  SYNC_SETTINGS_CHANGED_EVENT,
} from './config';

export interface SyncConfig {
  apiBaseUrl: string | null;
  userId: string | null;
  worksiteId: string | null;
  deviceId: string | null;
  version: string | null;
}

export const getSyncConfig = (): SyncConfig => {
  const settings = getDesktopSyncSettings();

  return {
    apiBaseUrl: settings.baseUrl,
    userId: settings.userId,
    worksiteId: settings.worksiteId,
    deviceId: settings.deviceId,
    version: settings.version,
  };
};

export const getSyncConfigErrors = (config: SyncConfig) =>
  getDesktopSyncSettingsErrors({
    baseUrl: config.apiBaseUrl,
    userId: config.userId,
    worksiteId: config.worksiteId,
    deviceId: config.deviceId ?? '',
    version: config.version ?? '1.0.0',
  });

export const isSyncConfigured = (config: SyncConfig) =>
  isDesktopSyncConfigured({
    baseUrl: config.apiBaseUrl,
    userId: config.userId,
    worksiteId: config.worksiteId,
    deviceId: config.deviceId ?? '',
    version: config.version ?? '1.0.0',
  });

export { SYNC_SETTINGS_CHANGED_EVENT };
