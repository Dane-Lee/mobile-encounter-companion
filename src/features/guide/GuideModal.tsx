import { useEffect } from 'react';

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
}

const GuideModal = ({ open, onClose }: GuideModalProps) => {
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
              This app is a lightweight companion for fast floor capture and read-only weekly
              desktop snapshots.
            </p>
          </div>
          <button type="button" className="button button--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="guide-modal__body">
          <section className="guide-section">
            <h3>What This App Is</h3>
            <ul className="guide-list">
              <li>A phone-first companion, not a full mobile version of the desktop app.</li>
              <li>Built for quick capture on the floor and simple weekly review on mobile.</li>
              <li>Local-first. Data stays on the device until you import or export a JSON package.</li>
            </ul>
          </section>

          <section className="guide-section">
            <h3>Two Modes</h3>
            <div className="guide-mode-grid">
              <article className="guide-mode-card">
                <h4>Capture</h4>
                <p>Create quick encounter notes, save them locally, then export selected records for desktop import.</p>
              </article>
              <article className="guide-mode-card">
                <h4>Week View</h4>
                <p>Import a desktop-generated weekly snapshot and review one selected week at a time on mobile.</p>
              </article>
            </div>
          </section>

          <section className="guide-section">
            <h3>Capture To Desktop</h3>
            <ol className="guide-steps">
              <li>Enter a quick encounter in Capture Mode.</li>
              <li>Save it as a draft or ready record on the phone.</li>
              <li>Select ready records and export one JSON package.</li>
              <li>Import that package into the desktop app later.</li>
            </ol>
          </section>

          <section className="guide-section">
            <h3>Desktop To Mobile</h3>
            <ol className="guide-steps">
              <li>Generate a mobile weekly snapshot package from the desktop app.</li>
              <li>Import that JSON package in Week View.</li>
              <li>Review totals, reminders, overdue items, and day-by-day activity on mobile.</li>
            </ol>
          </section>

          <section className="guide-section">
            <h3>What Each Feature Does</h3>
            <ul className="guide-list">
              <li>Save Draft: keeps a local note that is not ready for export yet.</li>
              <li>Save Ready: keeps a local note and marks it ready for export.</li>
              <li>Follow-up Needed: flags the capture so the desktop side can review follow-up work later.</li>
              <li>Export Selected: downloads one mobile capture package for desktop import.</li>
              <li>Import Week JSON: loads one desktop-generated weekly snapshot into mobile storage.</li>
              <li>Week On Display: switches between imported weekly snapshots already stored on the device.</li>
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
