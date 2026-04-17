import SectionCard from '../../components/SectionCard';
import {
  getDueDateLabel,
  getExecutionRecordForItem,
  getPrioritizationStatusLabel,
} from './prioritizationHelpers';
import type {
  PrioritizationBucketGroup,
  PrioritizationExecutionRecord,
} from './types';

interface PrioritizationListProps {
  groups: PrioritizationBucketGroup[];
  executionRecords: PrioritizationExecutionRecord[];
  disabled?: boolean;
  onOpenItem: (itemId: string) => void;
}

const PrioritizationList = ({
  groups,
  executionRecords,
  disabled = false,
  onOpenItem,
}: PrioritizationListProps) => (
  <div className="screen-column">
    {groups.map(({ bucket, items }) => (
      <SectionCard
        key={bucket.id}
        title={`${bucket.order}. ${bucket.title}`}
        subtitle={bucket.description}
        action={
          <span className="prioritization-bucket__count">
            {items.length} item{items.length === 1 ? '' : 's'}
          </span>
        }
      >
        {items.length === 0 ? (
          <div className="empty-state">
            <p>No items in this bucket.</p>
            <small>The fixed prioritization order remains visible even when a bucket is empty.</small>
          </div>
        ) : (
          <div className="prioritization-list">
            {items.map((item) => {
              const executionRecord = getExecutionRecordForItem(executionRecords, item.id);

              return (
                <article key={item.id} className="prioritization-item-card">
                  <div className="prioritization-item-card__header">
                    <div>
                      <p className="eyebrow prioritization-item-card__eyebrow">
                        {item.itemType === 'employee' ? 'Employee item' : 'Station item'}
                      </p>
                      <h3>{item.displayLabel}</h3>
                    </div>
                    <span className={`prioritization-status prioritization-status--${item.status}`}>
                      {getPrioritizationStatusLabel(item.status)}
                    </span>
                  </div>

                  <p>{item.sourceReason}</p>

                  <div className="tag-row">
                    <span className="tag-chip">Due {getDueDateLabel(item.dueDate)}</span>
                    {item.relatedEncounterType ? (
                      <span className="tag-chip">{item.relatedEncounterType}</span>
                    ) : null}
                    {item.relatedAssessmentType ? (
                      <span className="tag-chip">{item.relatedAssessmentType}</span>
                    ) : null}
                    {executionRecord ? <span className="tag-chip">Execution started</span> : null}
                  </div>

                  <div className="prioritization-item-card__footer">
                    <small>
                      {item.itemType === 'employee'
                        ? item.employeeId ?? 'No employee id'
                        : item.stationId ?? 'No station id'}
                    </small>
                    <button
                      type="button"
                      className="button button--secondary"
                      disabled={disabled}
                      onClick={() => onOpenItem(item.id)}
                    >
                      Open Item
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    ))}
  </div>
);

export default PrioritizationList;
