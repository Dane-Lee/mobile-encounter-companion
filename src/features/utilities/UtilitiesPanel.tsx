import SectionCard from '../../components/SectionCard';
import type { VersionInfo } from '../../contracts/mobileContracts';
import type { CaptureOptionLists } from '../../config/siteCaptureOptions';
import LocalOptionEditor from './LocalOptionEditor';

interface UtilitiesPanelProps {
  versionInfo: VersionInfo;
  captureCount: number;
  snapshotCount: number;
  captureOptions: CaptureOptionLists;
  hasCaptureOptionOverrides: boolean;
  retentionEligibleCaptureCount: number;
  onSeedSampleData: () => Promise<void>;
  onClearSampleData: () => Promise<void>;
  onDownloadDataInventory: () => Promise<void>;
  onClearCaptures: () => Promise<void>;
  onClearWeekSnapshots: () => Promise<void>;
  onClearRetentionEligibleCaptures: () => Promise<void>;
  onClearAllLocalData: () => Promise<void>;
  onAddDepartmentOption: (value: string) => Promise<void>;
  onRemoveDepartmentOption: (value: string) => Promise<void>;
  onAddLocationOption: (name: string, department: string | null) => Promise<void>;
  onUpdateLocationOptionDepartment: (name: string, department: string | null) => Promise<void>;
  onRemoveLocationOption: (value: string) => Promise<void>;
  onAddStationOption: (name: string, location: string | null) => Promise<void>;
  onUpdateStationOptionLocation: (name: string, location: string | null) => Promise<void>;
  onRemoveStationOption: (value: string) => Promise<void>;
  onResetCaptureOptions: () => Promise<void>;
  disabled?: boolean;
}

