export type WeeklySnapshotSyncStatus =
  | 'not_published'
  | 'published'
  | 'replaced'
  | 'sync_error';

export type MobileCaptureEntrySyncStatus =
  | 'local_only'
  | 'uploaded'
  | 'imported_to_desktop'
  | 'resolved'
  | 'sync_error';

export type PrioritizationStationRiskLevel = 'low' | 'medium' | 'high' | 'none';
export type PrioritizationItemStatus =
  | 'open'
  | 'in_progress'
  | 'completed'
  | 'deferred'
  | 'unable_to_complete'
  | 'urgent';

export interface WeeklySnapshotCategoryBreakdownItem {
  key: string;
  count: number;
}

export interface MobileWeeklySnapshotDaySummaryResponse {
  date: string;
  completed_encounter_count: number;
  pending_reminder_count: number;
  overdue_reminder_count: number;
  workflow_reminder_count: number;
}

export interface MobileWeeklySnapshotCompletedEncounterResponse {
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

export interface MobileWeeklySnapshotReminderResponse {
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

export interface MobileWeeklySnapshotActivityResponse {
  activity_id: string;
  date: string;
  activity_type: string;
  related_employee_names: string[];
}

export interface MobileWeeklySnapshotResponse {
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
    category_breakdown: WeeklySnapshotCategoryBreakdownItem[] | null;
  };
  day_summaries: MobileWeeklySnapshotDaySummaryResponse[];
  completed_encounters: MobileWeeklySnapshotCompletedEncounterResponse[];
  reminders: MobileWeeklySnapshotReminderResponse[];
  activities: MobileWeeklySnapshotActivityResponse[];
}

export interface MobileCaptureEntryRequest {
  user_id: string;
  worksite_id: string;
  source_app?: 'mobile';
  sync_record_type?: 'mobile_capture_entry';
  local_mobile_id: string;
  created_at: string;
  entry_date: string;
  device_id?: string | null;
  version?: string | null;
  employee_name?: string | null;
  employee_ref?: string | null;
  encounter_type?: string | null;
  activity_type?: string | null;
  summary_text?: string;
  options_json?: Record<string, unknown> | null;
  follow_up_flag?: boolean;
  voice_note_text?: string | null;
}

export interface MobileCaptureEntryResponse extends MobileCaptureEntryRequest {
  id?: string | number | null;
  updated_at?: string | null;
  sync_status: MobileCaptureEntrySyncStatus;
  imported_desktop_record_id?: string | null;
  import_resolution?: string | null;
  source_app?: 'mobile';
  sync_record_type?: 'mobile_capture_entry';
}

export interface PrioritizationSettingsRequest {
  user_id: string;
  worksite_id: string;
  station_risk_map: Record<string, PrioritizationStationRiskLevel>;
  updated_at: string;
  version: string;
}

export interface PrioritizationSettingsResponse extends PrioritizationSettingsRequest {
  id?: string | number | null;
  source_app?: 'mobile';
  sync_record_type?: 'prioritization_settings';
}

export interface DailyPrioritizationItemOverrideResponse {
  item_id: string;
  status: PrioritizationItemStatus;
  notes: string | null;
  updated_at: string;
}

export interface DailyPrioritizationExecutionResponse {
  execution_id: string;
  source_prioritization_item_id: string;
  employee_name: string | null;
  station_name: string | null;
  checklist_sections_completed: string[];
  recommended_next_step: string | null;
  interaction_occurred: boolean;
  ready_to_record: boolean;
  status: PrioritizationItemStatus;
  created_at: string;
  updated_at: string;
}

export interface DailyPrioritizationStateRequest {
  user_id: string;
  worksite_id: string;
  prioritization_date: string;
  roster_names: string[];
  item_overrides: DailyPrioritizationItemOverrideResponse[];
  execution_records: DailyPrioritizationExecutionResponse[];
  updated_at?: string;
  version?: string;
}

export interface DailyPrioritizationStateResponse extends DailyPrioritizationStateRequest {
  id?: string | number | null;
  source_app?: 'mobile';
  sync_record_type?: 'daily_prioritization_state';
}

export interface StoredSyncCaptureEntry extends MobileCaptureEntryRequest {
  sync_status: 'local_only' | 'uploaded' | 'sync_error';
  id?: string | number | null;
  updated_at?: string | null;
  sync_error?: string | null;
}

export interface StoredSyncPrioritizationSettings extends PrioritizationSettingsResponse {
  storage_key: 'current';
}
