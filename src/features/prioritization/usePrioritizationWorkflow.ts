import { useEffect, useMemo, useState } from 'react';
import type { CaptureOptionLists } from '../../config/siteCaptureOptions';
import type { MobileEncounterCapture } from '../../contracts/mobileContracts';
import { normalizeDailyPrioritizationStateRecordIds } from '../../contracts/prioritizationIds';
import { getPrioritizationSettingsRecord, savePrioritizationSettingsRecord } from '../../storage/prioritizationSettingsStore';
import { getDailyPrioritizationStateRecord, saveDailyPrioritizationStateRecord } from '../../storage/dailyPrioritizationStateStore';
import { type SyncConfig, getSyncConfigErrors } from '../../sync/syncConfig';
import { FULL_SYNC_COMPLETED_EVENT } from '../../sync/sync';
import { toLocalDateString } from '../../lib/dateTime';
import { createId } from '../../lib/id';
import { groupPrioritizationItemsByBucket, getExecutionRecordForItem, getPrototypeSummary } from './prioritizationHelpers';
import { createCapturePrefillFromPrioritizationItem, derivePrioritizationItems } from './prioritizationDerivation';
import {
  createDailyPrioritizationState,
  createDefaultPrioritizationSettings,
  parseRosterText,
  withExecutionRecord,
  withExecutionStatusMirrored,
  withItemOverride,
  withUpdatedRoster,
  withUpdatedStationRiskMap,
} from './prioritizationStateService';
import {
  loadPrioritizationSyncData,
  syncDailyPrioritizationState,
  syncPrioritizationSettings,
} from './prioritizationSyncService';
import type {
  CapturePrefillRequest,
  PrioritizationExecutionRecord,
  PrioritizationSettings,
  PrioritizationStatus,
  StationRiskLevel,
} from './types';

type Notice = { tone: 'success' | 'error' | 'info'; message: string } | null;

interface UsePrioritizationWorkflowProps {
  captures: MobileEncounterCapture[];
  captureOptions: CaptureOptionLists;
  syncConfig: SyncConfig;
}

