import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectTask extends Document {
  userId: string;
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  order: number;
  estimatedHours?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTaskSchema = new Schema<IProjectTask>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['TODO', 'IN_PROGRESS', 'COMPLETED'],
      default: 'TODO',
    },
    order: {
      type: Number,
      default: 0,
    },
    estimatedHours: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

ProjectTaskSchema.index({ userId: 1, projectId: 1 });
ProjectTaskSchema.index({ projectId: 1, order: 1 });

export const ProjectTask = mongoose.model<IProjectTask>('ProjectTask', ProjectTaskSchema);
