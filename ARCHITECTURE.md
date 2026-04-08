# Ask And Deliver — Architecture Document

This document provides a comprehensive technical reference for the Ask And Deliver application. It is intended for future development context, onboarding, and AI-assisted coding sessions.

## Current capabilities snapshot *(April 2026)*

**Baseline:** Production MERN app with Auth0 multi-tenant workspaces (admin / member / pending), MongoDB persistence, and Vercel + Railway split deployment.

- **Time & projects** — Live/resume timer, manual entries, project tasks, dashboard to-dos; workspace-scoped data with role-based visibility (members hide financials).
- **Billing** — Reports-driven invoice preview; persistent `Invoice` records with DRAFT → SENT → PAID lifecycle; optional **Stripe Payment Links** + webhook to mark paid; CSV export and full JSON backup.
- **Commercial** — Client proposals (`Proposal` model) with phases, investment totals, and DRAFT / FINALIZED status; lead pipeline with public intake → conversion.
- **Public site** — Portfolio (case studies, media, themes), marketing pages, post-checkout `/invoices/paid` for Stripe returns.
- **Ops** — Site config (company + theme), Cloudinary uploads, optional Auth0 M2M for add-by-email.

When this doc or the product diverges, bump the **snapshot** date or add a short changelog note under this subsection.

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
│  │         17 Route Modules (+ Stripe webhook)     │     │
│  │  health, users, clients, projects, taskTypes,    │     │
│  │  timeEntries, projectTasks, reports, invoices,   │     │
│  │  proposals, export, lineItems, portfolio,      │     │
│  │  uploads, leads, siteConfig; webhooks (Stripe) │     │
│  └──────────────────────┬──────────────────────────┘     │
│                         ▼                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 12 Mongoose  │  │  Cloudinary  │  │ Auth0 / Stripe│   │
│  │  Models      │  │  (uploads)   │  │ (M2M + links) │   │
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
| Invoices | Full CRUD + status + payment links | No access | Blocked |
| Proposals | Full CRUD + finalize | No access | Blocked |
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
 │     │     ├── budget, brief (rich-text HTML)
 │     │     ├── excerpt, year, categories, disciplines
 │     │     ├── challenge, solution, results (portfolio-aligned)
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
 │     ├── paymentLinkUrl?, stripePaymentLinkId? (Stripe Payment Links)
 │     ├── sentAt?, paidAt?, notes?
 │     └── Status transitions: DRAFT→SENT→PAID (reversible)
 │
 ├──> Proposal (userId, clientId)
 │     ├── proposalNumber, title, status: DRAFT | FINALIZED
 │     ├── proposalDate, phases[], investment (line items + fees)
 │     ├── accentSnapshot, companyInfo, clientInfo (snapshots)
 │     └── Optional projectId → Project
 │
 ├──> TaskType (userId)
 │     ├── name, rate, color
 │     └──< TimeEntry.taskTypeId, Client.taskDiscounts key
 │
 ├──> PortfolioProject (userId)
 │     ├── slug, title, client, categories, disciplines
 │     ├── images (url, caption, type: image|video, source: cloudinary|vimeo|youtube)
 │     ├── featuredImage, clientLogo
 │     ├── challenge, solution, results (string[]), testimonial
 │     ├── published, featured, order
 │     └── Cloudinary media + Vimeo/YouTube embeds via Uploads routes
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
invoiceNumber: string (auto-generated, e.g. 260322-1)
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
paymentLinkUrl?: string, stripePaymentLinkId?: string (Stripe Payment Links)
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
                                         Invoices, Proposals, Leads,
                                         PortfolioAdmin, SiteConfig, Users
```

### API Service Layer

`client/src/services/api.ts` provides two axios instances:

1. **Authenticated instance** (`api`) — Request interceptor awaits the token from `registerAccessTokenGetter` (wired in `ApiAuthContext` with `getAccessTokenSilently`). No `localStorage` bearer storage. Optional single 401 retry with `config._retry`. Used by all protected API modules.
2. **Public instance** (raw `axios`) — No auth headers. Used by `portfolioPublicApi`, `leadsPublicApi`, and `siteConfigPublicApi`.

API modules are organized as object namespaces:
```
clientsApi.getAll(), .get(id), .create(data), .update(id, data), .delete(id)
projectsApi.getAll(params), .getCounts(), .getByClient(clientId), ...
taskTypesApi.getAll(), .seedDefaults(), ...
timeEntriesApi.getAll(params), .getActive(), .start(data), .stop(), .continue(id), ...
projectTasksApi.getAll(projectId), .reorder(projectId, taskIds), .updateStatus(id, status), ...
reportsApi.generateInvoice(params), .getSummary(params)
invoicesApi.getAll(params), .getOne(id), .getStats(), .getNextNumber(), .getPaymentLinkConfig(),
  .createPaymentLink(id), .create(data), .update(id, data), .updateStatus(id, status), .delete(id)
