# Onboarding UX expansions — Build Plan

**Status:** Slices A–C shipped  
**Date:** 2026-10-16  
**Parent:** live Projects list, Project Hub, client portal, Resend notifications  
**Related:** [CLIENT_PORTAL_DASHBOARD_BUILD_PLAN.md](./CLIENT_PORTAL_DASHBOARD_BUILD_PLAN.md) · [PROJECT_COMMUNICATION_AND_ASSETS.md](./PROJECT_COMMUNICATION_AND_ASSETS.md) · [RESEND_NOTIFICATIONS_BUILD_PLAN.md](./RESEND_NOTIFICATIONS_BUILD_PLAN.md) · [PROJECT_HUB_BUILD_PLAN.md](./PROJECT_HUB_BUILD_PLAN.md)

Three independent PRs, in this order. Do not mix slices.

| Slice | Name | Approx. effort |
|-------|------|----------------|
| **A** | Unread message counts | ✅ Shipped |
| **B** | Admin workspace pins on client cards | ✅ Shipped |
| **C** | Client task-request intake (admin approves → creates task) | ✅ Shipped |

---

## Locked decisions (review these first)

| # | Decision | Why |
|---|----------|-----|
| 1 | Unread uses a **per-user, per-project `lastReadAt`** on `User`, not a global last-visit or a read-receipt per message. | Matches CP-4 open decision; scales to many projects. |
| 2 | **No cursor → unread count is 0.** Do not badge historical threads on deploy. | Avoids a flood of badges the first morning. |
| 3 | Mark read when the **messages thread successfully loads**, not when the hub/portal project route mounts. | Opening Budget or Brief must not clear Messages. |
| 4 | Unread **excludes the viewer’s own posts**. Portal counts **`clientVisible` only**. Team counts every message they can see. | Matches visibility rules already shipped. |
| 5 | Pins are **workspace-level on `Client`**, admin-only to set. Members **see** the same pin order; they cannot pin. Per-user member pins are later. | Shared studio hot list. |
| 6 | Pin = boolean (pinned first, then A–Z). **No drag-reorder** of the card grid in this program. | Need is “keep hot clients in view.” |
| 7 | Clients **do not create `ProjectTask` rows**. They submit a **request**. **Admin only** approves (creates the task) or declines. Members may **see** pending requests on assigned hubs. | Team still owns the board and billing. |
| 8 | Requests live in a **dedicated section**, not mixed into the live task list until approved. | Separate intake, as requested. |
| 9 | Do **not** reuse `Lead` / public `IntakeForm`. This is per-project studio work, Pattern C. | Different pipeline and audience. |
| 10 | Slice C **hardens `GET /api/project-tasks`** so `role: client` is 403 **before** any new portal writes. | Client JWTs can list internal tasks today. |
| 11 | Email stays **opt-in**. New team pref for request submit; notify the **submitter** when approved. Decline is silent in v1. | Matches existing Resend gates. |

Out of this program: in-app notification bell, sidebar unread totals, email digests (RN-4), member personal pins, client complete/assign/estimate, drag-reorder of client cards.

---

## Slice A — Unread message counts

### Problem

Email is opt-in and easy to miss with several active projects. The hub shows **total** message count, not unread. Portal home shows recent visible messages, not whether this viewer has seen them. Docs already deferred an “unread bell.”

### Outcome

Each person sees a **count of messages they have not opened** on project rows they can already access. Opening the thread marks that project read for them.

### Data

On `User` (not a new collection):

```ts
projectMessageReads?: Map<string, Date>; // projectId → lastReadAt
```

Mongoose: `projectMessageReads: { type: Map, of: Date, default: {} }`.

No migration. Missing key ⇒ count 0.

### Count rule

```
unread = messages where
  userId = workspaceOwner
  projectId = this project
  createdAt > lastReadAt          // if no lastReadAt, count = 0
  authorAuth0Id ≠ viewer
  + portal only: clientVisible: true
```

One aggregation per list fetch — **no N+1** from the client card.

### API

| Method | Path | Who | Behavior |
|--------|------|-----|----------|
| `POST` | `/api/projects/:projectId/messages/read` | admin / assigned member | Set cursor to `now`. 404 if no project access. |
| `POST` | `/api/portal/projects/:projectId/messages/read` | client | Same, Pattern C (`findClientProject`). |
| `GET` | `/api/projects` | existing | Each project: `unreadMessageCount: number` (viewer-scoped). |
| `GET` | `/api/projects/:id` | existing | Include `unreadMessageCount`. |
| `GET` | `/api/member/projects` | member | Same field. |
| `GET` | `/api/portal/dashboard` | client | `unreadMessageCount` on each active project card. |
| `GET` | `/api/portal/projects` | client | Same on each summary. |

