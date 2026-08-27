# Project Hub — Unified Project Detail View

**Status:** In progress (v1 — PH-1 through PH-5)  
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

The Projects **list page remains** for browse/filter/archive; cards are **slim summaries** that link into the hub.

---

## Current State

| Area | Behavior |
|------|----------|
| **Projects page** | `Projects.tsx` — filtered list of `ProjectCard` components |
| **ProjectCard (pre-hub)** | Inline: status, billing summary, budget burn bar (admin), `ProjectTaskList`, `ProjectMessagesPanel` |
| **Brief editing** | `ProjectModal` — brief field in create/edit modal, not on card |
| **Time entries** | Separate `/time-entries` page; optional project filter |
| **Budget burn** | `GET /api/projects/budget-burn` — batch on list page; HOURLY only |
| **Team** | `Project.assignedMemberIds` on model; no dedicated UI on card |
| **Messages** | `ProjectMessagesPanel` embedded in card |
| **Single-project GET** | Missing — list is `GET /api/projects` only; `projectsApi` has no `get(id)` |
| **Admin/member hub routes** | Missing — only portal has `/projects/:id` |
| **Client portal** | Full detail at `/portal/projects/:id` — reference UX for brief/tasks/messages layout |

**Gap:** No admin/member route that consolidates entries + budget + team + brief in one scrollable view.

---

## Target State

1. **List → Hub navigation** — Click project title or **Open project** → hub.
2. **Single scrollable page** with anchored sections (`#team` `#brief` `#budget` `#tasks` `#entries` `#messages`). Not tabs.
3. **Reuse existing components** — `ProjectTaskList`, `ProjectMessagesPanel`, `SanitizedBrief`, `EntryList` subset, budget burn widget.
4. **Role-aware financials** — Budget, rates, and dollar amounts **admin only**; members see hours and tasks without billing totals.
5. **Billing-mode aware budget panel** — HOURLY burn bar, FIXED_PRICE agreed fee summary, HOUR_RETAINER utilization (align with [PROJECT_BILLING_MODES_BUILD_PLAN.md](./PROJECT_BILLING_MODES_BUILD_PLAN.md)).
6. **Projects list slimmed in v1** — Cards show summary + link to hub. Tasks and messages live only on the hub.

---

## Information Architecture

```
Admin                          Member
────────                       ────────
/projects                      /member/projects
/projects/:id   ← HUB          /member/projects/:id   ← HUB
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
| Billing summary | `projectBillingSummary()` (shared helper) |
| Actions | Edit (modal), Archive (if COMPLETED), Delete — admin only |

Back link returns to the list (`/projects` or `/member/projects`). Optional `location.state` preserves list filters.

#### Team

**Query:** `GET /api/projects/:id` includes `assignedMembers` resolved from `assignedMemberIds` (name, picture, role).

**Optional enrichment (v1.1):** Contributors from distinct `TimeEntry.userId` on this project not in assign list — label "Also tracked time".

**Admin:** Edit assignments via Project modal (existing `assignedMemberIds` multi-select).

#### Brief

- Display: `SanitizedBrief` with `Project.brief` / fallbacks (same as portal).
- Admin edit: opens `ProjectModal` focused on the brief tab.

#### Budget & billing (admin only)

| `billingMode` | Widget |
|---------------|--------|
| `HOURLY` | Budget burn bar + `billed / budget` + period label — `GET /api/projects/budget-burn?projectIds[]=:id` |
| `FIXED_PRICE` | Agreed amount (invoiced-to-date deferred) |
| `HOUR_RETAINER` | Pool hours, used hours (from project time entries), adjustment |

Members: **section hidden entirely**.

#### Tasks

Reuse `ProjectTaskList` with existing props:

- Admin: reorder, delete, `clientVisible` checkbox
- Member: create/update/status toggle, no delete/reorder unless extended

#### Time entries

- Fetch: `GET /api/time-entries?projectIds[]=:id` (existing array param pattern; members filtered to own `userId` **and** the project)
- Reuse `EntryList` with `showRate={isAdmin}` / `showAmount={isAdmin}`
- Header actions: **Start timer** (project prefilled), **Add entry** (EntryModal)
- Sort: newest first; "load more" if >50 entries

#### Messages

Reuse `ProjectMessagesPanel` — expanded by default on the hub; full thread including internal messages; compose with `clientVisible` toggle.

---

## API & Server

### Option A — Compose existing endpoints (v1)

Hub page parallel-fetches:

| Call | Purpose |
|------|---------|
| `GET /api/projects/:id` | Project + populated client + `assignedMembers` |
| `GET /api/project-tasks?projectId=:id` | Tasks |
| `GET /api/time-entries?projectIds[]=:id` | Entries |
| `GET /api/projects/budget-burn?projectIds[]=:id&startDate&endDate` | Burn (admin) |
| `GET /api/projects/:id/messages` | Messages |

**`GET /api/projects/:id` rules:**

- Workspace-scoped via `getWorkspaceOwnerId`.
- Admin: full project (including billing fields).
- Member: `memberHasProjectAccess`; `stripProjectFinancials`; client populate limited to `name company`.
- Invalid id, other workspace, or member without access → **404** (not 403).

**Pros:** Minimal server diff, reuses auth/scoping already on each route.  
**Cons:** Multiple round-trips — acceptable for v1.

### Option B — Aggregate hub endpoint (follow-up)

`GET /api/projects/:id/hub` — not in v1.

---

## Frontend

### New files

| File | Purpose |
|------|---------|
| `client/src/pages/ProjectHub.tsx` | Shared hub page (role-aware) |
| `client/src/components/projects/ProjectHubHeader.tsx` | Title, client, status, actions |
| `client/src/components/projects/ProjectTeamStrip.tsx` | Assigned member avatars |
| `client/src/components/projects/ProjectBudgetPanel.tsx` | Billing-mode aware budget section |
| `client/src/components/projects/ProjectEntriesSection.tsx` | Filtered EntryList + timer actions |
| `client/src/utils/projectBilling.ts` | Shared billing summary + burn period helpers |

### Routing (`App.tsx`)

```tsx
// Admin layout
<Route path="/projects/:id" element={<ProjectHub />} />

