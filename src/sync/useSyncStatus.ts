import { useEffect, useState } from 'react';
import { runFullSync, type SyncRunSummary } from './sync';

const LAST_SYNC_AT_KEY = 'daily-encounter-mobile-companion.last-sync-at';

const readLastSyncAt = () => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(LAST_SYNC_AT_KEY);
};

const writeLastSyncAt = (value: string) => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  window.localStorage.setItem(LAST_SYNC_AT_KEY, value);
};

export const useSyncStatus = () => {
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => readLastSyncAt());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const triggerSync = async (): Promise<SyncRunSummary> => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const summary = await runFullSync();
      const nextLastSyncAt = new Date().toISOString();
      setLastSyncAt(nextLastSyncAt);
      writeLastSyncAt(nextLastSyncAt);
      setSyncError(summary.errors.length > 0 ? summary.errors.join(' ') : null);
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Desktop sync failed.';
      setSyncError(message);
      return {
        snapshots_fetched: 0,
        captures_uploaded: 0,
        errors: [message],
      };
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    void triggerSync();
  }, []);

  return {
    lastSyncAt,
    isSyncing,
    syncError,
    triggerSync,
  };
};
