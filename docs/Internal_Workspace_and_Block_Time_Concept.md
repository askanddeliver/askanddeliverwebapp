# Internal Workspace & Block Time — Feature Concept
*Ask And Deliver · April 2026*

Companion to `FEATURE_CONCEPTING_REFERENCE_2026-04.md`. Two related additions:

1. A dedicated **Internal Workspace** screen for Ask+Deliver's own projects and tasks, separated from client work.
2. A **Block Time** calendar feature that plans time across client projects, internal projects, and personal/downtime — and acts as a one-tap launcher for the timer.

---

## 1. Context from the Current Data

From the April 23, 2026 backup (239 time entries, 34 projects, 8 clients):

| Client | Hours | Entries | Share |
|---|---:|---:|---:|
| Chris Circo | 115.01 | 102 | 41.4% |
| David Cooke | 81.06 | 37 | 29.2% |
| Tyler Herring | 37.17 | 38 | 13.4% |
| Eric Gautschi | 22.71 | 30 | 8.2% |
| **Matt Linder *(self)*** | **11.17** | **15** | **4.0%** |
| Joel Foresman | 5.81 | 12 | 2.1% |
| Marco Rutigliano | 5.08 | 5 | 1.8% |

The self-client currently holds **5 projects and 22 project-tasks** — "Ask and Deliver Web Application," "FieldPass App," "Brookings Public Arts Commision," "Admin Tasks," and "Concepts and Research." That's 22 of 170 project-tasks (**13%**) competing for attention in the dashboard to-do list despite representing only 4% of tracked hours. That mismatch is the dashboard congestion problem.

---

## 2. Decisions Locked In

| Question | Decision |
|---|---|
| Internal workspace data model | Keep the existing self-client (Matt Linder). Add an `isInternal: boolean` flag on `Client`. No schema migration of existing data. |
| Blockable entities | Client projects/tasks, internal projects/tasks, personal/downtime blocks, recurring blocks. |
| Block → TimeEntry relationship | **Planning-first, launcher-second.** Blocks never auto-log. A block acts as a quick-start for the timer, pre-filling project/task/description. Actuals remain the responsibility of the timer. |

---

## 3. Feature Concepting Checklist (from reference doc)

| Check | Answer |
|---|---|
| Who uses it? | Admin only (initially). Members don't see Internal Workspace or Block Time. |
| Data scoping? | Block Time: **Pattern B** (workspace owner). `isInternal` flag on Client: no change to existing Pattern A. |
| New model needed? | Yes — `TimeBlock`. Follows Pattern B. |
| Relates to billing? | No direct billing changes. Internal projects remain billable-shaped (HOURLY/none) so existing reports continue to function; they're simply excluded from client-facing rollups. |
| Financial data visible? | Internal Workspace should hide rates/amounts by default (time spent on your own business is a cost, not revenue). Gate on `isAdmin` as usual; additionally suppress currency columns when `client.isInternal === true`. |
| Date filtering? | Block Time is date-range heavy. Use `toUTCStartOfDay` / `toUTCEndOfDay` and `parseDateStart` / `parseDateEnd` as always. |
| Public access? | None. |
| Member experience? | Phase 1: not exposed to members. |
| Affects Invoice flow? | Time entries on `isInternal` clients should be excluded from the "Generate Invoice" candidate list. This is a filter on the existing query, not a new code path. |
| GET with arrays? | New `GET /api/time-blocks?projectIds[]=...&taskTypeIds[]=...` needs the `qs` normalization pattern. |

---

## 4. Data Model Changes

### 4.1 `Client.isInternal` (additive, non-breaking)

```ts
// server/src/models/Client.ts
{
  // ...existing fields
  isInternal: { type: Boolean, default: false, index: true },
}
```

Migration: one-time backfill for the self-client record.

```
db.clients.updateOne(
  { _id: ObjectId("69d52b39ec21900c93c98028") },
  { $set: { isInternal: true } }
);
```

No change to time entries, projects, or invoices. Everything underneath inherits the flag through `project.clientId → client.isInternal`.

