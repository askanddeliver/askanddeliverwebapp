# Platform Expansion — Phased Cursor Prompts

**Status:** Planning (June 2026)  
**Parent:** [PLATFORM_EXPANSION_BUILD_PLAN.md](./PLATFORM_EXPANSION_BUILD_PLAN.md)

Use these prompts **sequentially** — one phase per Cursor session or PR unless noted. Always include context: `askanddeliverwebapp/` and link the relevant planning doc.

**Rules:**
- Do not skip Phase 1 (Lead scoping) — downstream features depend on it.
- Verify manually after each phase per checklist in the master plan.
- Update docs when the phase completes.

---

## Phase 0 — Documentation acknowledgment (no code)

**Prompt:**

> Read `docs/PLATFORM_EXPANSION_BUILD_PLAN.md`, `PLATFORM_EXPANSION_ARCHITECTURE.md`, and `PLATFORM_EXPANSION_CONTEXTS.md`. Summarize the role model, routing plan, and intake form architecture. List any conflicts with the current codebase. Do not modify code.

---

## Phase 1 — Lead scoping & responses foundation

**Goal:** Fix multi-tenant gap on Lead; prepare for dynamic intake.

**Prompt:**

> Implement Phase 1 from `docs/PLATFORM_EXPANSION_BUILD_PLAN.md`:
>
> 1. Add `userId` (required, indexed), `responses` (Mixed, default `{}`), `source`, `intakeFormId`, `intakeFormVersion` to `Lead` model.
> 2. Create `server/src/lib/workspaceResolver.ts` with `resolvePublicWorkspace(req)` — legacy fallback via `DEFAULT_PUBLIC_WORKSPACE_OWNER_ID` env.
> 3. Scope all admin lead routes with `getWorkspaceOwnerId` / equivalent.
> 4. Update `POST /api/leads/public` to set `userId` from resolver; map existing body fields into both top-level columns and `responses`.
> 5. Add backfill script `server/scripts/backfill-lead-userid.ts` for existing leads.
> 6. Update client types and lead admin UI to show `responses` when present.
>
> Follow existing auth patterns in `.cursorrules`. Add env to `.env.example`. No intake builder yet.

**Verify:**
- [ ] New public lead has correct `userId`
- [ ] Admin only sees own workspace leads
- [ ] Existing Contact form still submits successfully

---

## Phase 2 — IntakeForm model & admin builder v1

**Goal:** Admin can edit form steps/fields; seed from current Contact.tsx.

**Prompt:**

> Implement Phase 2 from `docs/PLATFORM_EXPANSION_ARCHITECTURE.md` (Lead Intake):
>
> 1. Create `IntakeForm` Mongoose model (Pattern A scoping).
> 2. Routes: CRUD + `POST /:id/publish` under `/api/intake-forms`; admin only.
> 3. Seed script or migration: create `default` PUBLISHED form from `docs/PLATFORM_EXPANSION_INTAKE_FORM_SPEC.md` (5 steps; match current Contact.tsx + disciplines step).
> 4. Admin page `/intake-config` — ordered step/field editor; for `disciplines_needed` fields, discipline picker from Site Config taxonomy; preview + publish.
> 5. `GET /api/intake-forms/public?slug=default` with workspace resolver.
> 6. Add `intakeFormsApi` to `client/src/services/api.ts`.
>
> Do not replace Contact.tsx renderer yet — admin can edit but public still uses static form OR feature flag off.

**Verify:**
- [ ] Admin publishes form changes
- [ ] Public GET returns published schema for workspace

---

## Phase 3 — Dynamic public intake renderer

**Goal:** Public contact page driven by IntakeForm definition.

**Prompt:**

> Implement Phase 3 — dynamic intake renderer:
>
> 1. Create `IntakeFormContext`, field components (`IntakeFieldRenderer.tsx`), and step wizard shell.
> 2. Refactor `Contact.tsx` to fetch published form via `intakeFormsPublicApi` + `PublicWorkspaceContext` header.
> 3. Client-side conditional visibility (`showWhen`) matching server validation.
> 4. `POST /api/leads/public` validates against published schema; maps `mapsTo` fields; stores `responses`.
> 5. Feature flag `VITE_DYNAMIC_INTAKE` — fallback to legacy static form if false.
>
> Follow `docs/PLATFORM_EXPANSION_CONTEXTS.md` for provider mount order.

