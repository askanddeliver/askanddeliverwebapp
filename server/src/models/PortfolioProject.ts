import mongoose, { Document, Schema } from 'mongoose';

export type PortfolioMediaType = 'image' | 'video';
export type PortfolioMediaSource = 'cloudinary' | 'vimeo' | 'youtube';

export interface IPortfolioImage {
  url: string;
  caption?: string;
  /** 'image' by default for backward compatibility */
  type?: PortfolioMediaType;
  /** Required for videos: how the URL should be embedded */
  source?: PortfolioMediaSource;
}

export interface IPortfolioTestimonial {
  quote: string;
  author: string;
  role: string;
}

export interface IPortfolioProject extends Document {
  userId: string;
  slug: string;
  title: string;
  client: string;
  excerpt: string;
  description: string;
  categories: string[];
  disciplines: string[];
  year: number;
  featuredImage: string;
  images: IPortfolioImage[];
  challenge?: string;
  solution?: string;
  results?: string[];
  testimonial?: IPortfolioTestimonial;
  liveUrl?: string;
  featured: boolean;
  published: boolean;
  color: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioImageSchema = new Schema<IPortfolioImage>(
  {
    url: { type: String, required: true },
    caption: { type: String, trim: true },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    source: { type: String, enum: ['cloudinary', 'vimeo', 'youtube'] },
  },
  { _id: false }
);

const PortfolioTestimonialSchema = new Schema<IPortfolioTestimonial>(
  {
    quote: { type: String, required: true },
    author: { type: String, required: true },
    role: { type: String, required: true },
  },
  { _id: false }
);

const PortfolioProjectSchema = new Schema<IPortfolioProject>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    slug: {
      type: String,
      required: [true, 'Project slug is required'],
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
    },
    client: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    excerpt: {
      type: String,
      required: [true, 'Project excerpt is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
    },
    categories: {
      type: [String],
      default: [],
    },
    disciplines: {
      type: [String],
      default: [],
    },
    year: {
      type: Number,
      required: [true, 'Project year is required'],
    },
    featuredImage: {
      type: String,
      default: '',
    },
    images: {
      type: [PortfolioImageSchema],
      default: [],
    },
    challenge: {
      type: String,
      trim: true,
    },
    solution: {
      type: String,
      trim: true,
    },
    results: {
      type: [String],
      default: [],
    },
    testimonial: {
      type: PortfolioTestimonialSchema,
    },
    liveUrl: {
      type: String,
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    published: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: '#5B7765',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: each user has unique slugs
PortfolioProjectSchema.index({ userId: 1, slug: 1 }, { unique: true });
// Index for public queries (published projects sorted by order)
PortfolioProjectSchema.index({ userId: 1, published: 1, order: 1 });
// Index for featured public queries
PortfolioProjectSchema.index({ userId: 1, published: 1, featured: 1 });

export const PortfolioProject = mongoose.model<IPortfolioProject>(
  'PortfolioProject',
  PortfolioProjectSchema
);
