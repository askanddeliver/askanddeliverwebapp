import type { Project, ProjectTask } from '../types';

export function projectClientId(project: Project): string {
  return typeof project.clientId === 'object' && project.clientId
    ? project.clientId._id
    : String(project.clientId || '');
}

export function uniqueClientsFromProjects(
  projects: Project[]
): Array<{ _id: string; name: string }> {
  const seen = new Map<string, string>();
  for (const p of projects) {
    if (typeof p.clientId === 'object' && p.clientId) {
      seen.set(p.clientId._id, p.clientId.name);
    }
  }
  return Array.from(seen, ([_id, name]) => ({ _id, name })).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export interface ClientProjectGroup {
  clientId: string;
  clientName: string;
  clientCompany?: string;
  isInternal?: boolean;
  projects: Project[];
}

/** Group projects by client, preserving incoming project order within each group. */
export function groupProjectsByClient(projects: Project[]): ClientProjectGroup[] {
  const groups = new Map<string, ClientProjectGroup>();
  const order: string[] = [];

  for (const project of projects) {
    const client = typeof project.clientId === 'object' ? project.clientId : null;
    const clientId = client?._id || `__unknown_${project._id}`;
    if (!groups.has(clientId)) {
      order.push(clientId);
      groups.set(clientId, {
        clientId,
        clientName: client?.name || 'Unknown client',
        clientCompany: client?.company,
        isInternal: client?.isInternal,
        projects: [],
      });
    }
    groups.get(clientId)!.projects.push(project);
  }

  return order
    .map((id) => groups.get(id)!)
    .sort((a, b) => a.clientName.localeCompare(b.clientName, undefined, { sensitivity: 'base' }));
}

export function openTasksByProject(
  tasks: ProjectTask[]
): Record<string, ProjectTask[]> {
  const map: Record<string, ProjectTask[]> = {};
  for (const task of tasks) {
    if (task.status === 'COMPLETED') continue;
    const pid =
      typeof task.projectId === 'object' ? task.projectId._id : task.projectId;
    if (!map[pid]) map[pid] = [];
    map[pid].push(task);
  }
  return map;
}
