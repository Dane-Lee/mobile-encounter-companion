import type { MobileEncounterCapture } from '../../contracts/mobileContracts';
import { saveMobileEncounterCaptures } from '../../storage/captureStore';
import {
  applyCaptureSyncError,
  applyUploadedCaptureSyncRecord,
  mapCaptureToMobileCaptureEntrySyncRecord,
  withCaptureSyncDefaults,
} from '../../sync/syncMappers';
import { uploadMobileCaptureEntrySyncRecord } from '../../sync/syncApi';
import { getSyncConfig, getSyncConfigErrors } from '../../sync/syncConfig';
import { listCaptureRecordsForDisplay } from './captureService';

export interface UploadMobileCaptureEntriesResult {
  uploadedCount: number;
  failedCount: number;
  skippedCount: number;
  updatedCaptures: MobileEncounterCapture[];
}

export const isCaptureUploadEligible = (capture: MobileEncounterCapture) => {
  const captureWithSyncDefaults = withCaptureSyncDefaults(capture);

  return (
    captureWithSyncDefaults.captureStatus !== 'draft' &&
    captureWithSyncDefaults.captureStatus !== 'archived' &&
    (captureWithSyncDefaults.syncStatus === 'local_only' ||
      captureWithSyncDefaults.syncStatus === 'sync_error')
  );
};

export const uploadMobileCaptureEntries = async (
  captureIds: string[],
): Promise<UploadMobileCaptureEntriesResult> => {
  const config = getSyncConfig();
  const configErrors = getSyncConfigErrors(config);

  if (configErrors.length > 0) {
    throw new Error(configErrors.join(' '));
  }

  const captures = await listCaptureRecordsForDisplay();
  const selectedCaptures = captures.filter((capture) => captureIds.includes(capture.captureId));

  if (selectedCaptures.length === 0) {
    throw new Error('Select at least one capture before uploading.');
  }

  const uploadableCaptures = selectedCaptures.filter(isCaptureUploadEligible);

  if (uploadableCaptures.length === 0) {
    throw new Error('Selected captures are already pending desktop review or are not ready for sync.');
  }

  const updatedCaptures = await Promise.all(
    uploadableCaptures.map(async (capture) => {
      try {
        const uploadRecord = {
          ...mapCaptureToMobileCaptureEntrySyncRecord(capture, config),
          sync_status: 'uploaded' as const,
        };
        const syncedRecord = await uploadMobileCaptureEntrySyncRecord(config, uploadRecord);
        return applyUploadedCaptureSyncRecord(capture, syncedRecord);
      } catch (error) {
        return applyCaptureSyncError(
          capture,
          error instanceof Error ? error.message : 'Capture upload failed.',
        );
      }
    }),
  );

  await saveMobileEncounterCaptures(updatedCaptures);

  return {
    uploadedCount: updatedCaptures.filter((capture) => capture.syncStatus !== 'sync_error').length,
    failedCount: updatedCaptures.filter((capture) => capture.syncStatus === 'sync_error').length,
    skippedCount: selectedCaptures.length - uploadableCaptures.length,
    updatedCaptures,
  };
};
