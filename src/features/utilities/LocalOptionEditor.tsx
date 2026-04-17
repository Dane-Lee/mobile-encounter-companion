import { useState } from 'react';

interface LocalOptionEditorProps {
  title: string;
  helperText: string;
  placeholder: string;
  emptyText: string;
  items: string[];
  onAdd: (value: string) => Promise<void>;
  onRemove: (value: string) => Promise<void>;
  disabled?: boolean;
}

const LocalOptionEditor = ({
  title,
  helperText,
  placeholder,
  emptyText,
  items,
  onAdd,
  onRemove,
  disabled = false,
}: LocalOptionEditorProps) => {
  const [draftValue, setDraftValue] = useState('');

  const normalizedDraftValue = draftValue.trim();
  const alreadyExists = items.some(
    (item) => item.toLocaleLowerCase() === normalizedDraftValue.toLocaleLowerCase(),
  );

  const handleAdd = async () => {
    if (!normalizedDraftValue || alreadyExists) {
      return;
    }

    await onAdd(normalizedDraftValue);
    setDraftValue('');
  };

  return (
    <section className="option-editor">
      <div className="option-editor__header">
        <div>
          <h3>{title}</h3>
          <p>{helperText}</p>
        </div>
      </div>

      <div className="option-editor__add-row">
        <input
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
        />
        <button
          type="button"
          className="button button--secondary"
          onClick={() => void handleAdd()}
          disabled={disabled || !normalizedDraftValue || alreadyExists}
        >
          Add
        </button>
      </div>

      {alreadyExists && normalizedDraftValue ? (
        <p className="option-editor__note">That option already exists.</p>
      ) : null}

      {items.length ? (
        <div className="option-editor__list">
          {items.map((item) => (
            <div key={item} className="option-editor__item">
              <span>{item}</span>
              <button
                type="button"
                className="button button--ghost option-editor__remove"
                onClick={() => void onRemove(item)}
                disabled={disabled}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state option-editor__empty">
          <p>{emptyText}</p>
          <small>Add a local option above to use it in the capture form.</small>
        </div>
      )}
    </section>
  );
};

export default LocalOptionEditor;
