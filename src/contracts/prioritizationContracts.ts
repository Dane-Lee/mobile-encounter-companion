import type { EncounterType } from './encounterTypes';

export const PRIORITIZATION_SYNC_STATUSES = ['local_only', 'synced', 'sync_error'] as const;
export const STATION_RISK_LEVELS = ['high', 'medium', 'low', 'none'] as const;
export const PRIORITIZATION_STATUSES = [
  'open',
  'in_progress',
  'completed',
  'deferred',
  'unable_to_complete',
  'urgent',
] as const;

export type PrioritizationSyncStatus = (typeof PRIORITIZATION_SYNC_STATUSES)[number];
export type StationRiskLevel = (typeof STATION_RISK_LEVELS)[number];
export type PrioritizationStatus = (typeof PRIORITIZATION_STATUSES)[number];

export interface PrioritizationItemOverride {
  itemId: string;
  status: PrioritizationStatus;
  notes: string | null;
  updatedAt: string;
}

export interface PrioritizationExecutionRecord {
  executionId: string;
  sourcePrioritizationItemId: string;
  employeeName: string | null;
  stationName: string | null;
  checklistSectionsCompleted: string[];
  recommendedNextStep: EncounterType | null;
  interactionOccurred: boolean;
  readyToRecord: boolean;
  status: PrioritizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PrioritizationSettings {
  schemaVersion: string;
  settingsId: string;
  stationRiskMap: Record<string, StationRiskLevel>;
  updatedAt: string;
  syncStatus: PrioritizationSyncStatus;
  syncError: string | null;
  syncRecordId: string | null;
  syncUpdatedAt: string | null;
}

export interface DailyPrioritizationState {
  schemaVersion: string;
  prioritizationDate: string;
  rosterNames: string[];
  itemOverrides: PrioritizationItemOverride[];
  executionRecords: PrioritizationExecutionRecord[];
  updatedAt: string;
  syncStatus: PrioritizationSyncStatus;
  syncError: string | null;
  syncRecordId: string | null;
  syncUpdatedAt: string | null;
}

