import mongoose, { Document, Schema } from 'mongoose';

export type PaymentPreference = 'MAILED' | 'ACH';

export interface IClient extends Document {
  userId: string;
  name: string;
  company?: string;
  email?: string;
  /** Official business entity (e.g., "Acme Corp LLC") for invoices */
  businessEntity?: string;
  /** Full address for invoices */
  address?: string;
  /** Payment preference for invoices: mailed check or ACH transfer */
  paymentPreference?: PaymentPreference;
  /** Workspace owner / self-work client — excluded from default client todo and invoice candidates */
  isInternal?: boolean;
  /** Optional calendar color (hex). When unset, UI may hash from client id. */
  calendarColor?: string;
  /** When true, this client’s card floats above A–Z on the Projects list. */
  pinned?: boolean;
  taskDiscounts: Map<string, number>;
  /** Shared Drive folder that holds this client's project folders. */
  googleFolderId?: string;
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
    businessEntity: { type: String, trim: true },
    address: { type: String, trim: true },
    paymentPreference: { type: String, enum: ['MAILED', 'ACH'], default: 'MAILED' },
    isInternal: { type: Boolean, default: false, index: true },
    calendarColor: { type: String, trim: true },
    pinned: { type: Boolean, default: false },
    taskDiscounts: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    googleFolderId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by user
ClientSchema.index({ userId: 1, createdAt: -1 });
ClientSchema.index({ userId: 1, isInternal: 1 });
ClientSchema.index({ userId: 1, pinned: 1 });

export const Client = mongoose.model<IClient>('Client', ClientSchema);
