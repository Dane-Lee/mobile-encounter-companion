const DB_NAME = 'daily-encounter-mobile-companion';
const DB_VERSION = 1;

export const STORE_NAMES = {
  captures: 'mobileEncounterCaptures',
  weekSnapshots: 'storedMobileWeekSnapshots',
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

        if (!database.objectStoreNames.contains(STORE_NAMES.captures)) {
          database.createObjectStore(STORE_NAMES.captures, { keyPath: 'captureId' });
        }

        if (!database.objectStoreNames.contains(STORE_NAMES.weekSnapshots)) {
          database.createObjectStore(STORE_NAMES.weekSnapshots, { keyPath: 'localWeekSnapshotId' });
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

export const getAllRecords = <T>(storeName: StoreName) =>
  withStore(storeName, 'readonly', (store) => requestToPromise(store.getAll()) as Promise<T[]>);

export const putRecord = <T>(storeName: StoreName, value: T) =>
  withStore(storeName, 'readwrite', (store) => requestToPromise(store.put(value)).then(() => value));

export const putRecords = async <T>(storeName: StoreName, values: T[]) => {
  await withStore(storeName, 'readwrite', async (store) => {
    await Promise.all(values.map((value) => requestToPromise(store.put(value))));
  });

  return values;
};

export const deleteRecord = (storeName: StoreName, key: IDBValidKey) =>
  withStore(storeName, 'readwrite', (store) =>
    requestToPromise(store.delete(key)).then(() => undefined),
  );
