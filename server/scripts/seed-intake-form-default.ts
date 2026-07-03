/**
 * Seed the default published intake form for the public workspace owner.
 *
 * Usage (from server/):
 *   npm run seed:intake-form
 */
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { IntakeForm } from '../src/models/IntakeForm';
import { User } from '../src/models/User';
import {
  buildDefaultIntakeFormPayload,
  DEFAULT_INTAKE_SLUG,
} from '../src/lib/defaultIntakeFormSeed';

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

  const existing = await IntakeForm.findOne({
    userId: ownerId,
    slug: DEFAULT_INTAKE_SLUG,
  });

  if (existing) {
    console.log(
      `Default intake form already exists (status=${existing.status}, version=${existing.version}). Skipping.`
    );
    await mongoose.disconnect();
    return;
  }

  const form = await IntakeForm.create(
    buildDefaultIntakeFormPayload(ownerId, 'PUBLISHED', 1)
  );

  console.log(
    `Created default intake form: ${form._id} (slug=${form.slug}, version=${form.version})`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
