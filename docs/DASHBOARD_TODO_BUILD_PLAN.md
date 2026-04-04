# Dashboard To-Do List & Task Priority — Build Plan

This document describes a planned improvement: a **dashboard To-Do panel** that surfaces open work across **active projects**, grouped by **client**, respects **task priority order** from the Projects screen, and lets users **start the timer** from a task row via **Play**, which opens a **modal or drawer** to confirm billing fields before the timer runs. It is intended as implementation context before development begins.

---

## Table of Contents

1. [Overview](#overview)
2. [Current State (as implemented today)](#current-state-as-implemented-today)
3. [Target State](#target-state)
4. [Data Model](#data-model)
5. [API & Server](#api--server)
6. [Frontend: Projects Screen (priority ordering)](#frontend-projects-screen-priority-ordering)
7. [Frontend: Dashboard To-Do Panel](#frontend-dashboard-to-do-panel)
8. [Timer Start from a Task (“Play”)](#timer-start-from-a-task-play)
9. [Sorting, Grouping, and Edge Cases](#sorting-grouping-and-edge-cases)
10. [Permissions (admin vs member)](#permissions-admin-vs-member)
11. [Testing Checklist](#testing-checklist)
12. [Optional Follow-Ups](#optional-follow-ups)
13. [Key Files Reference](#key-files-reference)

---

## Overview

### Problem

Users manage **project tasks** on the Projects screen and pick tasks when **starting or editing time entries**. The **Dashboard** is the natural place to see **what is left to do** across clients and to **jump into tracking** without re-navigating.

### Proposed outcome

- A **To-Do** (or similarly named) section on the Dashboard listing **non-completed** tasks (`TODO` and `IN_PROGRESS`) for projects in **ACTIVE** status, organized for scanability (e.g. by **client**, then **project**, then **priority order**).
- **Priority** is established by **ordering tasks on the Projects screen**; that order is stored and mirrored on the Dashboard.
- Each task row exposes a **Play** control that opens a **modal or drawer** to choose **task type** (required) and optional **description**, then **Start** — matching how rates are assigned elsewhere and satisfying the API requirement for `taskTypeId`.

---

## Current State (as implemented today)

| Area | Behavior |
|------|----------|
| **Models** | `ProjectTask` includes `status` (`TODO` \| `IN_PROGRESS` \| `COMPLETED`) and `order` (number). `TimeEntry` optionally links `projectTaskId`. |
| **API** | `GET /api/project-tasks` returns tasks (optionally filtered by `projectId`), sorted by `order`, `createdAt`. `PUT /api/project-tasks/reorder` updates order for a project (admin-only). |
| **Projects UI** | `ProjectTaskList` shows tasks with status icons and cycle control; **no drag-and-drop** reorder UI wired to `projectTasksApi.reorder`. |
| **Dashboard** | Loads projects, task types, all project tasks, and active timer; `TimerControls` requires user to pick **project**, **task type**, and optionally **project task**. `EntryList` supports **Continue** on **recent entries** when no timer is running. |
| **Timer start** | `POST /api/time-entries/start` requires **`projectId` and `taskTypeId`**; `projectTaskId` is optional. |

Relevant references:

- Model: `server/src/models/ProjectTask.ts`
- Routes: `server/src/routes/projectTasks.ts`, `server/src/routes/timeEntries.ts` (`/start`)
- Dashboard: `client/src/pages/Dashboard.tsx`, `client/src/components/timer/TimerControls.tsx`
- Project tasks UI: `client/src/components/projectTasks/ProjectTaskList.tsx`
- API client: `client/src/services/api.ts` (`projectTasksApi.reorder`)

---

## Target State

1. **Dashboard** shows a dedicated **To-Do** module (placement: e.g. above **Recent Entries** or beside stats—final layout during UI pass).
2. Tasks shown are **`TODO` and `IN_PROGRESS`**, **`COMPLETED` excluded**, for projects with **`status === ACTIVE`** (align with product decision; see [Edge cases](#sorting-grouping-and-edge-cases) for PAUSED).
3. Tasks are **grouped by client** (client name), then **project**; within each project, tasks follow **`order`** ascending.
4. **Projects screen**: users with permission can **reorder** tasks (drag-and-drop or explicit “move up/down”) and persist via existing **`PUT /api/project-tasks/reorder`**.
5. **Play** on a task opens the [pre-start modal/drawer](#timer-start-from-a-task-play); on confirm, call **`POST /api/time-entries/start`** with that **project**, **`projectTaskId`**, selected **task type**, and optional **description**.
6. Optional but recommended: when starting from a task, set that **ProjectTask** status to **`IN_PROGRESS`** if it was `TODO` (and optionally sync when stopping—product call).

---

## Data Model

**No schema changes are strictly required** for the baseline feature:

- Priority is already **`order`** on `ProjectTask`.
- Work state is already **`status`**.
- Time entries already support **`projectTaskId`**.

Optional later enhancements (not required for v1):

- **Workspace default task type** in Site Config to pre-select the modal’s task-type dropdown.
- **Smarter pre-fill** for the modal: e.g. last-used task type per project or globally via `localStorage` (UX sugar only; user still confirms in the modal).

---

## API & Server

### Existing endpoints (sufficient for v1)

| Endpoint | Use |
|----------|-----|
| `GET /api/project-tasks` | Dashboard and Projects already fetch all tasks; Dashboard can derive the slice it needs client-side, or you can add query params later for efficiency. |
| `PUT /api/project-tasks/reorder` | Persist order after drag-and-drop on Projects. |
| `PATCH /api/project-tasks/:id/status` | Optional: set `IN_PROGRESS` when starting timer from task. |
| `POST /api/time-entries/start` | Start timer with `projectId`, `taskTypeId`, `projectTaskId`. |

### Optional optimization (post–v1)

- `GET /api/project-tasks/dashboard` (or query flags on existing route) returning only non-completed tasks for `ACTIVE` projects, with populated `projectId` → `clientId`, to reduce payload and simplify the client. Not required if current `getAll()` performance is acceptable.

### Server-side sort note

`GET /api/project-tasks` currently sorts by `{ order: 1, createdAt: 1 }` **globally**. **`order` is meaningful per project**, not globally. The **UI should sort tasks within each project** by `order` (then `createdAt` or `_id` as tiebreaker) when grouping. Consider aligning the **Projects** page grouped task lists with the same per-project sort so list order matches the Dashboard everywhere.

---

## Frontend: Projects Screen (priority ordering)

**Goal:** Let admins (see [Permissions](#permissions-admin-vs-member)) define priority by reordering tasks.

1. **Integrate reorder UI** into `ProjectTaskList` (or parent) using `@dnd-kit/core` and `@dnd-kit/sortable` (already listed in `client/package.json`, used elsewhere e.g. portfolio).
2. On drag end, call `projectTasksApi.reorder(projectId, taskIds)` with the new id order.
3. **Sort tasks** in local state by `order` after any create/update/reorder response.
4. **Visual affordance**: drag handle or clear “priority” instruction in the Tasks header.

---

## Frontend: Dashboard To-Do Panel

**Suggested component:** e.g. `DashboardTaskList.tsx` (name as preferred).

**Inputs:** `projects` (filter `ACTIVE`), `projectTasks`, `clients` if not nested on `project.clientId` (populate shape matches existing `Project` types).

**Derivation steps:**

1. Filter **projects** to `status === 'ACTIVE'` (confirm whether **PAUSED** projects should appear—default recommendation: **ACTIVE only**).
2. Build a set of **active project IDs**.
3. Filter **tasks** to those whose `projectId` resolves to an active project and `status` is `TODO` or `IN_PROGRESS`.
4. **Sort tasks within each project** by `order` ascending.
5. **Group** by client name (from populated `project.clientId`), then by project title.
6. **Empty state** when no open tasks: short message + link to Projects.

**Row content (minimum):**

- Client name (group header) / Project name (subheader or inline)
- Task title
- Status badge or icon (`TODO` vs `IN_PROGRESS`—reuse semantics from `ProjectTaskList`)
- **Play** button

**Interaction:**

- **Play**: open the [pre-start modal/drawer](#timer-start-from-a-task-play) with **project** and **project task** already fixed from the row; user sets **task type** and optional **description**, then confirms.
- Optional: clicking the **project** or **task** title opens Projects filtered to that project or focuses task (nice-to-have).

---

## Timer Start from a Task (“Play”)

`POST /api/time-entries/start` **requires `projectId`, `taskTypeId`**, and accepts optional **`projectTaskId`** and **`description`**.

### Chosen UX for v1: modal or drawer

**Play** does **not** start the timer immediately. It opens a **modal** (desktop-friendly) or **drawer** (mobile-friendly; same fields) that shows:

| Field | Behavior |
|-------|----------|
| **Context (read-only)** | Client / project / task title so the user confirms they are tracking the right work. |
| **Task type** | Required `<select>` — same options and rate labels as `TimerControls` (`showRate` when admin). |
| **Description** | Optional text — same role as the main timer’s “What are you working on?” |
| **Primary action** | **Start timer** — enabled only when a task type is selected. |
| **Cancel** | Close without starting. |

**Why this over silent defaults:** Task type drives **hourly rate** and reporting; an explicit choice avoids mis-billed time while keeping the list itself compact.

**Pre-fill (optional implementation detail):** The task-type dropdown may default to **last selection used for this project** or **last global** selection (`localStorage`), falling back to **empty** or **first in list** — user still confirms before start.

**Implementation note:** Reuse patterns from `TimerControls` / `QuickEntry` for task-type list and validation; extract shared bits if it avoids duplication.

**After successful start:**

- Close the modal and refresh or merge **active timer** state (`timeEntriesApi.getActive()` / response from `start`) like existing `handleStart` on Dashboard.
- Optional: **`PATCH` task status** to `IN_PROGRESS` when starting from `TODO`.

**Conflict:** If a timer is already running, match existing behavior: either disable Play or show message (Dashboard already passes `onContinue` only when `!activeTimer?.isRunning` for entries).

---

## Sorting, Grouping, and Edge Cases

| Topic | Recommendation |
|-------|----------------|
| **PAUSED projects** | Exclude from To-Do by default; tasks remain manageable on Projects. |
| **Projects without client** | If `clientId` missing, group under “Unknown client” or project-only group. |
| **Many tasks** | Collapsible client sections or “show more” per project to keep the dashboard short. |
| **Members** | See tasks and can start timer if API allows; **reorder** may be admin-only—members read-only order. |
| **Completed hidden** | `COMPLETED` never listed; user completes work on Projects or via status elsewhere. |

---

## Permissions (admin vs member)

- **`PUT /api/project-tasks/reorder`** is **`requireAdmin`** today. **Members** cannot change priority unless the route is extended (e.g. `requireMember` with workspace check). **Recommendation:** keep reorder **admin-only** for v1; Dashboard To-Do is read-only order for members.
- **Timer start** is available to members where existing `timeEntries` routes allow—align with current Dashboard behavior.

---

## Testing Checklist

- [ ] Active project with mixed `TODO` / `IN_PROGRESS` / `COMPLETED` tasks: only open states appear.
- [ ] Reorder on Projects: Dashboard reflects new order after refresh.
- [ ] Play opens modal; after confirm, timer starts with correct `projectId`, `taskTypeId`, and `projectTaskId`; entry appears in reports with task link.
- [ ] Modal cancel does not start timer; task type required before Start enabled.
- [ ] Start blocked or handled when timer already running (consistent with app rules).
- [ ] Workspace with multiple clients: grouping by client is correct.
- [ ] Member: can use Play; cannot reorder (if admin-only retained).
- [ ] Admin: reorder persists and survives reload.

---

## Optional Follow-Ups

- **Inline complete** from Dashboard (mark `COMPLETED`) with confirmation.
- **Deep link** to Projects → project card expanded to task.
- **Aggregate counts** in dashboard stats (“Open tasks: N”).
- **Server-side dashboard endpoint** for performance on large workspaces.

---

## Key Files Reference

| Layer | Location |
|-------|----------|
| Project task model | `server/src/models/ProjectTask.ts` |
| Project task routes | `server/src/routes/projectTasks.ts` |
| Time entry start | `server/src/routes/timeEntries.ts` |
| Dashboard page | `client/src/pages/Dashboard.tsx` |
| Timer controls | `client/src/components/timer/TimerControls.tsx` |
| Play → start modal (new) | e.g. `client/src/components/timer/StartTaskTimerModal.tsx` (or alongside Dashboard To-Do component) |
| Project task list | `client/src/components/projectTasks/ProjectTaskList.tsx` |
| Projects page / grouping | `client/src/pages/Projects.tsx` |
| API client | `client/src/services/api.ts` |

---

## Related Documentation

- `README.md` — data models and API overview  
- `ARCHITECTURE.md` — auth, workspace, and data flow  
- `SETUP.md` — local environment  

When implementation is complete, update **README.md** (feature description) and optionally **ARCHITECTURE.md** (if new settings or endpoints are added).
