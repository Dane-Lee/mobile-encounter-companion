import { useEffect, useState } from 'react';
import StatusPill from '../../components/StatusPill';
import type { MobileEncounterCapture } from '../../contracts/mobileContracts';
import { toLocalDateTimeLabel } from '../../lib/dateTime';

interface CaptureListProps {
  captures: MobileEncounterCapture[];
  onMarkReady: (captureId: string) => Promise<void>;
  onExportSelected: (captureIds: string[]) => Promise<void>;
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

const CaptureList = ({
  captures,
  onMarkReady,
  onExportSelected,
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

  return (
    <div className="capture-list-panel">
      <div className="section-card__body-header">
        <div>
          <p className="section-card__body-title">Saved On This Device</p>
          <p className="section-card__body-copy">
            Mobile captures stay local until you export a versioned JSON package.
          </p>
        </div>
        <div className="section-card__action-stack">
          <button
            type="button"
            className="button"
            disabled={disabled || selectedIds.length === 0}
            onClick={() => void onExportSelected(selectedIds)}
          >
            Export {selectedIds.length || ''} Selected
          </button>
          <small className="helper-copy helper-copy--action">
            Export one JSON package for later desktop import. Drafts are not included.
          </small>
        </div>
      </div>

      <p className="helper-copy">
        Select ready items below, then export them as one package. Saved captures stay local until
        you do that export.
      </p>

      {captures.length === 0 ? (
        <div className="empty-state empty-state--guided">
          <p>No captures saved yet.</p>
          <small>Use Capture Mode for quick floor notes while you are away from the desktop app.</small>
          <div className="empty-state__steps">
            <span>1. Fill out the encounter form above.</span>
            <span>2. Save it as a draft or ready record.</span>
            <span>3. Export ready items later for desktop import.</span>
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
