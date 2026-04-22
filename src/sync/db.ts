import type {
  DailyPrioritizationStateResponse,
  MobileWeeklySnapshotResponse,
  StoredSyncCaptureEntry,
  StoredSyncPrioritizationSettings,
} from './types';

const DB_NAME = 'daily-encounter-mobile-companion.sync';
const DB_VERSION = 1;

const STORE_NAMES = {
  weeklySnapshots: 'weekly_snapshots',
  captureEntries: 'capture_entries',
  prioritizationSettings: 'prioritization_settings',
  dailyPrioritizationState: 'daily_prioritization_state',
} as const;

type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

let dbPromise: Promise<IDBDatabase> | null = null;

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionToPromise = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

const openDatabase = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(STORE_NAMES.weeklySnapshots)) {
          database.createObjectStore(STORE_NAMES.weeklySnapshots, { keyPath: 'id' });
        }

        if (!database.objectStoreNames.contains(STORE_NAMES.captureEntries)) {
          const captureStore = database.createObjectStore(STORE_NAMES.captureEntries, {
            keyPath: 'local_mobile_id',
          });
          captureStore.createIndex('sync_status', 'sync_status', { unique: false });
        }

        if (!database.objectStoreNames.contains(STORE_NAMES.prioritizationSettings)) {
          database.createObjectStore(STORE_NAMES.prioritizationSettings, {
            keyPath: 'storage_key',
          });
        }

        if (!database.objectStoreNames.contains(STORE_NAMES.dailyPrioritizationState)) {
          database.createObjectStore(STORE_NAMES.dailyPrioritizationState, {
            keyPath: 'prioritization_date',
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
};

const withStore = async <T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => Promise<T> | T,
) => {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  const result = await action(store);
  await transactionToPromise(transaction);
  return result;
};

const getAll = <T>(storeName: StoreName) =>
  withStore(storeName, 'readonly', (store) => requestToPromise(store.getAll()) as Promise<T[]>);

const getByKey = <T>(storeName: StoreName, key: IDBValidKey) =>
  withStore(storeName, 'readonly', (store) => requestToPromise(store.get(key)) as Promise<T | undefined>);

const putOne = <T>(storeName: StoreName, value: T) =>
  withStore(storeName, 'readwrite', (store) =>
    requestToPromise(store.put(value)).then(() => value),
  );

const putMany = async <T>(storeName: StoreName, values: T[]) => {
  await withStore(storeName, 'readwrite', async (store) => {
    await Promise.all(values.map((value) => requestToPromise(store.put(value))));
  });

  return values;
};

export const listSyncedWeeklySnapshots = () =>
  getAll<MobileWeeklySnapshotResponse>(STORE_NAMES.weeklySnapshots);

export const upsertSyncedWeeklySnapshots = (records: MobileWeeklySnapshotResponse[]) =>
  putMany(STORE_NAMES.weeklySnapshots, records);

export const listSyncedCaptureEntries = () =>
  getAll<StoredSyncCaptureEntry>(STORE_NAMES.captureEntries);

export const getSyncedCaptureEntry = (localMobileId: string) =>
  getByKey<StoredSyncCaptureEntry>(STORE_NAMES.captureEntries, localMobileId);

export const upsertSyncedCaptureEntry = (record: StoredSyncCaptureEntry) =>
  putOne(STORE_NAMES.captureEntries, record);

export const upsertSyncedCaptureEntries = (records: StoredSyncCaptureEntry[]) =>
  putMany(STORE_NAMES.captureEntries, records);

export const listPendingSyncedCaptureEntries = async () =>
  (await listSyncedCaptureEntries()).filter((record) => record.sync_status === 'local_only');

export const getSyncedPrioritizationSettings = () =>
  getByKey<StoredSyncPrioritizationSettings>(STORE_NAMES.prioritizationSettings, 'current');

export const saveSyncedPrioritizationSettings = (
  record: Omit<StoredSyncPrioritizationSettings, 'storage_key'>,
) =>
  putOne(STORE_NAMES.prioritizationSettings, {
    ...record,
    storage_key: 'current' as const,
  });

export const listSyncedDailyPrioritizationStates = () =>
  getAll<DailyPrioritizationStateResponse>(STORE_NAMES.dailyPrioritizationState);

export const getSyncedDailyPrioritizationState = (prioritizationDate: string) =>
  getByKey<DailyPrioritizationStateResponse>(
    STORE_NAMES.dailyPrioritizationState,
    prioritizationDate,
  );

export const saveSyncedDailyPrioritizationState = (record: DailyPrioritizationStateResponse) =>
  putOne(STORE_NAMES.dailyPrioritizationState, record);

export const saveSyncedDailyPrioritizationStates = (
  records: DailyPrioritizationStateResponse[],
) => putMany(STORE_NAMES.dailyPrioritizationState, records);

export { STORE_NAMES as SYNC_STORE_NAMES };
