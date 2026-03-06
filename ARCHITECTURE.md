# Ask And Deliver — Architecture Document

This document provides a comprehensive technical reference for the Ask And Deliver application. It is intended for future development context, onboarding, and AI-assisted coding sessions.

---

## System Overview

Ask And Deliver is a MERN stack application (MongoDB, Express, React, Node.js) with TypeScript throughout. It serves two audiences from a single deployment:

1. **Public visitors** — View portfolio, read about the business, submit project inquiries via a contact form
2. **Authenticated users** — Track time, manage clients/projects, generate invoices, manage leads, configure the site

The application supports multi-user workspaces with role-based access control, allowing a team to share projects and time data while maintaining data isolation between workspaces.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Vite + React)                 │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Public Pages  │  │ Admin Pages  │  │  Contexts     │  │
│  │ Home, Work,   │  │ Dashboard,   │  │ ApiAuth,      │  │
│  │ About, Contact│  │ Clients,     │  │ UserContext,   │  │
│  │               │  │ Projects...  │  │ AdminTheme     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         │    ┌─────────────┴──────────────┐   │          │
│         │    │    services/api.ts          │   │          │
│         │    │  (Axios auth + public)      │   │          │
│         └────┤                             ├───┘          │
│              └─────────────┬───────────────┘              │
└────────────────────────────┼────────────────────────────┘
                             │ HTTP (REST API)
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   SERVER (Express + TS)                   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │              Global Middleware                    │     │
│  │  helmet → cors → morgan → json → urlencoded      │     │
│  └──────────────────────┬──────────────────────────┘     │
│                         ▼                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │              Route Middleware                     │     │
│  │  checkJwt → requireAdmin → asyncHandler          │     │
│  └──────────────────────┬──────────────────────────┘     │
│                         ▼                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │              15 Route Modules                    │     │
│  │  health, users, clients, projects, taskTypes,    │     │
│  │  timeEntries, projectTasks, reports, invoices,   │     │
│  │  export, lineItems, portfolio, uploads, leads,   │     │
│  │  siteConfig                                      │     │
│  └──────────────────────┬──────────────────────────┘     │
│                         ▼                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  11 Mongoose  │  │  Cloudinary  │  │  Auth0 M2M   │   │
│  │   Models      │  │  (uploads)   │  │  (user lookup)│   │
│  └──────┬───────┘  └──────────────┘  └──────────────┘   │
│         │                                                 │
└─────────┼─────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────┐
│   MongoDB Atlas  │
└─────────────────┘
```

---

## Authentication & Authorization

### Auth Flow

```
Browser                    Auth0                    Express Server
  │                         │                          │
  │── Login click ─────────>│                          │
  │<── Universal Login ─────│                          │
  │── Credentials ─────────>│                          │
  │<── Access Token (JWT) ──│                          │
  │                         │                          │
  │── API request + JWT ───────────────────────────────>│
  │                         │                          │── checkJwt (validates JWT)
  │                         │<── JWKS verification ────│
  │                         │── Public key ───────────>│
  │                         │                          │── extractUserId (from sub claim)
  │                         │                          │── Route handler
  │<── JSON response ─────────────────────────────────│
