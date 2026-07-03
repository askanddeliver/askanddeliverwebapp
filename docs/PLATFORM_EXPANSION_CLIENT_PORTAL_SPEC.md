# Platform Expansion — Client Portal Spec (v1)

**Status:** Planning (July 2026)  
**Parent:** [PLATFORM_EXPANSION_BUILD_PLAN.md](./PLATFORM_EXPANSION_BUILD_PLAN.md)  
**See also:** [PLATFORM_EXPANSION_ARCHITECTURE.md](./PLATFORM_EXPANSION_ARCHITECTURE.md)

This document locks **client portal v1** scope: project browsing, brief, tasks with status, and **per-project communication** — all scoped to the authenticated client's CRM record.

---

## v1 goals (locked)

The client portal is a **read-mostly project hub** with **two-way project-scoped messaging**. Clients log in at `/portal` and can:

1. **Browse their projects** — list and open projects tied to their `clientId`
2. **Read the project brief** — rich-text scope/context the agency has published
3. **See project tasks** — title, description, and status for **client-visible** tasks only
4. **Communicate in project context** — message thread attached to each project (not global DMs)

**Explicitly in v1:** Projects + brief + tasks + messages (bundled in Phase 7).

**Deferred to v1.1 (same phase optional / follow-on PR):** Invoices list, pay links, billing profile page — valuable but not required for the first client portal ship if time-constrained.

---

## Persona & access

