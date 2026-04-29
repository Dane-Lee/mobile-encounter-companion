import type { MobileEncounterCapture } from '../contracts/mobileContracts';
import { isSampleId } from '../lib/id';
import {
  STORE_NAMES,
  clearStore,
  deleteRecord,
  getAllRecords,
  putRecord,
  putRecords,
} from './indexedDb';

export const listMobileEncounterCaptures = () =>
  getAllRecords<MobileEncounterCapture>(STORE_NAMES.captures);

export const saveMobileEncounterCapture = (record: MobileEncounterCapture) =>
  putRecord(STORE_NAMES.captures, record);

export const saveMobileEncounterCaptures = (records: MobileEncounterCapture[]) =>
  putRecords(STORE_NAMES.captures, records);

export const deleteMobileEncounterCapture = (captureId: string) =>
  deleteRecord(STORE_NAMES.captures, captureId);

export const deleteMobileEncounterCaptures = (captureIds: string[]) =>
  Promise.all(captureIds.map((captureId) => deleteMobileEncounterCapture(captureId))).then(
    () => undefined,
  );

export const clearMobileEncounterCaptures = () => clearStore(STORE_NAMES.captures);

export const clearSampleCaptures = async () => {
  const captures = await listMobileEncounterCaptures();

  await Promise.all(
    captures
      .filter((capture) => isSampleId(capture.captureId))
      .map((capture) => deleteRecord(STORE_NAMES.captures, capture.captureId)),
  );
};
