import { useEffect, useRef, useCallback } from 'react';
import type { ExpandedTimeBlock } from '../../types';
import {
  blockBarBackground,
  blockKindLabel,
  clientLabel,
  contrastTextOnHex,
  alphaHexToRgba,
  projectLabel,
} from '../../utils/blockColors';
import {
  HOUR_START,
  HOUR_END,
  PX_PER_HR,
  TIME_GUTTER_PX,
  gridTotalPx,
  isSameDay,
  fmtTimeShort,
} from './calendarUtils';

interface TimeBlockWeekDayGridProps {
  days: Date[];
  blocks: ExpandedTimeBlock[];
  onSlotClick: (day: Date, rangeStart: Date, rangeEnd: Date) => void;
  onBlockClick: (b: ExpandedTimeBlock, e: React.MouseEvent) => void;
  onResizeCommit: (b: ExpandedTimeBlock, newEnd: Date) => void;
  /** Optional day view title row */
  dayBanner?: { weekday: string; longDate: string } | null;
}

function blocksForDay(blocks: ExpandedTimeBlock[], day: Date): ExpandedTimeBlock[] {
  return blocks.filter((b) => isSameDay(new Date(b.startTime), day));
}

function blockLayout(
  b: ExpandedTimeBlock,
  day: Date
): { top: number; height: number } | null {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const gridStart = new Date(dayStart);
  gridStart.setHours(HOUR_START, 0, 0, 0);
  const gridEnd = new Date(dayStart);
  gridEnd.setHours(HOUR_END, 0, 0, 0);

  const s = new Date(Math.max(new Date(b.startTime).getTime(), gridStart.getTime()));
  const e = new Date(Math.min(new Date(b.endTime).getTime(), gridEnd.getTime()));
  if (e <= s) return null;

  const sH = s.getHours() + s.getMinutes() / 60 + s.getSeconds() / 3600;
  const top = Math.max(0, (sH - HOUR_START) * PX_PER_HR);
  const hours = (e.getTime() - s.getTime()) / 3600000;
  const height = Math.max(24, hours * PX_PER_HR - 2);
  return { top: top + 1, height };
}

