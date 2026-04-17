import type {
  DailyPrioritizationExecutionSyncRecord,
  DailyPrioritizationItemOverrideSyncRecord,
  DailyPrioritizationStateSyncRecord,
  MobileCaptureEntrySyncRecord,
  PrioritizationSettingsSyncRecord,
  WeeklySnapshotActivity,
  WeeklySnapshotCompletedEncounter,
  WeeklySnapshotDaySummary,
  WeeklySnapshotReminder,
  WeeklySnapshotSyncRecord,
} from './syncContracts';
import {
  PRIORITIZATION_STATUSES,
  STATION_RISK_LEVELS,
} from '../contracts/prioritizationContracts';

interface ValidationSuccess<T> {
  ok: true;
  value: T;
}

interface ValidationFailure {
  ok: false;
  errors: string[];
}

export type SyncValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null =>
  value === null || isString(value);
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

const createFailure = (...errors: string[]): ValidationFailure => ({
  ok: false,
  errors,
});

const parseIsoDate = (value: string) => {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
};

const addUtcDays = (date: Date, days: number) => new Date(date.getTime() + days * ONE_DAY_IN_MS);

const validateCompletedEncounter = (value: unknown): value is WeeklySnapshotCompletedEncounter =>
  isObject(value) &&
  isString(value.encounter_id) &&
  isString(value.date) &&
  parseIsoDate(value.date) !== null &&
  isString(value.employee_name) &&
  isString(value.encounter_type) &&
  isNullableString(value.category) &&
  isString(value.status) &&
  isNullableString(value.chain_id) &&
  isNullableString(value.linked_to_encounter_id) &&
  isBoolean(value.is_follow_up) &&
  isBoolean(value.is_add_on);

const validateReminder = (value: unknown): value is WeeklySnapshotReminder =>
  isObject(value) &&
  isString(value.reminder_id) &&
  isString(value.scheduled_date) &&
  parseIsoDate(value.scheduled_date) !== null &&
  isNullableString(value.employee_name) &&
  isString(value.reminder_type) &&
  isString(value.status) &&
  isBoolean(value.overdue_flag) &&
  isNullableString(value.chain_id) &&
  isNullableString(value.linked_to_encounter_id) &&
  isNumber(value.reschedule_count) &&
  isNullableString(value.original_scheduled_date) &&
  (value.original_scheduled_date === null || parseIsoDate(value.original_scheduled_date) !== null) &&
  isNullableString(value.reminder_kind) &&
  isNullableString(value.workflow_key);

const validateActivity = (value: unknown): value is WeeklySnapshotActivity =>
  isObject(value) &&
  isString(value.activity_id) &&
  isString(value.date) &&
  parseIsoDate(value.date) !== null &&
  isString(value.activity_type) &&
  isStringArray(value.related_employee_names);

const validateDaySummary = (value: unknown): value is WeeklySnapshotDaySummary =>
  isObject(value) &&
  isString(value.date) &&
  parseIsoDate(value.date) !== null &&
  isNumber(value.completed_encounter_count) &&
  isNumber(value.pending_reminder_count) &&
  isNumber(value.overdue_reminder_count) &&
  isNumber(value.workflow_reminder_count);

const validatePrioritizationItemOverride = (
  value: unknown,
): value is DailyPrioritizationItemOverrideSyncRecord =>
  isObject(value) &&
  isString(value.item_id) &&
  isString(value.updated_at) &&
  (value.notes === null || isString(value.notes)) &&
  isString(value.status) &&
  PRIORITIZATION_STATUSES.includes(value.status as (typeof PRIORITIZATION_STATUSES)[number]);

const validatePrioritizationExecution = (
  value: unknown,
): value is DailyPrioritizationExecutionSyncRecord =>
  isObject(value) &&
  isString(value.execution_id) &&
  isString(value.source_prioritization_item_id) &&
  isNullableString(value.employee_name) &&
  isNullableString(value.station_name) &&
  isStringArray(value.checklist_sections_completed) &&
  isNullableString(value.recommended_next_step) &&
  isBoolean(value.interaction_occurred) &&
  isBoolean(value.ready_to_record) &&
  isString(value.status) &&
  PRIORITIZATION_STATUSES.includes(value.status as (typeof PRIORITIZATION_STATUSES)[number]) &&
  isString(value.created_at) &&
  isString(value.updated_at);