Mark-read is idempotent. Do not return the message list from mark-read.

Helper (server): `countUnreadProjectMessages({ workspaceOwnerId, projectIds, viewerAuth0Id, lastReadByProject, clientVisibleOnly })` using `$group` by `projectId`.

### UI

| Surface | Change |
|---------|--------|
| `ClientProjectsCard` project row | Numeric badge when count > 0 (cap display at `9+`). Click still opens hub (existing). |
| Portal home cards + `/portal/projects` | Same badge. |
| Hub `ProjectMessagesPanel` / portal thread | After successful `list`/`getMessages`, call mark-read, then treat local count as 0. |
| Jump nav Messages chip | Optional in A if the hub GET already has the count; otherwise B/C. Not required to ship A. |

Do **not** add a sidebar bell in A.

Email prefs (`teamMessages`, `clientMessages`, `clientVisibleReplies`) stay unchanged. Unread is the in-app backup.

### Test

- [ ] Fresh user, never opened a thread → **no** badges
- [ ] Member posts → admin with `teamMessages` off still gets a badge after refresh of `/projects`
- [ ] Admin opens `#budget` only → badge remains
- [ ] Admin opens `#messages` (thread loads) → badge clears for admin, not for a member who has not opened it
- [ ] Client cannot see a count for an internal team message
- [ ] Own posts never increment own unread
- [ ] Client A project does not leak counts onto Client B
- [ ] Member only sees counts on projects they can access
- [ ] List still one extra aggregation, not one query per project

### Key files

`server/src/models/User.ts` · `server/src/routes/projectMessages.ts` · `server/src/routes/projects.ts` · `server/src/routes/member.ts` · `server/src/routes/portal.ts` · `server/src/lib/memberProjects.ts` · `client/src/components/projects/ClientProjectsCard.tsx` · `client/src/components/projects/ProjectMessagesPanel.tsx` · `client/src/pages/portal/PortalProjectDetail.tsx` · `client/src/pages/portal/PortalHome.tsx` · `client/src/types/index.ts`

When A ships: mark CP-4 unread as in progress/shipped in the portal dashboard plan; add trigger note that in-app unread is orthogonal to Resend.

---

## Slice B — Admin workspace pins

### Problem

`/projects` groups into client cards, then sorts those cards **A–Z**. Admin sort (newest / title / budget) only reorders **projects inside** a card. With more clients, the hot accounts fall down the grid.

### Outcome

Admin pins a client. That card floats to the top of the grid for **admin and members**. Unpinned cards stay A–Z under the pinned block. Members cannot pin.

### Data

On `Client` (Pattern A, admin-owned):

```ts
pinned?: boolean; // default false
```

Index: `{ userId: 1, pinned: 1 }` (optional; list is small).

No `sortOrder`. No pin on `Project`.

### API

Prefer a dedicated write so the Projects card does not send a full CRM PUT:

| Method | Path | Who | Body |
|--------|------|-----|------|
| `PATCH` | `/api/clients/:id/pin` | `requireAdmin` | `{ pinned: boolean }` |

`GET /api/projects` already `.populate('clientId')` — `pinned` comes along.

`findMemberProjects` currently populates `'name company'` only — **add `pinned` (and `isInternal` if not already needed for the card subtitle).**

### UI / sort

`groupProjectsByClient` (`client/src/utils/projectClient.ts`):

1. Group as today (preserve within-card project order).
2. Sort groups: `pinned === true` first, then `clientName.localeCompare(..., { sensitivity: 'base' })`.
3. Put `pinned` on `ClientProjectGroup`.

`ClientProjectsCard` header (admin, `canEdit`): pin/unpin control (icon button, accessible name “Pin client” / “Unpin client”). Pinned state visible as a small label or filled pin on admin **and** member cards so members understand why a card is on top.

No pin on the CRM `/clients` table in B unless it is trivial; Projects list is the product surface.

### Test

- [ ] Pin client Z → card is first; other cards remain A–Z below
- [ ] Unpin → returns to A–Z position
- [ ] Member `/member/projects` shows the same pin order, no pin control
- [ ] Client role cannot call `PATCH .../pin` (403)
- [ ] Pin does not change project-within-card order (admin sort dropdown still applies inside the card)
- [ ] Internal clients can be pinned

