import { useEffect, useRef, useState } from 'react';
import SectionCard from '../../components/SectionCard';
import {
  normalizeRosterRecords,
  normalizeStationRecords,
  parseRosterImportText,
} from './prioritizationStateService';
import type {
  PrioritizationRosterRecord,
  PrioritizationStationRecord,
  StationRiskLevel,
} from './types';

interface PrioritizationSettingsPanelProps {
  rosterRecords: PrioritizationRosterRecord[];
  knownStations: string[];
  stationRecords: PrioritizationStationRecord[];
  disabled?: boolean;
  onSaveRosterRecords: (value: PrioritizationRosterRecord[]) => void;
  onSaveStationRecords: (value: PrioritizationStationRecord[]) => void;
}

const createBlankRosterRecord = (): PrioritizationRosterRecord => ({
  employeeName: '',
  employeeId: null,
});

const createBlankStationRecord = (): PrioritizationStationRecord => ({
  stationName: '',
  stationId: null,
  riskLevel: null,
});

const ensureRosterDraftRows = (records: PrioritizationRosterRecord[]) =>
  records.length > 0 ? records : [createBlankRosterRecord()];

const createStationDraftRows = (
  knownStations: string[],
  stationRecords: PrioritizationStationRecord[],
) => {
  const recordsByStation = new Map(
    stationRecords.map((record) => [record.stationName.trim().toLocaleLowerCase(), record]),
  );
  const rows = knownStations.map((stationName) => {
    const existingRecord = recordsByStation.get(stationName.trim().toLocaleLowerCase());
    return {
      stationName,
      stationId: existingRecord?.stationId ?? null,
      riskLevel: existingRecord?.riskLevel ?? null,
    };
  });
  const knownStationKeys = new Set(knownStations.map((stationName) => stationName.trim().toLocaleLowerCase()));
  const customRows = stationRecords.filter(
    (record) => !knownStationKeys.has(record.stationName.trim().toLocaleLowerCase()),
  );

  return [...rows, ...customRows, createBlankStationRecord()];
};

