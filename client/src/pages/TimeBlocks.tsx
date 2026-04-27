import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  timeBlocksApi,
  projectsApi,
  taskTypesApi,
  projectTasksApi,
  clientsApi,
} from '../services/api';
import type { ExpandedTimeBlock, Project, TaskType, ProjectTask, Client, TimeBlockKind } from '../types';
import { toUTCStartOfDay, toUTCEndOfDay, formatDate } from '../utils/calculations';
import { addDays, startOfWeekMonday, ymd } from '../components/timeBlocks/calendarUtils';
import { TimeBlockLegend } from '../components/timeBlocks/TimeBlockLegend';
import { TimeBlockCalHeader } from '../components/timeBlocks/TimeBlockCalHeader';
import type { ViewMode } from '../components/timeBlocks/types';
import { TimeBlockWeekDayGrid } from '../components/timeBlocks/TimeBlockWeekDayGrid';
import { TimeBlockMonthGrid } from '../components/timeBlocks/TimeBlockMonthGrid';
import { TimeBlockDetailPopover } from '../components/timeBlocks/TimeBlockDetailPopover';
import {
  TimeBlockEditorModal,
  type BlockEditorDraft,
} from '../components/timeBlocks/TimeBlockEditorModal';

function emptyDraft(day: Date): BlockEditorDraft {
  const s = new Date(day);
  s.setHours(9, 0, 0, 0);
  const e = new Date(s);
  e.setHours(e.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    title: '',
    kind: 'WORK',
    startTime: `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}T${pad(s.getHours())}:${pad(s.getMinutes())}`,
    endTime: `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}T${pad(e.getHours())}:${pad(e.getMinutes())}`,
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
  const [draft, setDraft] = useState<BlockEditorDraft>(() => emptyDraft(new Date()));
  const [detail, setDetail] = useState<{
    block: ExpandedTimeBlock;
    x: number;
    y: number;
  } | null>(null);

  const range = useMemo(() => {
    if (view === 'day') {
      const d = new Date(anchor);
      d.setHours(0, 0, 0, 0);
      return { start: d, end: d };
    }
    if (view === 'week') {
      const ws = startOfWeekMonday(anchor);
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
    const ws = startOfWeekMonday(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [anchor]);

  const dayColumn = useMemo(() => {
    if (view !== 'day') return null;
    const x = new Date(anchor);
    x.setHours(0, 0, 0, 0);
    return x;
  }, [view, anchor]);

  const displayDays = view === 'day' && dayColumn ? [dayColumn] : weekDays;

  const headerTitle = useMemo(() => {
    if (view === 'month') {
      return anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    if (view === 'week') {
      const ws = startOfWeekMonday(anchor);
      const we = addDays(ws, 6);
      return `${formatDate(ws.toISOString())} – ${formatDate(we.toISOString())}`;
    }
    return anchor.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [view, anchor]);

  const dayBanner =
    view === 'day' && dayColumn
      ? {
          weekday: dayColumn.toLocaleDateString(undefined, { weekday: 'long' }),
          longDate: dayColumn.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
        }
      : null;

  const patchDraft = (patch: Partial<BlockEditorDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };

  const openNewForDay = (day: Date) => {
    setEditingMasterId(null);
    setDraft(emptyDraft(day));
    setModalOpen(true);
    setDetail(null);
  };

  const openEdit = (b: ExpandedTimeBlock) => {
    setEditingMasterId(b.masterId);
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
    setDetail(null);
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
        startTime: start.toISOString(),
        endTime: end.toISOString(),
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
      setDetail(null);
      fetchAll();
    } catch (e) {
      console.error(e);
      setError('Could not delete');
    }
  };

  const launchBlock = async (b: ExpandedTimeBlock) => {
    const hasProject = b.projectId && typeof b.projectId === 'object';
    const hasTask = b.taskTypeId && typeof b.taskTypeId === 'object';
    if (!hasProject || !hasTask) {
      setError('This block needs a project and task type to start the timer. Edit the block first.');
      return;
    }
    if (!window.confirm('Start the timer from this block? Any running timer will be stopped first.')) {
      return;
    }
    try {
      setError(null);
      await timeBlocksApi.launch(b.masterId, {
        description: [b.title, b.notes].filter(Boolean).join(' — '),
      });
      setDetail(null);
      window.location.href = '/dashboard';
    } catch (e) {
      console.error(e);
      setError('Could not start timer');
    }
  };

  const handleResizeCommit = async (b: ExpandedTimeBlock, newEnd: Date) => {
    try {
      setError(null);
      await timeBlocksApi.update(b.masterId, {
        startTime: new Date(b.startTime).toISOString(),
        endTime: newEnd.toISOString(),
      });
      fetchAll();
    } catch (e) {
      console.error(e);
      setError('Could not resize block');
    }
  };

  const showProjectFields =
    draft.kind === 'WORK' || draft.kind === 'ADMIN' || draft.kind === 'MEETING';

  const tasksForProject = useMemo(() => {
    if (!draft.projectId) return [];
    return projectTasks.filter((t) => {
      const pid = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
      return pid === draft.projectId;
    });
  }, [projectTasks, draft.projectId]);

  const detailCanStart =
    detail != null &&
    typeof detail.block.projectId === 'object' &&
    detail.block.projectId != null &&
    typeof detail.block.taskTypeId === 'object' &&
    detail.block.taskTypeId != null;

  if (loading && blocks.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-6 min-h-0">
      <TimeBlockLegend clients={clients} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Block Time</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Plan your week, match client colors in the legend, and start the timer from a block.
          </p>
        </div>

        <TimeBlockCalHeader
          view={view}
          onViewChange={setView}
          title={headerTitle}
          onPrev={() => {
            const d = new Date(anchor);
            if (view === 'month') d.setMonth(d.getMonth() - 1);
            else if (view === 'week') d.setDate(d.getDate() - 7);
            else d.setDate(d.getDate() - 1);
            setAnchor(d);
          }}
          onNext={() => {
            const d = new Date(anchor);
            if (view === 'month') d.setMonth(d.getMonth() + 1);
            else if (view === 'week') d.setDate(d.getDate() + 7);
            else d.setDate(d.getDate() + 1);
            setAnchor(d);
          }}
          onToday={() => setAnchor(new Date())}
          onNewBlock={() => {
            const base =
              view === 'day' && dayColumn
                ? dayColumn
                : view === 'week'
                  ? startOfWeekMonday(anchor)
                  : new Date(anchor.getFullYear(), anchor.getMonth(), 1);
            openNewForDay(base);
          }}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-3 text-sm">
            {error}
          </div>
        )}

        {view === 'month' && (
          <TimeBlockMonthGrid
            anchor={anchor}
            blocks={blocks}
            onDayClick={(day) => {
              setAnchor(day);
              setView('day');
            }}
            onBlockClick={(b, e) => {
              setDetail({ block: b, x: e.clientX, y: e.clientY });
            }}
          />
        )}

        {(view === 'week' || view === 'day') && (
          <TimeBlockWeekDayGrid
            days={displayDays}
            blocks={blocks}
            dayBanner={dayBanner}
            onSlotClick={(_day, start, end) => {
              const pad = (n: number) => String(n).padStart(2, '0');
              setEditingMasterId(null);
              setDraft({
                title: '',
                kind: 'WORK',
                startTime: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`,
                endTime: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
                clientId: '',
                projectId: '',
                taskTypeId: '',
                projectTaskId: '',
                recurrenceRule: '',
                notes: '',
              });
              setModalOpen(true);
              setDetail(null);
            }}
            onBlockClick={(b, e) => {
              setDetail({ block: b, x: e.clientX, y: e.clientY });
            }}
            onResizeCommit={handleResizeCommit}
          />
        )}
      </div>

      {detail && (
        <TimeBlockDetailPopover
          block={detail.block}
          anchorX={detail.x}
          anchorY={detail.y}
          onClose={() => setDetail(null)}
          onEdit={() => {
            openEdit(detail.block);
          }}
          onDelete={() => deleteBlock(detail.block.masterId)}
          onStartTimer={() => launchBlock(detail.block)}
          canStartTimer={detailCanStart}
        />
      )}

      <TimeBlockEditorModal
        open={modalOpen}
        isEdit={Boolean(editingMasterId)}
        draft={draft}
        onDraftChange={patchDraft}
        clients={clients}
        projects={projects}
        taskTypes={taskTypes}
        tasksForProject={tasksForProject}
        showProjectFields={showProjectFields}
        onSave={saveBlock}
        onCancel={() => {
          setModalOpen(false);
          setError(null);
        }}
        error={modalOpen ? error : null}
      />
    </div>
  );
}
