import { useEffect, useState } from 'react';
import SectionCard from '../../components/SectionCard';
import { toRosterText } from './prioritizationStateService';
import type { StationRiskLevel } from './types';

interface PrioritizationSettingsPanelProps {
  rosterNames: string[];
  knownStations: string[];
  stationRiskMap: Record<string, StationRiskLevel>;
  disabled?: boolean;
  onSaveRoster: (value: string) => void;
  onSaveStationRiskMap: (value: Record<string, StationRiskLevel | null | ''>) => void;
}

const PrioritizationSettingsPanel = ({
  rosterNames,
  knownStations,
  stationRiskMap,
  disabled = false,
  onSaveRoster,
  onSaveStationRiskMap,
}: PrioritizationSettingsPanelProps) => {
  const [rosterDraft, setRosterDraft] = useState(() => toRosterText(rosterNames));
  const [stationRiskDraft, setStationRiskDraft] = useState<Record<string, StationRiskLevel | null | ''>>(
    stationRiskMap,
  );

  useEffect(() => {
    setRosterDraft(toRosterText(rosterNames));
  }, [rosterNames]);

  useEffect(() => {
    setStationRiskDraft(stationRiskMap);
  }, [stationRiskMap]);

  return (
    <SectionCard
      title="Prioritization Settings"
      subtitle="Daily roster and station risk levels are the temporary production inputs until ETS becomes the source of truth."
    >
      <div className="prioritization-settings-grid">
        <div className="prioritization-settings-block">
          <label className="field">
            <span>Daily roster</span>
            <textarea
              value={rosterDraft}
              onChange={(event) => setRosterDraft(event.target.value)}
              placeholder={'Enter one worker per line\nMaria Lopez\nJames Turner'}
              rows={8}
              disabled={disabled}
            />
          </label>
          <button
            type="button"
            className="button"
            onClick={() => onSaveRoster(rosterDraft)}
            disabled={disabled}
          >
            Save Daily Roster
          </button>
          <small className="helper-copy">
            Workers on this list with no capture today will appear in “Workers not yet encountered.”
          </small>
        </div>

        <div className="prioritization-settings-block">
          <div className="prioritization-settings-header">
            <div>
              <p className="section-card__body-title">Station risk setup</p>
              <p className="helper-copy">
                Assign each known station to high, medium, low, or leave it unassigned.
              </p>
            </div>
          </div>

          <div className="prioritization-station-risk-list">
            {knownStations.length === 0 ? (
              <div className="empty-state">
                <p>No stations available yet.</p>
                <small>Add stations through captures or the utilities option editor first.</small>
              </div>
            ) : (
              knownStations.map((stationName) => (
                <label key={stationName} className="prioritization-station-risk-row">
                  <span>{stationName}</span>
                  <select
                    value={stationRiskDraft[stationName] ?? ''}
                    onChange={(event) =>
                      setStationRiskDraft((current) => ({
                        ...current,
                        [stationName]:
                          (event.target.value || null) as StationRiskLevel | null | '',
                      }))
                    }
                    disabled={disabled}
                  >
                    <option value="">Unassigned</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
              ))
            )}
          </div>

          <button
            type="button"
            className="button button--secondary"
            onClick={() => onSaveStationRiskMap(stationRiskDraft)}
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