const PrioritizationSettingsPanel = ({
  rosterRecords,
  knownStations,
  stationRecords,
  disabled = false,
  onSaveRosterRecords,
  onSaveStationRecords,
}: PrioritizationSettingsPanelProps) => {
  const rosterFileInputRef = useRef<HTMLInputElement | null>(null);
  const [rosterDraft, setRosterDraft] = useState(() =>
    ensureRosterDraftRows(rosterRecords),
  );
  const [stationDraft, setStationDraft] = useState(() =>
    createStationDraftRows(knownStations, stationRecords),
  );
  const [rosterImportError, setRosterImportError] = useState<string | null>(null);

  useEffect(() => {
    setRosterDraft(ensureRosterDraftRows(rosterRecords));
  }, [rosterRecords]);

  useEffect(() => {
    setStationDraft(createStationDraftRows(knownStations, stationRecords));
  }, [knownStations, stationRecords]);

  const updateRosterDraft = (
    index: number,
    patch: Partial<PrioritizationRosterRecord>,
  ) => {
    setRosterDraft((current) =>
      current.map((record, candidateIndex) =>
        candidateIndex === index ? { ...record, ...patch } : record,
      ),
    );
  };

  const updateStationDraft = (
    index: number,
    patch: Partial<PrioritizationStationRecord>,
  ) => {
    setStationDraft((current) =>
      current.map((record, candidateIndex) =>
        candidateIndex === index ? { ...record, ...patch } : record,
      ),
    );
  };

  const handleRosterImport = async (file: File | null) => {
    if (!file) {
      return;
    }

    const extension = file.name.split('.').pop()?.toLocaleLowerCase();
    if (extension !== 'csv' && extension !== 'tsv') {
      setRosterImportError('Roster import supports .csv and .tsv files only.');
      return;
    }

    const importedRecords = parseRosterImportText(await file.text(), file.name);
    if (importedRecords.length === 0) {
      setRosterImportError('No roster rows were found in that file.');
      return;
    }

    setRosterImportError(null);
    setRosterDraft((current) =>
      ensureRosterDraftRows(normalizeRosterRecords([...current, ...importedRecords])),
    );
  };

  return (
    <SectionCard
      title="Prioritization Settings"
      subtitle="Daily roster and station risk levels are the temporary production inputs until ETS becomes the source of truth."
    >
      <div className="prioritization-settings-grid">
        <div className="prioritization-settings-block">
          <div className="section-card__body-header">
            <div>
              <p className="section-card__body-title">Daily roster</p>
              <p className="helper-copy">
                Add each worker once. Employee ID is optional but keeps roster-only items tied to a known identifier.
              </p>
            </div>
          </div>

          <div className="prioritization-record-list">
            {rosterDraft.map((record, index) => (
              <div key={`${index}-${record.employeeName}`} className="prioritization-record-row prioritization-record-row--roster">
                <label className="field">
                  <span>Employee name</span>
                  <input
                    value={record.employeeName}
                    onChange={(event) =>
                      updateRosterDraft(index, { employeeName: event.target.value })
                    }
                    placeholder="Maria Lopez"
                    disabled={disabled}
                  />
                </label>
                <label className="field">
                  <span>Employee ID</span>
                  <input
                    value={record.employeeId ?? ''}
                    onChange={(event) =>
                      updateRosterDraft(index, { employeeId: event.target.value || null })
                    }
                    placeholder="Optional"
                    disabled={disabled}
                  />
                </label>
                <button
                  type="button"
                  className="button button--ghost prioritization-record-row__remove"
                  onClick={() =>
                    setRosterDraft((current) =>
                      ensureRosterDraftRows(current.filter((_, candidateIndex) => candidateIndex !== index)),
                    )
                  }
                  disabled={disabled || rosterDraft.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="button-row">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setRosterDraft((current) => [...current, createBlankRosterRecord()])}
              disabled={disabled}
            >
              Add Worker
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => rosterFileInputRef.current?.click()}
              disabled={disabled}
            >
              Import CSV/TSV
            </button>
          </div>

          <input
            ref={rosterFileInputRef}
            className="hidden-input"
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            onChange={(event) => {
              void handleRosterImport(event.target.files?.[0] ?? null);
              event.currentTarget.value = '';
            }}
          />

          {rosterImportError ? (
            <small className="capture-item__sync-error">{rosterImportError}</small>
          ) : null}

          <button
            type="button"
            className="button"
            onClick={() => onSaveRosterRecords(rosterDraft)}
            disabled={disabled}
          >
            Save Daily Roster
          </button>
          <small className="helper-copy">
            Workers on this list with no capture today will appear in "Workers not yet encountered."
          </small>
        </div>

        <div className="prioritization-settings-block">
          <div className="prioritization-settings-header">
            <div>
              <p className="section-card__body-title">Station risk setup</p>
              <p className="helper-copy">
                Assign each known station to high, medium, low, or leave it unassigned. Station ID is optional.
              </p>
            </div>
          </div>

          <div className="prioritization-record-list">
            {stationDraft.map((record, index) => (
              <div key={`${index}-${record.stationName}`} className="prioritization-record-row prioritization-record-row--station">
                <label className="field">
                  <span>Station</span>
                  <input
                    value={record.stationName}
                    onChange={(event) =>
                      updateStationDraft(index, { stationName: event.target.value })
                    }
                    placeholder="Station name"
                    disabled={disabled}
                  />
                </label>
                <label className="field">
                  <span>Station ID</span>
                  <input
                    value={record.stationId ?? ''}
                    onChange={(event) =>
                      updateStationDraft(index, { stationId: event.target.value || null })
                    }
                    placeholder="Optional"
                    disabled={disabled}
                  />
                </label>
                <label className="field">
                  <span>Risk</span>
                  <select
                    value={record.riskLevel ?? ''}
                    onChange={(event) =>
                      updateStationDraft(index, {
                        riskLevel: (event.target.value || null) as StationRiskLevel | null,
                      })
                    }
                    disabled={disabled}
                  >
                    <option value="">Unassigned</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="button button--ghost prioritization-record-row__remove"
                  onClick={() =>
                    setStationDraft((current) =>
                      current.filter((_, candidateIndex) => candidateIndex !== index),
                    )
                  }
                  disabled={disabled}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="button button--secondary"
            onClick={() => setStationDraft((current) => [...current, createBlankStationRecord()])}
            disabled={disabled}
          >
            Add Station
          </button>

          {knownStations.length === 0 && normalizeStationRecords(stationDraft).length === 0 ? (
            <div className="empty-state">
              <p>No stations available yet.</p>
              <small>Add stations through captures or the utilities option editor first.</small>
            </div>
          ) : null}

          <button
            type="button"
            className="button button--secondary"
            onClick={() => onSaveStationRecords(stationDraft)}
            disabled={disabled}
          >
            Save Station Risks
          </button>
        </div>
      </div>

      <div className="tag-row">
        <span className="tag-chip">Structured marker: uncertain-pain</span>
        <span className="tag-chip">Structured marker: uncertain-mobility</span>
      </div>
    </SectionCard>
  );
};

export default PrioritizationSettingsPanel;
