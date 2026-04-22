import type { SyncConfig } from './syncConfig';
import type {
  DailyPrioritizationStateSyncRecord,
  MobileCaptureEntrySyncRecord,
  PrioritizationSettingsSyncRecord,
  WeeklySnapshotSyncRecord,
} from './syncContracts';
import {
  createMobileCaptureEntry,
  fetchWeeklySnapshots,
  getDailyPrioritizationState,
  getPrioritizationSettings,
  putDailyPrioritizationState,
  putPrioritizationSettings,
} from './api';

const requireScope = (config: SyncConfig) => {
  if (!config.apiBaseUrl || !config.userId || !config.worksiteId) {
    throw new Error('Sync config is incomplete.');
  }

  return {
    userId: config.userId,
    worksiteId: config.worksiteId,
  };
};

const normalizeCaptureSyncResponse = (
  requestRecord: MobileCaptureEntrySyncRecord,
  response: Awaited<ReturnType<typeof createMobileCaptureEntry>>,
): MobileCaptureEntrySyncRecord => ({
  id:
    response.id !== undefined && response.id !== null
      ? String(response.id)
      : requestRecord.id,
  user_id: response.user_id ?? requestRecord.user_id,
  worksite_id: response.worksite_id ?? requestRecord.worksite_id,
  source_app: 'mobile',
  sync_record_type: 'mobile_capture_entry',
  device_id: response.device_id ?? requestRecord.device_id,
  version: response.version ?? requestRecord.version,
  local_mobile_id: response.local_mobile_id ?? requestRecord.local_mobile_id,
  created_at: response.created_at ?? requestRecord.created_at,
  updated_at: response.updated_at ?? requestRecord.updated_at,
  entry_date: response.entry_date ?? requestRecord.entry_date,
  employee_name: response.employee_name ?? requestRecord.employee_name,
  employee_ref: response.employee_ref ?? requestRecord.employee_ref,
  encounter_type: response.encounter_type ?? requestRecord.encounter_type,
  activity_type: response.activity_type ?? requestRecord.activity_type,
  summary_text: response.summary_text ?? requestRecord.summary_text,
  options_json: response.options_json ?? requestRecord.options_json,
  follow_up_flag: response.follow_up_flag ?? requestRecord.follow_up_flag,
  voice_note_text: response.voice_note_text ?? requestRecord.voice_note_text,
  sync_status:
    response.sync_status === 'sync_error' ? 'sync_error' : 'uploaded',
  imported_desktop_record_id: response.imported_desktop_record_id ?? null,
  import_resolution:
    (response.import_resolution as MobileCaptureEntrySyncRecord['import_resolution']) ?? null,
});

const normalizePrioritizationSettingsResponse = (
  config: SyncConfig,
  response: Awaited<ReturnType<typeof getPrioritizationSettings>> | Awaited<ReturnType<typeof putPrioritizationSettings>>,
  fallbackRecord?: PrioritizationSettingsSyncRecord,
): PrioritizationSettingsSyncRecord | null => {
  if (!response) {
    return null;
  }

  return {
    id:
      response.id !== undefined && response.id !== null
        ? String(response.id)
        : fallbackRecord?.id ??
          `prioritization-settings-${config.userId ?? 'unknown'}-${config.worksiteId ?? 'unknown'}`,
    user_id: response.user_id ?? config.userId ?? '',
    worksite_id: response.worksite_id ?? config.worksiteId ?? '',
    source_app: 'mobile',
    sync_record_type: 'prioritization_settings',
    station_risk_map: response.station_risk_map,
    updated_at: response.updated_at,
    version: response.version ?? fallbackRecord?.version ?? config.version,
  };
};

