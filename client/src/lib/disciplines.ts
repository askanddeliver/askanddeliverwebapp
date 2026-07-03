/** Operational discipline ids — internal time, typically excluded from intake. */
export const OPERATIONAL_DISCIPLINE_IDS = new Set(['admin', 'meeting']);

export function isOperationalDiscipline(disciplineId: string): boolean {
  return OPERATIONAL_DISCIPLINE_IDS.has(disciplineId);
}

export function disciplineTaskKey(disciplineId: string, taskId: string): string {
  return `${disciplineId}:${taskId}`;
}
