# Platform Expansion — Master Build Plan

**Status:** Planning (June 2026)  
**Scope:** Feature expansion for Ask And Deliver as **Tenant #1** of a reusable creative-agency platform — without forking the codebase per outfit.

This document is the **index** for the expansion program. Companion docs:

| Document | Purpose |
|----------|---------|
| [PLATFORM_EXPANSION_ARCHITECTURE.md](./PLATFORM_EXPANSION_ARCHITECTURE.md) | Target architecture, roles, data models, routing |
| [PLATFORM_EXPANSION_CONTEXTS.md](./PLATFORM_EXPANSION_CONTEXTS.md) | React context hierarchy, API patterns, tenant resolution |
| [PLATFORM_EXPANSION_CURSORRULES.md](./PLATFORM_EXPANSION_CURSORRULES.md) | Additions to `.cursorrules` for AI-assisted builds |
| [PLATFORM_EXPANSION_PROMPTS.md](./PLATFORM_EXPANSION_PROMPTS.md) | Sequential Cursor prompts — one concern per session/PR |
| [PLATFORM_EXPANSION_DISCIPLINES_AND_TASK_TYPES.md](./PLATFORM_EXPANSION_DISCIPLINES_AND_TASK_TYPES.md) | Discipline vs Task Type model, A&D seed list, assignability flags |
| [PLATFORM_EXPANSION_INTAKE_FORM_SPEC.md](./PLATFORM_EXPANSION_INTAKE_FORM_SPEC.md) | Default intake step flow, fields, required/optional, A&D seed form |
| [PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md](./PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md) | Client portal v1 — projects, brief, tasks, per-project messaging |

**Related existing docs:** [SAAS_CONVERSION_BUILD_PLAN.md](./SAAS_CONVERSION_BUILD_PLAN.md) (subscription/multi-domain layer), [Design System Update/design_handoff_admin_redesign/](./Design%20System%20Update/design_handoff_admin_redesign/) (admin shell target), [Internal_Workspace_and_Block_Time_Concept.md](./Internal_Workspace_and_Block_Time_Concept.md), [BLOCK_TIME_AND_INTERNAL_WORKSPACE_BUILD_PLAN.md](./BLOCK_TIME_AND_INTERNAL_WORKSPACE_BUILD_PLAN.md).

---

## Executive Summary

After extended production use, **Ask And Deliver is the first tenant** of a broader platform pattern: agencies and creative outfits that manage a **pool of creatives** with blended disciplines, bill rates, earned rates, and availability — serving **clients** who need project visibility and billing self-service.

The application already has strong foundations (workspace multi-tenancy, time tracking, invoicing, proposals, leads, portfolio). This expansion adds:

1. **Configurable lead intake** — deeper qualification + admin-managed form content and field sets
2. **Expanded role model** — tenant admin, team member, client/customer (plus platform super-admin later)
3. **Role-native experiences** — distinct login routing, layouts, and dashboards per persona
4. **Member profiles** — disciplines, availability preferences, portfolio linkage
5. **Client portal** — project hub: brief, tasks, per-project messaging ([spec](./PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md))
6. **Admin efficiency** — unified command center aligned with the admin redesign handoff

All work is designed **multi-tenant-safe** even when deployed single-tenant today (Lead scoping, intake config per workspace, client users linked to Client records, host-based public resolution when SaaS layer lands).

---

## Vision: Platform vs. Tenant

```
┌─────────────────────────────────────────────────────────────────┐
│                     Platform (shared deployment)                 │
│  Auth0 · MongoDB · Railway · Vercel · Cloudinary · Stripe       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   Tenant: A&D            Tenant: Agency B        Tenant: Agency C
   (Matt — admin)         (admin + creatives)     (admin + creatives)
        │                       │                       │
   Clients · Leads         Clients · Leads         Clients · Leads
   Creatives · Projects    Creatives · Projects    Creatives · Projects
   Intake config           Intake config           Intake config
   Public site             Public site             Public site
```

**Tenant #1 rule:** Ask And Deliver uses the same models, routes, and UI as every future subscriber. No `if (isAskAndDeliver)` branches — only workspace/tenant resolution.

---

## Current State vs. Target

