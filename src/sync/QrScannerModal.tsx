import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { setDesktopSyncSettings, type DesktopSyncSettings } from './config';
import { toFriendlySyncErrorFromList } from './presentation';

const QR_SCANNER_REGION_ID = 'qr-scanner-region';
const QR_NOT_RECOGNIZED_MESSAGE =
  'QR code not recognized. Make sure you\'re scanning the Mobile Setup QR from the desktop app.';
const CAMERA_START_ERROR_MESSAGE =
  'Could not start the camera. Check camera permission in your browser and try again.';

interface DesktopSetupQrPayload {
  server_url: string;
  user_id: string;
  worksite_id: string;
}

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onSettingsSaved: (settings: DesktopSyncSettings) => void;
  onSyncSuccess: () => void;
  triggerSync: () => Promise<{ errors: string[] }>;
}

export interface QrScannerModalHandle {
  startScanningFromUserGesture: () => Promise<void>;
}

const scanConfig: Html5QrcodeCameraScanConfig = {
  fps: 10,
  qrbox: 240,
  aspectRatio: 1,
};

const parseQrPayload = (value: string): DesktopSetupQrPayload | null => {
  try {
    const parsedValue = JSON.parse(value) as Partial<DesktopSetupQrPayload>;

    if (
      typeof parsedValue !== 'object' ||
      parsedValue === null ||
      Array.isArray(parsedValue) ||
      typeof parsedValue.server_url !== 'string' ||
      typeof parsedValue.user_id !== 'string' ||
      typeof parsedValue.worksite_id !== 'string'
    ) {
      return null;
    }

    const serverUrl = parsedValue.server_url.trim();
    const userId = parsedValue.user_id.trim();
    const worksiteId = parsedValue.worksite_id.trim();

    if (!serverUrl || !userId || !worksiteId) {
      return null;
    }

    return {
      server_url: serverUrl,
      user_id: userId,
      worksite_id: worksiteId,
    };
  } catch {
    return null;
  }
};

const QrScannerModal = forwardRef<QrScannerModalHandle, QrScannerModalProps>(
  ({ open, onClose, onSettingsSaved, onSyncSuccess, triggerSync }, ref) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isHandlingDecodeRef = useRef(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [isStartingCamera, setIsStartingCamera] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isApplyingConfig, setIsApplyingConfig] = useState(false);

    const stopScanner = async () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        try {
          await scanner.stop();
        } catch {
          // Scanner might not have started yet. Clear the instance either way.
        }

        try {
          scanner.clear();
        } catch {
          // Ignore cleanup errors. The next start call recreates the instance.
        }
      }

      setIsStartingCamera(false);
      setIsScanning(false);
    };

    const handleDecodedText = async (decodedText: string) => {
      if (isHandlingDecodeRef.current) {
        return;
      }

      const payload = parseQrPayload(decodedText);
      if (!payload) {
        setScanError(QR_NOT_RECOGNIZED_MESSAGE);
        return;
      }

      isHandlingDecodeRef.current = true;
      setScanError(null);
      setIsApplyingConfig(true);

      await stopScanner();

      const nextSettings = setDesktopSyncSettings({
        baseUrl: payload.server_url,
        userId: payload.user_id,
        worksiteId: payload.worksite_id,
      });
      onSettingsSaved(nextSettings);

      const summary = await triggerSync();
      const friendlySyncError = toFriendlySyncErrorFromList(summary.errors);

      if (friendlySyncError) {
        setScanError(friendlySyncError);
        setIsApplyingConfig(false);
        isHandlingDecodeRef.current = false;
        return;
      }

      setIsApplyingConfig(false);
      isHandlingDecodeRef.current = false;
      onSyncSuccess();
      onClose();
    };

    const startScanningFromUserGesture = async () => {
      if (!open || isStartingCamera || isScanning || isApplyingConfig) {
        return;
      }

      setScanError(null);
      setIsStartingCamera(true);
      isHandlingDecodeRef.current = false;

      try {
        const existingScanner = scannerRef.current;
        if (existingScanner) {
          await stopScanner();
        }

        const { Html5Qrcode } = await import('html5-qrcode');
        const nextScanner = new Html5Qrcode(QR_SCANNER_REGION_ID, false);
        scannerRef.current = nextScanner;

        await nextScanner.start(
          { facingMode: 'environment' },
          scanConfig,
          (decodedText) => {
            void handleDecodedText(decodedText);
          },
          () => {
            // Ignore per-frame decode misses.
          },
        );

        setIsStartingCamera(false);
        setIsScanning(true);
      } catch {
        await stopScanner();
        setScanError(CAMERA_START_ERROR_MESSAGE);
      }
    };

    useImperativeHandle(ref, () => ({
      startScanningFromUserGesture,
    }));

    useEffect(() => {
      if (open) {
        setScanError(null);
        setIsApplyingConfig(false);
        isHandlingDecodeRef.current = false;
        return undefined;
      }

      void stopScanner();
      return undefined;
    }, [open]);

    useEffect(
      () => () => {
        void stopScanner();
      },
      [],
    );

    if (!open) {
      return null;
    }

    return (
      <div className="sync-settings-modal sync-settings-modal--qr" role="dialog" aria-modal="true">
        <button
          type="button"
          className="sync-settings-modal__backdrop"
          onClick={() => {
            void stopScanner().finally(onClose);
          }}
          aria-label="Close QR scanner"
        />

        <section className="sync-settings-modal__sheet">
          <header className="sync-settings-modal__header">
            <div>
              <p className="sync-settings-modal__eyebrow">Desktop Sync</p>
              <h2>Scan Setup QR</h2>
              <p>
                Point your camera at the Mobile Setup QR displayed by the desktop app.
              </p>
            </div>
          </header>

          <div className="sync-settings-modal__body sync-settings-modal__body--qr">
            <div
              id={QR_SCANNER_REGION_ID}
              className={`qr-scanner-region${isScanning ? ' is-live' : ''}`}
            />

            {!isScanning && !isStartingCamera && !isApplyingConfig ? (
              <div className="sync-settings-status">
                <strong>Scanner ready</strong>
                <span>Tap Start Camera to request permission and begin scanning.</span>
              </div>
            ) : null}

            {isStartingCamera ? (
              <div className="sync-settings-status">
                <strong>Starting camera</strong>
                <span>Waiting for camera permission and scanner startup.</span>
              </div>
            ) : null}

            {isApplyingConfig ? (
              <div className="sync-settings-status">
                <strong>Pairing with desktop app</strong>
                <span>Settings were read from the QR code. Trying the first sync now.</span>
              </div>
            ) : null}

            {scanError ? (
              <div className="sync-settings-status sync-settings-status--error">
                <strong>Scan problem</strong>
                <span>{scanError}</span>
              </div>
            ) : null}
          </div>

          <footer className="sync-settings-modal__footer sync-settings-modal__footer--qr">
            {!isScanning && !isApplyingConfig ? (
              <button
                type="button"
                className="button"
                onClick={() => void startScanningFromUserGesture()}
                disabled={isStartingCamera}
              >
                {scanError ? 'Scan Again' : 'Start Camera'}
              </button>
            ) : null}
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                void stopScanner().finally(onClose);
              }}
            >
              Close
            </button>
          </footer>
        </section>
      </div>
    );
  },
);

QrScannerModal.displayName = 'QrScannerModal';

export default QrScannerModal;
