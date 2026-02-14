import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  userId: string;
  clientId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  budget?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
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
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'COMPLETED'],
      default: 'ACTIVE',
    },
    budget: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ userId: 1, status: 1 });
ProjectSchema.index({ clientId: 1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
