import { PRIORITIZATION_BUCKET_DEFINITIONS } from './prioritizationConfig';
import type {
  PrioritizationBucketGroup,
  PrioritizationExecutionRecord,
  PrioritizationItem,
  PrioritizationStatus,
} from './types';

const STATUS_ORDER: Record<PrioritizationStatus, number> = {
  open: 0,
  in_progress: 1,
  urgent: 2,
  deferred: 3,
  unable_to_complete: 4,
  completed: 5,
};

const getBucketOrder = (bucketId: PrioritizationItem['priorityBucket']) =>
  PRIORITIZATION_BUCKET_DEFINITIONS.find((bucket) => bucket.id === bucketId)?.order ?? 99;

export const sortPrioritizationItems = (items: PrioritizationItem[]) =>
  [...items].sort((left, right) => {
    const bucketDelta = getBucketOrder(left.priorityBucket) - getBucketOrder(right.priorityBucket);
    if (bucketDelta !== 0) {
      return bucketDelta;
    }

    const statusDelta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.displayLabel.localeCompare(right.displayLabel);
  });

export const groupPrioritizationItemsByBucket = (
  items: PrioritizationItem[],
): PrioritizationBucketGroup[] =>
  PRIORITIZATION_BUCKET_DEFINITIONS.map((bucket) => ({
    bucket,
    items: sortPrioritizationItems(items.filter((item) => item.priorityBucket === bucket.id)),
  }));

export const getPrioritizationStatusLabel = (status: PrioritizationStatus) =>
  status.replace(/_/g, ' ');

export const getPrioritizationBucketLabel = (bucketId: PrioritizationItem['priorityBucket']) =>
  PRIORITIZATION_BUCKET_DEFINITIONS.find((bucket) => bucket.id === bucketId)?.title ?? bucketId;

export const getExecutionRecordForItem = (
  executionRecords: PrioritizationExecutionRecord[],
  itemId: string,
) => executionRecords.find((record) => record.sourcePrioritizationItemId === itemId) ?? null;

export const getDueDateLabel = (value: string | null) => {
  if (!value) {
    return 'No due date';
  }

  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

export const getDateTimeLabel = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const getPrototypeSummary = (
  items: PrioritizationItem[],
  executionRecords: PrioritizationExecutionRecord[],
) => ({
  totalItems: items.length,
  openItems: items.filter((item) => item.status === 'open').length,
  employeeItems: items.filter((item) => item.itemType === 'employee').length,
  stationItems: items.filter((item) => item.itemType === 'station').length,
  executionRecords: executionRecords.length,
});
