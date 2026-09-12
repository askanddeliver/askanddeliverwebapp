import {
  REPORT_COLUMN_GROUPS,
  REPORT_COLUMNS,
  DEFAULT_REPORT_COLUMN_IDS,
  type ReportColumnId,
  type ReportColumnGroupId,
} from '../../utils/reportColumns';

interface ReportColumnCatalogProps {
  selectedIds: ReportColumnId[];
  includeEntryDescriptions: boolean;
  onChange: (ids: ReportColumnId[]) => void;
}

export function ReportColumnCatalog({
  selectedIds,
  includeEntryDescriptions,
  onChange,
}: ReportColumnCatalogProps) {
  const selected = new Set(selectedIds);

  const toggle = (id: ReportColumnId, checked: boolean) => {
    if (checked) {
      onChange([...selectedIds, id]);
    } else {
      const next = selectedIds.filter((col) => col !== id);
      onChange(next.length > 0 ? next : [id]);
    }
  };

  const setGroup = (groupId: ReportColumnGroupId, checked: boolean) => {
    const groupIds = REPORT_COLUMNS.filter((col) => col.group === groupId).map((col) => col.id);
    if (checked) {
      const next = [...selectedIds];
      for (const id of groupIds) {
        if (!next.includes(id)) next.push(id);
      }
      onChange(next);
      return;
    }
    const remove = new Set(groupIds);
    const next = selectedIds.filter((id) => !remove.has(id));
    onChange(next.length > 0 ? next : [...DEFAULT_REPORT_COLUMN_IDS]);
  };

  return (
    <section className="border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Columns</h3>
        <button
          type="button"
          onClick={() => onChange([...DEFAULT_REPORT_COLUMN_IDS])}
          className="text-xs text-primary-600 hover:text-primary-700"
        >
          Reset defaults
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Applies to CSV, the Time Entries tab, and the PDF entry appendix. Invoice totals stay unchanged.
      </p>
      <div className="space-y-3">
        {REPORT_COLUMN_GROUPS.map((group) => {
          const cols = REPORT_COLUMNS.filter((col) => col.group === group.id);
          const allOn = cols.every((col) => selected.has(col.id));
          return (
            <div key={group.id}>
              <label className="flex items-center gap-2 mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allOn}
                  onChange={(e) => setGroup(group.id, e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-xs font-medium text-gray-700">{group.label}</span>
              </label>
              {group.hint && <p className="text-[11px] text-gray-400 mb-1 ml-6">{group.hint}</p>}
              <div className="ml-6 grid grid-cols-1 gap-0.5">
                {cols.map((col) => {
                  const gatedOff = Boolean(col.requiresDescriptions && !includeEntryDescriptions);
                  return (
                    <label
                      key={col.id}
                      className={`flex items-center gap-2 cursor-pointer ${gatedOff ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(col.id)}
                        disabled={gatedOff}
                        onChange={(e) => toggle(col.id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
