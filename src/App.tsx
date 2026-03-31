import { useState } from 'react';
import ModeSwitcher from './components/ModeSwitcher';
import { PACKAGE_VERSION_INFO } from './contracts/mobileContracts';
import CaptureMode from './features/capture/CaptureMode';
import GuideModal from './features/guide/GuideModal';
import UtilitiesPanel from './features/utilities/UtilitiesPanel';
import WeekViewMode from './features/week-view/WeekViewMode';
import { useCompanionData } from './app/useCompanionData';

type AppMode = 'capture' | 'weekView';

const App = () => {
  const [mode, setMode] = useState<AppMode>('capture');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const {
    captures,
    snapshots,
    activeSnapshot,
    notice,
    isBusy,
    handleSaveCapture,
    handleMarkReady,
    handleExportSelected,
    handleImportWeekPackage,
    handleSelectWeek,
    handleSeedSampleData,
    handleClearSampleData,
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
            onSave={handleSaveCapture}
            onMarkReady={handleMarkReady}
            onExportSelected={handleExportSelected}
            disabled={isBusy}
          />
        ) : (
          <WeekViewMode
            snapshots={snapshots}
            activeSnapshot={activeSnapshot}
            onImportPackage={handleImportWeekPackage}
            onSelectWeek={handleSelectWeek}
            disabled={isBusy}
          />
        )}
      </main>

      <UtilitiesPanel
        versionInfo={PACKAGE_VERSION_INFO}
        captureCount={captures.length}
        snapshotCount={snapshots.length}
        onSeedSampleData={handleSeedSampleData}
        onClearSampleData={handleClearSampleData}
        disabled={isBusy}
      />

      <GuideModal open={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
};

export default App;
