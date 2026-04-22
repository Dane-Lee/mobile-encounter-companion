import type { MobileEncounterCapture } from '../../contracts/mobileContracts';
import { createPrioritizationItemId, normalizePrioritizationIdentity } from '../../contracts/prioritizationIds';
import { getStationNames, type CaptureOptionLists } from '../../config/siteCaptureOptions';
import { createMockPrioritizationItems } from './mockData';
import { sortPrioritizationItems } from './prioritizationHelpers';
import type {
  DailyPrioritizationState,
  PrioritizationDerivedState,
  PrioritizationItem,
  PrioritizationSettings,
  StationRiskLevel,
} from './types';

const PA_ENCOUNTER_TYPES = new Set([
  'Physical Assessments (PWC or NWC)',
  'PA Follow-Ups',
]);

const EMPLOYEE_MARKER_RULES = [
  {
    bucket: 'worker_uncertain_pain_discomfort' as const,
    marker: 'uncertain-pain',
    relatedEncounterType: 'Job-Specific Coaching' as const,
    relatedAssessmentType: null,
    reason: 'Capture is tagged uncertain-pain and still needs follow-up clarification.',
  },
  {
    bucket: 'worker_uncertain_stiffness_mobility' as const,
    marker: 'uncertain-mobility',
    relatedEncounterType: 'Human Movement Assessments' as const,
    relatedAssessmentType: 'Human Movement Assessment' as const,
    reason: 'Capture is tagged uncertain-mobility and still needs movement follow-up.',
  },
] as const;

const STATION_BUCKET_BY_RISK: Record<
  StationRiskLevel,
  {
    bucket: 'high_risk_area' | 'medium_risk_area' | 'low_risk_area';
    relatedEncounterType: PrioritizationItem['relatedEncounterType'];
  }
> = {
  high: {
    bucket: 'high_risk_area',
    relatedEncounterType: 'Task Assessments',
  },
  medium: {
    bucket: 'medium_risk_area',
    relatedEncounterType: 'Safety Coaching',
  },
  low: {
    bucket: 'low_risk_area',
    relatedEncounterType: 'Relationship Development',
  },
  none: {
    bucket: 'low_risk_area',
    relatedEncounterType: null,
  },
};

const normalizeKey = (value: string | null) =>
  (value ?? '')
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ');

const hasTag = (capture: MobileEncounterCapture, marker: string) =>
  capture.tags.some((tag) => normalizeKey(tag) === normalizeKey(marker));

const compareByMostRecent = (left: MobileEncounterCapture, right: MobileEncounterCapture) =>
  right.updatedOnDeviceAt.localeCompare(left.updatedOnDeviceAt);

const getLatestCaptureByEmployee = (captures: MobileEncounterCapture[]) =>
  captures.reduce<Record<string, MobileEncounterCapture>>((accumulator, capture) => {
    const employeeKey = normalizeKey(capture.employeeDisplayName);
    if (!employeeKey) {
      return accumulator;
    }

    const existingCapture = accumulator[employeeKey];
    if (!existingCapture || compareByMostRecent(capture, existingCapture) < 0) {
      accumulator[employeeKey] = capture;
    }

    return accumulator;
  }, {});

export const getKnownStationsForPrioritization = (
  captureOptions: CaptureOptionLists,
  captures: MobileEncounterCapture[],
  stationRiskMap: PrioritizationSettings['stationRiskMap'],
) => {
  const values = [
    ...getStationNames(captureOptions),
    ...captures.map((capture) => capture.station ?? '').filter(Boolean),
    ...Object.keys(stationRiskMap),
  ];

  const seen = new Set<string>();

  return values.reduce<string[]>((accumulator, value) => {
    const normalizedValue = value.trim();
    const normalizedKey = normalizeKey(normalizedValue);

    if (!normalizedValue || seen.has(normalizedKey)) {
      return accumulator;
    }

    seen.add(normalizedKey);
    accumulator.push(normalizedValue);
    return accumulator;
  }, []);
};

