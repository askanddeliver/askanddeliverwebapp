import { useEffect, useMemo, useState } from 'react';
import { Database, Download, Plus, Trash2 } from 'lucide-react';
import { exportApi, filterPresetsApi } from '../services/api';
import {
  getReportDateRange,
  toUTCEndOfDay,
  toUTCStartOfDay,
} from '../utils/calculations';
import type { FilterPreset, FilterPresetPayload } from '../types';

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return msg;
  }
  return fallback;
}

function payloadFromPreset(preset: FilterPreset, name: string): FilterPresetPayload {
  return {
    name,
    kind: 'BACKUP',
    clientIds: preset.clientIds,
    projectIds: preset.projectIds,
    billingModes: preset.billingModes,
    memberAuth0Ids: preset.memberAuth0Ids,
    datePreset: preset.datePreset ?? null,
    startDate: preset.startDate,
    endDate: preset.endDate,
    columnIds: preset.columnIds,
    includeTimeEntries: preset.includeTimeEntries,
    includeEntryDescriptions: preset.includeEntryDescriptions,
  };
}

function Backups() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullBusy, setFullBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [sourcePresetId, setSourcePresetId] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const reportPresets = useMemo(
    () => presets.filter((p) => p.kind === 'REPORT').sort((a, b) => a.name.localeCompare(b.name)),
    [presets]
  );
  const backupPresets = useMemo(
    () => presets.filter((p) => p.kind === 'BACKUP').sort((a, b) => a.name.localeCompare(b.name)),
    [presets]
  );

  const loadPresets = async () => {
    try {
      setLoading(true);
      const res = await filterPresetsApi.getAll();
      setPresets(res.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load presets:', err);
      setError(apiErrorMessage(err, 'Failed to load backup presets'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPresets();
  }, []);

  const downloadBackup = async (preset?: FilterPreset) => {
    try {
      if (preset) setRowBusy(preset._id);
      else setFullBusy(true);
      setError(null);

      let startDate: string | undefined;
      let endDate: string | undefined;
      if (preset) {
        const range = preset.datePreset
          ? getReportDateRange(preset.datePreset)
          : { startDate: preset.startDate, endDate: preset.endDate };
        startDate = range.startDate ? toUTCStartOfDay(range.startDate) : undefined;
        endDate = range.endDate ? toUTCEndOfDay(range.endDate) : undefined;
      }

      const response = await exportApi.backup(
        preset
          ? { presetId: preset._id, startDate, endDate }
          : undefined
      );
      const day = new Date().toISOString().split('T')[0];
      const filename = preset
        ? `askanddeliver-backup-${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'preset'}-${day}.json`
        : `askanddeliver-backup-${day}.json`;
      downloadJson(response.data, filename);
    } catch (err) {
      console.error('Failed to export backup:', err);
      setError(apiErrorMessage(err, 'Failed to export backup'));
    } finally {
      setFullBusy(false);
      setRowBusy(null);
    }
  };

  const handleSaveBackupPreset = async () => {
    const source = reportPresets.find((p) => p._id === sourcePresetId);
    const name = newName.trim();
    if (!source || !name) return;
    try {
      setSaving(true);
      setError(null);
      const res = await filterPresetsApi.create(payloadFromPreset(source, name));
      setPresets((prev) => [...prev, res.data]);
      setNewName('');
      setSourcePresetId('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save backup preset'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (preset: FilterPreset) => {
    if (!window.confirm(`Delete backup preset “${preset.name}”?`)) return;
    try {
      setRowBusy(preset._id);
      setError(null);
      await filterPresetsApi.delete(preset._id);
      setPresets((prev) => prev.filter((p) => p._id !== preset._id));
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete preset'));
    } finally {
      setRowBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Backups</h1>
        <p className="text-gray-500 mt-1">
          Download a full workspace JSON, or a smaller dump limited to a saved filter set.
          Files are not stored in the database.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="card mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 text-primary-700" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900">Full workspace</h2>
            <p className="text-sm text-gray-500 mt-1">
              Clients, projects, task types, project tasks, time entries, line items, invoices,
              filter presets, and workspace users (no Auth0 tokens).
            </p>
            <button
              type="button"
              onClick={() => void downloadBackup()}
              disabled={fullBusy}
              className="btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {fullBusy ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download full backup
            </button>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900">Backup presets</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          A backup preset is a named filter set. Download includes the related graph: those
          clients and projects, their tasks, matching time entries and line items, related invoices,
          and contributors on those entries.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end mb-4">
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-gray-500 mb-1">Copy filters from Reports</label>
            <select
              value={sourcePresetId}
              onChange={(e) => {
                setSourcePresetId(e.target.value);
                const source = reportPresets.find((p) => p._id === e.target.value);
                if (source && !newName.trim()) setNewName(source.name);
              }}
              className="input text-sm w-full"
            >
              <option value="">Select a Reports filter set…</option>
              {reportPresets.map((preset) => (
                <option key={preset._id} value={preset._id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={80}
              placeholder="Backup preset name"
              className="input text-sm w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSaveBackupPreset()}
            disabled={saving || !sourcePresetId || !newName.trim()}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Save backup preset
          </button>
        </div>

        {backupPresets.length === 0 ? (
          <p className="text-sm text-gray-500">
            No backup presets yet. Save a filter set on Reports, then copy it here.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {backupPresets.map((preset) => (
              <li key={preset._id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{preset.name}</p>
                  <p className="text-xs text-gray-500">
                    {preset.datePreset ? preset.datePreset.replace(/_/g, ' ') : 'Custom dates'}
                    {preset.clientIds.length > 0 ? ` · ${preset.clientIds.length} client${preset.clientIds.length === 1 ? '' : 's'}` : ''}
                    {preset.projectIds.length > 0 ? ` · ${preset.projectIds.length} project${preset.projectIds.length === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => void downloadBackup(preset)}
                    disabled={rowBusy === preset._id}
                    className="btn-secondary text-sm py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(preset)}
                    disabled={rowBusy === preset._id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                    title="Delete backup preset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-gray-900">Reports filter sets</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Download the same related graph using a filter set saved on Reports, without copying it first.
        </p>
        {reportPresets.length === 0 ? (
          <p className="text-sm text-gray-500">No Reports presets yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {reportPresets.map((preset) => (
              <li key={preset._id} className="py-3 flex items-center justify-between gap-3">
                <p className="font-medium text-gray-900 truncate">{preset.name}</p>
                <button
                  type="button"
                  onClick={() => void downloadBackup(preset)}
                  disabled={rowBusy === preset._id}
                  className="btn-secondary text-sm py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Backups;
