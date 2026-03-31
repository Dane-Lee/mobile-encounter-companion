import type { CaptureFormValues, MobileEncounterCapture } from '../../contracts/mobileContracts';
import CaptureForm from './CaptureForm';
import CaptureList from './CaptureList';

interface CaptureModeProps {
  captures: MobileEncounterCapture[];
  onSave: (values: CaptureFormValues, saveMode: 'draft' | 'ready') => Promise<void>;
  onMarkReady: (captureId: string) => Promise<void>;
  onExportSelected: (captureIds: string[]) => Promise<void>;
  disabled?: boolean;
}

const CaptureMode = ({
  captures,
  onSave,
  onMarkReady,
  onExportSelected,
  disabled = false,
}: CaptureModeProps) => (
  <div className="screen-column">
    <CaptureForm onSave={onSave} disabled={disabled} />
    <CaptureList
      captures={captures}
      onMarkReady={onMarkReady}
      onExportSelected={onExportSelected}
      disabled={disabled}
    />
  </div>
);

export default CaptureMode;
