import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskType extends Document {
  userId: string;
  name: string;
  rate: number;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskTypeSchema = new Schema<ITaskType>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Task type name is required'],
      trim: true,
    },
    rate: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      min: [0, 'Rate cannot be negative'],
    },
    color: {
      type: String,
      default: '#3B82F6',
    },
  },
  {
    timestamps: true,
  }
);

TaskTypeSchema.index({ userId: 1 });

export const TaskType = mongoose.model<ITaskType>('TaskType', TaskTypeSchema);
