import type { DailyPrioritizationState } from '../contracts/prioritizationContracts';
import { STORE_NAMES, getAllRecords, putRecord } from './indexedDb';

export const listDailyPrioritizationStateRecords = () =>
  getAllRecords<DailyPrioritizationState>(STORE_NAMES.dailyPrioritizationState);

export const getDailyPrioritizationStateRecord = async (prioritizationDate: string) => {
  const records = await listDailyPrioritizationStateRecords();
  return records.find((record) => record.prioritizationDate === prioritizationDate) ?? null;
};

export const saveDailyPrioritizationStateRecord = (record: DailyPrioritizationState) =>
  putRecord(STORE_NAMES.dailyPrioritizationState, record);

