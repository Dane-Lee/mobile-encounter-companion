import type { SyncConfig } from './syncConfig';
import type {
  DailyPrioritizationStateSyncRecord,
  MobileCaptureEntrySyncRecord,
  PrioritizationSettingsSyncRecord,
  WeeklySnapshotSyncRecord,
} from './syncContracts';
import {
  validateDailyPrioritizationStateSyncRecord,
  validateMobileCaptureEntrySyncRecord,
  validatePrioritizationSettingsSyncRecord,
  validateWeeklySnapshotSyncRecord,
} from './syncValidators';

const buildHeaders = () => ({
  'Content-Type': 'application/json',
});

const buildUrl = (baseUrl: string, path: string, params?: Record<string, string>) => {
  const url = new URL(path, `${baseUrl}/`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
};

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Sync request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
};

const requestJsonOptional = async <T>(url: string, init?: RequestInit): Promise<T | null> => {
  const response = await fetch(url, init);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Sync request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
};

export const uploadMobileCaptureEntrySyncRecord = async (
  config: SyncConfig,
  record: MobileCaptureEntrySyncRecord,
) => {
  if (!config.apiBaseUrl) {
    throw new Error('Sync base URL is not configured.');
  }

  const response = await requestJson<MobileCaptureEntrySyncRecord>(
    buildUrl(config.apiBaseUrl, 'mobile_capture_entries'),
    {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(record),
    },
  );

  const validationResult = validateMobileCaptureEntrySyncRecord(response);
  if (!validationResult.ok) {
    throw new Error(validationResult.errors.join(' '));
  }

  return validationResult.value;
};

export const fetchWeeklySnapshotSyncRecords = async (config: SyncConfig) => {
  if (!config.apiBaseUrl || !config.userId || !config.worksiteId) {
    throw new Error('Sync config is incomplete.');
  }

  const response = await requestJson<WeeklySnapshotSyncRecord[] | WeeklySnapshotSyncRecord>(
    buildUrl(config.apiBaseUrl, 'weekly_snapshots', {
      user_id: config.userId,
      worksite_id: config.worksiteId,
    }),
    {
      method: 'GET',
      headers: buildHeaders(),
    },
  );

  const records = Array.isArray(response) ? response : [response];
  const validatedRecords = records.map((record) => {
    const validationResult = validateWeeklySnapshotSyncRecord(record);

    if (!validationResult.ok) {
      throw new Error(validationResult.errors.join(' '));
    }

    return validationResult.value;
  });

  return validatedRecords;
};

export const fetchPrioritizationSettingsSyncRecord = async (config: SyncConfig) => {
  if (!config.apiBaseUrl || !config.userId || !config.worksiteId) {
    throw new Error('Sync config is incomplete.');
  }

  const response = await requestJsonOptional<PrioritizationSettingsSyncRecord>(
    buildUrl(config.apiBaseUrl, 'prioritization_settings', {
      user_id: config.userId,
      worksite_id: config.worksiteId,
    }),
    {
      method: 'GET',
      headers: buildHeaders(),
    },
  );

  if (!response) {
    return null;
  }

  const validationResult = validatePrioritizationSettingsSyncRecord(response);
  if (!validationResult.ok) {
    throw new Error(validationResult.errors.join(' '));
  }

  return validationResult.value;
};

export const upsertPrioritizationSettingsSyncRecord = async (
  config: SyncConfig,
  record: PrioritizationSettingsSyncRecord,
) => {
  if (!config.apiBaseUrl) {
    throw new Error('Sync base URL is not configured.');
  }

  const response = await requestJson<PrioritizationSettingsSyncRecord>(
    buildUrl(config.apiBaseUrl, 'prioritization_settings'),
    {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(record),
    },
  );

  const validationResult = validatePrioritizationSettingsSyncRecord(response);
  if (!validationResult.ok) {
    throw new Error(validationResult.errors.join(' '));
  }

  return validationResult.value;
};

export const fetchDailyPrioritizationStateSyncRecord = async (
  config: SyncConfig,
  prioritizationDate: string,
) => {
  if (!config.apiBaseUrl || !config.userId || !config.worksiteId) {
    throw new Error('Sync config is incomplete.');
  }

  const response = await requestJsonOptional<DailyPrioritizationStateSyncRecord>(
    buildUrl(config.apiBaseUrl, 'daily_prioritization_state', {
      user_id: config.userId,
      worksite_id: config.worksiteId,
      date: prioritizationDate,
    }),
    {
      method: 'GET',
      headers: buildHeaders(),
    },
  );

  if (!response) {
    return null;
  }

  const validationResult = validateDailyPrioritizationStateSyncRecord(response);
  if (!validationResult.ok) {
    throw new Error(validationResult.errors.join(' '));
  }

  return validationResult.value;
};

export const upsertDailyPrioritizationStateSyncRecord = async (
  config: SyncConfig,
  record: DailyPrioritizationStateSyncRecord,
) => {
  if (!config.apiBaseUrl) {
    throw new Error('Sync base URL is not configured.');
  }

  const response = await requestJson<DailyPrioritizationStateSyncRecord>(
    buildUrl(config.apiBaseUrl, 'daily_prioritization_state'),
    {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(record),
    },
  );

  const validationResult = validateDailyPrioritizationStateSyncRecord(response);
  if (!validationResult.ok) {
    throw new Error(validationResult.errors.join(' '));
  }

  return validationResult.value;
};
