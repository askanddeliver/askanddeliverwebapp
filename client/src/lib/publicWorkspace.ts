/** Module-level workspace key for public API interceptors (set by PublicWorkspaceProvider). */
let publicWorkspaceKey: string | null = null;

export function setPublicWorkspaceKey(key: string | null): void {
  publicWorkspaceKey = key;
}

export function getPublicWorkspaceKey(): string | null {
  return publicWorkspaceKey;
}

export function resolveInitialPublicWorkspaceKey(): string | null {
  const fromEnv = import.meta.env.VITE_DEV_PUBLIC_WORKSPACE?.trim();
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('workspace')?.trim();
    if (fromQuery) return fromQuery;
  }

  return 'default';
}
