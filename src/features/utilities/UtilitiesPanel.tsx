import SectionCard from '../../components/SectionCard';
import type { VersionInfo } from '../../contracts/mobileContracts';

interface UtilitiesPanelProps {
  versionInfo: VersionInfo;
  captureCount: number;
  snapshotCount: number;
  onSeedSampleData: () => Promise<void>;
  onClearSampleData: () => Promise<void>;
  disabled?: boolean;
}

const UtilitiesPanel = ({
  versionInfo,
  captureCount,
  snapshotCount,
  onSeedSampleData,
  onClearSampleData,
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
          <span>{snapshotCount} imported week snapshots</span>
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
    </SectionCard>
  </details>
);

export default UtilitiesPanel;
