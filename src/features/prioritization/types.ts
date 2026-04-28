import type { EncounterType } from '../../contracts/encounterTypes';
import type {
  DailyPrioritizationState,
  PrioritizationExecutionRecord,
  PrioritizationItemOverride,
  PrioritizationRosterRecord,
  PrioritizationSettings,
  PrioritizationStationRecord,
  PrioritizationStatus,
  StationRiskLevel,
} from '../../contracts/prioritizationContracts';

export const PRIORITIZATION_BUCKET_IDS = [
  'open_pa_follow_up',
  'worker_not_yet_encountered',
  'worker_uncertain_pain_discomfort',
  'high_risk_area',
  'worker_uncertain_stiffness_mobility',
  'medium_risk_area',
  'low_risk_area',
] as const;

export type PrioritizationBucket = (typeof PRIORITIZATION_BUCKET_IDS)[number];
export type PrioritizationItemType = 'employee' | 'station';

export type RelatedAssessmentType =
  | 'Physical Assessment'
  | 'PWC'
  | 'NWC'
  | 'Human Movement Assessment'
  | 'HMA Follow-Up'
  | 'HMA Reassessment'
  | 'Office Assessment'
  | 'Task Assessment'
  | 'Observational Scan';

export interface PrioritizationItem {
  id: string;
  itemType: PrioritizationItemType;
  priorityBucket: PrioritizationBucket;
  displayLabel: string;
  employeeName: string | null;
  employeeId: string | null;
  stationName: string | null;
  stationId: string | null;
  sourceReason: string;
  relatedEncounterType: EncounterType | null;
  relatedAssessmentType: RelatedAssessmentType | null;
  dueDate: string | null;
  status: PrioritizationStatus;
  notes: string | null;
}

export interface PrioritizationBucketDefinition {
  id: PrioritizationBucket;
  order: number;
  title: string;
  description: string;
  itemType: PrioritizationItemType;
}

export interface PrioritizationBucketGroup {
  bucket: PrioritizationBucketDefinition;
  items: PrioritizationItem[];
}

export interface StationScanSection {
  id: string;
  title: string;
  description: string;
  checklistItems: string[];
}

export interface CapturePrefillRequest {
  employeeDisplayName: string;
  station: string;
  encounterType: EncounterType | null;
  summaryShort: string;
  tagsText: string;
  followUpNeeded: boolean;
  followUpSuggestedDate: string;
}

export interface PrioritizationSummary {
  totalItems: number;
  openItems: number;
  inProgressItems: number;
  employeeItems: number;
  stationItems: number;
  executionRecords: number;
}

export interface PrioritizationDerivedState {
  items: PrioritizationItem[];
  usedPrototypeFallback: boolean;
}

export type {
  DailyPrioritizationState,
  PrioritizationExecutionRecord,
  PrioritizationItemOverride,
  PrioritizationRosterRecord,
  PrioritizationSettings,
  PrioritizationStationRecord,
  PrioritizationStatus,
  StationRiskLevel,
};
