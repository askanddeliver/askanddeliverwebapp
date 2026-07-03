import mongoose, { Document, Schema } from 'mongoose';

export type ProjectMessageAuthorRole = 'admin' | 'member' | 'client';

export interface IProjectMessage extends Document {
  userId: string;
  projectId: mongoose.Types.ObjectId;
  authorAuth0Id: string;
  authorName: string;
  authorRole: ProjectMessageAuthorRole;
  body: string;
  clientVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectMessageSchema = new Schema<IProjectMessage>(
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
    authorAuth0Id: {
      type: String,
      required: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    authorRole: {
      type: String,
      enum: ['admin', 'member', 'client'],
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    clientVisible: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ProjectMessageSchema.index({ userId: 1, projectId: 1, createdAt: -1 });

export const ProjectMessage = mongoose.model<IProjectMessage>(
  'ProjectMessage',
  ProjectMessageSchema
);
