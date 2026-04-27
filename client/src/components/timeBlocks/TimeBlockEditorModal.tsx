import { X } from 'lucide-react';
import type { Client, Project, ProjectTask, TaskType, TimeBlockKind } from '../../types';
import {
  blockKindLabel,
  contrastTextOnHex,
  KIND_PILL_COLORS,
} from '../../utils/blockColors';
import { HOUR_END, HOUR_START } from './calendarUtils';

const KINDS: TimeBlockKind[] = ['WORK', 'PERSONAL', 'DOWNTIME', 'MEETING', 'ADMIN'];
const MIN_OPTS = [0, 15, 30, 45];

export interface BlockEditorDraft {
  title: string;
  kind: TimeBlockKind;
  clientId: string;
  projectId: string;
  taskTypeId: string;
  projectTaskId: string;
  recurrenceRule: string;
  notes: string;
  startTime: string;
  endTime: string;
}

interface TimeBlockEditorModalProps {
  open: boolean;
  isEdit: boolean;
  draft: BlockEditorDraft;
  onDraftChange: (patch: Partial<BlockEditorDraft>) => void;
  clients: Client[];
  projects: Project[];
  tasksForProject: ProjectTask[];
  taskTypes: TaskType[];
  showProjectFields: boolean;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
}

function fmtHourOption(h: number): string {
  if (h === 12) return '12pm';
  if (h > 12) return `${h - 12}pm`;
  return `${h}am`;
}

function localParts(isoLike: string): { y: number; mo: number; d: number; h: number; m: number } {
  const dt = new Date(isoLike);
  return {
    y: dt.getFullYear(),
    mo: dt.getMonth(),
    d: dt.getDate(),
    h: dt.getHours(),
    m: dt.getMinutes(),
  };
}

