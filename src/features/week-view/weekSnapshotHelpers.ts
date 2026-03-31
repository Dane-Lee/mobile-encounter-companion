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
  `Imported ${toLocalDateTimeLabel(snapshot.importedToMobileAt)} - ${snapshot.package.timezone}`;
