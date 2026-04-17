import { useEffect } from 'react';

interface GuideModalProps {
  open: boolean;
  syncConfigured: boolean;
  onClose: () => void;
}

const GuideModal = ({ open, syncConfigured, onClose }: GuideModalProps) => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="guide-modal" role="presentation">
      <button
        type="button"
        className="guide-modal__backdrop"
        aria-label="Close guide"
        onClick={onClose}
      />

      <section
        className="guide-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
      >
        <header className="guide-modal__header">
          <div>
            <p className="eyebrow guide-modal__eyebrow">Guide</p>
            <h2 id="guide-title">How This Works</h2>
            <p>
              This app is a lightweight companion for fast floor capture, read-only weekly desktop
              snapshots, and a daily prioritization extension.
            </p>
          </div>
          <button type="button" className="button button--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="guide-modal__body">
          {!syncConfigured ? (
            <section className="guide-section">
              <div className="sync-status-note sync-status-note--guide">
                <strong>Backend sync not configured</strong>
                <span>Local save, local export, manual week import, and week display are the working paths right now.</span>
              </div>
            </section>
          ) : null}

          <section className="guide-section">
            <h3>What This App Is</h3>
            <ul className="guide-list">
              <li>A phone-first companion, not a full mobile version of the desktop app.</li>
              <li>Built for quick capture on the floor and simple weekly review on mobile.</li>
              <li>Local-first. Backend sync is optional and should be treated as provisional until tested in your environment.</li>
            </ul>
          </section>

          <section className="guide-section">
            <h3>Three Modes</h3>
            <div className="guide-mode-grid">
              <article className="guide-mode-card">
                <h4>Capture</h4>
                <p>Create quick encounter notes, save them locally, and export them as JSON. Optional backend upload only appears when sync is configured.</p>
              </article>
              <article className="guide-mode-card">
                <h4>Week View</h4>
                <p>Import a desktop-generated week JSON and review one week at a time. Optional backend refresh only appears when sync is configured.</p>
              </article>
              <article className="guide-mode-card">
                <h4>Prioritization</h4>
                <p>Daily prioritization list derived from mobile captures, a daily roster, and station risk settings. It stays modular so ETS can replace those temporary sources later.</p>
              </article>
            </div>
          </section>

          <section className="guide-section">
            <h3>Local-First Workflow</h3>
            <ol className="guide-steps">
              <li>Enter a quick encounter in Capture Mode.</li>
              <li>Save it as a draft or ready record on the phone.</li>
              <li>Export ready captures as one local JSON package for desktop import later.</li>
              <li>Import a desktop-generated week snapshot JSON in Week View when you want weekly reference on mobile.</li>
            </ol>
          </section>

          <section className="guide-section">
            <h3>Optional Backend Sync</h3>
            <ol className="guide-steps">
              <li>If configured, ready mobile captures can be uploaded as <code>mobile_capture_entry</code> records.</li>
              <li>If configured, Week View can refresh desktop-authored <code>weekly_snapshot</code> records from the backend.</li>
              <li>If configured, Prioritization can also sync daily roster/risk setup and today’s prioritization state.</li>
            </ol>
          </section>

          <section className="guide-section">
            <h3>What Each Feature Does</h3>
            <ul className="guide-list">
              <li>Save Draft: keeps a local note that is not ready yet.</li>
              <li>Save Ready: keeps a local note and marks it ready for export or optional upload.</li>
              <li>Follow-up Needed: flags the capture so the desktop side can review follow-up work later.</li>
              <li>Structured tags: use <code>uncertain-pain</code> and <code>uncertain-mobility</code> when those temporary prioritization markers apply.</li>
              <li>Download JSON: creates a local export package for later desktop import.</li>
              <li>Import Week JSON: loads a desktop-generated weekly snapshot into mobile storage.</li>
              <li>Prioritization List: derives employee and station items into the fixed seven-bucket order and preserves today’s working status/execution state.</li>
              <li>Upload Selected / Refresh From Sync: optional backend actions that only appear when sync is configured.</li>
              <li>Week On Display: switches between cached weekly snapshots already stored on the device.</li>
            </ul>
          </section>

          <section className="guide-section">
            <h3>What The App Does Not Do</h3>
            <ul className="guide-list">
              <li>No real-time sync.</li>
              <li>No editing of desktop reminders or weekly desktop logic on mobile.</li>
              <li>No employee directory management, admin tools, analytics dashboards, or full desktop navigation.</li>
            </ul>
          </section>
        </div>
      </section>
    </div>
  );
};

export default GuideModal;
