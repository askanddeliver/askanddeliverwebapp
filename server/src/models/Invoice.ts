import mongoose, { Document, Schema } from 'mongoose';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID';

export interface IInvoiceCompanyInfo {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface IInvoiceClientInfo {
  name: string;
  company?: string;
  email?: string;
  businessEntity?: string;
  address?: string;
  paymentPreference?: string;
}

export interface IInvoiceItem {
  taskTypeName: string;
  taskTypeColor: string;
  baseRate: number;
  discount: number;
  effectiveRate: number;
  hours: number;
  amount: number;
  earnedAmount: number;
  descriptions: string[];
  isFixedCost: boolean;
}

export interface IInvoice extends Document {
  userId: string;
  invoiceNumber: string;
  clientId: mongoose.Types.ObjectId;
  projectIds: mongoose.Types.ObjectId[];
  status: InvoiceStatus;
  dateRange: { start: Date; end: Date };
  companyInfo: IInvoiceCompanyInfo;
  clientInfo: IInvoiceClientInfo;
  items: IInvoiceItem[];
  subtotal: number;
  total: number;
  totalHours: number;
  totalEarned: number;
  totalMargin: number;
  timeEntryIds: mongoose.Types.ObjectId[];
  lineItemIds: mongoose.Types.ObjectId[];
  sentAt?: Date;
  paidAt?: Date;
  /** Stripe Payment Link URL (shareable checkout) */
  paymentLinkUrl?: string;
  /** Stripe Payment Link id (plink_…) for webhook lookup */
  stripePaymentLinkId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    taskTypeName: { type: String, required: true },
    taskTypeColor: { type: String, default: '#6B7280' },
    baseRate: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    effectiveRate: { type: Number, default: 0 },
    hours: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    earnedAmount: { type: Number, default: 0 },
    descriptions: [{ type: String }],
    isFixedCost: { type: Boolean, default: false },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
    },
    projectIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'PAID'],
      default: 'DRAFT',
    },
    dateRange: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    companyInfo: {
      name: String,
      address: String,
      phone: String,
      email: String,
    },
    clientInfo: {
      name: { type: String, required: true },
      company: String,
      email: String,
      businessEntity: String,
      address: String,
      paymentPreference: String,
    },
    items: [InvoiceItemSchema],
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    totalHours: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalMargin: { type: Number, default: 0 },
    timeEntryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'TimeEntry',
      },
    ],
    lineItemIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'LineItem',
      },
    ],
    sentAt: { type: Date },
    paidAt: { type: Date },
    paymentLinkUrl: { type: String, trim: true },
    stripePaymentLinkId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

InvoiceSchema.index({ userId: 1, status: 1 });
InvoiceSchema.index({ userId: 1, createdAt: -1 });
InvoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
