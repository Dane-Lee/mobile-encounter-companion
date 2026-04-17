import {
  MOBILE_WEEK_SNAPSHOT_GENERATOR,
  MOBILE_WEEK_SNAPSHOT_SCHEMA_VERSION,
  type MobileEncounterCapture,
  type MobileWeekSnapshotDay,
  type StoredMobileWeekSnapshot,
} from '../contracts/mobileContracts';
import { normalizeEncounterType, type EncounterType } from '../contracts/encounterTypes';
import type {
  DailyPrioritizationState,
  PrioritizationExecutionRecord,
  PrioritizationSettings,
} from '../contracts/prioritizationContracts';
import { getCurrentTimezone, toLocalDateString } from '../lib/dateTime';
import type { SyncConfig } from './syncConfig';
import type {
  DailyPrioritizationExecutionSyncRecord,
  DailyPrioritizationStateSyncRecord,
  MobileCaptureEntrySyncRecord,
  PrioritizationSettingsSyncRecord,
  WeeklySnapshotActivity,
  WeeklySnapshotCompletedEncounter,
  WeeklySnapshotReminder,
  WeeklySnapshotSyncRecord,
} from './syncContracts';

export const withCaptureSyncDefaults = (
  capture: MobileEncounterCapture,
): MobileEncounterCapture => {
  const nextSyncStatus = capture.syncStatus ?? 'local_only';
  const nextSyncError = capture.syncError ?? null;
  const nextSyncRecordId = capture.syncRecordId ?? null;
  const nextSyncUpdatedAt = capture.syncUpdatedAt ?? null;
  const nextImportResolution = capture.importResolution ?? null;

  if (
    nextSyncStatus === capture.syncStatus &&
    nextSyncError === capture.syncError &&
    nextSyncRecordId === capture.syncRecordId &&
    nextSyncUpdatedAt === capture.syncUpdatedAt &&
    nextImportResolution === capture.importResolution
  ) {
    return capture;
  }

  return {
    ...capture,
    syncStatus: nextSyncStatus,
    syncError: nextSyncError,
    syncRecordId: nextSyncRecordId,
    syncUpdatedAt: nextSyncUpdatedAt,
    importResolution: nextImportResolution,
  };
};

const buildCaptureOptionsJson = (capture: MobileEncounterCapture) => {
  const options: Record<string, unknown> = {};

  if (capture.tags.length > 0) {
    options.tags = capture.tags;
  }

  if (capture.encounterSubtype) {
    options.encounter_subtype = capture.encounterSubtype;
  }

  if (capture.department) {
    options.department = capture.department;
  }

  if (capture.station) {
    options.station = capture.station;
  }

  if (capture.followUpSuggestedDate) {
    options.follow_up_suggested_date = capture.followUpSuggestedDate;
  }

  return Object.keys(options).length > 0 ? options : null;
};

export const mapCaptureToMobileCaptureEntrySyncRecord = (
  capture: MobileEncounterCapture,
  config: SyncConfig,
): MobileCaptureEntrySyncRecord => ({
  id: capture.syncRecordId ?? capture.captureId,
  user_id: config.userId ?? '',
  worksite_id: config.worksiteId ?? '',
  source_app: 'mobile',
  sync_record_type: 'mobile_capture_entry',
  device_id: config.deviceId,
  version: config.version,
  local_mobile_id: capture.captureId,
  created_at: capture.createdOnDeviceAt,
  updated_at: capture.updatedOnDeviceAt,
  entry_date: capture.encounterDate,
  employee_name: capture.employeeDisplayName || null,
  employee_ref: capture.employeeId,
  encounter_type: capture.encounterType,
  activity_type: null,
  summary_text: capture.summaryShort,
  options_json: buildCaptureOptionsJson(capture),
  follow_up_flag: capture.followUpNeeded,
  voice_note_text: capture.voiceTranscript,
  sync_status: capture.syncStatus,
  imported_desktop_record_id: capture.desktopRecordId,
  import_resolution: capture.importResolution,
});