// Member layout
<Route path="projects/:id" element={<ProjectHub />} />
```

Shared `ProjectHub` infers list path from `/member` vs `/projects`.

### Projects list changes (v1)

- Slim `ProjectCard`: title, client, preview, status, billing chip, HOURLY burn (admin), **Open project** link.
- Remove inline `ProjectTaskList` and `ProjectMessagesPanel` from admin **and** member lists.

### Design tokens

Use admin redesign panels (`AdminPanel`, `AdminPageHeader`) where the hub lives under admin layout; member layout uses the same tokens via `AdminThemeProvider`.

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
| Dashboard To-Do project title | `/projects/:id#tasks` (member: `/member/projects/:id#tasks`) |
| Lead conversion | `/projects/:id` after create |
| Resend email (client message) | `/projects/:id#messages` |
| Reports invoice line | `/projects/:id#entries` |
| Client portal (admin view) | Admin opens same project at `/projects/:id` — not portal route |

Use URL hash for scroll-to-section.

---

## Phased Delivery

| Phase | Name | Outcome | v1 |
|-------|------|---------|----|
| **PH-1** | Hub page | Route + header + brief + tasks + messages | Yes |
| **PH-2** | Entries + timer | Project-scoped EntryList + start timer prefill | Yes |
| **PH-3** | Budget panel | Admin billing-mode widgets + period selector | Yes |
| **PH-4** | Team strip | Assignee display + edit via modal | Yes |
| **PH-5** | List page UX | Slim cards + Open project | Yes (same ship) |
| **PH-6** | Hub API aggregate | Optional `GET /api/projects/:id/hub` | Follow-up |

**v1 ships PH-1–5 together.** Follow-up: aggregate endpoint, contributor enrichment, invoiced-to-date for fixed-price.

---

## Testing Checklist

- [ ] Admin hub loads all sections for HOURLY, FIXED_PRICE, and HOUR_RETAINER projects
- [ ] Member hub hides budget section; entries scoped to own `userId`
- [ ] Invalid / other-workspace project ID → 404
- [ ] Start timer from hub prefills project (and optional task)
- [ ] Messages clientVisible toggle still controls portal visibility
- [ ] Budget burn matches Projects list card for same period filters
- [ ] Deep link `#messages` scrolls to messages section
- [ ] Breadcrumb and back link return to Projects / My projects
- [ ] Slim list cards no longer show inline tasks or messages

---

## Key Files Reference

| Layer | Location |
|-------|----------|
| Projects list | `client/src/pages/Projects.tsx` |
| Project hub | `client/src/pages/ProjectHub.tsx` |
| Project card (slim) | `client/src/components/projects/ProjectCard.tsx` |
| Project modal | `client/src/components/projects/ProjectModal.tsx` |
| Task list | `client/src/components/projectTasks/ProjectTaskList.tsx` |
| Messages | `client/src/components/projects/ProjectMessagesPanel.tsx` |
| Brief render | `client/src/components/portal/SanitizedBrief.tsx` |
| Budget burn API | `server/src/routes/projects.ts` (`/budget-burn`, `GET /:id`) |
| Project model | `server/src/models/Project.ts` |
| Member projects | `client/src/pages/member/MemberProjects.tsx` |
| Client portal detail (reference) | `client/src/pages/portal/PortalProjectDetail.tsx` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-17 | Initial build plan — admin/member unified project hub |
| 2026-08-26 | v1 locked: scrollable sections (not tabs); slim list cards in same ship; `GET /api/projects/:id` required; PH-1–5 together |
