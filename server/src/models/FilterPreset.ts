import mongoose, { Document, Schema } from 'mongoose';

export type FilterPresetKind = 'REPORT' | 'BACKUP';

export type FilterPresetDatePreset =
  | 'all_time'
  | 'this_month'
  | 'last_month'
  | 'this_week'
  | 'last_week'
  | 'last_7'
  | 'last_30';

export interface IFilterPreset extends Document {
  userId: string;
  name: string;
  kind: FilterPresetKind;
  clientIds: string[];
  projectIds: string[];
  billingModes: Array<'HOURLY' | 'FIXED_PRICE' | 'HOUR_RETAINER'>;
  memberAuth0Ids: string[];
  datePreset?: FilterPresetDatePreset | null;
  startDate: string;
  endDate: string;
  columnIds: string[];
  includeTimeEntries: boolean;
  includeEntryDescriptions: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FilterPresetSchema = new Schema<IFilterPreset>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    kind: {
      type: String,
      enum: ['REPORT', 'BACKUP'],
      default: 'REPORT',
      required: true,
    },
    clientIds: { type: [String], default: [] },
    projectIds: { type: [String], default: [] },
    billingModes: {
      type: [{ type: String, enum: ['HOURLY', 'FIXED_PRICE', 'HOUR_RETAINER'] }],
      default: [],
    },
    memberAuth0Ids: { type: [String], default: [] },
    datePreset: {
      type: String,
      enum: ['all_time', 'this_month', 'last_month', 'this_week', 'last_week', 'last_7', 'last_30', null],
      default: null,
    },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    columnIds: { type: [String], default: [] },
    includeTimeEntries: { type: Boolean, default: true },
    includeEntryDescriptions: { type: Boolean, default: false },
  },
  { timestamps: true }
);

FilterPresetSchema.index({ userId: 1, kind: 1, name: 1 }, { unique: true });
FilterPresetSchema.index({ userId: 1, kind: 1, updatedAt: -1 });

export const FilterPreset = mongoose.model<IFilterPreset>('FilterPreset', FilterPresetSchema);
