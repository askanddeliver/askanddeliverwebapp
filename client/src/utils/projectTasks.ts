import type { ProjectTask } from '../types';

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
