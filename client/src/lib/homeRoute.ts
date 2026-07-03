import type { UserRole } from '../types';

/** Role-aware default landing route after login. */
export function getHomeRoute(role: UserRole | null): string {
  switch (role) {
    case 'admin':
      return '/dashboard';
    case 'member':
      return '/member';
    case 'client':
      return '/portal';
    default:
      return '/dashboard';
  }
}