export const applyUploadedCaptureSyncRecord = (
  capture: MobileEncounterCapture,
  syncedRecord: MobileCaptureEntrySyncRecord,
): MobileEncounterCapture => ({
  ...capture,
  syncStatus: syncedRecord.sync_status,
  syncError: null,
  syncRecordId: syncedRecord.id,
  syncUpdatedAt: syncedRecord.updated_at,
  desktopRecordId: syncedRecord.imported_desktop_record_id,
  importResolution: syncedRecord.import_resolution,
});

export const applyCaptureSyncError = (
  capture: MobileEncounterCapture,
  message: string,
): MobileEncounterCapture => ({
  ...capture,
  syncStatus: 'sync_error',
  syncError: message,
  syncUpdatedAt: new Date().toISOString(),
});

const requireEncounterType = (value: string): EncounterType => {
  const normalizedEncounterType = normalizeEncounterType(value);

  if (!normalizedEncounterType) {
    throw new Error(`Unsupported encounter type in weekly snapshot sync record: ${value}`);
  }

  return normalizedEncounterType;
};

const buildCompletedEncounterSummary = (encounter: WeeklySnapshotCompletedEncounter) => {
  const parts = [encounter.category, encounter.status]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim());

  if (encounter.is_follow_up) {
    parts.push('Follow-up');
  }

  if (encounter.is_add_on) {
    parts.push('Add-on');
  }

  return parts.length > 0 ? parts.join(' | ') : encounter.encounter_type;
};

const buildReminderSummary = (reminder: WeeklySnapshotReminder) => {
  const parts = [reminder.reminder_kind, reminder.workflow_key]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim());

  if (reminder.reschedule_count > 0) {
    parts.push(`Rescheduled ${reminder.reschedule_count}x`);
  }

  if (reminder.original_scheduled_date) {
    parts.push(`Original ${reminder.original_scheduled_date}`);
  }

  return parts.length > 0 ? parts.join(' | ') : null;
};

const buildActivityNotes = (activities: WeeklySnapshotActivity[]) => {
  if (activities.length === 0) {
    return null;
  }

  return activities
    .map((activity) =>
      activity.related_employee_names.length > 0
        ? `${activity.activity_type} (${activity.related_employee_names.join(', ')})`
        : activity.activity_type,
    )
    .join(' | ');
};

const isCurrentWeekRange = (weekStartDate: string, weekEndDate: string) => {
  const today = toLocalDateString(new Date());
  return today >= weekStartDate && today <= weekEndDate;
};

