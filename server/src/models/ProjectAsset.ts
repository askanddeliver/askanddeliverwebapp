import mongoose, { Document, Schema } from 'mongoose';
import type { CloudinaryResourceType } from '../lib/cloudinaryUpload';

export type ProjectAssetAuthorRole = 'admin' | 'member' | 'client';

export interface IProjectAsset extends Document {
  userId: string;
  projectId: mongoose.Types.ObjectId;
  uploadedByAuth0Id: string;
  uploadedByName: string;
  uploadedByRole: ProjectAssetAuthorRole;
  originalName: string;
  mimeType: string;
  size: number;
  cloudinaryPublicId: string;
  resourceType: CloudinaryResourceType;
  url: string;
  clientVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectAssetSchema = new Schema<IProjectAsset>(
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
    uploadedByAuth0Id: {
      type: String,
      required: true,
    },
    uploadedByName: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedByRole: {
      type: String,
      enum: ['admin', 'member', 'client'],
      required: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      enum: ['image', 'raw', 'video'],
      required: true,
    },
    url: {
      type: String,
      required: true,
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

ProjectAssetSchema.index({ userId: 1, projectId: 1, createdAt: -1 });

export const ProjectAsset = mongoose.model<IProjectAsset>(
  'ProjectAsset',
  ProjectAssetSchema
);
