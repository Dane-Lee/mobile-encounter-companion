import {
  type DailyPrioritizationState,
  type PrioritizationExecutionRecord,
  type PrioritizationItemOverride,
  type PrioritizationRosterRecord,
  type PrioritizationSettings,
  type PrioritizationStationRecord,
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

const normalizeKey = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

const normalizeOptionalId = (value: string | null | undefined) => {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
};

export const normalizeRosterRecords = (records: PrioritizationRosterRecord[]) => {
  const recordsByName = new Map<string, PrioritizationRosterRecord>();

  records.forEach((record) => {
    const employeeName = record.employeeName.trim();
    if (!employeeName) {
      return;
    }

    const employeeId = normalizeOptionalId(record.employeeId);
    const key = normalizeKey(employeeName);
    const existingRecord = recordsByName.get(key);

    recordsByName.set(key, {
      employeeName: existingRecord?.employeeName ?? employeeName,
      employeeId: existingRecord?.employeeId ?? employeeId,
    });
  });

  return Array.from(recordsByName.values());
};

const rosterRecordsFromNames = (rosterNames: string[]) =>
  normalizeRosterRecords(
    rosterNames.map((employeeName) => ({
      employeeName,
      employeeId: null,
    })),
  );

export const getRosterRecordsForState = (state: DailyPrioritizationState) => {
  const rosterRecords = 'rosterRecords' in state ? state.rosterRecords ?? [] : [];
  return normalizeRosterRecords(
    rosterRecords.length > 0 ? rosterRecords : rosterRecordsFromNames(state.rosterNames ?? []),
  );
};

export const mergeRosterNamesIntoRecords = (
  existingRecords: PrioritizationRosterRecord[],
  rosterNames: string[],
) => {
  const recordsByName = new Map(
    normalizeRosterRecords(existingRecords).map((record) => [normalizeKey(record.employeeName), record]),
  );

  return normalizeRosterRecords(
    rosterNames.map((employeeName) => {
      const existingRecord = recordsByName.get(normalizeKey(employeeName));
      return {
        employeeName,
        employeeId: existingRecord?.employeeId ?? null,
      };
    }),
  );
};

export const parseRosterText = (value: string) =>
  normalizeDisplayValues(
    value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

const parseDelimitedRows = (value: string, delimiter: ',' | '\t') => {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let isQuoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const nextCharacter = value[index + 1];

    if (character === '"') {
      if (isQuoted && nextCharacter === '"') {
        currentField += '"';
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
      continue;
    }

    if (!isQuoted && character === delimiter) {
      currentRow.push(currentField.trim());
      currentField = '';
      continue;
    }

    if (!isQuoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(Boolean)) {
        rows.push(currentRow);
      }
      currentField = '';
      currentRow = [];
      continue;
    }

    currentField += character;
  }

  currentRow.push(currentField.trim());
  if (currentRow.some(Boolean)) {
    rows.push(currentRow);
  }

  return rows;
};

const normalizeHeader = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '');

const EMPLOYEE_NAME_HEADER_ALIASES = new Set([
  'name',
  'employeename',
  'employee',
  'worker',
  'workername',
  'teammember',
  'teammembername',
  'displayname',
]);

const EMPLOYEE_ID_HEADER_ALIASES = new Set([
  'id',
  'employeeid',
  'employeeref',
  'employeenumber',
  'badgenumber',
  'badgeid',
  'badge',
]);

const getRosterImportIndexes = (rows: string[][]) => {
  const firstRow = rows[0] ?? [];
  const normalizedHeaders = firstRow.map(normalizeHeader);
  const employeeNameIndex = normalizedHeaders.findIndex((header) =>
    EMPLOYEE_NAME_HEADER_ALIASES.has(header),
  );
  const employeeIdIndex = normalizedHeaders.findIndex((header) =>
    EMPLOYEE_ID_HEADER_ALIASES.has(header),
  );

  if (employeeNameIndex >= 0) {
    return {
      hasHeader: true,
      employeeNameIndex,
      employeeIdIndex,
    };
  }

  return {
    hasHeader: false,
    employeeNameIndex: 0,
    employeeIdIndex: firstRow.length > 1 ? 1 : -1,
  };
};

export const parseRosterImportText = (value: string, fileName = '') => {
  const delimiter = fileName.toLocaleLowerCase().endsWith('.tsv') || value.includes('\t') ? '\t' : ',';
  const rows = parseDelimitedRows(value, delimiter);
  const indexes = getRosterImportIndexes(rows);
  const dataRows = indexes.hasHeader ? rows.slice(1) : rows;

  return normalizeRosterRecords(
    dataRows.map((row) => ({
      employeeName: row[indexes.employeeNameIndex] ?? '',
      employeeId: indexes.employeeIdIndex >= 0 ? row[indexes.employeeIdIndex] ?? null : null,
    })),
  );
};

export const toRosterText = (values: string[] | PrioritizationRosterRecord[]) =>
  values
    .map((value) => (typeof value === 'string' ? value : value.employeeName))
    .join('\n');