const UtilitiesPanel = ({
  versionInfo,
  captureCount,
  snapshotCount,
  captureOptions,
  hasCaptureOptionOverrides,
  retentionEligibleCaptureCount,
  onSeedSampleData,
  onClearSampleData,
  onDownloadDataInventory,
  onClearCaptures,
  onClearWeekSnapshots,
  onClearRetentionEligibleCaptures,
  onClearAllLocalData,
  onAddDepartmentOption,
  onRemoveDepartmentOption,
  onAddLocationOption,
  onUpdateLocationOptionDepartment,
  onRemoveLocationOption,
  onAddStationOption,
  onUpdateStationOptionLocation,
  onRemoveStationOption,
  onResetCaptureOptions,
  disabled = false,
}: UtilitiesPanelProps) => {
  const confirmLocalClear = (message: string, action: () => Promise<void>) => {
    if (!window.confirm(message)) {
      return;
    }

    void action();
  };

  return (
  <details className="utilities-panel">
    <summary>Utilities</summary>
    <SectionCard
      className="section-card--utilities"
      title="Local Utilities"
      subtitle="Minimal tools for seeding demo data, clearing sample records, and checking package versions."
    >
      <div className="utilities-grid">
        <div className="button-stack">
          <button type="button" className="button" onClick={() => void onSeedSampleData()} disabled={disabled}>
            Load Sample Data
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void onClearSampleData()}
            disabled={disabled}
          >
            Clear Sample Data
          </button>
        </div>

        <div className="utility-meta">
          <strong>Local counts</strong>
          <span>{captureCount} capture records</span>
          <span>{snapshotCount} cached week snapshots</span>
        </div>
      </div>

      <div className="version-grid">
        <div>
          <strong>Capture record schema</strong>
          <span>{versionInfo.mobileCaptureRecordSchemaVersion}</span>
        </div>
        <div>
          <strong>Capture export schema</strong>
          <span>{versionInfo.mobileCaptureExportSchemaVersion}</span>
        </div>
        <div>
          <strong>Week snapshot schema</strong>
          <span>{versionInfo.mobileWeekSnapshotSchemaVersion}</span>
        </div>
      </div>

      <div className="local-data-controls">
        <div className="section-card__body-header">
          <div>
            <p className="section-card__body-title">Local Data Controls</p>
            <p className="section-card__body-copy">
              These actions affect data stored in this browser on this device. They do not delete
              records already exported, downloaded, or accepted by a backend/desktop system.
            </p>
          </div>
        </div>

        <div className="local-data-control-grid">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void onDownloadDataInventory()}
            disabled={disabled}
          >
            Download Data Inventory
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() =>
              confirmLocalClear(
                'Clear capture records stored in this browser? Exported/downloaded files and backend records will not be changed.',
                onClearCaptures,
              )
            }
            disabled={disabled || captureCount === 0}
          >
            Clear Captures
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() =>
              confirmLocalClear(
                'Clear cached week snapshots stored in this browser? Backend and desktop records will not be changed.',
                onClearWeekSnapshots,
              )
            }
            disabled={disabled || snapshotCount === 0}
          >
            Clear Week Snapshots
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() =>
              confirmLocalClear(
                'Clear retention-eligible captures from this browser? Draft, local-only, and sync-error records will be kept.',
                onClearRetentionEligibleCaptures,
              )
            }
            disabled={disabled || retentionEligibleCaptureCount === 0}
          >
            Clear Retention-Eligible Captures
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() =>
              confirmLocalClear(
                'Clear all local app data from this browser, including captures, snapshots, prioritization state, local options, sync settings, and notice acceptance?',
                onClearAllLocalData,
              )
            }
            disabled={disabled}
          >
            Clear All Local Data
          </button>
        </div>

        <p className="helper-copy">
          {retentionEligibleCaptureCount} capture
          {retentionEligibleCaptureCount === 1 ? '' : 's'} currently meet the local retention
          review window.
        </p>
      </div>

      <div className="sample-links">
        <a href="/samples/mobile-capture-export.sample.json" download>
          Sample capture export JSON
        </a>
        <a href="/samples/mobile-week-current.sample.json" download>
          Sample current week JSON
        </a>
        <a href="/samples/mobile-week-previous.sample.json" download>
          Sample previous week JSON
        </a>
      </div>

      <div className="option-editor-grid">
        <div className="section-card__body-header">
          <div>
            <p className="section-card__body-title">Local Capture Options</p>
            <p className="section-card__body-copy">
              These lists only affect this browser on this device. Existing capture records are not changed.
            </p>
          </div>
          {hasCaptureOptionOverrides ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => void onResetCaptureOptions()}
              disabled={disabled}
            >
              Reset to Defaults
            </button>
          ) : null}
        </div>

        <LocalOptionEditor
          mode="simple"
          title="Manage Departments"
          helperText="Add or remove the local department list used in the capture form."
          placeholder="Add department"
          emptyText="No department options are currently stored."
          items={captureOptions.departments}
          onAdd={onAddDepartmentOption}
          onRemove={onRemoveDepartmentOption}
          disabled={disabled}
        />

        <LocalOptionEditor
          mode="linked"
          title="Manage Locations"
          helperText="Add locations and assign each one to a department, or leave it unassigned."
          placeholder="Add location"
          emptyText="No location options are currently stored."
          parentLabel="Department"
          parentPlaceholder="Unassigned department"
          parentOptions={captureOptions.departments}
          items={captureOptions.locations.map((location) => ({
            name: location.name,
            parent: location.department,
          }))}
          onAdd={onAddLocationOption}
          onUpdateParent={onUpdateLocationOptionDepartment}
          onRemove={onRemoveLocationOption}
          disabled={disabled}
        />

        <LocalOptionEditor
          mode="linked"
          title="Manage Stations"
          helperText="Add stations and assign each one to a location, or leave it unassigned."
          placeholder="Add station"
          emptyText="No station options are currently stored."
          parentLabel="Location"
          parentPlaceholder="Unassigned location"
          parentOptions={captureOptions.locations.map((location) => location.name)}
          items={captureOptions.stations.map((station) => ({
            name: station.name,
            parent: station.location,
          }))}
          onAdd={onAddStationOption}
          onUpdateParent={onUpdateStationOptionLocation}
          onRemove={onRemoveStationOption}
          disabled={disabled}
        />
      </div>
    </SectionCard>
  </details>
  );
};

export default UtilitiesPanel;
