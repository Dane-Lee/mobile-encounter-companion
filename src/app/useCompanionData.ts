import { useEffect, useState } from 'react';
import type {
  CaptureFormValues,
  MobileEncounterCapture,
  StoredMobileWeekSnapshot,
} from '../contracts/mobileContracts';
import { downloadJsonFile } from '../lib/download';
import { seedSampleData } from '../mocks/sampleSeed';
import {
  clearMobileEncounterCaptures,
  clearSampleCaptures,
  listMobileEncounterCaptures,
} from '../storage/captureStore';
import {
  addDepartmentOptionOverride,
  addLocationOptionOverride,
  addStationOptionOverride,
  clearCaptureOptionOverrides,
  getEffectiveCaptureOptionLists,
  hasStoredCaptureOptionOverrides,
  removeDepartmentOptionOverride,
  removeLocationOptionOverride,
  removeStationOptionOverride,
  updateLocationOptionDepartment,
  updateStationOptionLocation,
} from '../storage/captureOptionStore';
import {
  clearSampleWeekSnapshots,
  clearStoredWeekSnapshots,
  listStoredWeekSnapshots,
} from '../storage/weekSnapshotStore';
import {
  clearPrioritizationSettingsRecords,
  listPrioritizationSettingsRecords,
} from '../storage/prioritizationSettingsStore';
import {
  clearDailyPrioritizationStateRecords,
  listDailyPrioritizationStateRecords,
} from '../storage/dailyPrioritizationStateStore';
import {
  clearRetentionEligibleCaptureRecords,
  commitCaptureExport,
  createAndSaveCaptureRecord,
  listCaptureRecordsForDisplay,
  prepareCaptureExport,
  promoteCaptureDraftToReady,
} from '../features/capture/captureService';
import { uploadMobileCaptureEntries } from '../features/capture/captureSyncService';
import {
  getActiveWeekSnapshot,
  importWeekSnapshotFile,
  listWeekSnapshotsForDisplay,
  selectWeekSnapshotForDisplay,
} from '../features/week-view/weekSnapshotService';
import { refreshWeeklySnapshotsFromSync } from '../features/week-view/weeklySnapshotSyncService';
import { useMobileSyncStatus } from '../sync/useMobileSyncStatus';
import { FULL_SYNC_COMPLETED_EVENT } from '../sync/sync';
import type { CaptureOptionLists } from '../config/siteCaptureOptions';
import {
  buildLocalDataInventory,
  getRetentionEligibleCaptures,
} from '../privacy/dataGovernance';
import { clearResponsibleUseNoticeAcceptance } from '../privacy/responsibleUseNoticeStore';
import { clearDesktopSyncSettings } from '../sync/config';

type Notice = { tone: 'success' | 'error' | 'info'; message: string } | null;

