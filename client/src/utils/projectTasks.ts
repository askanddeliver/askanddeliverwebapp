import type { ProjectTask } from '../types';

export function taskProjectId(task: ProjectTask): string {
  return typeof task.projectId === 'object' ? task.projectId._id : task.projectId;
}

/** Per-project priority: `order` ascending, then newest first when order ties (e.g. legacy duplicates). */
export function sortProjectTasksByOrder(tasks: ProjectTask[]): ProjectTask[] {
  return [...tasks].sort((a, b) => {
    const oa = a.order ?? 0;
    const ob = b.order ?? 0;
    if (oa !== ob) return oa - ob;
    const ca = new Date(a.createdAt).getTime();
    const cb = new Date(b.createdAt).getTime();
    if (ca !== cb) return cb - ca;
    return a._id.localeCompare(b._id);
  });
}

/**
 * Persist a drag of open tasks without moving completed (or other hidden) tasks.
 * Open-task slots keep their places in the full project order; those slots are filled
 * by `reorderedOpenIds`.
 */
export function taskIdsAfterOpenReorder(
  allTasks: ProjectTask[],
  projectId: string,
  reorderedOpenIds: string[]
): string[] {
  const projectTasks = sortProjectTasksByOrder(
    allTasks.filter((task) => taskProjectId(task) === projectId)
  );
  const openSet = new Set(reorderedOpenIds);
  let index = 0;
  return projectTasks.map((task) => {
    if (!openSet.has(task._id)) return task._id;
    const next = reorderedOpenIds[index];
    index += 1;
    return next ?? task._id;
  });
}
