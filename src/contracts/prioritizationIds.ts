import type {
  DailyPrioritizationState,
  PrioritizationExecutionRecord,
  PrioritizationItemOverride,
} from './prioritizationContracts';

export const PRIORITIZATION_BUCKET_NUMBER_BY_ID = {
  open_pa_follow_up: 1,
  worker_not_yet_encountered: 2,
  worker_uncertain_pain_discomfort: 3,
  high_risk_area: 4,
  worker_uncertain_stiffness_mobility: 5,
  medium_risk_area: 6,
  low_risk_area: 7,
} as const;

export type PrioritizationBucketId = keyof typeof PRIORITIZATION_BUCKET_NUMBER_BY_ID;
export type PrioritizationItemIdentityType = 'employee' | 'station';

const LEGACY_ITEM_ID_PATTERN =
  /^pri-(\d{4}-\d{2}-\d{2})-(open_pa_follow_up|worker_not_yet_encountered|worker_uncertain_pain_discomfort|high_risk_area|worker_uncertain_stiffness_mobility|medium_risk_area|low_risk_area)-(employee|station)-(.+)$/;

export const normalizePrioritizationIdentity = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unassigned';

const getPrioritizationItemTypePrefix = (itemType: PrioritizationItemIdentityType) =>
  itemType === 'employee' ? 'emp' : 'stn';

const normalizeLegacyPrioritizationItemId = (itemId: string) => {
  const match = itemId.match(LEGACY_ITEM_ID_PATTERN);
  if (!match) {
    return itemId;
  }

  const [, prioritizationDate, bucketId, itemType, identity] = match;
  const bucketNumber =
    PRIORITIZATION_BUCKET_NUMBER_BY_ID[
      bucketId as PrioritizationBucketId
    ];

  if (!bucketNumber) {
    return itemId;
  }

  return `${prioritizationDate}-b${bucketNumber}-${getPrioritizationItemTypePrefix(itemType as PrioritizationItemIdentityType)}-${normalizePrioritizationIdentity(identity)}`;
};

const chooseLatestOverride = (
  current: PrioritizationItemOverride | undefined,
  next: PrioritizationItemOverride,
) => {
  if (!current) {
    return next;
  }

  return next.updatedAt >= current.updatedAt ? next : current;
};

export const createPrioritizationItemId = (
  prioritizationDate: string,
  bucketId: PrioritizationBucketId,
  itemType: PrioritizationItemIdentityType,
  identity: string,
) =>
  `${prioritizationDate}-b${PRIORITIZATION_BUCKET_NUMBER_BY_ID[bucketId]}-${getPrioritizationItemTypePrefix(itemType)}-${normalizePrioritizationIdentity(identity)}`;

export const normalizeDailyPrioritizationStateRecordIds = (
  state: DailyPrioritizationState,
): DailyPrioritizationState => {
  let didChange = false;

  const normalizedOverridesById = state.itemOverrides.reduce<Record<string, PrioritizationItemOverride>>(
    (accumulator, override) => {
      const normalizedItemId = normalizeLegacyPrioritizationItemId(override.itemId);
      const normalizedOverride =
        normalizedItemId === override.itemId
          ? override
          : { ...override, itemId: normalizedItemId };

      if (normalizedItemId !== override.itemId) {
        didChange = true;
      }

      accumulator[normalizedItemId] = chooseLatestOverride(
        accumulator[normalizedItemId],
        normalizedOverride,
      );
      return accumulator;
    },
    {},
  );

  const normalizedExecutionRecords = state.executionRecords.map(
    (executionRecord): PrioritizationExecutionRecord => {
      const normalizedSourceItemId = normalizeLegacyPrioritizationItemId(
        executionRecord.sourcePrioritizationItemId,
      );

      if (normalizedSourceItemId !== executionRecord.sourcePrioritizationItemId) {
        didChange = true;
        return {
          ...executionRecord,
          sourcePrioritizationItemId: normalizedSourceItemId,
        };
      }

      return executionRecord;
    },
  );

  if (!didChange) {
    return state;
  }

  return {
    ...state,
    itemOverrides: Object.values(normalizedOverridesById),
    executionRecords: normalizedExecutionRecords,
  };
};
