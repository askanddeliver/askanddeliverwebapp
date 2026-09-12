# Reports Workbench — Build Plan

**Status:** Phases 0–7 shipped (September 2026). Remaining-hours formula, filter-rail workbench, column catalog, presets, `/backups`, Reports library vs Invoices, `/payroll` pay stubs, and this docs pass are in.  
**Parent:** [PLATFORM_EXPANSION_BUILD_PLAN.md](./PLATFORM_EXPANSION_BUILD_PLAN.md)  
**Related:** [PROJECT_BILLING_MODES_BUILD_PLAN.md](./PROJECT_BILLING_MODES_BUILD_PLAN.md), [PAYMENT_LINKS_BUILD_PLAN.md](./PAYMENT_LINKS_BUILD_PLAN.md)  
**Fixture:** [Design System Update/reports_rebuild/askanddeliver-backup-2026-09-12.json](./Design%20System%20Update/reports_rebuild/askanddeliver-backup-2026-09-12.json)

This document reimagines **Reports** as a filter-first workbench with separate libraries for the documents that workbench produces. It also records a **remaining-hours discrepancy** found on Battle Sports **Systems Web Support (Retainer)**.

Phases 0–7 are **shipped**. Use this file as the source of truth for remaining-hours math, output destinations, and discussion locks — not as an unimplemented redesign.

---

## Table of Contents

