export interface CaptureLocationOption {
  name: string;
  department: string | null;
}

export interface CaptureStationOption {
  name: string;
  location: string | null;
}

export interface CaptureOptionLists {
  departments: string[];
  locations: CaptureLocationOption[];
  stations: CaptureStationOption[];
}

export interface FilteredCaptureOptionNames {
  names: string[];
  usingScopedOptions: boolean;
}

export const DEPARTMENT_OPTIONS = [
  'Fabrication',
  'Assembly',
  'Quality',
  'Maintenance',
  'Admin/Office',
] as const;

export const LOCATION_OPTIONS: readonly CaptureLocationOption[] = [];

export const STATION_OPTIONS = [
  { name: 'Station A', location: null },
  { name: 'Station B', location: null },
  { name: 'Station C', location: null },
  { name: 'Station D', location: null },
  { name: 'Office', location: null },
] as const satisfies readonly CaptureStationOption[];

export type DepartmentOption = (typeof DEPARTMENT_OPTIONS)[number];

const normalizeName = (value: string) => value.trim();

const matchesName = (left: string | null | undefined, right: string | null | undefined) =>
  normalizeName(left ?? '').toLocaleLowerCase() === normalizeName(right ?? '').toLocaleLowerCase();

export const DEFAULT_SITE_CAPTURE_OPTIONS: CaptureOptionLists = {
  departments: [...DEPARTMENT_OPTIONS],
  locations: LOCATION_OPTIONS.map((location) => ({ ...location })),
  stations: STATION_OPTIONS.map((station) => ({ ...station })),
};

export const getDepartmentNames = (captureOptions: CaptureOptionLists) => captureOptions.departments;

export const getLocationNames = (captureOptions: CaptureOptionLists) =>
  captureOptions.locations.map((location) => location.name);

export const getStationNames = (captureOptions: CaptureOptionLists) =>
  captureOptions.stations.map((station) => station.name);

export const findDepartmentForLocation = (
  captureOptions: CaptureOptionLists,
  locationName: string,
) =>
  captureOptions.locations.find((location) => matchesName(location.name, locationName))?.department ??
  null;

export const findLocationForStation = (
  captureOptions: CaptureOptionLists,
  stationName: string,
) =>
  captureOptions.stations.find((station) => matchesName(station.name, stationName))?.location ?? null;

export const inferHierarchyFromLocation = (
  captureOptions: CaptureOptionLists,
  locationName: string,
) => ({
  location: locationName,
  department: findDepartmentForLocation(captureOptions, locationName),
});

export const inferHierarchyFromStation = (
  captureOptions: CaptureOptionLists,
  stationName: string,
) => {
  const location = findLocationForStation(captureOptions, stationName);
  const department = location ? findDepartmentForLocation(captureOptions, location) : null;

  return {
    station: stationName,
    location,
    department,
  };
};

export const getFilteredLocationNames = (
  captureOptions: CaptureOptionLists,
  departmentName: string,
): FilteredCaptureOptionNames => {
  const allNames = getLocationNames(captureOptions);
  const linkedNames = captureOptions.locations
    .filter((location) => matchesName(location.department, departmentName))
    .map((location) => location.name);

  return linkedNames.length > 0
    ? { names: linkedNames, usingScopedOptions: true }
    : { names: allNames, usingScopedOptions: false };
};

export const getFilteredStationNames = (
  captureOptions: CaptureOptionLists,
  locationName: string,
): FilteredCaptureOptionNames => {
  const allNames = getStationNames(captureOptions);
  const linkedNames = captureOptions.stations
    .filter((station) => matchesName(station.location, locationName))
    .map((station) => station.name);

  return linkedNames.length > 0
    ? { names: linkedNames, usingScopedOptions: true }
    : { names: allNames, usingScopedOptions: false };
};
