import mongoose, { Document, Schema } from 'mongoose';

export interface ILineItem extends Document {
  userId: string;
  clientId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  description: string;
  amount: number;
  category?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema = new Schema<ILineItem>(
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
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    category: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
  },
  {
    timestamps: true,
  }
);

LineItemSchema.index({ userId: 1, date: -1 });
LineItemSchema.index({ userId: 1, clientId: 1 });

export const LineItem = mongoose.model<ILineItem>('LineItem', LineItemSchema);
