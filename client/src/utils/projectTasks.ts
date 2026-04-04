import type { ProjectTask } from '../types';

/** Per-project priority: `order` ascending, then creation time. */
export function sortProjectTasksByOrder(tasks: ProjectTask[]): ProjectTask[] {
  return [...tasks].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    const ca = new Date(a.createdAt).getTime();
    const cb = new Date(b.createdAt).getTime();
    if (ca !== cb) return ca - cb;
    return a._id.localeCompare(b._id);
  });
}
