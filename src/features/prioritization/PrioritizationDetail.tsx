import { ENCOUNTER_TYPE_OPTIONS } from '../../contracts/encounterTypes';
import SectionCard from '../../components/SectionCard';
import {
  EMPLOYEE_EXECUTION_SECTIONS,
  STATION_SCAN_SECTIONS,
} from './prioritizationConfig';
import {
  getDateTimeLabel,
  getDueDateLabel,
  getPrioritizationBucketLabel,
  getPrioritizationStatusLabel,
} from './prioritizationHelpers';
import type {
  PrioritizationExecutionRecord,
  PrioritizationItem,
  PrioritizationStatus,
} from './types';

interface PrioritizationDetailProps {
  item: PrioritizationItem;
  executionRecord: PrioritizationExecutionRecord | null;
  disabled?: boolean;
  onBack: () => void;
  onUpdateItemStatus: (itemId: string, status: PrioritizationStatus) => Promise<void> | void;
  onUpdateItemNotes: (itemId: string, notes: string) => Promise<void> | void;
  onCreateExecutionRecord: (itemId: string) => Promise<void> | void;
  onUpdateExecutionRecord: (
    executionId: string,
    updates: Partial<
      Pick<
        PrioritizationExecutionRecord,
        'recommendedNextStep' | 'interactionOccurred' | 'readyToRecord' | 'status'
      >
    >,
  ) => Promise<void> | void;
  onToggleExecutionChecklistSection: (executionId: string, section: string) => Promise<void> | void;
  onOpenInCapture: () => void;
}

const EXECUTION_STATUS_OPTIONS: PrioritizationStatus[] = [
  'open',
  'in_progress',
  'completed',
  'deferred',
  'unable_to_complete',
];

