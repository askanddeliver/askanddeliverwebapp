import type { Client, Project, ProjectBillingMode, User } from '../../types';
import {
  getReportDateRange,
  matchReportDatePreset,
  type ReportDatePreset,
} from '../../utils/calculations';
import { projectClientId } from '../../utils/projectClient';
import type { ReportColumnId } from '../../utils/reportColumns';
import { ReportColumnCatalog } from './ReportColumnCatalog';
import { ReportFilterPresets } from './ReportFilterPresets';
import type { FilterPreset } from '../../types';

const BILLING_MODE_OPTIONS: { id: ProjectBillingMode; label: string }[] = [
  { id: 'HOURLY', label: 'Hourly' },
  { id: 'FIXED_PRICE', label: 'Fixed price' },
  { id: 'HOUR_RETAINER', label: 'Hour retainer' },
];

const DATE_PRESETS: { id: ReportDatePreset; label: string }[] = [
  { id: 'all_time', label: 'All time' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'this_week', label: 'This week' },
  { id: 'last_week', label: 'Last week' },
  { id: 'last_7', label: 'Last 7 days' },
  { id: 'last_30', label: 'Last 30 days' },
];

function billingModeLabel(mode?: ProjectBillingMode): string {
  if (mode === 'FIXED_PRICE') return 'Fixed';
  if (mode === 'HOUR_RETAINER') return 'Retainer';
  return 'Hourly';
}

