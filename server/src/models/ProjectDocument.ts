import mongoose, { Document, Schema } from 'mongoose';

/** Google-native file types. v1 creates documents only. */
export type ProjectDocumentMimeType = 'application/vnd.google-apps.document';

export const PROJECT_DOCUMENT_MIME: ProjectDocumentMimeType =
  'application/vnd.google-apps.document';

export interface IProjectDocument extends Document {
  userId: string;
  projectId: mongoose.Types.ObjectId;
  googleFileId: string;
  title: string;
  mimeType: ProjectDocumentMimeType;
  createdByAuth0Id: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectDocumentSchema = new Schema<IProjectDocument>(
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
    googleFileId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: [PROJECT_DOCUMENT_MIME],
      default: PROJECT_DOCUMENT_MIME,
    },
    createdByAuth0Id: {
      type: String,
      required: true,
    },
    createdByName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

ProjectDocumentSchema.index({ userId: 1, projectId: 1, createdAt: -1 });
ProjectDocumentSchema.index({ userId: 1, googleFileId: 1 }, { unique: true });

export const ProjectDocument = mongoose.model<IProjectDocument>(
  'ProjectDocument',
  ProjectDocumentSchema
);