| Area | Today | Target |
|------|-------|--------|
| **Roles** | `admin` · `member` · `pending` | + `client` (customer portal); optional `lead` pre-auth; platform `super_admin` |
| **Lead intake** | Hard-coded 4-step wizard in `Contact.tsx` | Workspace-scoped **IntakeForm** definition; dynamic renderer; admin builder |
| **Lead data** | Fixed fields on `Lead` model; **no `userId`** | `userId` scoping + flexible `responses` map for custom fields |
| **Login UX** | Single admin shell for admin + member; pending gate | Role-aware redirect; persona-specific layouts |
| **Member dashboard** | Same `/dashboard` as admin (minus financials) | Member hub at `/member`: my projects, tasks, timer, availability, team feed |
| **Client dashboard** | None (clients are CRM records only) | Client portal: their projects, status, invoices, pay links |
| **Admin dashboard** | Timer + todos + lead stats | Command center: pipeline, utilization, billing aging, team capacity |
| **Disciplines / availability** | On `Project` / `PortfolioProject` only | Tenant taxonomy on **SiteConfig**; **User** (assignable) + **Project** (executable) + intake |
| **Team communication** | Lead notes (internal only) | Project-scoped threads; optional client-visible messages |
| **Multi-tenant public** | Single portfolio/theme domain | Host → workspace (see SaaS doc); intake form per tenant |

---

## Feature Domains

### Domain A — Configurable Lead Intake

**Problem:** The contact form is code-defined (`projectTypes`, `budgetRanges`, copy, steps). Each agency needs different qualification depth, disciplines, file uploads, and intake paths (e.g. retainer vs. project vs. staffing).

**Solution:**

- **`IntakeForm`** model (Pattern A — `userId`): versioned form definition with steps, sections, fields, validation, conditional logic, and marketing copy blocks.
- **`Lead.responses`**: `Record<fieldKey, unknown>` for dynamic answers; retain core columns (`name`, `email`, `confidence`, etc.) for pipeline compatibility.
- **Admin UI** (`/intake-config`): ordered step/field editor; for **disciplines needed**, pick from available tenant disciplines to expose on the form; separate editors for budget/timeline option sets
- **Public renderer**: Fetches active form via `GET /api/intake-forms/public` (workspace from host/header); renders steps dynamically; supports new field types incrementally.

**v1 intake priorities (locked):**

| Priority | Field / capability | Notes |
|----------|-------------------|-------|
| Required | **Disciplines needed** (`disciplines_needed`) | Admin selects which **disciplines** (generalized) appear on this form from tenant taxonomy — not granular tasks. See [DISCIPLINES_AND_TASK_TYPES.md](./PLATFORM_EXPANSION_DISCIPLINES_AND_TASK_TYPES.md) |
| Required | **Timeline** (`range_select` or single_select) | Tenant-configurable option set |
| Required | **Budget** (`range_select` or single_select) | Tenant-configurable option set |
| Required | **File upload** | Where applicable — briefs, brand assets; Cloudinary scoped path |
| Backend-driven | All other fields | Additional qualification fields added via admin builder as needed; server validates against published schema |

**Field library (supports v1 + future):**

| Field type | Example use |
|------------|-------------|
| `single_select` | Project type, confidence |
| `disciplines_needed` | Client-facing discipline multi_select (admin-curated from taxonomy) |
| `multi_select` | Budget, timeline, project type, other option sets |
| `text` / `textarea` | Description, goals |
| `email` / `phone` / `url` | Contact |
| `file` | Brief, brand assets |
| `range_select` / `single_select` | Budget, timeline |
| `boolean` | Has existing brand guidelines? |
| `number` | Team size, page count |
| `conditional_group` | Show retainer questions if project type = Retainer |

**Pipeline integration:** Admin lead detail shows structured responses + raw JSON; conversion pre-fills Client/Project from mapped fields.

**Default form spec (locked):** [PLATFORM_EXPANSION_INTAKE_FORM_SPEC.md](./PLATFORM_EXPANSION_INTAKE_FORM_SPEC.md) — 5 steps, confidence-conditional copy, discipline picker on step 1, optional files on step 3.

---

### Domain B — Role System & Login Experience

**Expanded roles:**

| Role | Auth | Primary shell | Purpose |
|------|------|---------------|---------|
| `admin` | Auth0 | Admin layout | Full workspace ops |
| `member` | Auth0 | Member layout | Time, projects, profile, comms |
| `client` | Auth0 | Client portal layout | Own projects + invoices |
| `pending` | Auth0 | Pending gate | Awaiting admin approval |
| `super_admin` | Auth0 + allowlist | Platform console | SaaS ops (later) |

**User model additions:**

```typescript
// Conceptual — see ARCHITECTURE doc for full schema
role: 'admin' | 'member' | 'client' | 'pending';
clientId?: ObjectId;           // when role === 'client'
disciplines?: string[];        // creative profile
availability?: AvailabilityPreferences;
bio?: string;
publicSlug?: string;           // optional creative portfolio page (future)
```

**Login flow:**

1. Auth0 Universal Login (unchanged).
2. `GET /api/users/me` returns role + linked entities.
3. **Role router** (new `PostAuthRedirect` or logic in `ProtectedRoute`):
   - `admin` → `/dashboard` (admin command center)
   - `member` → `/member` (member hub)
   - `client` → `/portal` (client home)
   - `pending` → pending approval screen
