import { describe, expect, it } from 'vitest';
import type { MobileEncounterCapture } from '../contracts/mobileContracts';
import {
  buildLocalDataInventory,
  getCaptureRetentionReviewDate,
  isCaptureRetentionReviewEligible,
} from './dataGovernance';

const buildCapture = (
  overrides: Partial<MobileEncounterCapture>,
): MobileEncounterCapture => ({
  schemaVersion: '1.0.0',
  recordType: 'mobile_encounter_capture',
  captureId: 'capture-1',
  source: 'mobile_companion',
  captureStatus: 'exported',
  transferStatus: 'export_package_created',
  exportBatchId: null,
  desktopImportBatchId: null,
  desktopRecordId: null,
  importedAt: null,
  importError: null,
  employeeDisplayName: 'Jordan Hale',
  employeeId: null,
  employeeMatchConfidence: 'unknown',
  department: 'Ops',
  location: 'Line 1',
  station: null,
  encounterType: 'Relationship Development',
  encounterSubtype: null,
  encounterDate: '2026-01-01',
  encounterTime: '09:00',
  occurredAt: '2026-01-01T14:00:00.000Z',
  capturedAt: '2026-01-01T14:00:00.000Z',
  timezone: 'America/New_York',
  summaryShort: 'Checked in.',
  summaryStructured: null,
  tags: [],
  noteType: 'typed',
  voiceTranscript: null,
  audioFileRef: null,
  followUpNeeded: false,
  followUpPriority: null,
  followUpReason: null,
  followUpSuggestedDate: null,
  linkedPriorEncounterId: null,
  createdOnDeviceAt: '2026-01-01T14:00:00.000Z',
  updatedOnDeviceAt: '2026-01-01T14:00:00.000Z',
  syncStatus: 'uploaded',
  syncError: null,
  syncRecordId: null,
  syncUpdatedAt: '2026-01-01T14:00:00.000Z',
  importResolution: null,
  ...overrides,
});

describe('dataGovernance', () => {
  it('calculates retention review dates for transferred captures', () => {
    const capture = buildCapture({});

    expect(getCaptureRetentionReviewDate(capture)).toBe('2026-04-01T14:00:00.000Z');
    expect(isCaptureRetentionReviewEligible(capture, '2026-04-02T00:00:00.000Z')).toBe(true);
  });

  it('does not mark draft or local-only captures retention eligible', () => {
    const capture = buildCapture({
      captureStatus: 'draft',
      syncStatus: 'local_only',
    });

    expect(getCaptureRetentionReviewDate(capture)).toBeNull();
    expect(isCaptureRetentionReviewEligible(capture, '2026-04-02T00:00:00.000Z')).toBe(false);
  });

  it('builds a local data inventory without exporting record contents', () => {
    const inventory = buildLocalDataInventory({
      captures: [buildCapture({})],
      snapshots: [],
      prioritizationSettingsCount: 1,
      dailyPrioritizationStateCount: 2,
      captureOptionsCustomized: true,
      syncConfigured: false,
    });

    expect(inventory.dataSets).toHaveLength(5);
    expect(inventory.dataSets[0].count).toBe(1);
    expect(inventory.retentionReview.eligibleCaptureCount).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(inventory)).not.toContain('Jordan Hale');
  });
});
