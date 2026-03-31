import { useEffect } from 'react';

interface InfoDialogProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
}

const InfoDialog = ({ open, title, description, onClose }: InfoDialogProps) => {
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
    <div className="info-dialog" role="presentation">
      <button
        type="button"
        className="info-dialog__backdrop"
        aria-label="Close information"
        onClick={onClose}
      />
      <section
        className="info-dialog__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-dialog-title"
      >
        <div className="info-dialog__header">
          <h3 id="info-dialog-title">{title}</h3>
          <button type="button" className="button button--ghost info-dialog__close" onClick={onClose}>
            Close
          </button>
        </div>
        <p>{description}</p>
      </section>
    </div>
  );
};

export default InfoDialog;
