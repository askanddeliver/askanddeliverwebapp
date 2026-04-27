import { Grid3x3, CalendarRange, CalendarDays, Plus } from 'lucide-react';
import type { ViewMode } from './types';

interface TimeBlockCalHeaderProps {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewBlock: () => void;
}

export function TimeBlockCalHeader({
  view,
  onViewChange,
  title,
  onPrev,
  onNext,
  onToday,
  onNewBlock,
}: TimeBlockCalHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200/90 bg-white/95 pb-3 mb-4 shrink-0">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToday}
          className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
        >
          Today
        </button>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={onPrev}
            className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-r border-gray-200"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50"
            aria-label="Next"
          >
            ›
          </button>
        </div>
        <h2 className="text-base font-bold text-gray-900 min-w-[10rem] sm:min-w-[14rem]">{title}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
          {(
            [
              ['month', 'Month', Grid3x3],
              ['week', 'Week', CalendarRange],
              ['day', 'Day', CalendarDays],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors ${
                view === v
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onNewBlock}
          className="btn-primary flex items-center gap-2 text-sm shadow-sm shadow-primary-600/20"
        >
          <Plus className="w-4 h-4" />
          Block
        </button>
      </div>
    </header>
  );
}