| Rule | Detail |
|------|--------|
| Role | `client` with `clientId` set |
| Invite | Admin only — [Clients page → Invite to portal](../PLATFORM_EXPANSION_ARCHITECTURE.md#client-invite-flow-admin-only--locked) |
| Data scope | `{ userId: workspaceOwnerId, clientId: user.clientId }` on every query |
| Never expose | Rates, budgets, margins, internal tasks, DRAFT invoices, other clients' data, team earned rates |

---

## Information architecture

```
/portal                          Home — project summary + recent activity
/portal/projects                 Project list (browse)
/portal/projects/:id             Project hub (brief + tasks + messages)
/portal/invoices                 (v1.1) SENT/PAID invoices
/portal/invoices/:id             (v1.1) Invoice detail + pay link
```

**Primary nav (v1):** Home · Projects  
**Secondary (v1.1):** Invoices

No separate `/portal/messages` — communication lives **inside each project** so context is always clear.

---

## Page specs

### Home — `/portal`

**Purpose:** Orientation and quick entry to active work.

| Widget | Content |
|--------|---------|
| Welcome | Client name + tenant company name (from SiteConfig) |
| Active projects | Cards for `status ∈ { ACTIVE, PAUSED }` — title, status badge, task progress snippet |
| Recent updates | Last 3–5 `clientVisible` messages or task status changes across projects |
| Empty state | "No active projects" + contact email from SiteConfig |

No financial widgets on home in v1.

---

### Project list — `/portal/projects`

**Purpose:** Browse all projects for this client.

**List query:**
```javascript
Project.find({
  userId: workspaceOwnerId,
  clientId: user.clientId,
  status: { $in: ['ACTIVE', 'PAUSED', 'COMPLETED'] }  // exclude ARCHIVED
}).sort({ updatedAt: -1 })
```

| Column / card field | Shown |
|---------------------|-------|
| Title | ✓ |
| Status | ✓ — client-friendly label (see below) |
| Excerpt | ✓ if set |
| Last updated | ✓ |
| Open task count | ✓ — count of client-visible tasks where status ≠ COMPLETED |
| Budget, rates | ✗ |

**Filters (v1):** Tabs or pills — Active · Paused · Completed · All

**Project status — client labels:**

| Internal | Client label |
|----------|--------------|
| `ACTIVE` | Active |
| `PAUSED` | On hold |
| `COMPLETED` | Complete |
| `ARCHIVED` | Hidden from portal |

---

### Project detail — `/portal/projects/:id`

**Purpose:** Single project hub — brief, tasks, communication. This is the core v1 screen.

**Layout (three sections, one scrollable page or tabs):**

```
┌─────────────────────────────────────────────────────────┐
│  Project title · Status badge · Last updated             │
├─────────────────────────────────────────────────────────┤
│  BRIEF                                                   │
│  Rendered HTML from Project.brief (sanitized)            │
│  Fallback: Project.description or excerpt if no brief  │
├─────────────────────────────────────────────────────────┤
│  TASKS                                                   │
│  Client-visible tasks only · status markers              │
├─────────────────────────────────────────────────────────┤
│  MESSAGES                                                │
│  Thread · client can read + reply                          │
└─────────────────────────────────────────────────────────┘
```

#### Brief section

| Field source | Display |
|--------------|---------|
| `Project.brief` | Primary — render sanitized HTML (Tiptap output) |
| `Project.excerpt` | Optional subtitle under title |
| `Project.description` | Fallback if `brief` empty |

**Hide:** `budget`, `billingMode`, internal admin fields, portfolio conversion fields unless explicitly marked client-visible later.

**Admin control:** Brief is visible when populated — no separate publish flag in v1. Admin uses Projects screen to edit brief; portal reflects current content. *(Future: `briefClientVisible` toggle if needed.)*

#### Tasks section

**Query:**
```javascript
ProjectTask.find({
  userId: workspaceOwnerId,
  projectId,
  clientVisible: true
}).sort({ order: 1 })
```

| Field | Shown |
|-------|-------|
| `title` | ✓ |
| `description` | ✓ |
| `status` | ✓ — client-friendly marker |
| `estimatedHours` | ✗ (internal) |
| Assignee, order | ✗ |

**Task status — client labels & markers:**

| Internal | Client label | Visual |
|----------|--------------|--------|
| `TODO` | Open | Neutral / outline |
| `IN_PROGRESS` | In progress | Active / accent |
| `COMPLETED` | Complete | Muted + check |

Use consistent badge component across list and detail.

**Admin control — `ProjectTask.clientVisible`:**

```typescript
// server/src/models/ProjectTask.ts — additive
clientVisible: { type: Boolean, default: false, index: true }
```

- Default **`false`** — admin opts tasks in for client visibility
- Admin project task modal: checkbox **"Visible to client portal"**
- Bulk action (v1.1): "Show all tasks to client" on project

**Empty state:** "Your team hasn't shared task updates yet" when no `clientVisible` tasks.

#### Messages section (v1 — required)

Per-project thread using `ProjectMessage` model. See [Messaging](#messaging-projectmessage).

| Capability | Client |
|------------|--------|
| Read messages where `clientVisible: true` | ✓ |
| Post new message on project | ✓ (always stored `clientVisible: true`) |
| Edit/delete own messages | ✗ v1 |
| @mentions, attachments | ✗ v1 |

**UX:** Chronological list (oldest first or newest-first with sticky compose — pick newest-first + compose at bottom). Each item: author display name, timestamp, body (plain text or markdown subset).

**Polling:** Refresh on interval (60s) or manual refresh button — no WebSocket in v1.

---

### Invoices (v1.1 — optional same release)

If shipped with v1:

- `/portal/invoices` — SENT/PAID only, pay link on SENT
- Project detail sidebar link: "View invoices for this project" when invoices exist for `projectIds`

Not blocking v1 if projects + messages ship first.

---

## Messaging (`ProjectMessage`)

Bundled with client portal v1 — admin/member compose UI ships in the same phase (or immediately prior PR).

### Model

```typescript
interface IProjectMessage {
  userId: string;              // workspace owner (Pattern B)
  projectId: ObjectId;
  authorAuth0Id: string;
  authorName: string;          // snapshot at post time
  authorRole: 'admin' | 'member' | 'client';
  body: string;
  clientVisible: boolean;      // default false for admin/member; always true for client posts
  createdAt: Date;
  updatedAt: Date;
}
```

### Routes

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| `GET` | `/api/portal/projects/:id/messages` | `requireClient` | `clientVisible: true` only |
| `POST` | `/api/portal/projects/:id/messages` | `requireClient` | Body `{ body }` — force `clientVisible: true`, `authorRole: client` |
| `GET` | `/api/projects/:id/messages` | member/admin | All messages (internal + client) |
| `POST` | `/api/projects/:id/messages` | member/admin | Body `{ body, clientVisible? }` — default `clientVisible: false` |

Portal project detail endpoint may **embed** recent messages or use separate messages fetch — prefer separate fetch for simpler pagination later.

### Admin UX (same phase)

On admin/member **project detail** (existing Projects page):

- **Messages** panel below tasks
- Compose with **"Visible to client"** checkbox (default off)
- When checked, message appears in client portal thread

---

## API — portal project payloads

### `GET /api/portal/projects`

```typescript
{
  projects: Array<{
    _id: string;
    title: string;
    excerpt?: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    updatedAt: string;
    openTaskCount: number;  // client-visible, not COMPLETED
  }>
}
```

### `GET /api/portal/projects/:id`

```typescript
{
  project: {
    _id: string;
    title: string;
    excerpt?: string;
    status: string;
    brief?: string;       // HTML — sanitized server-side or client-side
    description?: string;
    updatedAt: string;
  };
  tasks: Array<{
    _id: string;
    title: string;
    description?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  }>;
  // messages via GET .../messages or embedded last N
}
```

**Security:** Verify `project.clientId === user.clientId` before return; 404 if not (don't leak existence).

---

## Client portal shell

| Element | Behavior |
|---------|----------|
| `ClientPortalLayout` | Tenant-branded (WorkspaceThemeContext) |
| `PortalNav` | Home, Projects; user menu (profile, logout) |
| Logo / home link | `/portal` |
| No admin sidebar | Never show internal nav items |

---

## Admin workflows (supporting portal)

| Action | Where |
|--------|-------|
| Invite client user | Clients → Invite to portal |
| Edit brief | Projects → project modal / brief editor |
| Share task with client | Project task → **Visible to client portal** |
| Message client | Project → Messages → check **Visible to client** |
| Revoke access | Users → disable client user or remove `clientId` link |

---

## Suggestions included in spec

| Suggestion | Verdict |
|------------|---------|
| Project status on list | ✓ v1 |
| Task open count on project cards | ✓ v1 |
| Client can reply in message thread | ✓ v1 |
| Messages only inside project (not global inbox) | ✓ v1 — locked |
| Brief sanitization for HTML | ✓ v1 |
| Invoices + pay links | v1.1 — optional same release |
| Email notify on new client message | ✗ defer |
| Client upload attachments in messages | ✗ defer |
| Client sees project files / deliverables | ✗ defer (use intake-style file share later) |

---

## Phase alignment

| Phase | Deliverable |
|-------|-------------|
| **5** | `client` role + invite + `/portal` shell placeholder |
| **7** | **Full client portal v1** — projects list/detail, brief, tasks (`clientVisible`), `ProjectMessage` + thread UI on portal and admin project view |
| **7b** (optional) | Invoices list/detail in portal |

Phase 9 (standalone messaging) **merged into Phase 7** for client-facing thread; admin compose remains part of Phase 7.

---

## Testing checklist

- [ ] Client A cannot open Client B project by ID (404)
- [ ] Internal tasks (`clientVisible: false`) never appear in portal
- [ ] Brief HTML renders safely; empty brief falls back gracefully
- [ ] Client post appears in admin project messages with client badge
- [ ] Admin message with `clientVisible: false` hidden from portal
- [ ] Admin message with `clientVisible: true` visible to client
- [ ] ARCHIVED projects hidden from portal list
- [ ] No rate/budget fields in portal API responses

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-03 | Initial client portal v1 — projects, brief, tasks, per-project messaging |