export const validateMobileCaptureEntrySyncRecord = (
  value: unknown,
): SyncValidationResult<MobileCaptureEntrySyncRecord> => {
  if (!isObject(value)) {
    return createFailure('Mobile capture sync record must be an object.');
  }

  const valid =
    isString(value.id) &&
    isString(value.user_id) &&
    isString(value.worksite_id) &&
    value.source_app === 'mobile' &&
    value.sync_record_type === 'mobile_capture_entry' &&
    isNullableString(value.device_id) &&
    isNullableString(value.version) &&
    isString(value.local_mobile_id) &&
    isString(value.created_at) &&
    isString(value.updated_at) &&
    isString(value.entry_date) &&
    parseIsoDate(value.entry_date) !== null &&
    isNullableString(value.employee_name) &&
    isNullableString(value.employee_ref) &&
    (value.encounter_type === null || isString(value.encounter_type)) &&
    isNullableString(value.activity_type) &&
    isString(value.summary_text) &&
    (value.options_json === null || isObject(value.options_json)) &&
    isBoolean(value.follow_up_flag) &&
    isNullableString(value.voice_note_text) &&
    ['local_only', 'uploaded', 'imported_to_desktop', 'resolved', 'sync_error'].includes(
      String(value.sync_status),
    ) &&
    isNullableString(value.imported_desktop_record_id) &&
    (value.import_resolution === null ||
      ['pending_review', 'accepted', 'converted', 'rejected'].includes(
        String(value.import_resolution),
      ));

  return valid
    ? { ok: true, value: value as unknown as MobileCaptureEntrySyncRecord }
    : createFailure('Mobile capture sync record schema is invalid.');
};

export const validateWeeklySnapshotSyncRecord = (
  value: unknown,
): SyncValidationResult<WeeklySnapshotSyncRecord> => {
  if (!isObject(value)) {
    return createFailure('Weekly snapshot sync record must be an object.');
  }

  if (!Array.isArray(value.day_summaries) || !value.day_summaries.every(validateDaySummary)) {
    return createFailure('Weekly snapshot day_summaries are invalid.');
  }

  if (
    !Array.isArray(value.completed_encounters) ||
    !value.completed_encounters.every(validateCompletedEncounter)
  ) {
    return createFailure('Weekly snapshot completed_encounters are invalid.');
  }

  if (!Array.isArray(value.reminders) || !value.reminders.every(validateReminder)) {
    return createFailure('Weekly snapshot reminders are invalid.');
  }

  if (!Array.isArray(value.activities) || !value.activities.every(validateActivity)) {
    return createFailure('Weekly snapshot activities are invalid.');
  }

  const valid =
    isString(value.id) &&
    isString(value.user_id) &&
    isString(value.worksite_id) &&
    value.source_app === 'desktop' &&
    value.sync_record_type === 'weekly_snapshot' &&
    isString(value.generated_at) &&
    isString(value.week_start_date) &&
    isString(value.week_end_date) &&
    isString(value.version) &&
    ['not_published', 'published', 'replaced', 'sync_error'].includes(String(value.sync_status)) &&
    isObject(value.weekly_summary) &&
    isNumber(value.weekly_summary.total_completed_encounters) &&
    isNumber(value.weekly_summary.total_pending_reminders) &&
    isNumber(value.weekly_summary.total_overdue_reminders) &&
    isNumber(value.weekly_summary.total_workflow_reminders) &&
    (value.weekly_summary.category_breakdown === null ||
      (Array.isArray(value.weekly_summary.category_breakdown) &&
        value.weekly_summary.category_breakdown.every(
          (item) => isObject(item) && isString(item.key) && isNumber(item.count),
        )));

  if (!valid) {
    return createFailure('Weekly snapshot sync record schema is invalid.');
  }

  if (value.day_summaries.length !== 7) {
    return createFailure('Weekly snapshot day_summaries must contain exactly 7 days.');
  }

  const weekSummary = value.weekly_summary as {
    total_completed_encounters: number;
    total_pending_reminders: number;
    total_overdue_reminders: number;
    total_workflow_reminders: number;
    category_breakdown: { key: string; count: number }[] | null;
  };
  const weekStartDateValue = value.week_start_date as string;
  const weekEndDateValue = value.week_end_date as string;
  const weekStartDate = parseIsoDate(weekStartDateValue);
  const weekEndDate = parseIsoDate(weekEndDateValue);
  if (!weekStartDate || !weekEndDate) {
    return createFailure('Weekly snapshot week_start_date and week_end_date must use YYYY-MM-DD format.');
  }

  const expectedWeekEndDate = addUtcDays(weekStartDate, 6).toISOString().slice(0, 10);
  if (expectedWeekEndDate !== weekEndDateValue) {
    return createFailure('Weekly snapshot week_start_date and week_end_date must span 7 contiguous days.');
  }

  const actualDates = value.day_summaries.map((day) => day.date);
  if (new Set(actualDates).size !== 7) {
    return createFailure('Weekly snapshot day_summaries dates must be unique.');
  }

  const expectedDates = Array.from({ length: 7 }, (_unused, index) =>
    addUtcDays(weekStartDate, index).toISOString().slice(0, 10),
  );
  const datesMatchRange = expectedDates.every((date, index) => actualDates[index] === date);
  if (!datesMatchRange) {
    return createFailure('Weekly snapshot day_summaries must match the declared week range in order.');
  }

  const totalCompleted = value.day_summaries.reduce(
    (total, day) => total + day.completed_encounter_count,
    0,
  );
  const totalPending = value.day_summaries.reduce(
    (total, day) => total + day.pending_reminder_count,
    0,
  );
  const totalOverdue = value.day_summaries.reduce(
    (total, day) => total + day.overdue_reminder_count,
    0,
  );
  const totalWorkflow = value.day_summaries.reduce(
    (total, day) => total + day.workflow_reminder_count,
    0,
  );

  if (
    weekSummary.total_completed_encounters !== totalCompleted ||
    weekSummary.total_pending_reminders !== totalPending ||
    weekSummary.total_overdue_reminders !== totalOverdue ||
    weekSummary.total_workflow_reminders !== totalWorkflow
  ) {
    return createFailure('Weekly snapshot summary totals do not match the day_summaries data.');
  }

  return { ok: true, value: value as unknown as WeeklySnapshotSyncRecord };
};

