import { useMemo, useRef } from 'react';
import CollapsibleSection from '../../components/CollapsibleSection';
import StatusPill from '../../components/StatusPill';
import type { StoredMobileWeekSnapshot } from '../../contracts/mobileContracts';
import {
  getSnapshotMetaLabel,
  getSnapshotSyncLabel,
  getWeekSelectorLabel,
} from './weekSnapshotHelpers';
import DayBreakdownCard from './DayBreakdownCard';
import WeekSummaryCard from './WeekSummaryCard';

interface WeekViewModeProps {
  snapshots: StoredMobileWeekSnapshot[];
  activeSnapshot: StoredMobileWeekSnapshot | null;
  onImportPackage: (file: File) => Promise<void>;
  onSelectWeek: (localWeekSnapshotId: string) => Promise<void>;
  onRefreshSnapshots: () => Promise<void>;
  syncConfigured: boolean;
  syncConfigErrors: string[];
  disabled?: boolean;
}

const toneBySnapshotSyncStatus: Record<
  StoredMobileWeekSnapshot['syncStatus'],
  'neutral' | 'exported' | 'draft' | 'overdue'
> = {
  not_published: 'draft',
  published: 'exported',
  replaced: 'neutral',
  sync_error: 'overdue',
};

const WeekViewMode = ({
  snapshots,
  activeSnapshot,
  onImportPackage,
  onSelectWeek,
  onRefreshSnapshots,
  syncConfigured,
  syncConfigErrors,
  disabled = false,
}: WeekViewModeProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await onImportPackage(file);
    event.target.value = '';
  };

  const syncSummary = useMemo(
    () => ({
      backendCount: snapshots.filter((snapshot) => snapshot.syncOrigin === 'backend').length,
      manualCount: snapshots.filter((snapshot) => snapshot.syncOrigin === 'manual').length,
      publishedCount: snapshots.filter((snapshot) => snapshot.syncStatus === 'published').length,
    }),
    [snapshots],
  );

  return (
    <div className="screen-column">
      <CollapsibleSection
        title="Weekly Snapshot"
        description="Import a desktop week JSON locally, or refresh backend snapshots when sync is configured."
        meta={`${snapshots.length} cached`}
        className="collapsible-panel--week-toolbar"
      >
        <section className="section-card section-card--week-toolbar">
          <input
            ref={fileInputRef}
            className="hidden-input"
            type="file"
            accept="application/json"
            onChange={(event) => void handleFileSelection(event)}
          />

          <div className="section-card__body-header">
            <div>
              <p className="section-card__body-title">Import And Switch Weeks</p>
              <p className="section-card__body-copy">
                Local JSON import is the main week-view path. Backend refresh stays optional until
                it is configured and tested in your environment.
              </p>
            </div>
            <div className="section-card__action-stack">
              <button
                type="button"
                className="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                Import Week JSON
              </button>
              {syncConfigured ? (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => void onRefreshSnapshots()}
                  disabled={disabled}
                >
                  Refresh From Sync
                </button>
              ) : null}
              <small className="helper-copy helper-copy--action">
                {syncConfigured
                  ? 'Manual JSON import remains local-only. Backend refresh is available as an optional path.'
                  : 'Backend sync not configured. Manual week import remains fully available.'}
              </small>
            </div>
          </div>

          {!syncConfigured ? (
            <div className="sync-status-note">
              <strong>Backend sync not configured</strong>
              <span>Manual week import and local week display continue to work normally.</span>
            </div>
          ) : null}

          <div className="sync-summary-row">
            <span className="sync-summary-pill">{syncSummary.backendCount} backend cached</span>
            <span className="sync-summary-pill">{syncSummary.manualCount} manual cached</span>
            <span className="sync-summary-pill">{syncSummary.publishedCount} published</span>
          </div>

          <div className="week-toolbar">
            <label className="field">
              <span>Week on display</span>
              <select
                value={activeSnapshot?.localWeekSnapshotId ?? ''}
                onChange={(event) => void onSelectWeek(event.target.value)}
                disabled={disabled || snapshots.length === 0}
              >
                {snapshots.length === 0 ? <option value="">No cached weeks yet</option> : null}
                {snapshots.map((snapshot) => (
                  <option key={snapshot.localWeekSnapshotId} value={snapshot.localWeekSnapshotId}>
                    {getWeekSelectorLabel(snapshot)}
                  </option>
                ))}
              </select>
            </label>

            {activeSnapshot ? (
              <div className="week-meta week-meta--stacked">
                <p>{getSnapshotMetaLabel(activeSnapshot)}</p>
                <StatusPill
                  label={getSnapshotSyncLabel(activeSnapshot)}
                  tone={toneBySnapshotSyncStatus[activeSnapshot.syncStatus]}
                />
              </div>
            ) : null}
          </div>

          <p className="helper-copy">
            Import a desktop-generated week package to keep one selected week visible here. If
            backend sync is configured later, you can also refresh published weekly snapshots.
          </p>
        </section>
      </CollapsibleSection>

      <CollapsibleSection
        title="Week Imported"
        description={
          activeSnapshot
            ? 'Current cached week summary and daily breakdown.'
            : 'No cached week is available for display yet.'
        }
        meta={activeSnapshot ? getSnapshotSyncLabel(activeSnapshot) : 'None'}
        className="collapsible-panel--week-imported"
      >
        {activeSnapshot ? (
          <>
            <WeekSummaryCard snapshot={activeSnapshot} />
            <div className="day-listing">
              {activeSnapshot.package.days.map((day) => (
                <DayBreakdownCard key={day.date} day={day} />
              ))}
            </div>
          </>
        ) : (
          <section className="section-card section-card--week-empty">
            <div className="empty-state empty-state--guided">
              <p>No local week snapshots yet.</p>
              <small>
                Week View does not build the week from mobile captures. Import a desktop week JSON
                first, then use backend refresh later only if it is configured.
              </small>
              <div className="empty-state__steps">
                <span>1. Generate a mobile week snapshot from the desktop side.</span>
                <span>2. Import that JSON file here.</span>
                <span>3. Review one selected week at a time on mobile.</span>
              </div>
            </div>
          </section>
        )}
      </CollapsibleSection>
    </div>
  );
};

export default WeekViewMode;
