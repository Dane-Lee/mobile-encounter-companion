import {
  MOBILE_CAPTURE_EXPORT_SCHEMA_VERSION,
  MOBILE_CAPTURE_SCHEMA_VERSION,
  MOBILE_WEEK_SNAPSHOT_GENERATOR,
  MOBILE_WEEK_SNAPSHOT_SCHEMA_VERSION,
  type MobileCaptureExportPackage,
  type MobileEncounterCapture,
  type MobileWeekSnapshotDay,
  type MobileWeekSnapshotPackage,
  type ReminderItem,
  type StoredMobileWeekSnapshot,
} from '../contracts/mobileContracts';
import {
  ENCOUNTER_TYPE_OPTIONS,
  type EncounterType,
} from '../contracts/encounterTypes';
import {
  DEFAULT_SITE_CAPTURE_OPTIONS,
  getStationNames,
} from '../config/siteCaptureOptions';
import {
  addDays,
  addWeeks,
  getCurrentTimezone,
  startOfWeek,
  toDateInputValue,
  toLocalDateString,
  toLocalTimeString,
} from '../lib/dateTime';

const SAMPLE_PREFIX = 'sample';
const employeeNames = ['Jordan Hale', 'Terry Flores', 'Mina Patel', 'DeAndre Ross', 'Alicia Kim'];
const departments: string[] = [...DEFAULT_SITE_CAPTURE_OPTIONS.departments];
const stations: string[] = getStationNames(DEFAULT_SITE_CAPTURE_OPTIONS);
const encounterTypes: EncounterType[] = [
  ENCOUNTER_TYPE_OPTIONS[0],
  ENCOUNTER_TYPE_OPTIONS[1],
  ENCOUNTER_TYPE_OPTIONS[2],
  ENCOUNTER_TYPE_OPTIONS[3],
  ENCOUNTER_TYPE_OPTIONS[11],
  ENCOUNTER_TYPE_OPTIONS[12],
];

const getCaptureSummary = (encounterType: EncounterType) => {
  switch (encounterType) {
    case 'Job-Specific Coaching':
      return 'Observed task flow and logged job-specific coaching notes.';
    case 'Job-Specific Mobility / Stretching':
      return 'Captured a mobility and stretching touchpoint on the floor.';
    case 'Safety Coaching':
      return 'Documented a safety coaching conversation during active work.';
    case 'Ergonomic Adjustments':
      return 'Recorded an ergonomic adjustment made during the shift.';
    case 'Relationship Development':
      return 'Logged a relationship development conversation with the employee.';
    case 'Health and Wellness Coaching':
      return 'Captured a health and wellness coaching interaction.';
    default:
      return 'Captured a sample encounter on mobile.';
  }
};

const getCaptureTags = (encounterType: EncounterType) => {
  switch (encounterType) {
    case 'Job-Specific Coaching':
      return ['sample', 'coaching'];
    case 'Job-Specific Mobility / Stretching':
      return ['sample', 'mobility'];
    case 'Safety Coaching':
      return ['sample', 'safety'];
    case 'Ergonomic Adjustments':
      return ['sample', 'ergonomics'];
    case 'Relationship Development':
      return ['sample', 'relationship'];
    case 'Health and Wellness Coaching':
      return ['sample', 'wellness'];
    default:
      return ['sample'];
  }
};

const getCompletedEncounterSummary = (encounterType: EncounterType) => {
  switch (encounterType) {
    case 'Job-Specific Coaching':
      return 'Job-specific coaching entry completed in the desktop system.';
    case 'Job-Specific Mobility / Stretching':
      return 'Mobility and stretching support recorded from the floor.';
    case 'Safety Coaching':
      return 'Safety coaching item closed out in the desktop snapshot.';
    case 'Ergonomic Adjustments':
      return 'Ergonomic adjustment completed and documented.';
    case 'Relationship Development':
      return 'Relationship development touchpoint completed.';
    case 'Health and Wellness Coaching':
      return 'Health and wellness coaching note completed.';
    default:
      return 'Encounter completed in the desktop system.';
  }
};

