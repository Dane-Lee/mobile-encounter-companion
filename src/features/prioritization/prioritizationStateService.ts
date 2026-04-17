import {
  type DailyPrioritizationState,
  type PrioritizationExecutionRecord,
  type PrioritizationItemOverride,
  type PrioritizationSettings,
  type PrioritizationStatus,
  type StationRiskLevel,
} from '../../contracts/prioritizationContracts';

export const PRIORITIZATION_SETTINGS_SCHEMA_VERSION = '1.0.0';
export const DAILY_PRIORITIZATION_STATE_SCHEMA_VERSION = '1.0.0';
export const PRIORITIZATION_SETTINGS_ID = 'prioritization-settings';

const normalizeDisplayValues = (values: string[]) => {
  const seen = new Set<string>();

  return values.reduce<string[]>((accumulator, value) => {
    const normalizedValue = value.trim();
    const normalizedKey = normalizedValue.toLocaleLowerCase();

    if (!normalizedValue || seen.has(normalizedKey)) {
      return accumulator;
    }

    seen.add(normalizedKey);
    accumulator.push(normalizedValue);
    return accumulator;
  }, []);
};

export const parseRosterText = (value: string) =>
  normalizeDisplayValues(
    value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

export const toRosterText = (values: string[]) => values.join('\n');

export const normalizeStationRiskMap = (value: Record<string, StationRiskLevel | null | ''>) =>
  Object.entries(value).reduce<Record<string, StationRiskLevel>>((accumulator, [station, level]) => {
    const normalizedStation = station.trim();

    if (!normalizedStation || !level) {
      return accumulator;
    }

    accumulator[normalizedStation] = level;
    return accumulator;
  }, {});

export const createDefaultPrioritizationSettings = (): PrioritizationSettings => ({
  schemaVersion: PRIORITIZATION_SETTINGS_SCHEMA_VERSION,
  settingsId: PRIORITIZATION_SETTINGS_ID,
  stationRiskMap: {},
  updatedAt: new Date().toISOString(),
  syncStatus: 'local_only',
  syncError: null,
  syncRecordId: null,
  syncUpdatedAt: null,
});

export const createDailyPrioritizationState = (
  prioritizationDate: string,
): DailyPrioritizationState => ({
  schemaVersion: DAILY_PRIORITIZATION_STATE_SCHEMA_VERSION,
  prioritizationDate,
  rosterNames: [],
  itemOverrides: [],
  executionRecords: [],
  updatedAt: new Date().toISOString(),
  syncStatus: 'local_only',
  syncError: null,
  syncRecordId: null,
  syncUpdatedAt: null,
});

export const withUpdatedRoster = (
  state: DailyPrioritizationState,
  rosterNames: string[],
): DailyPrioritizationState => ({
  ...state,
  rosterNames: normalizeDisplayValues(rosterNames),
  updatedAt: new Date().toISOString(),
  syncStatus: 'local_only',
  syncError: null,
});

export const withUpdatedStationRiskMap = (
  settings: PrioritizationSettings,
  stationRiskMap: Record<string, StationRiskLevel | null | ''>,
): PrioritizationSettings => ({
  ...settings,
  stationRiskMap: normalizeStationRiskMap(stationRiskMap),
  updatedAt: new Date().toISOString(),
  syncStatus: 'local_only',
  syncError: null,
});

export const withItemOverride = (
  state: DailyPrioritizationState,
  itemId: string,
  patch: Partial<Pick<PrioritizationItemOverride, 'status' | 'notes'>>,
): DailyPrioritizationState => {
  const nextUpdatedAt = new Date().toISOString();
  const existingOverride = state.itemOverrides.find((override) => override.itemId === itemId);
  const nextOverride: PrioritizationItemOverride = {
    itemId,
    status: patch.status ?? existingOverride?.status ?? 'open',
    notes:
      patch.notes !== undefined
        ? patch.notes?.trim() || null
        : existingOverride?.notes ?? null,
    updatedAt: nextUpdatedAt,
  };

  return {
    ...state,
    itemOverrides: existingOverride
      ? state.itemOverrides.map((override) => (override.itemId === itemId ? nextOverride : override))
      : [...state.itemOverrides, nextOverride],
    updatedAt: nextUpdatedAt,
    syncStatus: 'local_only',
    syncError: null,
  };
};

export const withExecutionRecord = (
  state: DailyPrioritizationState,
  executionRecord: PrioritizationExecutionRecord,
): DailyPrioritizationState => {
  const nextUpdatedAt = new Date().toISOString();
  const hasExistingRecord = state.executionRecords.some(
    (record) => record.executionId === executionRecord.executionId,
  );

  return {
    ...state,
    executionRecords: hasExistingRecord
      ? state.executionRecords.map((record) =>
          record.executionId === executionRecord.executionId
            ? { ...executionRecord, updatedAt: nextUpdatedAt }
            : record,
        )
      : [...state.executionRecords, { ...executionRecord, updatedAt: nextUpdatedAt }],
    updatedAt: nextUpdatedAt,
    syncStatus: 'local_only',
    syncError: null,
  };
};

export const withExecutionStatusMirrored = (
  state: DailyPrioritizationState,
  itemId: string,
  status: PrioritizationStatus,
) => withItemOverride(state, itemId, { status });

