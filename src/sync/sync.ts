import type {
  DailyPrioritizationState,
  PrioritizationSettings,
} from '../contracts/prioritizationContracts';
import type {
  MobileEncounterCapture,
  StoredMobileWeekSnapshot,
} from '../contracts/mobileContracts';
import { toLocalDateString } from '../lib/dateTime';
import { listCaptureRecordsForDisplay } from '../features/capture/captureService';
import {
  createDailyPrioritizationState,
  createDefaultPrioritizationSettings,
} from '../features/prioritization/prioritizationStateService';
import {
  getDailyPrioritizationStateRecord,
  saveDailyPrioritizationStateRecord,
} from '../storage/dailyPrioritizationStateStore';
import {
  getPrioritizationSettingsRecord,
  savePrioritizationSettingsRecord,
} from '../storage/prioritizationSettingsStore';
import { saveMobileEncounterCaptures } from '../storage/captureStore';
import {
  listStoredWeekSnapshots,
  saveStoredWeekSnapshots,
} from '../storage/weekSnapshotStore';
import { mapWeeklySnapshotSyncRecordToStoredSnapshot } from './syncMappers';
import {
  createMobileCaptureEntry,
  fetchWeeklySnapshots,
  getConfiguredDesktopSyncScope,
  getDailyPrioritizationState,
  getPrioritizationSettings,
  putDailyPrioritizationState,
  putPrioritizationSettings,
} from './api';
import {
  upsertSyncedCaptureEntry,
  saveSyncedDailyPrioritizationState,
  saveSyncedPrioritizationSettings,
  upsertSyncedCaptureEntries,
  upsertSyncedWeeklySnapshots,
} from './db';
import type {
  DailyPrioritizationStateRequest,
  DailyPrioritizationStateResponse,
  MobileCaptureEntryRequest,
  MobileCaptureEntryResponse,
  MobileWeeklySnapshotResponse,
  PrioritizationSettingsRequest,
  PrioritizationSettingsResponse,
  StoredSyncCaptureEntry,
} from './types';

export interface SyncRunSummary {
  snapshots_fetched: number;
  captures_uploaded: number;
  errors: string[];
}

export const FULL_SYNC_COMPLETED_EVENT =
  'daily-encounter-mobile-companion:full-sync-completed';

const getWeekRangeKey = (weekStartDate: string, weekEndDate: string) =>
  `${weekStartDate}:${weekEndDate}`;

const isCaptureUploadEligible = (capture: MobileEncounterCapture) =>
  capture.captureStatus !== 'draft' &&
  capture.captureStatus !== 'archived' &&
  (capture.syncStatus === 'local_only' || capture.syncStatus === 'sync_error');

const getCaptureQueueStatus = (
  capture: MobileEncounterCapture,
): StoredSyncCaptureEntry['sync_status'] => {
  if (capture.syncStatus === 'sync_error') {
    return 'sync_error';
  }

  if (
    capture.syncStatus === 'uploaded' ||
    capture.syncStatus === 'imported_to_desktop' ||
    capture.syncStatus === 'resolved'
  ) {
    return 'uploaded';
  }

  return 'local_only';
};

const buildCaptureOptionsJson = (capture: MobileEncounterCapture) => {
  const options: Record<string, unknown> = {};

  if (capture.tags.length > 0) {
    options.tags = capture.tags;
  }

  if (capture.encounterSubtype) {
    options.encounter_subtype = capture.encounterSubtype;
  }

  if (capture.department) {
    options.department = capture.department;
  }

  if (capture.location) {
    options.location = capture.location;
  }

  if (capture.station) {
    options.station = capture.station;
  }

  if (capture.followUpSuggestedDate) {
    options.follow_up_suggested_date = capture.followUpSuggestedDate;
  }

  return Object.keys(options).length > 0 ? options : null;
};

const mapCaptureToUploadRequest = (
  capture: MobileEncounterCapture,
  scope: { userId: string; worksiteId: string; deviceId: string; version: string },
): MobileCaptureEntryRequest => ({
  user_id: scope.userId,
  worksite_id: scope.worksiteId,
  local_mobile_id: capture.captureId,
  created_at: capture.createdOnDeviceAt,
  entry_date: capture.encounterDate,
  device_id: scope.deviceId,
  version: scope.version,
  employee_name: capture.employeeDisplayName || null,
  employee_ref: capture.employeeId,
  encounter_type: capture.encounterType,
  activity_type: null,
  summary_text: capture.summaryShort,
  options_json: buildCaptureOptionsJson(capture),
  follow_up_flag: capture.followUpNeeded,
  voice_note_text: capture.voiceTranscript,
});

