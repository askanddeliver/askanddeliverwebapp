import mongoose, { Document, Schema } from 'mongoose';

export type ProjectTaskSuggestionStatus = 'PENDING' | 'APPROVED' | 'DECLINED';

export interface IProjectTaskSuggestion extends Document {
  userId: string;
  projectId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  suggestedByAuth0Id: string;
  suggestedByName: string;
  title: string;
  description?: string;
  status: ProjectTaskSuggestionStatus;
  createdTaskId?: mongoose.Types.ObjectId;
  reviewedByAuth0Id?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTaskSuggestionSchema = new Schema<IProjectTaskSuggestion>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    suggestedByAuth0Id: {
      type: String,
      required: true,
    },
    suggestedByName: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'DECLINED'],
      default: 'PENDING',
    },
    createdTaskId: {
      type: Schema.Types.ObjectId,
      ref: 'ProjectTask',
    },
    reviewedByAuth0Id: {
      type: String,
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

ProjectTaskSuggestionSchema.index({ userId: 1, projectId: 1, status: 1 });
ProjectTaskSuggestionSchema.index({ userId: 1, clientId: 1 });

export const ProjectTaskSuggestion = mongoose.model<IProjectTaskSuggestion>(
  'ProjectTaskSuggestion',
  ProjectTaskSuggestionSchema
);