**Where the flag gets read:**
- Client list views: filter `isInternal: false` (unless "Show internal" toggle is on).
- Dashboard todo list: filter out project-tasks whose project's client is internal.
- Invoice candidate list: same filter.
- New Internal Workspace screen: filter `isInternal: true`.
- Reports: existing client filter UI gains an "Internal" option separate from the client picker.

### 4.2 New model: `TimeBlock`

```ts
// server/src/models/TimeBlock.ts
{
  _id: ObjectId,
  userId: string,                // Pattern B: workspace owner
  startTime: Date,               // UTC
  endTime: Date,                 // UTC
  title: string,                 // e.g. "Grip design deep work"

  // Planned association — all optional. If all null, it's a personal/downtime block.
  projectId?: ObjectId,          // → Project
  taskTypeId?: ObjectId,         // → TaskType
  projectTaskId?: ObjectId,      // → ProjectTask (optional, as on TimeEntry)

  kind: 'WORK' | 'PERSONAL' | 'DOWNTIME' | 'MEETING' | 'ADMIN',
  colorHint?: string,            // optional override; otherwise derived from project/client

  // Recurrence
  recurrenceRule?: string,       // RFC 5545 RRULE string; simple subset only (see §7)
  recurrenceParentId?: ObjectId, // set on materialized instances
  exceptionDates?: Date[],       // for skipped occurrences

  // Linkage to actuals (populated lazily by the timer launcher)
  launchedTimeEntryIds: ObjectId[],

  notes?: string,
  createdAt: Date,
  updatedAt: Date,
}
```

Indexes: `{ userId: 1, startTime: 1 }`, `{ userId: 1, projectId: 1 }`, `{ recurrenceParentId: 1 }`.

FK shape matches the reference doc:

```
TimeBlock → Project     (projectId, optional)
         → TaskType    (taskTypeId, optional)
         → ProjectTask (projectTaskId, optional)
         → TimeEntry[] (launchedTimeEntryIds — reverse lookup from launches)
```

No foreign keys are required to exist (a block can be a pure downtime block).

### 4.3 Optional: `TimeEntry.blockId` back-reference

To compute "planned vs actual" reporting without scanning `launchedTimeEntryIds` arrays:

```ts
// models/TimeEntry.ts
blockId?: ObjectId,  // set when timer was launched from a block
```

Low cost, high value for §8 reporting. Recommended but not required for v1.

---

## 5. API Surface

### 5.1 Internal Workspace (no new endpoints)

All existing endpoints continue to work. Client code filters by `client.isInternal`:

```
GET  /api/clients                 → existing; UI filters by isInternal
GET  /api/projects?clientId=...   → existing
GET  /api/project-tasks?projectId=... → existing
```

One new query param helper for the dashboard's todo list:

```
GET /api/project-tasks?scope=client-only
GET /api/project-tasks?scope=internal-only
GET /api/project-tasks?scope=all   // default, preserves current behavior
```

Implementation: join on `Project → Client` and filter by `isInternal`. Keeps the dashboard query single-round-trip.

### 5.2 Block Time (`/api/time-blocks`)

```
GET    /api/time-blocks?start=...&end=...
          [&projectIds[]=...][&kinds[]=...]
          → array of block instances in range (recurrences expanded)
GET    /api/time-blocks/:id
POST   /api/time-blocks
PATCH  /api/time-blocks/:id            → edit single instance or series (see §7)
DELETE /api/time-blocks/:id            → delete single instance or series

POST   /api/time-blocks/:id/launch     → creates a running TimeEntry from the block
                                         body: { description?, startNow?: boolean }
                                         returns: { timeEntry, block }
```

Auth: `checkJwt + requireAdmin` throughout.

Array params (`projectIds[]`, `kinds[]`) use the `qs` normalization pattern from `timeEntries.ts`.

---

## 6. UI — Internal Workspace

### 6.1 Placement in the Sidebar

Group structure:
```
Dashboard
Time Blocks          ← new
Projects
Clients
  └ + Internal Workspace (sub-link, badge = open internal tasks count)
Reports
Invoices
Proposals
Leads
Portfolio
Team
Settings
```

