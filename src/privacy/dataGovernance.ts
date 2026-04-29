import type { MobileEncounterCapture, StoredMobileWeekSnapshot } from '../contracts/mobileContracts';
import { retentionDefaults } from './responsibleUseConfig';

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface LocalDataInventoryInput {
  captures: MobileEncounterCapture[];
  snapshots: StoredMobileWeekSnapshot[];
  prioritizationSettingsCount: number;
  dailyPrioritizationStateCount: number;
  captureOptionsCustomized: boolean;
  syncConfigured: boolean;
}

export const isCaptureCandidateForRetentionReview = (capture: MobileEncounterCapture) => {
  if (
    capture.captureStatus === 'draft' ||
    capture.syncStatus === 'local_only' ||
    capture.syncStatus === 'sync_error'
  ) {
    return false;
  }

  return (
    capture.captureStatus === 'exported' ||
    capture.captureStatus === 'imported' ||
    capture.syncStatus === 'uploaded' ||
    capture.syncStatus === 'imported_to_desktop' ||
    capture.syncStatus === 'resolved'
  );
};

const getRetentionBaseDate = (capture: MobileEncounterCapture) => {
  const value = capture.syncUpdatedAt ?? capture.updatedOnDeviceAt ?? capture.createdOnDeviceAt;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getCaptureRetentionReviewDate = (capture: MobileEncounterCapture) => {
  if (!isCaptureCandidateForRetentionReview(capture)) {
    return null;
  }

  const baseDate = getRetentionBaseDate(capture);
  if (!baseDate) {
    return null;
  }

  return new Date(baseDate.getTime() + retentionDefaults.reviewDays * ONE_DAY_IN_MS).toISOString();
};

export const isCaptureRetentionReviewEligible = (
  capture: MobileEncounterCapture,
  nowIso = new Date().toISOString(),
) => {
  const reviewDate = getCaptureRetentionReviewDate(capture);
  if (!reviewDate) {
    return false;
  }

  return new Date(reviewDate).getTime() <= new Date(nowIso).getTime();
};

export const getRetentionEligibleCaptures = (
  captures: MobileEncounterCapture[],
  nowIso = new Date().toISOString(),
) => captures.filter((capture) => isCaptureRetentionReviewEligible(capture, nowIso));

const countBy = <T extends string>(values: T[]) =>
  values.reduce<Record<T, number>>(
    (accumulator, value) => ({
      ...accumulator,
      [value]: (accumulator[value] ?? 0) + 1,
    }),
    {} as Record<T, number>,
  );

export const buildLocalDataInventory = ({
  captures,
  snapshots,
  prioritizationSettingsCount,
  dailyPrioritizationStateCount,
  captureOptionsCustomized,
  syncConfigured,
}: LocalDataInventoryInput) => ({
  generatedAt: new Date().toISOString(),
  storageScope: 'This inventory describes data stored in this browser on this device.',
  syncConfigured,
  dataSets: [
    {
      key: 'mobileEncounterCaptures',
      label: 'Mobile encounter captures',
      count: captures.length,
      sensitivity: 'Employee-identifiable encounter notes and workflow flags.',
      retention: 'Drafts and local-only records stay until user action. Exported/uploaded/resolved records are eligible for review after the configured window.',
    },
    {
      key: 'storedMobileWeekSnapshots',
      label: 'Cached weekly snapshots',
      count: snapshots.length,
      sensitivity: 'Employee-identifiable weekly encounter and reminder reference data.',
      retention: 'User-managed local cache until cleared or replaced.',
    },
    {
      key: 'prioritizationSettings',
      label: 'Prioritization settings',
      count: prioritizationSettingsCount,
      sensitivity: 'Station risk settings and worksite prioritization setup.',
      retention: 'User-managed local setup until cleared.',
    },
    {
      key: 'dailyPrioritizationState',
      label: 'Daily prioritization state',
      count: dailyPrioritizationStateCount,
      sensitivity: 'Roster names, item status, notes, and execution records.',
      retention: 'User-managed daily state until cleared.',
    },
    {
      key: 'captureOptionOverrides',
      label: 'Local capture option overrides',
      count: captureOptionsCustomized ? 1 : 0,
      sensitivity: 'Local department, location, and station option labels.',
      retention: 'User-managed local setup until reset or all local data is cleared.',
    },
  ],
  captureStatusCounts: countBy(captures.map((capture) => capture.captureStatus)),
  captureSyncStatusCounts: countBy(captures.map((capture) => capture.syncStatus)),
  retentionReview: {
    reviewWindowDays: retentionDefaults.reviewDays,
    reviewWindowLabel: retentionDefaults.label,
    eligibleCaptureCount: getRetentionEligibleCaptures(captures).length,
  },
});
