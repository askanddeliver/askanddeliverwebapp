/**
 * Backfill Lead.userId for legacy leads (single-tenant migration).
 *
 * Usage (from server/):
 *   DEFAULT_PUBLIC_WORKSPACE_OWNER_ID=auth0|xxx npx ts-node scripts/backfill-lead-userid.ts
 *
 * Or set DEFAULT_PUBLIC_WORKSPACE_OWNER_ID in .env before running.
 */
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { Lead } from '../src/models/Lead';
import { User } from '../src/models/User';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function resolveOwnerId(): Promise<string> {
  const fromEnv = process.env.DEFAULT_PUBLIC_WORKSPACE_OWNER_ID?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const primaryEmail = process.env.PRIMARY_ADMIN_EMAIL?.trim().toLowerCase();
  if (primaryEmail) {
    const user = await User.findOne({ email: primaryEmail }).lean();
    if (user?.auth0Id) {
      console.log(`Using PRIMARY_ADMIN_EMAIL admin: ${primaryEmail}`);
      return user.auth0Id;
    }
  }

  const admin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }).lean();
  if (admin?.auth0Id) {
    console.log(`Using first admin user: ${admin.email}`);
    return admin.auth0Id;
  }

  throw new Error(
    'Set DEFAULT_PUBLIC_WORKSPACE_OWNER_ID or PRIMARY_ADMIN_EMAIL, or ensure an admin user exists.'
  );
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(uri);
  const ownerId = await resolveOwnerId();

  const filter = {
    $or: [{ userId: { $exists: false } }, { userId: null }, { userId: '' }],
  };

  const count = await Lead.countDocuments(filter);
  console.log(`Backfilling ${count} lead(s) with userId=${ownerId}`);

  if (count === 0) {
    console.log('Nothing to backfill.');
    await mongoose.disconnect();
    return;
  }

  const result = await Lead.updateMany(filter, {
    $set: { userId: ownerId },
  });

  console.log(`Updated ${result.modifiedCount} lead(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