**Verify:**
- [ ] End-to-end submit with dynamic form
- [ ] Admin edits to labels/options appear after publish + refresh
- [ ] Invalid submissions rejected server-side

---

## Phase 4 — Intake depth (disciplines, files, timeline, budget)

**Goal:** v1 intake priorities — disciplines, file uploads, timeline, budget.

**Prompt:**

> Implement Phase 4 — intake depth (v1 priorities locked):
>
> 1. Add field types: `multi_select`, `file`, `phone`, `date` with server validation.
> 2. Add `SiteConfig.disciplines: DisciplineDefinition[]` with nested `tasks[]` — see `docs/PLATFORM_EXPANSION_DISCIPLINES_AND_TASK_TYPES.md`.
> 3. Seed script: disciplines + nested tasks from A&D Task Types; Testing under Development; exclude standalone Testing from intake defaults.
> 4. Add intake field type `disciplines_needed` with admin picker UI (checkbox available disciplines → `disciplineOptionIds`).
> 5. Wire public renderer + server validation to resolve options from published form snapshot + SiteConfig labels.
> 6. File upload: Cloudinary path `{workspaceOwnerId}/intake/{leadId}/…`.
> 7. Extend seed form per `docs/PLATFORM_EXPANSION_INTAKE_FORM_SPEC.md` — step 1 disciplines, step 3 attachments, step 2 budget/timeline.
> 6. Lead detail modal: render structured responses + file links.
> 7. Additional qualification fields can be added via admin ordered step/field editor — no hard-coded extras required for v1.
>
> Keep backward compatibility with leads created before dynamic intake.

---

## Phase 5 — Role expansion & post-auth routing

**Goal:** Introduce `client` role; role-aware login redirect.

**Prompt:**

> Implement Phase 5 from `docs/PLATFORM_EXPANSION_ARCHITECTURE.md`:
>
> 1. Extend `UserRole` to include `client`; add `clientId` to User model.
> 2. Update `UserContext` with `isClient`, `homeRoute`, `clientId`.
> 3. Create route guards: `ClientRoute`, `MemberOrAdminRoute`, `PostAuthRedirect` / `RoleRouter`.
> 4. Admin: `POST /api/users/invite-client` { email, clientId } — admin-only; no client self-signup.
> 5. Admin UI: "Invite to portal" action on Clients page (row + modal) to distribute client invites.
> 6. Members hitting `/dashboard` redirect to `/member`; clients cannot access admin routes.
> 6. Update types, users route validation, team UI copy.
>
> No portal pages yet — client users see placeholder portal home confirming link works.

**Verify:**
- [ ] admin → `/dashboard`, member → `/member`, client → `/portal`
- [ ] Client invite creates user with correct clientId

---

## Phase 6 — Member layout & dashboard

**Goal:** Member-first experience at `/member/*`.

**Prompt:**

> Implement Phase 6 — member dashboard:
>
> 1. Create `MemberLayout`, `MemberSidebar.tsx`, routes under `/member/*`.
> 2. Pages: `/member` (hub), `/member/projects`, `/member/entries`, `/member/profile`.
> 3. APIs: `GET /api/member/dashboard`, `GET /api/member/projects` — my projects (assignment + time-entry fallback).
> 4. Profile: edit disciplines + optional nested tasks (`disciplineTasks`) from taxonomy; group operational vs core; availability, bio via `PUT /api/users/me`.
> 5. Reuse timer components from Dashboard; hide financial data.
> 6. Admin can navigate to `/member` for dogfooding.
>
> Design: reuse admin design tokens from redesign handoff where practical.

**Verify:**
- [ ] Member never sees rates on member dashboard
- [ ] Timer works from member hub

---

## Phase 7 — Client portal v1

**Goal:** Project hub for clients — brief, tasks, per-project messaging.

**Prompt:**