const buildSnapshotDays = (record: WeeklySnapshotSyncRecord): MobileWeekSnapshotDay[] => {
  const completedByDate = new Map<string, WeeklySnapshotCompletedEncounter[]>();
  const scheduledByDate = new Map<string, WeeklySnapshotReminder[]>();
  const overdueByDate = new Map<string, WeeklySnapshotReminder[]>();
  const activitiesByDate = new Map<string, WeeklySnapshotActivity[]>();

  record.completed_encounters.forEach((encounter) => {
    const entries = completedByDate.get(encounter.date) ?? [];
    entries.push(encounter);
    completedByDate.set(encounter.date, entries);
  });

  record.reminders.forEach((reminder) => {
    const targetMap =
      reminder.overdue_flag || reminder.status.toLowerCase() === 'overdue'
        ? overdueByDate
        : scheduledByDate;
    const entries = targetMap.get(reminder.scheduled_date) ?? [];
    entries.push(reminder);
    targetMap.set(reminder.scheduled_date, entries);
  });

  record.activities.forEach((activity) => {
    const entries = activitiesByDate.get(activity.date) ?? [];
    entries.push(activity);
    activitiesByDate.set(activity.date, entries);
  });

  return record.day_summaries.map((daySummary) => {
    const completedItems = completedByDate.get(daySummary.date) ?? [];
    const scheduledItems = scheduledByDate.get(daySummary.date) ?? [];
    const overdueItems = overdueByDate.get(daySummary.date) ?? [];
    const activityItems = activitiesByDate.get(daySummary.date) ?? [];

    return {
      date: daySummary.date,
      dayLabel: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
        new Date(`${daySummary.date}T00:00:00`),
      ),
      isToday: toLocalDateString(new Date()) === daySummary.date,
      completedEncounterCount: daySummary.completed_encounter_count,
      completedEncounterItems: completedItems.map((item) => ({
        desktopEncounterId: item.encounter_id,
        employeeDisplayName: item.employee_name,
        encounterType: requireEncounterType(item.encounter_type),
        summaryShort: buildCompletedEncounterSummary(item),
        time: item.is_follow_up ? 'Follow-up' : 'Completed',
      })),
      scheduledReminderCount: daySummary.pending_reminder_count,
      scheduledReminderItems: scheduledItems.map((item) => ({
        desktopReminderId: item.reminder_id,
        title: item.reminder_type,
        relatedEmployeeDisplayName: item.employee_name,
        dueDate: item.scheduled_date,
        dueTime: null,
        status: 'scheduled',
        priority: item.reminder_kind,
        summaryShort: buildReminderSummary(item),
      })),
      overdueReminderCount: daySummary.overdue_reminder_count,
      overdueReminderItems: overdueItems.map((item) => ({
        desktopReminderId: item.reminder_id,
        title: item.reminder_type,
        relatedEmployeeDisplayName: item.employee_name,
        dueDate: item.scheduled_date,
        dueTime: null,
        status: 'overdue',
        priority: item.reminder_kind,
        summaryShort: buildReminderSummary(item),
      })),
      followUpCount: daySummary.workflow_reminder_count,
      notes: buildActivityNotes(activityItems),
    };
  });
};

export const mapWeeklySnapshotSyncRecordToStoredSnapshot = (
  record: WeeklySnapshotSyncRecord,
  existingSnapshots: StoredMobileWeekSnapshot[],
): StoredMobileWeekSnapshot => {
  const existingSnapshot = existingSnapshots.find((snapshot) => snapshot.syncRecordId === record.id);
  const importedToMobileAt = new Date().toISOString();
  const days = buildSnapshotDays(record);
  const localWeekSnapshotId = existingSnapshot?.localWeekSnapshotId ?? `sync-${record.id}`;
  const hasExistingSelectedSnapshot = existingSnapshots.some(
    (snapshot) => snapshot.selectedForDisplay && snapshot.syncOrigin === 'backend',
  );

  return {
    localWeekSnapshotId,
    importedToMobileAt,
    snapshotStatus: record.sync_status === 'replaced' ? 'superseded' : 'current',
    syncOrigin: 'backend',
    syncStatus: record.sync_status,
    syncError: null,
    syncRecordId: record.id,
    syncUpdatedAt: importedToMobileAt,
    syncUserId: record.user_id,
    syncWorksiteId: record.worksite_id,
    syncVersion: record.version,
    selectedForDisplay:
      record.sync_status === 'published' &&
      (existingSnapshot?.selectedForDisplay === true ||
        (!hasExistingSelectedSnapshot &&
          isCurrentWeekRange(record.week_start_date, record.week_end_date))),
    package: {
      schemaVersion: MOBILE_WEEK_SNAPSHOT_SCHEMA_VERSION,
      packageType: 'mobile_week_snapshot',
      packageId: record.id,
      generatedBy: MOBILE_WEEK_SNAPSHOT_GENERATOR,
      generatedAt: record.generated_at,
      timezone: getCurrentTimezone(),
      weekStartDate: record.week_start_date,
      weekEndDate: record.week_end_date,
      isCurrentWeek: isCurrentWeekRange(record.week_start_date, record.week_end_date),
      desktopDataVersion: record.version,
      weekSummary: {
        totalCompletedEncounters: record.weekly_summary.total_completed_encounters,
        totalScheduledReminders: record.weekly_summary.total_pending_reminders,
        totalOverdueReminders: record.weekly_summary.total_overdue_reminders,
        totalFollowUpsDue: record.weekly_summary.total_workflow_reminders,
        daysWithActivityCount: record.day_summaries.filter(
          (day) =>
            day.completed_encounter_count > 0 ||
            day.pending_reminder_count > 0 ||
            day.overdue_reminder_count > 0 ||
            day.workflow_reminder_count > 0,
        ).length,
      },
      days,
    },
  };
};