### Key files

`server/src/models/Client.ts` · `server/src/routes/clients.ts` · `server/src/lib/memberProjects.ts` · `client/src/utils/projectClient.ts` · `client/src/components/projects/ClientProjectsCard.tsx` · `client/src/types/index.ts` · `client/src/services/api.ts` (`clientsApi`)

---

## Slice C — Client task-request intake

### Problem

New portal users will ask to add work. Today they can only **comment on existing client-visible tasks**. Letting them write `ProjectTask` would put unreviewed items on the board that drives time, retainers, and reports.

### Outcome

On each portal project, a **dedicated Request a task** section. Client submits title + optional description. The team sees a **Client requests** queue on the hub. **Admin** approves (creates a real task) or declines. Team is emailed that a suggestion arrived. Client is emailed when it is approved and becomes a task.

Live **Tasks** lists (portal and hub) stay team-owned until approval.

### Do this first in the C PR (security)

`GET /api/project-tasks` and `GET /api/project-tasks/:id` currently resolve `workspaceOwnerId` for a client JWT and do **not** reject `role: client`. Writes already 403.

Add `requireMemberOrAdmin` (or explicit role check) on those GET handlers so clients get **403**. Portal continues to read tasks only via `GET /api/portal/projects/:id`.

### Model — `ProjectTaskSuggestion` (new, 18th active model)

Pattern B `userId` = workspace owner. Portal writes use Pattern C for **which** project (`findClientProject` + `user.clientId` from DB, never from the body).

| Field | Notes |
|-------|--------|
| `userId` | Workspace owner Auth0 sub |
| `projectId` | Required |
| `clientId` | CRM Client, from portal user / project — never request body |
| `suggestedByAuth0Id` | Portal user |
| `suggestedByName` | Snapshot at submit |
| `title` | Required, trim, max 120 |
| `description` | Optional, trim, max 2000 |
| `status` | `PENDING` \| `APPROVED` \| `DECLINED` (default `PENDING`) |
| `createdTaskId` | Set on approve |
| `reviewedByAuth0Id` / `reviewedAt` | Set on approve or decline |
| timestamps | |

Indexes: `{ userId: 1, projectId: 1, status: 1 }`, `{ userId: 1, clientId: 1 }`.

Cap: **10 `PENDING` per project**. Further POSTs return 400 with a clear message.

Do **not** add `createdByRole` on `ProjectTask` in v1. The link is `suggestion.createdTaskId`. Hub can show “From client request” via that join when listing pending/approved requests. Optional later: stamp the created task.

### API

Portal ( `requireClient` + `findClientProject` ):

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/api/portal/projects/:projectId/task-suggestions` | This client’s requests on this project (pending + recent approved/declined, cap 20). |
| `POST` | `/api/portal/projects/:projectId/task-suggestions` | `{ title, description? }` → `PENDING`. Force `clientId` from context. |

Team (`requireMemberOrAdmin` + project access):

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/api/projects/:projectId/task-suggestions` | All requests for the project. Members: assigned projects only. |
| `POST` | `/api/projects/:projectId/task-suggestions/:id/approve` | **`requireAdmin`**. Creates `ProjectTask`, sets `APPROVED` + `createdTaskId`. Idempotent if already approved (return existing task). 409 if declined. |
| `POST` | `/api/projects/:projectId/task-suggestions/:id/decline` | **`requireAdmin`**. Sets `DECLINED`. 409 if already approved. |

Approve body (all optional):

```ts
{
  title?: string;           // default suggestion.title
  description?: string;     // default suggestion.description
  clientVisible?: boolean;  // default true
  assigneeAuth0Id?: string; // admin only, validate workspace member
  estimatedHours?: number;
}
```

Created task: `status: 'TODO'`, `order` = max(existing)+1. Then `notify` submitter.

Members who POST approve/decline → 403.

### Notifications (Resend)

New preference keys (opt-in, same gates as today):

| Key | Roles | When |
|-----|-------|------|
| `taskSuggestions` | admin, member | Client **submits** a request. Recipients: workspace admin + `assignedMemberIds`, **except** nobody on the team is the author. |
| `taskSuggestionApproved` | client | Admin **approves**. Recipient: **submitter only** (not every portal user on that CRM client). |

UI labels:

- Admin/member: **Task requests** — “Email when a client suggests a new task”
- Client: **Task request approved** — “Email when your team adds a task you requested”

