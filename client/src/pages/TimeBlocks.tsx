import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Play,
  Pencil,
  Trash2,
  Grid3x3,
  CalendarRange,
} from 'lucide-react';
import {
  timeBlocksApi,
  projectsApi,
  taskTypesApi,
  projectTasksApi,
  clientsApi,
} from '../services/api';
import type {
  ExpandedTimeBlock,
  Project,
  TaskType,
  ProjectTask,
  Client,
  TimeBlockKind,
} from '../types';
import { toUTCStartOfDay, toUTCEndOfDay, formatDate } from '../utils/calculations';
import { blockBarBackground, blockKindLabel, projectLabel } from '../utils/blockColors';

const FIRST_HOUR = 6;
const LAST_HOUR = 22;
const KINDS: TimeBlockKind[] = ['WORK', 'PERSONAL', 'DOWNTIME', 'MEETING', 'ADMIN'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfWeekSunday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function clipBlockToDayGrid(
  start: Date,
  end: Date,
  day: Date
): { topPct: number; heightPct: number } | null {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const gridStart = new Date(dayStart);
  gridStart.setHours(FIRST_HOUR, 0, 0, 0);
  const gridEnd = new Date(dayStart);
  gridEnd.setHours(LAST_HOUR, 0, 0, 0);

  const s = new Date(Math.max(start.getTime(), gridStart.getTime()));
  const e = new Date(Math.min(end.getTime(), gridEnd.getTime()));
  if (e <= s) return null;

  const totalMs = gridEnd.getTime() - gridStart.getTime();
  const topMs = s.getTime() - gridStart.getTime();
  const durMs = e.getTime() - s.getTime();
  return {
    topPct: (topMs / totalMs) * 100,
    heightPct: Math.max((durMs / totalMs) * 100, 1.2),
  };
}

type ViewMode = 'week' | 'month' | 'day';

interface DraftBlock {
  title: string;
  kind: TimeBlockKind;
  startTime: string;
  endTime: string;
  clientId: string;
  projectId: string;
  taskTypeId: string;
  projectTaskId: string;
  recurrenceRule: string;
  notes: string;
}

function emptyDraft(day: Date): DraftBlock {
  const s = new Date(day);
  s.setHours(9, 0, 0, 0);
  const e = new Date(s);
  e.setHours(e.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const local =
    `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}T${pad(s.getHours())}:${pad(s.getMinutes())}`;
  const localEnd =
    `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}T${pad(e.getHours())}:${pad(e.getMinutes())}`;
  return {
    title: '',
    kind: 'WORK',
    startTime: local,
    endTime: localEnd,
    clientId: '',
    projectId: '',
    taskTypeId: '',
    projectTaskId: '',
    recurrenceRule: '',
    notes: '',
  };
}

export default function TimeBlocks() {
  const [view, setView] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [blocks, setBlocks] = useState<ExpandedTimeBlock[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftBlock>(() => emptyDraft(new Date()));

  const range = useMemo(() => {
    if (view === 'day') {
      const d = new Date(anchor);
      d.setHours(0, 0, 0, 0);
      return { start: d, end: d };
    }
    if (view === 'week') {
      const ws = startOfWeekSunday(anchor);
      return { start: ws, end: addDays(ws, 6) };
    }
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return { start, end };
  }, [anchor, view]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const startIso = toUTCStartOfDay(ymd(range.start));
      const endIso = toUTCEndOfDay(ymd(range.end));
      const [bRes, pRes, cRes, tRes, ptRes] = await Promise.all([
        timeBlocksApi.getAll({ start: startIso, end: endIso }),
        projectsApi.getAll(),
        clientsApi.getAll(),
        taskTypesApi.getAll(),
        projectTasksApi.getAll(),
      ]);
      setBlocks(bRes.data || []);
      setProjects(pRes.data || []);
      setClients(cRes.data || []);
      setTaskTypes(tRes.data || []);
      setProjectTasks(ptRes.data || []);
      setError(null);
    } catch (e) {
      console.error(e);
      setError('Failed to load blocks');
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const weekDays = useMemo(() => {
    const ws = startOfWeekSunday(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [anchor]);

  const dayColumn = useMemo(() => {
    if (view !== 'day') return null;
    const x = new Date(anchor);
    x.setHours(0, 0, 0, 0);
    return x;
  }, [view, anchor]);

  const displayDays = view === 'day' && dayColumn ? [dayColumn] : weekDays;

  const openNew = (day: Date) => {
    setEditingMasterId(null);
    setDraft(emptyDraft(day));
    setModalOpen(true);
  };

  const openEdit = (b: ExpandedTimeBlock) => {
    if (b.isRecurringInstance) {
      setEditingMasterId(b.masterId);
    } else {
      setEditingMasterId(b.masterId);
    }
    const s = new Date(b.startTime);
    const e = new Date(b.endTime);
    const proj = b.projectId && typeof b.projectId === 'object' ? b.projectId : null;
    const tt = b.taskTypeId && typeof b.taskTypeId === 'object' ? b.taskTypeId : null;
    const pt = b.projectTaskId && typeof b.projectTaskId === 'object' ? b.projectTaskId : null;
    const cid =
      proj && typeof proj.clientId === 'object'
        ? proj.clientId._id
        : proj?.clientId
          ? String(proj.clientId)
          : '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const ls = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}T${pad(s.getHours())}:${pad(s.getMinutes())}`;
    const le = `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}T${pad(e.getHours())}:${pad(e.getMinutes())}`;
    setDraft({
      title: b.title,
      kind: b.kind,
      startTime: ls,
      endTime: le,
      clientId: cid,
      projectId: proj?._id || '',
      taskTypeId: tt?._id || '',
      projectTaskId: pt?._id || '',
      recurrenceRule: b.recurrenceRule || '',
      notes: b.notes || '',
    });
    setModalOpen(true);
  };

  const saveBlock = async () => {
    if (!draft.title.trim()) {
      setError('Title is required');
      return;
    }
    const start = new Date(draft.startTime);
    const end = new Date(draft.endTime);
    if (end <= start) {
      setError('End must be after start');
      return;
    }
    try {
      setError(null);
      const body = {
        title: draft.title.trim(),
        kind: draft.kind,
        startTime: new Date(draft.startTime).toISOString(),
        endTime: new Date(draft.endTime).toISOString(),
        projectId: draft.projectId || undefined,
        taskTypeId: draft.taskTypeId || undefined,
        projectTaskId: draft.projectTaskId || undefined,
        recurrenceRule: draft.recurrenceRule.trim() || undefined,
        notes: draft.notes.trim() || undefined,
      };
      if (editingMasterId) {
        await timeBlocksApi.update(editingMasterId, body);
      } else {
        await timeBlocksApi.create(body);
      }
      setModalOpen(false);
      fetchAll();
    } catch (e) {
      console.error(e);
      setError('Could not save block');
    }
  };

  const deleteBlock = async (id: string) => {
    if (!window.confirm('Delete this block?')) return;
    try {
      await timeBlocksApi.delete(id);
      setModalOpen(false);
      fetchAll();
    } catch (e) {
      console.error(e);
      setError('Could not delete');
    }
  };

  const launchFromEditor = async () => {
    if (!editingMasterId || !draft.projectId || !draft.taskTypeId) {
      setError('Add a project and task type before starting the timer.');
      return;
    }
    if (!window.confirm('Start the timer from this block? Any running timer will be stopped first.')) {
      return;
    }
    try {
      setError(null);
      await timeBlocksApi.launch(editingMasterId, {
        description: [draft.title, draft.notes].filter(Boolean).join(' — '),
      });
      window.location.href = '/dashboard';
    } catch (e) {
      console.error(e);
      setError('Could not start timer');
    }
  };

  const showProjectFields =
    draft.kind === 'WORK' || draft.kind === 'ADMIN' || draft.kind === 'MEETING';

  const filteredProjects = useMemo(() => {
    if (!showProjectFields) return [];
    let list = projects.filter((p) => p.status === 'ACTIVE');
    if (draft.clientId) {
      list = list.filter((p) => {
        const cid = typeof p.clientId === 'object' ? p.clientId._id : p.clientId;
        return cid === draft.clientId;
      });
    }
    return list;
  }, [projects, draft.clientId, showProjectFields]);

  const tasksForProject = useMemo(() => {
    if (!draft.projectId) return [];
    return projectTasks.filter((t) => {
      const pid = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
      return pid === draft.projectId;
    });
  }, [projectTasks, draft.projectId]);

  const monthGrid = useMemo(() => {
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const first = new Date(y, m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [anchor]);

  const blocksByYmd = useMemo(() => {
    const m = new Map<string, ExpandedTimeBlock[]>();
    for (const b of blocks) {
      const d = new Date(b.startTime);
      const key = ymd(d);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(b);
    }
    return m;
  }, [blocks]);

  const pxPerHour = 44;
  const gridHeight = (LAST_HOUR - FIRST_HOUR) * pxPerHour;

  if (loading && blocks.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Block Time</h1>
          <p className="text-gray-500 mt-1">Plan your week and start the timer from blocks.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setView('month')}
              className={`px-3 py-2 text-sm flex items-center gap-1 ${view === 'month' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
            >
              <Grid3x3 className="w-4 h-4" />
              Month
            </button>
            <button
              type="button"
              onClick={() => setView('week')}
              className={`px-3 py-2 text-sm flex items-center gap-1 border-l border-gray-200 ${view === 'week' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
            >
              <CalendarRange className="w-4 h-4" />
              Week
            </button>
            <button
              type="button"
              onClick={() => setView('day')}
              className={`px-3 py-2 text-sm flex items-center gap-1 border-l border-gray-200 ${view === 'day' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
            >
              <CalendarDays className="w-4 h-4" />
              Day
            </button>
          </div>
          <button
            type="button"
            onClick={() => openNew(anchor)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Block
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          onClick={() => {
            const d = new Date(anchor);
            if (view === 'month') d.setMonth(d.getMonth() - 1);
            else if (view === 'week') d.setDate(d.getDate() - 7);
            else d.setDate(d.getDate() - 1);
            setAnchor(d);
          }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {view === 'month'
            ? anchor.toLocaleString(undefined, { month: 'long', year: 'numeric' })
            : view === 'week'
              ? `${formatDate(weekDays[0].toISOString())} – ${formatDate(weekDays[6].toISOString())}`
              : formatDate(anchor.toISOString())}
        </span>
        <button
          type="button"
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          onClick={() => {
            const d = new Date(anchor);
            if (view === 'month') d.setMonth(d.getMonth() + 1);
            else if (view === 'week') d.setDate(d.getDate() + 7);
            else d.setDate(d.getDate() + 1);
            setAnchor(d);
          }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {view === 'month' && (
        <div className="card overflow-x-auto">
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden min-w-[640px]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((h) => (
              <div key={h} className="bg-gray-50 text-xs font-semibold text-gray-600 px-2 py-2 text-center">
                {h}
              </div>
            ))}
            {monthGrid.map((cell, idx) =>
              cell ? (
                <div
                  key={idx}
                  className="bg-white min-h-[88px] p-1.5 text-left align-top cursor-pointer hover:bg-gray-50/80"
                  onClick={() => {
                    setAnchor(cell);
                    openNew(cell);
                  }}
                >
                  <div className="text-xs font-semibold text-gray-700 mb-1">{cell.getDate()}</div>
                  <div className="space-y-0.5">
                    {(blocksByYmd.get(ymd(cell)) || []).slice(0, 3).map((b) => (
                      <button
                        key={b.instanceKey}
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openEdit(b);
                        }}
                        className="block w-full text-left text-[10px] px-1 py-0.5 rounded truncate text-white"
                        style={{ backgroundColor: blockBarBackground(b) }}
                        title={b.title}
                      >
                        {b.title}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div key={idx} className="bg-gray-50 min-h-[88px]" />
              )
            )}
          </div>
        </div>
      )}

      {(view === 'week' || view === 'day') && (
        <div className="card overflow-x-auto">
          <div
            className="grid gap-0 min-w-[720px]"
            style={{
              gridTemplateColumns: view === 'day' ? '56px 1fr' : `56px repeat(7, minmax(0, 1fr))`,
            }}
          >
            <div className="border-b border-r border-gray-100 bg-gray-50" />
            {displayDays.map((day) => (
              <div
                key={day.toISOString()}
                className="text-center text-xs font-semibold text-gray-600 py-2 border-b border-gray-100 bg-gray-50"
              >
                {day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
              </div>
            ))}

            <div
              className="relative border-r border-gray-100 text-[10px] text-gray-400 pr-1 text-right bg-gray-50/50"
              style={{ height: gridHeight }}
            >
              {Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => (
                <div
                  key={i}
                  style={{ height: pxPerHour }}
                  className="border-t border-gray-100 pt-0.5"
                >
                  {FIRST_HOUR + i}:00
                </div>
              ))}
            </div>

            {displayDays.map((day) => (
              <div
                key={day.toISOString()}
                className="relative border-r border-gray-100 bg-white"
                style={{ height: gridHeight }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('[data-block-bar]')) return;
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const frac = y / gridHeight;
                  const ms =
                    day.getTime() +
                    (FIRST_HOUR + frac * (LAST_HOUR - FIRST_HOUR)) * 3600000;
                  const snap = new Date(ms);
                  snap.setMinutes(Math.round(snap.getMinutes() / 15) * 15, 0, 0);
                  const end = new Date(snap.getTime() + 3600000);
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const ls = `${snap.getFullYear()}-${pad(snap.getMonth() + 1)}-${pad(snap.getDate())}T${pad(snap.getHours())}:${pad(snap.getMinutes())}`;
                  const le = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
                  setEditingMasterId(null);
                  setDraft({
                    title: '',
                    kind: 'WORK',
                    startTime: ls,
                    endTime: le,
                    clientId: '',
                    projectId: '',
                    taskTypeId: '',
                    projectTaskId: '',
                    recurrenceRule: '',
                    notes: '',
                  });
                  setModalOpen(true);
                }}
              >
                {Array.from({ length: LAST_HOUR - FIRST_HOUR - 1 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
                    style={{ top: `${((i + 1) / (LAST_HOUR - FIRST_HOUR)) * 100}%` }}
                  />
                ))}
                {blocks.map((b) => {
                  const geom = clipBlockToDayGrid(new Date(b.startTime), new Date(b.endTime), day);
                  if (!geom) return null;
                  return (
                    <button
                      key={`${b.instanceKey}-${ymd(day)}`}
                      type="button"
                      data-block-bar
                      className="absolute left-1 right-1 rounded-md px-1.5 py-0.5 text-left text-[11px] text-white shadow-sm overflow-hidden z-10 hover:ring-2 hover:ring-white/50"
                      style={{
                        top: `${geom.topPct}%`,
                        height: `${geom.heightPct}%`,
                        backgroundColor: blockBarBackground(b),
                      }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        openEdit(b);
                      }}
                    >
                      <span className="font-medium line-clamp-2">{b.title}</span>
                      <span className="opacity-90 block truncate text-[10px]">
                        {blockKindLabel(b.kind)}
                        {projectLabel(b) ? ` · ${projectLabel(b)}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full my-8 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">
              {editingMasterId ? 'Edit block' : 'New block'}
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                className="input"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kind</label>
              <select
                className="input"
                value={draft.kind}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, kind: e.target.value as TimeBlockKind }))
                }
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {blockKindLabel(k)}
                  </option>
                ))}
              </select>
            </div>

            {showProjectFields && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select
                    className="input"
                    value={draft.clientId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const first = projects.find((p) => {
                        const c = typeof p.clientId === 'object' ? p.clientId._id : p.clientId;
                        return c === cid && p.status === 'ACTIVE';
                      });
                      setDraft((d) => ({
                        ...d,
                        clientId: cid,
                        projectId: first?._id || '',
                        projectTaskId: '',
                      }));
                    }}
                  >
                    <option value="">Select client…</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                        {c.isInternal ? ' (Internal)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                  <select
                    className="input"
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
                      setDraft((d) => ({
                        ...d,
                        projectId: pid,
                        clientId: cid || d.clientId,
                        projectTaskId: '',
                      }));
                    }}
                  >
                    <option value="">Select project…</option>
                    {filteredProjects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task type</label>
                  <select
                    className="input"
                    value={draft.taskTypeId}
                    onChange={(e) => setDraft((d) => ({ ...d, taskTypeId: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {taskTypes.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project task (optional)
                  </label>
                  <select
                    className="input"
                    value={draft.projectTaskId}
                    onChange={(e) => setDraft((d) => ({ ...d, projectTaskId: e.target.value }))}
                  >
                    <option value="">None</option>
                    {tasksForProject.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={draft.startTime}
                  onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={draft.endTime}
                  onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repeats (RRULE)</label>
              <input
                className="input font-mono text-xs"
                placeholder="e.g. RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR"
                value={draft.recurrenceRule}
                onChange={(e) => setDraft((d) => ({ ...d, recurrenceRule: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. Daily / weekly subset only. Leave empty for one-off blocks.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="input min-h-[72px]"
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-between pt-2">
              <div className="flex gap-2">
                {editingMasterId && (
                  <button
                    type="button"
                    className="btn-outline text-red-700 border-red-200 flex items-center gap-1"
                    onClick={() => deleteBlock(editingMasterId)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                {editingMasterId && draft.projectId && draft.taskTypeId && (
                  <button
                    type="button"
                    className="btn-primary flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => launchFromEditor()}
                  >
                    <Play className="w-4 h-4" />
                    Start timer
                  </button>
                )}
                <button type="button" className="btn-primary flex items-center gap-1" onClick={saveBlock}>
                  <Pencil className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
