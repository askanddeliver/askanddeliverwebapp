# Resend Notifications — Build Plan

**Status:** **Paused at RN-3** (Aug 2026) — RN-0–RN-3 shipped and documented; RN-4+ deferred  
**Provider:** [Resend](https://resend.com) — domain verified for Ask And Deliver  
**Related:** [CLIENT_PORTAL_DASHBOARD_BUILD_PLAN.md](./CLIENT_PORTAL_DASHBOARD_BUILD_PLAN.md) · [PROJECT_HUB_BUILD_PLAN.md](./PROJECT_HUB_BUILD_PLAN.md) · [SAAS_CONVERSION_BUILD_PLAN.md](./SAAS_CONVERSION_BUILD_PLAN.md) (platform billing email — separate concern)

This document plans **transactional email** for workspace notifications: members first, clients second. Platform SaaS billing emails (trial ending, payment failed) remain in the SaaS conversion doc — same Resend account, different trigger sources.

**Local testing:** [RESEND_LOCAL_TEST_CHECKLIST.md](./RESEND_LOCAL_TEST_CHECKLIST.md)

---

## Stopping point (Aug 2026)

Notification work is **intentionally paused** here so other efforts (reporting filter modifications, team project dashboards) can proceed. When resuming, start at [Resume later (RN-4+)](#resume-later-rn-4).

### Shipped (RN-0–RN-3)

| Area | Done |
|------|------|
| Resend client, `sendEmail`, env gates, branded layout | ✅ |
| Seven event types wired (see [Triggers by action](#triggers-by-action)) | ✅ |
| Per-user opt-in toggles + profile UI (admin, member, client) | ✅ |
| Local test checklist | ✅ |
| `parseEnvFlag` — inline `#` comments on env values no longer break the master switch | ✅ |

### Not shipped (pick up later)

| Item | Phase |
|------|-------|
| Per-task assignee email (`member.task.assigned`) | RN-1 backlog |
| Email digests (daily/weekly) + `digest` preference | RN-4 |
| Burst debouncing / digest rollup | RN-4 |
| In-app notification bell | Separate feature |
| SaaS platform billing emails | [SAAS_CONVERSION_BUILD_PLAN.md](./SAAS_CONVERSION_BUILD_PLAN.md) |
| `/portal/invoices/:id` UI (invoice emails deep-link here; page may not exist yet) | Client portal v1.1 |

---

## Table of Contents

1. [Overview](#overview)
2. [Triggers by action](#triggers-by-action)
3. [Delivery gates & preferences](#delivery-gates--preferences)
4. [Environment & Setup](#environment--setup)
5. [Architecture](#architecture)
6. [Notification catalog (event IDs)](#notification-catalog-event-ids)
7. [Templates](#templates)
8. [Server Implementation](#server-implementation)
9. [Phased Delivery](#phased-delivery)
10. [Testing Checklist](#testing-checklist)
11. [Key Files Reference](#key-files-reference)
12. [Resume later (RN-4+)](#resume-later-rn-4)

---

## Overview

### Problem

Project activity (client messages, assignments, task updates) only appears in-app. Members and clients must poll or log in to discover updates. With Resend configured, the app can deliver **timely, branded email** without building a full notification center first.

### Principles

1. **Async, non-blocking** — Email send failures must not fail the primary API action (message post, invite, etc.).
2. **Workspace-branded** — From name uses `SiteConfig.companyName`; reply-to optional `companyEmail`.
3. **Deep links** — Every email links back to the correct role route (`/projects/:id`, `/portal/projects/:id`, `/member/projects/:id`).
4. **No secrets in client** — Resend API key server-only.
5. **Idempotent where possible** — Debounce burst events (e.g. 5 messages in 1 minute → one digest optional in RN-4).

---

## Triggers by action

This is the **authoritative reference** for what sends email today. All sends are async — failures log only and never fail the HTTP response.

| # | Who | Action | API / route | Recipients | Preference key | UI toggle label |
|---|-----|--------|-------------|------------|----------------|-----------------|
| 1 | **Client** | Posts a project message | `POST /api/portal/projects/:id/messages` | Workspace admin + `Project.assignedMemberIds` | `clientMessages` | **Client messages** (admin/member) |
| 2 | **Admin** | Posts message with **Visible to client** | `POST /api/projects/:projectId/messages` (`clientVisible: true`) | Portal users where `role=client` and `clientId` matches project | `clientVisibleReplies` | **Team updates** (client) |
| 3 | **Admin** | Creates project with assignees | `POST /api/projects` | Each member in initial `assignedMemberIds` | `projectAssignments` | **Project assignments** (member) |
| 4 | **Admin** | Adds new assignees on project update | `PUT /api/projects/:id` (only **newly added** auth0 ids) | New assignees only | `projectAssignments` | **Project assignments** (member) |
| 5 | **Admin** | Invites user to client portal | `POST /api/users/invite-client` | Invitee email from request | *(none — env gate only)* | — |
| 6 | **Admin** | Marks invoice **DRAFT → SENT** | Invoice status transition | Portal users for invoice's client | `invoiceSent` | **Invoices** (client) |
| 7 | **Admin or member** | Marks task **COMPLETED** | `PUT /api/project-tasks/:id` or `PATCH …/status` | Portal users for project's client | `taskCompleted` | **Task completed** (client) |

### Per-trigger conditions

**#1 Client message → team**  
- Fires on every portal message.  
- Recipients must have opted in to `clientMessages`.  
- Message author is never emailed (client role).

**#2 Team message → client**  
- **Admin only** can set `clientVisible: true`. Member posts are always internal (`clientVisible: false`) and do **not** trigger client email.  
- Project must have a `clientId`.

**#3–4 Project assignment**  
- Create: all initial assignees.  
- Update: diff only — members already assigned do not get a duplicate email.

**#5 Portal invite**  
- Only gate is `RESEND_NOTIFICATIONS_ENABLED` + Resend credentials. No user preference (invitee has no account yet).

**#6 Invoice sent**  
- Only on **DRAFT → SENT**, not other status changes.  
- Only `documentKind: INVOICE` — **`RETAINER_REPORT` is skipped**.  
- **CRM `Client.email` is not used** — portal users with `invoiceSent: true` only.

**#7 Task completed**  
- Task must be **`clientVisible: true`**.  
- Status must **newly** become `COMPLETED` (was not already completed).  
- Project must have a linked client.

### Not wired (documented for future)

| Event ID | Planned trigger | Status |
|----------|-----------------|--------|
| `member.task.assigned` | `ProjectTask.assigneeAuth0Id` set/changed | **Not implemented** |
| `digest.daily.member` / `digest.weekly.client` | Cron | **RN-4** |

---

## Delivery gates & preferences

Two gates must allow a send (except portal invite, which skips user preferences):

### Gate 1 — Server env (master switch)

| Variable | Required for send | Notes |
|----------|-------------------|-------|
| `RESEND_NOTIFICATIONS_ENABLED` | Must parse as true (`true`, `1`, `yes`) | Default **off** when unset |
| `RESEND_API_KEY` | Yes | |
| `RESEND_FROM_EMAIL` | Yes | Verified domain |
| `FRONTEND_URL` | For deep links | e.g. `http://localhost:5173` |

**`.env` pitfall:** Do not put inline comments on the same line as the value (`RESEND_NOTIFICATIONS_ENABLED=true # comment`). dotenv may include the comment in the value. Put comments on their own line above. Parsing in `emailConfig.ts` strips trailing `#` as a safety net.

**Restart:** Nodemon watches `server/src/**` only — restart `npm run dev` after `.env` changes.

### Gate 2 — Per-user opt-in

Stored on `User.notificationPreferences.email`. **Opt-in only:** value must be **explicitly `true`**; unset or `false` = no email.

| Preference key | Roles | Settings page |
|----------------|-------|---------------|
| `clientMessages` | admin, member | `/profile` · `/member/profile` |
| `projectAssignments` | member | `/member/profile` |
| `clientVisibleReplies` | client | `/portal/settings` |
| `taskCompleted` | client | `/portal/settings` |
| `invoiceSent` | client | `/portal/settings` |
| `digest` | reserved | Not implemented (RN-4) |

Use **Save notification settings** on member/client pages (separate from main profile save on member profile).

---

## Environment & Setup

### Server env vars

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=notifications@yourdomain.com
RESEND_FROM_NAME=Ask And Deliver
FRONTEND_URL=https://app.askanddeliver.com
# Master switch — must be true to send; user toggles are opt-in separately
RESEND_NOTIFICATIONS_ENABLED=false
```

See [SETUP.md](../SETUP.md) Resend section and [RESEND_LOCAL_TEST_CHECKLIST.md](./RESEND_LOCAL_TEST_CHECKLIST.md).

### Domain checklist (operator)

- [ ] Domain added and verified in Resend dashboard
- [ ] SPF, DKIM, DMARC DNS records published
- [ ] Test send from Resend dashboard to confirm deliverability
- [ ] `RESEND_FROM_EMAIL` uses verified subdomain (e.g. `notify@`, `notifications@`)

### Dependencies

```bash
cd server && npm install resend
```

---

## Architecture

```
┌─────────────────┐     POST message / invite / etc.
│  Route handler  │──────────────────────────────────────┐
└─────────────────┘                                      │
                                                         ▼
                                              ┌─────────────────────┐
                                              │ notificationService │
                                              │  .enqueue(event)    │
                                              └──────────┬──────────┘
                                                         │
                         ┌───────────────────────────────┼───────────────────────────────┐
                         ▼                               ▼                               ▼
                 resolve recipients              load SiteConfig                 build template
                 (users by role/assignment)      (companyName, logo)            + deep link URL
                         │                               │                               │
                         └───────────────────────────────┴───────────────────────────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │ resendClient.emails │
                                              │      .send()        │
                                              └─────────────────────┘
```

### Module layout

```
server/src/lib/email/
  resendClient.ts
  sendEmail.ts              # env gates + Resend send
  emailConfig.ts            # parseEnvFlag, from address
  notificationService.ts    # enqueueEmailNotification
  notificationPreferences.ts
  recipients.ts             # stakeholder / member / portal resolution + opt-in filter
  brandContext.ts
  layout.ts
  taskCompletionNotify.ts
  index.ts
  notifications/            # one file per event → calls sendEmail
  templates/                # subject + html + text builders
client/src/components/profile/
  EmailNotificationPreferences.tsx
```

---

## Notification catalog (event IDs)

Stable event IDs for logging and future digest grouping. See [Triggers by action](#triggers-by-action) for the operator-facing table.

### Shipped

| Event ID | Status | Deep link base |
|----------|--------|----------------|
| `client.message.posted` | ✅ | `{FRONTEND_URL}/projects/:id#messages` |
| `member.assigned.project` | ✅ | `{FRONTEND_URL}/member/projects/:id` |
| `client.portal.invite` | ✅ | `{FRONTEND_URL}/portal` |
| `team.message.client_visible` | ✅ | `{FRONTEND_URL}/portal/projects/:id#messages` |
| `client.task.completed` | ✅ | `{FRONTEND_URL}/portal/projects/:id#tasks` |
| `client.invoice.sent` | ✅ | `{FRONTEND_URL}/portal/invoices/:id` |

### Not shipped

| Event ID | Notes |
|----------|-------|
| `member.task.assigned` | Field exists on `ProjectTask`; no email hook yet |
| `digest.daily.member` / `digest.weekly.client` | RN-4 |

### Explicitly out of scope (this doc)

- @mentions parsing
- Attachments in email
- SMS
- In-app notification bell
- SaaS platform billing emails — [SAAS_CONVERSION_BUILD_PLAN.md](./SAAS_CONVERSION_BUILD_PLAN.md) Layer 5

---

## Templates

Each template exports:

```typescript
interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;  // plain-text fallback
}
```

### Branding inputs

| Variable | Source |
|----------|--------|
| `companyName` | `SiteConfig.companyName` |
| `companyEmail` | `SiteConfig.companyEmail` (reply-to) |
| `primaryColor` | `SiteConfig.colors.brandSage` or CSS var fallback |
| `logoUrl` | SiteConfig if available; else text header |

### Example: client message → team

**Subject:** `[{companyName}] New client message on {projectTitle}`

**Body:** Author name, message excerpt (first 280 chars), CTA button "View in project hub" → `{FRONTEND_URL}/projects/{projectId}#messages`

### Example: client-visible team message → client

**Subject:** `{companyName} sent you an update on {projectTitle}`

**Body:** Author name, excerpt, CTA → `{FRONTEND_URL}/portal/projects/{projectId}#messages`

Keep HTML minimal (table layout, inline styles) for client compatibility.

---

## Server Implementation

### `sendEmail` behavior (shipped)

Order of checks in `server/src/lib/email/sendEmail.ts`:

1. `isNotificationsDeliveryEnabled()` — logs `[email] RESEND_NOTIFICATIONS_ENABLED is not true — skipping send` when off
2. `isEmailConfigured()` — `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
3. Normalize recipients; empty → `skippedReason: 'no_recipients'`
4. Resend API call; errors logged, never thrown to route handler

Notifications call `enqueueEmailNotification()` so the HTTP response is not blocked.

### Hook points (shipped)

| File | After success |
|------|---------------|
| `server/src/routes/projectMessages.ts` | Portal POST → `notifyClientMessageToTeam`; admin POST with `clientVisible` → `notifyTeamMessageToClient` |
| `server/src/routes/users.ts` | `invite-client` → `notifyClientPortalInvite` |
| `server/src/routes/projects.ts` | Create → all assignees; update → newly added assignees only |
| `server/src/routes/projectTasks.ts` | `maybeNotifyClientTaskCompleted` on PUT / PATCH status |
| `server/src/routes/invoices.ts` | DRAFT → SENT + `INVOICE` kind → `notifyInvoiceSentToClient` |

Recipient helpers in `server/src/lib/email/recipients.ts` filter by `isEmailPreferenceEnabled()` except portal invite (direct to invitee email).

---

## Phased Delivery

| Phase | Name | Outcome | Status |
|-------|------|---------|--------|
| **RN-0** | Foundation | `resend` package, client, `sendEmail`, env docs | ✅ Shipped |
| **RN-1** | Member alerts | Client message → team; project assignment | ✅ Shipped |
| **RN-2** | Client alerts | Portal invite; client-visible messages | ✅ Shipped |
| **RN-3** | Invoice + task + preferences | Invoice SENT; task completed; profile toggles | ✅ Shipped |
| **RN-4** | Digests + debounce | Cron digests; burst rollup; optional `member.task.assigned` | ⏸ Deferred |

**Paused after RN-3.** Use [RESEND_LOCAL_TEST_CHECKLIST.md](./RESEND_LOCAL_TEST_CHECKLIST.md) before production enablement.

---

## Testing Checklist

- [ ] Missing `RESEND_API_KEY` — app runs; emails skipped with warn log
- [ ] Invalid recipient — logged, no crash
- [ ] Client message notifies admin + assignees, not the client author
- [ ] Internal message (`clientVisible: false`) — no client email
- [ ] Client-visible message — all portal users for that client notified
- [ ] Invite email contains working login link
- [ ] From domain passes SPF/DKIM (check Resend dashboard + mail tester)
- [ ] No PII/rates in email body for client-facing templates
- [ ] Duplicate assign on project update — no duplicate email if member already assigned

---

## Key Files Reference

| Layer | Path |
|-------|------|
| Resend client | `server/src/lib/email/resendClient.ts` |
| Send + gates | `server/src/lib/email/sendEmail.ts`, `emailConfig.ts` |
| Enqueue | `server/src/lib/email/notificationService.ts` |
| Preferences (server) | `server/src/lib/email/notificationPreferences.ts` |
| Recipients | `server/src/lib/email/recipients.ts` |
| Event handlers | `server/src/lib/email/notifications/*.ts` |
| Templates | `server/src/lib/email/templates/*.ts` |
| Task completion helper | `server/src/lib/email/taskCompletionNotify.ts` |
| Public exports | `server/src/lib/email/index.ts` |
| Route hooks | `projectMessages.ts`, `projects.ts`, `users.ts`, `invoices.ts`, `projectTasks.ts` |
| Preference UI | `client/src/components/profile/EmailNotificationPreferences.tsx` |
| Admin settings | `client/src/pages/Profile.tsx` |
| Member settings | `client/src/pages/member/MemberProfile.tsx` |
| Client settings | `client/src/pages/portal/PortalSettings.tsx` |
| User model field | `server/src/models/User.ts` → `notificationPreferences` |
| Env examples | `server/.env.example`, `SETUP.md` |
| Local test guide | `docs/RESEND_LOCAL_TEST_CHECKLIST.md` |

---

## Resume later (RN-4+)

When picking notifications back up:

1. **Read** [Triggers by action](#triggers-by-action) and run [RESEND_LOCAL_TEST_CHECKLIST.md](./RESEND_LOCAL_TEST_CHECKLIST.md) if env or Resend config changed.
2. **RN-4 digests** — Implement cron (Railway scheduled job or external), respect `notificationPreferences.email.digest`, rollup unread activity per workspace TZ.
3. **Optional:** `member.task.assigned` — hook `projectTasks.ts` on assignee change; preference key likely `projectAssignments` or new `taskAssignments`.
4. **Portal invoices page** — Invoice emails link to `/portal/invoices/:id`; ensure [CLIENT_PORTAL_DASHBOARD_BUILD_PLAN.md](./CLIENT_PORTAL_DASHBOARD_BUILD_PLAN.md) v1.1 covers the destination UI.
5. **Production rollout** — Enable `RESEND_NOTIFICATIONS_ENABLED=true` only after checklist; communicate opt-in settings to users.

Do not bundle RN-4 with unrelated work (reporting filters, dashboards) — keep one PR per concern per `.cursorrules`.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-17 | Initial build plan — Resend for member + client workspace notifications |
| 2026-07-17 | **RN-0** — `resend` package, email lib, env docs |
| 2026-07-17 | **RN-1** — client message → team; project assignment emails |
| 2026-07-17 | **RN-2** — portal invite; client-visible team message → clients |
| 2026-07-17 | **RN-3** — invoice sent + task completed emails; `notificationPreferences` + profile UI |
| 2026-08-14 | **Stopping point** — triggers-by-action reference, delivery gates, shipped vs deferred; `parseEnvFlag` for inline `.env` comments; pause before RN-4 |
