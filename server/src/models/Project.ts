import mongoose, { Document, Schema } from 'mongoose';

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
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ userId: 1, status: 1 });
ProjectSchema.index({ userId: 1, clientId: 1, status: 1 });
ProjectSchema.index({ clientId: 1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
