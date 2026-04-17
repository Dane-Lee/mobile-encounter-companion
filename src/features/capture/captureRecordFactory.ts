import {
  MOBILE_CAPTURE_EXPORT_SCHEMA_VERSION,
  MOBILE_CAPTURE_SCHEMA_VERSION,
  MOBILE_COMPANION_SOURCE,
  type CaptureFormValues,
  type MobileCaptureExportPackage,
  type MobileEncounterCapture,
} from '../../contracts/mobileContracts';
import { validateMobileCaptureExportPackage } from '../../contracts/validators';
import { getCurrentTimezone, toLocalDateString, toLocalTimeString } from '../../lib/dateTime';
import { createId } from '../../lib/id';
import { parseTagsText } from '../../lib/tags';

export const createCaptureRecord = (
  values: CaptureFormValues,
  saveMode: 'draft' | 'ready',
): MobileEncounterCapture => {
  const now = new Date();
  const nowIso = now.toISOString();
  const followUpSuggestedDate =
    values.followUpNeeded && values.followUpSuggestedDate ? values.followUpSuggestedDate : null;

  return {
    schemaVersion: MOBILE_CAPTURE_SCHEMA_VERSION,
    recordType: 'mobile_encounter_capture',
    captureId: createId('capture'),
    source: MOBILE_COMPANION_SOURCE,
    captureStatus: saveMode === 'draft' ? 'draft' : 'ready_for_export',
    transferStatus: saveMode === 'draft' ? 'local_only' : 'queued_for_export',
    exportBatchId: null,
    desktopImportBatchId: null,
    desktopRecordId: null,
    importedAt: null,
    importError: null,
    employeeDisplayName: values.employeeDisplayName.trim(),
    employeeId: null,
    employeeMatchConfidence: 'unknown',
    department: values.department.trim(),
    station: values.station.trim(),
    encounterType: values.encounterType,
    encounterSubtype: null,
    encounterDate: toLocalDateString(now),
    encounterTime: toLocalTimeString(now),
    occurredAt: nowIso,
    capturedAt: nowIso,
    timezone: getCurrentTimezone(),
    summaryShort: values.summaryShort.trim(),
    summaryStructured: null,
    tags: parseTagsText(values.tagsText),
    noteType: 'typed',
    voiceTranscript: null,
    audioFileRef: null,
    followUpNeeded: values.followUpNeeded,
    followUpPriority: values.followUpNeeded ? 'normal' : null,
    followUpReason: null,
    followUpSuggestedDate,
    linkedPriorEncounterId: null,
    createdOnDeviceAt: nowIso,
    updatedOnDeviceAt: nowIso,
    syncStatus: 'local_only',
    syncError: null,
    syncRecordId: null,
    syncUpdatedAt: null,
    importResolution: null,
  };
};

export const buildCaptureExportPackage = (
  records: MobileEncounterCapture[],
): MobileCaptureExportPackage => {
  const packageId = createId('capture-batch');
  const generatedAt = new Date().toISOString();

  const exportPackage: MobileCaptureExportPackage = {
    schemaVersion: MOBILE_CAPTURE_EXPORT_SCHEMA_VERSION,
    packageType: 'mobile_capture_export',
    packageId,
    generatedAt,
    timezone: getCurrentTimezone(),
    recordCount: records.length,
    // Future desktop contract revisions should only change this boundary object,
    // not the capture list UI or IndexedDB shape.
    records,
  };

  const validationResult = validateMobileCaptureExportPackage(exportPackage);
  if (!validationResult.ok) {
    throw new Error(validationResult.errors.join(' '));
  }

  return exportPackage;
};

export const createCaptureExportFileName = (packageId: string, generatedAt: string) => {
  const timestamp = generatedAt.replaceAll(':', '-').replaceAll('.', '-');
  return `mobile-capture-export-${timestamp}-${packageId}.json`;
};