`Internal Workspace` is a sub-link under `Clients` for discoverability, but it renders a dedicated screen — not a pre-filtered Clients list.

### 6.2 Screen Anatomy

```
┌─────────────────────────────────────────────────────────────┐
│ Ask + Deliver — Internal Workspace                          │
│ ──────────────────────────────────────────────────────────  │
│ [Overview]  [Projects]  [Tasks]  [Time]                     │
│                                                             │
│ Overview (default tab):                                     │
│   • This week: Xh tracked on internal work                  │
│   • Open tasks: N across K projects                         │
│   • Next scheduled block: [day, time, project]              │
│   • Quick-add task    Quick-start timer                     │
│                                                             │
│ Tasks tab:                                                  │
│   Columns: Project · Task · Status · Last touched · Hours   │
│   Filters: project, status (TODO/IN_PROGRESS/COMPLETED)     │
│   No rate column, no amount column.                         │
└─────────────────────────────────────────────────────────────┘
```

Key UX principle: **this screen intentionally looks less like a client ledger and more like a personal task tracker.** No currency columns; heavier on status and recency.

### 6.3 Dashboard Change (the core complaint)

Current dashboard todo list: all open `ProjectTask`s across all clients.

New dashboard todo list: all open `ProjectTask`s where `client.isInternal === false`, plus a small collapsed card at the bottom:

```
┌──────────────────────────────────────────────────┐
│ Internal (Ask + Deliver)              3 open  ▸ │
└──────────────────────────────────────────────────┘
```

Clicking expands or navigates to the Internal Workspace. This preserves visibility without competing with client work.

---

## 7. UI — Block Time

### 7.1 Views

Month / Week / Day views. Standard calendar-app conventions:

- **Month**: compact blocks, click to open day view.
- **Week**: 7-column time grid, 6am–10pm default, drag to create, drag edges to resize.
- **Day**: hour-rows, room for multi-line titles, current-time indicator.

Views share a single header: date navigation · view switcher · filter chips · "+ Block" button.

### 7.2 Block Creation Flow

Clicking an empty time slot opens a popover:

```
Title ___________________________
Kind  (○ Work  ○ Personal  ○ Downtime  ○ Meeting  ○ Admin)

When Work/Admin is selected:
  Client    [dropdown — shows client name with (Internal) badge for isInternal]
  Project   [filtered by selected client]
  Task type [filtered by selected project]
  Project task [optional]

Start  [Apr 24, 2026   9:00 AM]
End    [Apr 24, 2026  11:00 AM]   Duration: 2h

Repeats  [Does not repeat ▾]
  Daily / Weekly / Every weekday / Custom

Notes ___________________________

[Cancel]  [Save Block]
```