export const useCompanionData = () => {
  const [captures, setCaptures] = useState<MobileEncounterCapture[]>([]);
  const [snapshots, setSnapshots] = useState<StoredMobileWeekSnapshot[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [captureOptions, setCaptureOptions] = useState<CaptureOptionLists>(
    getEffectiveCaptureOptionLists(),
  );
  const [hasCaptureOptionOverrides, setHasCaptureOptionOverrides] = useState(
    hasStoredCaptureOptionOverrides(),
  );
  const syncStatus = useMobileSyncStatus(captures, snapshots);

  const refreshCaptureOptions = () => {
    setCaptureOptions(getEffectiveCaptureOptionLists());
    setHasCaptureOptionOverrides(hasStoredCaptureOptionOverrides());
  };

  const refreshData = async () => {
    const [captureRecords, weekSnapshots] = await Promise.all([
      listCaptureRecordsForDisplay(),
      listWeekSnapshotsForDisplay(),
    ]);

    setCaptures(captureRecords);
    setSnapshots(weekSnapshots);
  };

  useEffect(() => {
    void refreshData();
    refreshCaptureOptions();
  }, []);

  useEffect(() => {
    const handleFullSyncCompleted = () => {
      void refreshData();
    };

    window.addEventListener(FULL_SYNC_COMPLETED_EVENT, handleFullSyncCompleted);

    return () => {
      window.removeEventListener(FULL_SYNC_COMPLETED_EVENT, handleFullSyncCompleted);
    };
  }, []);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), 4_000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsBusy(true);

    try {
      await action();
      await refreshData();
      setNotice({ tone: 'success', message: successMessage });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const runCustomAction = async (action: () => Promise<Notice>) => {
    setIsBusy(true);

    try {
      const nextNotice = await action();
      await refreshData();
      setNotice(nextNotice);
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveCapture = async (values: CaptureFormValues, saveMode: 'draft' | 'ready') => {
    await runAction(async () => {
      await createAndSaveCaptureRecord(values, saveMode);
    }, saveMode === 'draft' ? 'Local draft saved.' : 'Capture saved locally and marked ready.');
  };

  const handleMarkReady = async (captureId: string) => {
    await runAction(async () => {
      await promoteCaptureDraftToReady(captureId);
    }, 'Capture marked ready.');
  };

  const handleExportSelected = async (captureIds: string[]) => {
    await runAction(async () => {
      const { exportPackage, fileName } = await prepareCaptureExport(captureIds);
      downloadJsonFile(fileName, exportPackage);
      await commitCaptureExport(
        captureIds,
        exportPackage.packageId,
        exportPackage.generatedAt,
      );
    }, 'Capture export package downloaded.');
  };

  const handleUploadSelected = async (captureIds: string[]) => {
    await runCustomAction(async () => {
      if (!syncStatus.isConfigured) {
        return {
          tone: 'info',
          message: 'Backend sync not configured.',
        };
      }

      const result = await uploadMobileCaptureEntries(captureIds);

      if (result.uploadedCount === 0) {
        return {
          tone: 'error',
          message: `${result.failedCount} capture${result.failedCount === 1 ? '' : 's'} failed to upload.`,
        };
      }

      const suffix = result.failedCount
        ? ` ${result.failedCount} failed and was marked sync error locally.`
        : result.skippedCount
          ? ` ${result.skippedCount} selected item${result.skippedCount === 1 ? ' was' : 's were'} already synced or not ready.`
          : '';

      return {
        tone: 'success',
        message: `Sent ${result.uploadedCount} capture${result.uploadedCount === 1 ? '' : 's'} to desktop review.${suffix}`,
      };
    });
  };

  const handleImportWeekPackage = async (file: File) => {
    await runAction(async () => {
      await importWeekSnapshotFile(file);
    }, `Imported ${file.name}.`);
  };

  const handleSelectWeek = async (localWeekSnapshotId: string) => {
    await runAction(async () => {
      if (!localWeekSnapshotId) {
        return;
      }

      await selectWeekSnapshotForDisplay(localWeekSnapshotId);
    }, 'Week display updated.');
  };

  const handleRefreshWeeklySnapshots = async () => {
    await runCustomAction(async () => {
      if (!syncStatus.isConfigured) {
        return {
          tone: 'info',
          message: 'Backend sync not configured.',
        };
      }

      const result = await refreshWeeklySnapshotsFromSync();

      if (result.fetchedCount === 0) {
        return {
          tone: 'success',
          message: 'No backend weekly snapshots were returned for this user and worksite.',
        };
      }

      return {
        tone: 'success',
        message: `Fetched ${result.fetchedCount} weekly snapshot${result.fetchedCount === 1 ? '' : 's'} from sync.`,
      };
    });
  };

  const handleSeedSampleData = async () => {
    await runAction(async () => {
      await seedSampleData();
    }, 'Sample data loaded locally.');
  };

  const handleClearSampleData = async () => {
    await runAction(async () => {
      await Promise.all([clearSampleCaptures(), clearSampleWeekSnapshots()]);
    }, 'Sample data removed from local storage.');
  };

  const handleDownloadDataInventory = async () => {
    await runCustomAction(async () => {
      const [
        captureRecords,
        weekSnapshots,
        prioritizationSettingsRecords,
        dailyPrioritizationStateRecords,
      ] = await Promise.all([
        listMobileEncounterCaptures(),
        listStoredWeekSnapshots(),
        listPrioritizationSettingsRecords(),
        listDailyPrioritizationStateRecords(),
      ]);
      const inventory = buildLocalDataInventory({
        captures: captureRecords,
        snapshots: weekSnapshots,
        prioritizationSettingsCount: prioritizationSettingsRecords.length,
        dailyPrioritizationStateCount: dailyPrioritizationStateRecords.length,
        captureOptionsCustomized: hasStoredCaptureOptionOverrides(),
        syncConfigured: syncStatus.isConfigured,
      });
      const timestamp = inventory.generatedAt.replaceAll(':', '-').replaceAll('.', '-');

      downloadJsonFile(`mobile-companion-data-inventory-${timestamp}.json`, inventory);

      return {
        tone: 'success',
        message: 'Local data inventory downloaded.',
      };
    });
  };

  const handleClearCaptures = async () => {
    await runAction(async () => {
      await clearMobileEncounterCaptures();
    }, 'All local capture records removed from this browser.');
  };

  const handleClearWeekSnapshots = async () => {
    await runAction(async () => {
      await clearStoredWeekSnapshots();
    }, 'All cached week snapshots removed from this browser.');
  };

  const handleClearRetentionEligibleCaptures = async () => {
    await runCustomAction(async () => {
      const removedCount = await clearRetentionEligibleCaptureRecords();

      return {
        tone: 'success',
        message:
          removedCount === 0
            ? 'No retention-eligible capture records were found.'
            : `Removed ${removedCount} retention-eligible capture${removedCount === 1 ? '' : 's'} from this browser.`,
      };
    });
  };

  const handleClearAllLocalData = async () => {
    await runAction(async () => {
      await Promise.all([
        clearMobileEncounterCaptures(),
        clearStoredWeekSnapshots(),
        clearPrioritizationSettingsRecords(),
        clearDailyPrioritizationStateRecords(),
      ]);
      clearCaptureOptionOverrides();
      clearResponsibleUseNoticeAcceptance();
      clearDesktopSyncSettings();
      refreshCaptureOptions();
    }, 'All local app data cleared from this browser.');
  };

  const handleAddDepartmentOption = async (value: string) => {
    await runAction(async () => {
      addDepartmentOptionOverride(value);
      refreshCaptureOptions();
    }, 'Department option added locally.');
  };

  const handleRemoveDepartmentOption = async (value: string) => {
    await runAction(async () => {
      removeDepartmentOptionOverride(value);
      refreshCaptureOptions();
    }, 'Department option removed locally.');
  };

  const handleAddLocationOption = async (name: string, department: string | null) => {
    await runAction(async () => {
      addLocationOptionOverride(name, department);
      refreshCaptureOptions();
    }, 'Location option added locally.');
  };

  const handleUpdateLocationOptionDepartment = async (
    name: string,
    department: string | null,
  ) => {
    await runAction(async () => {
      updateLocationOptionDepartment(name, department);
      refreshCaptureOptions();
    }, 'Location assignment updated locally.');
  };

  const handleRemoveLocationOption = async (value: string) => {
    await runAction(async () => {
      removeLocationOptionOverride(value);
      refreshCaptureOptions();
    }, 'Location option removed locally.');
  };

  const handleAddStationOption = async (name: string, location: string | null) => {
    await runAction(async () => {
      addStationOptionOverride(name, location);
      refreshCaptureOptions();
    }, 'Station option added locally.');
  };

  const handleUpdateStationOptionLocation = async (
    name: string,
    location: string | null,
  ) => {
    await runAction(async () => {
      updateStationOptionLocation(name, location);
      refreshCaptureOptions();
    }, 'Station assignment updated locally.');
  };

  const handleRemoveStationOption = async (value: string) => {
    await runAction(async () => {
      removeStationOptionOverride(value);
      refreshCaptureOptions();
    }, 'Station option removed locally.');
  };

  const handleResetCaptureOptions = async () => {
    await runAction(async () => {
      clearCaptureOptionOverrides();
      refreshCaptureOptions();
    }, 'Department, location, and station options reset to defaults.');
  };

  return {
    captures,
    snapshots,
    activeSnapshot: getActiveWeekSnapshot(snapshots),
    captureOptions,
    hasCaptureOptionOverrides,
    notice,
    isBusy,
    syncStatus,
    handleSaveCapture,
    handleMarkReady,
    handleExportSelected,
    handleUploadSelected,
    handleImportWeekPackage,
    handleSelectWeek,
    handleRefreshWeeklySnapshots,
    handleSeedSampleData,
    handleClearSampleData,
    handleDownloadDataInventory,
    handleClearCaptures,
    handleClearWeekSnapshots,
    handleClearRetentionEligibleCaptures,
    handleClearAllLocalData,
    handleAddDepartmentOption,
    handleRemoveDepartmentOption,
    handleAddLocationOption,
    handleUpdateLocationOptionDepartment,
    handleRemoveLocationOption,
    handleAddStationOption,
    handleUpdateStationOptionLocation,
    handleRemoveStationOption,
    handleResetCaptureOptions,
    retentionEligibleCaptureCount: getRetentionEligibleCaptures(captures).length,
  };
};
