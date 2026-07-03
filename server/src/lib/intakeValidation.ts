import type { IIntakeField, IIntakeForm } from '../models/IntakeForm';
import { createError } from '../middleware/errorHandler';
import { IntakeForm } from '../models/IntakeForm';
import { DEFAULT_INTAKE_SLUG } from '../lib/defaultIntakeFormSeed';
import type { CreateLeadDto } from '../types';

function isFieldVisible(
  field: IIntakeField,
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

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function validateFieldValue(field: IIntakeField, value: unknown): void {
  if (field.type === 'file') return;

  if (field.type === 'email' && typeof value === 'string') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      throw createError('Valid email is required', 400);
    }
  }

  if (field.type === 'phone' && typeof value === 'string') {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      throw createError(`Valid phone number is required for ${field.label}`, 400);
    }
  }

  if (field.type === 'date' && typeof value === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      throw createError(`Valid date is required for ${field.label}`, 400);
    }
  }

  if (field.type === 'single_select' && field.options?.length) {
    const allowed = field.options.map((o) => o.value);
    if (!allowed.includes(String(value))) {
      throw createError(`Invalid option for ${field.label}`, 400);
    }
  }

  if (field.type === 'multi_select') {
    if (!Array.isArray(value)) {
      throw createError(`${field.label} must be a list of selections`, 400);
    }
    if (field.options?.length) {
      const allowed = field.options.map((o) => o.value);
      for (const item of value) {
        if (!allowed.includes(String(item))) {
          throw createError(`Invalid option for ${field.label}`, 400);
        }
      }
    }
  }

  if (field.type === 'disciplines_needed') {
    if (!Array.isArray(value) || value.length === 0) {
      throw createError('At least one discipline is required', 400);
    }
    const allowed =
      field.disciplineOptionIds ??
      field.disciplineOptions?.map((d) => d.id) ??
      [];
    for (const id of value) {
      if (!allowed.includes(String(id))) {
        throw createError(`Invalid discipline: ${id}`, 400);
      }
    }
  }
}

export interface ValidatedIntakeSubmission {
  form: IIntakeForm;
  confidence: 'YES' | 'MAYBE' | 'UNSURE';
  projectType: string;
  description: string;
  budget: string;
  timeline: string;
  name: string;
  email: string;
  company: string;
  message: string;
  responses: Record<string, unknown>;
  intakeFormId: string;
  intakeFormVersion: number;
}

export async function validateIntakeSubmission(
  workspaceOwnerId: string,
  body: CreateLeadDto & {
    responses?: Record<string, unknown>;
    intakeFormId?: string;
    intakeFormVersion?: number;
  }
): Promise<ValidatedIntakeSubmission> {
  const responses: Record<string, unknown> = {
    ...(body.responses && typeof body.responses === 'object' ? body.responses : {}),
  };

  let form: IIntakeForm | null = null;

  if (body.intakeFormId) {
    form = await IntakeForm.findOne({
      _id: body.intakeFormId,
      userId: workspaceOwnerId,
      status: 'PUBLISHED',
    });
    if (!form) {
      throw createError('Published intake form not found', 400);
    }
    if (
      typeof body.intakeFormVersion === 'number' &&
      form.version !== body.intakeFormVersion
    ) {
      throw createError(
        'Intake form has been updated. Please refresh the page and try again.',
        409
      );
    }
  } else {
    form = await IntakeForm.findOne({
      userId: workspaceOwnerId,
      slug: DEFAULT_INTAKE_SLUG,
      status: 'PUBLISHED',
    });
    if (!form) {
      throw createError('Published intake form not configured', 503);
    }
  }

  for (const step of form.steps) {
    for (const field of step.fields) {
      if (!isFieldVisible(field, responses)) continue;

      const fieldValue = responses[field.key];

      if (field.required && field.type !== 'file') {
        if (isEmpty(fieldValue)) {
          throw createError(`${field.label} is required`, 400);
        }
      }

      if (!isEmpty(fieldValue)) {
        validateFieldValue(field, fieldValue);
      }
    }
  }

  const mapped = {
    confidence: '' as 'YES' | 'MAYBE' | 'UNSURE' | '',
    projectType: '',
    description: '',
    budget: '',
    timeline: '',
    name: '',
    email: '',
    company: '',
    message: '',
  };

  for (const step of form.steps) {
    for (const field of step.fields) {
      if (!field.mapsTo) continue;
      const value = responses[field.key];
      if (isEmpty(value)) continue;

      const str = typeof value === 'string' ? value.trim() : String(value);

      switch (field.mapsTo) {
        case 'confidence':
          mapped.confidence = str as 'YES' | 'MAYBE' | 'UNSURE';
          break;
        case 'projectType':
          mapped.projectType = str;
          break;
        case 'description':
          mapped.description = str;
          break;
        case 'budget':
          mapped.budget = str;
          break;
        case 'timeline':
          mapped.timeline = str;
          break;
        case 'name':
          mapped.name = str;
          break;
        case 'email':
          mapped.email = str;
          break;
        case 'company':
          mapped.company = str;
          break;
        case 'message':
          mapped.message = str;
          break;
      }
    }
  }

  if (
    !mapped.confidence ||
    !['YES', 'MAYBE', 'UNSURE'].includes(mapped.confidence)
  ) {
    throw createError('Valid confidence level is required', 400);
  }
  if (!mapped.name) {
    throw createError('Name is required', 400);
  }
  if (!mapped.email) {
    throw createError('Email is required', 400);
  }
  validateFieldValue(
    { key: 'email', type: 'email', label: 'Email' } as IIntakeField,
    mapped.email
  );

  return {
    form,
    confidence: mapped.confidence,
    projectType: mapped.projectType,
    description: mapped.description,
    budget: mapped.budget,
    timeline: mapped.timeline,
    name: mapped.name,
    email: mapped.email,
    company: mapped.company,
    message: mapped.message,
    responses,
    intakeFormId: String(form._id),
    intakeFormVersion: form.version,
  };
}
