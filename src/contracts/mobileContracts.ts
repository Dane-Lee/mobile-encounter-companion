export const MOBILE_CAPTURE_SCHEMA_VERSION = '1.0.0';
export const MOBILE_CAPTURE_EXPORT_SCHEMA_VERSION = '1.0.0';
export const MOBILE_WEEK_SNAPSHOT_SCHEMA_VERSION = '1.0.0';
export const MOBILE_COMPANION_SOURCE = 'mobile_companion' as const;
export const MOBILE_WEEK_SNAPSHOT_GENERATOR = 'desktop_app' as const;

export type CaptureStatus =
  | 'draft'
  | 'ready_for_export'
  | 'exported'
  | 'imported'
  | 'import_failed'
  | 'archived';

export type TransferStatus =
  | 'local_only'
  | 'queued_for_export'
  | 'export_package_created'
  | 'transferred_to_desktop'
  | 'desktop_import_confirmed';

export type EmployeeMatchConfidence = 'exact' | 'likely' | 'manual' | 'unknown';
export type NoteType = 'typed' | 'voice_to_text' | 'voice_audio' | 'mixed';
export type FollowUpPriority = 'low' | 'normal' | 'high' | null;
// Tracks local package lineage on the device. This is separate from package.isCurrentWeek,
// which describes the calendar week represented by the imported desktop snapshot.
export type SnapshotStatus = 'current' | 'superseded' | 'archived';

export interface MobileEncounterCapture {
  schemaVersion: string;
  recordType: 'mobile_encounter_capture';
  captureId: string;
  source: 'mobile_companion';
  captureStatus: CaptureStatus;
  transferStatus: TransferStatus;
  exportBatchId: string | null;
  desktopImportBatchId: string | null;
  desktopRecordId: string | null;
  importedAt: string | null;
  importError: string | null;
  employeeDisplayName: string;
  employeeId: string | null;
  employeeMatchConfidence: EmployeeMatchConfidence;
  department: string | null;
  station: string | null;
  encounterType: string;
  encounterSubtype: string | null;
  encounterDate: string;
  encounterTime: string;
  occurredAt: string;
  capturedAt: string;
  timezone: string;
  summaryShort: string;
  summaryStructured: Record<string, unknown> | null;
  tags: string[];
  noteType: NoteType;
  voiceTranscript: string | null;
  audioFileRef: string | null;
  followUpNeeded: boolean;
  followUpPriority: FollowUpPriority;
  followUpReason: string | null;
  followUpSuggestedDate: string | null;
  linkedPriorEncounterId: string | null;
  createdOnDeviceAt: string;
  updatedOnDeviceAt: string;
}

export interface MobileCaptureExportPackage {
  schemaVersion: string;
  packageType: 'mobile_capture_export';
  packageId: string;
  generatedAt: string;
  timezone: string;
  recordCount: number;
  records: MobileEncounterCapture[];
}

export interface WeekSummary {
  totalCompletedEncounters: number;
  totalScheduledReminders: number;
  totalOverdueReminders: number;
  totalFollowUpsDue: number;
  daysWithActivityCount: number;
}

export interface CompletedEncounterItem {
  desktopEncounterId: string;
  employeeDisplayName: string;
  encounterType: string;
  summaryShort: string;
  time: string;
}

export interface ReminderItem {
  desktopReminderId: string;
  title: string;
  relatedEmployeeDisplayName: string | null;
  dueDate: string;
  dueTime: string | null;
  status: 'scheduled' | 'overdue' | 'completed';
  priority: string | null;
  summaryShort: string | null;
}

export interface OverdueReminderItem {
  desktopReminderId: string;
  title: string;
  relatedEmployeeDisplayName: string | null;
  dueDate: string;
  dueTime: string | null;
  status: 'overdue';
  priority: string | null;
  summaryShort: string | null;
}

export interface MobileWeekSnapshotDay {
  date: string;
  dayLabel: string;
  isToday: boolean;
  completedEncounterCount: number;
  completedEncounterItems: CompletedEncounterItem[];
  scheduledReminderCount: number;
  scheduledReminderItems: ReminderItem[];
  overdueReminderCount: number;
  overdueReminderItems: OverdueReminderItem[];
  followUpCount: number;
  notes: string | null;
}

export interface MobileWeekSnapshotPackage {
  schemaVersion: string;
  packageType: 'mobile_week_snapshot';
  packageId: string;
  generatedBy: 'desktop_app';
  generatedAt: string;
  timezone: string;
  weekStartDate: string;
  weekEndDate: string;
  isCurrentWeek: boolean;
  desktopDataVersion: string | null;
  weekSummary: WeekSummary;
  days: MobileWeekSnapshotDay[];
}

export interface StoredMobileWeekSnapshot {
  localWeekSnapshotId: string;
  importedToMobileAt: string;
  snapshotStatus: SnapshotStatus;
  // selectedForDisplay controls which imported week the user is currently viewing.
  selectedForDisplay: boolean;
  package: MobileWeekSnapshotPackage;
}

export interface CaptureFormValues {
  employeeDisplayName: string;
  encounterType: string;
  summaryShort: string;
  tagsText: string;
  followUpNeeded: boolean;
  followUpSuggestedDate: string;
}

export interface VersionInfo {
  mobileCaptureRecordSchemaVersion: string;
  mobileCaptureExportSchemaVersion: string;
  mobileWeekSnapshotSchemaVersion: string;
}

export const PACKAGE_VERSION_INFO: VersionInfo = {
  mobileCaptureRecordSchemaVersion: MOBILE_CAPTURE_SCHEMA_VERSION,
  mobileCaptureExportSchemaVersion: MOBILE_CAPTURE_EXPORT_SCHEMA_VERSION,
  mobileWeekSnapshotSchemaVersion: MOBILE_WEEK_SNAPSHOT_SCHEMA_VERSION,
};

export const ENCOUNTER_TYPE_OPTIONS = [
  'Check-in',
  'Coaching',
  'Recognition',
  'Follow-up',
  'Incident',
  'Support',
];
