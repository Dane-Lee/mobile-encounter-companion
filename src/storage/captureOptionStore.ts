import {
  DEFAULT_SITE_CAPTURE_OPTIONS,
  type CaptureOptionListKey,
  type CaptureOptionLists,
} from '../config/siteCaptureOptions';

const STORAGE_KEY = 'daily-encounter-mobile-companion.capture-option-overrides';

const getDefaultCaptureOptions = (): CaptureOptionLists => ({
  departments: [...DEFAULT_SITE_CAPTURE_OPTIONS.departments],
  stations: [...DEFAULT_SITE_CAPTURE_OPTIONS.stations],
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

const normalizeCaptureOptionLists = (value: Partial<CaptureOptionLists>): CaptureOptionLists => ({
  departments: normalizeOptionList(Array.isArray(value.departments) ? value.departments : []),
  stations: normalizeOptionList(Array.isArray(value.stations) ? value.stations : []),
});

export const getStoredCaptureOptionOverrides = (): CaptureOptionLists | null => {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    return normalizeCaptureOptionLists(JSON.parse(rawValue) as Partial<CaptureOptionLists>);
  } catch {
    return null;
  }
};

export const hasStoredCaptureOptionOverrides = () => getStoredCaptureOptionOverrides() !== null;

export const getEffectiveCaptureOptionLists = (): CaptureOptionLists =>
  getStoredCaptureOptionOverrides() ?? getDefaultCaptureOptions();

export const saveCaptureOptionOverrides = (value: CaptureOptionLists): CaptureOptionLists => {
  const normalizedValue = normalizeCaptureOptionLists(value);

  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedValue));
  }

  return normalizedValue;
};

export const addCaptureOptionOverride = (
  key: CaptureOptionListKey,
  nextValue: string,
): CaptureOptionLists => {
  const normalizedValue = normalizeOptionValue(nextValue);
  if (!normalizedValue) {
    throw new Error('Enter a value before adding it.');
  }

  const currentOptions = getEffectiveCaptureOptionLists();
  const alreadyExists = currentOptions[key].some(
    (value) => value.toLocaleLowerCase() === normalizedValue.toLocaleLowerCase(),
  );

  if (alreadyExists) {
    throw new Error('That option already exists.');
  }

  return saveCaptureOptionOverrides({
    ...currentOptions,
    [key]: [...currentOptions[key], normalizedValue],
  });
};

export const removeCaptureOptionOverride = (
  key: CaptureOptionListKey,
  targetValue: string,
): CaptureOptionLists => {
  const currentOptions = getEffectiveCaptureOptionLists();

  return saveCaptureOptionOverrides({
    ...currentOptions,
    [key]: currentOptions[key].filter((value) => value !== targetValue),
  });
};

export const clearCaptureOptionOverrides = (): CaptureOptionLists => {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return getDefaultCaptureOptions();
};
