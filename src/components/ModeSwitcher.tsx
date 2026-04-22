export type AppMode = 'capture' | 'weekView' | 'prioritization';

interface ModeSwitcherProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

const ModeSwitcher = ({ mode, onChange }: ModeSwitcherProps) => (
  <div className="mode-switcher" aria-label="Mode switcher">
    <div className="mode-switcher__primary-row" role="tablist" aria-label="Primary modes">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'capture'}
        className={mode === 'capture' ? 'is-active' : ''}
        onClick={() => onChange('capture')}
      >
        Capture
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'weekView'}
        className={mode === 'weekView' ? 'is-active' : ''}
        onClick={() => onChange('weekView')}
      >
        Week View
      </button>
    </div>

    <div className="mode-switcher__secondary-row" role="tablist" aria-label="Secondary modes">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'prioritization'}
        className={mode === 'prioritization' ? 'is-active' : ''}
        onClick={() => onChange('prioritization')}
      >
        Prioritization List
      </button>
    </div>
  </div>
);

export default ModeSwitcher;