```

### Auth Middleware Stack

| Middleware | Purpose | Usage |
|-----------|---------|-------|
| `checkJwt` | Validates Auth0 JWT via RS256 + JWKS | All protected routes |
| `extractUserId(req)` | Returns `req.auth.payload.sub` (Auth0 user ID) | Inside route handlers |
| `requireAdmin` | Loads user from DB, checks `role === 'admin'`, returns 403 if not | Admin-only routes |
| `getWorkspaceOwnerId(req)` | Resolves workspace owner: admin→self, member→their admin | Workspace-scoped queries |
| `optionalAuth` | Non-blocking auth — passes through without token | Exported but unused |
| `loadUser` | Loads full User document, attaches to `req.user` | Exported but unused |

### Role Assignment Logic

On `GET /api/users/me` (first login auto-creates user):

1. If `PRIMARY_ADMIN_EMAIL` env var matches user email → **admin**
2. If existing user has a non-pending role → keep it
3. If existing user has no role (migration) → **admin**
4. If first user in the database → **admin**
5. All other new signups → **pending**

### Permission Matrix

| Feature | Admin | Member | Pending |
|---------|-------|--------|---------|
| Dashboard + Timer | Full (with rates) | Time only (no rates) | Blocked |
| Time Entries | All workspace entries | Own entries only | Blocked |
| Projects | Full CRUD | Read only | Blocked |
| Clients | Full CRUD | No access | Blocked |
| Task Types | Full CRUD + seed | Read only | Blocked |
| Reports/Invoice | Full access | No access | Blocked |
| Invoices | Full CRUD + status | No access | Blocked |
| Export (CSV/Backup) | Full access | No access | Blocked |
| Line Items | Full CRUD | No access | Blocked |
| Leads | Full access | No access | Blocked |
| Portfolio | Full CRUD | No access | Blocked |
| Site Config | Full access | No access | Blocked |
| Team Management | Full access | No access | Blocked |
| Profile | Own profile | Own profile | Blocked |

---

## Data Architecture

### Multi-Tenant Scoping

The application uses a workspace-based multi-tenancy model where all data is scoped to prevent cross-tenant access.

```
┌─────────────────────────────────────────┐
│            Workspace (Admin)            │
│  workspaceOwnerId = admin.auth0Id       │
│                                         │
│  ┌─────────────┐  ┌─────────────┐      │
│  │  Admin User  │  │  Member #1  │      │
│  │  role: admin │  │  role: member│      │
│  │  workspace:  │  │  workspace:  │      │
│  │   (self)     │  │  admin.id   │      │
│  └──────┬───────┘  └──────┬──────┘      │
│         │                  │             │
│  ┌──────┴──────────────────┴──────┐      │
│  │     Shared Data (Pattern B)    │      │
│  │  Projects, TaskTypes,          │      │
│  │  ProjectTasks, TimeEntries,    │      │
│  │  Reports, Export               │      │
│  │  (userId = admin.auth0Id)      │      │
│  └────────────────────────────────┘      │
│                                         │
│  ┌────────────────────────────────┐      │
│  │    Admin-Only Data (Pattern A) │      │
│  │  Clients, LineItems, Portfolio,│      │
│  │  SiteConfig, Uploads           │      │
│  │  (userId = extractUserId)      │      │
│  └────────────────────────────────┘      │
│                                         │
│  ┌────────────────────────────────┐      │
│  │    Global Data (No scoping)    │      │
│  │  Leads (public intake form)    │      │
│  └────────────────────────────────┘      │
└─────────────────────────────────────────┘
```

**Pattern A — Direct userId scoping**: `userId = extractUserId(req)`. Admin-only data where members have no access. Entity's `userId` matches the authenticated user's Auth0 sub.

**Pattern B — Workspace scoping**: `userId = await getWorkspaceOwnerId(req)`. Shared data that both admin and members can read. For admins, returns their own auth0Id. For members, returns their `workspaceOwnerId` (the admin's auth0Id). This means all workspace data is stored under the admin's userId, and members access it through the workspace owner resolution.

**Time entry dual scoping**: Admin sees all workspace entries (queried via workspace owner). Member sees only entries where `userId` matches their own auth0Id. Members create entries with their own userId, but those entries are linked to workspace-owned projects.

### Entity Relationship Diagram

```
User (auth0Id)
 │
 ├──> Client (userId)
 │     ├── taskDiscounts: Map<TaskType._id, discountPercent>
 │     ├── businessEntity, address, paymentPreference
 │     │
 │     ├──> Project (clientId, userId)
 │     │     ├── status: ACTIVE | PAUSED | COMPLETED | ARCHIVED
 │     │     ├── budget
 │     │     │
 │     │     ├──> ProjectTask (projectId, userId)
 │     │     │     ├── status: TODO | IN_PROGRESS | COMPLETED
 │     │     │     ├── order, estimatedHours
 │     │     │     │
 │     │     │     └──< TimeEntry.projectTaskId
 │     │     │
 │     │     ├──> TimeEntry (projectId, taskTypeId, userId)
 │     │     │     ├── startTime, endTime, duration, isRunning
 │     │     │     ├── invoiceId? → Invoice (set when billed)
 │     │     │     └── Accumulates duration across pause/resume
 │     │     │
 │     │     └──> LineItem (clientId, projectId?, userId)
 │     │           ├── description, amount, category, date
 │     │           ├── invoiceId? → Invoice (set when billed)
 │     │           └── Fixed-cost (non-hourly) charges
 │     │
 │     └──< LineItem (clientId, no projectId)
 │
 ├──> Invoice (userId, clientId)
 │     ├── invoiceNumber, status: DRAFT | SENT | PAID
 │     ├── dateRange, companyInfo (snapshot), clientInfo (snapshot)
 │     ├── items (snapshot of line items at creation)
 │     ├── total, totalHours, totalEarned, totalMargin
 │     ├── timeEntryIds[] → TimeEntry, lineItemIds[] → LineItem
 │     ├── sentAt?, paidAt?, notes?
 │     └── Status transitions: DRAFT→SENT→PAID (reversible)
 │
 ├──> TaskType (userId)
 │     ├── name, rate, color
 │     └──< TimeEntry.taskTypeId, Client.taskDiscounts key
 │
 ├──> PortfolioProject (userId)
 │     ├── slug, title, client, categories, disciplines
 │     ├── images (url + caption), featuredImage
 │     ├── challenge, solution, results, testimonial
 │     ├── published, featured, order
 │     └── Cloudinary media via Uploads routes
 │
 ├──> SiteConfig (userId)
 │     ├── colors (8 brand colors)
 │     ├── palettes (named presets)
 │     └── companyName, companyAddress, companyPhone, companyEmail
 │
 └──> Lead (NO userId — global)
       ├── confidence: YES | MAYBE | UNSURE
       ├── projectType, description, budget, timeline
       ├── name, email, company, message
       ├── status: NEW | CONTACTED | QUALIFIED | PROPOSAL | WON | LOST
       ├── priority: LOW | MEDIUM | HIGH
       ├── notes: [{ text, createdAt, createdBy }]
       └── convertedClientId?, convertedProjectId?
