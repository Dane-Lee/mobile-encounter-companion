import type {
  MobileWeekSnapshotPackage,
  StoredMobileWeekSnapshot,
} from '../../contracts/mobileContracts';
import { normalizeEncounterType } from '../../contracts/encounterTypes';
import { validateMobileWeekSnapshotPackage } from '../../contracts/validators';
import { withStoredWeekSnapshotSyncDefaults } from '../../sync/syncMappers';
import {
  listStoredWeekSnapshots,
  saveStoredWeekSnapshots,
} from '../../storage/weekSnapshotStore';

const readFileText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const isSameWeekRange = (
  left: MobileWeekSnapshotPackage,
  right: MobileWeekSnapshotPackage,
) =>
  left.weekStartDate === right.weekStartDate && left.weekEndDate === right.weekEndDate;

const normalizeImportedWeekSnapshotValue = (value: unknown) => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('days' in value) ||
    !Array.isArray((value as { days?: unknown }).days)
  ) {
    return value;
  }

  return normalizeWeekSnapshotPackageEncounterTypes(value as MobileWeekSnapshotPackage);
};

const normalizeWeekSnapshotPackageEncounterTypes = (
  weekSnapshotPackage: MobileWeekSnapshotPackage,
): MobileWeekSnapshotPackage => {
  let didChange = false;

  const days = weekSnapshotPackage.days.map((day) => {
    const completedEncounterItems = day.completedEncounterItems.map((item) => {
      const normalizedEncounterType = normalizeEncounterType(item.encounterType);

      if (!normalizedEncounterType || normalizedEncounterType === item.encounterType) {
        return item;
      }

      didChange = true;
      return {
        ...item,
        encounterType: normalizedEncounterType,
      };
    });

    const dayDidChange = completedEncounterItems.some(
      (item, index) => item !== day.completedEncounterItems[index],
    );

    return dayDidChange
      ? {
          ...day,
          completedEncounterItems,
        }
      : day;
  });

  return didChange
    ? {
        ...weekSnapshotPackage,
        days,
      }
    : weekSnapshotPackage;
};

const normalizeStoredWeekSnapshot = (snapshot: StoredMobileWeekSnapshot) => {
  const snapshotWithSyncDefaults = withStoredWeekSnapshotSyncDefaults(snapshot);
  const normalizedPackage = normalizeWeekSnapshotPackageEncounterTypes(snapshotWithSyncDefaults.package);

  return normalizedPackage === snapshotWithSyncDefaults.package && snapshotWithSyncDefaults === snapshot
    ? snapshot
    : {
        ...snapshotWithSyncDefaults,
        package: normalizedPackage,
      };
};

const normalizeStoredWeekSnapshots = async (snapshots: StoredMobileWeekSnapshot[]) => {
  const normalizedSnapshots = snapshots.map(normalizeStoredWeekSnapshot);
  const hasChanges = normalizedSnapshots.some((snapshot, index) => snapshot !== snapshots[index]);

  if (hasChanges) {
    await saveStoredWeekSnapshots(normalizedSnapshots);
  }

  return normalizedSnapshots;
};

export const sortWeekSnapshotsForDisplay = (snapshots: StoredMobileWeekSnapshot[]) =>
  [...snapshots].sort((left, right) => {
    if (left.selectedForDisplay !== right.selectedForDisplay) {
      return left.selectedForDisplay ? -1 : 1;
    }

    if (left.package.isCurrentWeek !== right.package.isCurrentWeek) {
      return left.package.isCurrentWeek ? -1 : 1;
    }

    if (left.package.weekStartDate !== right.package.weekStartDate) {
      return right.package.weekStartDate.localeCompare(left.package.weekStartDate);
    }

    return right.importedToMobileAt.localeCompare(left.importedToMobileAt);
  });

export const listWeekSnapshotsForDisplay = async () =>
  sortWeekSnapshotsForDisplay(
    await normalizeStoredWeekSnapshots(await listStoredWeekSnapshots()),
  );

