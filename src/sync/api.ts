import {
  getDesktopServerBaseUrl,
  getDesktopSyncDeviceId,
  getDesktopSyncSettings,
  getDesktopSyncSettingsErrors,
  getDesktopSyncUserId,
  getDesktopSyncVersion,
  getDesktopSyncWorksiteId,
} from './config';
import type {
  DailyPrioritizationStateRequest,
  DailyPrioritizationStateResponse,
  MobileCaptureEntryRequest,
  MobileCaptureEntryResponse,
  MobileWeeklySnapshotResponse,
  PrioritizationSettingsRequest,
  PrioritizationSettingsResponse,
} from './types';

interface SyncScopeParams {
  userId?: string | null;
  worksiteId?: string | null;
}

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

const buildSyncUrl = (baseUrl: string, path: string, params?: Record<string, string>) => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const syncBaseUrl = /\/api\/sync$/i.test(normalizedBaseUrl)
    ? normalizedBaseUrl
    : /\/api$/i.test(normalizedBaseUrl)
      ? `${normalizedBaseUrl}/sync`
      : `${normalizedBaseUrl}/api/sync`;

  return buildUrl(syncBaseUrl, path, params);
};

const readErrorBody = async (response: Response) => {
  try {
    const text = await response.text();
    return text.trim();
  } catch {
    return '';
  }
};

const requestJson = async <T>(
  url: string,
  init?: RequestInit,
  options?: { allowNotFound?: boolean },
): Promise<T | null> => {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not reach desktop server. ${error.message}`
        : 'Could not reach desktop server.',
    );
  }

  if (options?.allowNotFound && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorBody = await readErrorBody(response);
    throw new Error(
      errorBody
        ? `Desktop sync request failed with ${response.status}: ${errorBody}`
        : `Desktop sync request failed with ${response.status}.`,
    );
  }

  return (await response.json()) as T;
};

const requireConfiguredBaseUrl = () => {
  const baseUrl = getDesktopServerBaseUrl();
  if (!baseUrl) {
    throw new Error('Desktop server URL is not configured.');
  }

  return baseUrl;
};

const resolveSyncScope = (params?: SyncScopeParams) => {
  const userId = params?.userId ?? getDesktopSyncUserId();
  const worksiteId = params?.worksiteId ?? getDesktopSyncWorksiteId();

  if (!userId || !worksiteId) {
    throw new Error('User ID and worksite ID must be configured for desktop sync.');
  }

  return { userId, worksiteId };
};

const withCaptureDefaults = (
  value: MobileCaptureEntryRequest,
): MobileCaptureEntryRequest => ({
  ...value,
  source_app: value.source_app ?? 'mobile',
  sync_record_type: value.sync_record_type ?? 'mobile_capture_entry',
  device_id: value.device_id ?? getDesktopSyncDeviceId(),
  version: value.version ?? getDesktopSyncVersion(),
});

const withPrioritizationSettingsDefaults = (
  value: PrioritizationSettingsRequest,
): PrioritizationSettingsRequest => ({
  ...value,
  version: value.version || getDesktopSyncVersion(),
});

const withDailyPrioritizationStateDefaults = (
  value: DailyPrioritizationStateRequest,
): DailyPrioritizationStateRequest => ({
  ...value,
  updated_at: value.updated_at ?? new Date().toISOString(),
  version: value.version ?? getDesktopSyncVersion(),
});

export const fetchWeeklySnapshots = async (params?: SyncScopeParams) => {
  const baseUrl = requireConfiguredBaseUrl();
  const { userId, worksiteId } = resolveSyncScope(params);
  const response = await requestJson<MobileWeeklySnapshotResponse[]>(
    buildSyncUrl(baseUrl, 'weekly_snapshots', {
      user_id: userId,
      worksite_id: worksiteId,
    }),
    {
      method: 'GET',
      headers: buildHeaders(),
    },
  );

  return response ?? [];
};

export const createMobileCaptureEntry = async (value: MobileCaptureEntryRequest) => {
  const baseUrl = requireConfiguredBaseUrl();
  const response = await requestJson<MobileCaptureEntryResponse>(
    buildSyncUrl(baseUrl, 'mobile_capture_entries'),
    {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(withCaptureDefaults(value)),
    },
  );

  if (!response) {
    throw new Error('Desktop server returned an empty capture sync response.');
  }

  return response;
};

export const getPrioritizationSettings = async (params?: SyncScopeParams) => {
  const baseUrl = requireConfiguredBaseUrl();
  const { userId, worksiteId } = resolveSyncScope(params);

  // Server returns { settings: PrioritizationSettingsResponse | null }
  const envelope = await requestJson<{ settings: PrioritizationSettingsResponse | null }>(
    buildSyncUrl(baseUrl, 'prioritization_settings', {
      user_id: userId,
      worksite_id: worksiteId,
    }),
    {
      method: 'GET',
      headers: buildHeaders(),
    },
    { allowNotFound: true },
  );

  return envelope?.settings ?? null;
};

export const putPrioritizationSettings = async (value: PrioritizationSettingsRequest) => {
  const baseUrl = requireConfiguredBaseUrl();

  // Server returns { settings: PrioritizationSettingsResponse }
  const envelope = await requestJson<{ settings: PrioritizationSettingsResponse }>(
    buildSyncUrl(baseUrl, 'prioritization_settings'),
    {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(withPrioritizationSettingsDefaults(value)),
    },
  );

  if (!envelope?.settings) {
    throw new Error('Desktop server returned an empty prioritization settings response.');
  }

  return envelope.settings;
};

export const getDailyPrioritizationState = async (params: {
  prioritizationDate: string;
  userId?: string | null;
  worksiteId?: string | null;
}) => {
  const baseUrl = requireConfiguredBaseUrl();
  const { userId, worksiteId } = resolveSyncScope(params);

  // Server returns { state: DailyPrioritizationStateResponse | null }
  const envelope = await requestJson<{ state: DailyPrioritizationStateResponse | null }>(
    buildSyncUrl(baseUrl, 'daily_prioritization_state', {
      user_id: userId,
      worksite_id: worksiteId,
      prioritization_date: params.prioritizationDate,
    }),
    {
      method: 'GET',
      headers: buildHeaders(),
    },
    { allowNotFound: true },
  );

  return envelope?.state ?? null;
};

export const putDailyPrioritizationState = async (
  value: DailyPrioritizationStateRequest,
) => {
  const baseUrl = requireConfiguredBaseUrl();

  // Server returns { state: DailyPrioritizationStateResponse }
  const envelope = await requestJson<{ state: DailyPrioritizationStateResponse }>(
    buildSyncUrl(baseUrl, 'daily_prioritization_state'),
    {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(withDailyPrioritizationStateDefaults(value)),
    },
  );

  if (!envelope?.state) {
    throw new Error('Desktop server returned an empty daily prioritization response.');
  }

  return envelope.state;
};

export const getConfiguredDesktopSyncScope = () => {
  const settings = getDesktopSyncSettings();
  const errors = getDesktopSyncSettingsErrors(settings);

  return {
    settings,
    errors,
    isConfigured: errors.length === 0,
  };
};
