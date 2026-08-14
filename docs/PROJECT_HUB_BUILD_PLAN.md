# Project Hub — Unified Project Detail View

**Status:** Planning (July 2026)  
**Parent:** [PLATFORM_EXPANSION_BUILD_PLAN.md](./PLATFORM_EXPANSION_BUILD_PLAN.md)  
**Related:** [CLIENT_PORTAL_DASHBOARD_BUILD_PLAN.md](./CLIENT_PORTAL_DASHBOARD_BUILD_PLAN.md) · [PROJECT_BILLING_MODES_BUILD_PLAN.md](./PROJECT_BILLING_MODES_BUILD_PLAN.md) · [RESEND_NOTIFICATIONS_BUILD_PLAN.md](./RESEND_NOTIFICATIONS_BUILD_PLAN.md)

This document defines a **dedicated project detail page** for **admin and member** roles — a single screen where everything about one project is visible in isolation: brief, tasks, time entries, budget (admin), messages, team, and project metadata.

The **client** equivalent already exists at `/portal/projects/:id` (see [CLIENT_PORTAL_DASHBOARD_BUILD_PLAN.md](./CLIENT_PORTAL_DASHBOARD_BUILD_PLAN.md)).

---

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Target State](#target-state)
4. [Information Architecture](#information-architecture)
5. [Page Sections](#page-sections)
6. [API & Server](#api--server)
7. [Frontend](#frontend)
8. [Permissions (admin vs member)](#permissions-admin-vs-member)
9. [Navigation & Deep Links](#navigation--deep-links)
10. [Phased Delivery](#phased-delivery)
11. [Testing Checklist](#testing-checklist)
12. [Key Files Reference](#key-files-reference)

---

## Overview

### Problem

Today, project context is spread across the **Projects list** (`ProjectCard` per row), **Time Entries** (filter by project manually), **Reports**, and modals. Admins and members must mentally stitch together brief, tasks, burn, entries, messages, and team from separate surfaces.

### Proposed outcome

A **Project Hub** route that opens one project in full context — the operational home for day-to-day work on an engagement.

| Persona | Route |
|---------|-------|
| Admin | `/projects/:id` |
| Member | `/member/projects/:id` |

The Projects **list page remains** for browse/filter/archive; cards link into the hub instead of expanding inline.

---

## Current State

| Area | Behavior |
|------|----------|
| **Projects page** | `Projects.tsx` — filtered list of `ProjectCard` components |
| **ProjectCard** | Inline: status, billing summary, budget burn bar (admin), `ProjectTaskList`, `ProjectMessagesPanel` |
| **Brief editing** | `ProjectModal` — brief field in create/edit modal, not on card |
| **Time entries** | Separate `/time-entries` page; optional project filter |
| **Budget burn** | `GET /api/projects/budget-burn` — batch on list page only |
| **Team** | `Project.assignedMemberIds` on model; no dedicated UI on card |
| **Messages** | `ProjectMessagesPanel` embedded in card |
| **Client portal** | Full detail at `/portal/projects/:id` — reference UX for brief/tasks/messages layout |

**Gap:** No admin/member route that consolidates entries + budget + team + brief in one scrollable (or tabbed) view.

---

## Target State

1. **List → Hub navigation** — Click project title (or "Open" action) → project hub.
2. **Single-page layout** with anchored sections or tabs (mobile: accordion).
3. **Reuse existing components** — `ProjectTaskList`, `ProjectMessagesPanel`, `SanitizedBrief`, `EntryList` subset, budget burn widget.
4. **Role-aware financials** — Budget, rates, and dollar amounts **admin only**; members see hours and tasks without billing totals.
5. **Billing-mode aware budget panel** — HOURLY burn bar, FIXED_PRICE agreed fee summary, HOUR_RETAINER utilization (align with [PROJECT_BILLING_MODES_BUILD_PLAN.md](./PROJECT_BILLING_MODES_BUILD_PLAN.md)).
6. **Projects list slimmed** — Cards show summary + link to hub; optional toggle to keep compact inline tasks for power users (Phase 2).

---

## Information Architecture

```
Admin                          Member
────────                       ────────
/projects                      /member/projects
/projects/:id   ← NEW HUB      /member/projects/:id   ← NEW HUB
```

**Breadcrumb:** Dashboard → Projects → {Project title}

**Client (unchanged):** `/portal/projects/:id` — separate spec, no budget/entries.

---

## Page Sections

Layout order (desktop — single column, max-width ~960px):

```
┌──────────────────────────────────────────────────────────────┐
│  ← Projects    {Title} · {Client name}    [Status] [Edit*]   │
│  Excerpt / billing mode badge (admin)                        │
├──────────────────────────────────────────────────────────────┤
│  TEAM                                                        │
│  Assigned members (avatars + names) · link to assign in edit │
├──────────────────────────────────────────────────────────────┤
│  BRIEF                                                       │
│  SanitizedBrief · admin: "Edit brief" → ProjectModal         │
├──────────────────────────────────────────────────────────────┤
│  BUDGET & BILLING (admin only)                               │
│  Mode-specific: burn bar | agreed fee | retainer utilization │
│  Period selector: all · month · 30d (reuse Projects page)    │
├──────────────────────────────────────────────────────────────┤
│  TASKS                                                       │
│  ProjectTaskList — full CRUD, reorder (admin), clientVisible │
├──────────────────────────────────────────────────────────────┤
│  TIME ENTRIES                                                │
│  EntryList filtered to projectId · admin: amounts/rates      │
│  Quick actions: Start timer (prefill project) · Add manual    │
├──────────────────────────────────────────────────────────────┤
│  MESSAGES                                                    │
│  ProjectMessagesPanel — clientVisible toggle (admin/member)  │
└──────────────────────────────────────────────────────────────┘
* Edit / Archive / Delete — admin only, header actions
```

### Section details

#### Header

| Field | Source |
|-------|--------|
| Title, status, excerpt | `Project` |
| Client name | Populated `clientId` |
| Billing summary | Reuse `projectBillingSummary()` from `ProjectCard.tsx` |
| Actions | Edit (modal), Archive (if COMPLETED), Delete — admin only |

#### Team

**Query:** Resolve `Project.assignedMemberIds` → workspace users (name, avatar, role).

**Optional enrichment (v1.1):** Contributors from distinct `TimeEntry.userId` on this project not in assign list — label "Also tracked time".

**Admin:** Edit assignments via Project modal (existing `assignedMemberIds` multi-select).

#### Brief

- Display: `SanitizedBrief` with `Project.brief` / fallbacks (same as portal).
- Admin edit: opens `ProjectModal` focused on brief tab/section.

#### Budget & billing (admin only)

| `billingMode` | Widget |
|---------------|--------|
| `HOURLY` | Budget burn bar + `billed / budget` + period label — `GET /api/projects/budget-burn?projectIds[]=:id` |
| `FIXED_PRICE` | Agreed amount, invoiced-to-date if available from line items / invoices |
| `HOUR_RETAINER` | Pool hours, used hours, adjustment — mirror retainer report logic |

Members: **section hidden entirely**.

#### Tasks

Reuse `ProjectTaskList` with existing props:

- Admin: reorder, delete, `clientVisible` checkbox
- Member: create/update/status toggle, no delete/reorder unless extended

#### Time entries

- Fetch: `GET /api/time-entries?projectIds[]=:id` (existing array param pattern)
- Reuse `EntryList` with `showRate={isAdmin}` / `showAmount={isAdmin}`
- Header actions: **Start timer** (opens timer with project prefilled), **Add entry** (QuickEntry / EntryModal)
- Sort: newest first; paginate or "load more" if >50 entries

#### Messages

Reuse `ProjectMessagesPanel` — full thread including internal messages; compose with `clientVisible` toggle.

---

## API & Server

### Option A — Compose existing endpoints (recommended v1)

No new aggregate endpoint. Hub page parallel-fetches:

| Call | Purpose |
|------|---------|
| `GET /api/projects/:id` | Project + populated client |
| `GET /api/project-tasks?projectId=:id` | Tasks |
| `GET /api/time-entries?projectIds[]=:id` | Entries |
| `GET /api/projects/budget-burn?projectIds[]=:id&startDate&endDate` | Burn (admin) |
| `GET /api/projects/:id/messages` | Messages |
| `GET /api/users/team` or workspace members | Resolve assignee display names |

**Pros:** Minimal server diff, reuses auth/scoping already on each route.  
**Cons:** Multiple round-trips — acceptable for v1.

### Option B — Aggregate hub endpoint (v1.1 optimization)

`GET /api/projects/:id/hub`

```typescript
{
  project: Project;           // populated clientId
  tasks: ProjectTask[];
  entries: TimeEntry[];       // capped, paginated
  budgetBurn?: ProjectBudgetBurn;  // admin only — omitted for members
  team: Array<{ auth0Id, name, avatar?, role }>;
  messageCount: number;       // optional — full list still via messages route
}
```

Server applies `getWorkspaceOwnerId`, member entry filter (own entries only for members), and **strips financial fields** for non-admin before respond.

### New helper (either option)

`GET /api/projects/:id/team` — returns sanitized member list for assignees + optional contributors. Workspace-scoped; member-accessible.

---

## Frontend

### New files

| File | Purpose |
|------|---------|
| `client/src/pages/ProjectHub.tsx` | Admin hub page |
| `client/src/pages/member/MemberProjectHub.tsx` | Member hub (or shared component with role props) |
| `client/src/components/projects/ProjectHubHeader.tsx` | Title, client, status, actions |
| `client/src/components/projects/ProjectTeamStrip.tsx` | Assigned member avatars |
| `client/src/components/projects/ProjectBudgetPanel.tsx` | Billing-mode aware budget section |
| `client/src/components/projects/ProjectEntriesSection.tsx` | Filtered EntryList + timer actions |

### Routing (`App.tsx`)

```tsx
// Admin layout
<Route path="projects/:id" element={<ProjectHub />} />

// Member layout
<Route path="projects/:id" element={<MemberProjectHub />} />
```

### Projects list changes

- `ProjectCard`: add **Open project** link (`/projects/:id` or `/member/projects/:id`)
- Phase 2: collapse inline task/message panels behind feature flag or remove after hub adoption

### Design tokens

Use admin redesign panels (`AdminPanel`, `AdminPageHeader`) where the hub lives under admin layout; member layout uses existing member shell styling.

---

## Permissions (admin vs member)

| Section | Admin | Member |
|---------|-------|--------|
| Brief | Read + edit | Read only |
| Budget & billing | Full | Hidden |
| Tasks | Full CRUD + reorder + clientVisible | Create/update/status |
| Time entries | All workspace entries on project | Own entries only |
| Messages | All + compose + clientVisible toggle | All + compose (no financial leakage) |
| Team | View + edit assignments | View names only |
| Project edit/archive/delete | Yes | No |

Existing middleware on routes enforces this — hub is primarily a **composition layer**.

---

## Navigation & Deep Links

| Source | Target |
|--------|--------|
| Dashboard To-Do task row | `/projects/:id#tasks` |
| Lead conversion | `/projects/:id` after create |
| Resend email (client message) | `/projects/:id#messages` |
| Reports invoice line | `/projects/:id#entries` |
| Client portal (admin view) | Admin opens same project at `/projects/:id` — not portal route |

Use URL hash or query `?section=messages` for scroll-to-section.

---

## Phased Delivery

| Phase | Name | Outcome | Depends on |
|-------|------|---------|------------|
| **PH-1** | Hub page v1 | Route + header + brief + tasks + messages | — |
| **PH-2** | Entries + timer | Project-scoped EntryList + start timer prefill | PH-1 |
| **PH-3** | Budget panel | Admin billing-mode widgets + period selector | PH-1 |
| **PH-4** | Team strip | Assignee display + edit via modal | PH-1 |
| **PH-5** | List page UX | Cards link to hub; slim inline panels | PH-1–4 |
| **PH-6** | Hub API aggregate | Optional `GET /api/projects/:id/hub` | PH-1–4 |

**Recommendation:** One PR for PH-1–4 (single user-facing feature); PH-5 as follow-up cleanup.

---

## Testing Checklist

- [ ] Admin hub loads all sections for HOURLY, FIXED_PRICE, and HOUR_RETAINER projects
- [ ] Member hub hides budget section; entries scoped to own `userId`
- [ ] Invalid / other-workspace project ID → 404
- [ ] Start timer from hub prefills project (and optional task)
- [ ] Messages clientVisible toggle still controls portal visibility
- [ ] Budget burn matches Projects list card for same period filters
- [ ] Deep link `#messages` scrolls to messages section
- [ ] Breadcrumb and back link return to filtered Projects list state (optional: `location.state`)

---

## Key Files Reference

| Layer | Location |
|-------|----------|
| Projects list | `client/src/pages/Projects.tsx` |
| Project card (current inline UX) | `client/src/components/projects/ProjectCard.tsx` |
| Project modal | `client/src/components/projects/ProjectModal.tsx` |
| Task list | `client/src/components/projectTasks/ProjectTaskList.tsx` |
| Messages | `client/src/components/projects/ProjectMessagesPanel.tsx` |
| Brief render | `client/src/components/portal/SanitizedBrief.tsx` |
| Budget burn API | `server/src/routes/projects.ts` (`/budget-burn`) |
| Project model | `server/src/models/Project.ts` |
| Member projects | `client/src/pages/member/MemberProjects.tsx` |
| Client portal detail (reference) | `client/src/pages/portal/PortalProjectDetail.tsx` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-17 | Initial build plan — admin/member unified project hub |
