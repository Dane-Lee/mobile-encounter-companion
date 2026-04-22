import { useState } from 'react';
import ModeSwitcher, { type AppMode } from './components/ModeSwitcher';
import { PACKAGE_VERSION_INFO } from './contracts/mobileContracts';
import type { CaptureFormValues } from './contracts/mobileContracts';
import CaptureMode from './features/capture/CaptureMode';
import GuideModal from './features/guide/GuideModal';
import PrioritizationMode from './features/prioritization/PrioritizationMode';
import UtilitiesPanel from './features/utilities/UtilitiesPanel';
import WeekViewMode from './features/week-view/WeekViewMode';
import { useCompanionData } from './app/useCompanionData';
import type { CapturePrefillRequest } from './features/prioritization/types';

const App = () => {
  const [mode, setMode] = useState<AppMode>('capture');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [capturePrefill, setCapturePrefill] = useState<
    (Partial<CaptureFormValues> & { requestId: number }) | null
  >(null);
  const {
    captures,
    snapshots,
    activeSnapshot,
    captureOptions,
    hasCaptureOptionOverrides,
    notice,
    isBusy,
    syncStatus,
    handleSaveCapture,
    handleMarkReady,
    handleExportSelected,
    handleUploadSelected,
    handleImportWeekPackage,
    handleSelectWeek,
    handleRefreshWeeklySnapshots,
    handleSeedSampleData,
    handleClearSampleData,
    handleAddDepartmentOption,
    handleRemoveDepartmentOption,
    handleAddLocationOption,
    handleUpdateLocationOptionDepartment,
    handleRemoveLocationOption,
    handleAddStationOption,
    handleUpdateStationOptionLocation,
    handleRemoveStationOption,
    handleResetCaptureOptions,
  } = useCompanionData();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__content">
          <p className="eyebrow">Daily Encounter Tracking</p>
          <div className="app-header__title-row">
            <div className="app-header__logo-frame">
              <img
                className="app-header__logo"
                src="/branding/ati-logo.png"
                alt="ATI Worksite Solutions"
              />
            </div>
            <h1>Mobile Companion</h1>
          </div>
        </div>
        <div className="app-header__controls">
          <ModeSwitcher mode={mode} onChange={setMode} />
          <button
            type="button"
            className="button button--ghost button--guide"
            onClick={() => setIsGuideOpen(true)}
          >
            How This Works
          </button>
        </div>
      </header>

      {notice ? (
        <div className={`notice notice--${notice.tone}`}>
          <p>{notice.message}</p>
        </div>
      ) : null}

      <main className="app-main">
        {mode === 'capture' ? (
          <CaptureMode
            captures={captures}
            captureOptions={captureOptions}
            prefill={capturePrefill}
            onSave={handleSaveCapture}
            onMarkReady={handleMarkReady}
            onExportSelected={handleExportSelected}
            onUploadSelected={handleUploadSelected}
            syncConfigured={syncStatus.isConfigured}
            syncConfigErrors={syncStatus.configErrors}
            disabled={isBusy}
          />
        ) : mode === 'weekView' ? (
          <WeekViewMode
            snapshots={snapshots}
            activeSnapshot={activeSnapshot}
            onImportPackage={handleImportWeekPackage}
            onSelectWeek={handleSelectWeek}
            onRefreshSnapshots={handleRefreshWeeklySnapshots}
            syncConfigured={syncStatus.isConfigured}
            syncConfigErrors={syncStatus.configErrors}
            disabled={isBusy}
          />
        ) : (
          <PrioritizationMode
            captures={captures}
            captureOptions={captureOptions}
            syncConfig={syncStatus.config}
            onOpenCapture={(prefill: CapturePrefillRequest) => {
              setCapturePrefill({
                requestId: Date.now(),
                employeeDisplayName: prefill.employeeDisplayName,
                station: prefill.station,
                encounterType: prefill.encounterType ?? undefined,
                summaryShort: prefill.summaryShort,
                tagsText: prefill.tagsText,
                followUpNeeded: prefill.followUpNeeded,
                followUpSuggestedDate: prefill.followUpSuggestedDate,
              });
              setMode('capture');
            }}
          />
        )}
      </main>

      <UtilitiesPanel
        versionInfo={PACKAGE_VERSION_INFO}
        captureCount={captures.length}
        snapshotCount={snapshots.length}
        captureOptions={captureOptions}
        hasCaptureOptionOverrides={hasCaptureOptionOverrides}
        onSeedSampleData={handleSeedSampleData}
        onClearSampleData={handleClearSampleData}
        onAddDepartmentOption={handleAddDepartmentOption}
        onRemoveDepartmentOption={handleRemoveDepartmentOption}
        onAddLocationOption={handleAddLocationOption}
        onUpdateLocationOptionDepartment={handleUpdateLocationOptionDepartment}
        onRemoveLocationOption={handleRemoveLocationOption}
        onAddStationOption={handleAddStationOption}
        onUpdateStationOptionLocation={handleUpdateStationOptionLocation}
        onRemoveStationOption={handleRemoveStationOption}
        onResetCaptureOptions={handleResetCaptureOptions}
        disabled={isBusy}
      />

      <GuideModal
        open={isGuideOpen}
        syncConfigured={syncStatus.isConfigured}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};

export default App;
