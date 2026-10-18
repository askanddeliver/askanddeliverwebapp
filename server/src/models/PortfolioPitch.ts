import mongoose, { Document, Schema } from 'mongoose';

export interface IPortfolioPitch extends Document {
  userId: string;
  slug: string;
  title: string;
  summary: string;
  projectIds: mongoose.Types.ObjectId[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioPitchSchema = new Schema<IPortfolioPitch>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    slug: {
      type: String,
      required: [true, 'A URL path is required'],
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: [true, 'A title is required'],
      trim: true,
      maxlength: 160,
    },
    summary: {
      type: String,
      default: '',
      trim: true,
      maxlength: 4000,
    },
    projectIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'PortfolioProject' }],
      default: [],
    },
    published: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

PortfolioPitchSchema.index({ userId: 1, slug: 1 }, { unique: true });
PortfolioPitchSchema.index({ userId: 1, published: 1 });

export const PortfolioPitch = mongoose.model<IPortfolioPitch>(
  'PortfolioPitch',
  PortfolioPitchSchema
);
