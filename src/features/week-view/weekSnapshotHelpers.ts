import type { StoredMobileWeekSnapshot } from '../../contracts/mobileContracts';
import { toLocalDateTimeLabel, toWeekRangeLabel } from '../../lib/dateTime';

export const getWeekSelectorLabel = (snapshot: StoredMobileWeekSnapshot) => {
  const baseLabel = toWeekRangeLabel(
    snapshot.package.weekStartDate,
    snapshot.package.weekEndDate,
  );

  if (snapshot.package.isCurrentWeek) {
    return `${baseLabel} - Current`;
  }

  return baseLabel;
};

export const getSnapshotMetaLabel = (snapshot: StoredMobileWeekSnapshot) =>
  `${snapshot.syncOrigin === 'backend' ? 'Synced' : 'Imported'} ${toLocalDateTimeLabel(
    snapshot.importedToMobileAt,
  )}`;

export const getSnapshotSyncLabel = (snapshot: StoredMobileWeekSnapshot) => {
  if (snapshot.syncOrigin === 'manual') {
    return 'Manual import';
  }

  switch (snapshot.syncStatus) {
    case 'published':
      return 'Published';
    case 'replaced':
      return 'Replaced';
    case 'sync_error':
      return 'Sync error';
    case 'not_published':
    default:
      return 'Backend copy';
  }
};