function CheckboxMultiSelect<T extends { _id: string }>({
  items,
  selectedIds,
  onChange,
  getLabel,
  emptyHint,
}: {
  items: T[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  getLabel: (item: T) => string;
  emptyHint?: string;
}) {
  return (
    <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto bg-white">
      {items.length === 0 && emptyHint && (
        <p className="text-xs text-gray-500 px-1 py-2">{emptyHint}</p>
      )}
      {items.map((item) => (
        <label
          key={item._id}
          className="flex items-start gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(item._id)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...selectedIds, item._id]);
              } else {
                onChange(selectedIds.filter((id) => id !== item._id));
              }
            }}
            className="rounded border-gray-300 mt-0.5"
          />
          <span className="text-sm leading-snug">{getLabel(item)}</span>
        </label>
      ))}
      {items.length > 0 && (
        <div className="flex gap-2 mt-1 pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={() => onChange(items.map((item) => item._id))}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export interface ReportFilterRailProps {
  clients: Client[];
  projects: Project[];
  members: User[];
  clientIds: string[];
  projectIds: string[];
  billingModes: ProjectBillingMode[];
  memberAuth0Ids: string[];
  startDate: string;
  endDate: string;
  includeTimeEntries: boolean;
  includeEntryDescriptions: boolean;
  columnIds: ReportColumnId[];
  onClientIdsChange: (ids: string[]) => void;
  onProjectIdsChange: (ids: string[]) => void;
  onBillingModesChange: (modes: ProjectBillingMode[]) => void;
  onMemberAuth0IdsChange: (ids: string[]) => void;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onIncludeTimeEntriesChange: (value: boolean) => void;
  onIncludeEntryDescriptionsChange: (value: boolean) => void;
  onColumnIdsChange: (ids: ReportColumnId[]) => void;
  onClearFilters: () => void;
  presets: FilterPreset[];
  selectedPresetId: string;
  presetBusy?: boolean;
  onApplyPreset: (id: string) => void;
  onSavePresetAs: (name: string) => Promise<void> | void;
  onUpdatePreset: () => Promise<void> | void;
  onDeletePreset: () => Promise<void> | void;
}

export function ReportFilterRail({
  clients,
  projects,
  members,
  clientIds,
  projectIds,
  billingModes,
  memberAuth0Ids,
  startDate,
  endDate,
  includeTimeEntries,
  includeEntryDescriptions,
  columnIds,
  onClientIdsChange,
  onProjectIdsChange,
  onBillingModesChange,
  onMemberAuth0IdsChange,
  onDateRangeChange,
  onIncludeTimeEntriesChange,
  onIncludeEntryDescriptionsChange,
  onColumnIdsChange,
  onClearFilters,
  presets,
  selectedPresetId,
  presetBusy,
  onApplyPreset,
  onSavePresetAs,
  onUpdatePreset,
  onDeletePreset,
}: ReportFilterRailProps) {
  const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));
  const scopedProjects =
    clientIds.length > 0
      ? projects.filter((p) => clientIds.includes(projectClientId(p)))
      : projects;
  const visibleProjects =
    billingModes.length > 0
      ? scopedProjects.filter((p) => billingModes.includes(p.billingMode ?? 'HOURLY'))
      : scopedProjects;
  const sortedProjects = [...visibleProjects].sort((a, b) => a.title.localeCompare(b.title));
  const activePreset = matchReportDatePreset(startDate, endDate);
  const hasFilters =
    clientIds.length > 0 ||
    projectIds.length > 0 ||
    billingModes.length > 0 ||
    memberAuth0Ids.length > 0;

  const toggleBillingMode = (mode: ProjectBillingMode) => {
    if (billingModes.includes(mode)) {
      onBillingModesChange(billingModes.filter((m) => m !== mode));
    } else {
      onBillingModesChange([...billingModes, mode]);
    }
  };

  return (
    <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 print:hidden lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-5">
      <div className="card space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-gray-900">Filters</h2>
          {hasFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              Clear all
            </button>
          )}
        </div>

        <ReportFilterPresets
          presets={presets}
          selectedId={selectedPresetId}
          busy={presetBusy}
          onApply={onApplyPreset}
          onSaveAs={onSavePresetAs}
          onUpdate={onUpdatePreset}
          onDelete={onDeletePreset}
        />

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Client</h3>
          <CheckboxMultiSelect
            items={sortedClients}
            selectedIds={clientIds}
            onChange={onClientIdsChange}
            getLabel={(c) => c.name}
          />
          <p className="text-xs text-gray-500 mt-1">Empty = all clients</p>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Project</h3>
          <CheckboxMultiSelect
            items={sortedProjects}
            selectedIds={projectIds}
            onChange={onProjectIdsChange}
            getLabel={(p) => {
              const clientName = typeof p.clientId === 'object' ? p.clientId.name : null;
              const mode = billingModeLabel(p.billingMode);
              const prefix = clientName && clientIds.length !== 1 ? `${clientName} — ` : '';
              return `${prefix}${p.title} (${mode})`;
            }}
            emptyHint="No projects match the client / billing type filters."
          />
          <p className="text-xs text-gray-500 mt-1">Empty = all projects in scope</p>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Billing type
          </h3>
          <div className="space-y-1">
            {BILLING_MODE_OPTIONS.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={billingModes.includes(opt.id)}
                  onChange={() => toggleBillingMode(opt.id)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Empty = all types (mixed slices cannot become one document)</p>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Date range
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  const range = getReportDateRange(preset.id);
                  onDateRangeChange(range.startDate, range.endDate);
                }}
                className={`px-2 py-1 rounded-full text-xs transition-colors ${
                  activePreset === preset.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {startDate === '' && endDate === '' ? (
            <p className="text-sm text-gray-700">All time</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onDateRangeChange(e.target.value, endDate)}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onDateRangeChange(startDate, e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">People</h3>
          <CheckboxMultiSelect
            items={members.map((m) => ({ ...m, _id: m.auth0Id }))}
            selectedIds={memberAuth0Ids}
            onChange={onMemberAuth0IdsChange}
            getLabel={(m) => m.name || m.email}
            emptyHint="No team members loaded."
          />
          <p className="text-xs text-gray-500 mt-1">
            Empty = all contributors. Pay stubs need exactly one person and a date range (not All Time).
          </p>
        </section>

        <section className="border-t border-gray-100 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Entry options
          </h3>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTimeEntries}
              onChange={(e) => onIncludeTimeEntriesChange(e.target.checked)}
              className="rounded border-gray-300 mt-0.5"
            />
            <span className="text-sm">Include entries on PDF</span>
          </label>
          <label
            className={`flex items-start gap-2 cursor-pointer mt-2 ${
              !includeTimeEntries ? 'opacity-50' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={includeEntryDescriptions}
              onChange={(e) => onIncludeEntryDescriptionsChange(e.target.checked)}
              disabled={!includeTimeEntries}
              className="rounded border-gray-300 mt-0.5"
            />
            <span className="text-sm">Include entry descriptions</span>
          </label>
        </section>

        <ReportColumnCatalog
          selectedIds={columnIds}
          includeEntryDescriptions={includeEntryDescriptions}
          onChange={onColumnIdsChange}
        />
      </div>
    </aside>
  );
}