4. **Invite flows:**
   - Team invite (existing add-by-email) → `member`
   - **Client invite (admin only):** Admin dashboard UI to invite a client user by email, linked to a CRM `Client` record. No self-signup — admin distributes invites from the dashboard (e.g. Clients page or dedicated portal-invites panel).

**Login UX improvements:**

- Branded post-login welcome (tenant company name from SiteConfig)
- Clear error when client user has no linked `clientId`
- Remember last visited section per role (local preference)
- Optional: magic-link client invite email (Phase 2 of Domain B)

---

### Domain C — Member / Team Dashboard

**Route prefix:** `/member/*`

**Primary widgets:**

| Widget | Data source |
|--------|-------------|
| Active timer + quick start | Existing timer APIs |
| My projects | Projects where user has time entries or explicit assignment |
| My tasks | ProjectTasks assigned or open on those projects |
| This week | Time summary (hours only — no rates) |
| Team activity feed | Project messages / recent entries (sanitized) |
| Profile shortcuts | Disciplines, availability, notification prefs |

**Profile extensions (`/member/profile`):**

- Disciplines (multi-select from tenant-defined list or free tags)
- Availability: hours/week, preferred days, timezone, out-of-office range
- Earned rates (read-only for member; admin sets via Team UI)
- Avatar, bio, links

**Assignment model (Phase C2):**

- `Project.assignedMemberIds: string[]` (auth0Ids) — optional; enables "my projects" without inferring from time entries alone.

---

### Domain D — Client Portal

**Route prefix:** `/portal/*`  
**Full spec:** [PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md](./PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md)

**v1 (locked):**

| Surface | Features |
|---------|----------|
| **Project list** | Browse projects for client's CRM record; status badges; exclude ARCHIVED |
| **Project detail** | **Brief** (sanitized HTML), **client-visible tasks** (title, description, status), **per-project message thread** |
| **Messaging** | Client reads `clientVisible` messages; client can **reply** (always client-visible). Admin/member compose with visibility toggle on project view |
| **Home** | Active project summary + recent project-scoped activity |

**Task visibility:** `ProjectTask.clientVisible` (default `false`) — admin opts tasks into the portal.

**v1.1 (optional follow-on):** Invoices (SENT/PAID), pay links, billing profile — not blocking first portal ship.

**Scope rule:** Client users see only `{ clientId: user.clientId }` data — no financials, no internal tasks, no DRAFT invoices.

---

### Domain E — Tenant Admin Dashboard & Efficiency

Align with [design_handoff_admin_redesign](./Design%20System%20Update/design_handoff_admin_redesign/README.md):

| Improvement | Description |
|-------------|-------------|
| Command center layout | Stat strip: hours today/week, unbilled WIP, pipeline value, team utilization |
| Lead inbox snippet | New leads count + quick link; intake source tags |
| Capacity glance | Members × availability vs. scheduled blocks (when Block Time exists) |
| Billing aging | Open invoices by age bucket |
| Global search (⌘K) | Projects, clients, leads, invoices — Phase E2 |
| Shell | 56px icon rail, breadcrumb topbar (partially implemented in current Sidebar) |

**Efficiency flows:**

- Lead → Proposal → Project in fewer clicks (deep links from dashboard cards)
- Bulk lead status update
- "Assign member" from lead detail (post-conversion or at qualified stage)

---

### Domain F — Team Communication

**MVP (locked):** `ProjectMessage` model with **`clientVisible` toggle** on admin/member compose — **shipped with client portal v1 (Phase 7)** as per-project threads inside `/portal/projects/:id`.

- Client **reads** messages where `clientVisible: true`
- Client **posts** replies on the project (always `clientVisible: true`)
- No global `/portal/messages` — context stays on the project

**Deferred:** DMs, @mentions, email notifications, attachments — validate usage after v1.

---

## Multi-Tenant Guardrails (All Phases)

1. Every new model gets `userId` (workspace owner) unless explicitly platform-global.
2. Public routes resolve workspace from **Host** / tenant header — never trust client body alone.
3. Client role queries filter by `user.clientId` **and** workspace owner match.
4. Intake form definitions are per workspace; public POST attaches resolved `userId`.
5. Cloudinary paths: `{workspaceOwnerId}/intake/{leadId}/…`, `{workspaceOwnerId}/portfolio/…`.
6. When [SAAS_CONVERSION_BUILD_PLAN.md](./SAAS_CONVERSION_BUILD_PLAN.md) lands, Tenant model links `adminAuth0Id` → subscription; this expansion does not block that work.

---

## Phased Delivery

