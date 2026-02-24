/**
 * Auth0 Management API - fetch users by email from Auth0 directly.
 * Requires AUTH0_M2M_CLIENT_ID and AUTH0_M2M_CLIENT_SECRET (Machine-to-Machine app with read:users).
 */

const DOMAIN = process.env.AUTH0_DOMAIN;
const CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID;
const CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET;

export interface Auth0User {
  user_id: string;
  email?: string;
  name?: string;
  picture?: string;
  nickname?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getManagementToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  if (!DOMAIN || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Auth0 Management API not configured. Set AUTH0_M2M_CLIENT_ID and AUTH0_M2M_CLIENT_SECRET.');
  }

  const res = await fetch(`https://${DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience: `https://${DOMAIN}/api/v2/`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth0 token failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

/**
 * Fetch Auth0 user(s) by email. Returns empty array if not found.
 */
export async function getAuth0UsersByEmail(email: string): Promise<Auth0User[]> {
  const token = await getManagementToken();
  const url = new URL(`https://${DOMAIN}/api/v2/users-by-email`);
  url.searchParams.set('email', email);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Auth0 users-by-email failed: ${res.status}`);
  }

  return res.json() as Promise<Auth0User[]>;
}
