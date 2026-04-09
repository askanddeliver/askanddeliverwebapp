# SaaS Conversion — Build Plan

This document describes converting **Ask And Deliver** from a single-owner agency deployment into a **multi-tenant SaaS platform**: many freelancers subscribe, each gets a branded workspace, public portfolio, and the same feature set—on a **shared** Vercel + Railway + MongoDB Atlas stack, with **Stripe Billing** for subscriptions alongside existing **Stripe Payment Links** for client invoice payments.

---

## Table of Contents

1. [Overview](#overview)
2. [Current State (Assessment)](#current-state-assessment)
3. [Target Architecture](#target-architecture)
4. [Layer 1 — Tenant Model & Stripe Billing](#layer-1--tenant-model--stripe-billing)
5. [Layer 2 — Self-Service Signup & Onboarding](#layer-2--self-service-signup--onboarding)
6. [Layer 3 — Multi-Portfolio Public Routing](#layer-3--multi-portfolio-public-routing)
7. [Layer 4 — Data Isolation Fixes](#layer-4--data-isolation-fixes)
8. [Layer 5 — Transactional Email](#layer-5--transactional-email)
9. [Layer 6 — Super-Admin Panel](#layer-6--super-admin-panel)
10. [Infrastructure & Observability](#infrastructure--observability)
11. [Documentation & Cursor Context Updates](#documentation--cursor-context-updates)
12. [Security & Multi-Tenant Rules](#security--multi-tenant-rules)
13. [Testing Checklist](#testing-checklist)
14. [Decided Product Rules](#decided-product-rules)
15. [Open Decisions](#open-decisions)
16. [Phased Delivery](#phased-delivery)
17. [Phased Cursor Prompt Sequence](#phased-cursor-prompt-sequence)

---

## Overview

### Problem

The app is production-ready for **one** business on **one** domain. SaaS requires: **subscription lifecycle**, **tenant identity** (subdomain/custom domain), **self-service signup** without env-based admin promotion, **public APIs** that resolve **which workspace** a visitor belongs to, **Lead** records scoped like other entities, and **media paths** namespaced per tenant. Operational tooling (email, super-admin, plan limits) completes the product.

### Non-Goals (Initial Release)

- Per-customer deployments or separate databases (stay **shared instance**).
- Replacing Auth0 or changing JWT/JWKS validation.
- Replacing **Stripe Payment Links** for end-client invoice checkout—**Stripe Billing** is **additive** for platform subscriptions.
- Full white-label mobile apps or separate codebases per tenant.

---

## Current State (Assessment)

| Area | Behavior today |
|------|----------------|
| **Deployment** | Vite + React on Vercel; Express + TypeScript on Railway; MongoDB Atlas; Auth0; Cloudinary; Stripe (Payment Links + webhook for invoice flow). |
| **Multi-tenancy** | Workspace model: data scoped by `userId` (admin Auth0 `sub`) or `workspaceOwnerId`; members use role-based access. Isolation pattern is sound for SaaS; **Lead** is the notable gap (see ARCHITECTURE “Global Data”). |
| **Admin role** | `GET /api/users/me`: `PRIMARY_ADMIN_EMAIL` match → admin; first user in DB → admin; else new users → **pending**. Single-tenant assumption. |
| **Public APIs** | `GET /api/portfolio/public`, `/featured`, `/:slug`; `GET /api/site-config/public`; `POST /api/leads/public` — **no workspace resolution**; assume single portfolio/theme. |
| **Cloudinary** | Paths like `portfolio/{slug}/` — **no tenant prefix**. |
| **Stripe** | Payment Links + webhook for **invoice** payments — not subscription lifecycle. |

**Conclusion:** Add a **Tenant** (subscription + routing) layer, **Stripe Billing** + middleware, **host-based workspace resolution** for public routes, **Lead.userId** + scoped queries, **namespaced uploads** + migration, then **email** and **super-admin**.

---

## Target Architecture

### Shared instance (locked)

| Component | SaaS posture |
|-----------|----------------|
| Frontend | One Vercel project; wildcard DNS `*.platform.com`; optional custom domains via Vercel Domains API (Phase 3). |
| Backend | One Railway service; all tenants. |
| Database | One Atlas cluster; many workspaces; **Tenant** document links Auth0 admin → subscription + routing. |
| Auth | Auth0 unchanged. |
| Media | One Cloudinary account; paths `{workspaceOwnerId}/portfolio/{slug}/` (or equivalent). |
| Client payments | Stripe Payment Links **unchanged** for invoice checkout. |
| Platform revenue | Stripe Billing (Products/Prices, Customers, Subscriptions, webhooks). |

### Conceptual model

```
Tenant
  adminAuth0Id          // matches User.auth0Id for workspace owner
  stripeCustomerId
  stripeSubscriptionId
  subscriptionStatus    // trialing | active | past_due | cancelled (align with Stripe + product needs)
  planTier
  trialEndsAt?
  subdomain               // unique, used for *.platform.com
  customDomain?           // Phase 2/3; verified via Vercel

User (existing)
  // first user in workspace is admin; members unchanged

Workspace resolution (public)
  Host header → subdomain OR customDomain → Tenant → workspaceOwnerId (= adminAuth0Id) → query SiteConfig, Portfolio, Leads as today but scoped
```

---

## Layer 1 — Tenant Model & Stripe Billing

### Data model — `server/src/models/Tenant.ts` (new)

Suggested fields (refine names to match Mongoose conventions in repo):

- `adminAuth0Id: string` — unique index; ties to workspace owner.
- `stripeCustomerId?: string`
- `stripeSubscriptionId?: string`
- `subscriptionStatus: enum` — map from Stripe (`trialing`, `active`, `past_due`, `canceled`, etc.); store normalized app enum.
- `planTier: string` (or enum) — aligns with Stripe Price/product.
- `trialEndsAt?: Date`
- `subdomain: string` — unique, lowercase, slug rules.
- `customDomain?: string` — unique when set; nullable.
- Timestamps as per other models.

**Indexes:** `adminAuth0Id`, `subdomain`, `customDomain` (sparse), `stripeSubscriptionId` (sparse).

### Stripe Billing (platform)

- **Products & Prices** in Stripe Dashboard (or provisioned via script); webhook secret **separate** from invoice Payment Link webhook.
- **Webhook route:** `POST /api/webhooks/stripe-billing` — verify signature with **billing** webhook secret; handle `customer.subscription.*`, `invoice.payment_*`, `checkout.session.completed` (if using Checkout for signup), etc.; update `Tenant.subscriptionStatus`, `trialEndsAt`, `planTier` from price metadata.
- **Do not** remove or merge with existing Stripe webhook used for **client invoice** payments.

### Middleware — subscription gate

- After `checkJwt` (or on a dedicated router stack): load `Tenant` by `extractUserId(req)` as `adminAuth0Id` (for admins) or resolve owner for members and check **their** tenant (workspace owner’s subscription).
- If tenant missing (legacy migration window) or status is **cancelled** / **past_due** per product rules → **`402 Payment Required`** or **`403`** with clear code (choose one convention and document).
- **Exemptions:** public routes, health, billing webhook, Auth0 callbacks, optional read-only “reactivate” screens—define explicitly.

### In-app billing UI

- Current plan, trial countdown, upgrade/downgrade (if multiple prices), cancel at period end.
- Link to Stripe Customer Portal where appropriate (manage payment method, invoices).
- **Invoice history** — platform invoices (Stripe) vs. **workspace’s client invoices** — keep UX distinct (labels: “Platform subscription” vs. “Your client invoices”).

---

## Layer 2 — Self-Service Signup & Onboarding

### Marketing & pricing

- Public **pricing** page (plans, trial length, limits teaser).
- CTA → signup.

### Signup flow (high level)

1. Auth0 signup/login (email verification via Auth0 — configure in Auth0 dashboard).
2. Create **User** (existing flow) with role resolution updated (see below).
3. Create **Tenant** + **Stripe Customer** + **Subscription** (trial or paid per plan).
4. Ensure **workspace** data exists (same as today’s admin workspace bootstrap).

### Onboarding wizard (product)

- Company display name, brand colors (seed **SiteConfig**), first **TaskType**s, optional teammate invite (existing team APIs).
- Persist progress; allow skip with sensible defaults.

### Replace `PRIMARY_ADMIN_EMAIL` logic

**Target rule:** If a **Tenant** exists for this user’s `auth0Id` as `adminAuth0Id`, grant **admin** (or keep role from DB if already set). Remove reliance on “first user in DB” for production SaaS (may retain a one-time migration path for existing deploy).

**Implementation touchpoint:** `server/src/routes/users.ts` (and any migration scripts). Update **SETUP.md** / **.env.example** to deprecate `PRIMARY_ADMIN_EMAIL` for SaaS deployments.

---

## Layer 3 — Multi-Portfolio Public Routing

### Phase A — Subdomain (`*.platform.com`)

1. **DNS:** Wildcard `*.platform.com` → Vercel.
2. **Frontend:** Read `window.location.hostname`; extract subdomain (exclude `www`, handle localhost dev via env override, e.g. `VITE_DEV_PUBLIC_HOST` or query param for testing).
3. **API calls:** Pass workspace context on every public fetch:
   - Preferred: header `X-Public-Workspace: <subdomain>` or `X-Tenant-Host` with full host; **or** query `?workspace=<subdomain>` for simple caches—**pick one** and use consistently.
4. **Backend:** Middleware or per-route resolver: `subdomain` → `Tenant` → `workspaceOwnerId` → use in queries for `SiteConfig`, `PortfolioProject`, `Lead` (after Layer 4).

### Public routes to update

| Route | Change |
|-------|--------|
| `GET /api/portfolio/public`, `/featured`, `/:slug` | Require/derive workspace from host context; scope queries by `userId = workspaceOwnerId`. |
| `GET /api/site-config/public` | Same. |
| `POST /api/leads/public` | Resolve workspace; set `userId` on Lead (Layer 4). |

**Backward compatibility:** During migration, optional fallback: if no subdomain/header, use **Tenant #1** or env `DEFAULT_PUBLIC_WORKSPACE_OWNER_ID` for legacy single-domain behavior—then remove.

### Phase B — Custom domain

1. **Settings UI:** User enters domain (e.g. `portfolio.client.com`).
2. **Backend:** Vercel Domains API — attach domain to project; store on `Tenant.customDomain`; instruct user to set DNS (CNAME/A) — document in UI.
3. **Resolution:** On each request, `Host` → lookup `Tenant.customDomain` → `workspaceOwnerId`.
4. **SSL:** Rely on Vercel automatic certificates.

**Optional:** Cloudflare in front for DNS/SSL flexibility—[Open Decisions](#open-decisions).

---

## Layer 4 — Data Isolation Fixes

### Lead model

- Add `userId` (workspace owner / same scoping convention as **Pattern A** entities in ARCHITECTURE).
- **Migration script:** Backfill existing leads to the **single** legacy workspace owner (configurable ID).
- **Queries:** All lead CRUD and analytics scoped by `getWorkspaceOwnerId`-equivalent for admin routes.
- **`POST /api/leads/public`:** Must set `userId` from resolved tenant/workspace owner—**never** trust client-supplied workspace id without host/header validation.

### Cloudinary namespacing

- **New uploads:** `{workspaceOwnerId}/portfolio/{slug}/...` (or `tenantId` if you store a separate id—prefer **workspaceOwnerId** for consistency with DB).
- **Migration:** Script to list/move or copy assets and update URLs in **PortfolioProject** (and any embedded media fields); run in maintenance window or lazy-migrate with fallback URL logic—[Open Decisions](#open-decisions).

---

## Layer 5 — Transactional Email

- **Provider:** Resend (or Postmark/SendGrid) — one choice for v1.
- **Events (minimum):** welcome/onboarding complete; trial ending (e.g. 3 days before); payment failed; subscription cancelled; subscription resumed.
- **Future:** optional “invoice sent” to **end clients** (distinct from platform billing).

Implementation: server-side triggers from signup, Stripe billing webhooks, and scheduled job (trial reminder) — cron on Railway or Atlas Trigger + queue—[Open Decisions](#open-decisions).

---

## Layer 6 — Super-Admin Panel

- **Access:** Internal only — e.g. allowlist Auth0 `sub` or email env `SUPER_ADMIN_EMAILS`; or separate Auth0 role via Action.
- **Features:** List tenants; subscription status; plan tier; suspend/unsuspend; **usage** metrics (client count, invoice count, team size) via aggregation queries scoped per `workspaceOwnerId`.
- **Feature flags:** Per-tenant or per-`planTier` — simple `Tenant.features` object or global config collection.

---

## Infrastructure & Observability

| Topic | Notes |
|-------|--------|
| **Staging** | Separate Railway + Vercel + Atlas DB (or namespace); `staging` branch deploys. |
| **Sentry** | Server + client DSNs; tenant id in context for debugging. |
| **PostHog** (optional) | Product analytics; respect cookie consent if needed. |
| **Secrets** | Separate Stripe **billing** webhook secret vs. invoice webhook; Resend API key; Vercel token for Domains API. |

---

## Documentation & Cursor Context Updates

When implementing, update in lockstep:

| File | Updates |
|------|---------|
| **`ARCHITECTURE.md`** | Tenant model; public host resolution; Lead scoping; Stripe Billing vs Payment Links; remove “Global Data” for Leads once fixed. |
| **`README.md`** | SaaS features; new env vars; public API workspace resolution. |
| **`SETUP.md`** | Stripe Billing webhook, Resend, Vercel domain envs; Auth0 email verification; deprecate primary-admin-only story. |
| **`askanddeliverwebapp/.cursorrules`** | Tenant, subscription middleware, public route patterns, Cloudinary paths. |
| **This doc** | Keep **Open Decisions** updated. |

---

## Security & Multi-Tenant Rules

- **Never** accept arbitrary `workspaceId` from anonymous clients on public POST without cryptographic or host-based proof (use **Host** / resolved tenant).
- **Subscription gate** must use **workspace owner’s** Tenant for members (same as billing responsibility).
- **Super-admin** routes must not be guessable; enforce allowlist + `requireAdmin`-level hardening.
- **Stripe billing webhook:** Idempotency, raw body verification, no trust of client-supplied subscription ids without lookup.

---

## Testing Checklist

- [ ] New signup creates User + Tenant + Stripe Customer + Subscription; user lands as **admin** without `PRIMARY_ADMIN_EMAIL`.
- [ ] **402/403** when subscription suspended/cancelled per rules; public portfolio still works or blocked per product decision.
- [ ] **Stripe billing webhook** updates Tenant status on payment failure and recovery.
- [ ] `tenant1.platform.com` and `tenant2.platform.com` show **different** portfolio and site config.
- [ ] `POST /api/leads/public` attaches correct `userId`; admin only sees own workspace’s leads.
- [ ] Cloudinary new paths isolated; migration tested on staging copy.
- [ ] Custom domain (Phase B) resolves and SSL serves.
- [ ] Super-admin cannot be accessed by normal tenant admin.

---

## Decided Product Rules

1. **Shared instance** — All subscribers use the same Railway, Vercel, Atlas, and Cloudinary accounts; isolation is **logical** (workspace + Tenant), not physical.
2. **Stripe Billing is additive** — Client invoice checkout via Payment Links remains; platform subscriptions are a separate Stripe integration and webhook.
3. **Workspace owner = billable tenant** — `Tenant.adminAuth0Id` matches the admin’s Auth0 `sub`; subscription state applies to the whole workspace.
4. **Matt / Tenant #1** — Platform owner uses the same product as any subscriber (subdomain or custom domain), not a separate codebase.
5. **Auth0 unchanged** — Same JWT validation; role logic evolves to Tenant-based admin promotion for self-serve.

---

## Open Decisions

1. **Exact HTTP code for delinquent tenants:** `402` vs `403` + JSON code; whether to allow **read-only** export grace period.
2. **Public site when past_due:** Show portfolio with banner vs. full block.
3. **Lead migration:** Single legacy `userId` backfill vs. orphan handling.
4. **Cloudinary migration:** Big-bang move vs. lazy migration + dual-path URL resolution during transition.
5. **Trial reminders:** Cron on Railway vs. external scheduler vs. Stripe’s own emails only.
6. **Plan limits:** Hard block vs. soft warning for max clients / max team members per tier.
7. **Cloudflare:** Required vs. optional in front of Vercel for DNS/SSL.
8. **Header vs. query** for public workspace resolution: caching and CDN implications on Vercel.

---

## Phased Delivery

| Phase | Scope |
|-------|--------|
| **1 — Foundation** | `Tenant` model; Stripe Billing + `/api/webhooks/stripe-billing`; subscription middleware; billing UI (plan + portal); self-service signup + onboarding; replace `PRIMARY_ADMIN_EMAIL` with Tenant-based admin; **Lead `userId` + scoped queries + public POST resolution**. |
| **2 — Multi-portfolio** | Wildcard DNS; frontend host detection; backend subdomain → `workspaceOwnerId`; update **all** public GET/POST routes; Cloudinary `{workspaceOwnerId}/portfolio/...` + migration script. |
| **3 — Polish & growth** | Resend (or chosen provider) transactional emails; super-admin panel; custom domains (Vercel Domains API); plan tier enforcement; staging environment; Sentry + optional PostHog. |

---

## Phased Cursor Prompt Sequence

Use as **sequential** implementation prompts (one phase per session or PR). Context: `askanddeliverwebapp/`.

### Prompt 1 — Tenant model + Stripe Billing core

> Add a **Tenant** Mongoose model (`adminAuth0Id`, Stripe ids, `subscriptionStatus`, `planTier`, `trialEndsAt`, `subdomain`, optional `customDomain`) with unique indexes. Integrate **Stripe Billing**: create customer + subscription on signup path (stub signup if full Auth0 flow not ready), add `POST /api/webhooks/stripe-billing` with signature verification (separate secret env), and update Tenant on subscription lifecycle events. Add **subscription-check middleware** after JWT for protected API routes returning a documented status for inactive tenants. Add minimal **billing settings page**: current status + link to Stripe Customer Portal. Follow `docs/SAAS_CONVERSION_BUILD_PLAN.md` and existing server patterns.

### Prompt 2 — Signup, onboarding, admin role

> Implement **self-service signup** flow: marketing/pricing page, Auth0 signup, post-login bootstrap that creates Tenant + ties Stripe subscription. Build **onboarding wizard** (company name, theme seed, task types, optional invite). Replace **`PRIMARY_ADMIN_EMAIL`** logic in `users.ts`: grant **admin** when Tenant exists for `auth0Id`; migrate docs and `.env.example`. Keep first-user heuristic only if behind explicit `LEGACY_SINGLE_TENANT` flag. Match `docs/SAAS_CONVERSION_BUILD_PLAN.md`.

### Prompt 3 — Lead scoping + public POST resolution

> Add **`userId`** to Lead model; backfill script for legacy data; scope all lead queries to workspace owner. Update **`POST /api/leads/public`** to accept workspace via header or query from the **server-trusted** host resolution helper (temporary default for single-tenant legacy). Ensure members/admin lead routes use `getWorkspaceOwnerId`. Tests or manual checklist per build plan.

### Prompt 4 — Subdomain routing + public APIs

> Add **workspace resolution** from host: `subdomain` → Tenant → `workspaceOwnerId`. Update **client** public `api.ts` calls to send consistent header/query. Update **`GET /api/portfolio/public`**, **`/featured`**, **`/:slug`**, **`GET /api/site-config/public`**, **`POST /api/leads/public`** to scope by resolved owner. Document local dev pattern (`localhost` override). Deploy notes for wildcard DNS on Vercel.

### Prompt 5 — Cloudinary tenant prefix + migration

> Change upload paths to **`{workspaceOwnerId}/portfolio/{slug}/`**. Add migration script to move/update existing media references for legacy workspace(s). Verify portfolio pages and PDFs still load.

### Prompt 6 — Transactional email

> Integrate **Resend** (or chosen provider). Send emails for welcome, trial ending (scheduled job or daily cron), payment failed, cancelled, resumed. Centralize templates; load secrets from env.

### Prompt 7 — Super-admin + custom domains + limits

> Add **super-admin** route group (allowlist). Tenant list, metrics, suspend/unsuspend, feature flags. **Custom domain**: settings UI + Vercel Domains API + `Tenant.customDomain` lookup in host resolution. Enforce **plan tier limits** (team size, clients) in relevant APIs. Add **Sentry** wiring.

### Prompt 8 — Documentation sync

> Update **ARCHITECTURE.md**, **README.md**, **SETUP.md**, and **`.cursorrules`** to reflect SaaS architecture, new env vars, public routing, and Lead scoping. Cross-link this doc.

---

## Optional Enhancements

- Self-service **data export** per tenant (GDPR-style).
- **Referral** or affiliate tracking on signup.
- **Usage-based billing** (metered Stripe) for heavy portfolios.
- **Custom email from** domain (SPF/DKIM) for transactional mail.
