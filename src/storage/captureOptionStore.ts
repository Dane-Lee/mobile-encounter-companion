import {
  DEFAULT_SITE_CAPTURE_OPTIONS,
  type CaptureLocationOption,
  type CaptureOptionLists,
  type CaptureStationOption,
} from '../config/siteCaptureOptions';

const STORAGE_KEY = 'daily-encounter-mobile-companion.capture-option-overrides';

interface LegacyCaptureOptionLists {
  departments?: string[];
  stations?: string[];
}

const getDefaultCaptureOptions = (): CaptureOptionLists => ({
  departments: [...DEFAULT_SITE_CAPTURE_OPTIONS.departments],
  locations: DEFAULT_SITE_CAPTURE_OPTIONS.locations.map((location) => ({ ...location })),
  stations: DEFAULT_SITE_CAPTURE_OPTIONS.stations.map((station) => ({ ...station })),
});

const canUseLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizeOptionValue = (value: string) => value.trim();

const normalizeOptionList = (values: string[]) => {
  const seen = new Set<string>();

  return values.reduce<string[]>((accumulator, value) => {
    const normalizedValue = normalizeOptionValue(value);
    const key = normalizedValue.toLocaleLowerCase();

    if (!normalizedValue || seen.has(key)) {
      return accumulator;
    }

    seen.add(key);
    accumulator.push(normalizedValue);
    return accumulator;
  }, []);
};

const normalizeLinkedOptionList = <TParentKey extends 'department' | 'location'>(
  values: Array<Record<TParentKey, string | null> & { name: string }>,
  parentKey: TParentKey,
) => {
  const seen = new Set<string>();

  return values.reduce<Array<Record<TParentKey, string | null> & { name: string }>>(
    (accumulator, value) => {
      const normalizedName = normalizeOptionValue(value.name);
      const key = normalizedName.toLocaleLowerCase();

      if (!normalizedName || seen.has(key)) {
        return accumulator;
      }

      seen.add(key);
      accumulator.push({
        name: normalizedName,
        [parentKey]: normalizeOptionValue(value[parentKey] ?? '') || null,
      } as Record<TParentKey, string | null> & { name: string });
      return accumulator;
    },
    [],
  );
};

const normalizeCaptureOptionLists = (value: Partial<CaptureOptionLists>): CaptureOptionLists => ({
  departments: normalizeOptionList(Array.isArray(value.departments) ? value.departments : []),
  locations: normalizeLinkedOptionList(
    Array.isArray(value.locations) ? (value.locations as CaptureLocationOption[]) : [],
    'department',
  ),
  stations: normalizeLinkedOptionList(
    Array.isArray(value.stations) ? (value.stations as CaptureStationOption[]) : [],
    'location',
  ),
});

const normalizeLegacyCaptureOptionLists = (value: LegacyCaptureOptionLists): CaptureOptionLists => ({
  departments: normalizeOptionList(Array.isArray(value.departments) ? value.departments : []),
  locations: [],
  stations: normalizeLinkedOptionList(
    (Array.isArray(value.stations) ? value.stations : []).map((station) => ({
      name: station,
      location: null,
    })),
    'location',
  ),
});

const isLinkedOptionObject = (value: unknown, parentKey: 'department' | 'location') =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  'name' in value &&
  typeof (value as { name: unknown }).name === 'string' &&
  (!(parentKey in value) ||
    (value as Record<string, unknown>)[parentKey] === null ||
    typeof (value as Record<string, unknown>)[parentKey] === 'string');

const parseStoredCaptureOptionOverrides = (value: string): CaptureOptionLists | null => {
  const parsedValue = JSON.parse(value) as Partial<CaptureOptionLists> | LegacyCaptureOptionLists;

  if (typeof parsedValue !== 'object' || parsedValue === null || Array.isArray(parsedValue)) {
    return null;
  }

  const hasHierarchicalLocations =
    Array.isArray((parsedValue as Partial<CaptureOptionLists>).locations) &&
    (parsedValue as Partial<CaptureOptionLists>).locations!.every((location) =>
      isLinkedOptionObject(location, 'department'),
    );
  const hasHierarchicalStations =
    Array.isArray((parsedValue as Partial<CaptureOptionLists>).stations) &&
    (parsedValue as Partial<CaptureOptionLists>).stations!.every((station) =>
      isLinkedOptionObject(station, 'location'),
    );

  if (hasHierarchicalLocations || hasHierarchicalStations) {
    return normalizeCaptureOptionLists(parsedValue as Partial<CaptureOptionLists>);
  }

  return normalizeLegacyCaptureOptionLists(parsedValue as LegacyCaptureOptionLists);
};

const writeCaptureOptionOverrides = (value: CaptureOptionLists) => {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }
};

