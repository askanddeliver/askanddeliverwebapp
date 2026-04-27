import { Play, Pencil, Trash2 } from 'lucide-react';
import type { ExpandedTimeBlock } from '../../types';
import {
  blockBarBackground,
  blockKindLabel,
  clientLabel,
  contrastTextOnHex,
  alphaHexToRgba,
  projectLabel,
} from '../../utils/blockColors';
import { fmtTimeShort, fmtDurationMs } from './calendarUtils';

interface TimeBlockDetailPopoverProps {
  block: ExpandedTimeBlock;
  anchorX: number;
  anchorY: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStartTimer: () => void;
  canStartTimer: boolean;
}

export function TimeBlockDetailPopover({
  block,
  anchorX,
  anchorY,
  onClose,
  onEdit,
  onDelete,
  onStartTimer,
  canStartTimer,
}: TimeBlockDetailPopoverProps) {
  const bg = blockBarBackground(block);
  const tc = contrastTextOnHex(bg);
  const start = new Date(block.startTime);
  const end = new Date(block.endTime);
  const client = clientLabel(block);
  const project = projectLabel(block);

  const left = Math.min(anchorX + 12, typeof window !== 'undefined' ? window.innerWidth - 308 : 0);
  const top = Math.max(
    8,
    Math.min(anchorY - 8, typeof window !== 'undefined' ? window.innerHeight - 300 : 0)
  );

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[1990] cursor-default bg-transparent border-0 p-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="fixed z-[2000] w-[300px] rounded-xl border border-gray-200 bg-white shadow-xl shadow-black/15 overflow-hidden animate-[fadeIn_0.18s_ease-out]"
        style={{ left, top }}
      >
        <div
          className="relative px-3.5 py-3"
          style={{ backgroundColor: bg, color: tc }}
        >
          <span
            className="absolute top-2.5 right-3 text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5"
            style={{
              background: alphaHexToRgba(tc === '#ffffff' ? '#ffffff' : '#1e293b', 0.2),
              color: tc,
            }}
          >
            {blockKindLabel(block.kind)}
          </span>
          <p className="font-bold text-[15px] leading-snug pr-14">{block.title}</p>
          {(client || project) && (
            <p className="text-[11px] opacity-90 mt-1">
              {client}
              {project ? ` · ${project}` : ''}
            </p>
          )}
        </div>
        <div className="px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[13px] font-semibold text-gray-900">
              {fmtTimeShort(start)} – {fmtTimeShort(end)}
            </span>
            <span className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5">
              {fmtDurationMs(start, end)}
            </span>
          </div>
          <button
            type="button"
            disabled={!canStartTimer}
            onClick={onStartTimer}
            className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-bold shadow-md shadow-primary-600/30 flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed mb-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Timer
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50 flex items-center justify-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 py-2 rounded-lg border border-red-200 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
