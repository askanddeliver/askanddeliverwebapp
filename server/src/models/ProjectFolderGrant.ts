import mongoose, { Document, Schema } from 'mongoose';

export type ProjectFolderGrantSubject = 'admin' | 'member' | 'client';
export type ProjectFolderGrantStatus = 'granted' | 'pending' | 'failed';

export interface IProjectFolderGrant extends Document {
  userId: string;
  projectId: mongoose.Types.ObjectId;
  email: string;
  subject: ProjectFolderGrantSubject;
  auth0Id?: string;
  clientId?: mongoose.Types.ObjectId;
  role: 'writer';
  googlePermissionId?: string;
  status: ProjectFolderGrantStatus;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectFolderGrantSchema = new Schema<IProjectFolderGrant>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      enum: ['admin', 'member', 'client'],
      required: true,
    },
    auth0Id: {
      type: String,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
    },
    role: {
      type: String,
      enum: ['writer'],
      default: 'writer',
      required: true,
    },
    googlePermissionId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['granted', 'pending', 'failed'],
      required: true,
      default: 'pending',
    },
    error: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

ProjectFolderGrantSchema.index({ projectId: 1, email: 1 }, { unique: true });

export const ProjectFolderGrant = mongoose.model<IProjectFolderGrant>(
  'ProjectFolderGrant',
  ProjectFolderGrantSchema
);