export const validatePrioritizationSettingsSyncRecord = (
  value: unknown,
): SyncValidationResult<PrioritizationSettingsSyncRecord> => {
  if (!isObject(value)) {
    return createFailure('Prioritization settings sync record must be an object.');
  }

  const stationRiskMap = value.station_risk_map;
  const validStationRiskMap =
    isObject(stationRiskMap) &&
    Object.values(stationRiskMap).every(
      (riskLevel) =>
        isString(riskLevel) && STATION_RISK_LEVELS.includes(riskLevel as (typeof STATION_RISK_LEVELS)[number]),
    );

  const valid =
    isString(value.id) &&
    isString(value.user_id) &&
    isString(value.worksite_id) &&
    value.source_app === 'mobile' &&
    value.sync_record_type === 'prioritization_settings' &&
    validStationRiskMap &&
    isString(value.updated_at) &&
    isNullableString(value.version);

  return valid
    ? { ok: true, value: value as unknown as PrioritizationSettingsSyncRecord }
    : createFailure('Prioritization settings sync record schema is invalid.');
};

export const validateDailyPrioritizationStateSyncRecord = (
  value: unknown,
): SyncValidationResult<DailyPrioritizationStateSyncRecord> => {
  if (!isObject(value)) {
    return createFailure('Daily prioritization state sync record must be an object.');
  }

  if (!Array.isArray(value.roster_names) || !value.roster_names.every(isString)) {
    return createFailure('Daily prioritization roster_names are invalid.');
  }

  if (!Array.isArray(value.item_overrides) || !value.item_overrides.every(validatePrioritizationItemOverride)) {
    return createFailure('Daily prioritization item_overrides are invalid.');
  }

  if (!Array.isArray(value.execution_records) || !value.execution_records.every(validatePrioritizationExecution)) {
    return createFailure('Daily prioritization execution_records are invalid.');
  }

  const valid =
    isString(value.id) &&
    isString(value.user_id) &&
    isString(value.worksite_id) &&
    value.source_app === 'mobile' &&
    value.sync_record_type === 'daily_prioritization_state' &&
    isString(value.prioritization_date) &&
    parseIsoDate(value.prioritization_date) !== null &&
    isString(value.updated_at) &&
    isNullableString(value.version);

  return valid
    ? { ok: true, value: value as unknown as DailyPrioritizationStateSyncRecord }
    : createFailure('Daily prioritization state sync record schema is invalid.');
};