export const getActiveWeekSnapshot = (snapshots: StoredMobileWeekSnapshot[]) => {
  const orderedSnapshots = sortWeekSnapshotsForDisplay(snapshots);

  return (
    orderedSnapshots.find((snapshot) => snapshot.selectedForDisplay) ??
    orderedSnapshots.find(
      (snapshot) => snapshot.package.isCurrentWeek && snapshot.snapshotStatus === 'current',
    ) ??
    orderedSnapshots[0] ??
    null
  );
};

export const parseWeekSnapshotImportFile = async (file: File) => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(await readFileText(file)) as unknown;
  } catch {
    throw new Error(`${file.name} is not valid JSON.`);
  }

  const normalizedPackage = normalizeImportedWeekSnapshotValue(parsed);
  const validationResult = validateMobileWeekSnapshotPackage(normalizedPackage);
  if (!validationResult.ok) {
    throw new Error(validationResult.errors.join(' '));
  }

  return validationResult.value;
};

export const importValidatedWeekSnapshotPackage = async (
  weekSnapshotPackage: MobileWeekSnapshotPackage,
) => {
  const existingSnapshots = await normalizeStoredWeekSnapshots(await listStoredWeekSnapshots());
  const importedToMobileAt = new Date().toISOString();
  const normalizedPackage = normalizeWeekSnapshotPackageEncounterTypes(weekSnapshotPackage);
  const localWeekSnapshotId = `local-${normalizedPackage.packageId}`;
  const replacingExisting = existingSnapshots.find(
    (snapshot) => snapshot.localWeekSnapshotId === localWeekSnapshotId,
  );
  const hasSelectedWeek = existingSnapshots.some(
    (snapshot) => snapshot.selectedForDisplay && snapshot.snapshotStatus !== 'archived',
  );

  const updatedExistingSnapshots = existingSnapshots
    .filter((snapshot) => snapshot.localWeekSnapshotId !== localWeekSnapshotId)
    .map((snapshot) => {
      const sameWeek = isSameWeekRange(snapshot.package, normalizedPackage);

      return {
        ...snapshot,
        // snapshotStatus tracks local package lineage, not whether the represented
        // week is the current calendar week.
        snapshotStatus: sameWeek ? 'superseded' : snapshot.snapshotStatus,
        selectedForDisplay: normalizedPackage.isCurrentWeek
          ? false
          : snapshot.selectedForDisplay,
      };
    });

  const importedSnapshot: StoredMobileWeekSnapshot = {
    localWeekSnapshotId,
    importedToMobileAt,
    snapshotStatus: 'current',
    syncOrigin: 'manual',
    syncStatus: 'not_published',
    syncError: null,
    syncRecordId: null,
    syncUpdatedAt: importedToMobileAt,
    syncUserId: null,
    syncWorksiteId: null,
    syncVersion: normalizedPackage.desktopDataVersion,
    selectedForDisplay:
      normalizedPackage.isCurrentWeek ||
      replacingExisting?.selectedForDisplay === true ||
      !hasSelectedWeek,
    package: normalizedPackage,
  };

  await saveStoredWeekSnapshots([...updatedExistingSnapshots, importedSnapshot]);
  return importedSnapshot;
};

export const importWeekSnapshotFile = async (file: File) =>
  importValidatedWeekSnapshotPackage(await parseWeekSnapshotImportFile(file));

export const selectWeekSnapshotForDisplay = async (localWeekSnapshotId: string) => {
  const existingSnapshots = await normalizeStoredWeekSnapshots(await listStoredWeekSnapshots());
  const targetSnapshot = existingSnapshots.find(
    (snapshot) =>
      snapshot.localWeekSnapshotId === localWeekSnapshotId &&
      snapshot.snapshotStatus !== 'archived',
  );

  if (!targetSnapshot) {
    throw new Error('Week snapshot not found.');
  }

  const updatedSnapshots = existingSnapshots.map((snapshot) => ({
    ...snapshot,
    selectedForDisplay:
      snapshot.snapshotStatus !== 'archived' &&
      snapshot.localWeekSnapshotId === localWeekSnapshotId,
  }));

  await saveStoredWeekSnapshots(updatedSnapshots);
  return updatedSnapshots;
};
