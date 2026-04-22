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
  onSeedSampleData: () => Promise<void>;
  onClearSampleData: () => Promise<void>;
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
  onSeedSampleData,
  onClearSampleData,
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
}: UtilitiesPanelProps) => (
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

export default UtilitiesPanel;