```

### Key Model Details

#### User
```
auth0Id: string (unique, indexed)
email: string (unique, lowercase)
name: string
nickname?: string (lowercase, used for add-by-email)
picture?: string
role: 'admin' | 'member' | 'pending'
status: 'active' | 'pending' | 'disabled'
workspaceOwnerId?: string (indexed — admin's auth0Id for members)
earnedRates?: Record<string, number> (taskTypeId → earned hourly rate)
invitedBy?: string
```

#### Client
```
userId: string (indexed)
name: string (required)
company?: string
email?: string
businessEntity?: string (official entity for invoices)
address?: string (for invoices)
paymentPreference?: 'MAILED' | 'ACH' (default: MAILED)
taskDiscounts: Map<string, number> (taskTypeId → discount 0-100%)
```

#### TimeEntry
```
userId: string (indexed — the person who tracked the time)
projectId: ObjectId → Project
taskTypeId: ObjectId → TaskType
projectTaskId?: ObjectId → ProjectTask
invoiceId?: ObjectId → Invoice (null = unbilled, set when SENT)
description?: string
startTime: Date
endTime?: Date
duration: number (seconds, accumulates across pause/resume)
isRunning: boolean (true = active timer)
```

#### Invoice
```
userId: string (workspace owner)
invoiceNumber: string (auto-generated, e.g. INV-2026-001)
clientId: ObjectId → Client
projectIds: ObjectId[] → Project[]
status: 'DRAFT' | 'SENT' | 'PAID'
dateRange: { start: Date, end: Date }
companyInfo: { name, address, phone, email } (snapshot at creation)
clientInfo: { name, company, email, businessEntity, address, paymentPreference } (snapshot)
items: InvoiceLineItem[] (task-type rollups — snapshot)
subtotal: number
total: number
totalHours: number, totalEarned: number, totalMargin: number
timeEntryIds: ObjectId[] → TimeEntry[]
lineItemIds: ObjectId[] → LineItem[]
sentAt?: Date, paidAt?: Date
notes?: string
```

---

## Frontend Architecture

### Context Hierarchy

```
Auth0Provider
  └── ApiAuthProvider (token lifecycle, tokenReady flag)
       └── UserProvider (user role, workspace)
            └── Routes
                 ├── PublicLayout (no auth required)
                 │    └── Home, Work, WorkDetail, About, Contact
                 │
                 └── ProtectedRoute (requires tokenReady)
                      └── AdminThemeProvider (dynamic CSS variables)
                           └── Layout (sidebar + topbar)
                                ├── Dashboard, Entries, Projects, Profile
                                └── AdminRoute (requires isAdmin)
                                     └── Clients, TaskTypes, Reports,
                                         Leads, PortfolioAdmin, SiteConfig, Users
```

### API Service Layer

`client/src/services/api.ts` provides two axios instances:

1. **Authenticated instance** (`api`) — Has a request interceptor that attaches the Auth0 bearer token. Used by all protected API modules.
2. **Public instance** (raw `axios`) — No auth headers. Used by `portfolioPublicApi`, `leadsPublicApi`, and `siteConfigPublicApi`.

API modules are organized as object namespaces:
```
clientsApi.getAll(), .get(id), .create(data), .update(id, data), .delete(id)
projectsApi.getAll(params), .getCounts(), .getByClient(clientId), ...
taskTypesApi.getAll(), .seedDefaults(), ...
timeEntriesApi.getAll(params), .getActive(), .start(data), .stop(), .continue(id), ...
projectTasksApi.getAll(projectId), .reorder(projectId, taskIds), .updateStatus(id, status), ...
reportsApi.generateInvoice(params), .getSummary(params)
invoicesApi.getAll(params), .getOne(id), .getStats(), .getNextNumber(), .create(data), .update(id, data), .updateStatus(id, status), .delete(id)
exportApi.csv(params), .backup()
lineItemsApi.getAll(params), .create(data), ...
portfolioApi.getAll(), .reorder(ids), .togglePublish(id), .toggleFeature(id), .seed(projects), ...
portfolioPublicApi.getAll(), .getFeatured(), .getBySlug(slug)
uploadsApi.uploadSingle(slug, file), .uploadMultiple(slug, files), .list(slug), .delete(slug, filename)
leadsApi.getAll(params), .getStats(), .addNote(id, text), .convert(id, payload), ...
leadsPublicApi.submit(data)
siteConfigApi.get(), .updateColors(colors), .resetColors(), .updateCompany(data), .savePalette(name), ...
siteConfigPublicApi.getColors()
usersApi.getMe(), .updateMe(data), .deleteMe(), .getAll(), .addByEmail(email), .updateUser(id, data), .deleteUser(id)
```

### Theme System

The `AdminThemeContext` implements dynamic theming:

1. Fetches `SiteConfig.colors` from the API on mount
2. Generates a `--primary-50` through `--primary-900` color scale from `brandSage` using RGB interpolation
3. Sets CSS custom properties on the admin layout wrapper element:
   - `--admin-primary`, `--admin-primary-light`, `--admin-primary-dark`
   - `--admin-cream`, `--admin-cream-dark`, `--admin-charcoal`
   - `--accent-warm`, `--accent-cool`
   - `--primary-50` through `--primary-900`
4. Tailwind classes reference these variables (e.g., `bg-primary-600`, `text-primary-50`)
5. Public site fetches colors via `/api/site-config/public` and applies them independently

### Sidebar Navigation Structure

| Section | Items | Visibility |
|---------|-------|------------|
| *(Top)* | Dashboard | All users |
| **Time Tracking** | Entries | All users |
| | Reports | Admin only |
| | Invoices | Admin only |
| **Manage** | Clients | Admin only |
| | Projects | All users |
| **Business** | Leads | Admin only |
| | Portfolio | Admin only |
| **Settings** *(bottom)* | Team | Admin only |
| | Task Types | Admin only |
| | Site Config | Admin only |
| | Profile | All users |

---

## Business Logic

### Timezone-Aware Date Handling

The server runs in UTC (Railway). All date range filters are timezone-adjusted by the frontend so they match the user's local day boundaries:

1. **Frontend**: `toUTCStartOfDay(dateStr)` / `toUTCEndOfDay(dateStr)` convert a `YYYY-MM-DD` picker value to a full UTC ISO string representing midnight / end-of-day in the user's local timezone. These are sent to the server as `startDate` / `endDate`.
2. **Server**: `parseDateStart(dateStr)` / `parseDateEnd(dateStr)` accept both full ISO strings (timezone-adjusted) and bare `YYYY-MM-DD` (falls back to UTC). All date range queries in routes use these utilities.
3. **Date-only fields** (e.g. `LineItem.date`): Stored via `parseDateStart()` so they align with query boundaries. Displayed on the client with `formatDate()` which uses `toLocaleDateString()`.
4. **Helper defaults**: `getTodayString()` / `getDaysAgoString()` use local-timezone date components (not `.toISOString().split('T')[0]` which would be UTC).

### Discount Calculation

The core pricing model allows per-client, per-task-type discount percentages:

```typescript
// For a given client and task type:
const discount = client.taskDiscounts.get(taskType._id) || 0;
const clampedDiscount = Math.min(100, Math.max(0, discount));
const effectiveRate = taskType.rate * (1 - clampedDiscount / 100);
const amount = (durationSeconds / 3600) * effectiveRate;
```

Example: Design at $75/hr with 50% client discount = $37.50/hr effective rate.

### Invoice Generation

The `POST /api/reports/generate-invoice` endpoint:

1. Fetches time entries for the specified date range, client, and project filters
2. Fetches line items for the same filters
3. Groups time entries by task type
4. For each group:
   - Looks up the client's discount for that task type
   - Computes effective rate = base rate × (1 - discount/100)
   - Computes billed amount = hours × effective rate
   - If the entry's user has `earnedRates` for that task type, computes earned amount = hours × earned rate
   - Computes margin = billed - earned
5. Adds fixed-cost line items (flagged with `isFixedCost: true`)
6. Includes company info from SiteConfig (companyName, address, phone, email)
7. Includes client billing details (businessEntity, address, paymentPreference)
8. Returns the complete invoice data structure with totals, cost breakdown, and per-entry details

### Invoice Lifecycle

Invoices are persistent records created from the Reports page preview. They snapshot financial data at creation time for tax/legal integrity while maintaining references to source entries for traceability.

**Status transitions:**
```
DRAFT ──→ SENT ──→ PAID
  ↑         │        │
  └─────────┘        │
  ↑                   │
  └───── (via SENT) ──┘
```

- **DRAFT → SENT**: Sets `sentAt`, links entries (`invoiceId` set on TimeEntry/LineItem)
- **SENT → PAID**: Sets `paidAt`, entries hidden from active views (billing status filter)
- **SENT → DRAFT** (reversal): Clears `sentAt`, unlinks entries (`invoiceId = null`)
- **PAID → SENT** (reversal): Clears `paidAt`, entries reappear in active views
- **Delete**: Only allowed for DRAFT; unlinks all entries

**Entry visibility**: The `billingStatus` query parameter on `GET /api/time-entries` filters entries:
- `unbilled` (default on Time Entries page): entries not on a PAID invoice
- `paid`: entries on a PAID invoice only
- `all`: no filtering

**Auto-numbering**: Invoice numbers follow `INV-{YEAR}-{SEQ}` pattern (e.g., `INV-2026-001`). The next number is auto-generated based on the highest existing number for the workspace.

### Timer Behavior

- **Start**: Creates a new TimeEntry with `isRunning: true`, `startTime: now`, `duration: 0`. Auto-stops any existing running timer (accumulating its elapsed duration).
- **Stop**: Sets `isRunning: false`, `endTime: now`, adds elapsed session time to `duration`.
- **Continue**: Resumes a previously stopped entry — sets `isRunning: true`, `startTime: now`, preserves accumulated `duration`. Auto-stops any other running timer first.
- **Duration accumulation**: On stop, `duration += (now - startTime)` in seconds. This means the `duration` field always reflects total tracked time, even across multiple start/stop cycles.

### Lead Conversion Flow

1. Public visitor submits contact form → Lead created with `status: NEW`
2. Admin reviews lead, updates status through pipeline (CONTACTED → QUALIFIED → PROPOSAL)
3. Admin converts lead:
   - Creates a new Client from lead's contact info
   - Creates a new Project linked to that client
   - Sets lead `status: WON`
   - Links `convertedClientId` and `convertedProjectId` on the lead

---

## External Service Integration

### Auth0

| Component | Type | Purpose |
|-----------|------|---------|
| SPA Application | Auth0 App | Frontend login/logout, access tokens |
| API Identifier | Auth0 API | Backend JWT audience validation |
| M2M Application | Auth0 App | (Optional) Server-side user lookup for "Add by Email" |

The M2M application requires the `read:users` scope on the Auth0 Management API. See `server/AUTH0_M2M_SETUP.md`.

### Cloudinary

Used for portfolio media storage. Supports:
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Videos**: MP4, MOV, WebM (up to 100MB)
- **Organization**: Files stored under `portfolio/{projectSlug}/` prefix
- **Operations**: Upload (single/multiple), list, delete

### MongoDB Atlas

- Connection via Mongoose ODM
- Indexes defined on each model for query performance
- Compound indexes for multi-tenant queries (e.g., `{ userId: 1, createdAt: -1 }`)
- Unique compound indexes where needed (e.g., `{ userId: 1, slug: 1 }` on PortfolioProject)

---

## Deployment Architecture

### Development
```
localhost:5173 (Vite dev server) ──proxy──> localhost:3001 (Express)
                                                   │
                                                   ▼
                                           MongoDB Atlas
                                           Cloudinary CDN
                                           Auth0 Tenant
```

### Production (Recommended)
```
Vercel (client/dist)     ──HTTPS──>    Railway/Render (server)
     │                                       │
     │                                       ▼
     │                                 MongoDB Atlas
     │                                 Cloudinary CDN
     └── Auth0 Universal Login ────── Auth0 Tenant
```

**Frontend**: Static build deployed to Vercel/Netlify. SPA with `vercel.json` rewrite rules for client-side routing.

**Backend**: Node.js server deployed to Railway, Render, or Fly.io. Requires environment variables for MongoDB, Auth0, and Cloudinary.

**Production checklist**:
- Update all `localhost` URLs to production domains
- Set `NODE_ENV=production`
- Configure Auth0 callback/logout/web origin URLs for production
- Use production MongoDB connection string
- CORS origin allowlist must include production frontend URL

---

## Security Considerations

1. **JWT validation** — All protected routes validate Auth0-issued JWTs via RS256 + JWKS (no shared secrets)
2. **Helmet** — Sets security headers (CSP, HSTS, X-Frame-Options, etc.) with cross-origin resource policy for Cloudinary media
3. **CORS** — Origin allowlist prevents unauthorized cross-origin requests
4. **Multi-tenant isolation** — Data queries always filter by userId or workspaceOwnerId; no cross-workspace data leakage
5. **Admin middleware** — `requireAdmin` verifies role from database (not just token claims)
6. **Self-protection** — Admins cannot demote or disable their own account via the team management UI
7. **Token storage** — Access tokens stored in localStorage with the `auth0_token` key; refreshed via Auth0 SDK
8. **Input sanitization** — Mongoose schema validation with `trim`, `lowercase`, `required`, and `enum` constraints

---

## File Index

### Server Routes (15)

| File | Mount | Auth Pattern |
|------|-------|-------------|
| `routes/health.ts` | `/api/health` | None |
| `routes/users.ts` | `/api/users` | checkJwt; requireAdmin on admin endpoints |
| `routes/clients.ts` | `/api/clients` | checkJwt + requireAdmin |
| `routes/projects.ts` | `/api/projects` | checkJwt; requireAdmin on writes |
| `routes/taskTypes.ts` | `/api/task-types` | checkJwt; requireAdmin on writes |
| `routes/timeEntries.ts` | `/api/time-entries` | checkJwt (internal admin check for scoping) |
| `routes/projectTasks.ts` | `/api/project-tasks` | checkJwt; requireAdmin on writes |
| `routes/reports.ts` | `/api/reports` | checkJwt + requireAdmin |
| `routes/invoices.ts` | `/api/invoices` | checkJwt + requireAdmin |
| `routes/export.ts` | `/api/export` | checkJwt + requireAdmin |
| `routes/lineItems.ts` | `/api/line-items` | checkJwt + requireAdmin |
| `routes/portfolio.ts` | `/api/portfolio` | Mixed (3 public, rest checkJwt + requireAdmin) |
| `routes/uploads.ts` | `/api/uploads` | checkJwt + requireAdmin |
| `routes/leads.ts` | `/api/leads` | Mixed (1 public, rest checkJwt + requireAdmin) |
| `routes/siteConfig.ts` | `/api/site-config` | Mixed (1 public, rest checkJwt + requireAdmin) |

### Server Models (11)

| File | Collection | Key Indexes |
|------|-----------|-------------|
| `models/User.ts` | users | `auth0Id` (unique), `email` (unique), `workspaceOwnerId` |
| `models/Client.ts` | clients | `{ userId, createdAt }` |
| `models/Project.ts` | projects | `userId`, `{ userId, status }`, `{ userId, clientId }` |
| `models/TaskType.ts` | tasktypes | `userId` |
| `models/TimeEntry.ts` | timeentries | `userId`, `projectId`, `{ userId, isRunning }`, `invoiceId` |
| `models/Invoice.ts` | invoices | `{ userId, status }`, `{ userId, createdAt }`, `{ userId, invoiceNumber }` (unique) |
| `models/ProjectTask.ts` | projecttasks | `{ projectId, order }`, `userId` |
| `models/LineItem.ts` | lineitems | `{ userId, clientId }`, `{ userId, date }` |
| `models/Lead.ts` | leads | `{ status, createdAt }`, `email`, `createdAt` |
| `models/PortfolioProject.ts` | portfolioprojects | `{ userId, slug }` (unique), `{ userId, published, order }` |
| `models/SiteConfig.ts` | siteconfigs | `userId` (unique) |

### Client Contexts (3)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `contexts/ApiAuthContext.tsx` | Token lifecycle | `tokenReady`, `refetchToken()` |
| `contexts/UserContext.tsx` | Role management | `isAdmin`, `isMember`, `isPending`, `user`, `refetch()` |
| `contexts/AdminThemeContext.tsx` | Dynamic theming | `refresh()` (re-fetches and applies colors) |

### Client Pages (17)

| Page | Route | Protection | Key Features |
|------|-------|------------|-------------|
| Home | `/` | Public | Landing page |
| Work | `/work` | Public | Portfolio listing |
| WorkDetail | `/work/:slug` | Public | Portfolio detail with lightbox |
| About | `/about` | Public | About page |
| Contact | `/contact` | Public | Lead intake form |
| Dashboard | `/dashboard` | Auth | Timer, quick entry, recent entries |
| TimeEntries | `/entries` | Auth | Entry list with filters, CRUD |
| Projects | `/projects` | Auth | Project list with status tabs, tasks |
| Profile | `/profile` | Auth | User profile management |
| Clients | `/clients` | Admin | Client CRUD with discounts |
| TaskTypes | `/task-types` | Admin | Task type CRUD + seeding |
| Reports | `/reports` | Admin | Billing preview, create invoices, line items, export |
| Invoices | `/invoices` | Admin | Invoice list, status management (DRAFT/SENT/PAID), detail view |
| Leads | `/leads` | Admin | Lead pipeline, conversion |
| PortfolioAdmin | `/portfolio-admin` | Admin | Portfolio CRUD, uploads |
| SiteConfig | `/site-config` | Admin | Theme colors, palettes, company info |
| Users | `/users` | Admin | Team management, add-by-email |

---

## Utility Functions

### Server (`server/src/utils/calculations.ts`)

| Function | Purpose |
|----------|---------|
| `getEffectiveRate(taskType, client)` | Applies client discount to task type base rate |
| `calculateAmount(durationSeconds, effectiveRate)` | Computes billable amount from time and rate |
| `formatDuration(totalSeconds)` | Returns `HH:MM:SS` format |
| `formatCurrency(amount)` | USD currency format (`$1,234.56`) |
| `secondsToHours(seconds)` | Converts to decimal hours (2 decimal places) |

### Client (`client/src/utils/calculations.ts`)

| Function | Purpose |
|----------|---------|
| `getEffectiveRate(taskType, client)` | Client-side discount calculation (mirrors server) |
| `calculateAmount(durationSeconds, effectiveRate)` | Client-side amount calculation |
| `formatDuration(totalSeconds)` | `HH:MM:SS` format |
| `formatDurationHuman(totalSeconds)` | Human-readable format (`2h 30m`) |
| `formatCurrency(amount)` | USD currency format |
| `secondsToHours(seconds)` | Decimal hours |
| `formatDate(dateStr)` | Display date (`Mar 4, 2026`) |
| `toDateTimeLocal(dateStr)` | Convert to `datetime-local` input value |
| `getTodayString()` | Today as `YYYY-MM-DD` |
| `getDaysAgoString(days)` | N days ago as `YYYY-MM-DD` |

---

## Known Technical Debt

1. **Discount calculation duplication** — The effective rate formula is implemented in three places: `server/src/utils/calculations.ts`, `server/src/routes/reports.ts`, and `server/src/routes/export.ts`. Should be consolidated to use the shared utility.
2. **Unused middleware exports** — `optionalAuth` and `loadUser` are exported from `auth.ts` but not used in any route.
3. **Legacy model** — `models/Item.ts` is a leftover from the MERN starter template.
4. **Lead scoping** — Leads have no `userId` field, making them visible to all admins across workspaces. This works for single-workspace deployments but would need scoping for multi-workspace.
5. **Token in localStorage** — Auth tokens are stored in localStorage (`auth0_token` key) which is vulnerable to XSS. Consider migrating to Auth0's built-in token caching with `useRefreshTokens` and `cacheLocation: 'memory'`.
6. **`qs` array limit on GET query params** — Express uses the `qs` library for query string parsing, which has a default `arrayLimit` of 20. When a GET request sends more than 20 array items (e.g. `projectIds[]=...`), `qs` silently converts the parsed result from an array to a plain object (`{ '0': 'val', '1': 'val', ... }`). All GET routes that accept array query parameters must normalize the value by checking `Array.isArray()`, `typeof === 'string'`, and `typeof === 'object'` (using `Object.values()`). This pattern is implemented in `timeEntries.ts` and `lineItems.ts`. POST routes sending JSON bodies are not affected.