const mapCaptureToStoredSyncEntry = (
  capture: MobileEncounterCapture,
  scope: { userId: string; worksiteId: string; deviceId: string; version: string },
): StoredSyncCaptureEntry => ({
  ...mapCaptureToUploadRequest(capture, scope),
  id: capture.syncRecordId,
  updated_at: capture.syncUpdatedAt ?? capture.updatedOnDeviceAt,
  sync_status: getCaptureQueueStatus(capture),
  sync_error: capture.syncError,
});

const applyCaptureSyncResponse = (
  capture: MobileEncounterCapture,
  response: MobileCaptureEntryResponse,
): MobileEncounterCapture => ({
  ...capture,
  syncStatus: response.sync_status === 'sync_error' ? 'sync_error' : 'uploaded',
  syncError: null,
  syncRecordId:
    response.id !== undefined && response.id !== null
      ? String(response.id)
      : capture.syncRecordId,
  syncUpdatedAt: response.updated_at ?? new Date().toISOString(),
  desktopRecordId: response.imported_desktop_record_id ?? capture.desktopRecordId,
  importResolution:
    (response.import_resolution as MobileEncounterCapture['importResolution']) ??
    capture.importResolution,
});

const applyCaptureSyncFailure = (
  capture: MobileEncounterCapture,
  errorMessage: string,
): MobileEncounterCapture => ({
  ...capture,
  syncStatus: 'sync_error',
  syncError: errorMessage,
  syncUpdatedAt: new Date().toISOString(),
});

const persistSyncedWeekSnapshotsToLocalStore = async (
  records: MobileWeeklySnapshotResponse[],
) => {
  const existingSnapshots = await listStoredWeekSnapshots();
  const fetchedRecordIds = new Set(records.map((record) => record.id));
  const fetchedWeekRangeKeys = new Set(
    records.map((record) => getWeekRangeKey(record.week_start_date, record.week_end_date)),
  );

  const retainedSnapshots = existingSnapshots
    .filter(
      (snapshot) =>
        !(
          snapshot.syncOrigin === 'backend' &&
          snapshot.syncRecordId &&
          fetchedRecordIds.has(snapshot.syncRecordId)
        ),
    )
    .map((snapshot) => {
      if (
        snapshot.syncOrigin === 'backend' &&
        snapshot.syncRecordId &&
        fetchedWeekRangeKeys.has(
          getWeekRangeKey(snapshot.package.weekStartDate, snapshot.package.weekEndDate),
        )
      ) {
        return {
          ...snapshot,
          snapshotStatus: 'superseded' as const,
          syncStatus:
            snapshot.syncStatus === 'sync_error' ? ('sync_error' as const) : ('replaced' as const),
          selectedForDisplay: false,
        };
      }

      return snapshot;
    });

  const mappedSnapshots = records.map((record) =>
    mapWeeklySnapshotSyncRecordToStoredSnapshot(record as never, existingSnapshots),
  );

  const mergedSnapshots: StoredMobileWeekSnapshot[] = [...retainedSnapshots, ...mappedSnapshots];
  await saveStoredWeekSnapshots(mergedSnapshots);
  return mergedSnapshots;
};

const chooseNewerLocalSettings = (
  localSettings: PrioritizationSettings,
  remoteSettings: PrioritizationSettings | null,
) => {
  if (!remoteSettings) {
    return localSettings;
  }

  return remoteSettings.updatedAt >= localSettings.updatedAt ? remoteSettings : localSettings;
};

const chooseNewerDailyState = (
  localState: DailyPrioritizationState,
  remoteState: DailyPrioritizationState | null,
) => {
  if (!remoteState) {
    return localState;
  }

  return remoteState.updatedAt >= localState.updatedAt ? remoteState : localState;
};

const mapRemoteSettingsToLocal = (
  localSettings: PrioritizationSettings,
  response: PrioritizationSettingsResponse,
): PrioritizationSettings => ({
  ...localSettings,
  stationRiskMap: response.station_risk_map,
  updatedAt: response.updated_at,
  syncStatus: 'synced',
  syncError: null,
  syncRecordId:
    response.id !== undefined && response.id !== null
      ? String(response.id)
      : localSettings.syncRecordId,
  syncUpdatedAt: response.updated_at,
});

