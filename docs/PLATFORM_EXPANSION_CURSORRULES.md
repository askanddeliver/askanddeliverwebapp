# Platform Expansion — Cursor Rules Additions

**Status:** Planning (June 2026)  
**Parent:** [PLATFORM_EXPANSION_BUILD_PLAN.md](./PLATFORM_EXPANSION_BUILD_PLAN.md)

Merge these sections into `askanddeliverwebapp/.cursorrules` **when implementation begins** (Phase 1+). Until then, reference this file in planning sessions.

---

## Platform Identity

Ask And Deliver is **Tenant #1** of a reusable **creative agency platform**. Multiple outfits may share one deployment. Never add tenant-specific `if (email === '...')` branches — use workspace/tenant resolution only.

**Planning docs (read before large features):**
- `docs/PLATFORM_EXPANSION_BUILD_PLAN.md`
- `docs/PLATFORM_EXPANSION_ARCHITECTURE.md`
- `docs/PLATFORM_EXPANSION_CONTEXTS.md`
- `docs/PLATFORM_EXPANSION_PROMPTS.md`
- `docs/SAAS_CONVERSION_BUILD_PLAN.md` (subscription + subdomain layer)

---

## Expanded Role System

| Role | Shell | Default route |
|------|-------|---------------|
| `admin` | AdminLayout (`/dashboard`, CRM, billing) | `/dashboard` |
| `member` | MemberLayout (`/member/*`) | `/member` |
| `client` | ClientPortalLayout (`/portal/*`) | `/portal` |
| `pending` | Pending gate | `/pending` |

### Rules

1. Load role from MongoDB via `GET /api/users/me` — **never** from JWT custom claims alone.
2. Use `homeRoute` from `UserContext` for logo/home redirects — do not hard-code `/dashboard` for all users.
3. **`client` role** must have `clientId` set. Portal APIs use `user.clientId` from DB — never from request query/body.
4. Admins may access member routes; members **must not** access admin-only routes or financial APIs.
5. Client users **must not** receive: rates, amounts, margin, earnedRates, other clients' data, DRAFT invoices.

### New middleware (server)

- `requireClient` — role === `client`, active, clientId present
- `requireMemberOrAdmin` — creative + admin shared routes
- `resolveClientScope(req)` — returns clientId for portal queries

---

## Data Scoping Extensions

Existing Pattern A / B rules in `.cursorrules` still apply. Add:

**Pattern C — Client portal scoping:**
```typescript
const ownerId = await getWorkspaceOwnerId(req);
const clientId = req.user.clientId; // from loaded User doc
Project.find({ userId: ownerId, clientId });
Invoice.find({ userId: ownerId, clientId, status: { $in: ['SENT', 'PAID'] } });
```

**Pattern D — Public with workspace resolution:**
```typescript
const workspaceOwnerId = await resolvePublicWorkspace(req);
// Use for: intake-forms/public, leads/public, portfolio/public, site-config/public
```

**Lead model** must include `userId` (workspace owner). `POST /api/leads/public` sets userId from resolver — never from client body.

**IntakeForm** follows Pattern A (`userId = extractUserId` / workspace owner for admin CRUD).

**ProjectMessage** follows Pattern B.

---

## Lead Intake (Configurable Forms)

- **`IntakeForm`** — workspace-scoped form definition (steps, fields, validation, conditionals).
- **`Lead.responses`** — `Record<fieldKey, unknown>` for dynamic answers; map `mapsTo` fields to top-level Lead columns on submit.
- Public renderer fetches `GET /api/intake-forms/public?slug=default` with `X-Public-Workspace` header.
- Admin builder at `/intake-config` — publish increments `version`.
- Validate submissions server-side against **published** schema — strip unknown keys.

### Field types (v1)

`text`, `textarea`, `email`, `phone`, `url`, `number`, `single_select`, `multi_select`, `boolean`, `file`, `date`

### File uploads on intake

Path: `{workspaceOwnerId}/intake/{leadId}/{filename}` on Cloudinary. Size limits enforced server-side.

---

## Layouts & Routes

Three authenticated shells — do not put portal pages in admin Sidebar:

