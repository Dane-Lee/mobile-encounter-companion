import type {
  DailyPrioritizationState,
  PrioritizationSettings,
} from '../../contracts/prioritizationContracts';
import {
  applyDailyPrioritizationStateSyncError,
  applyDailyPrioritizationStateSyncRecord,
  applyPrioritizationSettingsSyncError,
  applyPrioritizationSettingsSyncRecord,
  mapDailyPrioritizationStateToSyncRecord,
  mapPrioritizationSettingsToSyncRecord,
} from '../../sync/syncMappers';
import {
  fetchDailyPrioritizationStateSyncRecord,
  fetchPrioritizationSettingsSyncRecord,
  upsertDailyPrioritizationStateSyncRecord,
  upsertPrioritizationSettingsSyncRecord,
} from '../../sync/syncApi';
import type { SyncConfig } from '../../sync/syncConfig';
import { getSyncConfigErrors } from '../../sync/syncConfig';

const chooseNewerRecord = <T extends { updatedAt: string }>(
  localRecord: T,
  remoteRecord: T,
) => (remoteRecord.updatedAt >= localRecord.updatedAt ? remoteRecord : localRecord);

export const loadPrioritizationSyncData = async ({
  config,
  localSettings,
  localState,
  prioritizationDate,
}: {
  config: SyncConfig;
  localSettings: PrioritizationSettings;
  localState: DailyPrioritizationState;
  prioritizationDate: string;
}) => {
  if (getSyncConfigErrors(config).length > 0) {
    return {
      settings: localSettings,
      state: localState,
      message: 'Backend sync not configured. Prioritization stays local on this device.',
    };
  }

  try {
    const [settingsRecord, dailyStateRecord] = await Promise.all([
      fetchPrioritizationSettingsSyncRecord(config),
      fetchDailyPrioritizationStateSyncRecord(config, prioritizationDate),
    ]);

    const remoteSettings = settingsRecord
      ? applyPrioritizationSettingsSyncRecord(localSettings, settingsRecord)
      : localSettings;
    const remoteState = dailyStateRecord
      ? applyDailyPrioritizationStateSyncRecord(localState, dailyStateRecord)
      : localState;

    return {
      settings: chooseNewerRecord(localSettings, remoteSettings),
      state: chooseNewerRecord(localState, remoteState),
      message: settingsRecord || dailyStateRecord ? 'Prioritization synced from backend.' : null,
    };
  } catch (error) {
    return {
      settings: applyPrioritizationSettingsSyncError(
        localSettings,
        error instanceof Error ? error.message : 'Prioritization sync fetch failed.',
      ),
      state: applyDailyPrioritizationStateSyncError(
        localState,
        error instanceof Error ? error.message : 'Prioritization sync fetch failed.',
      ),
      message:
        error instanceof Error ? error.message : 'Prioritization sync fetch failed.',
    };
  }
};

export const syncPrioritizationSettings = async (
  config: SyncConfig,
  settings: PrioritizationSettings,
) => {
  if (getSyncConfigErrors(config).length > 0) {
    return settings;
  }

  try {
    const syncedRecord = await upsertPrioritizationSettingsSyncRecord(
      config,
      mapPrioritizationSettingsToSyncRecord(settings, config),
    );
    return applyPrioritizationSettingsSyncRecord(settings, syncedRecord);
  } catch (error) {
    return applyPrioritizationSettingsSyncError(
      settings,
      error instanceof Error ? error.message : 'Prioritization settings sync failed.',
    );
  }
};

export const syncDailyPrioritizationState = async (
  config: SyncConfig,
  state: DailyPrioritizationState,
) => {
  if (getSyncConfigErrors(config).length > 0) {
    return state;
  }

  try {
    const syncedRecord = await upsertDailyPrioritizationStateSyncRecord(
      config,
      mapDailyPrioritizationStateToSyncRecord(state, config),
    );
    return applyDailyPrioritizationStateSyncRecord(state, syncedRecord);
  } catch (error) {
    return applyDailyPrioritizationStateSyncError(
      state,
      error instanceof Error ? error.message : 'Daily prioritization state sync failed.',
    );
  }
};

