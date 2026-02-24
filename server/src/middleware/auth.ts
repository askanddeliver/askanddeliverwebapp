import { auth } from 'express-oauth2-jwt-bearer';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import type { IUser } from '../models/User';

// Auth0 JWT validation middleware
export const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256',
});

// Use the Request type directly - express-oauth2-jwt-bearer augments it with auth property
export type AuthRequest = Request;

// Extract user ID from token
export const extractUserId = (req: Request): string | null => {
  return req.auth?.payload?.sub || null;
};

// Optional auth - doesn't fail if no token, just doesn't set user
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If token exists, validate it
  checkJwt(req, res, (err) => {
    if (err) {
      // Token invalid, but optional so continue without auth
      return next();
    }
    next();
  });
};

/**
 * Get the effective workspace owner ID for the current user.
 * Admin: returns their own auth0Id.
 * Member: returns their workspaceOwnerId.
 * Pending: returns null (no workspace access).
 */
export async function getWorkspaceOwnerId(req: Request): Promise<string | null> {
  const auth0Id = extractUserId(req);
  if (!auth0Id) return null;

  const user = await User.findOne({ auth0Id }).lean();
  if (!user) return null;

  if (user.role === 'admin') return user.auth0Id;
  if (user.role === 'member' && user.workspaceOwnerId) return user.workspaceOwnerId;
  return null;
}

/**
 * Load the current user from DB and attach to request.
 * Use after checkJwt. Sets req.user or leaves it undefined.
 */
export async function loadUser(req: Request): Promise<IUser | null> {
  const auth0Id = extractUserId(req);
  if (!auth0Id) return null;
  const user = await User.findOne({ auth0Id });
  if (!user) return null;
  (req as AuthRequest & { user?: IUser }).user = user;
  return user;
}

/**
 * Middleware: require admin role. Use after checkJwt.
 * Returns 403 if user is not an admin.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth0Id = extractUserId(req);
  if (!auth0Id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  User.findOne({ auth0Id })
    .then((user) => {
      if (!user || user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
      next();
    })
    .catch(() => {
      res.status(500).json({ error: 'Failed to verify permissions' });
    });
}