export const getStoredCaptureOptionOverrides = (): CaptureOptionLists | null => {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const normalizedValue = parseStoredCaptureOptionOverrides(rawValue);
    if (!normalizedValue) {
      return null;
    }

    writeCaptureOptionOverrides(normalizedValue);
    return normalizedValue;
  } catch {
    return null;
  }
};

export const hasStoredCaptureOptionOverrides = () => getStoredCaptureOptionOverrides() !== null;

export const getEffectiveCaptureOptionLists = (): CaptureOptionLists =>
  getStoredCaptureOptionOverrides() ?? getDefaultCaptureOptions();

export const saveCaptureOptionOverrides = (value: CaptureOptionLists): CaptureOptionLists => {
  const normalizedValue = normalizeCaptureOptionLists(value);
  writeCaptureOptionOverrides(normalizedValue);
  return normalizedValue;
};

export const addDepartmentOptionOverride = (nextValue: string): CaptureOptionLists => {
  const normalizedValue = normalizeOptionValue(nextValue);
  if (!normalizedValue) {
    throw new Error('Enter a value before adding it.');
  }

  const currentOptions = getEffectiveCaptureOptionLists();
  const alreadyExists = currentOptions.departments.some(
    (value) => value.toLocaleLowerCase() === normalizedValue.toLocaleLowerCase(),
  );

  if (alreadyExists) {
    throw new Error('That department already exists.');
  }

  return saveCaptureOptionOverrides({
    ...currentOptions,
    departments: [...currentOptions.departments, normalizedValue],
  });
};

export const removeDepartmentOptionOverride = (targetValue: string): CaptureOptionLists => {
  const currentOptions = getEffectiveCaptureOptionLists();

  return saveCaptureOptionOverrides({
    ...currentOptions,
    departments: currentOptions.departments.filter((value) => value !== targetValue),
    locations: currentOptions.locations.map((location) =>
      location.department === targetValue ? { ...location, department: null } : location,
    ),
  });
};

export const addLocationOptionOverride = (
  name: string,
  department: string | null,
): CaptureOptionLists => {
  const normalizedName = normalizeOptionValue(name);
  if (!normalizedName) {
    throw new Error('Enter a value before adding it.');
  }

  const currentOptions = getEffectiveCaptureOptionLists();
  const alreadyExists = currentOptions.locations.some(
    (location) => location.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
  );

  if (alreadyExists) {
    throw new Error('That location already exists.');
  }

  return saveCaptureOptionOverrides({
    ...currentOptions,
    locations: [...currentOptions.locations, { name: normalizedName, department }],
  });
};

export const updateLocationOptionDepartment = (
  name: string,
  department: string | null,
): CaptureOptionLists => {
  const currentOptions = getEffectiveCaptureOptionLists();

  return saveCaptureOptionOverrides({
    ...currentOptions,
    locations: currentOptions.locations.map((location) =>
      location.name === name ? { ...location, department } : location,
    ),
  });
};

export const removeLocationOptionOverride = (targetValue: string): CaptureOptionLists => {
  const currentOptions = getEffectiveCaptureOptionLists();

  return saveCaptureOptionOverrides({
    ...currentOptions,
    locations: currentOptions.locations.filter((location) => location.name !== targetValue),
    stations: currentOptions.stations.map((station) =>
      station.location === targetValue ? { ...station, location: null } : station,
    ),
  });
};

export const addStationOptionOverride = (
  name: string,
  location: string | null,
): CaptureOptionLists => {
  const normalizedName = normalizeOptionValue(name);
  if (!normalizedName) {
    throw new Error('Enter a value before adding it.');
  }

  const currentOptions = getEffectiveCaptureOptionLists();
  const alreadyExists = currentOptions.stations.some(
    (station) => station.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
  );

  if (alreadyExists) {
    throw new Error('That station already exists.');
  }

  return saveCaptureOptionOverrides({
    ...currentOptions,
    stations: [...currentOptions.stations, { name: normalizedName, location }],
  });
};

export const updateStationOptionLocation = (
  name: string,
  location: string | null,
): CaptureOptionLists => {
  const currentOptions = getEffectiveCaptureOptionLists();

  return saveCaptureOptionOverrides({
    ...currentOptions,
    stations: currentOptions.stations.map((station) =>
      station.name === name ? { ...station, location } : station,
    ),
  });
};

export const removeStationOptionOverride = (targetValue: string): CaptureOptionLists => {
  const currentOptions = getEffectiveCaptureOptionLists();

  return saveCaptureOptionOverrides({
    ...currentOptions,
    stations: currentOptions.stations.filter((station) => station.name !== targetValue),
  });
};

export const clearCaptureOptionOverrides = (): CaptureOptionLists => {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return getDefaultCaptureOptions();
};
