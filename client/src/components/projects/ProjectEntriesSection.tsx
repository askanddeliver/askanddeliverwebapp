import { useState } from 'react';
import { Play, Plus, Square } from 'lucide-react';
import type { Project, ProjectTask, TaskType, TimeEntry } from '../../types';
import { EntryList } from '../entries/EntryList';
import { TimerDisplay } from '../timer/TimerDisplay';

const PAGE_SIZE = 50;

interface ProjectEntriesSectionProps {
  project: Project;
  entries: TimeEntry[];
  taskTypes: TaskType[];
  projectTasks: ProjectTask[];
  activeTimer: TimeEntry | null;
  showAmount: boolean;
  showRate: boolean;
  loading?: boolean;
  onStart: (
    projectId: string,
    taskTypeId: string,
    projectTaskId?: string,
    description?: string
  ) => void | Promise<void>;
  onStop: () => void | Promise<void>;
  onAddEntry: () => void;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (id: string) => void;
  onContinue?: (entry: TimeEntry) => void;
}

export function ProjectEntriesSection({
  project,
  entries,
  taskTypes,
  projectTasks,
  activeTimer,
  showAmount,
  showRate,
  loading,
  onStart,
  onStop,
  onAddEntry,
  onEdit,
  onDelete,
  onContinue,
}: ProjectEntriesSectionProps) {
  const [taskTypeId, setTaskTypeId] = useState('');
  const [projectTaskId, setProjectTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const openTasks = projectTasks.filter((t) => t.status !== 'COMPLETED');
  const isRunning = Boolean(activeTimer);
  const visible = entries.slice(0, visibleCount);

  const handleStart = async () => {
    if (!taskTypeId || isRunning) return;
    await onStart(
      project._id,
      taskTypeId,
      projectTaskId || undefined,
      description.trim() || undefined
    );
    setDescription('');
  };

  return (
    <div className="space-y-4">
      {isRunning && activeTimer && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-100 bg-primary-50/60 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary-700">
              Timer running
            </p>
            <TimerDisplay
              startTime={activeTimer.startTime}
              isRunning
              initialDuration={activeTimer.duration}
            />
          </div>
          <button type="button" onClick={() => void onStop()} className="btn-outline flex items-center gap-2">
            <Square className="h-4 w-4" />
            Stop
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Task type *</label>
          <select
            value={taskTypeId}
            onChange={(e) => setTaskTypeId(e.target.value)}
            disabled={isRunning}
            className="input"
          >
            <option value="">Select task type...</option>
            {taskTypes.map((tt) => (
              <option key={tt._id} value={tt._id}>
                {showRate ? `${tt.name} — $${tt.rate}/hr` : tt.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Project task</label>
          <select
            value={projectTaskId}
            onChange={(e) => setProjectTaskId(e.target.value)}
            disabled={isRunning}
            className="input"
          >
            <option value="">None</option>
            {openTasks.map((t) => (
              <option key={t._id} value={t._id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isRunning}
            placeholder="What are you working on?"
            className="input"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={!taskTypeId || isRunning || taskTypes.length === 0}
            className="btn-primary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Start timer
          </button>
          <button type="button" onClick={onAddEntry} className="btn-outline flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add entry
          </button>
        </div>
      </div>

      <EntryList
        entries={visible}
        onEdit={onEdit}
        onDelete={onDelete}
        onContinue={onContinue}
        loading={loading}
        showAmount={showAmount}
      />

      {entries.length > visibleCount && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="link text-sm"
          >
            Load more ({entries.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
