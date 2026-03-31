import type {
  StoredMobileWeekSnapshot,
} from '../contracts/mobileContracts';
import { isSampleId } from '../lib/id';
import { STORE_NAMES, deleteRecord, getAllRecords, putRecord, putRecords } from './indexedDb';

export const listStoredWeekSnapshots = () =>
  getAllRecords<StoredMobileWeekSnapshot>(STORE_NAMES.weekSnapshots);

export const saveStoredWeekSnapshot = (snapshot: StoredMobileWeekSnapshot) =>
  putRecord(STORE_NAMES.weekSnapshots, snapshot);

export const saveStoredWeekSnapshots = (snapshots: StoredMobileWeekSnapshot[]) =>
  putRecords(STORE_NAMES.weekSnapshots, snapshots);

export const clearSampleWeekSnapshots = async () => {
  const snapshots = await listStoredWeekSnapshots();

  await Promise.all(
    snapshots
      .filter(
        (snapshot) =>
          isSampleId(snapshot.localWeekSnapshotId) || isSampleId(snapshot.package.packageId),
      )
      .map((snapshot) => deleteRecord(STORE_NAMES.weekSnapshots, snapshot.localWeekSnapshotId)),
  );
};
