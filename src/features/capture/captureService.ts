import type {
  CaptureFormValues,
  MobileCaptureExportPackage,
  MobileEncounterCapture,
} from '../../contracts/mobileContracts';
import { normalizeEncounterType } from '../../contracts/encounterTypes';
import { validateMobileCaptureExportPackage } from '../../contracts/validators';
import {
  buildCaptureExportPackage,
  createCaptureExportFileName,
  createCaptureRecord,
} from './captureRecordFactory';
import { withCaptureSyncDefaults } from '../../sync/syncMappers';
import {
  listMobileEncounterCaptures,
  saveMobileEncounterCapture,
  saveMobileEncounterCaptures,
} from '../../storage/captureStore';

export interface PreparedCaptureExport {
  exportPackage: MobileCaptureExportPackage;
  fileName: string;
}

export const sortCaptureRecordsForDisplay = (captures: MobileEncounterCapture[]) =>
  [...captures].sort((left, right) => right.updatedOnDeviceAt.localeCompare(left.updatedOnDeviceAt));

const normalizeStoredCaptureRecord = (capture: MobileEncounterCapture) => {
  const normalizedEncounterType = normalizeEncounterType(capture.encounterType);
  const captureWithSyncDefaults = withCaptureSyncDefaults(capture);
  const nextLocation =
    'location' in captureWithSyncDefaults ? captureWithSyncDefaults.location ?? null : null;

  if (
    (!normalizedEncounterType || normalizedEncounterType === capture.encounterType) &&
    captureWithSyncDefaults === capture &&
    nextLocation === capture.location
  ) {
    return capture;
  }

  return {
    ...captureWithSyncDefaults,
    location: nextLocation,
    encounterType: normalizedEncounterType ?? capture.encounterType,
  };
};

const normalizeStoredCaptureRecords = async (captures: MobileEncounterCapture[]) => {
  const normalizedCaptures = captures.map(normalizeStoredCaptureRecord);
  const hasChanges = normalizedCaptures.some((capture, index) => capture !== captures[index]);

  if (hasChanges) {
    await saveMobileEncounterCaptures(normalizedCaptures);
  }

  return normalizedCaptures;
};

export const listCaptureRecordsForDisplay = async () =>
  sortCaptureRecordsForDisplay(
    await normalizeStoredCaptureRecords(await listMobileEncounterCaptures()),
  );

export const createAndSaveCaptureRecord = async (
  values: CaptureFormValues,
  saveMode: 'draft' | 'ready',
) => {
  const record = createCaptureRecord(values, saveMode);
  await saveMobileEncounterCapture(record);
  return record;
};

export const promoteCaptureDraftToReady = async (captureId: string) => {
  const captures = await normalizeStoredCaptureRecords(await listMobileEncounterCaptures());
  const target = captures.find((capture) => capture.captureId === captureId);

  if (!target) {
    throw new Error('Capture not found.');
  }

  const updatedCapture: MobileEncounterCapture = {
    ...target,
    captureStatus: 'ready_for_export',
    transferStatus: 'queued_for_export',
    updatedOnDeviceAt: new Date().toISOString(),
  };

  await saveMobileEncounterCapture(updatedCapture);
  return updatedCapture;
};

export const prepareCaptureExport = async (
  captureIds: string[],
): Promise<PreparedCaptureExport> => {
  const captures = await normalizeStoredCaptureRecords(await listMobileEncounterCaptures());
  const selectedCaptures = sortCaptureRecordsForDisplay(
    captures.filter((capture) => captureIds.includes(capture.captureId)),
  );

  if (selectedCaptures.length === 0) {
    throw new Error('Select at least one capture before exporting.');
  }

  if (
    selectedCaptures.some(
      (capture) => capture.captureStatus === 'draft' || capture.captureStatus === 'archived',
    )
  ) {
    throw new Error('Draft or archived captures cannot be exported.');
  }

  const exportPackage = buildCaptureExportPackage(selectedCaptures);
  const validationResult = validateMobileCaptureExportPackage(exportPackage);

  if (!validationResult.ok) {
    throw new Error(validationResult.errors.join(' '));
  }

  return {
    exportPackage,
    fileName: createCaptureExportFileName(exportPackage.packageId, exportPackage.generatedAt),
  };
};

export const commitCaptureExport = async (
  captureIds: string[],
  exportBatchId: string,
  exportedAt: string,
) => {
  const captures = await normalizeStoredCaptureRecords(await listMobileEncounterCaptures());
  const updatedCaptures = captures
    .filter((capture) => captureIds.includes(capture.captureId))
    .map((capture) => ({
      ...capture,
      captureStatus: 'exported' as const,
      transferStatus: 'export_package_created' as const,
      exportBatchId,
      updatedOnDeviceAt: exportedAt,
    }));

  await saveMobileEncounterCaptures(updatedCaptures);
  return updatedCaptures;
};
