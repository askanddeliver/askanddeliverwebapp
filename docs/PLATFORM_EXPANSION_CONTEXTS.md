# Platform Expansion — Contexts & Frontend State

**Status:** Planning (June 2026)  
**Parent:** [PLATFORM_EXPANSION_BUILD_PLAN.md](./PLATFORM_EXPANSION_BUILD_PLAN.md)  
**See also:** [PLATFORM_EXPANSION_ARCHITECTURE.md](./PLATFORM_EXPANSION_ARCHITECTURE.md)

This document specifies **React context hierarchy**, **hooks**, and **API client patterns** for role-based layouts and multi-tenant public resolution on the client.

---

## Table of Contents

1. [Current Context Stack](#current-context-stack)
2. [Target Context Stack](#target-context-stack)
3. [UserContext Expansion](#usercontext-expansion)
4. [WorkspaceContext (New)](#workspacecontext-new)
5. [PublicWorkspaceContext (New)](#publicworkspacecontext-new)
6. [LayoutContext (New)](#layoutcontext-new)
7. [IntakeFormContext (New)](#intakeformcontext-new)
8. [Hook Reference](#hook-reference)
9. [API Service Additions](#api-service-additions)
10. [Provider Mount Order](#provider-mount-order)
11. [Route Guard Composition](#route-guard-composition)

---

## Current Context Stack

```
Auth0Provider
  └── ApiAuthProvider          # tokenReady, registerAccessTokenGetter
       └── UserProvider        # isAdmin, isMember, isPending, user
            └── Routes
                 ├── PublicLayout
                 └── ProtectedRoute
                      └── AdminThemeProvider
                           └── Layout (admin shell)
```

**Gap:** Single theme provider and admin layout assume all authenticated users are internal (admin or member). No client portal context, no public workspace identity, no role-based default routes.

---

## Target Context Stack

```
Auth0Provider
  └── ApiAuthProvider
       └── UserProvider                    # expanded roles
            └── WorkspaceThemeProvider     # renamed from AdminThemeProvider
                 └── Routes
                      ├── PublicLayout
                      │    └── PublicWorkspaceProvider   # host → public API header
                      │
                      └── ProtectedRoute (tokenReady)
                           └── RoleRouter                   # redirect by role
                                ├── AdminRoute → AdminLayout
                                ├── MemberRoute → MemberLayout
                                └── ClientRoute → ClientPortalLayout
```

---

## UserContext Expansion

### Extended interface

```typescript
// client/src/contexts/UserContext.tsx

interface UserContextValue {
  user: User | null;
  role: UserRole | null;

  // Role flags
  isAdmin: boolean;
  isMember: boolean;
  isClient: boolean;
  isPending: boolean;
  isWorkspaceUser: boolean;     // admin || member

  // Linked entities
  clientId: string | null;      // when isClient
  workspaceOwnerId: string | null;

  // Navigation helper
  homeRoute: string;            // '/dashboard' | '/member' | '/portal' | '/pending'

  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

### Type updates (`client/src/types/index.ts`)

```typescript
export type UserRole = 'admin' | 'member' | 'client' | 'pending';

export interface User {
  // ... existing
  role: UserRole;
  clientId?: string;
  disciplines?: string[];
  availability?: AvailabilityPreferences;
  bio?: string;
}
```

### Implementation notes

- `homeRoute` derived from role — use everywhere a logo click or "Home" nav should land (not hard-coded `/dashboard`).
- `isWorkspaceUser` gates creative + admin shared features (timer, internal project views).
- Do **not** fetch client CRM record in UserContext — lazy-load in portal pages via `clientsApi.get(id)` when needed.

---

## WorkspaceContext (New)

**Purpose:** Cache workspace-level metadata for all authenticated shells (company name, tenant discipline taxonomy, feature flags).

```typescript
// client/src/contexts/WorkspaceContext.tsx

interface WorkspaceContextValue {
  companyName: string;
  companyEmail?: string;
  disciplines: DisciplineDefinition[];  // tenant taxonomy — see DISCIPLINES_AND_TASK_TYPES.md
  features: WorkspaceFeatures;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

interface WorkspaceFeatures {
  dynamicIntake: boolean;
  clientPortal: boolean;
  projectMessaging: boolean;
  blockTime: boolean;
}
```

**Data sources:**
- `GET /api/site-config` — company info + `disciplines[]` taxonomy
- `GET /api/workspace/features` (new) — optional feature flags from env or Tenant record

**Mount:** Inside `ProtectedRoute`, wrapping role-specific layouts (admin, creative, portal all need company name).

**Not for public pages** — public uses `PublicWorkspaceContext` + public site-config API.

---

## PublicWorkspaceContext (New)

**Purpose:** Attach consistent workspace identity to **public** API calls (intake, portfolio, theme) before SaaS subdomain routing is visible in production.

```typescript
// client/src/contexts/PublicWorkspaceContext.tsx

interface PublicWorkspaceContextValue {
  workspaceKey: string | null;   // subdomain or 'default'
  setDevWorkspaceOverride: (key: string | null) => void;  // localhost only
}
```

**API integration (`services/api.ts`):**

```typescript
// Public axios interceptor
publicApi.interceptors.request.use((config) => {
  const key = getPublicWorkspaceKey(); // from context module setter
  if (key) {
    config.headers['X-Public-Workspace'] = key;
  }
  return config;
});
```

**Local dev:** `VITE_DEV_PUBLIC_WORKSPACE=default` or query `?workspace=demo`.

---

## LayoutContext (New)

**Purpose:** Shared UI state across shells (sidebar collapsed, mobile drawer, command palette open).

```typescript
interface LayoutContextValue {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}
```

Each layout (`AdminLayout`, `MemberLayout`, `ClientPortalLayout`) provides its own provider instance or shares one with `layoutVariant: 'admin' | 'member' | 'portal'`.

---

## IntakeFormContext (New)

**Purpose:** Multi-step form state for **dynamic** public intake (mirrors current `Contact.tsx` local state but driven by schema).

```typescript
interface IntakeFormContextValue {
  form: IntakeFormDefinition | null;
  responses: Record<string, unknown>;
  currentStepIndex: number;
  setField: (key: string, value: unknown) => void;
  goNext: () => void;
  goPrev: () => void;
  canProceed: boolean;
  submitting: boolean;
  submit: () => Promise<void>;
  visibleFields: IntakeField[];   // respects showWhen conditional logic
}
```

**Scope:** Wrap only `/contact` (or `/intake/:slug`) route — not global.

**Admin preview:** Same provider + renderer component with `mode: 'preview'`.

---

## Hook Reference

| Hook | Context | Usage |
|------|---------|-------|
| `useUserRole()` | UserContext | Role flags, homeRoute |
| `useWorkspace()` | WorkspaceContext | Company name, features |
| `usePublicWorkspace()` | PublicWorkspaceContext | Dev override |
| `useLayout()` | LayoutContext | Shell UI state |
| `useIntakeForm()` | IntakeFormContext | Public intake wizard |
| `useWorkspaceTheme()` | WorkspaceThemeProvider | CSS variables refresh |

### Convenience guards

```typescript
// hooks/useRequireRole.ts
function useRequireRole(...allowed: UserRole[]) {
  const { role, isLoading, homeRoute } = useUserRole();
  // redirect to homeRoute or /pending if not allowed
}
```

---

## API Service Additions

Add to `client/src/services/api.ts`:

```typescript
// Intake forms (admin)
export const intakeFormsApi = {
  getAll: () => api.get('/intake-forms'),
  getOne: (id: string) => api.get(`/intake-forms/${id}`),
  create: (data) => api.post('/intake-forms', data),
  update: (id, data) => api.put(`/intake-forms/${id}`, data),
  publish: (id) => api.post(`/intake-forms/${id}/publish`),
  duplicate: (id) => api.post(`/intake-forms/${id}/duplicate`),
};

// Intake forms (public)
export const intakeFormsPublicApi = {
  getPublished: (slug = 'default') =>
    publicApi.get('/intake-forms/public', { params: { slug } }),
};

// Portal (client role)
export const portalApi = {
  getDashboard: () => api.get('/portal/dashboard'),
  getProjects: () => api.get('/portal/projects'),
  getProject: (id: string) => api.get(`/portal/projects/${id}`),
  getInvoices: () => api.get('/portal/invoices'),
  getInvoice: (id: string) => api.get(`/portal/invoices/${id}`),
};

// Member dashboard
export const memberApi = {
  getDashboard: () => api.get('/member/dashboard'),
  getMyProjects: () => api.get('/member/projects'),
  updateProfile: (data) => api.put('/users/me', data),
};

// Admin dashboard aggregates
export const dashboardApi = {
  getAdminSummary: () => api.get('/dashboard/admin-summary'),
  getPipeline: () => api.get('/dashboard/pipeline'),
  getCapacity: () => api.get('/dashboard/capacity'),
};

// Project messages
export const projectMessagesApi = {
  list: (projectId: string) => api.get(`/projects/${projectId}/messages`),
  create: (projectId: string, data: { body: string; clientVisible?: boolean }) =>
    api.post(`/projects/${projectId}/messages`, data),
};

// Client invite (admin)
export const clientInviteApi = {
  invite: (data: { email: string; clientId: string }) =>
    api.post('/users/invite-client', data),
};
```

---

## Provider Mount Order

```tsx
// App.tsx (conceptual)

<Auth0Provider ...>
  <ApiAuthProvider>
    <UserProvider>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={
            <PublicWorkspaceProvider>
              <IntakeFormProvider slug="default">
                <Contact />
              </IntakeFormProvider>
            </PublicWorkspaceProvider>
          } />
        </Route>

        {/* Authenticated */}
        <Route element={
          <ProtectedRoute>
            <WorkspaceThemeProvider>
              <RoleRouter />
            </WorkspaceThemeProvider>
          </ProtectedRoute>
        }>
          <Route element={<AdminRoute><WorkspaceProvider><AdminLayout /></WorkspaceProvider></AdminRoute>}>
            {/* admin routes */}
          </Route>
          <Route element={<MemberOrAdminRoute><WorkspaceProvider><MemberLayout /></WorkspaceProvider></MemberOrAdminRoute>}>
            {/* member routes */}
          </Route>
          <Route element={<ClientRoute><WorkspaceProvider><ClientPortalLayout /></WorkspaceProvider></ClientRoute>}>
            {/* portal routes */}
          </Route>
        </Route>
      </Routes>
    </UserProvider>
  </ApiAuthProvider>
</Auth0Provider>
```

---

## Route Guard Composition

| Component | Allows | Redirect |
|-----------|--------|----------|
| `ProtectedRoute` | Authenticated + tokenReady | Login |
| `AdminRoute` | `role === 'admin'` | `homeRoute` |
| `MemberOrAdminRoute` | admin \| member | `homeRoute` |
| `ClientRoute` | `role === 'client'` + `clientId` | `homeRoute` or error page |
| `PendingGate` | blocks all except pending page | — |

**Admin accessing `/member`:** Allowed (admin is superset) — useful for dogfooding.

**Member accessing `/dashboard`:** Redirect to `/member` unless explicitly shared (entries-only deep links).

**Client accessing admin URLs:** Redirect to `/portal`.

Implement redirects in guards using `homeRoute` from UserContext — never hard-code paths in multiple files.

---

## Rename: AdminThemeContext → WorkspaceThemeContext

Optional but recommended for clarity:

- File: `WorkspaceThemeContext.tsx`
- Re-export `useAdminTheme` as alias for backward compatibility during migration
- Applies to admin, creative, and portal shells (all tenant-branded)

---

## Testing Checklist (Contexts)

- [ ] Hard refresh on each role — no 401 burst; `tokenReady` gates correctly
- [ ] Client user without `clientId` — clear error state, not admin shell flash
- [ ] Public intake sends `X-Public-Workspace` on localhost with dev override
- [ ] Logo/home nav respects `homeRoute` per role
- [ ] Theme variables apply on portal layout (client sees tenant brand)

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-27 | Initial contexts spec |
| 2026-07-03 | `/member` routes, `memberApi`, tenant `disciplines` in WorkspaceContext |
