# Block Time & Internal Workspace — Build Plan & Phased Prompts

*Derived from `Internal_Workspace_and_Block_Time_Concept.md` (April 2026). Use this document with Cursor/Claude to implement in order.*

---

## 1. Overview

The feature has two pillars:

1. **Internal Workspace** — Dedicated area for Ask+Deliver’s own projects/tasks, separated from client work (`Client.isInternal` + UI).
2. **Block Time** — Calendar planning for client work, internal work, and personal/downtime; **planning-first**; blocks are a **one-tap launcher** for the timer (actuals stay on `TimeEntry`).

Dependencies: **foundation (`isInternal` + API filters) → Internal Workspace page → `TimeBlock` + week UI → launch + `blockId` → month/day → recurrence → plan vs actual (optional v1.1).**

Sequencing matches the concept doc §10; each phase below aims for a **single shippable outcome**.

### 1.1 UI/UX design reference (Claude Design prototype)

A standalone HTML/JSX prototype in **[`docs/block time ui ux updates/`](./block%20time%20ui%20ux%20updates/README.md)** documents the **intended** Block Time look and behavior: client color legend, kind colors, week/month/day layouts, create modal (kind pills, internal client label), detail popover with **Start Timer** primary, grid constants (7am–9pm, 64px/hour), and theme variants. **Read [`block time ui ux updates/README.md`](./block%20time%20ui%20ux%20updates/README.md)** before building Phases 4–6 so the production UI matches the agreed design. The prototype is not production code; wire it to real APIs and the global timer per the concept doc.

---

## 2. Phase map

| Phase | Name | Primary outcome |
|-------|------|-----------------|
| **0** | Decisions + color strategy | Confirm open questions; document choices (minimal or no code) |
| **1** | `isInternal` + data | Schema, backfill, client list + invoice/report filters, dashboard todo scope |
| **2** | Dashboard + Internal Workspace v1 | Collapsed “internal” card; new page (Overview/Tasks), no rates on internal |
| **3** | `TimeBlock` API + model | CRUD, `GET` in range, `qs` arrays, admin-only, indexes |
| **4** | Block Time week view v1 | Create/edit (non-recurring), drag/resize, **colors from client** (+ kind fallback) |
| **5** | Timer launch | `POST /launch`, `TimeEntry.blockId`, launched ids, same UX as timer switch |
| **6** | Month + day views | Reuse block primitives; navigation + filters |
| **7** | Recurrence | RRULE subset, expand on read, edit this / following / all |
| **8** | Reporting polish | Plan vs actual and/or unblocked time on time report (as prioritized) |

- Phases **1–2** can ship **without** Block Time.
- Phases **3–5** are the minimum **“Block Time that matters”** vertical slice.

---

## 3. Logical decision points

Address these before or during the build. The concept doc **locks** some items; revisit only if product direction changes.

### 3.1 Already fixed in the concept (no need to re-decide)

- Internal data: keep self-client + `isInternal` on `Client` (no broad migration of existing rows).
- Blocks do **not** auto-log; the **timer** owns actuals; optional `TimeEntry.blockId`.
- v1: **admin-only**; members do not see Internal Workspace or Block Time.

### 3.2 Decisions to make explicitly

1. **Client colors (calendar legibility — one color per client)**  
   - **Default:** derive **display color from the client** for work-linked blocks; **fixed palette** for non-work kinds (`PERSONAL`, `DOWNTIME`, `MEETING`, `ADMIN`) and a distinct default for the **internal** client.  
   - **Storage options:**  
     - **(A)** `Client.calendarColor` (or `color`) with optional default from name/id,  
     - **(B)** deterministic hash from `clientId` into a small accessible palette (no new field),  
     - **(C)** only `TimeBlock.colorHint` — weaker for “at a glance” browsing.  
   - Concept recommends: **client-derived + per-block `colorHint` override** (like multi-calendar UIs).  
   - **Accessibility:** minimum contrast on block chips; do not rely on red/green alone.

2. **Timezone**  
   - RRULE and expansion: single **org** timezone in settings vs per-user (concept mentions `America/Chicago` for South Dakota). Confirm for v1.

3. **`GET /api/project-tasks?scope=`**  
   - **Default** should remain `all` for backward compatibility; dashboard uses `client-only` for the main todo.

4. **Invoice / candidate list**  
   - Hard **server-side** filter excluding `isInternal` from invoice candidates (not UI-only). Confirm there is no admin escape hatch if that is intended.

5. **Dangling `projectId` on blocks**  
   - Align with `TimeEntry` + §9: cleanup when project deleted (nullify, kind fallback, etc.); match existing soft-delete vs hard-delete patterns.

6. **Post–v1 product**  
   - **Members + shared “who’s when” calendar** (concept §11): defer; note as Phase 2.  
   - **Google Calendar sync** (one-way, two-way, or skip): affects later work, not the core v1 vertical slice.