| Phase | Name | Outcome | Depends on |
|-------|------|---------|------------|
| **0** | Planning sync | These docs + stakeholder sign-off | — |
| **1** | Data foundation | Lead `userId`, `responses` map, workspace-scoped lead APIs, public POST resolution stub | — |
| **2** | Intake config v1 | `IntakeForm` model, admin builder (core fields), dynamic public renderer | 1 |
| **3** | Intake depth | File upload, conditional logic, discipline/budget option sets per tenant | 2 |
| **4** | Role expansion | `client` role, `clientId` link, role router, client invite API | 1 |
| **5** | Member dashboard | `/member` shell, my projects/tasks, profile disciplines/availability | 4 |
| **6** | Client portal v1 | `/portal` projects, brief, tasks, per-project messaging (+ admin compose) | 4 |
| **6b** | Client portal invoices | `/portal/invoices` SENT/PAID, pay links | 6 |
| **7** | Admin command center | Dashboard redesign, lead/billing/capacity widgets | 1, 5 |
| **8** | Member assignment & capacity | Assign creatives, capacity widget | 5 |
| **9** | SaaS layer | Per [SAAS_CONVERSION_BUILD_PLAN.md](./SAAS_CONVERSION_BUILD_PLAN.md) | 1–8 |

Phases 5 and 6 can run in parallel after Phase 4. Phase 7 can start after Phase 1 for lead widgets. **Project messaging is part of Phase 6** (not a separate phase).

---

## Decided Product Rules

Locked in working session (July 2026):

| # | Decision | Resolution |
|---|----------|------------|
| 1 | **Member URL** | `/member/*` — members land here after login; admin keeps `/dashboard` |
| 2 | **Client portal URL** | `/portal/*` |
| 3 | **Client provisioning** | **Admin invite only** — no self-signup. Admin dashboard element to distribute client portal invites (linked to CRM Client record) |
| 4 | **Intake builder v1** | **Ordered step/field editor** — not drag-drop; drag-drop deferred to v2 |
| 5 | **Discipline taxonomy** | Nested **disciplines → tasks** (tasks link to TaskTypes). Intake uses **discipline-level** options only; admin **selects which disciplines** appear on each intake form. See [DISCIPLINES_AND_TASK_TYPES.md](./PLATFORM_EXPANSION_DISCIPLINES_AND_TASK_TYPES.md) |
| 6 | **SaaS layer timing** | Expand platform features on A&D first (Phases 1–11); Stripe Billing + subdomain routing after (Phase 12 / SaaS doc) |
| 7 | **Team communication v1** | Per-project messages inside project detail; `clientVisible` toggle; client read + reply — bundled in Phase 6 portal |
| 8 | **Intake v1 fields** | Disciplines needed, timeline, budget, file upload — see [INTAKE_FORM_SPEC.md](./PLATFORM_EXPANSION_INTAKE_FORM_SPEC.md) |
| 9 | **Client portal v1** | Projects, brief, client-visible tasks, per-project messaging — see [CLIENT_PORTAL_SPEC.md](./PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md) |

## Remaining Open Decisions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Project assignment | Infer from time entries vs explicit `assignedMemberIds` | Both — explicit preferred, infer as fallback |
| 2 | Merge admin redesign | Before Phase 8 or as part of it | Part of Phase 8 — use handoff tokens |
| 3 | Client invite UI placement | Clients page action vs dedicated "Portal invites" panel | Clients page row action + modal (minimal v1) |

---

## Success Criteria

- [x] Ask And Deliver runs on expanded features without tenant-specific code paths
- [x] Admin can edit intake form copy and field sets without deploy
- [x] Member logs in → `/member` dashboard; client logs in → `/portal`; admin → command center
- [x] Tenant discipline list drives projects, member profiles, and intake options
- [x] Admin can invite client portal users from dashboard (no self-signup)
- [x] Leads scoped to workspace; public intake attaches correct `userId`
- [x] Client sees project brief, client-visible tasks, and can read/reply in per-project message thread
- [x] Client sees only their projects; internal tasks hidden
- [x] Documentation + `.cursorrules` updated (Phase 11)
- [x] Each phase shippable independently behind feature flags if needed

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-27 | Initial master plan from platform expansion working session |
| 2026-07-03 | Locked product rules: `/member`, `/portal`, admin client invites, discipline taxonomy, intake v1 priorities |
| 2026-07-03 | Client portal v1 spec — projects, brief, tasks, per-project messaging |
| 2026-07-03 | **Phases 1–9 complete** — lead scoping, intake builder, dynamic renderer, disciplines, roles, member hub, client portal, admin command center, assignment & capacity |
| 2026-07-03 | **Phase 11** — merged `PLATFORM_EXPANSION_CURSORRULES.md` into `.cursorrules`; updated ARCHITECTURE, README, SETUP |