const mapLocalSettingsToRequest = (
  settings: PrioritizationSettings,
  scope: { userId: string; worksiteId: string; version: string },
): PrioritizationSettingsRequest => ({
  user_id: scope.userId,
  worksite_id: scope.worksiteId,
  station_risk_map: settings.stationRiskMap,
  updated_at: settings.updatedAt,
  version: scope.version,
});

const mapRemoteDailyStateToLocal = (
  localState: DailyPrioritizationState,
  response: DailyPrioritizationStateResponse,
): DailyPrioritizationState => ({
  ...localState,
  prioritizationDate: response.prioritization_date,
  rosterNames: response.roster_names,
  itemOverrides: response.item_overrides.map((override) => ({
    itemId: override.item_id,
    status: override.status,
    notes: override.notes,
    updatedAt: override.updated_at,
  })),
  executionRecords: response.execution_records.map((record) => ({
    executionId: record.execution_id,
    sourcePrioritizationItemId: record.source_prioritization_item_id,
    employeeName: record.employee_name,
    stationName: record.station_name,
    checklistSectionsCompleted: record.checklist_sections_completed,
    recommendedNextStep: record.recommended_next_step as DailyPrioritizationState['executionRecords'][number]['recommendedNextStep'],
    interactionOccurred: record.interaction_occurred,
    readyToRecord: record.ready_to_record,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  })),
  updatedAt: response.updated_at ?? localState.updatedAt,
  syncStatus: 'synced',
  syncError: null,
  syncRecordId:
    response.id !== undefined && response.id !== null
      ? String(response.id)
      : localState.syncRecordId,
  syncUpdatedAt: response.updated_at ?? localState.syncUpdatedAt,
});

const mapLocalDailyStateToRequest = (
  state: DailyPrioritizationState,
  scope: { userId: string; worksiteId: string; version: string },
): DailyPrioritizationStateRequest => ({
  user_id: scope.userId,
  worksite_id: scope.worksiteId,
  prioritization_date: state.prioritizationDate,
  roster_names: state.rosterNames,
  item_overrides: state.itemOverrides.map((override) => ({
    item_id: override.itemId,
    status: override.status,
    notes: override.notes,
    updated_at: override.updatedAt,
  })),
  execution_records: state.executionRecords.map((record) => ({
    execution_id: record.executionId,
    source_prioritization_item_id: record.sourcePrioritizationItemId,
    employee_name: record.employeeName,
    station_name: record.stationName,
    checklist_sections_completed: record.checklistSectionsCompleted,
    recommended_next_step: record.recommendedNextStep,
    interaction_occurred: record.interactionOccurred,
    ready_to_record: record.readyToRecord,
    status: record.status,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  })),
  updated_at: state.updatedAt,
  version: scope.version,
});

export const syncWeeklySnapshots = async () => {
  const { settings, errors } = getConfiguredDesktopSyncScope();
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const records = await fetchWeeklySnapshots({
    userId: settings.userId,
    worksiteId: settings.worksiteId,
  });

  await upsertSyncedWeeklySnapshots(records);
  await persistSyncedWeekSnapshotsToLocalStore(records);

  return records.length;
};

export const uploadPendingCaptures = async () => {
  const { settings, errors } = getConfiguredDesktopSyncScope();
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const captures = await listCaptureRecordsForDisplay();
  const syncEntries = captures.map((capture) =>
    mapCaptureToStoredSyncEntry(capture, {
      userId: settings.userId!,
      worksiteId: settings.worksiteId!,
      deviceId: settings.deviceId,
      version: settings.version,
    }),
  );
  await upsertSyncedCaptureEntries(syncEntries);

  const uploadableCaptures = captures.filter(isCaptureUploadEligible);
  if (uploadableCaptures.length === 0) {
    return { uploadedCount: 0, errors: [] as string[] };
  }

  const updatedCaptures: MobileEncounterCapture[] = [];
  const syncErrors: string[] = [];

  await Promise.all(
    uploadableCaptures.map(async (capture) => {
      const requestBody = mapCaptureToUploadRequest(capture, {
        userId: settings.userId!,
        worksiteId: settings.worksiteId!,
        deviceId: settings.deviceId,
        version: settings.version,
      });

      try {
        const response = await createMobileCaptureEntry(requestBody);
        await upsertSyncedCaptureEntry({
          ...requestBody,
          id: response.id ?? null,
          updated_at: response.updated_at ?? new Date().toISOString(),
          sync_status: response.sync_status === 'sync_error' ? 'sync_error' : 'uploaded',
          sync_error: null,
        });
        updatedCaptures.push(applyCaptureSyncResponse(capture, response));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Capture upload failed.';
        syncErrors.push(errorMessage);
        await upsertSyncedCaptureEntry({
          ...requestBody,
          id: capture.syncRecordId,
          updated_at: new Date().toISOString(),
          sync_status: 'sync_error',
          sync_error: errorMessage,
        });
        updatedCaptures.push(applyCaptureSyncFailure(capture, errorMessage));
      }
    }),
  );

  if (updatedCaptures.length > 0) {
    await saveMobileEncounterCaptures(updatedCaptures);
  }

  return {
    uploadedCount: updatedCaptures.filter((capture) => capture.syncStatus === 'uploaded').length,
    errors: syncErrors,
  };
};