const PrioritizationDetail = ({
  item,
  executionRecord,
  disabled = false,
  onBack,
  onUpdateItemStatus,
  onUpdateItemNotes,
  onCreateExecutionRecord,
  onUpdateExecutionRecord,
  onToggleExecutionChecklistSection,
  onOpenInCapture,
}: PrioritizationDetailProps) => {
  const executionSections =
    item.itemType === 'station'
      ? STATION_SCAN_SECTIONS.map((section) => section.title)
      : [...EMPLOYEE_EXECUTION_SECTIONS];

  return (
    <div className="screen-column">
      <SectionCard
        title={item.itemType === 'station' ? 'Station Summary / Scan Start' : 'Employee Action'}
        subtitle="Operational detail surface for prioritization work. Capture handoff stays separate and optional."
        action={
          <div className="section-card__action-stack">
            <button
              type="button"
              className="button button--secondary"
              onClick={onOpenInCapture}
              disabled={disabled}
            >
              Open In Capture
            </button>
            <button type="button" className="button button--ghost" onClick={onBack} disabled={disabled}>
              Back To Prioritization List
            </button>
          </div>
        }
      >
        <div className="prioritization-detail-grid">
          <div>
            <strong>Display label</strong>
            <span>{item.displayLabel}</span>
          </div>
          <div>
            <strong>Fixed priority position</strong>
            <span>{getPrioritizationBucketLabel(item.priorityBucket)}</span>
          </div>
          <div>
            <strong>Parent type</strong>
            <span>{item.itemType === 'employee' ? 'Employee-based item' : 'Station/area-based item'}</span>
          </div>
          <div>
            <strong>Current status</strong>
            <span>{getPrioritizationStatusLabel(item.status)}</span>
          </div>
        </div>

        <p className="helper-copy prioritization-prototype-note">{item.sourceReason}</p>

        <div className="tag-row">
          <span className="tag-chip">Due {getDueDateLabel(item.dueDate)}</span>
          {item.employeeName ? <span className="tag-chip">{item.employeeName}</span> : null}
          {item.stationName ? <span className="tag-chip">{item.stationName}</span> : null}
          {item.relatedEncounterType ? <span className="tag-chip">{item.relatedEncounterType}</span> : null}
          {item.relatedAssessmentType ? <span className="tag-chip">{item.relatedAssessmentType}</span> : null}
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Prioritization item status</span>
            <select
              value={item.status}
              onChange={(event) =>
                void onUpdateItemStatus(item.id, event.target.value as PrioritizationStatus)
              }
              disabled={disabled}
            >
              {EXECUTION_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getPrioritizationStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Working notes</span>
            <textarea
              value={item.notes ?? ''}
              onChange={(event) => void onUpdateItemNotes(item.id, event.target.value)}
              placeholder="Floor notes for today's prioritization work."
              disabled={disabled}
            />
          </label>
        </div>
      </SectionCard>

      {item.itemType === 'station' ? (
        <SectionCard
          title="Station Scan Scaffold"
          subtitle="Sequential scan sections are scaffolded here, but no heavy scan engine is built yet."
        >
          <div className="prioritization-scan-sections">
            {STATION_SCAN_SECTIONS.map((section) => (
              <article key={section.id} className="prioritization-scan-section">
                <h3>{section.title}</h3>
                <p>{section.description}</p>
                <ul className="prioritization-scan-section__list">
                  {section.checklistItems.map((checklistItem) => (
                    <li key={checklistItem}>{checklistItem}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Employee Action Path"
          subtitle="Recommendation-based only. Physical inefficiency outputs stay observational for now."
        >
          <div className="prioritization-scan-sections">
            {EMPLOYEE_EXECUTION_SECTIONS.map((section) => (
              <article key={section} className="prioritization-scan-section">
                <h3>{section}</h3>
                <p>
                  Keep the employee flow light for now. This prototype records floor execution
                  activity without inventing final ETS business rules.
                </p>
              </article>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Execution Tracking"
        subtitle="Creates a lightweight floor-action record linked back to the prioritization item."
      >
        {!executionRecord ? (
          <div className="empty-state">
            <p>No execution record yet.</p>
            <small>
              Create one when the floor action actually starts. This stays mock-only and local to
              the prototype screen.
            </small>
            <button
              type="button"
              className="button"
              onClick={() => void onCreateExecutionRecord(item.id)}
              disabled={disabled}
            >
              Create Execution Record
            </button>
          </div>
        ) : (
          <div className="form-grid">
            <div className="prioritization-checklist">
              {executionSections.map((section) => {
                const checked = executionRecord.checklistSectionsCompleted.includes(section);

                return (
                  <label key={section} className="prioritization-checklist__item">
                    <div className="prioritization-checklist__copy">
                      <strong>{section}</strong>
                      <small>
                        {item.itemType === 'station'
                          ? 'Use this to track the station scan sequence.'
                          : 'Use this to track the lightweight employee action path.'}
                      </small>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        void onToggleExecutionChecklistSection(executionRecord.executionId, section)
                      }
                      disabled={disabled}
                    />
                  </label>
                );
              })}
            </div>

            <label className="field">
              <span>Execution status</span>
              <select
                value={executionRecord.status}
                onChange={(event) =>
                  void onUpdateExecutionRecord(executionRecord.executionId, {
                    status: event.target.value as PrioritizationStatus,
                  })
                }
                disabled={disabled}
              >
                {EXECUTION_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {getPrioritizationStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Recommended next step</span>
              <select
                value={executionRecord.recommendedNextStep ?? ''}
                onChange={(event) =>
                  void onUpdateExecutionRecord(executionRecord.executionId, {
                    recommendedNextStep:
                      (event.target.value || null) as PrioritizationExecutionRecord['recommendedNextStep'],
                  })
                }
                disabled={disabled}
              >
                <option value="">No recommendation selected</option>
                {ENCOUNTER_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="toggle-field">
              <div className="toggle-field__main">
                <input
                  type="checkbox"
                  checked={executionRecord.interactionOccurred}
                  onChange={(event) =>
                    void onUpdateExecutionRecord(executionRecord.executionId, {
                      interactionOccurred: event.target.checked,
                    })
                  }
                  disabled={disabled}
                />
                <div>
                  <span>Interaction occurred</span>
                  <small className="helper-copy">
                    Tracks whether the floor interaction actually happened.
                  </small>
                </div>
              </div>
            </label>

            <label className="toggle-field">
              <div className="toggle-field__main">
                <input
                  type="checkbox"
                  checked={executionRecord.readyToRecord}
                  onChange={(event) =>
                    void onUpdateExecutionRecord(executionRecord.executionId, {
                      readyToRecord: event.target.checked,
                    })
                  }
                  disabled={disabled}
                />
                <div>
                  <span>Ready to record</span>
                  <small className="helper-copy">
                    Flags whether this action is ready to turn into a formal encounter later.
                  </small>
                </div>
              </div>
            </label>

            <div className="prioritization-execution-meta">
              <span>Created {getDateTimeLabel(executionRecord.createdAt)}</span>
              <span>Updated {getDateTimeLabel(executionRecord.updatedAt)}</span>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default PrioritizationDetail;
