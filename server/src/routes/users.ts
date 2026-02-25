import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { User } from '../models';
import type { UserRole, UserStatus } from '../models/User';
import { getAuth0UsersByEmail } from '../lib/auth0Management';

const router = Router();

// All routes require authentication
router.use(checkJwt);

/**
 * Primary admin email (env) - always granted admin regardless of signup order.
 * Set PRIMARY_ADMIN_EMAIL=mattlinder@gmail.com to ensure the intended owner has admin.
 */
const PRIMARY_ADMIN_EMAIL = (process.env.PRIMARY_ADMIN_EMAIL || '')
  .trim()
  .toLowerCase();

/**
 * Assign role for new users or migrate existing users without role.
 * - PRIMARY_ADMIN_EMAIL matches → admin (override)
 * - First user in DB → admin
 * - Existing user without role → admin (migration)
 * - New user (others exist) → pending (admin assigns member in Phase 5)
 */
async function assignRoleForUser(
  auth0Id: string,
  existingUser?: { role?: string; workspaceOwnerId?: string; email?: string } | null,
  email?: string
): Promise<{ role: UserRole; workspaceOwnerId?: string }> {
  const userEmail = (email || existingUser?.email || '').toString().toLowerCase();

  // Primary admin override - always grant admin
  if (PRIMARY_ADMIN_EMAIL && userEmail === PRIMARY_ADMIN_EMAIL) {
    return { role: 'admin', workspaceOwnerId: auth0Id };
  }

  // Migration: existing user already has role → keep it (unless primary admin override above)
  if (existingUser?.role && existingUser.role !== 'pending') {
    return {
      role: existingUser.role as UserRole,
      workspaceOwnerId: existingUser.workspaceOwnerId,
    };
  }
  // Migration: existing user missing role (from before roles existed) → admin
  if (existingUser) {
    return { role: 'admin', workspaceOwnerId: auth0Id };
  }

  // New user
  const count = await User.countDocuments();
  if (count === 0) {
    return { role: 'admin', workspaceOwnerId: auth0Id };
  }
  return { role: 'pending', workspaceOwnerId: undefined };
}

// GET /api/users/me - Get current user profile (with role)
router.get(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    if (!auth0Id) throw createError('User ID not found in token', 401);

    const payload = req.auth?.payload as { email?: string; name?: string; picture?: string; nickname?: string } | undefined;
    const email = payload?.email || '';
    const name = payload?.name || 'User';
    const picture = payload?.picture;
    const nickname = payload?.nickname ? payload.nickname.trim().toLowerCase() : undefined;

    let user = await User.findOne({ auth0Id });

    // Create user if new signup (ensure role is set)
    if (!user) {
      const { role, workspaceOwnerId } = await assignRoleForUser(auth0Id, null, email);
      const userData = {
        auth0Id,
        email: email || `user-${auth0Id.replace(/[^a-z0-9]/gi, '-')}@placeholder.local`,
        name: name || 'User',
        nickname: nickname || (email ? email.split('@')[0].toLowerCase() : undefined),
        picture,
        role,
        workspaceOwnerId,
        status: 'active',
      };
      try {
        user = await User.create(userData);
      } catch (createErr: unknown) {
        // Handle duplicate email (e.g. same person, different auth provider)
        const err = createErr as { code?: number };
        if (err?.code === 11000 && email) {
          const existing = await User.findOneAndUpdate(
            { email: userData.email.toLowerCase() },
            { auth0Id, name: userData.name, picture: userData.picture },
            { new: true }
          );
          if (existing) user = existing;
          else throw createErr;
        } else {
          throw createErr;
        }
      }
    } else {
      // Sync email/name/nickname from Auth0 (fixes add-by-email lookup; nickname enables fallback)
      const isPlaceholder = user.email?.includes('@placeholder.') || user.email?.includes('@temp.');
      const syncUpdate: Record<string, unknown> = {};
      if (isPlaceholder && email) syncUpdate.email = email.trim().toLowerCase();
      // Only sync name when Auth0 actually provides one - don't overwrite Profile edits with fallback "User"
      if (isPlaceholder && payload?.name) syncUpdate.name = payload.name;
      if (nickname) syncUpdate.nickname = nickname; // always sync - enables add-by-email fallback
      if (picture !== undefined) syncUpdate.picture = picture;
      if (Object.keys(syncUpdate).length > 0) {
        const synced = await User.findOneAndUpdate(
          { auth0Id },
          syncUpdate,
          { new: true }
        );
        if (synced) user = synced;
      }

      // Migration: ensure existing users have role (check PRIMARY_ADMIN_EMAIL even if they have role)
      const effectiveEmail = (user?.email || email || '').toString().toLowerCase();
      const isPrimaryAdmin = PRIMARY_ADMIN_EMAIL && effectiveEmail === PRIMARY_ADMIN_EMAIL;
      const hasRole = user?.role && user.role !== 'pending' && !isPrimaryAdmin;
      if ((!hasRole || isPrimaryAdmin) && user) {
        const { role, workspaceOwnerId } = await assignRoleForUser(auth0Id, user, effectiveEmail);
        user = await User.findOneAndUpdate(
          { auth0Id },
          { role, workspaceOwnerId },
          { new: true }
        );
      }
    }

    if (!user) throw createError('User not found', 404);
    res.json(user);
  })
);

