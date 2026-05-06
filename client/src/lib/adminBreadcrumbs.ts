/** Labels for admin top bar breadcrumbs (pathname → segment title). */
const ROUTE_CRUMB: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/entries': 'Entries',
  '/time-blocks': 'Block Time',
  '/reports': 'Reports',
  '/invoices': 'Invoices',
  '/proposals': 'Proposals',
  '/clients': 'Clients',
  '/internal-workspace': 'Internal Workspace',
  '/projects': 'Projects',
  '/leads': 'Leads',
  '/portfolio-admin': 'Portfolio',
  '/users': 'Team',
  '/task-types': 'Task Types',
  '/site-config': 'Site Config',
  '/profile': 'Profile',
};

export function adminCrumbForPath(pathname: string): string {
  return ROUTE_CRUMB[pathname] ?? 'Workspace';
}