const createExecutionRecordFromItem = (
  item: ReturnType<typeof derivePrioritizationItems>['items'][number],
): PrioritizationExecutionRecord => {
  const timestamp = new Date().toISOString();

  return {
    executionId: createId('execution'),
    sourcePrioritizationItemId: item.id,
    employeeName: item.employeeName,
    stationName: item.stationName,
    checklistSectionsCompleted: [],
    recommendedNextStep: item.relatedEncounterType,
    interactionOccurred: false,
    readyToRecord: false,
    status: 'open',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const usePrioritizationWorkflow = ({
  captures,
  captureOptions,
  syncConfig,
}: UsePrioritizationWorkflowProps) => {
  const prioritizationDate = toLocalDateString(new Date());
  const [settings, setSettings] = useState<PrioritizationSettings>(() =>
    createDefaultPrioritizationSettings(),
  );
  const [dailyState, setDailyState] = useState(() =>
    createDailyPrioritizationState(prioritizationDate),
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const syncConfigured = useMemo(
    () => getSyncConfigErrors(syncConfig).length === 0,
    [syncConfig],
  );

  const derivedState = useMemo(
    () =>
      derivePrioritizationItems({
        captures,
        captureOptions,
        prioritizationDate,
        settings,
        state: dailyState,
      }),
    [captures, captureOptions, dailyState, prioritizationDate, settings],
  );

  const selectedItem = derivedState.items.find((item) => item.id === selectedItemId) ?? null;
  const selectedExecutionRecord = selectedItem
    ? getExecutionRecordForItem(dailyState.executionRecords, selectedItem.id)
    : null;

  const persistSettings = async (
    nextSettings: PrioritizationSettings,
    successMessage?: string,
  ) => {
    setSettings(nextSettings);
    await savePrioritizationSettingsRecord(nextSettings);
    const syncedSettings = await syncPrioritizationSettings(syncConfig, nextSettings);
    await savePrioritizationSettingsRecord(syncedSettings);
    setSettings(syncedSettings);
    if (successMessage) {
      setNotice({ tone: 'success', message: successMessage });
    }
    return syncedSettings;
  };

  const persistDailyState = async (
    nextState: typeof dailyState,
    successMessage?: string,
  ) => {
    const normalizedState = normalizeDailyPrioritizationStateRecordIds(nextState);
    setDailyState(normalizedState);
    await saveDailyPrioritizationStateRecord(normalizedState);
    const syncedState = await syncDailyPrioritizationState(syncConfig, normalizedState);
    await saveDailyPrioritizationStateRecord(syncedState);
    setDailyState(syncedState);
    if (successMessage) {
      setNotice({ tone: 'success', message: successMessage });
    }
    return syncedState;
  };

  const loadWorkflow = async (showNotice = false) => {
    setIsLoading(true);

    try {
      const [storedSettings, storedDailyState] = await Promise.all([
        getPrioritizationSettingsRecord(),
        getDailyPrioritizationStateRecord(prioritizationDate),
      ]);

      const localSettings = storedSettings ?? createDefaultPrioritizationSettings();
      const localDailyState = normalizeDailyPrioritizationStateRecordIds(
        storedDailyState ?? createDailyPrioritizationState(prioritizationDate),
      );
      const syncedData = await loadPrioritizationSyncData({
        config: syncConfig,
        localSettings,
        localState: localDailyState,
        prioritizationDate,
      });

      setSettings(syncedData.settings);
      setDailyState(syncedData.state);

      await Promise.all([
        savePrioritizationSettingsRecord(syncedData.settings),
        saveDailyPrioritizationStateRecord(syncedData.state),
      ]);

      if (showNotice && syncedData.message) {
        setNotice({ tone: 'info', message: syncedData.message });
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Prioritization failed to load.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkflow();
  }, [prioritizationDate]);

  useEffect(() => {
    const handleFullSyncCompleted = () => {
      void loadWorkflow();
    };

    window.addEventListener(FULL_SYNC_COMPLETED_EVENT, handleFullSyncCompleted);

    return () => {
      window.removeEventListener(FULL_SYNC_COMPLETED_EVENT, handleFullSyncCompleted);
    };
  }, [prioritizationDate]);

  useEffect(() => {
    if (selectedItemId && !selectedItem) {
      setSelectedItemId(null);
    }
  }, [selectedItem, selectedItemId]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), 4_000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const runBusyAction = async (
    action: () => Promise<void>,
    fallbackErrorMessage: string,
  ) => {
    setIsBusy(true);

    try {
      await action();
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : fallbackErrorMessage,
      });
    } finally {
      setIsBusy(false);
    }
  };

  return {
    prioritizationDate,
    notice,
    isLoading,
    isBusy,
    syncConfigured,
    syncErrors: getSyncConfigErrors(syncConfig),
    settings,
    dailyState,
    usedPrototypeFallback: derivedState.usedPrototypeFallback,
    items: derivedState.items,
    executionRecords: dailyState.executionRecords,
    bucketGroups: groupPrioritizationItemsByBucket(derivedState.items),
    summary: getPrototypeSummary(derivedState.items, dailyState.executionRecords),
    selectedItem,
    selectedExecutionRecord,
    openItem: (itemId: string) => setSelectedItemId(itemId),
    closeItem: () => setSelectedItemId(null),
    refreshList: () =>
      runBusyAction(
        async () => {
          await loadWorkflow(true);
        },
        'Prioritization refresh failed.',
      ),
    saveRosterText: (value: string) =>
      runBusyAction(
        async () => {
          await persistDailyState(
            withUpdatedRoster(dailyState, parseRosterText(value)),
            'Daily roster saved.',
          );
        },
        'Daily roster could not be saved.',
      ),
    saveStationRiskMap: (stationRiskMap: Record<string, StationRiskLevel | null | ''>) =>
      runBusyAction(
        async () => {
          await persistSettings(
            withUpdatedStationRiskMap(settings, stationRiskMap),
            'Station risk settings saved.',
          );
        },
        'Station risk settings could not be saved.',
      ),
    updateItemStatus: (itemId: string, status: PrioritizationStatus) =>
      runBusyAction(
        async () => {
          await persistDailyState(
            withItemOverride(dailyState, itemId, { status }),
            'Prioritization item updated.',
          );
        },
        'Prioritization item status could not be updated.',
      ),
    updateItemNotes: (itemId: string, notes: string) =>
      runBusyAction(
        async () => {
          await persistDailyState(
            withItemOverride(dailyState, itemId, { notes }),
            'Prioritization notes saved.',
          );
        },
        'Prioritization notes could not be saved.',
      ),
    createExecutionRecord: (itemId: string) =>
      runBusyAction(
        async () => {
          const item = derivedState.items.find((candidate) => candidate.id === itemId);
          if (!item) {
            throw new Error('Prioritization item not found.');
          }

          const existingRecord = getExecutionRecordForItem(dailyState.executionRecords, itemId);
          if (existingRecord) {
            return;
          }

          const nextRecord = createExecutionRecordFromItem(item);
          const nextState = withExecutionStatusMirrored(
            withExecutionRecord(dailyState, nextRecord),
            itemId,
            'in_progress',
          );

          await persistDailyState(nextState, 'Execution record created.');
        },
        'Execution record could not be created.',
      ),
    updateExecutionRecord: (
      executionId: string,
      updates: Partial<
        Pick<
          PrioritizationExecutionRecord,
          'recommendedNextStep' | 'interactionOccurred' | 'readyToRecord' | 'status'
        >
      >,
    ) =>
      runBusyAction(
        async () => {
          const currentRecord = dailyState.executionRecords.find(
            (record) => record.executionId === executionId,
          );
          if (!currentRecord) {
            throw new Error('Execution record not found.');
          }

          const nextRecord: PrioritizationExecutionRecord = {
            ...currentRecord,
            ...updates,
            updatedAt: new Date().toISOString(),
          };

          const nextState = withExecutionStatusMirrored(
            withExecutionRecord(dailyState, nextRecord),
            nextRecord.sourcePrioritizationItemId,
            nextRecord.status,
          );

          await persistDailyState(nextState, 'Execution record updated.');
        },
        'Execution record could not be updated.',
      ),
    toggleExecutionChecklistSection: (executionId: string, section: string) =>
      runBusyAction(
        async () => {
          const currentRecord = dailyState.executionRecords.find(
            (record) => record.executionId === executionId,
          );
          if (!currentRecord) {
            throw new Error('Execution record not found.');
          }

          const nextRecord: PrioritizationExecutionRecord = {
            ...currentRecord,
            checklistSectionsCompleted: currentRecord.checklistSectionsCompleted.includes(section)
              ? currentRecord.checklistSectionsCompleted.filter((value) => value !== section)
              : [...currentRecord.checklistSectionsCompleted, section],
            updatedAt: new Date().toISOString(),
          };

          await persistDailyState(
            withExecutionRecord(dailyState, nextRecord),
            'Execution checklist updated.',
          );
        },
        'Execution checklist could not be updated.',
      ),
    createCapturePrefillRequest: (itemId: string): CapturePrefillRequest | null => {
      const item = derivedState.items.find((candidate) => candidate.id === itemId);
      return item ? createCapturePrefillFromPrioritizationItem(item) : null;
    },
  };
};
