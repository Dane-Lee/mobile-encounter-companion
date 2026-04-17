import { useEffect, useMemo, useState } from 'react';
import StatusPill from '../../components/StatusPill';
import type { MobileEncounterCapture } from '../../contracts/mobileContracts';
import { toLocalDateTimeLabel } from '../../lib/dateTime';

interface CaptureListProps {
  captures: MobileEncounterCapture[];
  onMarkReady: (captureId: string) => Promise<void>;
  onExportSelected: (captureIds: string[]) => Promise<void>;
  onUploadSelected: (captureIds: string[]) => Promise<void>;
  syncConfigured: boolean;
  syncConfigErrors: string[];
  disabled?: boolean;
}

const groupOrder: MobileEncounterCapture['captureStatus'][] = [
  'ready_for_export',
  'draft',
  'exported',
  'imported',
  'import_failed',
  'archived',
];

const toneByStatus: Record<
  MobileEncounterCapture['captureStatus'],
  'draft' | 'ready' | 'exported' | 'neutral'
> = {
  draft: 'draft',
  ready_for_export: 'ready',
  exported: 'exported',
  imported: 'neutral',
  import_failed: 'neutral',
  archived: 'neutral',
};

const labelByStatus: Record<MobileEncounterCapture['captureStatus'], string> = {
  draft: 'Draft',
  ready_for_export: 'Ready',
  exported: 'Exported',
  imported: 'Imported',
  import_failed: 'Import Failed',
  archived: 'Archived',
};

const syncToneByStatus: Record<
  MobileEncounterCapture['syncStatus'],
  'draft' | 'ready' | 'exported' | 'overdue' | 'neutral'
> = {
  local_only: 'draft',
  uploaded: 'exported',
  imported_to_desktop: 'ready',
  resolved: 'ready',
  sync_error: 'overdue',
};

const syncLabelByStatus: Record<MobileEncounterCapture['syncStatus'], string> = {
  local_only: 'Local Only',
  uploaded: 'Uploaded',
  imported_to_desktop: 'Desktop Accepted',
  resolved: 'Resolved',
  sync_error: 'Sync Error',
};