const createSampleCaptureRecord = (
  index: number,
  daysAgo: number,
  captureStatus: MobileEncounterCapture['captureStatus'],
): MobileEncounterCapture => {
  const timestamp = addDays(new Date(), -daysAgo);
  const timestampIso = timestamp.toISOString();
  const exportBatchId =
    captureStatus === 'exported' ? `${SAMPLE_PREFIX}-capture-batch-001` : null;
  const encounterType = encounterTypes[index % encounterTypes.length];

  return {
    schemaVersion: MOBILE_CAPTURE_SCHEMA_VERSION,
    recordType: 'mobile_encounter_capture',
    captureId: `${SAMPLE_PREFIX}-capture-${index + 1}`,
    source: 'mobile_companion',
    captureStatus,
    transferStatus:
      captureStatus === 'draft'
        ? 'local_only'
        : captureStatus === 'exported'
          ? 'export_package_created'
          : 'queued_for_export',
    exportBatchId,
    desktopImportBatchId: null,
    desktopRecordId: null,
    importedAt: null,
    importError: null,
    employeeDisplayName: employeeNames[index % employeeNames.length],
    employeeId: null,
    employeeMatchConfidence: 'unknown',
    department: departments[index % departments.length],
    location: null,
    station: stations[index % stations.length],
    encounterType,
    encounterSubtype: null,
    encounterDate: toLocalDateString(timestamp),
    encounterTime: toLocalTimeString(timestamp),
    occurredAt: timestampIso,
    capturedAt: timestampIso,
    timezone: getCurrentTimezone(),
    summaryShort: getCaptureSummary(encounterType),
    summaryStructured: null,
    tags: getCaptureTags(encounterType),
    noteType: 'typed',
    voiceTranscript: null,
    audioFileRef: null,
    followUpNeeded: index % 2 === 0,
    followUpPriority: index % 2 === 0 ? 'normal' : null,
    followUpReason: index % 2 === 0 ? 'Check resolution status tomorrow.' : null,
    followUpSuggestedDate: index % 2 === 0 ? toDateInputValue(addDays(timestamp, 1)) : null,
    linkedPriorEncounterId: null,
    createdOnDeviceAt: timestampIso,
    updatedOnDeviceAt: timestampIso,
    syncStatus:
      captureStatus === 'exported'
        ? 'uploaded'
        : captureStatus === 'ready_for_export'
          ? 'local_only'
          : 'local_only',
    syncError: null,
    syncRecordId: captureStatus === 'exported' ? `${SAMPLE_PREFIX}-sync-capture-${index + 1}` : null,
    syncUpdatedAt: captureStatus === 'exported' ? timestampIso : null,
    importResolution: null,
  };
};

export const createMockCaptures = (): MobileEncounterCapture[] => [
  createSampleCaptureRecord(0, 0, 'draft'),
  createSampleCaptureRecord(1, 0, 'ready_for_export'),
  createSampleCaptureRecord(2, 1, 'ready_for_export'),
  createSampleCaptureRecord(3, 2, 'exported'),
];

