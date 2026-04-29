import { useEffect, useMemo, useState } from 'react';
import InfoDialog from '../../components/InfoDialog';
import SectionCard from '../../components/SectionCard';
import type { CaptureFormValues } from '../../contracts/mobileContracts';
import {
  ENCOUNTER_TYPE_OPTIONS,
  type EncounterType,
} from '../../contracts/encounterTypes';
import {
  getDepartmentNames,
  getFilteredLocationNames,
  getFilteredStationNames,
  getLocationNames,
  getStationNames,
  inferHierarchyFromLocation,
  inferHierarchyFromStation,
  type CaptureOptionLists,
} from '../../config/siteCaptureOptions';
import { toLocalDateTimeLabel } from '../../lib/dateTime';
import { hasTagValue, parseTagsText, toggleTagInText } from '../../lib/tags';
import {
  assessCaptureContent,
  formatGuardrailMatchLabels,
  type CaptureContentAssessment,
} from '../../privacy/contentGuardrails';
import { captureGuardrailCopy } from '../../privacy/responsibleUseConfig';

interface CaptureFormProps {
  captureOptions: CaptureOptionLists;
  prefill?: (Partial<CaptureFormValues> & { requestId: number }) | null;
  onSave: (values: CaptureFormValues, saveMode: 'draft' | 'ready') => Promise<void>;
  disabled?: boolean;
}

