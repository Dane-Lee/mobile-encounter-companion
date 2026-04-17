export interface CaptureOptionLists {
  departments: string[];
  stations: string[];
}

export type CaptureOptionListKey = keyof CaptureOptionLists;

export const DEPARTMENT_OPTIONS = [
  'Frontline',
  'Operations',
  'Maintenance',
  'Wellness',
  'Administration',
] as const;

export const STATION_OPTIONS = [
  'Station A',
  'Station B',
  'Station C',
  'Station D',
  'Office',
] as const;

export type DepartmentOption = (typeof DEPARTMENT_OPTIONS)[number];
export type StationOption = (typeof STATION_OPTIONS)[number];

export const DEFAULT_SITE_CAPTURE_OPTIONS: CaptureOptionLists = {
  departments: [...DEPARTMENT_OPTIONS],
  stations: [...STATION_OPTIONS],
};