const normalizeDailyPrioritizationResponse = (
  config: SyncConfig,
  prioritizationDate: string,
  response:
    | Awaited<ReturnType<typeof getDailyPrioritizationState>>
    | Awaited<ReturnType<typeof putDailyPrioritizationState>>,
  fallbackRecord?: DailyPrioritizationStateSyncRecord,
): DailyPrioritizationStateSyncRecord | null => {
  if (!response) {
    return null;
  }

  return {
    id:
      response.id !== undefined && response.id !== null
        ? String(response.id)
        : fallbackRecord?.id ??
          `daily-prioritization-state-${config.userId ?? 'unknown'}-${config.worksiteId ?? 'unknown'}-${prioritizationDate}`,
    user_id: response.user_id ?? config.userId ?? '',
    worksite_id: response.worksite_id ?? config.worksiteId ?? '',
    source_app: 'mobile',
    sync_record_type: 'daily_prioritization_state',
    prioritization_date: response.prioritization_date ?? prioritizationDate,
    roster_names: response.roster_names ?? fallbackRecord?.roster_names ?? [],
    item_overrides: response.item_overrides ?? fallbackRecord?.item_overrides ?? [],
    execution_records: response.execution_records ?? fallbackRecord?.execution_records ?? [],
    updated_at: response.updated_at ?? fallbackRecord?.updated_at ?? new Date().toISOString(),
    version: response.version ?? fallbackRecord?.version ?? config.version,
  };
};

export const uploadMobileCaptureEntrySyncRecord = async (
  config: SyncConfig,
  record: MobileCaptureEntrySyncRecord,
) => {
  const response = await createMobileCaptureEntry({
    user_id: record.user_id,
    worksite_id: record.worksite_id,
    local_mobile_id: record.local_mobile_id,
    created_at: record.created_at,
    entry_date: record.entry_date,
    device_id: record.device_id,
    version: record.version,
    employee_name: record.employee_name,
    employee_ref: record.employee_ref,
    encounter_type: record.encounter_type,
    activity_type: record.activity_type,
    summary_text: record.summary_text,
    options_json: record.options_json,
    follow_up_flag: record.follow_up_flag,
    voice_note_text: record.voice_note_text,
  });

  return normalizeCaptureSyncResponse(record, response);
};

export const fetchWeeklySnapshotSyncRecords = async (config: SyncConfig) => {
  const scope = requireScope(config);
  const records = await fetchWeeklySnapshots({
    userId: scope.userId,
    worksiteId: scope.worksiteId,
  });

  return records as WeeklySnapshotSyncRecord[];
};

export const fetchPrioritizationSettingsSyncRecord = async (config: SyncConfig) => {
  const scope = requireScope(config);
  const response = await getPrioritizationSettings({
    userId: scope.userId,
    worksiteId: scope.worksiteId,
  });

  return normalizePrioritizationSettingsResponse(config, response);
};

export const upsertPrioritizationSettingsSyncRecord = async (
  config: SyncConfig,
  record: PrioritizationSettingsSyncRecord,
) => {
  const response = await putPrioritizationSettings({
    user_id: record.user_id,
    worksite_id: record.worksite_id,
    station_risk_map: record.station_risk_map,
    updated_at: record.updated_at,
    version: record.version ?? '1.0.0',
  });

  return normalizePrioritizationSettingsResponse(config, response, record)!;
};

export const fetchDailyPrioritizationStateSyncRecord = async (
  config: SyncConfig,
  prioritizationDate: string,
) => {
  const scope = requireScope(config);
  const response = await getDailyPrioritizationState({
    userId: scope.userId,
    worksiteId: scope.worksiteId,
    prioritizationDate,
  });

  return normalizeDailyPrioritizationResponse(config, prioritizationDate, response);
};

export const upsertDailyPrioritizationStateSyncRecord = async (
  config: SyncConfig,
  record: DailyPrioritizationStateSyncRecord,
) => {
  const response = await putDailyPrioritizationState({
    user_id: record.user_id,
    worksite_id: record.worksite_id,
    prioritization_date: record.prioritization_date,
    roster_names: record.roster_names,
    item_overrides: record.item_overrides,
    execution_records: record.execution_records,
    updated_at: record.updated_at,
    version: record.version ?? '1.0.0',
  });

  return normalizeDailyPrioritizationResponse(
    config,
    record.prioritization_date,
    response,
    record,
  )!;
};