export const withStoredWeekSnapshotSyncDefaults = (
  snapshot: StoredMobileWeekSnapshot,
): StoredMobileWeekSnapshot => {
  const nextSyncOrigin = snapshot.syncOrigin ?? 'manual';
  const nextSyncStatus = snapshot.syncStatus ?? 'not_published';
  const nextSyncError = snapshot.syncError ?? null;
  const nextSyncRecordId = snapshot.syncRecordId ?? null;
  const nextSyncUpdatedAt = snapshot.syncUpdatedAt ?? snapshot.importedToMobileAt;
  const nextSyncUserId = snapshot.syncUserId ?? null;
  const nextSyncWorksiteId = snapshot.syncWorksiteId ?? null;
  const nextSyncVersion = snapshot.syncVersion ?? snapshot.package.desktopDataVersion;

  if (
    nextSyncOrigin === snapshot.syncOrigin &&
    nextSyncStatus === snapshot.syncStatus &&
    nextSyncError === snapshot.syncError &&
    nextSyncRecordId === snapshot.syncRecordId &&
    nextSyncUpdatedAt === snapshot.syncUpdatedAt &&
    nextSyncUserId === snapshot.syncUserId &&
    nextSyncWorksiteId === snapshot.syncWorksiteId &&
    nextSyncVersion === snapshot.syncVersion
  ) {
    return snapshot;
  }

  return {
    ...snapshot,
    syncOrigin: nextSyncOrigin,
    syncStatus: nextSyncStatus,
    syncError: nextSyncError,
    syncRecordId: nextSyncRecordId,
    syncUpdatedAt: nextSyncUpdatedAt,
    syncUserId: nextSyncUserId,
    syncWorksiteId: nextSyncWorksiteId,
    syncVersion: nextSyncVersion,
  };
};

export const withPrioritizationSettingsSyncDefaults = (
  settings: PrioritizationSettings,
): PrioritizationSettings => ({
  ...settings,
  syncStatus: settings.syncStatus ?? 'local_only',
  syncError: settings.syncError ?? null,
  syncRecordId: settings.syncRecordId ?? null,
  syncUpdatedAt: settings.syncUpdatedAt ?? null,
});

export const withDailyPrioritizationStateSyncDefaults = (
  state: DailyPrioritizationState,
): DailyPrioritizationState => ({
  ...state,
  syncStatus: state.syncStatus ?? 'local_only',
  syncError: state.syncError ?? null,
  syncRecordId: state.syncRecordId ?? null,
  syncUpdatedAt: state.syncUpdatedAt ?? null,
});

export const mapPrioritizationSettingsToSyncRecord = (
  settings: PrioritizationSettings,
  config: SyncConfig,
): PrioritizationSettingsSyncRecord => ({
  id:
    settings.syncRecordId ??
    `prioritization-settings-${config.userId ?? 'unknown'}-${config.worksiteId ?? 'unknown'}`,
  user_id: config.userId ?? '',
  worksite_id: config.worksiteId ?? '',
  source_app: 'mobile',
  sync_record_type: 'prioritization_settings',
  station_risk_map: settings.stationRiskMap,
  updated_at: settings.updatedAt,
  version: config.version,
});

