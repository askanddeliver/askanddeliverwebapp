import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Eye,
  Loader2,
  Save,
  Upload,
} from 'lucide-react';
import { AdminPanel } from '../components/admin/AdminPanel';
import { IntakeFormPreview } from '../components/intake/IntakeFormPreview';
import { DisciplineOptionPicker } from '../components/intake/DisciplineOptionPicker';
import { intakeFormsApi, siteConfigApi } from '../services/api';
import type { DisciplineDefinition, IntakeForm, IntakeStep } from '../types';

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function IntakeConfigPage() {
  const [form, setForm] = useState<IntakeForm | null>(null);
  const [draft, setDraft] = useState<IntakeForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [disciplines, setDisciplines] = useState<DisciplineDefinition[]>([]);

  const loadForm = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await intakeFormsApi.getDefault();
      setForm(res.data);
      setDraft(res.data);
      setExpandedStepId((prev) => prev ?? res.data.steps[0]?.id ?? null);
    } catch (err) {
      console.error(err);
      setError('Failed to load intake form');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  useEffect(() => {
    siteConfigApi
      .get()
      .then((res) => setDisciplines(res.data.disciplines ?? []))
      .catch(() => setDisciplines([]));
  }, []);

  const isDirty = useMemo(() => {
    if (!form || !draft) return false;
    return JSON.stringify(form) !== JSON.stringify(draft);
  }, [form, draft]);

  const hasUnpublishedChanges = useMemo(() => {
    if (!form || !draft) return false;
    if (form.status !== 'PUBLISHED') return isDirty;
    if (isDirty) return true;
    if (!form.publishedAt) return false;
    return new Date(form.updatedAt) > new Date(form.publishedAt);
  }, [form, draft, isDirty]);

  const updateDraft = (patch: Partial<IntakeForm>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateStep = (stepId: string, patch: Partial<IntakeStep>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
      };
    });
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: moveItem(prev.steps, index, index + direction) };
    });
  };

  const moveField = (stepId: string, fieldIndex: number, direction: -1 | 1) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((step) => {
          if (step.id !== stepId) return step;
          return {
            ...step,
            fields: moveItem(step.fields, fieldIndex, fieldIndex + direction),
          };
        }),
      };
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await intakeFormsApi.update(draft._id, {
        title: draft.title,
        subtitle: draft.subtitle,
        successMessage: draft.successMessage,
        successCtaLabel: draft.successCtaLabel,
        successCtaUrl: draft.successCtaUrl,
        submitButtonLabel: draft.submitButtonLabel,
        steps: draft.steps,
      });
      setForm(res.data);
      setDraft(res.data);
      setSuccess('Changes saved.');
    } catch (err) {
      console.error(err);
      setError('Failed to save intake form');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draft) return;
    try {
      setPublishing(true);
      setError(null);
      setSuccess(null);

      if (isDirty) {
        const saveRes = await intakeFormsApi.update(draft._id, {
          title: draft.title,
          subtitle: draft.subtitle,
          successMessage: draft.successMessage,
          successCtaLabel: draft.successCtaLabel,
          successCtaUrl: draft.successCtaUrl,
          submitButtonLabel: draft.submitButtonLabel,
          steps: draft.steps,
        });
        setDraft(saveRes.data);
      }

      const res = await intakeFormsApi.publish(draft._id);
      setForm(res.data);
      setDraft(res.data);
      setSuccess(`Published as version ${res.data.version}.`);
    } catch (err) {
      console.error(err);
      setError('Failed to publish intake form');
    } finally {
      setPublishing(false);
    }
  };

  if (loading && !draft) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error || 'Intake form not found'}
      </div>
    );
  }

  const statusBadge =
    draft.status === 'PUBLISHED'
      ? 'bg-green-100 text-green-800'
      : 'bg-amber-100 text-amber-800';

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Intake Form</h1>
          <p className="mt-1 text-gray-500">
            Configure the public project inquiry form on the Contact page
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusBadge}`}
          >
            {draft.status}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            v{draft.version}
          </span>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--admin-accent,#5B7765)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Publish
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}
      {hasUnpublishedChanges && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have unpublished changes. Save and publish for the public site to
          see updates.
        </div>
      )}

      <div
        className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}
      >
        <div className="space-y-4">
          <AdminPanel title="Form settings">
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Title</span>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => updateDraft({ title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Subtitle</span>
                <textarea
                  value={draft.subtitle || ''}
                  onChange={(e) => updateDraft({ subtitle: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">
                  Submit button label
                </span>
                <input
                  type="text"
                  value={draft.submitButtonLabel || ''}
                  onChange={(e) =>
                    updateDraft({ submitButtonLabel: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </AdminPanel>

          <AdminPanel title="Success screen">
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Message</span>
                <textarea
                  value={draft.successMessage || ''}
                  onChange={(e) =>
                    updateDraft({ successMessage: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">
                    CTA label
                  </span>
                  <input
                    type="text"
                    value={draft.successCtaLabel || ''}
                    onChange={(e) =>
                      updateDraft({ successCtaLabel: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">
                    CTA URL
                  </span>
                  <input
                    type="text"
                    value={draft.successCtaUrl || ''}
                    onChange={(e) =>
                      updateDraft({ successCtaUrl: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Steps"
            headerExtra={
              <span className="text-xs text-gray-500">
                {draft.steps.length} steps
              </span>
            }
          >
            <div className="space-y-3">
              {draft.steps.map((step, stepIndex) => {
                const expanded = expandedStepId === step.id;
                return (
                  <div
                    key={step.id}
                    className="rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStepId(expanded ? null : step.id)
                      }
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <ClipboardList className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="truncate text-sm font-medium text-gray-900">
                          {stepIndex + 1}. {step.title}
                        </span>
                        <span className="text-xs text-gray-400">({step.id})</span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                          expanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {expanded && (
                      <div className="space-y-4 border-t border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={stepIndex === 0}
                            onClick={() => moveStep(stepIndex, -1)}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                            title="Move step up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={stepIndex === draft.steps.length - 1}
                            onClick={() => moveStep(stepIndex, 1)}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                            title="Move step down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>

                        <label className="block">
                          <span className="text-xs font-medium text-gray-600">
                            Step title
                          </span>
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) =>
                              updateStep(step.id, { title: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-medium text-gray-600">
                            Step description
                          </span>
                          <textarea
                            value={step.description || ''}
                            onChange={(e) =>
                              updateStep(step.id, {
                                description: e.target.value,
                              })
                            }
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </label>

                        <div>
                          <p className="mb-2 text-xs font-medium text-gray-600">
                            Fields ({step.fields.length})
                          </p>
                          <ul className="space-y-2">
                            {step.fields.map((field, fieldIndex) => (
                              <li
                                key={field.key}
                                className="rounded-lg border border-gray-200 p-3"
                              >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">
                                      {field.label}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {field.key} · {field.type}
                                      {field.required ? ' · required' : ''}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    <button
                                      type="button"
                                      disabled={fieldIndex === 0}
                                      onClick={() =>
                                        moveField(step.id, fieldIndex, -1)
                                      }
                                      className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                                    >
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={
                                        fieldIndex === step.fields.length - 1
                                      }
                                      onClick={() =>
                                        moveField(step.id, fieldIndex, 1)
                                      }
                                      className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                                    >
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <label className="block">
                                  <span className="text-xs text-gray-500">
                                    Label
                                  </span>
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => {
                                      const label = e.target.value;
                                      setDraft((prev) => {
                                        if (!prev) return prev;
                                        return {
                                          ...prev,
                                          steps: prev.steps.map((s) =>
                                            s.id !== step.id
                                              ? s
                                              : {
                                                  ...s,
                                                  fields: s.fields.map((f) =>
                                                    f.key === field.key
                                                      ? { ...f, label }
                                                      : f
                                                  ),
                                                }
                                          ),
                                        };
                                      });
                                    }}
                                    className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                                  />
                                </label>
                                {(field.type === 'text' ||
                                  field.type === 'email' ||
                                  field.type === 'textarea') && (
                                  <label className="mt-2 block">
                                    <span className="text-xs text-gray-500">
                                      Placeholder
                                    </span>
                                    <input
                                      type="text"
                                      value={field.placeholder || ''}
                                      onChange={(e) => {
                                        const placeholder = e.target.value;
                                        setDraft((prev) => {
                                          if (!prev) return prev;
                                          return {
                                            ...prev,
                                            steps: prev.steps.map((s) =>
                                              s.id !== step.id
                                                ? s
                                                : {
                                                    ...s,
                                                    fields: s.fields.map((f) =>
                                                      f.key === field.key
                                                        ? { ...f, placeholder }
                                                        : f
                                                    ),
                                                  }
                                            ),
                                          };
                                        });
                                      }}
                                      className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                                    />
                                  </label>
                                )}
                                <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={!!field.required}
                                    onChange={(e) => {
                                      const required = e.target.checked;
                                      setDraft((prev) => {
                                        if (!prev) return prev;
                                        return {
                                          ...prev,
                                          steps: prev.steps.map((s) =>
                                            s.id !== step.id
                                              ? s
                                              : {
                                                  ...s,
                                                  fields: s.fields.map((f) =>
                                                    f.key === field.key
                                                      ? { ...f, required }
                                                      : f
                                                  ),
                                                }
                                          ),
                                        };
                                      });
                                    }}
                                  />
                                  Required
                                </label>
                                {field.type === 'disciplines_needed' && (
                                  <DisciplineOptionPicker
                                    disciplines={disciplines}
                                    selectedIds={field.disciplineOptionIds ?? []}
                                    onChange={(ids) => {
                                      setDraft((prev) => {
                                        if (!prev) return prev;
                                        return {
                                          ...prev,
                                          steps: prev.steps.map((s) =>
                                            s.id !== step.id
                                              ? s
                                              : {
                                                  ...s,
                                                  fields: s.fields.map((f) =>
                                                    f.key === field.key
                                                      ? {
                                                          ...f,
                                                          disciplineOptionIds: ids,
                                                          disciplineOptions: ids.map(
                                                            (id) => ({
                                                              id,
                                                              label:
                                                                disciplines.find(
                                                                  (d) => d.id === id
                                                                )?.name ?? id,
                                                            })
                                                          ),
                                                        }
                                                      : f
                                                  ),
                                                }
                                          ),
                                        };
                                      });
                                    }}
                                  />
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </AdminPanel>
        </div>

        {showPreview && (
          <AdminPanel title="Preview">
            <IntakeFormPreview form={draft} />
          </AdminPanel>
        )}
      </div>
    </div>
  );
}

export default IntakeConfigPage;