When kind is `PERSONAL` or `DOWNTIME`, project fields are hidden. When `MEETING`, project is optional (client meetings get linked; standups don't need to).

### 7.3 Block → Timer Launch

This is the quick-start flow you called out. An open calendar block has two actions:

```
┌─ 9:00 AM Grip design deep work ──────────────┐
│  Tyler Herring · 2026 Novelty Grip Designs   │
│  Design · 2h                                 │
│                                              │
│  [▶ Start Timer]  [Edit]                     │
└──────────────────────────────────────────────┘
```

**Start Timer** calls `POST /api/time-blocks/:id/launch`:

1. Server creates a `TimeEntry` with `isRunning: true`, pre-filled from the block:
   - `projectId`, `taskTypeId`, `projectTaskId`, `description` (from block title/notes)
   - `startTime = now` (not the block's planned start — actuals are actuals)
   - `blockId` set to the block's id
2. Server pushes the new entry's id into `block.launchedTimeEntryIds`.
3. Client flips its active-timer state and shows the running timer UI.

If the timer is already running, the UI prompts: *"Stop current timer and start this one?"* (Same confirmation pattern as the existing timer switch.)

**Critical property:** the block is not modified, not marked "done," and the TimeEntry duration is governed by the timer, not the block. A 2-hour planned block that actually ran 47 minutes logs 47 minutes. A 30-minute block that ran 2 hours logs 2 hours. Planning and actuals are both honest.

### 7.4 Recurrence Model (keep it simple)

Support this subset of RRULE:

- `FREQ=DAILY;INTERVAL=N`
- `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`
- `FREQ=WEEKLY;INTERVAL=N;BYDAY=...`
- `UNTIL=...` or `COUNT=N`

Recurring blocks are stored once with an `recurrenceRule`. `GET /api/time-blocks?start&end` expands instances server-side on read. Edits present a standard prompt: *"Edit this event / this and following / all events."*

Skip the full RRULE spec in v1 — monthly-by-nth-weekday and yearly recurrences can come later.

---

## 8. Reporting Implications

Two small additions flow naturally from the `blockId` back-reference:

1. **Plan vs actual** — for any date range, compare `sum(block.duration)` to `sum(launchedTimeEntries.duration)` grouped by project. Answers "did I spend the time I planned on X?"
2. **Unblocked time** — time entries with no `blockId` in a range. Answers "what am I doing that I'm not planning for?"

Neither requires a new report page in v1 — both are natural columns on the existing time report.

Internal client time is already excluded from client-facing invoice rollups via the `isInternal` filter, so invoice generation is unaffected.

---

## 9. Edge Cases & Gotchas

| Case | Resolution |
|---|---|
| Block overlaps another block | Allowed. Calendar UIs universally allow overlapping events. |
| Two blocks, both launched → two running timers? | No. Existing "only one timer runs at a time" rule is unchanged. Launching while another is running stops the current one. |
| Deleting a project that has blocks pointing to it | Block's `projectId` becomes dangling. Server-side cleanup job nulls `projectId` on block soft-delete, converts kind to `PERSONAL` if no other FK. Mirror the existing TimeEntry behavior. |
| Flipping a client's `isInternal` back and forth | Safe. Flag is a query filter, not a data mutation. Existing time entries/invoices keep pointing at the same client regardless. |
| Internal client appears in invoice generation anyway | Hard filter at the invoice generation query level, not just UI. Prevents accidental invoice for yourself. |
| Block in the past, never launched | Left alone. No retroactive TimeEntry. The Plan-vs-Actual report surfaces it as "planned, not tracked." |
| Timezone of recurring blocks across DST | Store RRULE with timezone; expand in user's timezone on read. South Dakota → `America/Chicago`. |

---

## 10. Build Order (Suggested)

Smallest useful increments first:

1. **`isInternal` flag + dashboard filter** *(≈ half day)*
   Schema field, migration for the one self-client record, dashboard todo query filter, Internal collapsed card at bottom of dashboard. *This alone resolves the original complaint.*

2. **Internal Workspace screen** *(≈ 1 day)*
   New page, sidebar link, Overview + Tasks tabs. No new models.

3. **`TimeBlock` model + basic CRUD + Week view** *(≈ 2–3 days)*
   Non-recurring blocks only. Click-drag to create. Project/task assignment. No launcher yet.

4. **Block → Timer launcher** *(≈ half day)*
   `POST /launch` endpoint. `blockId` on TimeEntry. "Start Timer" button in block popover.

5. **Month + Day views** *(≈ 1 day)*
   Reuse block components, different layouts.

6. **Recurrence** *(≈ 1–2 days)*
   The simple RRULE subset. Edit-this / edit-all prompt.

7. **Plan-vs-actual column on Time report** *(≈ half day)*

Total to full v1: roughly 6–8 working days. Step 1 is a standalone ship.

---

## 11. Open Questions Worth Revisiting Before Build

- Should members ever see Block Time? (Phase 1 says no. But a team calendar view of "who's working on what when" is a natural Phase 2.)
- Google Calendar sync — one-way export of blocks, two-way, or skip? Sync complexity is high; the launcher pattern may make sync unnecessary if you live in this app already.
- Do downtime blocks count toward any utilization target? (Depends on whether Ask+Deliver ever adopts a utilization metric; noted but not blocking.)
- Colors: derive from Client, from Project, or let blocks set their own? Recommend: derived from Client by default with per-block override, consistent with how most calendar apps handle calendars.
