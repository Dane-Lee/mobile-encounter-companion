type AppMode = 'capture' | 'weekView';

interface ModeSwitcherProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

const ModeSwitcher = ({ mode, onChange }: ModeSwitcherProps) => (
  <div className="mode-switcher" role="tablist" aria-label="Mode switcher">
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
);

export default ModeSwitcher;
