import type { ExpandedTimeBlock } from '../../types';
import { blockBarBackground, contrastTextOnHex } from '../../utils/blockColors';
import { addDays, isSameDay, ymd, startOfWeekMonday } from './calendarUtils';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface TimeBlockMonthGridProps {
  anchor: Date;
  blocks: ExpandedTimeBlock[];
  onDayClick: (day: Date) => void;
  onBlockClick: (b: ExpandedTimeBlock, e: React.MouseEvent) => void;
}

export function TimeBlockMonthGrid({
  anchor,
  blocks,
  onDayClick,
  onBlockClick,
}: TimeBlockMonthGridProps) {
  const today = new Date();
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const monthStart = new Date(y, m, 1);
  const gridStart = startOfWeekMonday(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weeks = Array.from({ length: 6 }, (_, i) => days.slice(i * 7, i * 7 + 7));

  const blocksByDay = (day: Date) =>
    blocks.filter((b) => isSameDay(new Date(b.startTime), day));

  return (
    <div className="rounded-xl border border-gray-200/90 bg-white overflow-hidden flex flex-col min-h-[520px]">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/90">
        {DOW.map((d) => (
          <div
            key={d}
            className="text-center py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="grid grid-cols-7 flex-1 border-b border-gray-100 min-h-[96px]"
          >
            {week.map((day, di) => {
              const inMonth = day.getMonth() === m;
              const isToday = isSameDay(day, today);
              const list = blocksByDay(day).slice(0, 3);
              return (
                <div
                  key={ymd(day)}
                  role="button"
                  tabIndex={0}
                  onClick={() => onDayClick(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onDayClick(day);
                    }
                  }}
                  className={`border-l border-gray-100 p-2 text-left cursor-pointer hover:bg-gray-50/80 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    di === 0 ? 'border-l-0' : ''
                  } ${isToday ? 'bg-primary-600/[0.06]' : ''} ${!inMonth ? 'opacity-[0.38]' : ''}`}
                >
                  <div
                    className={`text-[13px] font-semibold mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-primary-600/15 text-primary-700'
                        : 'text-gray-800'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {list.map((b) => {
                      const bg = blockBarBackground(b);
                      const tc = contrastTextOnHex(bg);
                      return (
                        <button
                          key={b.instanceKey}
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onBlockClick(b, ev);
                          }}
                          className="block w-full text-left rounded px-1.5 py-0.5 text-[10px] font-semibold truncate"
                          style={{ backgroundColor: bg, color: tc }}
                          title={b.title}
                        >
                          {b.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
