# Client Portal Dashboard — Build Plan

**Status:** v1 shipped · v1.1+ planned (July 2026)  
**Parent:** [PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md](./PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md)  
**Related:** [PROJECT_HUB_BUILD_PLAN.md](./PROJECT_HUB_BUILD_PLAN.md) · [RESEND_NOTIFICATIONS_BUILD_PLAN.md](./RESEND_NOTIFICATIONS_BUILD_PLAN.md)

This document covers the **client-facing dashboard** at `/portal` and the **client project detail** at `/portal/projects/:id`. It records what is already live, what remains, and how Resend notifications tie in.

---

## Table of Contents

1. [Overview](#overview)
2. [Current State (shipped)](#current-state-shipped)
3. [Target State — Dashboard v1.1+](#target-state--dashboard-v11)
4. [Target State — Project Detail Enhancements](#target-state--project-detail-enhancements)
5. [API](#api)
6. [Frontend](#frontend)
7. [Resend Integration (client-facing)](#resend-integration-client-facing)
8. [Phased Delivery](#phased-delivery)
9. [Testing Checklist](#testing-checklist)
10. [Key Files Reference](#key-files-reference)

---

## Overview

### Problem

Clients need a **single place to orient** when they log in: active work, recent updates, and quick entry into any project. The project detail page must show **everything about one engagement** without exposing internal billing or team financials.

### Persona & scope

| Rule | Detail |
|------|--------|
| Role | `client` with `clientId` set |
| Route prefix | `/portal/*` |
| Data scope | `{ userId: workspaceOwnerId, clientId: user.clientId }` on every query |
| Never expose | Rates, budgets, margins, internal tasks, DRAFT invoices, other clients' data |

Full v1 scope is locked in [PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md](./PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md).

---

## Current State (shipped)

| Surface | Route | Status |
|---------|-------|--------|
| Portal shell | `ClientPortalLayout` + `PortalNav` | ✓ |
| **Dashboard (home)** | `/portal` | ✓ — welcome, active project cards, recent message updates |
| Project list | `/portal/projects` | ✓ — status tabs, open task counts |
| **Project detail** | `/portal/projects/:id` | ✓ — brief, client-visible tasks, message thread |
| Dashboard API | `GET /api/portal/dashboard` | ✓ |
| Project APIs | `GET /api/portal/projects`, `GET /api/portal/projects/:id` | ✓ |
| Messages | `GET/POST /api/portal/projects/:id/messages` | ✓ — 60s polling |

**Dashboard widgets today:**

| Widget | Implementation |
|--------|----------------|
| Welcome | Client first name + tenant `companyName` from SiteConfig |
| Active projects | Up to 6 cards — `ACTIVE` and `PAUSED`, open task count |
| Recent updates | Last 5 `clientVisible` messages across projects |
| Empty state | Contact `companyEmail` from SiteConfig |

**Project detail sections today:**

| Section | Implementation |
|---------|----------------|
| Brief | `SanitizedBrief` — HTML from `Project.brief`, fallback to `description` |
| Tasks | `clientVisible: true` only — title, description, status badge |
| Messages | `ProjectMessageThread` — client can read + reply |

---

## Target State — Dashboard v1.1+

Enhancements that improve orientation without changing the read-mostly model.

### Dashboard home (`/portal`)

| Enhancement | Priority | Description |
|-------------|----------|-------------|
| **Task status in recent updates** | P1 | Include client-visible task status changes (not only messages) in the activity feed |
| **Paused / completed summary** | P2 | Secondary row or collapsible section for non-active projects with link to filtered list |
| **Unread message indicator** | P2 | Badge on project cards when new `clientVisible` messages since last visit (requires `User.lastPortalVisitAt` or per-project read cursor — see [Open decisions](#open-decisions)) |
| **Invoices snippet** | P1 (v1.1) | Card linking to `/portal/invoices` when SENT invoices exist — see spec v1.1 |
| **Email digest opt-in** | P3 | Weekly summary via Resend — after transactional notifications ship |

### Information architecture (unchanged)

```
/portal                          Home — project summary + recent activity
/portal/projects                 Project list
/portal/projects/:id             Project hub (brief + tasks + messages)
/portal/invoices                 (v1.1) SENT/PAID invoices
```

No global `/portal/messages` — communication stays **inside each project**.

---

## Target State — Project Detail Enhancements

The client project hub is **functionally complete for v1**. Optional follow-ons:

| Enhancement | Priority | Notes |
|-------------|----------|-------|
| **Team faces (names only)** | P2 | Show assigned member first names + avatars — no rates, no email unless admin opts in |
| **Deliverables / files** | P3 | Deferred — intake-style file share or Cloudinary gallery |
| **Brief publish toggle** | P3 | `briefClientVisible` if admins need draft briefs hidden from portal |
| **Deep link from email** | P1 | Resend notifications link to `/portal/projects/:id#messages` — see [RESEND_NOTIFICATIONS_BUILD_PLAN.md](./RESEND_NOTIFICATIONS_BUILD_PLAN.md) |

**Explicitly out of scope for clients:** time entries, budget burn, billing mode, internal task list, margin data.

---

## API

### Existing (no changes required for v1 maintenance)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/portal/dashboard` | Home widgets |
| `GET /api/portal/projects` | List with `openTaskCount` |
| `GET /api/portal/projects/:id` | Project + client-visible tasks |
| `GET/POST /api/portal/projects/:id/messages` | Thread |

### v1.1 additions

| Endpoint | Purpose |
|----------|---------|
| `GET /api/portal/invoices` | SENT/PAID for `user.clientId` |
| `GET /api/portal/invoices/:id` | Detail + payment link when SENT |
| `GET /api/portal/dashboard` (extend) | Optional `recentTaskUpdates[]` alongside messages |

**Security:** Always verify `project.clientId === user.clientId`; return **404** (not 403) for cross-client ID probes.

---

## Frontend

### Existing components (reuse)

| Component | Path |
|-----------|------|
| `PortalHome` | `client/src/pages/portal/PortalHome.tsx` |
| `PortalProjects` | `client/src/pages/portal/PortalProjects.tsx` |
| `PortalProjectDetail` | `client/src/pages/portal/PortalProjectDetail.tsx` |
| `SanitizedBrief` | `client/src/components/portal/SanitizedBrief.tsx` |
| `ProjectMessageThread` | `client/src/components/portal/ProjectMessageThread.tsx` |
| `PortalStatusBadge` | `client/src/components/portal/PortalStatusBadge.tsx` |

### v1.1 work

- `PortalInvoices.tsx`, `PortalInvoiceDetail.tsx` — mirror admin invoice read-only subset
- Extend `PortalHome` activity feed component to merge messages + task events
- Optional `PortalTeamStrip.tsx` — names/avatars from `assignedMemberIds` (sanitized API field)

---

## Resend Integration (client-facing)

**Status:** Client-facing Resend events from [RESEND_NOTIFICATIONS_BUILD_PLAN.md](./RESEND_NOTIFICATIONS_BUILD_PLAN.md) are **shipped (RN-2–RN-3)**. Notification effort is **paused at RN-4**; see that doc for the full [triggers-by-action](./RESEND_NOTIFICATIONS_BUILD_PLAN.md#triggers-by-action) table.

| Event | Trigger | Recipient | Opt-in toggle |
|-------|---------|-----------|---------------|
| Portal invite | `POST /api/users/invite-client` | Invitee email | Env gate only |
| Team message (visible) | Admin posts with `clientVisible: true` | Portal users for project's `clientId` | **Team updates** |
| Task completed | Client-visible task → COMPLETED | Same | **Task completed** |
| Invoice sent | Invoice DRAFT → SENT (`INVOICE` only) | Portal users only — **not** CRM `Client.email` | **Invoices** |

Client toggles: `/portal/settings`. Templates use SiteConfig branding (`companyName`, etc.).

**Gap:** Invoice emails deep-link to `/portal/invoices/:id` — **CP-3** portal invoices UI not built yet.

---

## Phased Delivery

| Phase | Name | Outcome | Depends on |
|-------|------|---------|------------|
| **CP-0** | v1 (done) | Dashboard, list, detail, messages | Platform Phase 6 |
| **CP-1** | Resend — client events | Invite, client-visible messages, task completed, invoice sent | ✅ Shipped (RN-2–RN-3) |
| **CP-2** | Dashboard activity feed | Task status changes in recent updates | — |
| **CP-3** | Portal invoices v1.1 | `/portal/invoices` + pay links | Payment links (existing) |
| **CP-4** | Team strip + unread badges | Light team visibility, read cursors | CP-2 optional |

**Recommendation:** Next client portal priority is **CP-3** (invoices UI) so invoice email deep links resolve.

---

## Open Decisions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Unread tracking | Per-user `lastPortalVisitAt` vs per-project read cursor | Per-project cursor on `User` map — scales better for multi-project clients |
| 2 | Team visibility | Names only vs names + role labels | First name + avatar only |
| 3 | Invoice email | Portal users only vs also CRM `Client.email` | **Portal users only** (shipped) |

---

## Testing Checklist

- [ ] Client A cannot open Client B project by ID (404)
- [ ] Dashboard shows only ACTIVE/PAUSED in active section; ARCHIVED hidden from list
- [ ] Recent updates only include `clientVisible` messages
- [ ] Resend: invite email delivers with correct Auth0 signup / login link
- [ ] Resend: client-visible message triggers email to linked portal users
- [ ] No rate/budget/entry fields in any portal API response
- [ ] Hard refresh on `/portal` — no auth 401 burst (tokenReady gate)

---

## Key Files Reference

| Layer | Location |
|-------|----------|
| Portal routes (server) | `server/src/routes/portal.ts` |
| Portal scope helper | `server/src/lib/portalScope.ts` |
| Project messages | `server/src/routes/projectMessages.ts` |
| Portal pages | `client/src/pages/portal/` |
| Portal API client | `client/src/services/api.ts` (`portalApi`) |
| App routes | `client/src/App.tsx` (`/portal/*`) |
| Full v1 spec | [PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md](./PLATFORM_EXPANSION_CLIENT_PORTAL_SPEC.md) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-17 | Initial build plan — v1 status, v1.1 roadmap, Resend hooks |
| 2026-08-14 | CP-1 marked shipped; Resend section aligned with RN-3 stopping point |