export function TimeBlockWeekDayGrid({
  days,
  blocks,
  onSlotClick,
  onBlockClick,
  onResizeCommit,
  dayBanner,
}: TimeBlockWeekDayGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const today = new Date();

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = PX_PER_HR;
  }, [days.length, dayBanner?.longDate]);

  const nowFrac = today.getHours() + today.getMinutes() / 60;
  const nowTop = (nowFrac - HOUR_START) * PX_PER_HR;
  const showNowLine = nowFrac > HOUR_START && nowFrac < HOUR_END;

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, block: ExpandedTimeBlock) => {
      e.preventDefault();
      e.stopPropagation();
      const startY = e.clientY;
      const origEnd = new Date(block.endTime);
      const origStart = new Date(block.startTime);
      const minEnd = new Date(origStart.getTime() + 15 * 60000);
      let lastEnd = origEnd;

      const onMove = (ev: PointerEvent) => {
        const dy = ev.clientY - startY;
        const deltaMins = Math.round(((dy / PX_PER_HR) * 60) / 15) * 15;
        let next = new Date(origEnd.getTime() + deltaMins * 60000);
        if (next <= minEnd) next = minEnd;
        lastEnd = next;
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (lastEnd.getTime() !== origEnd.getTime()) {
          onResizeCommit(block, lastEnd);
        }
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [onResizeCommit]
  );

  const formatHourLabel = (h: number) =>
    h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`;

  return (
    <div className="flex flex-col rounded-xl border border-gray-200/90 bg-white overflow-hidden min-h-0 flex-1">
      {dayBanner && (
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            {dayBanner.weekday}
          </p>
          <p className="text-xl font-bold text-gray-900">{dayBanner.longDate}</p>
        </div>
      )}

      {/* Column headers */}
      <div className="flex border-b border-gray-200 bg-gray-50/90 shrink-0">
        <div style={{ width: TIME_GUTTER_PX }} className="shrink-0" />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`flex-1 text-center py-2 border-l border-gray-100 min-w-0 ${i === 0 ? 'border-l-0' : ''}`}
            >
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                {day.toLocaleDateString(undefined, { weekday: 'short' })}
              </div>
              <div
                className={`mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-full text-lg font-bold ${
                  isToday
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-900'
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div
        ref={scrollRef}
        data-bt-scroll
        className="overflow-y-auto flex-1 min-h-[280px] max-h-[calc(100vh-16rem)] bg-white"
        style={{ background: 'var(--admin-cream-light, #fafaf9)' }}
      >
        <div className="flex relative" style={{ minHeight: gridTotalPx }}>
          {/* Time gutter */}
          <div
            className="shrink-0 relative bg-gray-50/50 border-r border-gray-100"
            style={{ width: TIME_GUTTER_PX }}
          >
            {hours.map((h) => (
              <div
                key={h}
                className="absolute text-[11px] font-medium text-gray-400 text-right pr-2 select-none"
                style={{
                  top: (h - HOUR_START) * PX_PER_HR - 9,
                  right: 0,
                  left: 0,
                }}
              >
                {formatHourLabel(h)}
              </div>
            ))}
          </div>

          {days.map((day, di) => {
            const isToday = isSameDay(day, today);
            const dayBlocks = blocksForDay(blocks, day);
            return (
              <div
                key={day.toISOString()}
                className={`flex-1 relative border-l border-gray-100 cursor-crosshair min-w-0 ${
                  isToday ? 'bg-primary-600/[0.04]' : ''
                }`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('[data-bt-block]')) return;
                  const y = (e.nativeEvent as MouseEvent).offsetY;
                  const clamped = Math.max(0, Math.min(y, gridTotalPx));
                  const hourFloat =
                    HOUR_START + (clamped / gridTotalPx) * (HOUR_END - HOUR_START);
                  const totalMin = Math.round(hourFloat * 60);
                  const snapped = Math.round(totalMin / 15) * 15;
                  const h = Math.floor(snapped / 60);
                  const m = snapped % 60;
                  const start = new Date(
                    day.getFullYear(),
                    day.getMonth(),
                    day.getDate(),
                    h,
                    m,
                    0,
                    0
                  );
                  const end = new Date(start.getTime() + 60 * 60000);
                  onSlotClick(day, start, end);
                }}
              >
                {hours.map((h) => (
                  <div key={h}>
                    <div
                      className="absolute left-0 right-0 pointer-events-none border-t border-gray-200"
                      style={{ top: (h - HOUR_START) * PX_PER_HR }}
                    />
                    <div
                      className="absolute left-0 right-0 pointer-events-none border-t border-dashed border-gray-100"
                      style={{ top: (h - HOUR_START + 0.5) * PX_PER_HR }}
                    />
                  </div>
                ))}

                {showNowLine && isToday && (
                  <div
                    className="absolute w-2 h-2 rounded-full bg-red-500 z-20 pointer-events-none"
                    style={{ top: nowTop - 4, left: -4 }}
                  />
                )}

                {dayBlocks.map((b) => {
                  const lay = blockLayout(b, day);
                  if (!lay) return null;
                  const bg = blockBarBackground(b);
                  const tc = contrastTextOnHex(bg);
                  const compact = lay.height < 50;
                  const showKind = b.kind !== 'WORK';
                  const cName = clientLabel(b);
                  const proj = projectLabel(b);

                  return (
                    <div
                      key={`${b.instanceKey}-${di}`}
                      className="absolute left-1 right-1 z-[5]"
                      style={{ top: lay.top, height: lay.height }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        data-bt-block
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onBlockClick(b, ev);
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            onBlockClick(b, ev as unknown as React.MouseEvent);
                          }
                        }}
                        className="absolute inset-0 rounded-md shadow-sm shadow-black/10 overflow-hidden flex flex-col ring-1 ring-black/5"
                        style={{
                          backgroundColor: bg,
                          color: tc,
                          padding: compact ? '2px 6px' : '5px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        {!compact && showKind && (
                          <span
                            className="absolute top-1 right-1.5 text-[9px] font-bold uppercase tracking-wide rounded px-1 py-px"
                            style={{
                              background: alphaHexToRgba(tc === '#ffffff' ? '#000000' : tc, 0.18),
                              color: tc,
                            }}
                          >
                            {blockKindLabel(b.kind)}
                          </span>
                        )}
                        <div
                          className={`font-bold leading-snug truncate ${
                            compact ? 'text-[11px]' : 'text-xs'
                          }`}
                          style={{ paddingRight: showKind && !compact ? 40 : 0 }}
                        >
                          {b.title}
                        </div>
                        {!compact && cName && (
                          <div className="text-[10px] opacity-80 truncate mt-0.5">
                            {cName}
                            {proj ? ` · ${proj}` : ''}
                          </div>
                        )}
                        {!compact && (
                          <div className="text-[10px] opacity-65 mt-0.5">
                            {fmtTimeShort(new Date(b.startTime))}–
                            {fmtTimeShort(new Date(b.endTime))}
                          </div>
                        )}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 flex items-center justify-center cursor-ns-resize"
                          onPointerDown={(e) => handleResizePointerDown(e, b)}
                        >
                          <div
                            className="w-5 h-0.5 rounded-full opacity-30"
                            style={{ backgroundColor: tc }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {showNowLine && days.some((d) => isSameDay(d, today)) && (
            <div
              className="absolute h-0.5 bg-red-500/40 z-[8] pointer-events-none"
              style={{
                top: nowTop - 1,
                left: TIME_GUTTER_PX,
                right: 0,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
