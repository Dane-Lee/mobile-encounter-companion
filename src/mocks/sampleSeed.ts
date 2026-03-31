import { createMockCaptures, createMockStoredWeekSnapshots } from './generators';
import { saveMobileEncounterCaptures } from '../storage/captureStore';
import { saveStoredWeekSnapshot } from '../storage/weekSnapshotStore';

export const seedSampleData = async () => {
  await saveMobileEncounterCaptures(createMockCaptures());
  const snapshots = createMockStoredWeekSnapshots();
  await Promise.all(snapshots.map((snapshot) => saveStoredWeekSnapshot(snapshot)));
};
