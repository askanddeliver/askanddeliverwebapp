import {
  Target,
  Compass,
  HelpCircle,
  CheckCircle,
  Upload,
  X,
  FileText,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { IntakeField } from '../../types';
import {
  resolveFieldLabel,
  resolveFieldPlaceholder,
} from '../../lib/intakeUtils';
import { useIntakeForm } from '../../contexts/IntakeFormContext';

const CONFIDENCE_ICONS: Record<string, LucideIcon> = {
  YES: Target,
  MAYBE: Compass,
  UNSURE: HelpCircle,
};

interface IntakeFieldRendererProps {
  field: IntakeField;
  value: unknown;
  responses: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function IntakeFieldRenderer({
  field,
  value,
  responses,
  onChange,
}: IntakeFieldRendererProps) {
  const label = resolveFieldLabel(field, responses);
  const placeholder = resolveFieldPlaceholder(field, responses);

  if (field.type === 'single_select' && field.uiVariant === 'cards') {
    return (
      <div>
        {field.label && field.key !== 'confidence' && (
          <label className="mb-3 block text-sm font-medium text-brand-charcoal">
            {label}
            {field.required && <span className="text-red-400"> *</span>}
          </label>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(field.options ?? []).map((option) => {
            const Icon = CONFIDENCE_ICONS[option.value] ?? Target;
            const selected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(field.key, option.value)}
                className={`relative rounded-xl border-2 p-6 text-left transition-all duration-200 hover:border-brand-sage hover:bg-brand-sage/5 ${
                  selected
                    ? 'border-brand-sage bg-brand-sage/10'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <Icon className="mb-4 h-7 w-7 text-brand-sage" />
                <span className="mb-1 block text-base font-medium text-brand-charcoal">
                  {option.label}
                </span>
                {option.description && (
                  <span className="block text-sm text-neutral-500">
                    {option.description}
                  </span>
                )}
                {selected && (
                  <motion.div
                    layoutId={`active-${field.key}`}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-sage"
                  >
                    <CheckCircle className="h-4 w-4 text-white" />
                  </motion.div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === 'single_select' && field.uiVariant === 'pills') {
    return (
      <div>
        <label className="mb-3 block text-sm font-medium text-brand-charcoal">
          {label}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {(field.options ?? []).map((option) => {
            const selected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(field.key, option.value)}
                className={`rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                  selected
                    ? 'bg-brand-sage text-white'
                    : 'border border-neutral-200 bg-white text-neutral-600 hover:border-brand-sage hover:text-brand-sage'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === 'single_select') {
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-brand-charcoal">
          {label}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="input-brand"
        >
          <option value="">Select an option...</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'disciplines_needed') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const options =
      field.disciplineOptions ??
      (field.disciplineOptionIds ?? []).map((id) => ({ id, label: id }));

    const toggle = (id: string) => {
      const next = selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id];
      onChange(field.key, next);
    };

    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-charcoal">
          {label}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        {field.helpText && (
          <p className="mb-3 text-sm text-neutral-500">{field.helpText}</p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const isSelected = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggle(option.id)}
                className={`rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'border-brand-sage bg-brand-sage/10 text-brand-charcoal'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-sage'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === 'multi_select') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (optionValue: string) => {
      const next = selected.includes(optionValue)
        ? selected.filter((x) => x !== optionValue)
        : [...selected, optionValue];
      onChange(field.key, next);
    };

    return (
      <div>
        <label className="mb-3 block text-sm font-medium text-brand-charcoal">
          {label}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(field.options ?? []).map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                className={`rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'border-brand-sage bg-brand-sage/10 text-brand-charcoal'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-sage'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === 'file') {
    return <IntakeFileField field={field} label={label} />;
  }

  if (field.type === 'phone') {
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-brand-charcoal">
          {label}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        <input
          type="tel"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={placeholder || '(555) 555-5555'}
          className="input-brand"
          required={field.required}
        />
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-brand-charcoal">
          {label}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        <input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="input-brand"
          required={field.required}
        />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-brand-charcoal">
          {label}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          rows={5}
          placeholder={placeholder}
          className="input-brand resize-none"
        />
      </div>
    );
  }

  if (field.type === 'email') {
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-brand-charcoal">
          {label}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        <input
          type="email"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={placeholder}
          className="input-brand"
          required={field.required}
        />
      </div>
    );
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-brand-charcoal">
        {label}
        {field.required && <span className="text-red-400"> *</span>}
      </label>
      <input
        type="text"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={placeholder}
        className="input-brand"
        required={field.required}
      />
    </div>
  );
}

const DEFAULT_ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.zip';
const DEFAULT_MAX_FILES = 5;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function parseAccept(accept?: string): string[] {
  if (!accept) return DEFAULT_ACCEPT.split(',');
  return accept.split(',').map((s) => s.trim().toLowerCase());
}

function fileMatchesAccept(file: File, acceptList: string[]): boolean {
  const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  const mime = file.type.toLowerCase();
  return acceptList.some((a) => {
    if (a.startsWith('.')) return ext === a;
    return mime === a || mime.startsWith(a.replace('*', ''));
  });
}

function IntakeFileField({
  field,
  label,
}: {
  field: IntakeField;
  label: string;
}) {
  const { pendingFiles, setFieldFiles } = useIntakeForm();
  const files = pendingFiles[field.key] ?? [];
  const maxFiles = field.maxFiles ?? DEFAULT_MAX_FILES;
  const acceptList = parseAccept(field.accept);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (next.length >= maxFiles) break;
      if (file.size > MAX_FILE_BYTES) continue;
      if (!fileMatchesAccept(file, acceptList)) continue;
      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
      next.push(file);
    }
    setFieldFiles(field.key, next);
  };

  const removeFile = (index: number) => {
    setFieldFiles(
      field.key,
      files.filter((_, i) => i !== index)
    );
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-brand-charcoal">
        {label}
        {field.required && <span className="text-red-400"> *</span>}
      </label>
      {field.helpText && (
        <p className="mb-3 text-sm text-neutral-500">{field.helpText}</p>
      )}
      <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-8 text-center transition-colors hover:border-brand-sage hover:bg-brand-sage/5">
        <Upload className="mb-3 h-8 w-8 text-neutral-400" />
        <span className="text-sm font-medium text-brand-charcoal">
          Drop files here or click to browse
        </span>
        <span className="mt-1 text-xs text-neutral-500">
          Up to {maxFiles} files, 25MB each · PDF, Word, images, ZIP
        </span>
        <input
          type="file"
          multiple
          className="hidden"
          accept={field.accept ?? DEFAULT_ACCEPT}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-brand-sage" />
                <span className="truncate text-sm text-gray-800">{file.name}</span>
                <span className="text-xs text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