const CaptureList = ({
  captures,
  onMarkReady,
  onExportSelected,
  onUploadSelected,
  syncConfigured,
  syncConfigErrors,
  disabled = false,
}: CaptureListProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const selectableIds = new Set(
      captures
        .filter((capture) => capture.captureStatus !== 'draft' && capture.captureStatus !== 'archived')
        .map((capture) => capture.captureId),
    );

    setSelectedIds((current) => current.filter((captureId) => selectableIds.has(captureId)));
  }, [captures]);

  const toggleSelected = (captureId: string) => {
    setSelectedIds((current) =>
      current.includes(captureId)
        ? current.filter((value) => value !== captureId)
        : [...current, captureId],
    );
  };

  const groupedCaptures = groupOrder
    .map((status) => ({
      status,
      items: captures.filter((capture) => capture.captureStatus === status),
    }))
    .filter((group) => group.items.length > 0);

  const syncSummary = useMemo(() => {
    const localOnlyCount = captures.filter((capture) => capture.syncStatus === 'local_only').length;
    const uploadedCount = captures.filter((capture) => capture.syncStatus === 'uploaded').length;
    const errorCount = captures.filter((capture) => capture.syncStatus === 'sync_error').length;

    return { localOnlyCount, uploadedCount, errorCount };
  }, [captures]);

  return (
    <div className="capture-list-panel">
      <div className="section-card__body-header">
        <div>
          <p className="section-card__body-title">Saved On This Device</p>
          <p className="section-card__body-copy">
            Mobile captures stay local. Use JSON export as the main handoff path. Backend upload is
            optional when configured.
          </p>
        </div>
        <div className="section-card__action-stack">
          <button
            type="button"
            className="button"
            disabled={disabled || selectedIds.length === 0}
            onClick={() => void onExportSelected(selectedIds)}
          >
            Download JSON
          </button>
          {syncConfigured ? (
            <button
              type="button"
              className="button button--secondary"
              disabled={disabled || selectedIds.length === 0}
              onClick={() => void onUploadSelected(selectedIds)}
            >
              Upload Selected
            </button>
          ) : null}
          <small className="helper-copy helper-copy--action">
            {syncConfigured
              ? 'JSON export remains local-only. Upload is available as an optional backend path.'
              : 'Backend sync not configured. Local save and JSON export remain fully available.'}
          </small>
        </div>
      </div>

      {!syncConfigured ? (
        <div className="sync-status-note">
          <strong>Backend sync not configured</strong>
          <span>Local save, local export, and manual week import continue to work normally.</span>
        </div>
      ) : null}

      <div className="sync-summary-row">
        <span className="sync-summary-pill">{syncSummary.localOnlyCount} local only</span>
        <span className="sync-summary-pill">{syncSummary.uploadedCount} uploaded</span>
        <span className="sync-summary-pill">{syncSummary.errorCount} sync errors</span>
      </div>

      <p className="helper-copy">
        Select ready items below, then download one local export package. If backend sync is set up,
        you can also upload ready records for later desktop review.
      </p>

      {captures.length === 0 ? (
        <div className="empty-state empty-state--guided">
          <p>No captures saved yet.</p>
          <small>Use Capture Mode for quick floor notes. The local-first flow works even without backend sync.</small>
          <div className="empty-state__steps">
            <span>1. Fill out the encounter form above.</span>
            <span>2. Save it as a draft or ready record.</span>
            <span>3. Export ready captures as JSON. Upload stays optional when sync is configured.</span>
          </div>
        </div>
      ) : (
        <div className="capture-groups">
          {groupedCaptures.map((group) => (
            <div key={group.status} className="capture-group">
              <div className="capture-group__header">
                <h3>{labelByStatus[group.status]}</h3>
                <span>{group.items.length}</span>
              </div>

              <div className="capture-items">
                {group.items.map((capture) => {
                  const selectable =
                    capture.captureStatus !== 'draft' && capture.captureStatus !== 'archived';

                  return (
                    <article key={capture.captureId} className="capture-item">
                      <div className="capture-item__header">
                        <div className="capture-item__title-row">
                          {selectable ? (
                            <label className="capture-select">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(capture.captureId)}
                                onChange={() => toggleSelected(capture.captureId)}
                                disabled={disabled}
                              />
                              <span>Select</span>
                            </label>
                          ) : (
                            <span className="capture-select capture-select--placeholder">Draft only</span>
                          )}
                          <StatusPill
                            label={labelByStatus[capture.captureStatus]}
                            tone={toneByStatus[capture.captureStatus]}
                          />
                          <StatusPill
                            label={syncLabelByStatus[capture.syncStatus]}
                            tone={syncToneByStatus[capture.syncStatus]}
                          />
                        </div>
                        {capture.captureStatus === 'draft' ? (
                          <button
                            type="button"
                            className="button button--ghost"
                            onClick={() => void onMarkReady(capture.captureId)}
                            disabled={disabled}
                          >
                            Mark Ready
                          </button>
                        ) : null}
                      </div>

                      <h4>{capture.employeeDisplayName}</h4>
                      <p>{capture.summaryShort}</p>

                      <div className="capture-item__meta">
                        {capture.department && capture.station ? (
                          <span>{`${capture.department} | ${capture.station}`}</span>
                        ) : null}
                        <span>{capture.encounterType}</span>
                        <span>{toLocalDateTimeLabel(capture.updatedOnDeviceAt)}</span>
                      </div>

                      {capture.tags.length > 0 ? (
                        <div className="tag-row">
                          {capture.tags.map((tag) => (
                            <span key={tag} className="tag-chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {capture.followUpNeeded ? (
                        <small className="capture-item__followup">
                          Follow-up suggested {capture.followUpSuggestedDate ?? 'date not set'}
                        </small>
                      ) : null}

                      <div className="capture-item__sync-meta">
                        <small>
                          {capture.syncUpdatedAt
                            ? `Sync updated ${toLocalDateTimeLabel(capture.syncUpdatedAt)}`
                            : 'No backend sync activity yet'}
                        </small>
                        {capture.syncError ? (
                          <small className="capture-item__sync-error">{capture.syncError}</small>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CaptureList;
