import type { IntakeField, IntakeStep, PublicIntakeForm } from '../types';

export function isFieldVisible(
  field: IntakeField,
  responses: Record<string, unknown>
): boolean {
  if (!field.showWhen) return true;

  const value = responses[field.showWhen.fieldKey];
  const expected = field.showWhen.equals;

  if (Array.isArray(expected)) {
    return expected.includes(String(value));
  }
  return String(value) === expected;
}

export function getVisibleFields(
  step: IntakeStep,
  responses: Record<string, unknown>
): IntakeField[] {
  return step.fields.filter((field) => isFieldVisible(field, responses));
}

export function resolveStepCopy(
  step: IntakeStep,
  responses: Record<string, unknown>
): { title: string; description?: string } {
  const confidence = responses.confidence as string | undefined;
  const variant =
    confidence && step.copyVariants ? step.copyVariants[confidence] : undefined;

  return {
    title: variant?.title ?? step.title,
    description: variant?.description ?? step.description,
  };
}

export function resolveFieldLabel(
  field: IntakeField,
  responses: Record<string, unknown>
): string {
  const confidence = responses.confidence as string | undefined;
  if (confidence && field.labelVariants?.[confidence]) {
    return field.labelVariants[confidence];
  }
  return field.label;
}

export function resolveFieldPlaceholder(
  field: IntakeField,
  responses: Record<string, unknown>
): string {
  const confidence = responses.confidence as string | undefined;
  if (confidence && field.placeholderVariants?.[confidence]) {
    return field.placeholderVariants[confidence];
  }
  return field.placeholder ?? '';
}

export function isFieldValueEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function canProceedStep(
  step: IntakeStep,
  responses: Record<string, unknown>
): boolean {
  const visibleFields = getVisibleFields(step, responses);

  for (const field of visibleFields) {
    if (!field.required) continue;
    if (field.type === 'file') continue;

    const value = responses[field.key];
    if (isFieldValueEmpty(value)) return false;

    if (
      field.type === 'disciplines_needed' &&
      Array.isArray(value) &&
      value.length === 0
    ) {
      return false;
    }
  }

  return true;
}

export function buildLeadSubmitPayload(
  form: Pick<PublicIntakeForm, '_id' | 'version' | 'steps'>,
  responses: Record<string, unknown>
): {
  intakeFormId: string;
  intakeFormVersion: number;
  responses: Record<string, unknown>;
  confidence: string;
  projectType?: string;
  description?: string;
  budget?: string;
  timeline?: string;
  name: string;
  email: string;
  company?: string;
  message?: string;
} {
  const payload: {
    intakeFormId: string;
    intakeFormVersion: number;
    responses: Record<string, unknown>;
    confidence: string;
    projectType?: string;
    description?: string;
    budget?: string;
    timeline?: string;
    name: string;
    email: string;
    company?: string;
    message?: string;
  } = {
    intakeFormId: form._id,
    intakeFormVersion: form.version,
    responses,
    confidence: String(responses.confidence ?? ''),
    name: String(responses.name ?? '').trim(),
    email: String(responses.email ?? '').trim(),
  };

  for (const step of form.steps) {
    for (const field of step.fields) {
      if (!field.mapsTo) continue;
      const value = responses[field.key];
      if (isFieldValueEmpty(value)) continue;

      const str = typeof value === 'string' ? value.trim() : String(value);

      switch (field.mapsTo) {
        case 'confidence':
          payload.confidence = str;
          break;
        case 'projectType':
          payload.projectType = str;
          break;
        case 'description':
          payload.description = str;
          break;
        case 'budget':
          payload.budget = str;
          break;
        case 'timeline':
          payload.timeline = str;
          break;
        case 'name':
          payload.name = str;
          break;
        case 'email':
          payload.email = str;
          break;
        case 'company':
          payload.company = str;
          break;
        case 'message':
          payload.message = str;
          break;
      }
    }
  }

  return payload;
}