1. [Problem](#problem)
2. [Current state](#current-state)
3. [Remaining hours investigation](#remaining-hours-investigation)
4. [Target information architecture](#target-information-architecture)
5. [Workbench layout](#workbench-layout)
6. [Filter model](#filter-model)
7. [Output kinds and destinations](#output-kinds-and-destinations)
8. [Column / data selections](#column--data-selections)
9. [Multi-contributor invoices and payroll](#multi-contributor-invoices-and-payroll)
10. [Data model](#data-model-shipped)
11. [API](#api-shipped)
12. [Frontend surfaces](#frontend-surfaces)
13. [Relationship to billing modes](#relationship-to-billing-modes)
14. [Discussion locks](#discussion-locks)
15. [Phased delivery](#phased-delivery)
16. [Cursor prompt sequence](#cursor-prompt-sequence)
17. [Testing checklist](#testing-checklist)
18. [Docs to update at implementation time](#docs-to-update-at-implementation-time)

---

## Problem

The current `/reports` page is one surface doing four jobs: **explore data**, **configure a billing document**, **export/backup**, and **preview**. That collapse is why mixed billing modes fail with a blocking error, why Backup sits next to Invoice, and why saved retainer reports look like unpaid invoices.

Product goals for the rebuild:

1. **Filter-first exploration** — Client, Project, Billing Type, Date Range (plus member, later) grouped in a left filter rail. On-demand filters and **saved filter sets**.
2. **Output follows billing story** — Invoice, utilization / budget report, data report, pay stub, CSV, PDF, and backup are distinct actions with distinct destinations.
3. **Libraries that already exist stay elevated; missing ones get routes** — Invoices already has a home. Add **Reports library**, **Payments / Payroll**, and **Backups**.
4. **Multi-contributor billing** — A client invoice (or retainer report) must remain correct when several members logged time on the selected projects. Payroll is the member-facing inverse of that same slice.
5. **Retainer remaining hours must be historically honest** — a July utilization report must not silently include August consumption in its remaining figure.

---

## Current state

### Shipped (September 2026)

| Area | Behavior |
|------|----------|
| **Workbench** | `/reports` — left filter rail (Client, Project, Billing type, Date including All Time, People, columns, presets, entry options). |
| **Generate** | `POST /api/reports/generate-invoice` returns HTTP 200 for mixed modes (`invoiceKind: MIXED`, empty `items`, `compatibleOutputs`). Failed generate clears the stale preview. |
| **Outputs** | CSV, Print (single billing type), Create Invoice, Save retainer report, Save data report, Save pay stub. Backup is on `/backups` only. |
| **Libraries** | `/invoices` payable `INVOICE` only. `/reports/saved` utilization / data / budget. `/payroll` pay stubs. Stripe refused for non-`INVOICE`. |
| **Remaining hours** | Document remaining = pool + adjustment − stopped entries with `startTime` ≤ period end. Live remaining is workbench-only. |
| **Nav** | Time Tracking: Reports, Saved reports, Invoices, Payroll, Backups. |

### Pre-rebuild snapshot (2026-09-12)

The table below is the **pre-rebuild** Reports page that motivated this plan. Keep it for the remaining-hours investigation.

| Area | Behavior then |
|------|----------------|
| **Route** | Single admin page `/reports` (`client/src/pages/Reports.tsx`). |
| **Filters** | Multi-select clients + projects, start/end dates. Quick sets: Last 7 days, Last 30 days, This month. No All Time, Last Month, week sets, billing-type filter, member filter, or saved presets. |
| **Generate** | Auto-runs on load. `POST /api/reports/generate-invoice` **rejects mixed `billingMode`** with a hard error. Failed generate **leaves the previous preview in place**. |
| **Outputs on the same toolbar** | Export CSV, Print/PDF, Backup Data (full workspace JSON), Preview, Create Invoice / Save retainer report. |
| **PDF options** | Include time entries; include entry descriptions. No column catalog. |
| **Tabs** | Invoice preview · Time Entries · Member Contributions (`costBreakdown` from earned rates). |
| **Backup** | `POST /api/export/backup` — clients, projects, task types, project tasks, time entries, line items. No invoices, users, presets, or filter-scoped backup. Button lived on Reports. |
| **Saved documents** | `Invoice` collection with `documentKind: INVOICE \| RETAINER_REPORT`. Both appeared on `/invoices`. Stripe refused for `RETAINER_REPORT`. |
| **Payroll** | No pay-stub document. Member Contributions was preview-only. |
| **Nav** | Sidebar: Reports + Invoices under Time Tracking. |

`ReportFilters.tsx` is an older single-select client/project control; the live page inlines a checkbox multi-select instead. Treat `Reports.tsx` as source of truth.

---

## Remaining hours investigation

**Project:** Systems Web Support (Retainer) (`6992db372e21bd5f49d6e809`)  
**Client:** Chris Circo / Battle Sports  
**Mode:** `HOUR_RETAINER`, `retainerHoursTotal: 40`, no adjustment, status `PAUSED`, legacy `budget: 1600` (40h × Support $40).  
**Source:** backup exported `2026-09-12T05:44:04.788Z` (627 time entries workspace-wide).

### What the two saved reports show

| Saved doc | Period | Period hours | Used (all-time) | Remaining |
|-----------|--------|--------------|-----------------|-----------|
| **260813-2** PAID (created Aug 13) | Jul 1–31, 2026 | 2.75 | 22.68 | **17.32** |
| **260911-3** SENT (created Sep 11) | Aug 1–31, 2026 | 0.50 | 22.68 | **17.32** |

Period hours match the backup (July 3 entries = 2.75h; August 2 entries on Aug 6 = 0.50h). Pool math `40 − 22.68 = 17.32` is internally consistent. The discrepancy is **which hours “remaining” subtracts**.

### Code vs. historical remaining

`POST /api/reports/generate-invoice` (HOUR_RETAINER) does:

```
consumedHoursAllTime = Σ duration of stopped entries on the project (no date cap)
remainingHours       = retainerHoursTotal + adjustment − consumedHoursAllTime
```

There is **no `endDate` bound** on consumption. Remaining is “as of now (generation time),” then snapshotted onto the saved invoice.

Correct **period-end** remaining from the same backup:

| As of | Consumed | Remaining |
|-------|----------|-----------|
| Jul 31, 2026 | 22.18 h | **17.82 h** |
| Aug 31, 2026 | 22.68 h | **17.32 h** |
| Sep 12, 2026 (export) | 22.68 h | **17.32 h** |

July’s saved remaining is **0.50 h too low** because the Aug 6 entries already existed when 260813-2 was generated on Aug 13. August’s remaining happens to match period-end only because nothing was logged after Aug 6.

Workbench screenshot (Aug 13–Sep 12, 2026) showing **0m in period** and remaining **17.32 h** is consistent with the backup (no retainer entries in that window). Mixed-mode generate failed; leftover preview still showed the prior retainer remaining.

### Other facts (not the same bug)

| Fact | Implication |
|------|-------------|
| 27 stopped entries, **one user** (workspace admin). | Multi-contributor is not why this retainer’s remaining is wrong. |
| All 27 entries are task type **Support**. No Support hours on other Chris Circo projects. | Work was not leaking onto hourly projects in this export. |
| **June 3.50 h** (2 entries) are **uninvoiced**. | Operational gap (no June utilization report), not a pool-math skip — those hours **are** in the 22.68 used. |
| **Oct 8, 2025** 3.75 h is included in the 40 h pool. Excluding it would leave **21.07 h**. | Open product question: retainer start / hours logged before the 40 h block. |
| Reports landing **Remaining (min pool)** uses `Math.min` across selected retainer projects. | Wrong for multi-project retainers (should be per project, or a labeled total). |
| Full JSON backup **omits invoices**. | Cannot reconcile saved `retainerSummary` from backup alone; screenshots + live entries were required. |

### Recommended lock (confirm in discussion)

On any generated or saved utilization document:

```
consumedThroughEnd = Σ stopped entry duration on that project where entry start ≤ period end
remainingAsOfEnd   = pool + adjustment − consumedThroughEnd
```

The workbench may **also** show **live remaining** (no date cap) as a separate figure, labeled as current — never as the number printed on a historical report.

Independent of the IA rebuild: this formula fix is a **small, shippable PR** (Phase 0 below).

---

## Target information architecture

```
Time / Billing (admin)
├── /reports                 Workbench (filter rail + preview)
├── /reports/saved           Reports library (data reports, utilization, budget)
├── /invoices                Payable invoices (exists)
├── /payroll                 Pay stubs / member payouts (new)
└── /backups                 Full backup + filter-preset backups (new)
```

**Principle:** the workbench **configures a slice** of workspace data. Each output action **writes or downloads** that slice into the library that owns that document kind. Do not keep Backup, Invoice, Payroll, and utilization on one undifferentiated toolbar.

Existing `/invoices` stays the home for **payable** documents (`documentKind: INVOICE`). Utilization and budget documents move **conceptually** to the Reports library (implementation may keep the `Invoice` collection with a wider `documentKind` — see discussion).

```
Filter set (ad hoc or saved preset)
        │
        ▼
   Workbench preview
        │
        ├── Invoice            → /invoices
        ├── Support hours /
        │   budget report      → /reports/saved
        ├── Data report        → /reports/saved  (and/or CSV)
        ├── Pay stub           → /payroll
        ├── Export CSV         → download
        ├── Print / PDF        → browser print of current preview
        ├── Backup now         → /backups download (full or preset-scoped)
        └── Save backup preset → /backups
```

---

## Workbench layout

Left **filter rail** (grouped, not a 4-column strip):

| Group | Controls |
|-------|----------|
| **Client** | Multi-select. Empty = all clients. Selecting clients scopes the project list. |
| **Project** | Multi-select of projects in scope. Empty = all projects for selected clients (or workspace). Show billing-mode badge per project. |
| **Billing type** | `HOURLY` · `FIXED_PRICE` · `HOUR_RETAINER` (multi). Empty = all. **This is the primary way to avoid mixed-mode errors.** |
| **Date range** | Start / end **or** All Time. Quick sets: All Time, This Month, Last Month, This Week, Last Week, Last 7 Days, Last 30 Days. |
| **People** (recommended) | Multi-select members. Empty = all contributors in the slice. Needed for pay stubs and for invoices that should only include certain people. |
| **Entry options** | Include entries on PDF; include entry descriptions. |
| **Columns** | Organized checkbox set (see [Column / data selections](#column--data-selections)). |
| **Presets** | Apply / save / update a named filter set (filters + columns + entry options). |

Main pane:

- Summary of the **current slice** (hours, remaining-as-of-end vs live remaining when retainers are in scope, billed, earned, margin — role-gated).
- Preview that **follows the selected output kind** (not a single Invoice tab pretending to be everything).
- Time entries and member contributions as inspectable panels for the same slice.

Output bar (right of rail or sticky under header), **enabled/disabled by billing type + output kind** — do not fire `generate-invoice` when the slice is mixed unless the chosen action is “split by billing type.”

---

## Filter model

### Date range quick sets

| Preset | Rule (local timezone, existing `toUTCStartOfDay` / `toUTCEndOfDay`) |
|--------|------|
| All Time | Omit start/end (or send nulls). Server must allow unbounded queries. |
| This Month | First of month → today (or last day of month if we lock “calendar month closed”). |
| Last Month | Previous calendar month, full. |
| This Week | Locale week start → today. **Lock week start (Sun vs Mon).** |
| Last Week | Previous full locale week. |
| Last 7 Days | Rolling. |
| Last 30 Days | Rolling (current default). |

### Saved filter sets (workbench)

Named, workspace-scoped records: clients, projects, billing types, members, date preset **or** explicit start/end, column ids, entry options. Used to re-open the workbench and to drive **backup presets**.

### Backup presets

A backup preset is a filter set whose download is **that slice** (plus the related graph: selected clients/projects, their tasks/entries/line items). Distinct from **full workspace backup** (current `POST /api/export/backup`, expanded to include invoices and users-without-secrets).

---

## Output kinds and destinations

| Output | When it is valid | Destination | Notes |
|--------|------------------|-------------|--------|
| **Invoice** | Slice is one client; projects are `HOURLY` and/or `FIXED_PRICE` only (not mixed with retainer). Multiple members allowed. | `/invoices` | Existing create-invoice path. Stripe / payment links unchanged. |
| **Support hours / budget report** | `HOUR_RETAINER` projects (utilization) and/or `HOURLY` projects with a standing `budget` (burn). One billing story per document. | `/reports/saved` | Replaces “Save retainer report” into Invoices. Remaining = as-of period end. |
| **Data report** | Any slice. | `/reports/saved` and/or CSV | Internal; column catalog applies. Not a tax invoice. |
| **Pay stub** | One member (or one stub per selected member). Date range required. | `/payroll` | Earned rates × hours. No client rates. Admin-only. |
| **Export CSV** | Any slice. | Download | Existing export, honor new filters (billing type, members, All Time). |
| **Print / PDF** | Current preview. | Browser print | Same entry-options + columns as preview. |
| **Backup now** | Full workspace **or** active backup preset. | Download + optional `/backups` history | Move off the invoice toolbar. |
| **Save backup preset** | Named filter set. | `/backups` | Does not dump data until Backup now. |

**Mixed billing types:** do not show a page-level generate failure as the primary UX. Either disable incompatible outputs, or offer **Split** (one preview/document per billing type / per client).

---

## Column / data selections

Organized checkbox groups for **Data report** and optional extra columns on PDF. Invoice / utilization / pay stub have **defaults** (client-safe vs internal). Saving a filter preset stores the column set.

| Group | Columns |
|-------|---------|
| **When** | Date, start, end, duration (h / human) |
| **Who** | Member name |
| **Where** | Client, project, billing mode, project task |
| **What** | Task type, description (gated by entry option) |
| **Client $** | Base rate, discount %, effective rate, billed amount — **admin + invoice/data report only** |
| **Internal $** | Earned rate, earned amount, margin — **admin + data report / pay stub; never on client PDF** |
| **Status** | Invoiced?, invoice number, running? |

Unchecking a column hides it from preview, CSV, and PDF. It does not change aggregation math.

---

## Multi-contributor invoices and payroll

Today `generate-invoice` already sums **all** matching entries regardless of `entry.userId`, and `costBreakdown` attributes billed / earned / margin per member. The workbench must make that first-class:

1. **Client invoice** — default includes every member in the slice. Optional member filter to exclude people. PDF: client-facing lines stay task-type (or agreed fee); **hours by member** is an opt-in internal appendix, not the client total.
2. **Retainer / budget report** — same: period hours by task type for the client; member split is internal unless we lock “show contributors on utilization PDF.”
3. **Pay stub** — invert the slice: one member, earned rates only, no client discounts. Library: `/payroll`.
4. **Do not** put earned rates on client-facing invoices.

Chris Circo retainer in the Sep 12 backup is **single-contributor**; multi-member is still required for hourly Battle Sports projects (e.g. 2027 Equipment Design, Team Channel Web Rebuild).

---

## Data model (shipped)

Option **A**: one `Invoice` collection; list pages filter by `documentKind`.

### `FilterPreset`

Workspace-scoped (`userId` = owner, Pattern A). Fields: `name`, `kind: 'REPORT' | 'BACKUP'`, `clientIds[]`, `projectIds[]`, `billingModes[]`, `memberAuth0Ids[]`, `datePreset` or `startDate`/`endDate`, `columnIds[]`, `includeTimeEntries`, `includeEntryDescriptions`. Unique `{ userId, kind, name }`.

### `Invoice.documentKind`

`INVOICE | RETAINER_REPORT | DATA_REPORT | BUDGET_REPORT | PAY_STUB`. `/invoices` lists payable `INVOICE` (legacy missing kind counts as invoice). `/reports/saved` lists library kinds. `/payroll` lists `PAY_STUB`. Stripe and SENT/PAID refused for non-`INVOICE`.

### Retainer snapshot

`retainerSummary.projects[]` includes `consumedHoursThroughEnd`, `remainingHoursAsOfEnd`, and optional `consumedHoursAllTime` / `remainingHoursLive` (workbench only). Saved documents persist **as-of-end**.

### Backup payload

Full backup should add `invoices` (and pay stubs if separate), `filterPresets`, and **users without secrets** (no tokens). Filter-scoped backup includes only entities in the preset graph.

---

## API (shipped)

| Change | Notes |
|--------|--------|
| `POST /api/reports/generate-invoice` | Accepts billingModes, memberAuth0Ids, optional dates; mixed modes return 200 + `compatibleOutputs[]` (not renamed to `/preview`). |
| Retainer remaining | Bound consumption by `endDate` (All Time → now). |
| `GET/POST/PUT/DELETE /api/filter-presets` | CRUD; `kind` REPORT vs BACKUP. Pattern A, admin-only. |
| `POST /api/export/backup` | Optional `presetId`; invoices, filterPresets, sanitized users. |
| Pay stub persist | Same `POST /api/invoices` with `documentKind: PAY_STUB`; list via `GET /api/invoices?documentKind=payroll`. |
| CSV | Honors billing type, members, All Time, column catalog. |
| `GET /api/reports/unfiled-retainer-hours` | Banner on `/reports/saved`. |

Workspace scoping: Pattern B (`getWorkspaceOwnerId`) for reports/export; Pattern A for invoices/presets owned by admin. Admin-only writes unchanged.

---

## Frontend surfaces

| Route | Page |
|-------|------|
| `/reports` | Workbench: filter rail + preview + outputs. |
| `/reports/saved` | Library of `RETAINER_REPORT`, `BUDGET_REPORT`, `DATA_REPORT`. |
| `/invoices` | Payable only (`documentKind: INVOICE`). |
| `/payroll` | Pay stubs. |
| `/backups` | Full backup CTA + preset list + download history (v1 can be download-only, no stored blobs). |

Sidebar: Reports, Saved reports, Invoices, Payroll, Backups under Time Tracking. Breadcrumbs in `adminBreadcrumbs.ts`.

Reuse `InvoicePreview` with kind-specific templates. New `ReportFilterRail` replaces the Filter & Export card. Move backup UI out of `ExportButtons.tsx`.

---

## Relationship to billing modes

This plan does **not** change `Project.billingMode` semantics. It changes **how you select, preview, and file** the documents those modes already produce.

Updates to [PROJECT_BILLING_MODES_BUILD_PLAN.md](./PROJECT_BILLING_MODES_BUILD_PLAN.md):

- Remaining hours on a utilization document = **as of period end**.
- Mixed-mode handling moves from a hard generate error to workbench output gating / split.
- Retainer reports are filed in the Reports library, not presented as invoices.

Open items still owned by the billing-modes doc: retainer reload subdocument vs single adjustment; `budget` meaning on `FIXED_PRICE`.

---

## Discussion locks

Confirmed **2026-09-12**, with later phase decisions as noted. Lock **14** (contributor names on client PDF) remains open. All other locks for Phases 0–7 are decided.

### Remaining hours and retainers

1. **Historical remaining — Decided.** Period-end consumption for saved/generated reports; live remaining only on the workbench, separately labeled.
2. **Hours before the 40 h block — Decided.** Include **all** stopped entries on the project (including Oct 8, 2025 3.75 h). No `retainerStartsAt` in v1.
3. **Uninvoiced months — Decided (default).** Pool still consumes them. Library banner on `/reports/saved`: `GET /api/reports/unfiled-retainer-hours` (Phase 5).
4. **Multi-retainer summary card — Decided.** Per project, never `Math.min`.

### IA and navigation

5. **Where utilization lives — Decided (Phase 5).** Reports library (`/reports/saved`); Invoices = payable `INVOICE` only. Existing `RETAINER_REPORT` rows no longer appear on `/invoices`.
6. **Pay stubs — Decided (Phase 6).** `/payroll` + `documentKind: PAY_STUB` (option A).
7. **Data reports persist? — Decided (Phase 5).** Snapshot in the Reports library (`DATA_REPORT`).
8. **Sidebar grouping — Decided.** Stay under **Time Tracking** (Reports, Saved reports, Invoices, Payroll, Backups). No separate Billing section in v1.

### Filters and outputs

9. **Week start — Decided (Phase 1).** Sunday (same as Dashboard). Time Blocks calendar remains Monday.
10. **This Month — Decided (Phase 1).** First of month through today.
11. **Mixed modes — Decided.** Gate incompatible outputs; offer **Split into N documents** as a secondary action. Do not 400 the whole page (Phase 1; Phase 0 only clears the stale preview).
12. **Member filter — Decided (Phase 1).** Yes; empty = all contributors.
13. **Column catalog v1 — Decided (Phase 2).** Full organized groups from the table above. Defaults match the previous timesheet CSV (date, client, project, task, task type, hours, base/effective rate, billed, description). Member and internal $ are opt-in. Unchecking a column hides it from the Time Entries tab, CSV, and PDF appendix; it does not change invoice totals. Earned / margin / running never print on the client PDF.
14. **Contributor names on client PDF** — Opt-in appendix vs never.
15. **Filter presets — Decided (Phase 3).** Server, admin-only, Pattern A `userId`. Named snapshot of clients, projects, billing types, members, date preset (rolling) or custom start/end, columns, and entry options. `kind: REPORT | BACKUP` (workbench saves REPORT; BACKUP used in Phase 4).
16. **Backup v1 — Decided (Phase 4).** Full workspace download + preset-scoped downloads. **Do not store backup blobs in Mongo.**
17. **Backup graph — Decided (Phase 4).** Related graph: selected clients/projects, their project tasks, matching time entries and line items, related invoices, referenced task types, and contributors on those entries.
18. **Full backup completeness — Decided (Phase 4).** Add invoices, filter presets, and workspace users without secrets (no tokens; User model has none).

### Payroll

19. **Pay stub grouping — Decided (Phase 6).** One stub per member for the workbench slice (all selected projects in the date range), not one stub per project.
20. **Pay stub vs invoice period — Decided (Phase 6).** Independent workbench period. Date range is required (All Time is not valid for a stub). Not auto-tied to a just-created invoice.

---

## Phased delivery

| Phase | Scope | Depends on locks |
|-------|--------|------------------|
| **0** | Remaining-hours as-of period end; stop leftover preview on generate error; fix min-pool card. **No IA.** | #1, #4 — **shipped** |
| **1** | Filter rail on `/reports`: grouped Client / Project / Billing type / Date quick sets including All Time; member filter if #12. Mixed-mode gating. | #9–#12 — **shipped** |
| **2** | Column checkboxes + entry options; CSV/PDF honor columns. | #13 — **shipped** |
| **3** | `FilterPreset` CRUD; apply/save from workbench. | #15 — **shipped** |
| **4** | `/backups` screen: full backup + preset backups; expand backup payload. Remove Backup from invoice toolbar. | #16–#18 — **shipped** |
| **5** | `/reports/saved` library; file utilization/budget/data reports there; Invoices lists `INVOICE` only. | #5, #7 — **shipped** |
| **6** | `/payroll` + pay stub preview/persist from workbench. | #6, #19–#20 — **shipped** |
| **7** | Docs pass: ARCHITECTURE, README, `.cursorrules`, billing-modes decided rules. | — **shipped** |

Phase 0 can ship in a session of its own, before the redesign.

---

## Cursor prompt sequence

Use **one phase per PR**. Paste with `askanddeliverwebapp/` and this doc.

### Prompt 0 — Retainer remaining (bugfix)

> Fix HOUR_RETAINER remaining hours so saved and previewed utilization reports subtract only stopped time entries with `startTime` ≤ the report `endDate` (All Time = now). Snapshot `remainingHoursAsOfEnd` / `consumedHoursThroughEnd` on `retainerSummary`. Keep a separately labeled live remaining on the Reports preview if useful. Replace the “Remaining (min pool)” card with per-project remaining. On generate failure, clear or do not keep a stale preview. Follow `docs/REPORTS_WORKBENCH_BUILD_PLAN.md` and `docs/PROJECT_BILLING_MODES_BUILD_PLAN.md`. Do not redesign the Reports layout.

### Prompt 1 — Filter rail

> Rebuild the Reports landing filters into a left rail grouped by Client, Project, Billing type, and Date range. Add quick sets: All Time, This Month, Last Month, This Week, Last Week, Last 7 Days, Last 30 Days. Gate outputs by billing type instead of a hard mixed-mode generate error. Keep existing preview/invoice create working for a single billing type. Follow `docs/REPORTS_WORKBENCH_BUILD_PLAN.md`. No backup screen yet.

### Prompt 2 — Columns

> Add an organized checkbox column catalog on Reports for data-report / CSV / PDF fields. Honor Include entries / Include descriptions. Do not show earned rates on client-facing invoice PDFs.

### Prompt 3 — Filter presets

> Add workspace-scoped filter presets (name + filter/column/entry options). Apply and save from the Reports rail. Admin-only. Pattern A `userId`.

### Prompt 4 — Backups screen

> Add `/backups`: full workspace backup CTA and backup presets (from filter presets). Expand `POST /api/export/backup` as specified. Remove Backup Data from the Reports invoice toolbar. Register the route and sidebar item.

### Prompt 5 — Reports library vs Invoices

> Add `/reports/saved` for non-payable documents. Filter `/invoices` to `documentKind: INVOICE`. Saving a retainer/budget/data report files into the reports library. Stripe still refused for non-INVOICE kinds.

### Prompt 6 — Payroll

> Add `/payroll` and a Pay stub output from the Reports workbench (one member, earned rates × hours, no client rates). Persist as `PAY_STUB` (or agreed collection). Admin-only.

### Prompt 7 — Docs sync

> Update ARCHITECTURE.md, README.md, `.cursorrules`, and billing-modes decided rules to match the shipped workbench, libraries, and remaining-hours formula.

---

## Testing checklist

- [ ] Hourly invoice totals unchanged for a single-mode, single-client slice.
- [ ] Retainer July vs August remaining **differs by August period hours** when generated after both months exist.
- [ ] All Time includes Oct 2025 + 2026 support entries for Battle Sports retainer (or excludes them if lock #2 says so).
- [ ] Mixed hourly + retainer: no blocking error; Invoice disabled; utilization still available for the retainer project.
- [ ] Multi-member hourly slice: invoice total = all members’ billed; member panel sums to the same hours; pay stub for one member ≠ client invoice.
- [ ] CSV and PDF omit unchecked columns; descriptions omit when unchecked.
- [ ] Full backup still downloads; preset backup is smaller and limited to the graph.
- [ ] Members cannot open `/reports`, `/invoices`, `/payroll`, `/backups`.
- [ ] Hard refresh on `/reports`: no 401 burst (`tokenReady`).

---

## Docs to update at implementation time

| File | When |
|------|------|
| This doc | Flip locks; tick phases. **Done (Phase 7).** |
| `PROJECT_BILLING_MODES_BUILD_PLAN.md` | Remaining-hours formula; mixed-mode UX. **Done (Phase 7).** |
| `ARCHITECTURE.md` | Routes, `documentKind`, backup payload, remaining-hours. **Done (Phase 7).** |
| `README.md` | Reports workbench, libraries, backups. **Done (Phase 7).** |
| `.cursorrules` | Filter rail, libraries, remaining as-of-end. **Done (Phase 7).** |
| `PLATFORM_EXPANSION_BUILD_PLAN.md` | Companion table. **Done (Phase 7).** |

---

## Current `/reports` implementation map

| File | Role |
|------|------|
| `client/src/pages/Reports.tsx` | Workbench: rail, preview, tabs, invoice / retainer / data-report / pay-stub save. |
| `client/src/pages/SavedReports.tsx` | Reports library (`/reports/saved`); kind filter; unfiled retainer-hours banner. |
| `client/src/pages/Payroll.tsx` | Pay stub library (`/payroll`). |
| `client/src/components/reports/PayStubPreview.tsx` | Earned-only pay stub PDF (no client rates). |
| `client/src/utils/payStub.ts` | Roll cost-breakdown into earned-only stub lines. |
| `client/src/components/reports/ReportFilterRail.tsx` | Client / project / billing / dates / people / presets / entry options / columns. |
| `client/src/components/reports/ReportColumnCatalog.tsx` | Grouped column checkboxes. |
| `client/src/components/reports/ReportEntriesTable.tsx` | Column-aware entries table (tab + PDF appendix). |
| `client/src/components/reports/ReportFilterPresets.tsx` | Save as / apply / update / delete named filter sets. |
| `client/src/utils/reportColumns.ts` | Column ids, defaults, visibility (strip internal $ on client PDF). |
| `client/src/components/reports/ReportFilters.tsx` | Unused single-select (do not extend). |
| `client/src/pages/Backups.tsx` | Full download + backup presets + download from Reports filter sets. |
| `client/src/components/reports/ExportButtons.tsx` | CSV + print (backup moved to `/backups`). |
| `client/src/components/reports/InvoicePreview.tsx` | Invoice + retainer PDF (rollup tables unchanged by catalog). |
| `client/src/components/reports/MemberContributionsPanel.tsx` | Earned-rate rollup. |
| `server/src/routes/filterPresets.ts` | `FilterPreset` CRUD (`kind` REPORT vs BACKUP). |
| `server/src/models/FilterPreset.ts` | Named filter + column snapshot; Pattern A `userId`. |
| `server/src/routes/export.ts` | Backup (full or `presetId` graph) + CSV (billing type, members, All Time, columns). |
| `server/src/routes/invoices.ts` | Persist preview; default list/stats payable-only; refuse Stripe and SENT on non-INVOICE. |
| `server/src/utils/invoiceKinds.ts` | Payable vs library vs payroll kind matchers. |
| `server/src/routes/reports.ts` | Preview + mixed `compatibleOutputs` including `data_report`; unfiled retainer hours. |