const initialValues: CaptureFormValues = {
  employeeDisplayName: '',
  department: '',
  location: '',
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

const hydratePrefillValues = (
  prefill: Partial<CaptureFormValues>,
  captureOptions: CaptureOptionLists,
): CaptureFormValues => {
  const nextValues: CaptureFormValues = {
    ...initialValues,
    ...prefill,
    encounterType: prefill.encounterType ?? initialValues.encounterType,
  };

  if (nextValues.station && !nextValues.location) {
    const inferredHierarchy = inferHierarchyFromStation(captureOptions, nextValues.station);

    if (inferredHierarchy.location) {
      nextValues.location = inferredHierarchy.location;
    }

    if (!nextValues.department && inferredHierarchy.department) {
      nextValues.department = inferredHierarchy.department;
    }
  }

  if (nextValues.location && !nextValues.department) {
    const inferredHierarchy = inferHierarchyFromLocation(captureOptions, nextValues.location);

    if (inferredHierarchy.department) {
      nextValues.department = inferredHierarchy.department;
    }
  }

  return nextValues;
};

const synchronizeHierarchySelections = (
  currentValues: CaptureFormValues,
  captureOptions: CaptureOptionLists,
) => {
  const nextValues = { ...currentValues };
  const availableLocationNames = getLocationNames(captureOptions);
  const availableStationNames = getStationNames(captureOptions);
  const filteredLocations = nextValues.department
    ? getFilteredLocationNames(captureOptions, nextValues.department)
    : { names: availableLocationNames, usingScopedOptions: false };

  if (
    nextValues.location &&
    (!availableLocationNames.includes(nextValues.location) ||
      (filteredLocations.usingScopedOptions &&
        !filteredLocations.names.includes(nextValues.location)))
  ) {
    nextValues.location = '';
  }

  const filteredStations = nextValues.location
    ? getFilteredStationNames(captureOptions, nextValues.location)
    : { names: availableStationNames, usingScopedOptions: false };

  if (
    nextValues.station &&
    (!availableStationNames.includes(nextValues.station) ||
      (filteredStations.usingScopedOptions &&
        !filteredStations.names.includes(nextValues.station)))
  ) {
    nextValues.station = '';
  }

  return nextValues;
};

const CaptureForm = ({ captureOptions, prefill, onSave, disabled = false }: CaptureFormProps) => {
  const [values, setValues] = useState<CaptureFormValues>(initialValues);
  const [isFollowUpInfoOpen, setIsFollowUpInfoOpen] = useState(false);
  const [guardrailError, setGuardrailError] = useState<string | null>(null);
  const [sensitiveWarning, setSensitiveWarning] = useState<CaptureContentAssessment | null>(
    null,
  );
  const [pendingSaveMode, setPendingSaveMode] = useState<'draft' | 'ready' | null>(null);
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

    setValues(hydratePrefillValues(prefill, captureOptions));
  }, [captureOptions, prefill?.requestId, prefill]);

  useEffect(() => {
    setValues((currentValues) => {
      const nextValues = synchronizeHierarchySelections(currentValues, captureOptions);

      return JSON.stringify(nextValues) === JSON.stringify(currentValues)
        ? currentValues
        : nextValues;
    });
  }, [captureOptions, values.department, values.location]);

  const updateValue = <K extends keyof CaptureFormValues>(field: K, value: CaptureFormValues[K]) => {
    setGuardrailError(null);
    setSensitiveWarning(null);
    setPendingSaveMode(null);
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (
    saveMode: 'draft' | 'ready',
    options: { acknowledgedSensitiveContent?: boolean } = {},
  ) => {
    const assessment = assessCaptureContent({
      summaryShort: values.summaryShort,
      tagsText: values.tagsText,
    });

    if (assessment.hasBlockedContent) {
      setSensitiveWarning(null);
      setPendingSaveMode(null);
      setGuardrailError(
        `Matched: ${formatGuardrailMatchLabels(
          assessment.blockedMatches,
        )}. Remove those details before saving.`,
      );
      return;
    }

    if (assessment.hasSensitiveContent && !options.acknowledgedSensitiveContent) {
      setGuardrailError(null);
      setSensitiveWarning(assessment);
      setPendingSaveMode(saveMode);
      return;
    }

    await onSave(values, saveMode);
    setGuardrailError(null);
    setSensitiveWarning(null);
    setPendingSaveMode(null);
    setValues(initialValues);
  };

  const handleContinueAfterSensitiveWarning = async () => {
    if (!pendingSaveMode) {
      return;
    }

    await handleSave(pendingSaveMode, { acknowledgedSensitiveContent: true });
  };

  const canSave = Boolean(
    values.employeeDisplayName.trim() && values.department && values.location,
  );

  const departmentOptions = useMemo(
    () => getOptionsWithCurrentValue(getDepartmentNames(captureOptions), values.department),
    [captureOptions, values.department],
  );
  const locationOptions = useMemo(() => {
    const filteredLocations = values.department
      ? getFilteredLocationNames(captureOptions, values.department)
      : {
          names: getLocationNames(captureOptions),
          usingScopedOptions: false,
        };

    return getOptionsWithCurrentValue(filteredLocations.names, values.location);
  }, [captureOptions, values.department, values.location]);
  const stationOptions = useMemo(() => {
    const filteredStations = values.location
      ? getFilteredStationNames(captureOptions, values.location)
      : {
          names: getStationNames(captureOptions),
          usingScopedOptions: false,
        };

    return getOptionsWithCurrentValue(filteredStations.names, values.station);
  }, [captureOptions, values.location, values.station]);

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
          <span>Location</span>
          <select
            value={values.location}
            onChange={(event) => updateValue('location', event.target.value)}
            disabled={disabled}
          >
            <option value="">Select location</option>
            {locationOptions.map((option) => (
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
            <option value="">Select station (optional)</option>
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
          <small className="helper-copy">{captureGuardrailCopy.summaryHelper}</small>
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
            Use the exact structured tags <code>uncertain-pain</code> and{' '}
            <code>uncertain-mobility</code> when those temporary prioritization markers apply.
            {' '}
            {captureGuardrailCopy.tagsHelper}
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

      {guardrailError ? (
        <div className="guardrail-panel guardrail-panel--error" role="alert">
          <strong>{captureGuardrailCopy.blockedTitle}</strong>
          <span>{guardrailError}</span>
        </div>
      ) : null}

      {sensitiveWarning ? (
        <div className="guardrail-panel guardrail-panel--warning" role="status">
          <strong>{captureGuardrailCopy.sensitiveTitle}</strong>
          <span>
            {captureGuardrailCopy.sensitiveBody} Matched:{' '}
            {formatGuardrailMatchLabels(sensitiveWarning.sensitiveMatches)}.
          </span>
          <div className="guardrail-panel__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => void handleContinueAfterSensitiveWarning()}
              disabled={disabled}
            >
              Save Anyway
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                setSensitiveWarning(null);
                setPendingSaveMode(null);
              }}
              disabled={disabled}
            >
              Revise Note
            </button>
          </div>
        </div>
      ) : null}

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
