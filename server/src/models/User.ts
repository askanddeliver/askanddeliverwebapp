import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'admin' | 'member' | 'pending';
export type UserStatus = 'active' | 'pending' | 'disabled';

export interface IUser extends Document {
  auth0Id: string;
  email: string;
  name: string;
  nickname?: string;
  picture?: string;
  role: UserRole;
  workspaceOwnerId?: string;
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
      enum: ['admin', 'member', 'pending'],
      default: 'pending',
    },
    workspaceOwnerId: {
      type: String,
      index: true,
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
