import type { Client } from '../../types';
import { blockKindLabel, clientCalendarColor, KIND_PILL_COLORS } from '../../utils/blockColors';

const NON_WORK_KINDS = ['PERSONAL', 'DOWNTIME', 'MEETING', 'ADMIN'] as const;

interface TimeBlockLegendProps {
  clients: Client[];
}

export function TimeBlockLegend({ clients }: TimeBlockLegendProps) {
  const sorted = [...clients].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  return (
    <aside className="w-full shrink-0 lg:w-52 border border-gray-200/80 rounded-xl bg-white/90 p-4 h-fit lg:sticky lg:top-4">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Calendars
      </p>
      <ul className="space-y-2 mb-4">
        {sorted.map((c) => (
          <li key={c._id} className="flex items-center gap-2 min-w-0 text-xs text-gray-700">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/5"
              style={{ backgroundColor: clientCalendarColor(c) }}
              title={c.name}
            />
            <span className="truncate">
              {c.name}
              {c.isInternal && (
                <span className="text-gray-400 font-medium"> · Internal</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Other types
      </p>
      <ul className="space-y-2">
        {NON_WORK_KINDS.map((k) => (
          <li key={k} className="flex items-center gap-2 text-xs text-gray-700">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: KIND_PILL_COLORS[k] }}
            />
            {blockKindLabel(k)}
          </li>
        ))}
      </ul>
    </aside>
  );
}