> Implement Phase 7 per `docs/PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md`:
>
> 1. Create `ClientPortalLayout`, `PortalNav.tsx`, routes `/portal`, `/portal/projects`, `/portal/projects/:id`.
> 2. Server router `/api/portal/*` with `requireClient` + Pattern C scoping.
> 3. Project list: browse by clientId; status badges; exclude ARCHIVED.
> 4. Project detail: brief (sanitized HTML), tasks where `clientVisible: true` with status labels (Open / In progress / Complete).
> 5. Add `ProjectTask.clientVisible` (default false) + admin task modal checkbox.
> 6. `ProjectMessage` model + routes: portal read/post (client posts always clientVisible); admin/member compose on Projects page with visibility toggle.
> 7. `portalApi` in services/api.ts.
>
> Invoices deferred to Phase 7b unless explicitly requested.

**Verify:**
- [ ] Client A cannot access Client B project IDs
- [ ] Payment link opens for SENT invoice

---

## Phase 8 — Admin command center

**Goal:** Admin dashboard efficiency + redesign alignment.

**Prompt:**

> Implement Phase 8 — admin command center:
>
> 1. Add `GET /api/dashboard/admin-summary`, `/pipeline`, `/capacity` (capacity may stub until block time).
> 2. Redesign `Dashboard.tsx` admin view per `docs/Design System Update/design_handoff_admin_redesign/screens/dashboard.jsx` — stat strip, lead snippet, grouped todos.
> 3. Wire lead stats, unbilled WIP, invoice aging into widgets.
> 4. Optional: command palette stub (⌘K) searching projects/clients.
>
> Member users should not land here — unchanged from Phase 5 routing.

---

## Phase 9 — Member assignment & capacity

**Goal:** Admin can assign creatives; dashboard shows capacity.

**Prompt:**

> Implement Phase 10:
>
> 1. Add `Project.assignedMemberIds`, `ProjectTask.assigneeAuth0Id`.
> 2. Admin UI: assign members on project modal; assignee on task modal.
> 3. Lead detail: optional "assign creative" after qualified (stores suggestion or post-conversion assignment).
> 4. `GET /api/dashboard/capacity` — aggregate member availability vs. assigned hours.
> 5. Team page: show disciplines + availability columns.

---

## Phase 11 — Documentation & cursorrules merge

**Prompt:**

> Sync documentation after platform expansion Phases 1–10:
>
> 1. Merge `docs/PLATFORM_EXPANSION_CURSORRULES.md` into `askanddeliverwebapp/.cursorrules`.
> 2. Update `ARCHITECTURE.md` — roles, layouts, IntakeForm, Lead scoping, portal routes, remove "Global Data" for Leads.
> 3. Update `README.md` — feature list, new API sections, role descriptions.
> 4. Update `SETUP.md` — `DEFAULT_PUBLIC_WORKSPACE_OWNER_ID`, client invite flow.
> 5. Changelog entries in PLATFORM_EXPANSION_BUILD_PLAN.md.

---

## Phase 12 — SaaS layer (separate program)

**Prompt:**

> Implement SaaS Phase 1 from `docs/SAAS_CONVERSION_BUILD_PLAN.md` (Tenant model, Stripe Billing, subscription middleware). Platform expansion Phases 1–11 must be complete. Do not duplicate Lead scoping work.

---

## Parallel work (optional)

These can proceed alongside Phases 6–8 if staffed separately:

| Track | Doc | Prompt hint |
|-------|-----|-------------|
| Block Time + Internal Workspace | `BLOCK_TIME_AND_INTERNAL_WORKSPACE_BUILD_PLAN.md` | Admin capacity widget consumes TimeBlock data |
| Admin shell token migration | `design_handoff_admin_redesign/README.md` | Apply shell.jsx layout globally in AdminLayout |
| SaaS subdomain routing | `SAAS_CONVERSION_BUILD_PLAN.md` Prompt 4 | Replace legacy workspace resolver |

---

## Prompt Conventions

When starting any phase, prefix with:

```
Context: askanddeliverwebapp production MERN app.
Read: docs/PLATFORM_EXPANSION_BUILD_PLAN.md + relevant phase doc.
Constraints: Minimize scope to this phase only. Match existing code patterns in .cursorrules.
Do not commit unless asked.
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-03 | Locked decisions reflected: `/member`, client invite UI, discipline taxonomy, intake v1 |