// PUT /api/users/me - Update current user profile (name, picture; preserves role)
router.put(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    if (!auth0Id) throw createError('User ID not found in token', 401);

    const payload = req.auth?.payload as { email?: string; name?: string; picture?: string } | undefined;
    const { email, name, picture } = {
      email: req.body?.email ?? payload?.email,
      name: req.body?.name ?? payload?.name,
      picture: req.body?.picture ?? payload?.picture,
    };

    const existing = await User.findOne({ auth0Id });
    // Only assign role when creating (upsert) or migrating; preserve for existing users
    let role = existing?.role;
    let workspaceOwnerId = existing?.workspaceOwnerId;
    const effectiveEmail = (email || existing?.email || '').toString().toLowerCase();
    const isPrimaryAdmin = PRIMARY_ADMIN_EMAIL && effectiveEmail === PRIMARY_ADMIN_EMAIL;
    if (!existing) {
      const assigned = await assignRoleForUser(auth0Id, null, effectiveEmail);
      role = assigned.role;
      workspaceOwnerId = assigned.workspaceOwnerId;
    } else if (!existing.role || existing.role === 'pending' || isPrimaryAdmin) {
      const assigned = await assignRoleForUser(auth0Id, existing, effectiveEmail);
      role = assigned.role;
      workspaceOwnerId = assigned.workspaceOwnerId;
    }

    const user = await User.findOneAndUpdate(
      { auth0Id },
      {
        auth0Id,
        email: email || existing?.email || `unknown-${auth0Id}@temp.local`,
        name: name || existing?.name || 'User',
        picture: picture ?? existing?.picture,
        role,
        workspaceOwnerId,
        status: existing?.status ?? 'active',
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.json(user);
  })
);

// ========== Admin-only user management ==========