proposalsApi.getAll(params), .getStats(), .getNextNumber(), .getOne(id), .create(data),
  .update(id, data), .updateStatus(id, status), .delete(id)
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

### Rich Text & Markdown

- **Tiptap**: Used in `BriefEditor.tsx` for WYSIWYG project brief editing (bold, italic, lists, undo/redo). Stores HTML in the Project `brief` field.
- **react-markdown**: Used in `WorkDetail.tsx` to render portfolio `challenge` and `solution` content as Markdown on public pages.
- **Video embeds**: `videoEmbed.ts` utility parses Vimeo/YouTube URLs into embed-ready URLs and thumbnail URLs. Used by `PortfolioMedia.tsx` and `MediaUpload.tsx`.

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
| | Proposals | Admin only |
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

**Auto-numbering**: Invoice numbers follow `{YY}{MM}{DD}-{SEQ}` pattern (e.g., `260322-1`). The next number is auto-generated based on the highest existing sequence for that date within the workspace.

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

### Stripe (optional)

When `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set, admins can create Stripe Payment Links for SENT invoices (`POST /api/invoices/:id/create-payment-link`). The server mounts `POST /api/webhooks/stripe` with **raw** JSON body (before `express.json()`) for signature verification. Successful `checkout.session.completed` events set the invoice to PAID. `FRONTEND_URL` controls the customer success redirect (defaults to first `CLIENT_URL` origin or localhost).

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

### Production
```
askanddeliver.com (Vercel)  ──HTTPS──>  Railway (server)
     │                                       │
     │                                       ▼
     │                                 MongoDB Atlas
     │                                 Cloudinary CDN
     └── Auth0 Universal Login ────── Auth0 Tenant
```

**Frontend**: Static build deployed to Vercel at `askanddeliver.com`. Domain managed via Network Solutions DNS (A record + CNAME). SPA routing via `client/vercel.json` rewrite rules. Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) and long-term asset caching configured in `vercel.json`.

**Backend**: Node.js server deployed to Railway. CORS `CLIENT_URL` env var supports comma-separated origins (e.g., `https://askanddeliver.com,https://www.askanddeliver.com`).

**Production checklist**:
- Set `NODE_ENV=production` on Railway
- Set `CLIENT_URL` to comma-separated production frontend origins on Railway
- Update all `localhost` URLs to production domains in Vercel env vars
- Configure Auth0 callback/logout/web origin URLs for production domains
- Use production MongoDB connection string
- Cloudinary credentials remain the same across environments

---

## Security Considerations

1. **JWT validation** — All protected routes validate Auth0-issued JWTs via RS256 + JWKS (no shared secrets)
2. **Helmet** — Sets security headers (CSP, HSTS, X-Frame-Options, etc.) with cross-origin resource policy for Cloudinary media
3. **CORS** — Origin allowlist prevents unauthorized cross-origin requests
4. **Multi-tenant isolation** — Data queries always filter by userId or workspaceOwnerId; no cross-workspace data leakage
5. **Admin middleware** — `requireAdmin` verifies role from database (not just token claims)
6. **Self-protection** — Admins cannot demote or disable their own account via the team management UI
7. **Token handling (client)** — Access tokens are not persisted in `localStorage`. Axios uses `registerAccessTokenGetter` + `getAccessTokenSilently()` per request; `Auth0Provider` uses `useRefreshTokens` and `cacheLocation="memory"`. Response interceptor may retry once on 401 with `_retry` to avoid loops.
8. **Input sanitization** — Mongoose schema validation with `trim`, `lowercase`, `required`, and `enum` constraints

---

## File Index

### Server Routes (17 + webhook)

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
| `routes/proposals.ts` | `/api/proposals` | checkJwt + requireAdmin |
| `routes/export.ts` | `/api/export` | checkJwt + requireAdmin |
| `routes/lineItems.ts` | `/api/line-items` | checkJwt + requireAdmin |
| `routes/portfolio.ts` | `/api/portfolio` | Mixed (3 public, rest checkJwt + requireAdmin) |
| `routes/uploads.ts` | `/api/uploads` | checkJwt + requireAdmin |
| `routes/leads.ts` | `/api/leads` | Mixed (1 public, rest checkJwt + requireAdmin) |
| `routes/siteConfig.ts` | `/api/site-config` | Mixed (1 public, rest checkJwt + requireAdmin) |
| `routes/webhooks.ts` | `/api/webhooks/stripe` | Stripe signature (no JWT; raw body) |

### Server Models (12 production + legacy)

