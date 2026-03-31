import { useEffect, useState } from 'react';
import { ENCOUNTER_TYPE_OPTIONS, type CaptureFormValues } from '../../contracts/mobileContracts';
import SectionCard from '../../components/SectionCard';
import { getCurrentTimezone, toLocalDateTimeLabel } from '../../lib/dateTime';

interface CaptureFormProps {
  onSave: (values: CaptureFormValues, saveMode: 'draft' | 'ready') => Promise<void>;
  disabled?: boolean;
}

const initialValues: CaptureFormValues = {
  employeeDisplayName: '',
  encounterType: ENCOUNTER_TYPE_OPTIONS[0],
  summaryShort: '',
  tagsText: '',
  followUpNeeded: false,
  followUpSuggestedDate: '',
};

const CaptureForm = ({ onSave, disabled = false }: CaptureFormProps) => {
  const [values, setValues] = useState<CaptureFormValues>(initialValues);
  const [timestampLabel, setTimestampLabel] = useState(
    toLocalDateTimeLabel(new Date().toISOString()),
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimestampLabel(toLocalDateTimeLabel(new Date().toISOString()));
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const updateValue = <K extends keyof CaptureFormValues>(field: K, value: CaptureFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (saveMode: 'draft' | 'ready') => {
    await onSave(values, saveMode);
    setValues(initialValues);
  };

  const canSave = Boolean(values.employeeDisplayName.trim() && values.summaryShort.trim());

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
          <span>Encounter type</span>
          <select
            value={values.encounterType}
            onChange={(event) => updateValue('encounterType', event.target.value)}
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
          <input
            value={values.tagsText}
            onChange={(event) => updateValue('tagsText', event.target.value)}
            placeholder="coaching, follow-up, customer"
            autoComplete="off"
            disabled={disabled}
          />
        </label>

        <label className="toggle-field">
          <input
            type="checkbox"
            checked={values.followUpNeeded}
            onChange={(event) => updateValue('followUpNeeded', event.target.checked)}
            disabled={disabled}
          />
          <div>
            <span>Follow-up needed</span>
            <small>
              Use this when the desktop side should review follow-up work later. The mobile app
              does not schedule it by itself.
            </small>
          </div>
        </label>

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
        <p>
          Auto timestamp: {timestampLabel}
          <br />
          Timezone: {getCurrentTimezone()}
        </p>
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
    </SectionCard>
  );
};

export default CaptureForm;
