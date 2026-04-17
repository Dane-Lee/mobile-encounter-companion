import { useMemo } from 'react';
import type {
  MobileCaptureSyncStatus,
  MobileEncounterCapture,
  StoredMobileWeekSnapshot,
  WeeklySnapshotSyncStatus,
} from '../contracts/mobileContracts';
import { getSyncConfig, getSyncConfigErrors, isSyncConfigured } from './syncConfig';

interface CountByStatus<T extends string> {
  counts: Record<T, number>;
}

export interface CaptureSyncSummary extends CountByStatus<MobileCaptureSyncStatus> {
  uploadableCount: number;
}

export interface WeeklySnapshotSyncSummary extends CountByStatus<WeeklySnapshotSyncStatus> {
  backendCount: number;
  manualCount: number;
}

const createCountRecord = <T extends string>(statuses: readonly T[]) =>
  statuses.reduce(
    (accumulator, status) => ({
      ...accumulator,
      [status]: 0,
    }),
    {} as Record<T, number>,
  );

export const useMobileSyncStatus = (
  captures: MobileEncounterCapture[],
  snapshots: StoredMobileWeekSnapshot[],
) => {
  const config = useMemo(() => getSyncConfig(), []);
  const configErrors = useMemo(() => getSyncConfigErrors(config), [config]);

  const captureSummary = useMemo<CaptureSyncSummary>(() => {
    const counts = createCountRecord([
      'local_only',
      'uploaded',
      'imported_to_desktop',
      'resolved',
      'sync_error',
    ] as const);

    captures.forEach((capture) => {
      counts[capture.syncStatus] += 1;
    });

    return {
      counts,
      uploadableCount: captures.filter(
        (capture) =>
          capture.captureStatus !== 'draft' &&
          capture.captureStatus !== 'archived' &&
          (capture.syncStatus === 'local_only' || capture.syncStatus === 'sync_error'),
      ).length,
    };
  }, [captures]);

  const weeklySnapshotSummary = useMemo<WeeklySnapshotSyncSummary>(() => {
    const counts = createCountRecord([
      'not_published',
      'published',
      'replaced',
      'sync_error',
    ] as const);

    snapshots.forEach((snapshot) => {
      counts[snapshot.syncStatus] += 1;
    });

    return {
      counts,
      backendCount: snapshots.filter((snapshot) => snapshot.syncOrigin === 'backend').length,
      manualCount: snapshots.filter((snapshot) => snapshot.syncOrigin === 'manual').length,
    };
  }, [snapshots]);

  return {
    config,
    configErrors,
    isConfigured: isSyncConfigured(config),
    captureSummary,
    weeklySnapshotSummary,
  };
};
