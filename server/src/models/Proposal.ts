import mongoose, { Document, Schema } from 'mongoose';

export type ProposalStatus = 'DRAFT' | 'FINALIZED';

export interface IProposalCompanyInfo {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface IProposalClientInfo {
  name: string;
  company?: string;
  email?: string;
  businessEntity?: string;
  address?: string;
}

export interface IProposalAccentSnapshot {
  brandSage: string;
  brandSageLight: string;
  brandSageDark: string;
  brandCharcoal: string;
  brandCream: string;
  brandCreamDark: string;
  accentWarm: string;
  accentCool: string;
}

export interface IProposalPhase {
  name: string;
  summary?: string;
  bullets: string[];
  estimatedHours?: number;
  estimatedCost?: number;
  /** Human-readable timeline (e.g. "2–3 weeks") */
  duration?: string;
  startDate?: string;
  endDate?: string;
}

export interface IProposalInvestmentLine {
  label: string;
  amount: number;
  hours?: number;
  duration?: string;
}

export interface IProposalInvestment {
  lineItems: IProposalInvestmentLine[];
  fees: number;
  notes?: string;
  subtotal: number;
  total: number;
}

export interface IProposal extends Document {
  userId: string;
  proposalNumber: string;
  title: string;
  clientId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  /** Snapshot of project title when linked */
  projectTitle?: string;
  status: ProposalStatus;
  finalizedAt?: Date;
  proposalDate: Date;
  accentSnapshot: IProposalAccentSnapshot;
  companyInfo: IProposalCompanyInfo;
  clientInfo: IProposalClientInfo;
  introduction: string;
  challenge: string;
  solution: string;
  /** Assumptions, exclusions, open questions (markdown) */
  assumptions: string;
  phases: IProposalPhase[];
  investment: IProposalInvestment;
  /** When true, investment line items are derived from phases on save */
  investmentSyncPhases: boolean;
  terms: string;
  sourceMarkdown?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccentSnapshotSchema = new Schema<IProposalAccentSnapshot>(
  {
    brandSage: { type: String, default: '#5B7765' },
    brandSageLight: { type: String, default: '#7A9A87' },
    brandSageDark: { type: String, default: '#3D5446' },
    brandCharcoal: { type: String, default: '#2A2A2A' },
    brandCream: { type: String, default: '#F7F5F2' },
    brandCreamDark: { type: String, default: '#EDE9E3' },
    accentWarm: { type: String, default: '#E8A87C' },
    accentCool: { type: String, default: '#6B9BAE' },
  },
  { _id: false }
);

const ProposalPhaseSchema = new Schema<IProposalPhase>(
  {
    name: { type: String, required: true, trim: true },
    summary: { type: String, default: '' },
    bullets: [{ type: String }],
    estimatedHours: { type: Number },
    estimatedCost: { type: Number },
    duration: { type: String, trim: true },
    startDate: { type: String, trim: true },
    endDate: { type: String, trim: true },
  },
  { _id: false }
);

const InvestmentLineSchema = new Schema<IProposalInvestmentLine>(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, default: 0 },
    hours: { type: Number },
    duration: { type: String, trim: true },
  },
  { _id: false }
);

const InvestmentSchema = new Schema<IProposalInvestment>(
  {
    lineItems: [InvestmentLineSchema],
    fees: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const ProposalSchema = new Schema<IProposal>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    proposalNumber: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
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
    projectTitle: { type: String, trim: true },
    status: {
      type: String,
      enum: ['DRAFT', 'FINALIZED'],
      default: 'DRAFT',
    },
    finalizedAt: { type: Date },
    proposalDate: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    accentSnapshot: {
      type: AccentSnapshotSchema,
      required: true,
      default: () => ({}),
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
    },
    introduction: { type: String, default: '' },
    challenge: { type: String, default: '' },
    solution: { type: String, default: '' },
    assumptions: { type: String, default: '' },
    phases: { type: [ProposalPhaseSchema], default: [] },
    investmentSyncPhases: { type: Boolean, default: true },
    investment: {
      type: InvestmentSchema,
      required: true,
      default: () => ({
        lineItems: [],
        fees: 0,
        notes: '',
        subtotal: 0,
        total: 0,
      }),
    },
    terms: { type: String, default: '' },
    sourceMarkdown: { type: String },
  },
  {
    timestamps: true,
  }
);

ProposalSchema.index({ userId: 1, status: 1 });
ProposalSchema.index({ userId: 1, createdAt: -1 });
ProposalSchema.index({ userId: 1, proposalNumber: 1 }, { unique: true });

export const Proposal = mongoose.model<IProposal>('Proposal', ProposalSchema);