// GET /api/users - List all users in workspace (admin only)
router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    if (!auth0Id) throw createError('User ID not found in token', 401);

    const workspaceUsers = await User.find({
      $or: [
        { auth0Id },
        { workspaceOwnerId: auth0Id },
        // Pending signups with no workspace - available for admin to approve
        {
          role: 'pending',
          $or: [
            { workspaceOwnerId: null },
            { workspaceOwnerId: { $exists: false } },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(workspaceUsers);
  })
);

// POST /api/users/add-by-email - Add pending user to workspace by email (admin only)
router.post(
  '/add-by-email',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    if (!auth0Id) throw createError('User ID not found in token', 401);

    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      throw createError('Email is required', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Try our DB first
    let user = await User.findOne({ email: normalizedEmail });

    // 2. If not found, look up in Auth0 directly (source of truth)
    if (!user) {
      try {
        const auth0Users = await getAuth0UsersByEmail(normalizedEmail);
        if (auth0Users.length > 0) {
          const au = auth0Users[0];
          user = await User.findOne({ auth0Id: au.user_id });
          if (!user) {
            user = await User.create({
              auth0Id: au.user_id,
              email: (au.email || normalizedEmail).toLowerCase(),
              name: au.name || 'User',
              nickname: au.nickname ? au.nickname.toLowerCase() : undefined,
              picture: au.picture,
              role: 'pending',
              status: 'active',
            });
          } else if (user.email?.includes('@placeholder.') || user.email?.includes('@temp.')) {
            user = await User.findByIdAndUpdate(
              user._id,
              {
                email: (au.email || normalizedEmail).toLowerCase(),
                name: au.name || user.name,
                nickname: au.nickname ? au.nickname.toLowerCase() : user.nickname,
                picture: au.picture ?? user.picture,
              },
              { new: true }
            ) as typeof user;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Auth0 lookup failed';
        throw createError(
          `Could not look up user: ${msg}. Ensure AUTH0_M2M_CLIENT_ID and AUTH0_M2M_CLIENT_SECRET are set.`,
          502
        );
      }
    }

    if (!user) {
      throw createError('No user found with that email in Auth0. They must sign up first—share the invite link and have them create an account.', 404);
    }

    // Block if in another workspace, unless they're a standalone admin (we can claim them)
    const isStandaloneAdmin = user.role === 'admin' && user.workspaceOwnerId === user.auth0Id;
    if (user.workspaceOwnerId && user.workspaceOwnerId !== auth0Id && !isStandaloneAdmin) {
      throw createError('User is already a member of another workspace', 400);
    }

    if (user.auth0Id === auth0Id) {
      throw createError('You cannot add yourself', 400);
    }

    const updated = await User.findOneAndUpdate(
      { _id: user._id },
      {
        role: 'member' as UserRole,
        workspaceOwnerId: auth0Id,
        status: 'active' as UserStatus,
        invitedBy: auth0Id,
      },
      { new: true }
    );

    res.json(updated);
  })
);

// PUT /api/users/:id - Update user in workspace (admin only)
router.put(
  '/:id',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    if (!auth0Id) throw createError('User ID not found in token', 401);

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) throw createError('User not found', 404);

    const isInWorkspace =
      targetUser.auth0Id === auth0Id ||
      targetUser.workspaceOwnerId === auth0Id ||
      (targetUser.role === 'pending' && !targetUser.workspaceOwnerId); // Pending signups - admin can approve
    if (!isInWorkspace) {
      throw createError('User not in your workspace', 403);
    }

    const { role, status, earnedRates } = req.body;
    const update: Record<string, unknown> = {};

    if (role !== undefined) {
      if (!['admin', 'member', 'pending'].includes(role)) {
        throw createError('Invalid role', 400);
      }
      if (targetUser.auth0Id === auth0Id && role !== 'admin') {
        throw createError('You cannot change your own role', 400);
      }
      update.role = role;
    }
    if (status !== undefined) {
      if (!['active', 'pending', 'disabled'].includes(status)) {
        throw createError('Invalid status', 400);
      }
      if (targetUser.auth0Id === auth0Id && status === 'disabled') {
        throw createError('You cannot disable your own account', 400);
      }
      update.status = status;
    }
    if (earnedRates !== undefined) {
      if (typeof earnedRates !== 'object' || earnedRates === null) {
        throw createError('earnedRates must be an object', 400);
      }
      update.earnedRates = earnedRates;
    }
    if (role === 'member' && targetUser.workspaceOwnerId !== auth0Id) {
      update.workspaceOwnerId = auth0Id;
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    res.json(updated);
  })
);

// DELETE /api/users/me - Delete current user (must be before /:id)
router.delete(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    
    if (!auth0Id) {
      throw createError('User ID not found in token', 401);
    }

    const user = await User.findOneAndDelete({ auth0Id });

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({ message: 'User deleted successfully' });
  })
);

// DELETE /api/users/:id - Remove user from workspace (admin only)
// Use for orphaned/duplicate users (e.g. deleted from Auth0, wrong Add by Email)
router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    if (!auth0Id) throw createError('User ID not found in token', 401);

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) throw createError('User not found', 404);

    if (targetUser.auth0Id === auth0Id) {
      throw createError('You cannot remove yourself. Use Profile to delete your account.', 400);
    }

    const canManage =
      targetUser.workspaceOwnerId === auth0Id ||
      (targetUser.role === 'pending' && !targetUser.workspaceOwnerId);
    if (!canManage) {
      throw createError('User not in your workspace', 403);
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed' });
  })
);

export default router;
