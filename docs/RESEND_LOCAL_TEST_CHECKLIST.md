# Resend Notifications — Local Test Checklist

**Full reference:** [RESEND_NOTIFICATIONS_BUILD_PLAN.md](./RESEND_NOTIFICATIONS_BUILD_PLAN.md) — triggers by action, delivery gates, stopping point.

Use this checklist before testing email in local or staging. The app uses **two gates** — both must allow a send (portal invite skips gate 2):

1. **Server env:** `RESEND_NOTIFICATIONS_ENABLED=true` (defaults **off** when unset)
2. **Per-user opt-in:** each recipient must have turned **on** the relevant toggle in Profile / Email settings (defaults **off**)

Portal invite emails use gate 1 only — invitee has no toggles yet.

**CRM `Client.email` is never used for invoice sends** — only portal users with **Invoices** enabled receive invoice email.

**`.env`:** Put comments on their own line, not inline (`RESEND_NOTIFICATIONS_ENABLED=true # bad`). Restart `npm run dev` after `.env` changes (nodemon does not watch `.env`).

---

## Phase 0 — Safe defaults (do this first)

- [ ] In `server/.env`, confirm **`RESEND_NOTIFICATIONS_ENABLED` is unset or `false`**
- [ ] Restart the API server after any `.env` change
- [ ] Optional: use a **Resend test API key** and a **non-production** domain while learning the flow
- [ ] Note your **own email** for admin/member tests — avoid real client addresses until Phase 3

### Expected with delivery disabled

Perform each action; **no email should arrive** and the server log should show  
`RESEND_NOTIFICATIONS_ENABLED is not true — skipping send`:

- [ ] Client posts a portal message
- [ ] Admin posts a client-visible project message
- [ ] Admin marks invoice **Sent**
- [ ] Admin completes a client-visible task
- [ ] Admin assigns a member to a project
- [ ] Admin invites a user to the client portal

---

## Phase 1 — Env on, all user toggles off

- [ ] Set `RESEND_NOTIFICATIONS_ENABLED=true` in `server/.env` (keep valid `RESEND_API_KEY` + `RESEND_FROM_EMAIL`)
- [ ] Restart server
- [ ] **Admin:** `/profile` → Email notifications — confirm all toggles **off**, save if needed
- [ ] **Member:** `/member/profile` → confirm toggles **off**
- [ ] **Client (if testing):** `/portal/settings` → confirm **Team updates**, **Task completed**, **Invoices** are **off**

### Expected — still no email

Repeat Phase 0 actions. Still **no sends** (recipients have not opted in).

---

## Phase 2 — Admin-only opt-in

- [ ] Admin `/profile` → turn **on** **Client messages** → Save
- [ ] Use a **test client account** (your email) to post on a portal project message
- [ ] **Expect:** admin inbox receives email
- [ ] Turn **off** Client messages → Save → post again → **no email**

---

## Phase 3 — Member opt-in

- [ ] Member `/member/profile` → turn **on** **Project assignments** → Save
- [ ] Admin assigns that member to a project (new assignee)
- [ ] **Expect:** member receives assignment email
- [ ] Toggle off → re-assign (add/remove) → **no email**

Optional:

- [ ] Member turns **on** **Client messages** → client posts → member receives (if assigned or admin path applies)

---

## Phase 4 — Client opt-in (use test client only)

Use a portal user whose email **you control**. Do **not** use production client CRM emails.

- [ ] Client `/portal/settings` → turn **on** **Team updates** → Save
- [ ] Admin posts project message with **Visible to client** checked
- [ ] **Expect:** client receives email
- [ ] Toggle off → repeat → **no email**

Repeat for **Task completed** (complete a `clientVisible` task) and **Invoices** (mark invoice Sent for that client's projects).

- [ ] With **Invoices** off, marking invoice Sent → **no email** to that client
- [ ] With **Invoices** on → **expect** invoice email (portal user only)

---

## Phase 5 — Portal invite (optional, last)

Only when you intend to test invites to an address you own:

- [ ] Confirm `RESEND_NOTIFICATIONS_ENABLED=true`
- [ ] Invite a **test** portal user (your email)
- [ ] **Expect:** invite email to that address
- [ ] Set `RESEND_NOTIFICATIONS_ENABLED=false` → invite another test user → **no email**

---

## Phase 6 — Cross-client isolation

- [ ] Client A and Client B on different CRM records
- [ ] Client A toggles **on**; Client B leaves all **off**
- [ ] Trigger team message / task / invoice for Client A's project only
- [ ] **Expect:** only Client A (if opted in) receives mail; Client B never does

---

## Quick reference

| Gate | Default | Where |
|------|---------|--------|
| `RESEND_NOTIFICATIONS_ENABLED` | off | `server/.env` |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | unset | `server/.env` |
| Per-user toggles | off | `/profile` · `/member/profile` · `/portal/settings` |

### Triggers by action (shipped)

| Action | Who | Opt-in toggle |
|--------|-----|---------------|
| Client posts portal message | Admin + assigned members | **Client messages** |
| Admin posts client-visible message | Client portal users | **Team updates** |
| Admin creates project with assignees | All initial assignees | **Project assignments** |
| Admin adds new assignees on update | New assignees only | **Project assignments** |
| Admin invites client portal user | Invitee email | Env gate only |
| Invoice DRAFT → SENT (`INVOICE` only) | Client portal users | **Invoices** |
| Client-visible task newly COMPLETED | Client portal users | **Task completed** |

**Not wired:** per-task assignee email · email digests (RN-4).

See [RESEND_NOTIFICATIONS_BUILD_PLAN.md](./RESEND_NOTIFICATIONS_BUILD_PLAN.md#triggers-by-action) for API routes and edge conditions.

---

## Production rollout reminder

Before enabling in production:

1. Set `RESEND_NOTIFICATIONS_ENABLED=true` only when ready
2. Communicate that clients/members must opt in via settings (or admin enables on their behalf after consent)
3. Never rely on CRM `Client.email` for invoice blast — portal opt-in only
