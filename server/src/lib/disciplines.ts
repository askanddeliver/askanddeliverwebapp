import type { IIntakeField, IIntakeForm, IIntakeStep } from '../models/IntakeForm';
import type { IDisciplineDefinition, ISiteConfig } from '../models/SiteConfig';

export interface DisciplineIntakeOption {
  id: string;
  label: string;
  description?: string;
}

export function resolveDisciplineIntakeOptions(
  siteConfig: Pick<ISiteConfig, 'disciplines'> | null | undefined,
  field: Pick<IIntakeField, 'disciplineOptionIds' | 'disciplineOptions'>
): DisciplineIntakeOption[] {
  const ids = field.disciplineOptionIds ?? [];
  if (ids.length === 0) {
    return (field.disciplineOptions ?? []).map((o) => ({
      id: o.id,
      label: o.label,
    }));
  }

  const byId = new Map(
    (siteConfig?.disciplines ?? []).map((d) => [d.id, d] as const)
  );

  return ids.map((id) => {
    const discipline = byId.get(id);
    return {
      id,
      label: discipline?.name ?? id,
      description: discipline?.description,
    };
  });
}

export function getDisciplines(
  siteConfig: Pick<ISiteConfig, 'disciplines'> | null | undefined,
  opts?: { forIntake?: boolean }
): IDisciplineDefinition[] {
  const list = [...(siteConfig?.disciplines ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  if (opts?.forIntake) {
    const intakeIds = new Set([
      'design',
      'development',
      'strategy',
      'research',
      'support',
    ]);
    return list.filter((d) => intakeIds.has(d.id));
  }

  return list;
}

export function validateDisciplinesNeeded(
  value: unknown,
  field: Pick<IIntakeField, 'disciplineOptionIds'>
): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('At least one discipline is required');
  }

  const allowed = field.disciplineOptionIds ?? [];
  for (const id of value) {
    if (!allowed.includes(String(id))) {
      throw new Error(`Invalid discipline: ${id}`);
    }
  }
}

export function enrichIntakeFormDisciplines<
  T extends { steps: IIntakeStep[] },
>(
  form: T,
  siteConfig: Pick<ISiteConfig, 'disciplines'> | null | undefined
): T {
  return {
    ...form,
    steps: form.steps.map((step) => ({
      ...step,
      fields: step.fields.map((field) => {
        if (field.type !== 'disciplines_needed') return field;
        const disciplineOptions = resolveDisciplineIntakeOptions(
          siteConfig,
          field
        ).map((o) => ({ id: o.id, label: o.label }));
        return { ...field, disciplineOptions };
      }),
    })),
  };
}

export function resolveDisciplineLabels(
  ids: string[],
  siteConfig: Pick<ISiteConfig, 'disciplines'> | null | undefined
): string[] {
  const byId = new Map(
    (siteConfig?.disciplines ?? []).map((d) => [d.id, d.name] as const)
  );
  return ids.map((id) => byId.get(id) ?? id);
}

export type { IIntakeForm };
