import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'admin' | 'member' | 'client' | 'pending';
export type UserStatus = 'active' | 'pending' | 'disabled';
export type AvailabilityDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type PayoutMethod = 'PAYPAL' | 'ZELLE' | 'VENMO' | 'OTHER';

export interface IUserPayoutPreference {
  method: PayoutMethod;
  handle: string;
  notes?: string;
}

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

export interface IUserEmailNotificationPreferences {
  clientMessages?: boolean;
  projectAssignments?: boolean;
  clientVisibleReplies?: boolean;
  taskCompleted?: boolean;
  invoiceSent?: boolean;
  teamMessages?: boolean;
  digest?: 'none' | 'daily' | 'weekly';
}

export interface IUserNotificationPreferences {
  email?: IUserEmailNotificationPreferences;
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
  /** How this person wants to be paid (handle/email — not bank account numbers). */
  payoutPreference?: IUserPayoutPreference;
  earnedRates?: Record<string, number>;
  notificationPreferences?: IUserNotificationPreferences;
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
    payoutPreference: {
      method: {
        type: String,
        enum: ['PAYPAL', 'ZELLE', 'VENMO', 'OTHER'],
      },
      handle: { type: String, trim: true },
      notes: { type: String, trim: true },
    },
    earnedRates: {
      type: Schema.Types.Mixed,
      default: {},
    },
    notificationPreferences: {
      email: {
        clientMessages: { type: Boolean },
        projectAssignments: { type: Boolean },
        clientVisibleReplies: { type: Boolean },
        taskCompleted: { type: Boolean },
        invoiceSent: { type: Boolean },
        teamMessages: { type: Boolean },
        digest: { type: String, enum: ['none', 'daily', 'weekly'] },
      },
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