const createMockWeekSnapshotPackage = (
  offsetWeeks: number,
  isCurrentWeek: boolean,
): MobileWeekSnapshotPackage => {
  const today = new Date();
  const weekStart = startOfWeek(addWeeks(today, offsetWeeks));
  const days: MobileWeekSnapshotDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dateValue = toDateInputValue(date);
    const completedEncounterCount = index % 3 === 0 ? 2 : index % 2;
    const scheduledReminderCount = index % 2 === 0 ? 1 : 0;
    const overdueReminderCount = index === 1 || index === 4 ? 1 : 0;
    const scheduledReminderItems: ReminderItem[] = Array.from(
      { length: scheduledReminderCount },
      (_unused, itemIndex) => ({
        desktopReminderId: `${SAMPLE_PREFIX}-desktop-reminder-${offsetWeeks + 2}-${index + 1}-${itemIndex + 1}`,
        title: itemIndex % 2 === 0 ? 'Call back employee' : 'Confirm follow-up',
        relatedEmployeeDisplayName: employeeNames[(index + 2) % employeeNames.length],
        dueDate: dateValue,
        dueTime: itemIndex % 2 === 0 ? '15:00' : null,
        status: overdueReminderCount > 0 ? 'overdue' : 'scheduled',
        priority: overdueReminderCount > 0 ? 'high' : 'normal',
        summaryShort: 'Pending desktop reminder import preview.',
      }),
    );

    return {
      date: dateValue,
      dayLabel: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date),
      isToday: toLocalDateString(today) === dateValue,
      completedEncounterCount,
      completedEncounterItems: Array.from({ length: completedEncounterCount }, (_unused, itemIndex) => ({
        desktopEncounterId: `${SAMPLE_PREFIX}-desktop-encounter-${offsetWeeks + 2}-${index + 1}-${itemIndex + 1}`,
        employeeDisplayName: employeeNames[(index + itemIndex) % employeeNames.length],
        encounterType: encounterTypes[(index + itemIndex) % encounterTypes.length],
        summaryShort: getCompletedEncounterSummary(
          encounterTypes[(index + itemIndex) % encounterTypes.length],
        ),
        time: itemIndex % 2 === 0 ? '09:15' : '14:40',
      })),
      scheduledReminderCount,
      scheduledReminderItems,
      overdueReminderCount,
      overdueReminderItems: Array.from({ length: overdueReminderCount }, (_unused, itemIndex) => ({
        desktopReminderId: `${SAMPLE_PREFIX}-desktop-overdue-${offsetWeeks + 2}-${index + 1}-${itemIndex + 1}`,
        title: 'Escalation overdue',
        relatedEmployeeDisplayName: employeeNames[(index + 1) % employeeNames.length],
        dueDate: dateValue,
        dueTime: '10:30',
        status: 'overdue' as const,
        priority: 'high',
        summaryShort: 'Requires desktop follow-up review.',
      })),
      followUpCount: completedEncounterCount + overdueReminderCount,
      notes: index % 3 === 0 ? 'Sample desktop snapshot note.' : null,
    };
  });

  const totalCompletedEncounters = days.reduce(
    (total, day) => total + day.completedEncounterCount,
    0,
  );
  const totalScheduledReminders = days.reduce(
    (total, day) => total + day.scheduledReminderCount,
    0,
  );
  const totalOverdueReminders = days.reduce(
    (total, day) => total + day.overdueReminderCount,
    0,
  );
  const totalFollowUpsDue = days.reduce((total, day) => total + day.followUpCount, 0);
  const daysWithActivityCount = days.filter(
    (day) =>
      day.completedEncounterCount > 0 ||
      day.scheduledReminderCount > 0 ||
      day.overdueReminderCount > 0,
  ).length;

  return {
    schemaVersion: MOBILE_WEEK_SNAPSHOT_SCHEMA_VERSION,
    packageType: 'mobile_week_snapshot',
    packageId: `${SAMPLE_PREFIX}-week-${offsetWeeks === 0 ? 'current' : 'previous'}`,
    generatedBy: MOBILE_WEEK_SNAPSHOT_GENERATOR,
    generatedAt: new Date().toISOString(),
    timezone: getCurrentTimezone(),
    weekStartDate: toDateInputValue(weekStart),
    weekEndDate: toDateInputValue(addDays(weekStart, 6)),
    isCurrentWeek,
    desktopDataVersion: 'desktop-sample-v1',
    weekSummary: {
      totalCompletedEncounters,
      totalScheduledReminders,
      totalOverdueReminders,
      totalFollowUpsDue,
      daysWithActivityCount,
    },
    days,
  };
};

export const createMockWeekSnapshotPackages = (): MobileWeekSnapshotPackage[] => [
  createMockWeekSnapshotPackage(-1, false),
  createMockWeekSnapshotPackage(0, true),
];

export const createMockStoredWeekSnapshots = (): StoredMobileWeekSnapshot[] =>
  createMockWeekSnapshotPackages().map((snapshotPackage, index, packages) => ({
    localWeekSnapshotId: `${SAMPLE_PREFIX}-stored-week-${index + 1}`,
    importedToMobileAt: new Date().toISOString(),
    snapshotStatus: snapshotPackage.isCurrentWeek ? 'current' : 'superseded',
    syncOrigin: 'manual',
    syncStatus: 'not_published',
    syncError: null,
    syncRecordId: null,
    syncUpdatedAt: new Date().toISOString(),
    syncUserId: null,
    syncWorksiteId: null,
    syncVersion: snapshotPackage.desktopDataVersion,
    selectedForDisplay:
      snapshotPackage.isCurrentWeek || (!packages.some((item) => item.isCurrentWeek) && index === 0),
    package: snapshotPackage,
  }));

export const createMockCaptureExportPackage = (): MobileCaptureExportPackage => {
  const records = createMockCaptures().filter((capture) => capture.captureStatus !== 'draft');

  return {
    schemaVersion: MOBILE_CAPTURE_EXPORT_SCHEMA_VERSION,
    packageType: 'mobile_capture_export',
    packageId: `${SAMPLE_PREFIX}-capture-batch-001`,
    generatedAt: new Date().toISOString(),
    timezone: getCurrentTimezone(),
    recordCount: records.length,
    records,
  };
};
