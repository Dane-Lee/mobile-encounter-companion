import { createId } from '../lib/id';

const STORAGE_KEY = 'daily-encounter-mobile-companion.desktop-sync-settings';
const CONFIG_CHANGED_EVENT = 'daily-encounter-mobile-companion:sync-config-changed';
const DEFAULT_SYNC_VERSION = '1.0.0';

interface StoredSyncSettings {
  baseUrl?: string | null;
  userId?: string | null;
  worksiteId?: string | null;
  deviceId?: string | null;
  version?: string | null;
}

export interface DesktopSyncSettings {
  baseUrl: string | null;
  userId: string | null;
  worksiteId: string | null;
  deviceId: string;
  version: string;
}

export interface DesktopSyncSettingsInput {
  baseUrl?: string | null;
  userId?: string | null;
  worksiteId?: string | null;
}

const canUseLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizeOptionalValue = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeBaseUrl = (value: string | null | undefined) => {
  const normalized = normalizeOptionalValue(value);
  return normalized ? normalized.replace(/\/+$/, '') : null;
};

const dispatchConfigChanged = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(CONFIG_CHANGED_EVENT));
};

const readStoredSyncSettings = (): StoredSyncSettings => {
  if (!canUseLocalStorage()) {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    return JSON.parse(rawValue) as StoredSyncSettings;
  } catch {
    return {};
  }
};

const writeStoredSyncSettings = (value: StoredSyncSettings) => {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  dispatchConfigChanged();
};

const ensureStoredDeviceId = (stored: StoredSyncSettings) => {
  const existingDeviceId = normalizeOptionalValue(stored.deviceId);
  if (existingDeviceId) {
    return existingDeviceId;
  }

  const nextDeviceId = createId('device');
  writeStoredSyncSettings({
    ...stored,
    deviceId: nextDeviceId,
  });
  return nextDeviceId;
};

export const getDesktopSyncSettings = (): DesktopSyncSettings => {
  const stored = readStoredSyncSettings();

  return {
    baseUrl: normalizeBaseUrl(stored.baseUrl),
    userId: normalizeOptionalValue(stored.userId),
    worksiteId: normalizeOptionalValue(stored.worksiteId),
    deviceId: ensureStoredDeviceId(stored),
    version: normalizeOptionalValue(stored.version) ?? DEFAULT_SYNC_VERSION,
  };
};

export const setDesktopSyncSettings = (
  value: DesktopSyncSettingsInput,
): DesktopSyncSettings => {
  const current = readStoredSyncSettings();
  const nextStored: StoredSyncSettings = {
    ...current,
    baseUrl:
      value.baseUrl !== undefined ? normalizeBaseUrl(value.baseUrl) : normalizeBaseUrl(current.baseUrl),
    userId:
      value.userId !== undefined
        ? normalizeOptionalValue(value.userId)
        : normalizeOptionalValue(current.userId),
    worksiteId:
      value.worksiteId !== undefined
        ? normalizeOptionalValue(value.worksiteId)
        : normalizeOptionalValue(current.worksiteId),
    deviceId: normalizeOptionalValue(current.deviceId) ?? createId('device'),
    version: normalizeOptionalValue(current.version) ?? DEFAULT_SYNC_VERSION,
  };

  writeStoredSyncSettings(nextStored);
  return getDesktopSyncSettings();
};

export const clearDesktopSyncSettings = () => {
  if (!canUseLocalStorage()) {
    return getDesktopSyncSettings();
  }

  const current = readStoredSyncSettings();
  const nextStored: StoredSyncSettings = {
    deviceId: normalizeOptionalValue(current.deviceId) ?? createId('device'),
    version: normalizeOptionalValue(current.version) ?? DEFAULT_SYNC_VERSION,
  };
  writeStoredSyncSettings(nextStored);
  return getDesktopSyncSettings();
};

export const getDesktopSyncSettingsErrors = (
  settings: DesktopSyncSettings = getDesktopSyncSettings(),
) => {
  const errors: string[] = [];

  if (!settings.baseUrl) {
    errors.push('Desktop server URL is not set.');
  }

  if (!settings.userId) {
    errors.push('User ID is not set.');
  }

  if (!settings.worksiteId) {
    errors.push('Worksite ID is not set.');
  }

  return errors;
};

export const isDesktopSyncConfigured = (
  settings: DesktopSyncSettings = getDesktopSyncSettings(),
) => getDesktopSyncSettingsErrors(settings).length === 0;

export const getDesktopServerBaseUrl = () => getDesktopSyncSettings().baseUrl;
export const getDesktopSyncUserId = () => getDesktopSyncSettings().userId;
export const getDesktopSyncWorksiteId = () => getDesktopSyncSettings().worksiteId;
export const getDesktopSyncDeviceId = () => getDesktopSyncSettings().deviceId;
export const getDesktopSyncVersion = () => getDesktopSyncSettings().version;
export const SYNC_SETTINGS_CHANGED_EVENT = CONFIG_CHANGED_EVENT;