| Layout | Path prefix | Nav component |
|--------|-------------|---------------|
| AdminLayout | `/dashboard`, `/clients`, `/leads`, `/intake-config`, … | `Sidebar.tsx` |
| MemberLayout | `/member/*` | `MemberSidebar.tsx` |
| ClientPortalLayout | `/portal/*` | `PortalNav.tsx` |

Route guards: `AdminRoute`, `MemberOrAdminRoute`, `ClientRoute` — see `PLATFORM_EXPANSION_CONTEXTS.md`.

Rename consideration: `AdminThemeContext` → `WorkspaceThemeContext` (applies to all shells).

---

## Tenant Discipline Taxonomy (locked)

- **`SiteConfig.disciplines: DisciplineDefinition[]`** — each discipline has nested `tasks[]` linked to TaskTypes. See `docs/PLATFORM_EXPANSION_DISCIPLINES_AND_TASK_TYPES.md`.
- **Intake** uses field type `disciplines_needed` — admin picks which disciplines appear per form (`disciplineOptionIds`), not auto-all tasks.
- **Member profile** can assign disciplines and optional nested tasks (e.g. Development → Testing).
- Filter by context: projects use `showOnProject`; member profile uses `assignableToMember` at discipline and task level.

---

## Client Portal Invites (locked)

- **Admin invite only** — no client self-signup.
- Admin UI: "Invite to portal" on Clients page (row action + modal) → `POST /api/users/invite-client`.
- Client user must have `role: 'client'` and `clientId` linked to CRM Client record.

---

## Member Profile

Member profile fields on `User`:
- `disciplines: string[]`
- `availability: { hoursPerWeek, preferredDays, timezone, outOfOffice?, notes? }`
- `bio?: string`

Project assignment:
- `Project.assignedMemberIds?: string[]` (auth0Ids)
- `ProjectTask.assigneeAuth0Id?: string`

Members update own profile via `PUT /api/users/me` (restricted fields). Admin sets earnedRates via team UI.

---

## Client Portal (v1 locked)

See `docs/PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md`. Projects + brief + client-visible tasks + per-project messaging (client read/reply). Messages live on `/portal/projects/:id` — no global inbox. Invoices = Phase 7b optional.

---

## Admin Command Center

Dashboard aggregates via `GET /api/dashboard/admin-summary`, `/pipeline`, `/capacity`.

Follow design tokens in `docs/Design System Update/design_handoff_admin_redesign/` — 56px icon rail, stat strip, breadcrumb topbar.

---

## Multi-Tenant Public API

Public axios instance must send workspace context:
```typescript
config.headers['X-Public-Workspace'] = workspaceKey;
```

Server: `resolvePublicWorkspace(req)` — subdomain (future) or `DEFAULT_PUBLIC_WORKSPACE_OWNER_ID` (legacy).

---

## Implementation Discipline

1. **One PR / one Cursor session per phase** in `PLATFORM_EXPANSION_PROMPTS.md`.
2. **Auth and scoping before UI polish** — portal shell is useless without `requireClient` enforcement.
3. **Seed IntakeForm** from current `Contact.tsx` constants for Tenant #1 — no regression on public form.
4. **Feature flags** optional: `dynamicIntake`, `clientPortal` in workspace features endpoint.
5. Update `ARCHITECTURE.md`, `README.md`, and this merge target when each phase completes.

---

## Project Messaging (v1 — locked)

- `ProjectMessage` with **`clientVisible` toggle** on compose (default `false`).
- No DMs, @mentions, or email notifications in v1 — validate usage first.

---

## Intake v1 Priorities (locked)

Seed and prioritize: **disciplines needed** (`disciplines_needed` field — admin-curated discipline ids), **timeline**, **budget**, **file upload**. Intake is discipline-level only; tasks nest under disciplines for internal/billing use.

---

## Anti-Patterns (Do Not)

- ❌ Accept `workspaceId` or `clientId` from unauthenticated POST bodies without host validation
- ❌ Show admin Sidebar to client role users
- ❌ Store intake form definitions in frontend constants (except seed migration)
- ❌ Return `taskType.rate` or invoice totals to `member` or `client` roles inappropriately
- ❌ Skip `userId` on new Mongoose models
- ❌ Bundle SaaS Tenant model + client portal + intake builder in one PR

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-03 | Locked decisions: `/member`, discipline taxonomy, client invites, messaging v1 |
