/**
 * Seed SiteConfig.disciplines from workspace Task Types (A&D tenant #1 layout).
 *
 * Usage (from server/):
 *   npm run seed:disciplines
 */
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { SiteConfig } from '../src/models/SiteConfig';
import { TaskType } from '../src/models/TaskType';
import { User } from '../src/models/User';
import type { IDisciplineDefinition } from '../src/models/SiteConfig';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function resolveOwnerId(): Promise<string> {
  const fromEnv = process.env.DEFAULT_PUBLIC_WORKSPACE_OWNER_ID?.trim();
  if (fromEnv) return fromEnv;

  const primaryEmail = process.env.PRIMARY_ADMIN_EMAIL?.trim().toLowerCase();
  if (primaryEmail) {
    const user = await User.findOne({ email: primaryEmail }).lean();
    if (user?.auth0Id) return user.auth0Id;
  }

  const admin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }).lean();
  if (admin?.auth0Id) return admin.auth0Id;

  throw new Error(
    'Set DEFAULT_PUBLIC_WORKSPACE_OWNER_ID or PRIMARY_ADMIN_EMAIL, or ensure an admin user exists.'
  );
}

function taskIdByName(
  taskTypes: { _id: mongoose.Types.ObjectId; name: string }[],
  name: string
): string {
  const match = taskTypes.find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  );
  if (!match) {
    throw new Error(`TaskType not found: "${name}"`);
  }
  return String(match._id);
}

function buildDisciplines(
  taskTypes: { _id: mongoose.Types.ObjectId; name: string }[]
): IDisciplineDefinition[] {
  const tid = (name: string) => taskIdByName(taskTypes, name);

  return [
    {
      id: 'design',
      name: 'Design',
      assignableToMember: true,
      showOnProject: true,
      sortOrder: 0,
      tasks: [
        {
          id: 'design',
          name: 'Design',
          taskTypeId: tid('Design'),
          assignableToMember: true,
          sortOrder: 0,
        },
        {
          id: 'fixed-rate-design',
          name: 'Fixed Rate Design',
          taskTypeId: tid('Fixed Rate Design'),
          assignableToMember: false,
          sortOrder: 1,
        },
      ],
    },
    {
      id: 'development',
      name: 'Development',
      assignableToMember: true,
      showOnProject: true,
      sortOrder: 1,
      tasks: [
        {
          id: 'development',
          name: 'Development',
          taskTypeId: tid('Development'),
          assignableToMember: true,
          sortOrder: 0,
        },
        {
          id: 'testing',
          name: 'Testing',
          taskTypeId: tid('Testing'),
          assignableToMember: true,
          sortOrder: 1,
        },
      ],
    },
    {
      id: 'support',
      name: 'Support',
      description:
        'Onboarding, field work, experiential asset installation, servicing, ongoing client support',
      assignableToMember: true,
      showOnProject: true,
      sortOrder: 2,
      tasks: [
        {
          id: 'support',
          name: 'Support',
          taskTypeId: tid('Support'),
          assignableToMember: true,
          sortOrder: 0,
        },
      ],
    },
    {
      id: 'strategy',
      name: 'Strategy',
      assignableToMember: true,
      showOnProject: true,
      sortOrder: 3,
      tasks: [
        {
          id: 'strategy',
          name: 'Strategy',
          taskTypeId: tid('Strategy'),
          assignableToMember: true,
          sortOrder: 0,
        },
      ],
    },
    {
      id: 'research',
      name: 'Research',
      assignableToMember: true,
      showOnProject: true,
      sortOrder: 4,
      tasks: [
        {
          id: 'research',
          name: 'Research',
          taskTypeId: tid('Research'),
          assignableToMember: true,
          sortOrder: 0,
        },
      ],
    },
    {
      id: 'admin',
      name: 'Admin',
      assignableToMember: true,
      showOnProject: true,
      sortOrder: 5,
      tasks: [
        {
          id: 'admin',
          name: 'Admin',
          taskTypeId: tid('Admin'),
          assignableToMember: true,
          sortOrder: 0,
        },
      ],
    },
    {
      id: 'meeting',
      name: 'Meeting',
      assignableToMember: true,
      showOnProject: true,
      sortOrder: 6,
      tasks: [
        {
          id: 'meeting',
          name: 'Meeting',
          taskTypeId: tid('Meeting'),
          assignableToMember: false,
          sortOrder: 0,
        },
      ],
    },
  ];
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(uri);
  const ownerId = await resolveOwnerId();

  const taskTypes = await TaskType.find({ userId: ownerId })
    .select('_id name')
    .lean();

  if (taskTypes.length === 0) {
    throw new Error('No Task Types found for workspace — create Task Types first.');
  }

  const disciplines = buildDisciplines(taskTypes);

  const config = await SiteConfig.findOneAndUpdate(
    { userId: ownerId },
    { $set: { disciplines } },
    { new: true, upsert: true }
  );

  console.log(
    `Seeded ${config.disciplines.length} discipline(s) for workspace ${ownerId}`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
