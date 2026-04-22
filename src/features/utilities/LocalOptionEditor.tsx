import { useState } from 'react';

interface LocalOptionEditorBaseProps {
  title: string;
  helperText: string;
  placeholder: string;
  emptyText: string;
  disabled?: boolean;
}

interface SimpleLocalOptionEditorProps extends LocalOptionEditorBaseProps {
  mode: 'simple';
  items: string[];
  onAdd: (value: string) => Promise<void>;
  onRemove: (value: string) => Promise<void>;
}

interface LinkedLocalOptionEditorProps extends LocalOptionEditorBaseProps {
  mode: 'linked';
  items: Array<{ name: string; parent: string | null }>;
  parentLabel: string;
  parentPlaceholder: string;
  parentOptions: string[];
  onAdd: (value: string, parent: string | null) => Promise<void>;
  onUpdateParent: (value: string, parent: string | null) => Promise<void>;
  onRemove: (value: string) => Promise<void>;
}

type LocalOptionEditorProps = SimpleLocalOptionEditorProps | LinkedLocalOptionEditorProps;

const LocalOptionEditor = (props: LocalOptionEditorProps) => {
  const [draftValue, setDraftValue] = useState('');
  const [draftParent, setDraftParent] = useState('');

  const normalizedDraftValue = draftValue.trim();
  const alreadyExists = props.items.some((item) =>
    (typeof item === 'string' ? item : item.name).toLocaleLowerCase() ===
    normalizedDraftValue.toLocaleLowerCase(),
  );

  const handleAdd = async () => {
    if (!normalizedDraftValue || alreadyExists) {
      return;
    }

    if (props.mode === 'simple') {
      await props.onAdd(normalizedDraftValue);
    } else {
      await props.onAdd(normalizedDraftValue, draftParent || null);
      setDraftParent('');
    }

    setDraftValue('');
  };

  return (
    <section className="option-editor">
      <div className="option-editor__header">
        <div>
          <h3>{props.title}</h3>
          <p>{props.helperText}</p>
        </div>
      </div>

      <div className={`option-editor__add-row${props.mode === 'linked' ? ' option-editor__add-row--linked' : ''}`}>
        <input
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          placeholder={props.placeholder}
          autoComplete="off"
          disabled={props.disabled}
        />
        {props.mode === 'linked' ? (
          <label className="field option-editor__parent-field">
            <span>{props.parentLabel}</span>
            <select
              value={draftParent}
              onChange={(event) => setDraftParent(event.target.value)}
              disabled={props.disabled}
            >
              <option value="">{props.parentPlaceholder}</option>
              {props.parentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className="button button--secondary"
          onClick={() => void handleAdd()}
          disabled={props.disabled || !normalizedDraftValue || alreadyExists}
        >
          Add
        </button>
      </div>

      {alreadyExists && normalizedDraftValue ? (
        <p className="option-editor__note">That option already exists.</p>
      ) : null}

      {props.items.length ? (
        <div className="option-editor__list">
          {props.mode === 'simple'
            ? props.items.map((item) => (
                <div key={item} className="option-editor__item">
                  <span>{item}</span>
                  <button
                    type="button"
                    className="button button--ghost option-editor__remove"
                    onClick={() => void props.onRemove(item)}
                    disabled={props.disabled}
                  >
                    Delete
                  </button>
                </div>
              ))
            : props.items.map((item) => (
                <div key={item.name} className="option-editor__item option-editor__item--linked">
                  <div className="option-editor__item-copy">
                    <span>{item.name}</span>
                  </div>
                  <label className="field option-editor__parent-field">
                    <span>{props.parentLabel}</span>
                    <select
                      value={item.parent ?? ''}
                      onChange={(event) =>
                        void props.onUpdateParent(item.name, event.target.value || null)
                      }
                      disabled={props.disabled}
                    >
                      <option value="">{props.parentPlaceholder}</option>
                      {props.parentOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="button button--ghost option-editor__remove"
                    onClick={() => void props.onRemove(item.name)}
                    disabled={props.disabled}
                  >
                    Delete
                  </button>
                </div>
              ))}
        </div>
      ) : (
        <div className="empty-state option-editor__empty">
          <p>{props.emptyText}</p>
          <small>Add a local option above to use it in the capture form.</small>
        </div>
      )}
    </section>
  );
};

export default LocalOptionEditor;
