import type { StoredMobileWeekSnapshot } from '../../contracts/mobileContracts';
import { saveStoredWeekSnapshots } from '../../storage/weekSnapshotStore';
import { fetchWeeklySnapshotSyncRecords } from '../../sync/syncApi';
import { getSyncConfig, getSyncConfigErrors } from '../../sync/syncConfig';
import { mapWeeklySnapshotSyncRecordToStoredSnapshot } from '../../sync/syncMappers';
import type { WeeklySnapshotSyncRecord } from '../../sync/syncContracts';
import {
  listWeekSnapshotsForDisplay,
  sortWeekSnapshotsForDisplay,
} from './weekSnapshotService';

export interface RefreshWeeklySnapshotsResult {
  fetchedCount: number;
  publishedCount: number;
  replacedCount: number;
  syncErrorCount: number;
  updatedSnapshots: StoredMobileWeekSnapshot[];
}

const getWeekRangeKey = (weekStartDate: string, weekEndDate: string) =>
  `${weekStartDate}:${weekEndDate}`;

const isSelectableSnapshot = (snapshot: StoredMobileWeekSnapshot) =>
  snapshot.snapshotStatus !== 'archived' &&
  !(snapshot.syncOrigin === 'backend' && snapshot.syncStatus === 'replaced');

const resolveSelectedSnapshotId = (
  existingSnapshots: StoredMobileWeekSnapshot[],
  mergedSnapshots: StoredMobileWeekSnapshot[],
) => {
  const existingSelectedSnapshot = existingSnapshots.find(
    (snapshot) => snapshot.selectedForDisplay && isSelectableSnapshot(snapshot),
  );

  if (
    existingSelectedSnapshot &&
    mergedSnapshots.some(
      (snapshot) =>
        snapshot.localWeekSnapshotId === existingSelectedSnapshot.localWeekSnapshotId &&
        isSelectableSnapshot(snapshot),
    )
  ) {
    return existingSelectedSnapshot.localWeekSnapshotId;
  }

  const orderedSnapshots = sortWeekSnapshotsForDisplay(mergedSnapshots).filter(isSelectableSnapshot);

  return (
    orderedSnapshots.find(
      (snapshot) =>
        snapshot.syncOrigin === 'backend' &&
        snapshot.syncStatus === 'published' &&
        snapshot.package.isCurrentWeek,
    )?.localWeekSnapshotId ??
    orderedSnapshots.find(
      (snapshot) => snapshot.package.isCurrentWeek && snapshot.snapshotStatus === 'current',
    )?.localWeekSnapshotId ??
    orderedSnapshots.find(
      (snapshot) => snapshot.syncOrigin === 'backend' && snapshot.syncStatus === 'published',
    )?.localWeekSnapshotId ??
    orderedSnapshots[0]?.localWeekSnapshotId ??
    null
  );
};

const assertRecordOwnership = (
  record: WeeklySnapshotSyncRecord,
  userId: string,
  worksiteId: string,
) => {
  if (record.user_id !== userId || record.worksite_id !== worksiteId) {
    throw new Error('Weekly snapshot ownership does not match the configured mobile user/worksite.');
  }
};

export const refreshWeeklySnapshotsFromSync = async (): Promise<RefreshWeeklySnapshotsResult> => {
  const config = getSyncConfig();
  const configErrors = getSyncConfigErrors(config);

  if (configErrors.length > 0) {
    throw new Error(configErrors.join(' '));
  }

  const records = await fetchWeeklySnapshotSyncRecords(config);

  if (records.length === 0) {
    return {
      fetchedCount: 0,
      publishedCount: 0,
      replacedCount: 0,
      syncErrorCount: 0,
      updatedSnapshots: await listWeekSnapshotsForDisplay(),
    };
  }

  records.forEach((record) => assertRecordOwnership(record, config.userId!, config.worksiteId!));

  const existingSnapshots = await listWeekSnapshotsForDisplay();
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
    mapWeeklySnapshotSyncRecordToStoredSnapshot(record, existingSnapshots),
  );
  const mergedSnapshots = [...retainedSnapshots, ...mappedSnapshots];
  const selectedSnapshotId = resolveSelectedSnapshotId(existingSnapshots, mergedSnapshots);
  const snapshotsToSave = mergedSnapshots.map((snapshot) => ({
    ...snapshot,
    selectedForDisplay:
      selectedSnapshotId !== null && snapshot.localWeekSnapshotId === selectedSnapshotId,
  }));

  await saveStoredWeekSnapshots(snapshotsToSave);

  return {
    fetchedCount: records.length,
    publishedCount: records.filter((record) => record.sync_status === 'published').length,
    replacedCount: records.filter((record) => record.sync_status === 'replaced').length,
    syncErrorCount: records.filter((record) => record.sync_status === 'sync_error').length,
    updatedSnapshots: sortWeekSnapshotsForDisplay(snapshotsToSave),
  };
};
