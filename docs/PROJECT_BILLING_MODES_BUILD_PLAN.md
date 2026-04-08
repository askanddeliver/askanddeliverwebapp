# Project Billing Modes — Build Plan

This document describes expanding **Ask And Deliver** so projects can be tracked and billed under distinct commercial models: open-ended hourly, **standing dollar budget** (with optional burn visibility), **fixed bid** (agreed project price independent of hours logged), and **hour retainer** (prepaid hour blocks with consumption and discipline reporting).

---

## Table of Contents

1. [Overview](#overview)
2. [Current State (Assessment)](#current-state-assessment)
3. [Target Behaviors](#target-behaviors)
4. [Conceptual Model](#conceptual-model)
5. [Data Model Changes](#data-model-changes)
6. [Invoice & Report Generation](#invoice--report-generation)
7. [API & Backend](#api--backend)
8. [Frontend](#frontend)
9. [Documentation & Cursor Context Updates](#documentation--cursor-context-updates)
10. [Security & Workspace Rules](#security--workspace-rules)
11. [Testing Checklist](#testing-checklist)
12. [Decided product rules](#decided-product-rules)
13. [Open Decisions](#open-decisions)
14. [Phased Delivery](#phased-delivery)
15. [Phased Cursor Prompt Sequence](#phased-cursor-prompt-sequence)

---

## Overview

### Problem

1. **Fixed bid** — You need hours and margin for internal operations, but the client invoice must reflect the **agreed project price**, not ∑(hours × rates), whether you are under or over budget on internal effort.

2. **Hour retainer** — A client bought a **block of hours** (e.g. 40h). Tracking $1,600 as if it were a dollar budget misrepresents the agreement; you need **hours consumed vs. hours purchased**, optional reload, and a **client-facing “invoice” that is really a utilization report** (remaining hours + time by discipline / task type).

3. **Existing hourly + budget** — Today, optional `Project.budget` is informational only. You want a clear **billing mode** so the app knows whether “budget” means dollars, hours, or is irrelevant to invoicing.

### Non-Goals (Initial Release)

- Automated retainer **reload billing** through Stripe (manual or future phase).
- Client portal login for retainer balance (internal admin reporting first).
- Changing how **member** role visibility works beyond existing rules (members still may not see rates unless you extend that separately).

---

## Current State (Assessment)

| Area | Behavior today |
|------|----------------|
| **`Project` model** | Optional numeric `budget` (≥ 0). No enum for what it represents. |
| **Project UI** | `ProjectModal` edits budget; `ProjectCard` shows “Budget: $X” when set. No burn, no hours-vs-budget. |
| **Time entries** | Always tied to `projectId`, `taskTypeId`, duration; rates come from `TaskType` + client `taskDiscounts`. |
| **Reports / `POST /api/reports/generate-invoice`** | Aggregates **billed amount = hours × effective rate** per task type (+ fixed `LineItem`s). Totals are always sum of those amounts. **No project-level override.** |
| **`Invoice` persistence** | Snapshots `items`, `total`, `totalHours`, margins, etc. All items are hourly rollups or fixed costs. |
| **Documentation** | README lists “Budget tracking — Optional budget field per project” as a feature; ARCHITECTURE ERD shows `budget` on Project without semantics. |

**Conclusion:** The architecture is solid for **time-and-materials invoicing**. Budget is cosmetic until you add **billing mode**, **generation rules**, and optional **non-monetary retainer** views.

---

## Target Behaviors

### Mode A — `HOURLY` (default)

- **Tracking:** Same as today: time entries accrue billable value via task types and discounts.
- **Budget:** Optional `budget` may represent an informal **dollar ceiling** for your own planning (see [Standing budget](#mode-b--hourly--standing_budget)).
- **Invoice:** Current behavior: roll up hours × effective rates (+ line items).

### Mode B — `HOURLY` + `standingBudget` (optional sub-behavior)

- Still **HOURLY** for invoicing.
- **UI:** Show **burn**: e.g. ∑ billed (or internal cost) vs. `budget` — without changing invoice math.
- Clarify in UI copy that this is “internal / planning” unless you later add alerts.

### Mode C — `FIXED_PRICE` (fixed bid)

- **Project fields:** Agreed **invoice amount** (the bid), optional **internal budget** for your own cost tracking (can reuse `budget` or a separate `internalCostCeiling` — see [Open Decisions](#open-decisions)).
- **Tracking:** Time entries unchanged; Reports still compute **internal** margin (hours × earned vs. what you would have billed T&M) for admin insight.
- **Invoice generation:** **Total charged to client = agreed fixed price** (single line or clearly labeled project fee line). Optional attachment-style **detail**: hours by task type **for transparency only** with $0 or “included” — product choice (see [Invoice & Report Generation](#invoice--report-generation)).

### Mode D — `HOUR_RETAINER`

- **Project fields:** **Hours in current block** (e.g. 40), optional **reload** history or a simple **adjustment** field for manual top-ups.
- **Tracking:** Sum **hours** from time entries against the block. **Dollar rates on invoice are not the client-facing story** for the “invoice”; optionally hide or de-emphasize $ for this project in Reports when generating the client document.
- **Client document:** Primary output is a **Retainer utilization report**: remaining hours, hours used in period, breakdown by **task type** (maps to your “disciplines” / service lines). Not a tax invoice for extra labor unless you add a separate T&M line item manually via `LineItem`.

---

## Conceptual Model

```
Project.billingMode:
  | 'HOURLY'           // default; T&M invoicing
  | 'FIXED_PRICE'      // invoice total = agreed amount
  | 'HOUR_RETAINER';   // track hours against pool; client doc = utilization report

Project.budget          // optional: meaning depends on mode (see below)
Project.agreedAmount?   // FIXED_PRICE: client-facing contract total
Project.retainerHours?  // HOUR_RETAINER: size of current hour block
Project.retainerHoursConsumed? // denormalized cache optional for perf, or compute from entries
```

**Meaning of `budget` by mode (recommended):**

| Mode | `budget` use |
|------|----------------|
| `HOURLY` | Optional **standing dollar budget** for burn charts / warnings. |
| `FIXED_PRICE` | Either **same as agreedAmount** (simple) or **internal cost target** — pick one convention and document it. |
| `HOUR_RETAINER` | **Ignore for client-facing $**; may store legacy $ for migration display only, or clear on migration. |

---

## Data Model Changes

### `server/src/models/Project.ts`

Add (names indicative — align with existing naming during implementation):

- `billingMode`: enum, default `'HOURLY'`.
- `agreedAmount?: number` — required when `billingMode === 'FIXED_PRICE'` (Mongoose `required` function or validate in route).
- `retainerHoursTotal?: number` — for `HOUR_RETAINER` (e.g. 40).
- Optional: `retainerHoursAdjustment?: number` — manual delta (+/-) when client buys another block without duplicating the project.
- Optional: `fixedPriceInvoiceLabel?: string` — line description override on invoice (“Website redesign — Phase 1”).

**Migration:** Existing projects → `billingMode: 'HOURLY'`, all other fields absent.

### `client/src/types/index.ts`

Mirror types; ensure `Project` modal and API payloads validate.

### `Invoice` model (optional extension)

If you need to distinguish saved documents:

- `documentKind?: 'INVOICE' | 'RETAINER_REPORT'` — or overload `notes` + `items` shape.
- For **FIXED_PRICE**, items might be a **single synthetic line** with `amount = agreedAmount`, `hours` on the line optional or 0; store **`supportingDetail`** (JSON or embedded) for hours-by-task-type snapshot for PDF.

Prefer **minimal change:** store retainer reports as **invoices with a flag** so list/detail/PDF paths stay one pipeline, unless you want a separate collection.

---

## Invoice & Report Generation

### Fixed price (`FIXED_PRICE`)

1. **Input:** Same date range + project selection as today.
2. **Computed internally:** Keep `costBreakdown` / margin for admin (existing logic).
3. **Client-facing totals:**
   - `subtotal` / `total` = **`agreedAmount`** (from project at generation time — snapshot into invoice so later project edits don’t rewrite history).
4. **Line items:** Recommended single line:
   - `taskTypeName`: project title or `fixedPriceInvoiceLabel`
   - `amount`: `agreedAmount`
   - `hours`: 0 or omit from sum; **or** show total hours in notes/PDF appendix only.

**Stripe Payment Links:** Amount must match **invoice total** → use `agreedAmount` path.

### Hour retainer (`HOUR_RETAINER`)

1. **Do not** use ∑(hours × rate) as the client total unless you explicitly add extra T&M line items.
2. **Generate “Retainer period report”:**
   - **Date range** = the reporting period (e.g. this month): filter time entries to show **hours in period** by task type (discipline).
   - **Standing balance** = **not** reset each month: **hours remaining** = `retainerHoursTotal + adjustments − all hours logged on this project` (cumulative). Monthly reports show both period activity and **current remaining** against the pre-purchased block.
   - When the client buys another block, record via **adjustment** or a `reloads[]` entry (see [Open Decisions](#open-decisions)) — out of band (discussion), not automated billing in v1.
3. **Persist** as invoice-like record with `documentKind: RETAINER_REPORT` or equivalent; **total** may be **0** or hidden for PDF; payment link **disabled** for this kind unless you add a separate fee line.

### HOURLY (unchanged)

- Existing `generate-invoice` behavior.

---

## API & Backend

| Change | Location |
|--------|----------|
| Project CRUD validation | `server/src/routes/projects.ts` (or equivalent) — enforce fields per `billingMode`. |
| `POST /api/reports/generate-invoice` | Branch on **selected project(s)** billing mode; **do not blend modes on one document** — separate invoices/reports per project when modes differ ([Decided product rules](#decided-product-rules)). |
| Optional: `GET /api/projects/:id/billing-summary` | Returns burn rate, retainer remaining, fixed price snapshot for dashboards. |
| Invoice create from preview | Pass through `documentKind` / totals from new generator shape. |

**Mixed projects in one invoice:** See [Decided product rules](#decided-product-rules).

---

## Frontend

| Surface | Change |
|---------|--------|
| **Project modal** | Billing mode selector; conditional fields (agreed $, retainer hours); help text. |
| **Project card** | For `FIXED_PRICE`: show agreed price; for `HOUR_RETAINER`: show **hours remaining** bar; for `HOURLY` + budget: burn indicator. |
| **Reports / Invoice preview** | Mode-specific preview titles (“Invoice” vs. “Retainer utilization report”); hide irrelevant columns for retainers. |
| **Invoices list** | Badge or filter by document kind. |

**Member role:** Preserve existing restrictions on rates; retainer views may show **hours only** (already aligned with “no dollars” for members if you hide amounts).

---

## Documentation & Cursor Context Updates

When implementing, update these in lockstep:

| File | Updates |
|------|---------|
| **`ARCHITECTURE.md`** | ERD: add `billingMode`, `agreedAmount`, `retainerHoursTotal` on Project; new subsection **Project billing modes** under business logic; note `generate-invoice` branches. |
| **`README.md`** | Replace generic “budget tracking” with accurate bullets: modes, fixed bid invoicing, retainer reports. |
| **`SETUP.md`** | If any env vars (none expected for v1). |
| **`askanddeliverwebapp/.cursorrules`** | Under **Core Business Concepts**, add **Project billing modes** with enum values, invoice rules, and “retainer report is not T&M”. |
| **This doc** | Keep **Open Decisions** updated as you lock choices. |

---

## Security & Workspace Rules

- All project billing fields are **workspace-scoped** like other projects (`userId` = workspace owner).
- **Validation:** Only admin can edit billing mode and amounts (members typically cannot edit projects today — confirm `routes/projects` permissions).

---

## Testing Checklist

- [ ] Default **HOURLY** projects behave exactly as before (invoice totals unchanged).
- [ ] **FIXED_PRICE:** Preview and saved invoice total = `agreedAmount`; Stripe link uses same amount; internal margin still visible to admin.
- [ ] **HOUR_RETAINER:** Hours decrement correctly; report shows disciplines/task types; no erroneous dollar total.
- [ ] **Migration:** Existing projects load; no undefined `billingMode` errors.
- [ ] **Mixed mode:** UI blocks combining incompatible projects on one invoice (per [Decided product rules](#decided-product-rules)).

---

## Decided product rules

These are locked for implementation unless requirements change.

1. **One commercial model per project** — A project has a single `billingMode`. You do not blend hourly + fixed + retainer inside one project.

2. **One invoice / report per billing story** — Do not merge incompatible modes on a single invoice. Different projects (or different modes) → **separate** invoices or retainer reports. UI should avoid multi-project selection when it would mix modes.

3. **Retainer hours (standing block + monthly reporting)** — The client pre-purchases a block (e.g. 40h). Time entries consume from that **standing total** over time. **Each month** (or any chosen date range), you generate a report that shows **activity in that period** (hours by discipline/task type) and **remaining hours** against the **current pool** (block + adjustments − **all** time logged on the project while in retainer mode, or equivalent rule). When hours run low, the **re-up** is a business conversation; the app supports recording additional hours via adjustment or reload history — not automated charging in v1.

---

## Open Decisions

1. **Fixed price internal display:** Show full T&M “what it would have been” on a second PDF page vs. admin-only Reports screen.
2. **`budget` on FIXED_PRICE:** Same as client agreed amount vs. separate internal cap (avoid double meaning).
3. **Retainer reload:** New Mongo subdocument `reloads: [{ hours, date, note }]` vs. single `adjustment` number.
4. **Invoice vs. report collection:** One `Invoice` collection with `documentKind` vs. separate `RetainerReport` collection.

---

## Phased Delivery

| Phase | Scope |
|-------|--------|
| **1** | **Schema + API + types:** `billingMode` + fields; validation; migration defaults; Project UI to set modes; display on project card (basic). |
| **2** | **FIXED_PRICE:** `generate-invoice` branch; snapshot `agreedAmount`; Invoice preview + PDF; Stripe total alignment. |
| **3** | **HOUR_RETAINER:** Hour pool math; retainer summary endpoint or embedded in project; **utilization report** PDF/preview; optional reload/adjustment. |
| **4** | **HOURLY burn:** Optional dashboard / card progress vs. dollar `budget`; warnings only. |
| **5** | **Docs pass:** ARCHITECTURE, README, `.cursorrules`; polish copy; testing checklist sign-off. |

---

## Phased Cursor Prompt Sequence

Use these as **sequential** implementation prompts (one phase per session or PR). Paste into Cursor with the project root `askanddeliverwebapp/` as context.

### Prompt 1 — Foundation (schema & types)

> In the Ask And Deliver MERN app under `askanddeliverwebapp/`, add **project billing mode** support at the data layer. Extend `server/src/models/Project.ts` with `billingMode: 'HOURLY' | 'FIXED_PRICE' | 'HOUR_RETAINER'` (default HOURLY), optional `agreedAmount`, `retainerHoursTotal`, and optional `retainerHoursAdjustment` and `fixedPriceInvoiceLabel`. Update Mongoose schema, TypeScript interfaces, `client/src/types/index.ts`, and project API routes so create/update validate: `FIXED_PRICE` requires `agreedAmount`; `HOUR_RETAINER` requires `retainerHoursTotal`. Ensure existing documents default to HOURLY. Update `ProjectModal` / project forms with a billing mode selector and conditional fields. Show a short summary on `ProjectCard`. Match existing code style; do not change invoice generation yet.

### Prompt 2 — Fixed-price invoice generation

> Implement **FIXED_PRICE** billing in `POST /api/reports/generate-invoice` and the invoice preview flow. When all selected projects for the invoice share FIXED_PRICE (or enforce single-project for this mode), the client-facing `total` and line items should reflect the **agreed project price** snapshot, not ∑(hours×rate). Preserve internal cost/margin data for admin in `costBreakdown` or equivalent. When persisting an invoice from this preview, snapshot totals correctly for Stripe payment links. Follow `docs/PROJECT_BILLING_MODES_BUILD_PLAN.md`. Add UI copy on Reports when a fixed-price project is selected.

### Prompt 3 — Hour retainer utilization report

> Implement **HOUR_RETAINER** per `docs/PROJECT_BILLING_MODES_BUILD_PLAN.md`. Compute hours consumed from time entries; remaining = `retainerHoursTotal + adjustment - consumed`. Add a **retainer utilization report** path (reuse invoice preview/PDF pipeline with a distinct template or `documentKind`): show hours by task type, remaining hours, no dollar total unless optional pass-through line items exist. Wire Reports UI to choose “Retainer report” when project mode is HOUR_RETAINER. Respect member visibility rules for rates.

### Prompt 4 — HOURLY standing budget burn (optional)

> For HOURLY projects with `budget` set, add an optional **burn indicator** on the project card or a small summary API: compare accumulated billed (or internal) amount vs. budget for a configurable period or project lifetime. No change to invoice math. Add non-intrusive UI and avoid duplicating heavy report logic (reuse calculations util where possible).

### Prompt 5 — Documentation & rules sync

> Update `ARCHITECTURE.md`, `README.md`, and `askanddeliverwebapp/.cursorrules` to document project billing modes, fixed-price invoicing, and retainer reports consistently with the implementation. Keep sections concise; cross-link `docs/PROJECT_BILLING_MODES_BUILD_PLAN.md`.

---

## Optional Enhancements

- Email PDF of retainer report to client from the app.
- Alerts when retainer hours drop below threshold or fixed-price internal margin goes negative.
- Proposal → Project: pre-fill `agreedAmount` from accepted proposal investment total.
