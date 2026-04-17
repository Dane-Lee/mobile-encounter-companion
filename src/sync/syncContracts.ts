import type {
  DesktopImportResolution,
  MobileCaptureSyncStatus,
  WeeklySnapshotSyncStatus,
} from '../contracts/mobileContracts';

export type SyncSourceApp = 'desktop' | 'mobile';
export type SyncRecordType =
  | 'mobile_capture_entry'
  | 'weekly_snapshot'
  | 'prioritization_settings'
  | 'daily_prioritization_state';

export interface MobileCaptureEntrySyncRecord {
  id: string;
  user_id: string;
  worksite_id: string;
  source_app: 'mobile';
  sync_record_type: 'mobile_capture_entry';
  device_id: string | null;
  version: string | null;
  local_mobile_id: string;
  created_at: string;
  updated_at: string;
  entry_date: string;
  employee_name: string | null;
  employee_ref: string | null;
  encounter_type: string | null;
  activity_type: string | null;
  summary_text: string;
  options_json: Record<string, unknown> | null;
  follow_up_flag: boolean;
  voice_note_text: string | null;
  sync_status: MobileCaptureSyncStatus;
  imported_desktop_record_id: string | null;
  import_resolution: DesktopImportResolution;
}

export interface WeeklySnapshotCategorySummaryItem {
  key: string;
  count: number;
}

export interface WeeklySnapshotDaySummary {
  date: string;
  completed_encounter_count: number;
  pending_reminder_count: number;
  overdue_reminder_count: number;
  workflow_reminder_count: number;
}

export interface WeeklySnapshotCompletedEncounter {
  encounter_id: string;
  date: string;
  employee_name: string;
  encounter_type: string;
  category: string | null;
  status: string;
  chain_id: string | null;
  linked_to_encounter_id: string | null;
  is_follow_up: boolean;
  is_add_on: boolean;
}

export interface WeeklySnapshotReminder {
  reminder_id: string;
  scheduled_date: string;
  employee_name: string | null;
  reminder_type: string;
  status: string;
  overdue_flag: boolean;
  chain_id: string | null;
  linked_to_encounter_id: string | null;
  reschedule_count: number;
  original_scheduled_date: string | null;
  reminder_kind: string | null;
  workflow_key: string | null;
}

export interface WeeklySnapshotActivity {
  activity_id: string;
  date: string;
  activity_type: string;
  related_employee_names: string[];
}

export interface WeeklySnapshotSyncRecord {
  id: string;
  user_id: string;
  worksite_id: string;
  source_app: 'desktop';
  sync_record_type: 'weekly_snapshot';
  generated_at: string;
  week_start_date: string;
  week_end_date: string;
  version: string;
  sync_status: WeeklySnapshotSyncStatus;
  weekly_summary: {
    total_completed_encounters: number;
    total_pending_reminders: number;
    total_overdue_reminders: number;
    total_workflow_reminders: number;
    category_breakdown: WeeklySnapshotCategorySummaryItem[] | null;
  };
  day_summaries: WeeklySnapshotDaySummary[];
  completed_encounters: WeeklySnapshotCompletedEncounter[];
  reminders: WeeklySnapshotReminder[];
  activities: WeeklySnapshotActivity[];
}

export interface PrioritizationSettingsSyncRecord {
  id: string;
  user_id: string;
  worksite_id: string;
  source_app: 'mobile';
  sync_record_type: 'prioritization_settings';
  station_risk_map: Record<string, 'high' | 'medium' | 'low'>;
  updated_at: string;
  version: string | null;
}

export interface DailyPrioritizationItemOverrideSyncRecord {
  item_id: string;
  status: 'open' | 'in_progress' | 'completed' | 'deferred' | 'unable_to_complete';
  notes: string | null;
  updated_at: string;
}

export interface DailyPrioritizationExecutionSyncRecord {
  execution_id: string;
  source_prioritization_item_id: string;
  employee_name: string | null;
  station_name: string | null;
  checklist_sections_completed: string[];
  recommended_next_step: string | null;
  interaction_occurred: boolean;
  ready_to_record: boolean;
  status: 'open' | 'in_progress' | 'completed' | 'deferred' | 'unable_to_complete';
  created_at: string;
  updated_at: string;
}

export interface DailyPrioritizationStateSyncRecord {
  id: string;
  user_id: string;
  worksite_id: string;
  source_app: 'mobile';
  sync_record_type: 'daily_prioritization_state';
  prioritization_date: string;
  roster_names: string[];
  item_overrides: DailyPrioritizationItemOverrideSyncRecord[];
  execution_records: DailyPrioritizationExecutionSyncRecord[];
  updated_at: string;
  version: string | null;
}
