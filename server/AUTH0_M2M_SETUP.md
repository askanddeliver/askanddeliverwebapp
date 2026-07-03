# Auth0 Machine-to-Machine App Setup

The "Add by Email" feature uses Auth0's Management API to look up users by email. You need a **separate** Machine-to-Machine (M2M) application — **not** your SPA login app credentials.

## Steps

1. **Auth0 Dashboard** → **Applications** → **Create Application**
2. Choose **Machine to Machine Applications** (not Single Page Application)
3. Select **Auth0 Management API** as the API
4. When prompted for permissions, enable **read:users**
5. Create the application
6. Copy **Client ID** → `AUTH0_M2M_CLIENT_ID`
7. Copy **Client Secret** → `AUTH0_M2M_CLIENT_SECRET`

## Add to server environment

Production (Railway) and local `server/.env`:

```env
AUTH0_M2M_CLIENT_ID=your_m2m_client_id_here
AUTH0_M2M_CLIENT_SECRET=your_m2m_client_secret_here
```

**Important:** These must be from the **M2M** app you just created. Do **not** reuse `VITE_AUTH0_CLIENT_ID` or the SPA application's credentials — SPAs cannot use `client_credentials` and will return 403.

After changing Railway variables, redeploy or restart the server so the new values load.

## Verify

In Auth0 → **Applications** → your M2M app → **Settings**:

- **Application Type** must be **Machine to Machine**
- **Advanced Settings** → **Grant Types** → **Client Credentials** must be enabled

In Auth0 → **Applications** → **APIs** → **Auth0 Management API** → **Machine to Machine Applications** tab:

- Your M2M app should be listed with **read:users** authorized

## Troubleshooting

### Error: `Grant type 'client_credentials' not allowed for the client`

**Cause:** `AUTH0_M2M_CLIENT_ID` / `AUTH0_M2M_CLIENT_SECRET` point to the wrong Auth0 application (usually the SPA login app).

**Fix:** Create a dedicated M2M app (steps above) and update Railway `server` service env vars. Redeploy.

### Error: `No user found with that email in Auth0`

**Cause:** The person has not completed at least one login to your app (askanddeliver.com), or email in Auth0 differs from what you typed.

**Fix:**

1. Share the invite link; have them click **Login** on the site and sign in with Google (or their method).
2. Confirm they appear in Auth0 Dashboard → **User Management** → **Users** with the expected email.
3. Retry **Add by Email** with that exact email.

If M2M is configured correctly, add-by-email also works for users who exist in Auth0 but not yet in MongoDB (first login creates the DB record on `/api/users/me`, but Auth0 lookup is the fallback when email search in DB misses).

### Error: `Auth0 Management API not configured`

**Cause:** `AUTH0_M2M_CLIENT_ID` or `AUTH0_M2M_CLIENT_SECRET` is missing on the server.

**Fix:** Set both on Railway and restart the server.
