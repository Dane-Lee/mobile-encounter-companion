import { useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { flushSync } from 'react-dom';
import {
  clearDesktopSyncSettings,
  getDesktopSyncSettings,
  getDesktopSyncSettingsErrors,
  isDesktopSyncConfigured,
  setDesktopSyncSettings,
  SYNC_SETTINGS_CHANGED_EVENT,
  type DesktopSyncSettings,
} from './config';
import { toFriendlySyncErrorMessage } from './presentation';
import QrScannerModal, { type QrScannerModalHandle } from './QrScannerModal';
import { useSyncStatus } from './useSyncStatus';

const formatLastSyncAt = (value: string | null) => {
  if (!value) {
    return 'Not synced yet';
  }

  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const readSettings = () => getDesktopSyncSettings();

export const SyncInfrastructure = ({ children }: PropsWithChildren) => {
  const qrScannerRef = useRef<QrScannerModalHandle | null>(null);
  const hasAutoOpenedRef = useRef(false);
  const [settings, setSettings] = useState<DesktopSyncSettings>(() => readSettings());
  const [draftBaseUrl, setDraftBaseUrl] = useState(settings.baseUrl ?? '');
  const [draftUserId, setDraftUserId] = useState(settings.userId ?? '');
  const [draftWorksiteId, setDraftWorksiteId] = useState(settings.worksiteId ?? '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(
    () => !isDesktopSyncConfigured(settings),
  );
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { lastSyncAt, isSyncing, syncError, triggerSync } = useSyncStatus();

  const configErrors = useMemo(() => getDesktopSyncSettingsErrors(settings), [settings]);
  const syncConfigured = useMemo(() => isDesktopSyncConfigured(settings), [settings]);
  const friendlySyncError = useMemo(() => {
    const normalizedSyncError = syncError?.toLocaleLowerCase() ?? '';
    const isStaleConfigError =
      syncConfigured &&
      (normalizedSyncError.includes('desktop server url is not set') ||
        normalizedSyncError.includes('desktop server url is not configured') ||
        normalizedSyncError.includes('user id is not set') ||
        normalizedSyncError.includes('worksite id is not set') ||
        normalizedSyncError.includes('must be configured for desktop sync'));

    return isStaleConfigError ? null : toFriendlySyncErrorMessage(syncError);
  }, [syncConfigured, syncError]);

  useEffect(() => {
    const refresh = () => {
      const nextSettings = readSettings();
      setSettings(nextSettings);
      setDraftBaseUrl(nextSettings.baseUrl ?? '');
      setDraftUserId(nextSettings.userId ?? '');
      setDraftWorksiteId(nextSettings.worksiteId ?? '');
    };

    window.addEventListener(SYNC_SETTINGS_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener(SYNC_SETTINGS_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (!syncConfigured && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      setIsSettingsOpen(true);
    }
  }, [syncConfigured]);

  const handleOpenQrScanner = () => {
    setSaveError(null);

    flushSync(() => {
      setIsSettingsOpen(true);
      setIsQrScannerOpen(true);
    });

    void qrScannerRef.current?.startScanningFromUserGesture();
  };

  const handleManualSave = async () => {
    setSaveError(null);

    const nextSettings = setDesktopSyncSettings({
      baseUrl: draftBaseUrl,
      userId: draftUserId,
      worksiteId: draftWorksiteId,
    });
    const nextErrors = getDesktopSyncSettingsErrors(nextSettings);

    if (nextErrors.length > 0) {
      setSaveError(nextErrors.join(' '));
      return;
    }

    setSettings(nextSettings);
    setIsManualEntryOpen(false);

    const summary = await triggerSync();
    if (summary.errors.length === 0) {
      setIsSettingsOpen(false);
    }
  };

  const handleReconfigure = () => {
    const clearedSettings = clearDesktopSyncSettings();
    setSettings(clearedSettings);
    setDraftBaseUrl('');
    setDraftUserId('');
    setDraftWorksiteId('');
    setSaveError(null);
    setIsManualEntryOpen(false);
    setIsQrScannerOpen(false);
    setIsSettingsOpen(true);
  };

  const statusLabel = isSyncing
    ? 'Sync in progress'
    : friendlySyncError
      ? 'Sync needs attention'
      : 'Ready to sync';

  return (
    <>
      {children}

      <button
        type="button"
        className="sync-settings-launcher"
        onClick={() => setIsSettingsOpen(true)}
      >
        Sync
      </button>

      {isSettingsOpen ? (
        <div className="sync-settings-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="sync-settings-modal__backdrop"
            onClick={() => setIsSettingsOpen(false)}
            aria-label="Close sync settings"
          />

          <section className="sync-settings-modal__sheet">
            <header className="sync-settings-modal__header">
              <div>
                <p className="sync-settings-modal__eyebrow">Desktop Sync</p>
                <h2>{syncConfigured ? 'Desktop Sync Status' : 'Set Up Desktop Sync'}</h2>
                <p>
                  {syncConfigured
                    ? 'Use this screen to run sync, review the current scope, or re-pair with a different desktop app.'
                    : 'Pair this device with the desktop app by scanning its setup QR. Manual entry stays available as a fallback.'}
                </p>
              </div>
            </header>

            {!syncConfigured ? (
              <>
                <div className="sync-settings-modal__body">
                  <div className="sync-status-note">
                    <strong>Configuration only</strong>
                    <span>
                      QR and manual pairing only store a sync destination on this browser. Production
                      use still needs server-side authentication, device registration, authorization,
                      audit logging, and HTTPS.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="sync-primary-action"
                    onClick={handleOpenQrScanner}
                  >
                    <span className="sync-primary-action__eyebrow">Recommended</span>
                    <strong>Scan QR from Desktop App</strong>
                    <small>Open the Mobile Setup QR on the desktop app, then scan it here.</small>
                  </button>

                  <details
                    className="sync-manual-entry"
                    open={isManualEntryOpen}
                    onToggle={(event) =>
                      setIsManualEntryOpen((event.currentTarget as HTMLDetailsElement).open)
                    }
                  >
                    <summary>Enter Manually</summary>
                    <div className="sync-manual-entry__content">
                      <label className="sync-settings-field">
                        <span>Server base URL</span>
                        <input
                          value={draftBaseUrl}
                          onChange={(event) => setDraftBaseUrl(event.target.value)}
                          placeholder="http://192.168.1.25:3001"
                          autoComplete="off"
                        />
                      </label>

                      <label className="sync-settings-field">
                        <span>User ID</span>
                        <input
                          value={draftUserId}
                          onChange={(event) => setDraftUserId(event.target.value)}
                          placeholder="user-001"
                          autoComplete="off"
                        />
                      </label>

                      <label className="sync-settings-field">
                        <span>Worksite ID</span>
                        <input
                          value={draftWorksiteId}
                          onChange={(event) => setDraftWorksiteId(event.target.value)}
                          placeholder="worksite-001"
                          autoComplete="off"
                        />
                      </label>

                      {saveError ? (
                        <div className="sync-settings-status sync-settings-status--error">
                          <strong>Manual entry needs attention</strong>
                          <span>{saveError}</span>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        className="button"
                        onClick={() => void handleManualSave()}
                        disabled={isSyncing}
                      >
                        Save
                      </button>
                    </div>
                  </details>
                </div>

                <footer className="sync-settings-modal__footer">
                  <button
                    type="button"
                    className="sync-settings-link"
                    onClick={() => setIsSettingsOpen(false)}
                  >
                    Continue Without Sync
                  </button>
                </footer>
              </>
            ) : (
              <>
                <div className="sync-settings-modal__body">
                  <div className="sync-connection-card">
                    <div className="sync-connection-card__header">
                      <span className="sync-connection-card__indicator" aria-hidden="true" />
                      <div>
                        <strong>{`Connected to ${settings.baseUrl}`}</strong>
                        <span>{statusLabel}</span>
                      </div>
                    </div>

                    <div className="sync-connection-card__scope">
                      <div>
                        <label>User ID</label>
                        <span>{settings.userId}</span>
                      </div>
                      <div>
                        <label>Worksite ID</label>
                        <span>{settings.worksiteId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sync-status-note">
                    <strong>Production safeguard required</strong>
                    <span>
                      This configured scope is not a substitute for authenticated backend access,
                      device revocation, worksite authorization, or audit logs.
                    </span>
                  </div>

                  <div className="sync-settings-status">
                    <strong>{statusLabel}</strong>
                    <span>Last sync: {formatLastSyncAt(lastSyncAt)}</span>
                    {friendlySyncError ? <span>{friendlySyncError}</span> : null}
                    {!friendlySyncError && configErrors.length > 0 ? (
                      <span>{configErrors.join(' ')}</span>
                    ) : null}
                  </div>
                </div>

                <footer className="sync-settings-modal__footer sync-settings-modal__footer--configured">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setIsSettingsOpen(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={handleReconfigure}
                    disabled={isSyncing}
                  >
                    Reconfigure
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => void triggerSync()}
                    disabled={isSyncing}
                  >
                    Sync Now
                  </button>
                </footer>
              </>
            )}
          </section>
        </div>
      ) : null}

      <QrScannerModal
        ref={qrScannerRef}
        open={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onSettingsSaved={(nextSettings) => {
          setSaveError(null);
          setSettings(nextSettings);
          setDraftBaseUrl(nextSettings.baseUrl ?? '');
          setDraftUserId(nextSettings.userId ?? '');
          setDraftWorksiteId(nextSettings.worksiteId ?? '');
        }}
        onSyncSuccess={() => {
          setSaveError(null);
          setIsSettingsOpen(false);
          setIsQrScannerOpen(false);
        }}
        triggerSync={triggerSync}
      />
    </>
  );
};

export default SyncInfrastructure;