export const syncPrioritizationSettings = async () => {
  const { settings, errors } = getConfiguredDesktopSyncScope();
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const localSettings = (await getPrioritizationSettingsRecord()) ?? createDefaultPrioritizationSettings();
  const remoteSettingsResponse = await getPrioritizationSettings({
    userId: settings.userId,
    worksiteId: settings.worksiteId,
  });

  const remoteSettings = remoteSettingsResponse
    ? mapRemoteSettingsToLocal(localSettings, remoteSettingsResponse)
    : null;

  const mergedLocalSettings = chooseNewerLocalSettings(localSettings, remoteSettings);
  const syncedResponse = await putPrioritizationSettings(
    mapLocalSettingsToRequest(mergedLocalSettings, {
      userId: settings.userId!,
      worksiteId: settings.worksiteId!,
      version: settings.version,
    }),
  );

  const syncedSettings = mapRemoteSettingsToLocal(mergedLocalSettings, syncedResponse);
  await Promise.all([
    savePrioritizationSettingsRecord(syncedSettings),
    saveSyncedPrioritizationSettings({
      ...syncedResponse,
      station_risk_map: syncedResponse.station_risk_map,
    }),
  ]);

  return syncedSettings;
};

export const syncDailyPrioritizationState = async (
  prioritizationDate: string = toLocalDateString(new Date()),
) => {
  const { settings, errors } = getConfiguredDesktopSyncScope();
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const localState =
    (await getDailyPrioritizationStateRecord(prioritizationDate)) ??
    createDailyPrioritizationState(prioritizationDate);
  const remoteStateResponse = await getDailyPrioritizationState({
    userId: settings.userId,
    worksiteId: settings.worksiteId,
    prioritizationDate,
  });

  const remoteState = remoteStateResponse
    ? mapRemoteDailyStateToLocal(localState, remoteStateResponse)
    : null;
  const mergedLocalState = chooseNewerDailyState(localState, remoteState);
  const syncedResponse = await putDailyPrioritizationState(
    mapLocalDailyStateToRequest(mergedLocalState, {
      userId: settings.userId!,
      worksiteId: settings.worksiteId!,
      version: settings.version,
    }),
  );

  const syncedState = mapRemoteDailyStateToLocal(mergedLocalState, syncedResponse);
  await Promise.all([
    saveDailyPrioritizationStateRecord(syncedState),
    saveSyncedDailyPrioritizationState(syncedResponse),
  ]);

  return syncedState;
};

export const runFullSync = async (): Promise<SyncRunSummary> => {
  const summary: SyncRunSummary = {
    snapshots_fetched: 0,
    captures_uploaded: 0,
    errors: [],
  };

  try {
    summary.snapshots_fetched = await syncWeeklySnapshots();
  } catch (error) {
    summary.errors.push(error instanceof Error ? error.message : 'Weekly snapshot sync failed.');
  }

  try {
    const captureResult = await uploadPendingCaptures();
    summary.captures_uploaded = captureResult.uploadedCount;
    summary.errors.push(...captureResult.errors);
  } catch (error) {
    summary.errors.push(error instanceof Error ? error.message : 'Capture upload failed.');
  }

  try {
    await syncPrioritizationSettings();
  } catch (error) {
    summary.errors.push(
      error instanceof Error ? error.message : 'Prioritization settings sync failed.',
    );
  }

  try {
    await syncDailyPrioritizationState();
  } catch (error) {
    summary.errors.push(
      error instanceof Error ? error.message : 'Daily prioritization sync failed.',
    );
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<SyncRunSummary>(FULL_SYNC_COMPLETED_EVENT, {
        detail: summary,
      }),
    );
  }

  return summary;
};
