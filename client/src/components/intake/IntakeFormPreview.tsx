import type { IntakeForm, IntakeStep } from '../../types';

interface IntakeFormPreviewProps {
  form: Pick<
    IntakeForm,
    | 'title'
    | 'subtitle'
    | 'submitButtonLabel'
    | 'successMessage'
    | 'successCtaLabel'
    | 'successCtaUrl'
    | 'steps'
  >;
}

function fieldSummary(type: string, required?: boolean) {
  const req = required ? ' · required' : '';
  return `${type.replace(/_/g, ' ')}${req}`;
}

export function IntakeFormPreview({ form }: IntakeFormPreviewProps) {
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Intro
        </p>
        <h3 className="mt-1 text-lg font-semibold text-gray-900">{form.title}</h3>
        {form.subtitle && (
          <p className="mt-1 text-gray-600">{form.subtitle}</p>
        )}
        {form.submitButtonLabel && (
          <p className="mt-3 inline-block rounded-md bg-[var(--admin-accent,#5B7765)] px-3 py-1.5 text-xs font-medium text-white">
            {form.submitButtonLabel}
          </p>
        )}
      </div>

      {form.steps.map((step: IntakeStep, index: number) => (
        <div
          key={step.id}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Step {index + 1} · {step.id}
          </p>
          <h4 className="mt-1 font-semibold text-gray-900">{step.title}</h4>
          {step.description && (
            <p className="mt-1 text-gray-600">{step.description}</p>
          )}
          {step.copyVariants && Object.keys(step.copyVariants).length > 0 && (
            <p className="mt-2 text-xs text-amber-700">
              Conditional copy for: {Object.keys(step.copyVariants).join(', ')}
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {step.fields.map((field) => (
              <li
                key={field.key}
                className="flex items-start justify-between gap-2 rounded-md bg-gray-50 px-3 py-2"
              >
                <div>
                  <span className="font-medium text-gray-800">{field.label}</span>
                  <span className="ml-2 text-xs text-gray-500">({field.key})</span>
                  {field.helpText && (
                    <p className="text-xs text-gray-500">{field.helpText}</p>
                  )}
                  {field.showWhen && (
                    <p className="text-xs text-amber-700">
                      Shows when {field.showWhen.fieldKey} ={' '}
                      {Array.isArray(field.showWhen.equals)
                        ? field.showWhen.equals.join(' | ')
                        : field.showWhen.equals}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {fieldSummary(field.type, field.required)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {(form.successMessage || form.successCtaLabel) && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Success screen
          </p>
          {form.successMessage && (
            <p className="mt-1 text-gray-700">{form.successMessage}</p>
          )}
          {form.successCtaLabel && (
            <p className="mt-2 text-xs text-gray-500">
              CTA: {form.successCtaLabel}
              {form.successCtaUrl ? ` → ${form.successCtaUrl}` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
