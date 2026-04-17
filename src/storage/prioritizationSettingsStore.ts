import type { PrioritizationSettings } from '../contracts/prioritizationContracts';
import { STORE_NAMES, getAllRecords, putRecord } from './indexedDb';

export const listPrioritizationSettingsRecords = () =>
  getAllRecords<PrioritizationSettings>(STORE_NAMES.prioritizationSettings);

export const getPrioritizationSettingsRecord = async () => {
  const records = await listPrioritizationSettingsRecords();
  return records[0] ?? null;
};

export const savePrioritizationSettingsRecord = (record: PrioritizationSettings) =>
  putRecord(STORE_NAMES.prioritizationSettings, record);

