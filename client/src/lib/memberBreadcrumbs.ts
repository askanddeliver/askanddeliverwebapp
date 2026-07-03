/** Labels for member top bar breadcrumbs. */
const ROUTE_CRUMB: Record<string, string> = {
  '/member': 'Hub',
  '/member/projects': 'Projects',
  '/member/entries': 'Entries',
  '/member/profile': 'Profile',
};

export function memberCrumbForPath(pathname: string): string {
  return ROUTE_CRUMB[pathname] ?? 'Member';
}