const applyDailyOverlays = (
  items: PrioritizationItem[],
  state: DailyPrioritizationState,
) =>
  items.map((item) => {
    const override = state.itemOverrides.find((candidate) => candidate.itemId === item.id);

    if (!override) {
      return item;
    }

    return {
      ...item,
      status: override.status,
      notes: override.notes,
    };
  });

export const createCapturePrefillFromPrioritizationItem = (
  item: PrioritizationItem,
): {
  employeeDisplayName: string;
  station: string;
  encounterType: PrioritizationItem['relatedEncounterType'];
  summaryShort: string;
  tagsText: string;
  followUpNeeded: boolean;
  followUpSuggestedDate: string;
} => ({
  employeeDisplayName: item.employeeName ?? '',
  station: item.stationName ?? '',
  encounterType: item.relatedEncounterType,
  summaryShort:
    item.itemType === 'employee'
      ? `Follow-up from prioritization list for ${item.employeeName ?? 'employee'}.`
      : `Station prioritization follow-up for ${item.stationName ?? 'station'}.`,
  tagsText: '',
  followUpNeeded: item.priorityBucket === 'open_pa_follow_up',
  followUpSuggestedDate: item.dueDate ?? '',
});

export const derivePrioritizationItems = ({
  captures,
  captureOptions,
  prioritizationDate,
  settings,
  state,
}: {
  captures: MobileEncounterCapture[];
  captureOptions: CaptureOptionLists;
  prioritizationDate: string;
  settings: PrioritizationSettings;
  state: DailyPrioritizationState;
}): PrioritizationDerivedState => {
  const hasLiveInputs =
    captures.length > 0 ||
    state.rosterNames.length > 0 ||
    Object.keys(settings.stationRiskMap).length > 0;

  if (!hasLiveInputs) {
    return {
      items: sortPrioritizationItems(applyDailyOverlays(createMockPrioritizationItems(), state)),
      usedPrototypeFallback: true,
    };
  }

  const items: PrioritizationItem[] = [];
  const seenEmployeeKeys = new Set<string>();
  const seenStationKeys = new Set<string>();
  const latestCaptureByEmployee = getLatestCaptureByEmployee(captures);
  const capturesSorted = [...captures].sort(compareByMostRecent);
  const todayCaptures = capturesSorted.filter(
    (capture) => capture.encounterDate === prioritizationDate && capture.captureStatus !== 'archived',
  );

  capturesSorted
    .filter(
      (capture) =>
        capture.captureStatus !== 'archived' &&
        capture.followUpNeeded &&
        PA_ENCOUNTER_TYPES.has(capture.encounterType) &&
        (!capture.followUpSuggestedDate || capture.followUpSuggestedDate <= prioritizationDate),
    )
    .forEach((capture) => {
      const employeeKey = normalizeKey(capture.employeeDisplayName);
      if (!employeeKey || seenEmployeeKeys.has(employeeKey)) {
        return;
      }

      seenEmployeeKeys.add(employeeKey);
      items.push({
        id: createPrioritizationItemId(
          prioritizationDate,
          'open_pa_follow_up',
          'employee',
          capture.employeeDisplayName,
        ),
        itemType: 'employee',
        priorityBucket: 'open_pa_follow_up',
        displayLabel: `${capture.employeeDisplayName} - open PA follow-up`,
        employeeName: capture.employeeDisplayName,
        employeeId: capture.employeeId,
        stationName: capture.station,
        stationId: capture.station ? normalizePrioritizationIdentity(capture.station) : null,
        sourceReason: `PA-related mobile capture still has an open follow-up flag from ${capture.encounterDate}.`,
        relatedEncounterType: 'PA Follow-Ups',
        relatedAssessmentType: 'Physical Assessment',
        dueDate: capture.followUpSuggestedDate ?? prioritizationDate,
        status: 'open',
        notes: null,
      });
    });

  const todayEncounteredEmployeeKeys = new Set(
    todayCaptures.map((capture) => normalizeKey(capture.employeeDisplayName)).filter(Boolean),
  );

  state.rosterNames.forEach((rosterName) => {
    const employeeKey = normalizeKey(rosterName);
    if (!employeeKey || seenEmployeeKeys.has(employeeKey) || todayEncounteredEmployeeKeys.has(employeeKey)) {
      return;
    }

    const latestCapture = latestCaptureByEmployee[employeeKey];
    seenEmployeeKeys.add(employeeKey);
    items.push({
      id: createPrioritizationItemId(
        prioritizationDate,
        'worker_not_yet_encountered',
        'employee',
        rosterName,
      ),
      itemType: 'employee',
      priorityBucket: 'worker_not_yet_encountered',
      displayLabel: `${rosterName} - first encounter still needed`,
      employeeName: rosterName,
      employeeId: latestCapture?.employeeId ?? null,
      stationName: latestCapture?.station ?? null,
      stationId: latestCapture?.station
        ? normalizePrioritizationIdentity(latestCapture.station)
        : null,
      sourceReason: `Worker is on today's roster but no encounter has been captured today.`,
      relatedEncounterType: 'Relationship Development',
      relatedAssessmentType: null,
      dueDate: prioritizationDate,
      status: 'open',
      notes: null,
    });
  });

  EMPLOYEE_MARKER_RULES.forEach((rule) => {
    todayCaptures
      .filter((capture) => hasTag(capture, rule.marker))
      .forEach((capture) => {
        const employeeKey = normalizeKey(capture.employeeDisplayName);
        if (!employeeKey || seenEmployeeKeys.has(employeeKey)) {
          return;
        }

        seenEmployeeKeys.add(employeeKey);
        items.push({
          id: createPrioritizationItemId(
            prioritizationDate,
            rule.bucket,
            'employee',
            capture.employeeDisplayName,
          ),
          itemType: 'employee',
          priorityBucket: rule.bucket,
          displayLabel:
            rule.bucket === 'worker_uncertain_pain_discomfort'
              ? `${capture.employeeDisplayName} - discomfort still uncertain`
              : `${capture.employeeDisplayName} - movement quality check`,
          employeeName: capture.employeeDisplayName,
          employeeId: capture.employeeId,
          stationName: capture.station,
          stationId: capture.station
            ? normalizePrioritizationIdentity(capture.station)
            : null,
          sourceReason: rule.reason,
          relatedEncounterType: rule.relatedEncounterType,
          relatedAssessmentType: rule.relatedAssessmentType,
          dueDate: prioritizationDate,
          status: 'open',
          notes: null,
        });
      });
  });

  getKnownStationsForPrioritization(captureOptions, captures, settings.stationRiskMap).forEach((stationName) => {
    const normalizedStationKey = normalizeKey(stationName);
    const matchingRiskEntry = Object.entries(settings.stationRiskMap).find(
      ([candidateStation]) => normalizeKey(candidateStation) === normalizedStationKey,
    );

    if (!matchingRiskEntry || seenStationKeys.has(normalizedStationKey)) {
      return;
    }

    seenStationKeys.add(normalizedStationKey);
    const [displayStationName, riskLevel] = matchingRiskEntry;
    const stationBucket = STATION_BUCKET_BY_RISK[riskLevel];

    items.push({
      id: createPrioritizationItemId(
        prioritizationDate,
        stationBucket.bucket,
        'station',
        displayStationName,
      ),
      itemType: 'station',
      priorityBucket: stationBucket.bucket,
      displayLabel: displayStationName,
      employeeName: null,
      employeeId: null,
      stationName: displayStationName,
      stationId: normalizePrioritizationIdentity(displayStationName),
      sourceReason: `${riskLevel[0].toUpperCase()}${riskLevel.slice(1)}-risk station configured in prioritization settings.`,
      relatedEncounterType: stationBucket.relatedEncounterType,
      relatedAssessmentType: 'Observational Scan',
      dueDate: prioritizationDate,
      status: 'open',
      notes: null,
    });
  });

  return {
    items: sortPrioritizationItems(applyDailyOverlays(items, state)),
    usedPrototypeFallback: false,
  };
};
