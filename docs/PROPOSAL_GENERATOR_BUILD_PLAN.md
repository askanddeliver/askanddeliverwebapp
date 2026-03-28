# Admin Proposal Generator — Build Plan

This document describes a build plan for an **admin-only proposal generator** in Ask And Deliver. The goal is to replace ad-hoc document creation in external AI chat tools with a **branded, repeatable, exportable** proposal workflow inside the app: fixed structure, consistent typography and logo, optional client-specific accent colors, and **markdown import** to seed body content.

---

## Table of Contents

1. [Overview](#overview)
2. [UX Parity With Saved Invoices](#ux-parity-with-saved-invoices)
3. [Document Structure (Template)](#document-structure-template)
4. [Alignment With Existing App Patterns](#alignment-with-existing-app-patterns)
5. [Markdown Import Strategy](#markdown-import-strategy)
6. [Rendering & PDF (On Demand)](#rendering--pdf-on-demand)
7. [Data Model & Persistence](#data-model--persistence)
8. [Backend & API Sketch](#backend--api-sketch)
9. [Frontend Implementation Sketch](#frontend-implementation-sketch)
10. [Branding: Logo, Font, Colors](#branding-logo-font-colors)
11. [Security & Access](#security--access)
12. [Testing Checklist](#testing-checklist)
13. [Phased Delivery](#phased-delivery)
14. [Optional Enhancements](#optional-enhancements)

---

## Overview

### Problem

Proposals drafted in browser-based LLM tools are hard to keep **on-brand** (headers, footers, fonts, logos) and **structured** (same sections every time). Copying into Word or Google Docs adds friction.

### Target State

- **Standalone admin route `/proposals`** (sidebar + `App.tsx` route), same tier as Invoices—not nested under Reports.
- Proposals are **persisted records** in MongoDB (like **saved invoices**): list, filter, open a selected record, edit, save—**not** a one-off preview-only tool.
- **Live preview** while editing; **PDF is generated only when you choose**, after the proposal is **finalized** and ready to send to the client (see [UX Parity With Saved Invoices](#ux-parity-with-saved-invoices)).
- **Branding**: Ask And Deliver SVG logo, **Bitter** for headings/body (consistent with public site), **contact block** from existing company settings.
- **Accent theming**: pick a **color scheme** per proposal—reuse workspace **Site Config palettes** or a small set of proposal presets (client “feel” without changing global admin theme).
- **Markdown import**: upload or paste `.md` to populate narrative sections; structured fields (tables, totals) can stay in the UI or be parsed from fenced blocks.

### Non-Goals (Initial Release)

- Client-facing proposal acceptance e-signatures (future).
- Real-time collaborative editing (Google Docs–style).
- Full WYSIWYG rivaling desktop publishing; favor **clear templates** over infinite layout freedom.

---

## UX Parity With Saved Invoices

**Intent:** The proposals experience should feel like **Invoices** today: workspace-scoped saved documents with a **list view**, **filters**, and a **detail experience** for one record at a time.

| Invoices (current) | Proposals (target) |
|--------------------|-------------------|
| `/invoices` | `/proposals` |
| `invoicesApi.getAll` + stats, status tabs, client filter, search | Same pattern: `proposalsApi.getAll`, optional stats (draft vs finalized counts), client filter, search by title / client |
| List row → opens `InvoiceDetail` (modal with actions) | List row → opens `ProposalDetail` (same **modal + overlay** pattern, or full-page detail—team choice; modal matches Invoices) |
| Invoice saved with `companyInfo` / `clientInfo` snapshots | Snapshot `companyInfo` and **client** (and optional project) fields at save/finalize so shared PDFs stay stable if CRM data changes |
| `DRAFT` → `SENT` → `PAID` | `DRAFT` while composing; **`FINALIZED`** when ready to share (see below). No payment stage required. |
| Print / PDF from the saved invoice preview | **After finalize:** explicit **“Download PDF”** / print (browser Save as PDF), same technical approach as `InvoicePreview` |

### Status: draft vs finalized

- **`DRAFT`** — Work in progress. Save as often as needed. Preview allowed; **PDF export is optional** (product choice: allow print in draft for internal review, or gate PDF until finalized).
- **`FINALIZED`** — Author marks the proposal complete and client-ready. This is the natural moment for **Generate PDF** → save file → email or attach. Optional: `finalizedAt` timestamp; optional rule that only finalized proposals show the primary “client PDF” action for clarity.

**Unlock:** Decide whether `FINALIZED` can revert to `DRAFT` for edits (simple) or require duplicate (stricter audit).

---

## Document Structure (Template)

A single proposal document is assembled from **fixed sections** (order stable). Suggested mapping:

| Section | Purpose | Primary source |
|--------|---------|----------------|
| **Header (every page or first page)** | Logo, optional tagline | Static + `/brand/logo-header.svg` (or `logo-standard.svg` if preferred) |
| **Footer (every page)** | Company name, phone, email, site, page numbers | `SiteConfig` company fields + optional URL from config |
| **Cover / Introduction** | Client name, project title, date, 1–2 paragraph intro | Form fields + markdown body |
| **Challenge & solution** | Problem statement + synopsis of approach | Markdown (two subheadings) or two rich text fields |
| **Phase breakdown** | Numbered phases, scope bullets | Structured list in UI (array of `{ title, description, bullets[] }`) or parsed from MD |
| **Costing & timeline** | Table: phase, deliverables summary, cost, start/end or duration | Structured rows in UI (recommended for math/totals); optional MD table import |
| **Investment** | Subtotal, optional fees, **total**, payment framing | Form + computed total |
| **Terms** | Short legal / engagement terms | Markdown or saved snippet template |

**Pagination:** Introduction may stand alone as “page 1”; subsequent sections should **break cleanly** (CSS `break-inside: avoid` on section blocks and table headers repeated via `thead` in print CSS).

---

## Alignment With Existing App Patterns

| Existing piece | Reuse for proposals |
|----------------|---------------------|
| `InvoicePreview` + `print:` classes | Same **preview → browser print → Save as PDF** pattern for v1 if server PDF is deferred |
| `SiteConfig` (`companyName`, `companyAddress`, `companyPhone`, `companyEmail`) | Header/footer contact block |
| `SiteConfig.palettes[]` + `colors` | Proposal **accent** picker (apply CSS variables scoped to proposal preview root only) |
| `Client` / `Project` models | Link proposal to `clientId`, optional `projectId`; pre-fill names |
| `AdminRoute` + sidebar | New nav item, admin-only; **standalone** `/proposals` next to Invoices |
| `Invoices.tsx` + `InvoiceDetail` | **Template for** list layout, selection state, modal detail, print visibility (`print:hidden` on chrome) |

Key files likely touched later:

| Layer | Files (illustrative) |
|-------|----------------------|
| Server | New `server/src/models/Proposal.ts`, `server/src/routes/proposals.ts`, `server/src/index.ts` mount |
| Client | `client/src/pages/Proposals.tsx` (list + filters, mirrors `Invoices.tsx`), `client/src/components/proposals/ProposalDetail.tsx` (mirrors `InvoiceDetail` responsibilities), preview components, `api.ts`, `types`, `App.tsx` route `/proposals`, `Sidebar.tsx` |
| Assets | `client/public/brand/*.svg` (already present) |

---

## Markdown Import Strategy

### Recommended: Hybrid Model

1. **YAML frontmatter** (optional) for machine fields:

   ```yaml
   ---
   client: Acme Corp
   project: Website Redesign
   date: 2026-03-28
   ---
   ```

2. **Body** uses **named sections** via level-2 headings matching the template:

   - `## Introduction`
   - `## Challenge`
   - `## Solution`
   - `## Phases` (optional: parse lists)
   - `## Investment` (optional)
   - `## Terms`

3. **Phases table:** Either:
   - **A)** Keep phases/costing **out of MD** and only use MD for narrative blocks (simplest, fewer parse bugs), or  
   - **B)** Support a **fenced code block** with strict JSON for phases/rows, e.g. ` ```proposal-data` … ` ``` `.

**Import UX:** “Import markdown” button → parse → map into React state → user adjusts in form + preview before save.

**Libraries:** Use a single MD pipeline (e.g. `remark` + `remark-gfm` for tables) or `markdown-it` with GFM. Sanitize HTML output if rendering to DOM (`rehype-sanitize`).

---

## Rendering & PDF (On Demand)

**Product flow:** Saving persists the proposal (like an invoice). **PDF is not the save mechanism**—the user generates a PDF **when the proposal is finalized** and ready to hand to the client (download → attach to email, etc.), matching the mental model of opening a **saved** invoice and printing when needed.

### Option A — Client-Side Print PDF (Fastest MVP, matches Invoices)

- Build proposal as a dedicated **print-scoped** React tree (like `InvoicePreview` inside `InvoiceDetail`).
- From **finalized** (or always-available) detail view: **Download PDF** opens print dialog / Save as PDF via `@media print`.
- **Pros:** No new server deps, identical operational pattern to invoices today.  
- **Cons:** Font loading (Typekit) and margins vary by browser; less control than server PDF.

### Option B — Server-Side PDF (Puppeteer / Playwright)

- Admin triggers **POST** `/api/proposals/:id/pdf` after finalize → PDF buffer returned.
- **Pros:** Consistent output, repeatable for attachments.  
- **Cons:** Hosting complexity, font embedding, Auth0/HTML auth story for render URL.

### Option C — `@react-pdf/renderer` or similar

- PDF layout in React components not tied to DOM print CSS.  
- **Pros:** Deterministic PDF.  
- **Cons:** Second layout system to maintain; Bitter must be registered as font in the PDF layer.

**Recommendation:** Ship **Option A** for v1 aligned with invoices; add **Option B or C** if browser PDF quality or automation becomes a bottleneck.

---

## Data Model & Persistence

### New `Proposal` model (sketch)

- `userId` (workspace owner, Pattern A like other entities)
- `clientId` (required), `projectId` (optional)
- `title` (e.g. “Proposal — Website Redesign”)
- `proposalNumber` (optional, invoice-style `PROP-2026-001` if desired)
- `status`: `DRAFT` | `FINALIZED` (optional: `ARCHIVED`)
- `finalizedAt?: Date`
- `paletteId` or embedded **accent snapshot** (hex values at save time so old PDFs don’t shift if palette edits)
- `companyInfo` / `clientInfo` (snapshots, same idea as `Invoice`—stability for PDFs)
- **Structured:**
  - `introduction` (string, markdown or HTML stored—prefer markdown source + render cache if needed)
  - `challenge`, `solution`
  - `phases[]`: `{ name, summary, bullets[], estimatedCost?, startDate?, endDate? }`
  - `investment`: `{ lineItems[], subtotal, total, notes }`
  - `terms` (markdown)
- `sourceMarkdown` (optional original import for re-import/debug)
- `createdAt`, `updatedAt`

Versioning (optional later): `revision` number or history collection.

---

## Backend & API Sketch

All routes: `checkJwt` + `requireAdmin`, scoped by `getWorkspaceOwnerId`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/proposals` | List workspace proposals |
| POST | `/api/proposals` | Create |
| GET | `/api/proposals/:id` | Read |
| PATCH | `/api/proposals/:id` | Update |
| DELETE | `/api/proposals/:id` | Soft-delete or hard-delete (product decision) |
| POST | `/api/proposals/parse-markdown` | Optional: parse MD → JSON draft (or parse only on client) |
| PATCH | `/api/proposals/:id/status` | Optional dedicated endpoint: `DRAFT` ↔ `FINALIZED` (or use generic PATCH) |
| POST | `/api/proposals/:id/pdf` | Optional later: server-generated PDF stream |

---

## Frontend Implementation Sketch

1. **`Proposals.tsx` (list):** Same overall shape as `Invoices.tsx`—heading, optional stat cards (draft / finalized counts), status tabs, client filter, search, scrollable list; clicking a row sets `selectedProposal`.
2. **`ProposalDetail.tsx`:** Modal (or route) containing edit form + **Preview** + actions: **Save**, **Mark finalized** (or toggle status), **Import markdown**, **Download PDF** (print). Mirror `InvoiceDetail` patterns for close/update/delete callbacks and `print:hidden` on app chrome so only the document prints.
3. **Components:**
   - `ProposalPrintRoot` — wraps content with CSS variables from selected palette.
   - `ProposalHeader` / `ProposalFooter` — logo + contact.
   - `ProposalPhaseTable` — accessible table, print styles.
4. **Routing:** `App.tsx` — `/proposals` with `Layout` + `ProtectedRoute` + `AdminRoute`; **Sidebar** link adjacent to Invoices.

---

## Branding: Logo, Font, Colors

- **Logo:** Use existing public assets, e.g. `client/public/brand/logo-header.svg` (same as `InvoicePreview`).
- **Bitter:** Loaded via Adobe Typekit in `client/index.html` (`use.typekit.net/kgb8mhb.css`). For **print/PDF reliability**, validate that printed output includes Bitter; if not, add **Google Fonts Bitter** as fallback in proposal print scope only, or embed in server PDF path.
- **Colors:** Scope variables to `[data-proposal-theme]` on the preview root; map `brandSage` / `accentWarm` / etc. from selected `SiteConfig` palette or proposal-only presets so the rest of the admin UI unchanged.

---

## Security & Access

- Admin-only (same as invoices/reports).
- Proposals may contain **confidential** client text—no public routes.
- Markdown import: **sanitize** rendered HTML; reject oversized uploads (size limits on server if upload endpoint added).

---

## Testing Checklist

- [ ] Create/edit/save proposal linked to client and optional project (persisted reload).
- [ ] List + filter behavior comparable to invoices; open detail from row.
- [ ] Finalize flow; PDF/print from detail when ready to share.
- [ ] Switch palette; preview updates; exported print reflects colors.
- [ ] Import sample markdown; sections map correctly; malformed MD shows actionable errors.
- [ ] Print preview: logo visible, footer repeats, tables don’t split awkwardly (spot-check Chrome/Safari).
- [ ] Workspace isolation: second workspace cannot read proposals.

---

## Phased Delivery

| Phase | Scope |
|-------|--------|
| **1** | Read-only preview component + static mock data (design validation). |
| **2** | CRUD API + **`Proposals` list + `ProposalDetail`** (invoice-like); snapshots; status draft/finalized; **on-demand** print-to-PDF from detail; SiteConfig company info; logo + Bitter. |
| **3** | Markdown import + section mapping; palette picker. |
| **4** | Server-generated PDF (if required); email/share link (optional). |

---

## Optional Enhancements

- **Snippet library:** reusable Terms / Investment boilerplate per workspace.
- **Duplicate proposal** from previous job.
- **Pull project tasks** as draft phase bullets from `projectTasks`.
- **Convert accepted proposal** to project milestones or line-item templates (future integration).

---

## Open Decisions (Product)

1. Store proposal body as **markdown source** vs **JSON blocks** only (hybrid recommended above).
2. **v1 export:** browser print only vs immediate investment in server PDF (default: **browser print**, same as invoices).
3. **Proposal numbering:** optional `PROP-YYYY-NNN` mirroring invoice numbers.
4. **PDF in `DRAFT`:** allow internal print, or **only after `FINALIZED`** (recommended for a clear “client pack” action).

**Decided:** Standalone **`/proposals`** route; **saved-record workflow** like invoices; **PDF generated on demand** when ready to share (typically after finalize).

Once remaining items are decided, implementation tickets can be cut per phase.
