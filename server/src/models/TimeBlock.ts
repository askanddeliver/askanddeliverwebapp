import mongoose, { Document, Schema } from 'mongoose';

export type TimeBlockKind = 'WORK' | 'PERSONAL' | 'DOWNTIME' | 'MEETING' | 'ADMIN';

export interface ITimeBlock extends Document {
  userId: string;
  startTime: Date;
  endTime: Date;
  title: string;
  projectId?: mongoose.Types.ObjectId;
  taskTypeId?: mongoose.Types.ObjectId;
  projectTaskId?: mongoose.Types.ObjectId;
  kind: TimeBlockKind;
  colorHint?: string;
  recurrenceRule?: string;
  recurrenceParentId?: mongoose.Types.ObjectId;
  exceptionDates?: Date[];
  launchedTimeEntryIds: mongoose.Types.ObjectId[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimeBlockSchema = new Schema<ITimeBlock>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    title: { type: String, required: true, trim: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    taskTypeId: { type: Schema.Types.ObjectId, ref: 'TaskType' },
    projectTaskId: { type: Schema.Types.ObjectId, ref: 'ProjectTask' },
    kind: {
      type: String,
      enum: ['WORK', 'PERSONAL', 'DOWNTIME', 'MEETING', 'ADMIN'],
      default: 'WORK',
    },
    colorHint: { type: String, trim: true },
    recurrenceRule: { type: String, trim: true },
    recurrenceParentId: { type: Schema.Types.ObjectId, ref: 'TimeBlock' },
    exceptionDates: [{ type: Date }],
    launchedTimeEntryIds: [{ type: Schema.Types.ObjectId, ref: 'TimeEntry' }],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

TimeBlockSchema.index({ userId: 1, startTime: 1 });
TimeBlockSchema.index({ userId: 1, projectId: 1 });
TimeBlockSchema.index({ recurrenceParentId: 1 });

export const TimeBlock = mongoose.model<ITimeBlock>('TimeBlock', TimeBlockSchema);
