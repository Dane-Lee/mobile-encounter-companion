import type { CaptureOptionLists } from '../../config/siteCaptureOptions';
import type { MobileEncounterCapture } from '../../contracts/mobileContracts';
import type { SyncConfig } from '../../sync/syncConfig';
import SectionCard from '../../components/SectionCard';
import { getKnownStationsForPrioritization } from './prioritizationDerivation';
import PrioritizationDetail from './PrioritizationDetail';
import PrioritizationList from './PrioritizationList';
import PrioritizationSettingsPanel from './PrioritizationSettingsPanel';
import { usePrioritizationWorkflow } from './usePrioritizationWorkflow';
import type { CapturePrefillRequest } from './types';

interface PrioritizationModeProps {
  captures: MobileEncounterCapture[];
  captureOptions: CaptureOptionLists;
  syncConfig: SyncConfig;
  onOpenCapture: (prefill: CapturePrefillRequest) => void;
}

const PrioritizationMode = ({
  captures,
  captureOptions,
  syncConfig,
  onOpenCapture,
}: PrioritizationModeProps) => {
  const {
    prioritizationDate,
    notice,
    isLoading,
    isBusy,
    syncConfigured,
    syncErrors,
    settings,
    dailyState,
    usedPrototypeFallback,
    bucketGroups,
    summary,
    selectedItem,
    selectedExecutionRecord,
    openItem,
    closeItem,
    updateItemStatus,
    updateItemNotes,
    createExecutionRecord,
    updateExecutionRecord,
    toggleExecutionChecklistSection,
    refreshList,
    saveRosterText,
    saveStationRiskMap,
    createCapturePrefillRequest,
  } = usePrioritizationWorkflow({
    captures,
    captureOptions,
    syncConfig,
  });

  const knownStations = getKnownStationsForPrioritization(
    captureOptions,
    captures,
    settings.stationRiskMap,
  );

  return (
    <div className="screen-column">
      {notice ? (
        <div className={`notice notice--${notice.tone}`}>
          <p>{notice.message}</p>
        </div>
      ) : null}

      <SectionCard
        className="section-card--summary"
        title="Daily Prioritization List"
        subtitle="Live production path for one worksite user, derived from mobile captures plus local roster and station risk setup."
        action={
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void refreshList()}
            disabled={isLoading || isBusy}
          >
            Refresh List
          </button>
        }
      >
        <div className="summary-grid">
          <div>
            <strong>{summary.totalItems}</strong>
            <span>Prioritization items</span>
          </div>
          <div>
            <strong>{summary.openItems}</strong>
            <span>Still open</span>
          </div>
          <div>
            <strong>{summary.employeeItems}</strong>
            <span>Employee-based items</span>
          </div>
          <div>
            <strong>{summary.stationItems}</strong>
            <span>Station-based items</span>
          </div>
          <div>
            <strong>{summary.executionRecords}</strong>
            <span>Execution records created</span>
          </div>
        </div>

        <p className="helper-copy prioritization-summary-copy">
          The seven-bucket order is fixed and authoritative. Today’s list is derived from current
          mobile captures, today’s roster, and local station risk settings while staying ready for
          ETS to replace those sources later.
        </p>

        <div className="prioritization-status-summary">
          <span>{prioritizationDate}</span>
          <span>{dailyState.rosterNames.length} workers on roster</span>
          <span>{Object.keys(settings.stationRiskMap).length} stations risk-ranked</span>
          <span>{syncConfigured ? 'Backend sync enabled' : 'Local-only fallback'}</span>
        </div>

        {!syncConfigured ? (
          <div className="sync-status-note">
            <strong>Prioritization sync not configured</strong>
            <span>
              Roster, station risks, item status, and execution records still persist locally on
              this device.
            </span>
          </div>
        ) : null}

        {syncErrors.length > 0 ? (
          <div className="sync-status-note">
            <strong>Sync configuration needs attention</strong>
            <span>{syncErrors.join(' ')}</span>
          </div>
        ) : null}

        {settings.syncError || dailyState.syncError ? (
          <div className="sync-status-note">
            <strong>Prioritization sync warning</strong>
            <span>{settings.syncError ?? dailyState.syncError}</span>
          </div>
        ) : null}

        {usedPrototypeFallback ? (
          <div className="empty-state">
            <p>Prototype fallback is active.</p>
            <small>
              No live roster, station risks, or usable capture inputs exist yet, so the module is
              rendering the mock prototype list until real inputs are added.
            </small>
          </div>
        ) : null}
      </SectionCard>

      <PrioritizationSettingsPanel
        rosterNames={dailyState.rosterNames}
        knownStations={knownStations}
        stationRiskMap={settings.stationRiskMap}
        disabled={isLoading || isBusy}
        onSaveRoster={(value) => void saveRosterText(value)}
        onSaveStationRiskMap={(value) => void saveStationRiskMap(value)}
      />

      {isLoading ? (
        <SectionCard
          title="Loading Prioritization"
          subtitle="Refreshing local settings, today’s state, and any configured sync records."
        >
          <div className="empty-state">
            <p>Prioritization is loading.</p>
            <small>Derived items will appear as soon as the current state is ready.</small>
          </div>
        </SectionCard>
      ) : selectedItem ? (
        <PrioritizationDetail
          item={selectedItem}
          executionRecord={selectedExecutionRecord}
          disabled={isLoading || isBusy}
          onBack={closeItem}
          onUpdateItemStatus={updateItemStatus}
          onUpdateItemNotes={updateItemNotes}
          onCreateExecutionRecord={createExecutionRecord}
          onUpdateExecutionRecord={updateExecutionRecord}
          onToggleExecutionChecklistSection={toggleExecutionChecklistSection}
          onOpenInCapture={() => {
            const prefill = createCapturePrefillRequest(selectedItem.id);
            if (prefill) {
              onOpenCapture(prefill);
            }
          }}
        />
      ) : (
        <PrioritizationList
          groups={bucketGroups}
          executionRecords={dailyState.executionRecords}
          disabled={isLoading || isBusy}
          onOpenItem={openItem}
        />
      )}
    </div>
  );
};

export default PrioritizationMode;
