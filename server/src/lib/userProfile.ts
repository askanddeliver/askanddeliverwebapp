import { createError } from '../middleware/errorHandler';
import { SiteConfig } from '../models';
import type { IUserAvailability } from '../models/User';

const AVAILABILITY_DAYS = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

export async function validateMemberProfileFields(
  workspaceOwnerId: string,
  body: {
    disciplines?: unknown;
    disciplineTasks?: unknown;
    availability?: unknown;
    bio?: unknown;
  }
): Promise<{
  disciplines?: string[];
  disciplineTasks?: string[];
  availability?: IUserAvailability;
  bio?: string;
}> {
  const update: {
    disciplines?: string[];
    disciplineTasks?: string[];
    availability?: IUserAvailability;
    bio?: string;
  } = {};

  if (body.disciplines !== undefined) {
    if (!Array.isArray(body.disciplines)) {
      throw createError('disciplines must be an array', 400);
    }
    update.disciplines = body.disciplines.map(String);
  }

  if (body.disciplineTasks !== undefined) {
    if (!Array.isArray(body.disciplineTasks)) {
      throw createError('disciplineTasks must be an array', 400);
    }
    update.disciplineTasks = body.disciplineTasks.map(String);
  }

  if (body.bio !== undefined) {
    if (body.bio !== null && typeof body.bio !== 'string') {
      throw createError('bio must be a string', 400);
    }
    update.bio = body.bio ? String(body.bio).trim() : undefined;
  }

  if (body.availability !== undefined) {
    if (body.availability === null) {
      update.availability = undefined;
    } else if (typeof body.availability === 'object') {
      const raw = body.availability as Record<string, unknown>;
      const availability: IUserAvailability = {};
      if (raw.hoursPerWeek !== undefined && raw.hoursPerWeek !== null) {
        const n = Number(raw.hoursPerWeek);
        if (!Number.isFinite(n) || n < 0) {
          throw createError('availability.hoursPerWeek must be a non-negative number', 400);
        }
        availability.hoursPerWeek = n;
      }
      if (raw.preferredDays !== undefined) {
        if (!Array.isArray(raw.preferredDays)) {
          throw createError('availability.preferredDays must be an array', 400);
        }
        for (const day of raw.preferredDays) {
          if (!AVAILABILITY_DAYS.has(String(day))) {
            throw createError(`Invalid preferred day: ${day}`, 400);
          }
        }
        availability.preferredDays = raw.preferredDays.map(String) as IUserAvailability['preferredDays'];
      }
      if (raw.timezone !== undefined && raw.timezone !== null) {
        availability.timezone = String(raw.timezone).trim();
      }
      if (raw.notes !== undefined && raw.notes !== null) {
        availability.notes = String(raw.notes).trim();
      }
      update.availability = availability;
    } else {
      throw createError('availability must be an object', 400);
    }
  }

  if (
    update.disciplines !== undefined ||
    update.disciplineTasks !== undefined
  ) {
    const config = await SiteConfig.findOne({ userId: workspaceOwnerId })
      .select('disciplines')
      .lean();

    const validDisciplineIds = new Set<string>();
    const validTaskKeys = new Set<string>();

    for (const d of config?.disciplines || []) {
      if (!d.assignableToMember) continue;
      validDisciplineIds.add(d.id);
      for (const t of d.tasks || []) {
        if (t.assignableToMember) {
          validTaskKeys.add(`${d.id}:${t.id}`);
        }
      }
    }

    if (update.disciplines) {
      for (const id of update.disciplines) {
        if (!validDisciplineIds.has(id)) {
          throw createError(`Invalid discipline: ${id}`, 400);
        }
      }
    }

    if (update.disciplineTasks) {
      for (const key of update.disciplineTasks) {
        if (!validTaskKeys.has(key)) {
          throw createError(`Invalid discipline task: ${key}`, 400);
        }
      }
      if (update.disciplines) {
        for (const key of update.disciplineTasks) {
          const disciplineId = key.split(':')[0];
          if (!update.disciplines.includes(disciplineId)) {
            throw createError(
              `disciplineTasks includes ${key} but discipline ${disciplineId} is not selected`,
              400
            );
          }
        }
      }
    }
  }

  return update;
}
