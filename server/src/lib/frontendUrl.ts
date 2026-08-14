/** Base URL for the SPA (no trailing slash). Used for deep links and post-payment redirect. */
export function getFrontendBaseUrl(): string {
  const fromEnv =
    process.env.FRONTEND_URL ||
    (process.env.CLIENT_URL || '').split(',')[0].trim();
  return (fromEnv || 'http://localhost:5173').replace(/\/$/, '');
}
