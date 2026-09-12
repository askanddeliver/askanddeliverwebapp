import { useState } from 'react';
import type { FilterPreset } from '../../types';

interface ReportFilterPresetsProps {
  presets: FilterPreset[];
  selectedId: string;
  busy?: boolean;
  onApply: (id: string) => void;
  onSaveAs: (name: string) => Promise<void> | void;
  onUpdate: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

export function ReportFilterPresets({
  presets,
  selectedId,
  busy,
  onApply,
  onSaveAs,
  onUpdate,
  onDelete,
}: ReportFilterPresetsProps) {
  const [savingAs, setSavingAs] = useState(false);
  const [newName, setNewName] = useState('');
  const selected = presets.find((p) => p._id === selectedId) || null;

  const handleSaveAs = async () => {
    const name = newName.trim();
    if (!name) return;
    await onSaveAs(name);
    setNewName('');
    setSavingAs(false);
  };

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Presets
      </h3>
      <select
        value={selectedId}
        disabled={busy}
        onChange={(e) => onApply(e.target.value)}
        className="input text-sm w-full"
      >
        <option value="">Select a saved filter set…</option>
        {presets.map((preset) => (
          <option key={preset._id} value={preset._id}>
            {preset.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 mt-1">
        Saves clients, projects, billing type, dates, people, columns, and entry options.
      </p>

      {savingAs ? (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSaveAs();
              if (e.key === 'Escape') {
                setSavingAs(false);
                setNewName('');
              }
            }}
            placeholder="Preset name"
            maxLength={80}
            autoFocus
            className="input text-sm w-full"
            disabled={busy}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSaveAs()}
              disabled={busy || !newName.trim()}
              className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setSavingAs(false);
                setNewName('');
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            onClick={() => setSavingAs(true)}
            disabled={busy}
            className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            Save as
          </button>
          <button
            type="button"
            onClick={() => void onUpdate()}
            disabled={busy || !selected}
            className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            Update
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={busy || !selected}
            className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}
    </section>
  );
}
