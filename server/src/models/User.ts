import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'admin' | 'member' | 'client' | 'pending';
export type UserStatus = 'active' | 'pending' | 'disabled';
export type AvailabilityDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface IUserAvailability {
  hoursPerWeek?: number;
  preferredDays?: AvailabilityDay[];
  timezone?: string;
  notes?: string;
  outOfOffice?: {
    start: Date;
    end: Date;
    message?: string;
  };
}

export interface IUser extends Document {
  auth0Id: string;
  email: string;
  name: string;
  nickname?: string;
  picture?: string;
  role: UserRole;
  workspaceOwnerId?: string;
  /** CRM Client record — required when role === 'client' */
  clientId?: mongoose.Types.ObjectId;
  /** Discipline ids from SiteConfig taxonomy */
  disciplines?: string[];
  /** Composite keys disciplineId:taskId for granular skills */
  disciplineTasks?: string[];
  availability?: IUserAvailability;
  bio?: string;
  earnedRates?: Record<string, number>;
  status: UserStatus;
  invitedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    auth0Id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nickname: {
      type: String,
      trim: true,
      lowercase: true,
    },
    picture: {
      type: String,
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'client', 'pending'],
      default: 'pending',
    },
    workspaceOwnerId: {
      type: String,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
      sparse: true,
    },
    disciplines: {
      type: [String],
      default: undefined,
    },
    disciplineTasks: {
      type: [String],
      default: undefined,
    },
    availability: {
      hoursPerWeek: { type: Number },
      preferredDays: {
        type: [String],
        enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      },
      timezone: { type: String },
      notes: { type: String },
      outOfOffice: {
        start: { type: Date },
        end: { type: Date },
        message: { type: String },
      },
    },
    bio: {
      type: String,
      trim: true,
    },
    earnedRates: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'disabled'],
      default: 'active',
    },
    invitedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
