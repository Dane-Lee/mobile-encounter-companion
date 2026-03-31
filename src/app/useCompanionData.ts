import { useEffect, useState } from 'react';
import type {
  CaptureFormValues,
  MobileEncounterCapture,
  StoredMobileWeekSnapshot,
} from '../contracts/mobileContracts';
import { downloadJsonFile } from '../lib/download';
import { seedSampleData } from '../mocks/sampleSeed';
import { clearSampleCaptures } from '../storage/captureStore';
import { clearSampleWeekSnapshots } from '../storage/weekSnapshotStore';
import {
  commitCaptureExport,
  createAndSaveCaptureRecord,
  listCaptureRecordsForDisplay,
  prepareCaptureExport,
  promoteCaptureDraftToReady,
} from '../features/capture/captureService';
import {
  getActiveWeekSnapshot,
  importWeekSnapshotFile,
  listWeekSnapshotsForDisplay,
  selectWeekSnapshotForDisplay,
} from '../features/week-view/weekSnapshotService';

type Notice = { tone: 'success' | 'error'; message: string } | null;

export const useCompanionData = () => {
  const [captures, setCaptures] = useState<MobileEncounterCapture[]>([]);
  const [snapshots, setSnapshots] = useState<StoredMobileWeekSnapshot[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [isBusy, setIsBusy] = useState(false);

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

  const handleSaveCapture = async (values: CaptureFormValues, saveMode: 'draft' | 'ready') => {
    await runAction(async () => {
      await createAndSaveCaptureRecord(values, saveMode);
    }, saveMode === 'draft' ? 'Local draft saved.' : 'Capture saved and queued for export.');
  };

  const handleMarkReady = async (captureId: string) => {
    await runAction(async () => {
      await promoteCaptureDraftToReady(captureId);
    }, 'Capture moved to ready for export.');
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

  return {
    captures,
    snapshots,
    activeSnapshot: getActiveWeekSnapshot(snapshots),
    notice,
    isBusy,
    handleSaveCapture,
    handleMarkReady,
    handleExportSelected,
    handleImportWeekPackage,
    handleSelectWeek,
    handleSeedSampleData,
    handleClearSampleData,
  };
};
