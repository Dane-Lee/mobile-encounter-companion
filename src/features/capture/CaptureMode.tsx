import CollapsibleSection from '../../components/CollapsibleSection';
import type { CaptureFormValues, MobileEncounterCapture } from '../../contracts/mobileContracts';
import type { CaptureOptionLists } from '../../config/siteCaptureOptions';
import CaptureForm from './CaptureForm';
import CaptureList from './CaptureList';

interface CaptureModeProps {
  captures: MobileEncounterCapture[];
  captureOptions: CaptureOptionLists;
  prefill?: (Partial<CaptureFormValues> & { requestId: number }) | null;
  onSave: (values: CaptureFormValues, saveMode: 'draft' | 'ready') => Promise<void>;
  onMarkReady: (captureId: string) => Promise<void>;
  onExportSelected: (captureIds: string[]) => Promise<void>;
  onUploadSelected: (captureIds: string[]) => Promise<void>;
  syncConfigured: boolean;
  syncConfigErrors: string[];
  disabled?: boolean;
}

const CaptureMode = ({
  captures,
  captureOptions,
  prefill,
  onSave,
  onMarkReady,
  onExportSelected,
  onUploadSelected,
  syncConfigured,
  syncConfigErrors,
  disabled = false,
}: CaptureModeProps) => (
  <div className="screen-column">
    <CaptureForm
      captureOptions={captureOptions}
      prefill={prefill}
      onSave={onSave}
      disabled={disabled}
    />
    <CollapsibleSection
      title="Local Captures"
      description="Saved locally until you export them or optionally upload later."
      meta={`${captures.length} saved`}
      className="collapsible-panel--captures"
    >
      <section className="section-card section-card--capture-list">
        <CaptureList
          captures={captures}
          onMarkReady={onMarkReady}
          onExportSelected={onExportSelected}
          onUploadSelected={onUploadSelected}
          syncConfigured={syncConfigured}
          syncConfigErrors={syncConfigErrors}
          disabled={disabled}
        />
      </section>
    </CollapsibleSection>
  </div>
);

export default CaptureMode;