function setLocalDateTime(
  isoLike: string,
  h: number,
  m: number
): string {
  const { y, mo, d } = localParts(isoLike);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${y}-${pad(mo + 1)}-${pad(d)}T${pad(h)}:${pad(m)}`;
}

export function TimeBlockEditorModal({
  open,
  isEdit,
  draft,
  onDraftChange,
  clients,
  projects,
  tasksForProject,
  taskTypes,
  showProjectFields,
  onSave,
  onCancel,
  error,
}: TimeBlockEditorModalProps) {
  if (!open) return null;

  const hourOpts = Array.from(
    { length: HOUR_END - HOUR_START + 1 },
    (_, i) => HOUR_START + i
  );

  const sh = localParts(draft.startTime);
  const eh = localParts(draft.endTime);
  const startBad =
    eh.h * 60 + eh.m <= sh.h * 60 + sh.m;

  const clientProjects = draft.clientId
    ? projects.filter((p) => {
        const c = typeof p.clientId === 'object' ? p.clientId._id : p.clientId;
        return c === draft.clientId && p.status === 'ACTIVE';
      })
    : [];

  const handleKind = (k: TimeBlockKind) => {
    onDraftChange({ kind: k });
    if (k === 'PERSONAL' || k === 'DOWNTIME') {
      onDraftChange({ kind: k, clientId: '', projectId: '', projectTaskId: '' });
    }
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/45">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col animate-[fadeIn_0.18s_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? 'Edit Block' : 'New Block'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="sr-only">Title</label>
            <input
              className="input font-semibold text-[15px] py-2.5"
              placeholder="Block title…"
              value={draft.title}
              onChange={(e) => onDraftChange({ title: e.target.value })}
              autoFocus
            />
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Type
            </p>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => {
                const active = draft.kind === k;
                const kc = KIND_PILL_COLORS[k];
                const tc = contrastTextOnHex(kc);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleKind(k)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                      active
                        ? 'border-transparent shadow-sm'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                    style={
                      active
                        ? { backgroundColor: kc, color: tc }
                        : undefined
                    }
                  >
                    {blockKindLabel(k)}
                  </button>
                );
              })}
            </div>
          </div>

          {showProjectFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Client
                </p>
                <select
                  className="input text-sm"
                  value={draft.clientId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const first = projects.find((p) => {
                      const c =
                        typeof p.clientId === 'object' ? p.clientId._id : p.clientId;
                      return c === cid && p.status === 'ACTIVE';
                    });
                    onDraftChange({
                      clientId: cid,
                      projectId: first?._id || '',
                      projectTaskId: '',
                    });
                  }}
                >
                  <option value="">— None —</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                      {c.isInternal ? ' (Internal)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Project
                </p>
                <select
                  className="input text-sm disabled:opacity-50"
                  disabled={!draft.clientId}
                  value={draft.projectId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const p = projects.find((x) => x._id === pid);
                    const cid =
                      p && typeof p.clientId === 'object'
                        ? p.clientId._id
                        : p?.clientId
                          ? String(p.clientId)
                          : '';
                    onDraftChange({
                      projectId: pid,
                      clientId: cid || draft.clientId,
                      projectTaskId: '',
                    });
                  }}
                >
                  <option value="">— None —</option>
                  {clientProjects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Time
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="input text-sm flex-1 min-w-[100px]"
                value={sh.h}
                onChange={(e) =>
                  onDraftChange({
                    startTime: setLocalDateTime(
                      draft.startTime,
                      +e.target.value,
                      sh.m
                    ),
                  })
                }
              >
                {hourOpts.map((h) => (
                  <option key={h} value={h}>
                    {fmtHourOption(h)}
                  </option>
                ))}
              </select>
              <select
                className="input text-sm w-[4.5rem]"
                value={sh.m}
                onChange={(e) =>
                  onDraftChange({
                    startTime: setLocalDateTime(
                      draft.startTime,
                      sh.h,
                      +e.target.value
                    ),
                  })
                }
              >
                {MIN_OPTS.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span className="text-gray-400 font-medium">→</span>
              <select
                className="input text-sm flex-1 min-w-[100px]"
                value={eh.h}
                onChange={(e) =>
                  onDraftChange({
                    endTime: setLocalDateTime(draft.endTime, +e.target.value, eh.m),
                  })
                }
              >
                {hourOpts.map((h) => (
                  <option key={h} value={h}>
                    {fmtHourOption(h)}
                  </option>
                ))}
              </select>
              <select
                className="input text-sm w-[4.5rem]"
                value={eh.m}
                onChange={(e) =>
                  onDraftChange({
                    endTime: setLocalDateTime(draft.endTime, eh.h, +e.target.value),
                  })
                }
              >
                {MIN_OPTS.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            {startBad && (
              <p className="text-[11px] text-red-600 mt-2">End time must be after start time</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Task type
              </p>
              <select
                className="input text-sm"
                value={draft.taskTypeId}
                onChange={(e) => onDraftChange({ taskTypeId: e.target.value })}
              >
                <option value="">— Optional —</option>
                {taskTypes.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Project task
              </p>
              <select
                className="input text-sm"
                value={draft.projectTaskId}
                onChange={(e) => onDraftChange({ projectTaskId: e.target.value })}
                disabled={!draft.projectId}
              >
                <option value="">— None —</option>
                {tasksForProject.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Repeats (RRULE)
            </p>
            <input
              className="input font-mono text-xs"
              placeholder="Optional — e.g. RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"
              value={draft.recurrenceRule}
              onChange={(e) => onDraftChange({ recurrenceRule: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Notes
            </label>
            <textarea
              className="input min-h-[72px] text-sm resize-y"
              placeholder="Notes (optional)"
              value={draft.notes}
              onChange={(e) => onDraftChange({ notes: e.target.value })}
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-outline text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.title.trim() || startBad}
            className="btn-primary text-sm font-bold disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Save Block
          </button>
        </div>
      </div>
    </div>
  );
}
