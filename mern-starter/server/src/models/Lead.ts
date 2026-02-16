import mongoose, { Document, Schema } from 'mongoose';

export interface ILeadNote {
  text: string;
  createdAt: Date;
  createdBy: string;
}

export interface ILead extends Document {
  // Intake form data
  confidence: 'YES' | 'MAYBE' | 'UNSURE';
  projectType: string;
  description: string;
  budget: string;
  timeline: string;
  name: string;
  email: string;
  company: string;
  message: string;

  // Pipeline management
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  notes: ILeadNote[];

  // Conversion tracking
  convertedClientId?: mongoose.Types.ObjectId;
  convertedProjectId?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const LeadNoteSchema = new Schema<ILeadNote>(
  {
    text: {
      type: String,
      required: [true, 'Note text is required'],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  { _id: true }
);

const LeadSchema = new Schema<ILead>(
  {
    // Intake form data
    confidence: {
      type: String,
      enum: ['YES', 'MAYBE', 'UNSURE'],
      required: [true, 'Confidence level is required'],
    },
    projectType: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    budget: {
      type: String,
      trim: true,
      default: '',
    },
    timeline: {
      type: String,
      trim: true,
      default: '',
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },

    // Pipeline management
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'],
      default: 'NEW',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    notes: {
      type: [LeadNoteSchema],
      default: [],
    },

    // Conversion tracking
    convertedClientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
    },
    convertedProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
LeadSchema.index({ status: 1, createdAt: -1 });
LeadSchema.index({ email: 1 });
LeadSchema.index({ createdAt: -1 });

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
