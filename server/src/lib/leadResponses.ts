import type { CreateLeadDto } from '../types';

const CORE_RESPONSE_KEYS = [
  'confidence',
  'projectType',
  'project_type',
  'description',
  'budget',
  'timeline',
  'name',
  'email',
  'company',
  'message',
  'disciplines_needed',
  'attachments',
] as const;

/** Build responses map from intake payload — merges explicit responses with top-level fields. */
export function buildLeadResponsesFromSubmit(
  body: CreateLeadDto & { responses?: Record<string, unknown> }
): Record<string, unknown> {
  const responses: Record<string, unknown> = {
    ...(body.responses && typeof body.responses === 'object' ? body.responses : {}),
  };

  const assign = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && !value.trim()) return;
    if (!(key in responses)) {
      responses[key] = typeof value === 'string' ? value.trim() : value;
    }
  };

  assign('confidence', body.confidence);
  assign('project_type', body.projectType);
  assign('description', body.description);
  assign('budget', body.budget);
  assign('timeline', body.timeline);
  assign('name', body.name);
  assign('email', body.email);
  assign('company', body.company);
  assign('message', body.message);

  return responses;
}

/** Keys in responses that are already rendered in the standard lead detail sections. */
export function isRedundantResponseKey(key: string): boolean {
  return (CORE_RESPONSE_KEYS as readonly string[]).includes(key);
}