Deep links:

- Team: `/projects/:id#requests` (member: `/member/projects/:id#requests`)
- Client: `/portal/projects/:id#requests` (approved task also exists under `#tasks`)

Decline: **no email** in v1.

Update [RESEND_NOTIFICATIONS_BUILD_PLAN.md](./RESEND_NOTIFICATIONS_BUILD_PLAN.md) **when C ships** (triggers #9 / #10), not in the A/B PRs.

### UI

**Portal project detail** — new section **before Files**, **after Tasks**, `id="requests"`:

- Heading: **Request a task**
- Short copy: requests are reviewed by the team before they appear as tasks
- Form: title, description, submit
- List of this client’s requests with status: Waiting / Added / Not added
- Jump chip **Requests** in `PORTAL_JUMP_SECTIONS`

Do not put a “New task” control on the live Tasks list.

**Admin/member hub** — new section `id="requests"` **immediately above Tasks**:

- Heading: **Client requests**
- Pending rows: title, description, who, when
- Admin: **Add as task** (opens a slim confirm using approve body defaults) and **Decline**
- Member: read-only pending list
- Approved/declined: collapsed or a short “recently reviewed” list so the queue stays scannable
- Jump chip **Requests** on hub nav; pending count on the chip is nice-to-have if the GET is already loaded

Empty: “No client requests yet.”

### Test

- [ ] Client JWT `GET /api/project-tasks` → 403 (regression for the leak)
- [ ] Client POST suggestion on own project → 201 PENDING; hub queue shows it
- [ ] Client cannot POST to another client’s project (404)
- [ ] 11th concurrent PENDING on the same project → 400
- [ ] Member cannot approve/decline (403)
- [ ] Admin approve → `ProjectTask` exists, `clientVisible` default true, suggestion `APPROVED` + `createdTaskId`; portal Tasks list shows it
- [ ] Admin approve with `clientVisible: false` → task on hub, **not** on portal Tasks; request still shows Added to the client
- [ ] Second approve → idempotent, one task
- [ ] Admin decline → not on Tasks; client sees Not added; no email
- [ ] Opt-in `taskSuggestions` off → no team email; on → admin/assigned get mail
- [ ] Submitter with `taskSuggestionApproved` on → email on approve only, not other portal users
- [ ] CRM `Client.email` still unused

### Key files

New: `server/src/models/ProjectTaskSuggestion.ts` · `server/src/routes/projectTaskSuggestions.ts` (or nested routers next to messages/assets)

Touch: `server/src/models/index.ts` · `server/src/index.ts` · `server/src/routes/projectTasks.ts` (GET 403) · `server/src/routes/portal.ts` (mount) · `server/src/lib/email/*` · `client/src/pages/portal/PortalProjectDetail.tsx` · `client/src/pages/ProjectHub.tsx` · `client/src/components/projects/ProjectJumpNav.tsx` · `client/src/components/profile/EmailNotificationPreferences.tsx` · `client/src/types/index.ts` · `client/src/services/api.ts`

When C ships: add a short section to [PROJECT_COMMUNICATION_AND_ASSETS.md](./PROJECT_COMMUNICATION_AND_ASSETS.md) (requests are not messages; they become tasks only after approve).

---

## Delivery order and PR boundaries

```
A unread  →  B pins  →  C harden GET + suggestion model + UI + email
```

| Rule | Detail |
|------|--------|
| One PR per slice | Unread persistence must not ship in the same PR as portal writes |
| A does not need pins or suggestions | Badges on the existing card row |
| B does not need unread | Sort still works if A is not merged yet |
| C does not depend on A or B | Queue is a hub/portal section; a pending-count badge on the list can wait |

**Stop after each slice** for a click-through: admin, one member, the onboarded client.

### Suggested commit messages (when building)

- A: `Show unread project message counts so missed emails are visible in the hub.`
- B: `Let admins pin client cards so hot accounts stay at the top of Projects.`
- C: `Let clients request tasks for admin approval instead of writing the board directly.`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-16 | Spec from onboarding feedback: unread → workspace pins → client request intake (admin approve) |
| 2026-10-16 | **Slice A shipped** — per-project read cursor, list badges, mark-read when the thread is on screen |
| 2026-10-16 | **Slice B shipped** — admin workspace pins on client cards; members see the same order |
| 2026-10-16 | **Slice C shipped** — client task requests; admin approve creates `ProjectTask`; `GET /api/project-tasks` 403 for client JWTs |
