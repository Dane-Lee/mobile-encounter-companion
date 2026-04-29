import { useEffect } from 'react';
import {
  RESPONSIBLE_USE_NOTICE_VERSION,
  responsibleUseNotice,
} from '../../privacy/responsibleUseConfig';

interface ResponsibleUseDialogProps {
  open: boolean;
  required: boolean;
  onAccept: () => void;
  onClose: () => void;
}

const ResponsibleUseDialog = ({
  open,
  required,
  onAccept,
  onClose,
}: ResponsibleUseDialogProps) => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !required) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, required]);

  if (!open) {
    return null;
  }

  return (
    <div className="guide-modal responsible-use-dialog" role="presentation">
      <button
        type="button"
        className="guide-modal__backdrop"
        aria-label="Close responsible use notice"
        disabled={required}
        onClick={required ? undefined : onClose}
      />

      <section
        className="guide-modal__sheet responsible-use-dialog__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="responsible-use-title"
      >
        <header className="guide-modal__header">
          <div>
            <p className="eyebrow guide-modal__eyebrow">
              Notice version {RESPONSIBLE_USE_NOTICE_VERSION}
            </p>
            <h2 id="responsible-use-title">{responsibleUseNotice.title}</h2>
            <p>{responsibleUseNotice.intro}</p>
          </div>
          {!required ? (
            <button type="button" className="button button--ghost" onClick={onClose}>
              Close
            </button>
          ) : null}
        </header>

        <div className="guide-modal__body responsible-use-dialog__body">
          {responsibleUseNotice.sections.map((section) => (
            <section key={section.title} className="responsible-use-section">
              <h3>{section.title}</h3>
              <ul className="guide-list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}

          <div className="responsible-use-dialog__footer">
            <p>
              This notice is a product safeguard, not legal advice. Company legal/privacy review is
              still required before production rollout.
            </p>
            <button type="button" className="button" onClick={onAccept}>
              I Understand
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ResponsibleUseDialog;
