import { useEffect, useState } from 'react';
import InfoDialog from '../../components/InfoDialog';
import type { CaptureFormValues } from '../../contracts/mobileContracts';
import {
  ENCOUNTER_TYPE_OPTIONS,
  type EncounterType,
} from '../../contracts/encounterTypes';
import type { CaptureOptionLists } from '../../config/siteCaptureOptions';
import SectionCard from '../../components/SectionCard';
import { toLocalDateTimeLabel } from '../../lib/dateTime';
import { hasTagValue, parseTagsText, toggleTagInText } from '../../lib/tags';

interface CaptureFormProps {
  captureOptions: CaptureOptionLists;
  prefill?: (Partial<CaptureFormValues> & { requestId: number }) | null;
  onSave: (values: CaptureFormValues, saveMode: 'draft' | 'ready') => Promise<void>;
  disabled?: boolean;
}

const initialValues: CaptureFormValues = {
  employeeDisplayName: '',
  department: '',
  station: '',
  encounterType: ENCOUNTER_TYPE_OPTIONS[0],
  summaryShort: '',
  tagsText: '',
  followUpNeeded: false,
  followUpSuggestedDate: '',
};

const STRUCTURED_PRIORITIZATION_TAGS = ['uncertain-pain', 'uncertain-mobility'] as const;

const getOptionsWithCurrentValue = (options: string[], currentValue: string) => {
  if (!currentValue || options.includes(currentValue)) {
    return options;
  }

  return [currentValue, ...options];
};

const CaptureForm = ({ captureOptions, prefill, onSave, disabled = false }: CaptureFormProps) => {
  const [values, setValues] = useState<CaptureFormValues>(initialValues);
  const [isFollowUpInfoOpen, setIsFollowUpInfoOpen] = useState(false);
  const [timestampLabel, setTimestampLabel] = useState(
    toLocalDateTimeLabel(new Date().toISOString()),
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimestampLabel(toLocalDateTimeLabel(new Date().toISOString()));
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!prefill) {
      return;
    }

    setValues({
      ...initialValues,
      ...prefill,
      encounterType: prefill.encounterType ?? initialValues.encounterType,
    });
  }, [prefill?.requestId]);

  const updateValue = <K extends keyof CaptureFormValues>(field: K, value: CaptureFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (saveMode: 'draft' | 'ready') => {
    await onSave(values, saveMode);
    setValues(initialValues);
  };

  const canSave = Boolean(
    values.employeeDisplayName.trim() &&
      values.department &&
      values.station &&
      values.summaryShort.trim(),
  );
  const departmentOptions = getOptionsWithCurrentValue(
    captureOptions.departments,
    values.department,
  );
  const stationOptions = getOptionsWithCurrentValue(captureOptions.stations, values.station);

  return (
    <SectionCard
      className="section-card--capture-form"
      title="New Encounter"
      subtitle="Fast floor capture. Timestamps are applied automatically on save."
    >
      <div className="form-grid">
        <label className="field">
          <span>Employee display name</span>
          <input
            value={values.employeeDisplayName}
            onChange={(event) => updateValue('employeeDisplayName', event.target.value)}
            placeholder="Enter employee name"
            autoComplete="off"
            disabled={disabled}
          />
        </label>

        <label className="field">
          <span>Department</span>
          <select
            value={values.department}
            onChange={(event) => updateValue('department', event.target.value)}
            disabled={disabled}
          >
            <option value="">Select department</option>
            {departmentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Station</span>
          <select
            value={values.station}
            onChange={(event) => updateValue('station', event.target.value)}
            disabled={disabled}
          >
            <option value="">Select station</option>
            {stationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Encounter type</span>
          <select
            value={values.encounterType}
            onChange={(event) =>
              updateValue('encounterType', event.target.value as EncounterType)
            }
            disabled={disabled}
          >
            {ENCOUNTER_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Summary</span>
          <textarea
            value={values.summaryShort}
            onChange={(event) => updateValue('summaryShort', event.target.value)}
            placeholder="Short, practical note"
            rows={4}
            maxLength={280}
            disabled={disabled}
          />
        </label>

        <label className="field">
          <span>Tags</span>
          <div className="prioritization-tag-toggle-row">
            {STRUCTURED_PRIORITIZATION_TAGS.map((tag) => {
              const tagIsActive = hasTagValue(parseTagsText(values.tagsText), tag);

              return (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip tag-chip--interactive${tagIsActive ? ' is-active' : ''}`}
                  onClick={() => updateValue('tagsText', toggleTagInText(values.tagsText, tag))}
                  disabled={disabled}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <input
            value={values.tagsText}
            onChange={(event) => updateValue('tagsText', event.target.value)}
            placeholder="mobility, wellness, uncertain-pain"
            autoComplete="off"
            disabled={disabled}
          />
          <small className="helper-copy">
            Use the exact structured tags <code>uncertain-pain</code> and <code>uncertain-mobility</code> when those temporary prioritization markers apply.
          </small>
        </label>

        <div className="toggle-field">
          <label className="toggle-field__main">
            <input
              type="checkbox"
              checked={values.followUpNeeded}
              onChange={(event) => updateValue('followUpNeeded', event.target.checked)}
              disabled={disabled}
            />
            <div>
              <span>Follow-up needed</span>
            </div>
          </label>
          <button
            type="button"
            className="info-button"
            aria-label="Explain follow-up needed"
            onClick={() => setIsFollowUpInfoOpen(true)}
          >
            i
          </button>
        </div>

        {values.followUpNeeded ? (
          <label className="field">
            <span>Suggested follow-up date</span>
            <input
              type="date"
              value={values.followUpSuggestedDate}
              onChange={(event) => updateValue('followUpSuggestedDate', event.target.value)}
              disabled={disabled}
            />
          </label>
        ) : null}
      </div>

      <div className="capture-form__footer">
        <p>Auto timestamp: {timestampLabel}</p>
        <div className="button-row">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void handleSave('draft')}
            disabled={disabled || !canSave}
          >
            Save Draft
          </button>
          <button
            type="button"
            className="button"
            onClick={() => void handleSave('ready')}
            disabled={disabled || !canSave}
          >
            Save Ready
          </button>
        </div>
      </div>

      <InfoDialog
        open={isFollowUpInfoOpen}
        title="Follow-Up Needed"
        description="Use this when the desktop side should review follow-up work later. The mobile app does not schedule it by itself."
        onClose={() => setIsFollowUpInfoOpen(false)}
      />
    </SectionCard>
  );
};

export default CaptureForm;