const mapExecutionRecordToSyncRecord = (
  executionRecord: PrioritizationExecutionRecord,
): DailyPrioritizationExecutionSyncRecord => ({
  execution_id: executionRecord.executionId,
  source_prioritization_item_id: executionRecord.sourcePrioritizationItemId,
  employee_name: executionRecord.employeeName,
  station_name: executionRecord.stationName,
  checklist_sections_completed: executionRecord.checklistSectionsCompleted,
  recommended_next_step: executionRecord.recommendedNextStep,
  interaction_occurred: executionRecord.interactionOccurred,
  ready_to_record: executionRecord.readyToRecord,
  status: executionRecord.status,
  created_at: executionRecord.createdAt,
  updated_at: executionRecord.updatedAt,
});

export const mapDailyPrioritizationStateToSyncRecord = (
  state: DailyPrioritizationState,
  config: SyncConfig,
): DailyPrioritizationStateSyncRecord => ({
  id:
    state.syncRecordId ??
    `daily-prioritization-state-${config.userId ?? 'unknown'}-${config.worksiteId ?? 'unknown'}-${state.prioritizationDate}`,
  user_id: config.userId ?? '',
  worksite_id: config.worksiteId ?? '',
  source_app: 'mobile',
  sync_record_type: 'daily_prioritization_state',
  prioritization_date: state.prioritizationDate,
  roster_names: state.rosterNames,
  item_overrides: state.itemOverrides.map((override) => ({
    item_id: override.itemId,
    status: override.status,
    notes: override.notes,
    updated_at: override.updatedAt,
  })),
  execution_records: state.executionRecords.map(mapExecutionRecordToSyncRecord),
  updated_at: state.updatedAt,
  version: config.version,
});

export const applyPrioritizationSettingsSyncRecord = (
  settings: PrioritizationSettings,
  record: PrioritizationSettingsSyncRecord,
): PrioritizationSettings => ({
  ...settings,
  stationRiskMap: record.station_risk_map,
  updatedAt: record.updated_at,
  syncStatus: 'synced',
  syncError: null,
  syncRecordId: record.id,
  syncUpdatedAt: record.updated_at,
});

export const applyDailyPrioritizationStateSyncRecord = (
  state: DailyPrioritizationState,
  record: DailyPrioritizationStateSyncRecord,
): DailyPrioritizationState => ({
  ...state,
  prioritizationDate: record.prioritization_date,
  rosterNames: record.roster_names,
  itemOverrides: record.item_overrides.map((override) => ({
    itemId: override.item_id,
    status: override.status,
    notes: override.notes,
    updatedAt: override.updated_at,
  })),
  executionRecords: record.execution_records.map((executionRecord) => ({
    executionId: executionRecord.execution_id,
    sourcePrioritizationItemId: executionRecord.source_prioritization_item_id,
    employeeName: executionRecord.employee_name,
    stationName: executionRecord.station_name,
    checklistSectionsCompleted: executionRecord.checklist_sections_completed,
    recommendedNextStep: executionRecord.recommended_next_step as EncounterType | null,
    interactionOccurred: executionRecord.interaction_occurred,
    readyToRecord: executionRecord.ready_to_record,
    status: executionRecord.status,
    createdAt: executionRecord.created_at,
    updatedAt: executionRecord.updated_at,
  })),
  updatedAt: record.updated_at,
  syncStatus: 'synced',
  syncError: null,
  syncRecordId: record.id,
  syncUpdatedAt: record.updated_at,
});

export const applyPrioritizationSettingsSyncError = (
  settings: PrioritizationSettings,
  message: string,
): PrioritizationSettings => ({
  ...settings,
  syncStatus: 'sync_error',
  syncError: message,
  syncUpdatedAt: new Date().toISOString(),
});

export const applyDailyPrioritizationStateSyncError = (
  state: DailyPrioritizationState,
  message: string,
): DailyPrioritizationState => ({
  ...state,
  syncStatus: 'sync_error',
  syncError: message,
  syncUpdatedAt: new Date().toISOString(),
});