| File | Collection | Key Indexes |
|------|-----------|-------------|
| `models/User.ts` | users | `auth0Id` (unique), `email` (unique), `workspaceOwnerId` |
| `models/Client.ts` | clients | `{ userId, createdAt }` |
| `models/Project.ts` | projects | `userId`, `{ userId, status }`, `{ userId, clientId }` |
| `models/TaskType.ts` | tasktypes | `userId` |
| `models/TimeEntry.ts` | timeentries | `userId`, `projectId`, `{ userId, isRunning }`, `invoiceId` |
| `models/Invoice.ts` | invoices | `{ userId, status }`, `{ userId, createdAt }`, `{ userId, invoiceNumber }` (unique) |
| `models/Proposal.ts` | proposals | `{ userId, status }`, `{ userId, proposalNumber }` |
| `models/ProjectTask.ts` | projecttasks | `{ projectId, order }`, `userId` |
| `models/LineItem.ts` | lineitems | `{ userId, clientId }`, `{ userId, date }` |
| `models/Lead.ts` | leads | `{ status, createdAt }`, `email`, `createdAt` |
| `models/PortfolioProject.ts` | portfolioprojects | `{ userId, slug }` (unique), `{ userId, published, order }`, `{ userId, published, featured }` |
| `models/SiteConfig.ts` | siteconfigs | `userId` (unique) |
| `models/Item.ts` | *(legacy)* | MERN starter artifact — unused |

### Client Contexts (3)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `contexts/ApiAuthContext.tsx` | Token lifecycle | `tokenReady`, `refetchToken()` |
| `contexts/UserContext.tsx` | Role management | `isAdmin`, `isMember`, `isPending`, `user`, `refetch()` |
| `contexts/AdminThemeContext.tsx` | Dynamic theming | `refresh()` (re-fetches and applies colors) |

### Client Pages (19)

| Page | Route | Protection | Key Features |
|------|-------|------------|-------------|
| Home | `/` | Public | Landing page |
| Work | `/work` | Public | Portfolio listing |
| WorkDetail | `/work/:slug` | Public | Portfolio detail with lightbox |
| About | `/about` | Public | About page |
| Contact | `/contact` | Public | Lead intake form |
| InvoicePaid | `/invoices/paid` | Public | Post–Stripe-checkout confirmation |
| Dashboard | `/dashboard` | Auth | Timer, quick entry, recent entries, dashboard to-dos |
| TimeEntries | `/entries` | Auth | Entry list with filters, CRUD |
| Projects | `/projects` | Auth | Project list with status tabs, tasks, rich-text briefs |
| Profile | `/profile` | Auth | User profile management |
| Clients | `/clients` | Admin | Client CRUD with discounts |
| TaskTypes | `/task-types` | Admin | Task type CRUD + seeding |
| Reports | `/reports` | Admin | Billing preview, create invoices, line items, export |
| Invoices | `/invoices` | Admin | Invoice list, status, payment links, detail |
| Proposals | `/proposals` | Admin | Proposal list, editor, preview, finalize |
| Leads | `/leads` | Admin | Lead pipeline, conversion |
| PortfolioAdmin | `/portfolio-admin` | Admin | Portfolio CRUD, media uploads, video embeds |
| SiteConfig | `/site-config` | Admin | Theme colors, palettes, company info |
| Users | `/users` | Admin | Team management, add-by-email |

---

## Utility Functions

### Server (`server/src/utils/calculations.ts`)

| Function | Purpose |
|----------|---------|
| `getDiscountPercent(client, taskTypeId)` | Reads discount % from `taskDiscounts` (Mongoose Map or plain object) |
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

### Client (`client/src/utils/videoEmbed.ts`)

| Function | Purpose |
|----------|---------|
| `parseVideoUrl(url)` | Detects Vimeo/YouTube URLs and extracts video IDs |
| `getEmbedUrl(source, videoId)` | Returns platform-specific embed URL |
| `getThumbnailUrl(source, videoId)` | Returns thumbnail URL for video previews |

---

## Known Technical Debt

1. ~~**Discount calculation duplication**~~ — Addressed: `getDiscountPercent` and `getEffectiveRate` in `server/src/utils/calculations.ts` are used by `reports.ts` and `export.ts`.
2. **Unused middleware exports** — `optionalAuth` and `loadUser` are exported from `auth.ts` but not used in any route.
3. **Legacy model** — `models/Item.ts` is a leftover from the MERN starter template.
4. **Lead scoping** — Leads have no `userId` field, making them visible to all admins across workspaces. This works for single-workspace deployments but would need scoping for multi-workspace.
5. ~~**Token in localStorage**~~ — Addressed: axios uses `registerAccessTokenGetter` + `getAccessTokenSilently()` per request; `Auth0Provider` uses `useRefreshTokens` and `cacheLocation="memory"`. Legacy `auth0_token` key is removed on load.
6. **`qs` array limit on GET query params** — Express uses the `qs` library for query string parsing, which has a default `arrayLimit` of 20. When a GET request sends more than 20 array items (e.g. `projectIds[]=...`), `qs` silently converts the parsed result from an array to a plain object (`{ '0': 'val', '1': 'val', ... }`). All GET routes that accept array query parameters must normalize the value by checking `Array.isArray()`, `typeof === 'string'`, and `typeof === 'object'` (using `Object.values()`). This pattern is implemented in `timeEntries.ts` and `lineItems.ts`. POST routes sending JSON bodies are not affected.