7. **v1 reporting**  
   - **Plan vs actual** (and **unblocked** time) on the existing time report: **must-have vs fast follow** — concept says new page not required, columns may suffice.

8. **Recurrence v1**  
   - Confirm the **simple RRULE subset** in the concept (defer monthly-nth, yearly, full spec).

### 3.3 Client colors — implementation note

- **Best scanability:** editable **one color per client** in Client settings, with a **sensible default** (e.g. hash into palette) on create so every client is colored on day one.  
- **Fast v1:** hash-only palette + fixed internal color + `colorHint` override; add editable `Client` color later.

---

## 4. Phased prompt sequence (for Cursor / Claude)

Assume workspace root `askanddeliverwebapp/`, and patterns in `ARCHITECTURE.md`, `timeEntries` routes (dates, `qs` normalization, `checkJwt`, `requireAdmin`).

### Phase 0 — Decisions

> Before implementation: confirm calendar color strategy (hashed vs `Client` color field + `TimeBlock.colorHint` override), default timezone, and whether plan-vs-actual ships in v1. Document in a short ADR or ticket comment.

### Phase 1 — `isInternal` foundation

> Implement `Client.isInternal` (boolean, default false, indexed) per `docs/Internal_Workspace_and_Block_Time_Concept.md` §4.1. Add a documented one-time Mongo backfill for the self-client. Update client list to hide internal unless “Show internal” (or equivalent). Server-side: exclude `isInternal` clients from invoice candidate generation. Update dashboard project-tasks loading to use `GET /api/project-tasks?scope=client-only` (add `scope` with join Project→Client, default `all`). Match existing auth and multi-tenant patterns. No new pages yet except what’s needed for filters.

### Phase 2 — Internal Workspace + dashboard card

> Add Internal Workspace route and sidebar: top-level “Time Blocks” can be a stub or omitted until Phase 4; under Clients, sub-link “Internal Workspace” to a dedicated page. Page tabs: Overview (internal hours this week, open task count, next block placeholder), Tasks (columns per concept — no rate/amount). Dashboard: main todo = non-internal only; bottom collapsed card “Internal (Ask + Deliver)” with count, expand or link to Internal Workspace. Reuse `DashboardTaskList` / task patterns; suppress currency for internal client context.

### Phase 3 — `TimeBlock` model and REST API

> Add `TimeBlock` model per concept §4.2 (kinds, optional FKs, `launchedTimeEntryIds`, indexes). Implement `GET/POST/PATCH/DELETE` under `/api/time-blocks` with `start`/`end` range on GET, `projectIds[]` and `kinds[]` with the same `qs` normalization as time entries. Admin-only. Validate UTC with `toUTCStartOfDay` / `toUTCEndOfDay` / `parseDateStart` / `parseDateEnd` as elsewhere. No recurrence in this phase — only single blocks.

### Phase 4 — Week view + client-based colors

> Build admin Block Time week view (6am–10pm default, drag to create, resize). Wire to `time-blocks` API. **Calendar colors:** for blocks with a `project`/`client`, derive bar color from the client (add `Client.calendarColor` or deterministic palette from `clientId` — follow Phase 0 decision). Use `TimeBlock.colorHint` when set to override. Non-work kinds use fixed semantic colors. Block creation popover from concept §7.2 (hide project fields for PERSONAL/DOWNTIME; MEETING optional project). **Do not** implement `POST /launch` yet — UI can show “Start Timer” disabled or hidden until Phase 5.

### Phase 5 — Timer launch + `blockId`

> Add optional `TimeEntry.blockId` and `POST /api/time-blocks/:id/launch` per concept §7.3: create running entry with prefill, append to `launchedTimeEntryIds`, set `blockId`. Client: “Start Timer” and same confirmation as switching timers when one is running. Do not change block duration when stopping timer.

### Phase 6 — Month and day views

> Add month and day views reusing the same block data and color rules; shared header: date nav, view switcher, filter chips, “+ Block”.

### Phase 7 — Recurrence

> Implement `recurrenceRule` storage and simple RRULE subset; expand instances on `GET` for range. PATCH/DELETE with “this / following / all” behavior. Handle `exceptionDates` for skips. Document DST approach per concept §9.

### Phase 8 — Plan vs actual (and optional unblocked time)

> On existing time report, add columns or summary comparing planned block duration to actuals linked via `blockId` where feasible; “unblocked” entries optional. If too large for v1, stub hooks only.

---

## 5. Reference

- **Source concept:** [Internal_Workspace_and_Block_Time_Concept.md](./Internal_Workspace_and_Block_Time_Concept.md)  
- **UI/UX prototype (Claude Design):** [block time ui ux updates/README.md](./block%20time%20ui%20ux%20updates/README.md)  
- **App rules & architecture:** `askanddeliverwebapp/.cursorrules`, `askanddeliverwebapp/ARCHITECTURE.md`  

**Estimated full v1 (concept §10):** on the order of **6–8 working days**; Phase 1 alone is a **standalone** ship that addresses dashboard congestion from internal tasks.
