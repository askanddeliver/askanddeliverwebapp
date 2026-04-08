import mongoose, { Document, Schema } from 'mongoose';

export type ProjectBillingMode = 'HOURLY' | 'FIXED_PRICE' | 'HOUR_RETAINER';

export interface IProject extends Document {
  userId: string;
  clientId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  /** Rich-text brief notes (HTML from WYSIWYG) — projects screen only */
  brief?: string;
  /** Portfolio-aligned fields for easier conversion */
  excerpt?: string;
  year?: number;
  categories: string[];
  disciplines: string[];
  challenge?: string;
  solution?: string;
  results: string[];
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  budget?: number;
  /** Defaults to HOURLY in schema; may be absent on legacy documents */
  billingMode?: ProjectBillingMode;
  /** Agreed fixed price (required when billingMode is FIXED_PRICE) */
  agreedAmount?: number;
  /** Total retainer hours (required when billingMode is HOUR_RETAINER) */
  retainerHoursTotal?: number;
  /** Manual adjustment to retainer pool (hours) */
  retainerHoursAdjustment?: number;
  /** Optional line label on fixed-price invoices */
  fixedPriceInvoiceLabel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    brief: {
      type: String,
      trim: true,
    },
    excerpt: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
      min: 1900,
      max: 2100,
    },
    categories: {
      type: [String],
      default: [],
    },
    disciplines: {
      type: [String],
      default: [],
    },
    challenge: {
      type: String,
      trim: true,
    },
    solution: {
      type: String,
      trim: true,
    },
    results: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'],
      default: 'ACTIVE',
    },
    budget: {
      type: Number,
      min: 0,
    },
    billingMode: {
      type: String,
      enum: ['HOURLY', 'FIXED_PRICE', 'HOUR_RETAINER'],
      default: 'HOURLY',
    },
    agreedAmount: {
      type: Number,
      min: 0,
    },
    retainerHoursTotal: {
      type: Number,
      min: 0,
    },
    retainerHoursAdjustment: {
      type: Number,
    },
    fixedPriceInvoiceLabel: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ userId: 1, status: 1 });
ProjectSchema.index({ userId: 1, clientId: 1, status: 1 });
ProjectSchema.index({ clientId: 1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
