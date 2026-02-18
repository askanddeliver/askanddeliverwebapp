import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeEntry extends Document {
  userId: string;
  projectId: mongoose.Types.ObjectId;
  taskTypeId: mongoose.Types.ObjectId;
  projectTaskId?: mongoose.Types.ObjectId;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  isRunning: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TimeEntrySchema = new Schema<ITimeEntry>(
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
    taskTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'TaskType',
      required: [true, 'Task type is required'],
    },
    projectTaskId: {
      type: Schema.Types.ObjectId,
      ref: 'ProjectTask',
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
    isRunning: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

TimeEntrySchema.index({ userId: 1, startTime: -1 });
TimeEntrySchema.index({ projectId: 1 });
TimeEntrySchema.index({ userId: 1, isRunning: 1 });

export const TimeEntry = mongoose.model<ITimeEntry>('TimeEntry', TimeEntrySchema);
