# Auth0 Machine-to-Machine App Setup

The "Add by Email" feature uses Auth0's Management API to look up users by email. You need a Machine-to-Machine (M2M) application to get the required credentials.

## Steps

1. **Auth0 Dashboard** → **Applications** → **Create Application**
2. Choose **Machine to Machine Applications**
3. Select **Auth0 Management API** as the API
4. When prompted for permissions, enable **read:users**
5. Create the application
6. Copy **Client ID** → `AUTH0_M2M_CLIENT_ID`
7. Copy **Client Secret** → `AUTH0_M2M_CLIENT_SECRET`

## Add to .env

```env
AUTH0_M2M_CLIENT_ID=your_client_id_here
AUTH0_M2M_CLIENT_SECRET=your_client_secret_here
```

Add these to your production environment (Railway, Vercel, etc.) as well.
