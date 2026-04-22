import type {
  MobileCaptureExportPackage,
  MobileEncounterCapture,
  MobileWeekSnapshotDay,
  MobileWeekSnapshotPackage,
  OverdueReminderItem,
  ReminderItem,
} from './mobileContracts';
import { isEncounterType } from './encounterTypes';

interface ValidationSuccess<T> {
  ok: true;
  value: T;
}

interface ValidationFailure {
  ok: false;
  errors: string[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isNullableString = (value: unknown): value is string | null =>
  value === null || isString(value);
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

const createFailure = (...errors: string[]): ValidationFailure => ({
  ok: false,
  errors,
});

const isOneOf = <T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] => isString(value) && allowed.includes(value);

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

const validateReminderItem = (value: unknown): value is ReminderItem =>
  isObject(value) &&
  isString(value.desktopReminderId) &&
  isString(value.title) &&
  isNullableString(value.relatedEmployeeDisplayName) &&
  isString(value.dueDate) &&
  (value.dueTime === null || isString(value.dueTime)) &&
  isOneOf(value.status, ['scheduled', 'overdue', 'completed'] as const) &&
  isNullableString(value.priority) &&
  isNullableString(value.summaryShort);

const validateOverdueReminderItem = (value: unknown): value is OverdueReminderItem =>
  isObject(value) &&
  isString(value.desktopReminderId) &&
  isString(value.title) &&
  isNullableString(value.relatedEmployeeDisplayName) &&
  isString(value.dueDate) &&
  (value.dueTime === null || isString(value.dueTime)) &&
  value.status === 'overdue' &&
  isNullableString(value.priority) &&
  isNullableString(value.summaryShort);

const validateWeekDay = (value: unknown): value is MobileWeekSnapshotDay =>
  isObject(value) &&
  isString(value.date) &&
  parseIsoDate(value.date) !== null &&
  isString(value.dayLabel) &&
  isBoolean(value.isToday) &&
  isNumber(value.completedEncounterCount) &&
  Array.isArray(value.completedEncounterItems) &&
  value.completedEncounterItems.every(
    (item) =>
      isObject(item) &&
      isString(item.desktopEncounterId) &&
      isString(item.employeeDisplayName) &&
      isEncounterType(item.encounterType) &&
      isString(item.summaryShort) &&
      isString(item.time),
  ) &&
  isNumber(value.scheduledReminderCount) &&
  Array.isArray(value.scheduledReminderItems) &&
  value.scheduledReminderItems.every(validateReminderItem) &&
  isNumber(value.overdueReminderCount) &&
  Array.isArray(value.overdueReminderItems) &&
  value.overdueReminderItems.every(validateOverdueReminderItem) &&
  isNumber(value.followUpCount) &&
  value.completedEncounterCount === value.completedEncounterItems.length &&
  value.scheduledReminderCount === value.scheduledReminderItems.length &&
  value.overdueReminderCount === value.overdueReminderItems.length &&
  isNullableString(value.notes);

export const validateMobileEncounterCapture = (
  value: unknown,
): ValidationResult<MobileEncounterCapture> => {
  if (!isObject(value)) {
    return createFailure('Capture record must be an object.');
  }

  const valid =
    isString(value.schemaVersion) &&
    value.recordType === 'mobile_encounter_capture' &&
    isString(value.captureId) &&
    value.source === 'mobile_companion' &&
    isOneOf(
      value.captureStatus,
      ['draft', 'ready_for_export', 'exported', 'imported', 'import_failed', 'archived'] as const,
    ) &&
    isOneOf(
      value.transferStatus,
      [
        'local_only',
        'queued_for_export',
        'export_package_created',
        'transferred_to_desktop',
        'desktop_import_confirmed',
      ] as const,
    ) &&
    isNullableString(value.exportBatchId) &&
    isNullableString(value.desktopImportBatchId) &&
    isNullableString(value.desktopRecordId) &&
    isNullableString(value.importedAt) &&
    isNullableString(value.importError) &&
    isString(value.employeeDisplayName) &&
    isNullableString(value.employeeId) &&
    isOneOf(value.employeeMatchConfidence, ['exact', 'likely', 'manual', 'unknown'] as const) &&
    isNullableString(value.department) &&
    isNullableString(value.location) &&
    isNullableString(value.station) &&
    isEncounterType(value.encounterType) &&
    isNullableString(value.encounterSubtype) &&
    isString(value.encounterDate) &&
    isString(value.encounterTime) &&
    isString(value.occurredAt) &&
    isString(value.capturedAt) &&
    isString(value.timezone) &&
    isString(value.summaryShort) &&
    (value.summaryStructured === null || isObject(value.summaryStructured)) &&
    isStringArray(value.tags) &&
    isOneOf(value.noteType, ['typed', 'voice_to_text', 'voice_audio', 'mixed'] as const) &&
    isNullableString(value.voiceTranscript) &&
    isNullableString(value.audioFileRef) &&
    isBoolean(value.followUpNeeded) &&
    (value.followUpPriority === null ||
      isOneOf(value.followUpPriority, ['low', 'normal', 'high'] as const)) &&
    isNullableString(value.followUpReason) &&
    isNullableString(value.followUpSuggestedDate) &&
    isNullableString(value.linkedPriorEncounterId) &&
    isString(value.createdOnDeviceAt) &&
    isString(value.updatedOnDeviceAt) &&
    isOneOf(
      value.syncStatus,
      ['local_only', 'uploaded', 'imported_to_desktop', 'resolved', 'sync_error'] as const,
    ) &&
    isNullableString(value.syncError) &&
    isNullableString(value.syncRecordId) &&
    isNullableString(value.syncUpdatedAt) &&
    (value.importResolution === null ||
      isOneOf(value.importResolution, ['pending_review', 'accepted', 'converted', 'rejected'] as const));

  return valid
    ? { ok: true, value: value as unknown as MobileEncounterCapture }
    : createFailure('Capture record schema is invalid.');
};

export const validateMobileCaptureExportPackage = (
  value: unknown,
): ValidationResult<MobileCaptureExportPackage> => {
  if (!isObject(value)) {
    return createFailure('Export package must be an object.');
  }

  const records = value.records;
  if (!Array.isArray(records)) {
    return createFailure('Export package records must be an array.');
  }

  const invalidRecordIndex = records.findIndex((record) => !validateMobileEncounterCapture(record).ok);
  if (invalidRecordIndex >= 0) {
    return createFailure(`Export package record at index ${invalidRecordIndex} failed validation.`);
  }

  const valid =
    isString(value.schemaVersion) &&
    value.packageType === 'mobile_capture_export' &&
    isString(value.packageId) &&
    isString(value.generatedAt) &&
    isString(value.timezone) &&
    isNumber(value.recordCount) &&
    value.recordCount === records.length;

  return valid
    ? { ok: true, value: value as unknown as MobileCaptureExportPackage }
    : createFailure('Export package schema is invalid.');
};

export const validateMobileWeekSnapshotPackage = (
  value: unknown,
): ValidationResult<MobileWeekSnapshotPackage> => {
  if (!isObject(value)) {
    return createFailure('Week snapshot package must be an object.');
  }

  if (!Array.isArray(value.days)) {
    return createFailure('Week snapshot package days must be an array.');
  }

  if (value.days.length !== 7) {
    return createFailure('Week snapshot package must contain exactly 7 days.');
  }

  const invalidDayIndex = value.days.findIndex((day) => !validateWeekDay(day));
  if (invalidDayIndex >= 0) {
    return createFailure(`Week snapshot day at index ${invalidDayIndex} failed validation.`);
  }

  const valid =
    isString(value.schemaVersion) &&
    value.packageType === 'mobile_week_snapshot' &&
    value.generatedBy === 'desktop_app' &&
    isString(value.packageId) &&
    isString(value.generatedAt) &&
    isString(value.timezone) &&
    isString(value.weekStartDate) &&
    isString(value.weekEndDate) &&
    isBoolean(value.isCurrentWeek) &&
    isNullableString(value.desktopDataVersion) &&
    isObject(value.weekSummary) &&
    isNumber(value.weekSummary.totalCompletedEncounters) &&
    isNumber(value.weekSummary.totalScheduledReminders) &&
    isNumber(value.weekSummary.totalOverdueReminders) &&
    isNumber(value.weekSummary.totalFollowUpsDue) &&
    isNumber(value.weekSummary.daysWithActivityCount);

  if (!valid) {
    return createFailure('Week snapshot package schema is invalid.');
  }

  const weekStartDateValue = value.weekStartDate as string;
  const weekEndDateValue = value.weekEndDate as string;
  const weekStartDate = parseIsoDate(weekStartDateValue);
  const weekEndDate = parseIsoDate(weekEndDateValue);
  if (!weekStartDate || !weekEndDate) {
    return createFailure('Week snapshot package dates must use YYYY-MM-DD format.');
  }

  const expectedWeekEndDate = addUtcDays(weekStartDate, 6).toISOString().slice(0, 10);
  if (expectedWeekEndDate !== weekEndDateValue) {
    return createFailure('Week snapshot package weekStartDate and weekEndDate must span 7 contiguous days.');
  }

  const expectedDates = Array.from({ length: 7 }, (_unused, index) =>
    addUtcDays(weekStartDate, index).toISOString().slice(0, 10),
  );
  const actualDates = value.days.map((day) => day.date);
  if (new Set(actualDates).size !== 7) {
    return createFailure('Week snapshot package day dates must be unique.');
  }

  const daysMatchWeekRange = expectedDates.every((date, index) => actualDates[index] === date);
  if (!daysMatchWeekRange) {
    return createFailure('Week snapshot package day dates must match the declared week range in order.');
  }

  const totalCompletedEncounters = value.days.reduce(
    (total, day) => total + day.completedEncounterCount,
    0,
  );
  const totalScheduledReminders = value.days.reduce(
    (total, day) => total + day.scheduledReminderCount,
    0,
  );
  const totalOverdueReminders = value.days.reduce(
    (total, day) => total + day.overdueReminderCount,
    0,
  );
  const totalFollowUpsDue = value.days.reduce((total, day) => total + day.followUpCount, 0);
  const daysWithActivityCount = value.days.filter(
    (day) =>
      day.completedEncounterCount > 0 ||
      day.scheduledReminderCount > 0 ||
      day.overdueReminderCount > 0,
  ).length;
  const weekSummary = value.weekSummary as {
    totalCompletedEncounters: number;
    totalScheduledReminders: number;
    totalOverdueReminders: number;
    totalFollowUpsDue: number;
    daysWithActivityCount: number;
  };

  const summaryMatches =
    weekSummary.totalCompletedEncounters === totalCompletedEncounters &&
    weekSummary.totalScheduledReminders === totalScheduledReminders &&
    weekSummary.totalOverdueReminders === totalOverdueReminders &&
    weekSummary.totalFollowUpsDue === totalFollowUpsDue &&
    weekSummary.daysWithActivityCount === daysWithActivityCount;

  return summaryMatches
    ? { ok: true, value: value as unknown as MobileWeekSnapshotPackage }
    : createFailure('Week snapshot summary totals do not match the day data.');
};
