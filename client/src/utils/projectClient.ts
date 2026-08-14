import type { Project } from '../types';

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
