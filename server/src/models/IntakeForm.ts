import mongoose, { Document, Schema } from 'mongoose';

export type IntakeFieldType =
  | 'text'
  | 'email'
  | 'textarea'
  | 'phone'
  | 'date'
  | 'single_select'
  | 'multi_select'
  | 'disciplines_needed'
  | 'file';

export type IntakeFormStatus = 'DRAFT' | 'PUBLISHED';

export interface IntakeFieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface IntakeDisciplineOption {
  id: string;
  label: string;
}

export interface IntakeFieldShowWhen {
  fieldKey: string;
  equals: string | string[];
}

export interface IIntakeField {
  key: string;
  type: IntakeFieldType;
  label: string;
  helpText?: string;
  required?: boolean;
  placeholder?: string;
  options?: IntakeFieldOption[];
  disciplineOptionIds?: string[];
  disciplineOptions?: IntakeDisciplineOption[];
  mapsTo?: string;
  showWhen?: IntakeFieldShowWhen;
  labelVariants?: Record<string, string>;
  placeholderVariants?: Record<string, string>;
  uiVariant?: 'cards' | 'pills' | 'default';
  accept?: string;
  maxFiles?: number;
}

export interface IntakeStepCopyVariant {
  title?: string;
  description?: string;
}

export interface IIntakeStep {
  id: string;
  title: string;
  description?: string;
  copyVariants?: Record<string, IntakeStepCopyVariant>;
  fields: IIntakeField[];
}

export interface IIntakeForm extends Document {
  userId: string;
  slug: string;
  status: IntakeFormStatus;
  version: number;
  publishedAt?: Date;
  title: string;
  subtitle?: string;
  successMessage?: string;
  successCtaLabel?: string;
  successCtaUrl?: string;
  submitButtonLabel?: string;
  steps: IIntakeStep[];
  createdAt: Date;
  updatedAt: Date;
}

const IntakeFieldSchema = new Schema<IIntakeField>(
  {
    key: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        'text',
        'email',
        'textarea',
        'phone',
        'date',
        'single_select',
        'multi_select',
        'disciplines_needed',
        'file',
      ],
    },
    label: { type: String, required: true, trim: true },
    helpText: { type: String, trim: true },
    required: { type: Boolean, default: false },
    placeholder: { type: String, trim: true },
    options: [
      {
        value: { type: String, required: true },
        label: { type: String, required: true },
        description: { type: String },
        _id: false,
      },
    ],
    disciplineOptionIds: [{ type: String }],
    disciplineOptions: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        _id: false,
      },
    ],
    mapsTo: { type: String, trim: true },
    showWhen: {
      fieldKey: { type: String },
      equals: { type: Schema.Types.Mixed },
      _id: false,
    },
    labelVariants: { type: Map, of: String },
    placeholderVariants: { type: Map, of: String },
    uiVariant: { type: String, enum: ['cards', 'pills', 'default'] },
    accept: { type: String, trim: true },
    maxFiles: { type: Number, min: 1 },
  },
  { _id: false }
);

const IntakeStepSchema = new Schema<IIntakeStep>(
  {
    id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    copyVariants: { type: Map, of: Schema.Types.Mixed },
    fields: { type: [IntakeFieldSchema], default: [] },
  },
  { _id: false }
);

const IntakeFormSchema = new Schema<IIntakeForm>(
  {
    userId: {
      type: String,
      required: [true, 'Workspace userId is required'],
      index: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      default: 'default',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED'],
      default: 'DRAFT',
    },
    version: {
      type: Number,
      default: 0,
      min: 0,
    },
    publishedAt: { type: Date },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    successMessage: { type: String, trim: true },
    successCtaLabel: { type: String, trim: true },
    successCtaUrl: { type: String, trim: true },
    submitButtonLabel: { type: String, trim: true },
    steps: { type: [IntakeStepSchema], default: [] },
  },
  { timestamps: true }
);

IntakeFormSchema.index({ userId: 1, slug: 1 }, { unique: true });

export const IntakeForm = mongoose.model<IIntakeForm>(
  'IntakeForm',
  IntakeFormSchema
);
