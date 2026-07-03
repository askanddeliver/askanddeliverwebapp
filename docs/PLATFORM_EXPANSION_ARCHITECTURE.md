# Platform Expansion — Architecture

**Status:** Planning (June 2026)  
**Parent:** [PLATFORM_EXPANSION_BUILD_PLAN.md](./PLATFORM_EXPANSION_BUILD_PLAN.md)

This document defines the **target architecture** for evolving Ask And Deliver into a multi-tenant creative-agency platform. It extends [ARCHITECTURE.md](../ARCHITECTURE.md) — read that first for current production behavior.

---

## Table of Contents

1. [Conceptual Model](#conceptual-model)
2. [Personas & Roles](#personas--roles)
3. [Authentication & Authorization](#authentication--authorization)
4. [Routing & Layout Architecture](#routing--layout-architecture)
5. [Data Architecture](#data-architecture)
6. [Lead Intake Architecture](#lead-intake-architecture)
7. [Member Profile, Disciplines & Capacity](#member-profile-disciplines--capacity)
8. [Client Portal Architecture](#client-portal-architecture)
9. [Admin Command Center](#admin-command-center)
10. [Communication Layer](#communication-layer)
11. [Public & Multi-Tenant Resolution](#public--multi-tenant-resolution)
12. [Integration with SaaS Layer](#integration-with-saas-layer)
13. [Security Rules](#security-rules)
14. [Migration & Backward Compatibility](#migration--backward-compatibility)

---

## Conceptual Model

### Three rings of users

```
                    ┌─────────────────────────────┐
                    │     Platform (optional)      │
                    │  super_admin · billing       │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │           Tenant Workspace               │
              │  admin · members (creatives) · settings  │
              └────────────────────┬────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
    CRM: Clients              Operations                 Public
    (business records)     projects · time · billing    portfolio · intake
         │
         └── client role users (portal access)
```

- **Tenant workspace** = today's workspace model (`workspaceOwnerId` = admin's Auth0 `sub`).
- **Client** (CRM entity) ≠ **client role** (Auth0 user). A Client record can have zero or more linked portal users.
- **Member** = `member` role user with profile extensions (disciplines, availability).

---

## Personas & Roles

### Role matrix (target)

| Capability | admin | member | client | pending |
|------------|:-----:|:------:|:------:|:-------:|
| Admin shell | ✓ | — | — | — |
| Member shell | ✓ | ✓ | — | — |
| Client portal | — | — | ✓ | — |
| Time tracking | ✓ | ✓ | — | — |
| All workspace entries | ✓ | own only | — | — |
| Rates / margin / reports | ✓ | — | — | — |
| CRM clients CRUD | ✓ | — | — | — |
| Leads pipeline | ✓ | — | — | — |
| Intake form config | ✓ | — | — | — |
| Team management | ✓ | — | — | — |
| Own projects (portal) | — | — | ✓ | — |
| Own invoices (portal) | — | — | ✓ | — |
| Project messages (internal) | ✓ | ✓ | — | — |
| Project messages (client-visible) | ✓ | ✓ | read | — |
| Profile / disciplines | ✓ | ✓ | limited | — |

### User model (target fields)

```typescript
interface IUser {
  auth0Id: string;
  email: string;
  name: string;
  nickname?: string;
  picture?: string;

  role: 'admin' | 'member' | 'client' | 'pending';
  status: 'active' | 'pending' | 'disabled';
  workspaceOwnerId?: string;     // members + clients

  // Client portal link
  clientId?: ObjectId;           // required when role === 'client'

  // Creative profile
  disciplines?: string[];
  availability?: {
    hoursPerWeek?: number;
    preferredDays?: ('mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun')[];
    timezone?: string;           // IANA, e.g. America/Chicago
    notes?: string;
    outOfOffice?: { start: Date; end: Date; message?: string };
  };
  bio?: string;

  // Existing
  earnedRates?: Record<string, number>;
  invitedBy?: string;
}
```

**Indexes:** `{ workspaceOwnerId: 1, role: 1 }`, `{ clientId: 1 }` (sparse), `{ auth0Id: 1 }` unique.

---

## Authentication & Authorization

### Auth flow (unchanged core)

Auth0 SPA → JWT → `checkJwt` → route handlers. Role is **always** loaded from MongoDB (`requireRole`, `requireAdmin`, etc.) — never from token claims alone.

### New middleware (server)

| Middleware | Purpose |
|------------|---------|
| `requireAdmin` | Existing — workspace admin |
| `requireMemberOrAdmin` | Member + admin shared routes |
| `requireClient` | Portal routes — role === `client`, active, `clientId` set |
| `requireWorkspaceMember` | Any non-pending workspace user (admin \| member) |
| `resolveClientScope(req)` | Returns `clientId` for client users; 403 otherwise |
| `resolvePublicWorkspace(req)` | Host/header → `workspaceOwnerId` for public routes |

### Role assignment (target)

Replace env-first heuristics for production platform:

1. If user has `role` in DB and not pending → keep
2. If invite record exists (team or client invite) → apply role + links
3. If Auth0 `sub` matches `Tenant.adminAuth0Id` → admin (when Tenant model exists)
4. Else → `pending`

`PRIMARY_ADMIN_EMAIL` remains as **legacy fallback** for single-tenant deploy until SaaS signup ships.

### Client invite flow (admin only — locked)

No client self-signup. Admin distributes portal access from the dashboard.

```
Admin → Clients page (or portal-invites panel)
  → "Invite to portal" modal { email, clientId }
  → POST /api/users/invite-client
  → User record: role client, status pending, workspaceOwnerId, clientId
  → (optional Phase 2) transactional email with Auth0 signup link
User signs up via Auth0 (same email) → GET /api/users/me links auth0Id → /portal
```

**Admin UI (v1):** Row action on Clients list — "Invite to portal" — opens modal with email field (pre-filled from Client record if present). Show invite status on Client detail (pending / active / none).

---

## Routing & Layout Architecture

### Frontend route map (target)

```
PublicLayout
  /, /work, /work/:slug, /about, /contact (dynamic intake)
  /invoices/paid

AdminLayout (admin only — existing sidebar/topbar)
  /dashboard          ← command center (admin home)
  /clients, /projects, /entries, /reports, /invoices, ...
  /leads, /intake-config   ← NEW
  /users, /site-config, ...

MemberLayout (admin + member)
  /member               ← member hub home
  /member/projects
  /member/projects/:id
  /member/entries
  /member/messages      ← Phase 9
  /member/profile

ClientPortalLayout (client only)
  /portal
  /portal/projects
  /portal/projects/:id        ← brief + tasks + messages (no separate /portal/messages)
  /portal/invoices            ← v1.1 optional

Shared auth
  /profile                ← redirect by role or unified with role-specific sections
```

### Post-auth redirect

```typescript
function getDefaultRoute(role: UserRole): string {
  switch (role) {
    case 'admin': return '/dashboard';
    case 'member': return '/member';
    case 'client': return '/portal';
    default: return '/pending';
  }
}
```

Implement in `PostAuthRedirect` component mounted after `UserProvider` resolves.

### Layout components (new)

| Component | Wraps | Nav source |
|-----------|-------|------------|
| `AdminLayout` | Existing `Layout.tsx` | `Sidebar.tsx` (admin nav) |
| `MemberLayout` | New shell — same design tokens | `MemberSidebar.tsx` |
| `ClientPortalLayout` | New shell — simplified, client branding | `PortalNav.tsx` |

All layouts consume `AdminThemeContext` (or renamed `WorkspaceThemeContext`) for tenant colors.

---

## Data Architecture

### Scoping patterns (unchanged + extensions)

**Pattern A** — `userId = extractUserId(req)` or workspace owner for admin-only tenant data:
- Clients, LineItems, Invoices, Proposals, Portfolio, SiteConfig, Uploads, **IntakeForm**, **ClientInvite**

**Pattern B** — `userId = await getWorkspaceOwnerId(req)`:
- Projects, TaskTypes, ProjectTasks, TimeEntries, Reports, Export, **ProjectMessage**, **TimeBlock**

**Pattern C** — Client-scoped (new):
- Portal queries: `{ userId: workspaceOwnerId, clientId: user.clientId }` on Project, Invoice, ProjectMessage

**Pattern D** — Public with resolved workspace:
- `POST /api/leads/public`, `GET /api/intake-forms/public`, portfolio, site-config

### Entity relationship (additions)

```
User
 ├── role: admin | member | client
 ├── clientId? → Client (portal users only)
 ├── disciplines[], availability
 │
Client (CRM)
 ├── ... existing fields
 └──< User.clientId (portal users)

IntakeForm (userId)
 ├── slug: 'default'
 ├── status: DRAFT | PUBLISHED
 ├── steps: IntakeStep[]
 └── version / publishedAt

Lead (userId)  ← FIX: add scoping
 ├── ... core pipeline fields
 ├── responses: Map<fieldKey, mixed>   ← dynamic intake answers
 ├── intakeFormId?, intakeFormVersion?
 └── source?: 'public' | 'manual' | 'referral'

Project
 ├── assignedMemberIds?: string[]   ← auth0Ids
 └── ...

ProjectTask
 ├── assigneeAuth0Id?: string
 └── clientVisible?: boolean       ← default false

ProjectMessage (userId, Pattern B)
 ├── projectId, authorAuth0Id, body
 └── clientVisible: boolean
```

### Lead model migration

```typescript
// Add to Lead
userId: { type: String, required: true, index: true },
responses: { type: Schema.Types.Mixed, default: {} },
intakeFormId: { type: Schema.Types.ObjectId, ref: 'IntakeForm' },
intakeFormVersion: { type: Number },
source: { type: String, enum: ['public', 'manual', 'referral'], default: 'public' },
```

Backfill script: set `userId` to legacy workspace owner env var for existing leads.

---

## Lead Intake Architecture

### IntakeForm schema

```typescript
interface IntakeForm {
  userId: string;
  slug: string;                    // 'default' for primary public form
  status: 'DRAFT' | 'PUBLISHED';
  version: number;
  publishedAt?: Date;

  // Marketing
  title: string;
  subtitle?: string;
  successMessage?: string;

  steps: IntakeStep[];
}

interface IntakeStep {
  id: string;
  title: string;
  description?: string;
  fields: IntakeField[];
}

interface IntakeField {
  key: string;                     // stable key → Lead.responses[key]
  type: IntakeFieldType;
  label: string;
  helpText?: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];  // static option sets (budget, timeline, etc.)
  disciplineOptionIds?: string[];  // when type === 'disciplines_needed' — admin-curated discipline ids
  mapsTo?: 'name' | 'email' | 'company' | 'confidence' | ...;
  showWhen?: { fieldKey: string; equals: string | string[] };
  validation?: { min?: number; max?: number; pattern?: string };
}

type IntakeFieldType =
  | 'text' | 'textarea' | 'email' | 'phone' | 'url' | 'number'
  | 'single_select' | 'multi_select' | 'disciplines_needed' | 'boolean' | 'file' | 'date';
```

### Public submit flow

```
Contact.tsx (dynamic)
  → GET /api/intake-forms/public?slug=default  (+ workspace header)
  → render steps
  → POST /api/leads/public { responses, intakeFormId, intakeFormVersion }
Server
  → resolvePublicWorkspace(req)
  → validate against published form schema
  → map fields with mapsTo → Lead top-level columns
  → store full responses map
  → optional: upload files via presigned/cloudinary path
```

### Admin builder

- Route: `/intake-config`
- Full default form: [PLATFORM_EXPANSION_INTAKE_FORM_SPEC.md](./PLATFORM_EXPANSION_INTAKE_FORM_SPEC.md)
- List forms (v1: single `default` form)
- Step editor: add/remove/reorder steps and fields (**ordered list UI — not drag-drop in v1**)
- Option sets: budget bands, timelines, project types — tenant-defined strings
- **Disciplines needed** field: admin checks which disciplines from Site Config taxonomy appear on this form (generalized — no task-level options on intake)
- Preview mode (read-only render)
- Publish creates new `version` increment; public always serves latest PUBLISHED

---

## Member Profile, Disciplines & Capacity

### Tenant discipline taxonomy (locked)

Each workspace maintains a **discipline taxonomy** on **SiteConfig** — related to but **not identical** to Task Types. Full spec: [PLATFORM_EXPANSION_DISCIPLINES_AND_TASK_TYPES.md](./PLATFORM_EXPANSION_DISCIPLINES_AND_TASK_TYPES.md).

```typescript
interface DisciplineDefinition {
  id: string;
  name: string;
  description?: string;
  assignableToMember: boolean;
  showOnProject: boolean;
  sortOrder: number;
  tasks: DisciplineTask[];       // nested — linked to TaskTypes
}

interface DisciplineTask {
  id: string;
  name: string;
  taskTypeId: string;
  assignableToMember: boolean;
  sortOrder: number;
}
```

**Uses — by layer:**

| Use | Level | Filter / source |
|-----|-------|-----------------|
| **Intake** | Discipline only | Admin-selected `disciplineOptionIds` on intake field — generalized client choices |
| **Executable** | Discipline | `showOnProject` → `Project.disciplines[]` |
| **Assignable** | Discipline + task | Member profile; tasks nest under disciplines (e.g. Testing under Development) |
| **Billing** | Task Type | Timer, invoices — unchanged |

Full model: [PLATFORM_EXPANSION_DISCIPLINES_AND_TASK_TYPES.md](./PLATFORM_EXPANSION_DISCIPLINES_AND_TASK_TYPES.md).

**Matching (future):** Lead `responses.disciplines_needed` ∩ member `User.disciplines` → assignment suggestions.

### Member profile fields

- `User.disciplines: string[]` — discipline ids where `assignableToMember`
- `User.disciplineTasks?: string[]` — composite keys `disciplineId:taskId` for granular skills
- `User.availability` — see User model above

### Availability

- Stored on `User.availability` (see User model above)
- Admin dashboard "capacity" aggregates:
  - `hoursPerWeek` sum across active members
  - Compare to scheduled `TimeBlock` hours (when block time feature exists)
  - Optional: out-of-office flags on team list

### Project assignment

```typescript
// Project
assignedMemberIds?: string[];  // auth0Id list

// ProjectTask
assigneeAuth0Id?: string;
```

Member dashboard "My projects":
```javascript
Project.find({
  userId: workspaceOwnerId,
  status: 'ACTIVE',
  $or: [
    { assignedMemberIds: memberAuth0Id },
    // fallback: projectIds from member's recent time entries
  ]
})
```

---

## Client Portal Architecture

**Full spec:** [PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md](./PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md)

### Access control

Every portal API:

1. `checkJwt`
2. `requireClient`
3. Verify `Client` belongs to `workspaceOwnerId` derived from user's `workspaceOwnerId`
4. Query with `{ clientId: user.clientId, userId: workspaceOwnerId }`

### Invoice visibility

```javascript
Invoice.find({
  userId: workspaceOwnerId,
  clientId: user.clientId,
  status: { $in: ['SENT', 'PAID'] }
})
```

Payment links: reuse existing `paymentLinkUrl` on invoice — portal shows "Pay now" when SENT + link present.

### Project detail (client-safe)

Expose:
- title, status, excerpt, **brief** (sanitized HTML), **client-visible tasks** (title, description, status)
- **per-project message thread** — read `clientVisible` messages; client may post replies

Hide:
- budget, rates, margin, internal tasks, team earned rates, admin notes

Task status client labels: `TODO` → Open · `IN_PROGRESS` → In progress · `COMPLETED` → Complete

---

## Admin Command Center

### Dashboard data feeds (new/aggregated endpoints)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/dashboard/admin-summary` | Hours today/week, unbilled WIP, open leads, invoice aging |
| `GET /api/dashboard/pipeline` | Lead counts by status + recent |
| `GET /api/dashboard/capacity` | Team availability vs. blocks (optional) |

### Widget mapping (design handoff)

Reference: `docs/Design System Update/design_handoff_admin_redesign/screens/dashboard.jsx`

- Stat strip ← admin-summary
- Grouped to-dos ← existing project tasks (client vs internal scope)
- Lead snippet ← pipeline
- Timer ← unchanged

---

## Communication Layer

### ProjectMessage

```typescript
interface IProjectMessage {
  userId: string;              // workspace owner (Pattern B)
  projectId: ObjectId;
  authorAuth0Id: string;
  authorName: string;          // snapshot for display
  body: string;
  clientVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Routes:**
- `GET /api/projects/:id/messages` — admin/member: all; client: `clientVisible: true` only
- `POST /api/projects/:id/messages` — admin/member only; **`clientVisible` defaults `false`**; toggle on compose to expose in portal

v1 scope: project-scoped threads only — no DMs, @mentions, or email notifications until usage is validated.

---

## Public & Multi-Tenant Resolution

Until SaaS subdomain routing ships, use:

```env
DEFAULT_PUBLIC_WORKSPACE_OWNER_ID=<admin auth0 sub>
```

Resolver logic (shared helper `server/src/lib/workspaceResolver.ts`):

```typescript
async function resolvePublicWorkspace(req): Promise<string | null> {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  // Phase SaaS: subdomain → Tenant → adminAuth0Id
  // Legacy: DEFAULT_PUBLIC_WORKSPACE_OWNER_ID
}
```

All public GET/POST (portfolio, site-config, intake, leads) call this helper first.

---

## Integration with SaaS Layer

This expansion **prepares** for [SAAS_CONVERSION_BUILD_PLAN.md](./SAAS_CONVERSION_BUILD_PLAN.md):

| Expansion feature | SaaS touchpoint |
|-------------------|-----------------|
| Lead `userId` | Required before multi-domain |
| IntakeForm per workspace | Same scoping as SiteConfig |
| Public resolver | Becomes subdomain → Tenant lookup |
| Client portal | Works per tenant subdomain |
| super_admin | Platform console over Tenant collection |

**Order recommendation:** Phases 1–8 (this plan) → SaaS Phases 1–3 (subscription + routing).

---

## Security Rules

1. **Client isolation** — Portal queries must include both `workspaceOwnerId` and `clientId`; never accept `clientId` from query params for client role users (use JWT user record only).
2. **Intake validation** — Server validates `responses` against published form JSON schema; strip unknown keys; enforce required fields.
3. **File uploads on intake** — Authenticated upload after draft lead create, or size-limited anonymous upload to `{workspaceOwnerId}/intake/temp/{uuid}` with cleanup job.
4. **Message visibility** — `clientVisible` defaults `false`; only admin/member can set true.
5. **No financial leakage** — Portal and member APIs never return `rate`, `amount`, `margin`, `earnedRates` unless role is admin.

---

## Migration & Backward Compatibility

| Change | Migration |
|--------|-----------|
| Lead.userId | Backfill script + index |
| Lead.responses | Empty `{}` for legacy; map existing columns into responses on read (virtual) |
| IntakeForm | Seed `default` form from current Contact.tsx hard-coded values for Tenant #1 |
| User.role client | No auto-migration; net-new invites only |
| Contact.tsx | Feature flag `VITE_DYNAMIC_INTAKE` → fetch form vs. legacy static |

---

## Architecture Diagram (target)

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                            │
│  PublicLayout │ AdminLayout │ MemberLayout │ ClientPortalLayout │
│       │              │              │                │            │
│       └──────────────┴──────────────┴────────────────┘            │
│                              │                                     │
│              ApiAuthContext → UserContext → WorkspaceThemeContext  │
│                              │                                     │
│                     services/api.ts                                │
└──────────────────────────────┼───────────────────────────────────┘
                               │ REST
┌──────────────────────────────┼───────────────────────────────────┐
│                         SERVER (Express)                          │
│  checkJwt → requireRole* → resolvePublicWorkspace (public)        │
│                                                                   │
│  Routes: users, clients, projects, leads, intake-forms,           │
│          portal/*, dashboard/*, project-messages, ...             │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
                          MongoDB Atlas
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-27 | Initial architecture from platform expansion session |
| 2026-07-03 | DisciplineDefinition schema; Task Type overlap; A&D seed list |
