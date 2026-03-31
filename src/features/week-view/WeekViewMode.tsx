import { useRef } from 'react';
import SectionCard from '../../components/SectionCard';
import type { StoredMobileWeekSnapshot } from '../../contracts/mobileContracts';
import { getSnapshotMetaLabel, getWeekSelectorLabel } from './weekSnapshotHelpers';
import DayBreakdownCard from './DayBreakdownCard';
import WeekSummaryCard from './WeekSummaryCard';

interface WeekViewModeProps {
  snapshots: StoredMobileWeekSnapshot[];
  activeSnapshot: StoredMobileWeekSnapshot | null;
  onImportPackage: (file: File) => Promise<void>;
  onSelectWeek: (localWeekSnapshotId: string) => Promise<void>;
  disabled?: boolean;
}

const WeekViewMode = ({
  snapshots,
  activeSnapshot,
  onImportPackage,
  onSelectWeek,
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

  return (
    <div className="screen-column">
      <SectionCard
        className="section-card--week-toolbar"
        title="Weekly Snapshot"
        subtitle="Import a desktop-generated JSON package, then keep one week visible at a time."
        action={
          <div className="section-card__action-stack">
            <button
              type="button"
              className="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              Import Week JSON
            </button>
            <small className="helper-copy helper-copy--action">
              Import a desktop-generated weekly snapshot package. Mobile view stays read-only.
            </small>
          </div>
        }
      >
        <input
          ref={fileInputRef}
          className="hidden-input"
          type="file"
          accept="application/json"
          onChange={(event) => void handleFileSelection(event)}
        />

        <div className="week-toolbar">
          <label className="field">
            <span>Week on display</span>
            <select
              value={activeSnapshot?.localWeekSnapshotId ?? ''}
              onChange={(event) => void onSelectWeek(event.target.value)}
              disabled={disabled || snapshots.length === 0}
            >
              {snapshots.length === 0 ? <option value="">No imported weeks yet</option> : null}
              {snapshots.map((snapshot) => (
                <option key={snapshot.localWeekSnapshotId} value={snapshot.localWeekSnapshotId}>
                  {getWeekSelectorLabel(snapshot)}
                </option>
              ))}
            </select>
          </label>

          {activeSnapshot ? <p className="week-meta">{getSnapshotMetaLabel(activeSnapshot)}</p> : null}
        </div>

        <p className="helper-copy">
          Import one or more weekly snapshots, then switch between imported weeks here. This does
          not change your mobile capture records.
        </p>
      </SectionCard>

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
        <SectionCard
          className="section-card--week-empty"
          title="No Week Imported"
          subtitle="Load a desktop snapshot JSON package to see the current week summary and daily breakdown."
        >
          <div className="empty-state empty-state--guided">
            <p>No local week snapshots yet.</p>
            <small>Weekly View only shows desktop-generated snapshot packages. It does not build the week from mobile captures.</small>
            <div className="empty-state__steps">
              <span>1. Generate a mobile weekly snapshot from the desktop app.</span>
              <span>2. Import that JSON file here.</span>
              <span>3. Review one selected week at a time on mobile.</span>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default WeekViewMode;
