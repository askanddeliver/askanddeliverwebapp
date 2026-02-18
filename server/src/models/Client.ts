import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
  userId: string;
  name: string;
  company?: string;
  email?: string;
  taskDiscounts: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    taskDiscounts: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by user
ClientSchema.index({ userId: 1, createdAt: -1 });

export const Client = mongoose.model<IClient>('Client', ClientSchema);