export const normalizeStationRiskMap = (value: Record<string, StationRiskLevel | null | ''>) =>
  Object.entries(value).reduce<Record<string, StationRiskLevel>>((accumulator, [station, level]) => {
    const normalizedStation = station.trim();

    if (!normalizedStation || !level) {
      return accumulator;
    }

    accumulator[normalizedStation] = level;
    return accumulator;
  }, {});

export const normalizeStationRecords = (records: PrioritizationStationRecord[]) => {
  const recordsByName = new Map<string, PrioritizationStationRecord>();

  records.forEach((record) => {
    const stationName = record.stationName.trim();
    if (!stationName) {
      return;
    }

    const stationId = normalizeOptionalId(record.stationId);
    const riskLevel = record.riskLevel || null;

    if (!stationId && !riskLevel) {
      return;
    }

    const key = normalizeKey(stationName);
    const existingRecord = recordsByName.get(key);

    recordsByName.set(key, {
      stationName: existingRecord?.stationName ?? stationName,
      stationId: existingRecord?.stationId ?? stationId,
      riskLevel: riskLevel ?? existingRecord?.riskLevel ?? null,
    });
  });

  return Array.from(recordsByName.values());
};

export const stationRecordsToRiskMap = (records: PrioritizationStationRecord[]) =>
  normalizeStationRecords(records).reduce<Record<string, StationRiskLevel>>((accumulator, record) => {
    if (record.riskLevel) {
      accumulator[record.stationName] = record.riskLevel;
    }
    return accumulator;
  }, {});

const stationRecordsFromRiskMap = (stationRiskMap: Record<string, StationRiskLevel>) =>
  normalizeStationRecords(
    Object.entries(stationRiskMap).map(([stationName, riskLevel]) => ({
      stationName,
      stationId: null,
      riskLevel,
    })),
  );

export const getStationRecordsForSettings = (settings: PrioritizationSettings) => {
  const stationRecords = 'stationRecords' in settings ? settings.stationRecords ?? [] : [];

  if (stationRecords.length > 0) {
    return normalizeStationRecords(stationRecords);
  }

  return stationRecordsFromRiskMap(settings.stationRiskMap ?? {});
};

export const mergeStationRiskMapIntoRecords = (
  existingRecords: PrioritizationStationRecord[],
  stationRiskMap: Record<string, StationRiskLevel>,
) => {
  const recordsByName = new Map(
    normalizeStationRecords(existingRecords).map((record) => [normalizeKey(record.stationName), record]),
  );

  return normalizeStationRecords(
    Object.entries(stationRiskMap).map(([stationName, riskLevel]) => {
      const existingRecord = recordsByName.get(normalizeKey(stationName));
      return {
        stationName,
        stationId: existingRecord?.stationId ?? null,
        riskLevel,
      };
    }),
  );
};

export const normalizePrioritizationSettingsInputs = (
  settings: PrioritizationSettings,
): PrioritizationSettings => {
  const stationRecords = getStationRecordsForSettings(settings);
  return {
    ...settings,
    stationRecords,
    stationRiskMap: stationRecordsToRiskMap(stationRecords),
  };
};

export const normalizeDailyPrioritizationStateInputs = (
  state: DailyPrioritizationState,
): DailyPrioritizationState => {
  const rosterRecords = getRosterRecordsForState(state);
  return {
    ...state,
    rosterRecords,
    rosterNames: rosterRecords.map((record) => record.employeeName),
  };
};

export const createDefaultPrioritizationSettings = (): PrioritizationSettings => ({
  schemaVersion: PRIORITIZATION_SETTINGS_SCHEMA_VERSION,
  settingsId: PRIORITIZATION_SETTINGS_ID,
  stationRiskMap: {},
  stationRecords: [],
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
  rosterRecords: [],
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
): DailyPrioritizationState => withUpdatedRosterRecords(state, rosterRecordsFromNames(rosterNames));

export const withUpdatedRosterRecords = (
  state: DailyPrioritizationState,
  rosterRecords: PrioritizationRosterRecord[],
): DailyPrioritizationState => {
  const normalizedRosterRecords = normalizeRosterRecords(rosterRecords);

  return {
    ...state,
    rosterNames: normalizedRosterRecords.map((record) => record.employeeName),
    rosterRecords: normalizedRosterRecords,
    updatedAt: new Date().toISOString(),
    syncStatus: 'local_only',
    syncError: null,
  };
};

export const withUpdatedStationRiskMap = (
  settings: PrioritizationSettings,
  stationRiskMap: Record<string, StationRiskLevel | null | ''>,
): PrioritizationSettings =>
  withUpdatedStationRecords(
    settings,
    mergeStationRiskMapIntoRecords(settings.stationRecords ?? [], normalizeStationRiskMap(stationRiskMap)),
  );

export const withUpdatedStationRecords = (
  settings: PrioritizationSettings,
  stationRecords: PrioritizationStationRecord[],
): PrioritizationSettings => {
  const normalizedStationRecords = normalizeStationRecords(stationRecords);

  return {
    ...settings,
    stationRiskMap: stationRecordsToRiskMap(normalizedStationRecords),
    stationRecords: normalizedStationRecords,
    updatedAt: new Date().toISOString(),
    syncStatus: 'local_only',
    syncError: null,
  };
};

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
