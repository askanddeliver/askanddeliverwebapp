---
client: Marco Rutigliano
project: JDP Mechanical: FPB Tracker Web App
date: 2026-03-28
proposalNumber: PROP-2026-001
---

## Introduction

FPB Tracker is a purpose-built web application for JDP Mechanical — a fourth-generation family HVAC/mechanical contractor operating across the New York Metropolitan Area. JDP is fabricating, delivering, and installing approximately 700 Fan Pipe Box assemblies for a large commercial project, and needs a reliable system to track every unit through three sequential stages in real time.

This proposal covers the full design, development, and deployment of that system: a branded, mobile-first tracking application with QR code stickers, role-gated field scanning, and a live PM dashboard — built to feel like a JDP product, not a generic SaaS tool.

## Challenge

JDP currently has no structured system for tracking FPB assemblies across the fabrication-to-installation pipeline. The project management team has no live visibility into how many units have cleared each stage. Field workers — fabricators in the shop, drivers on the road, installers on site — have no mechanism to log progress without manual spreadsheet updates, which are unreliable in a multi-site, multi-trade environment.

The result is a coordination gap: PMs cannot report accurate stage completion, workers cannot confirm handoffs, and there is no audit trail if a unit is lost or a stage is disputed.

## Solution

FPB Tracker resolves this with a lean, purpose-built MERN stack web application. Every assembly gets a unique QR code sticker. Workers scan it on their phone to mark their stage complete — one tap, no manual entry. Project managers watch a live dashboard update in real time as scans come in.

The system is built around JDP's workflow: strict role enforcement means each worker can only perform their own stage, and no stage can be skipped. The admin imports the equipment schedule from the existing CSV/Excel format, generates print-ready Avery 5160 sticker sheets, and has full visibility across all units and all stages. The PM view provides a complete audit trail — who did what, when, on every unit — with CSV export for external reporting.

The application is branded to JDP — dark navy palette with gold/amber accents — and the field-facing scan screen is optimised for mobile: large touch targets, minimal taps, fast load on variable job site signal.

## Terms

All work is billed at $130/hour against actual hours worked per phase. Invoices are issued at the close of each phase. The total estimate of approximately $11,180 assumes scope remains consistent with this proposal. Any scope changes are agreed before additional hours are logged.

This proposal is valid for 30 days from the date of issue. Development begins upon written sign-off and receipt of the equipment schedule and environment credentials.

**Assumptions**

- JDP provides the equipment schedule in CSV or Excel format prior to Phase 1 completion
- Auth0 account access is available for development setup
- This build covers a single active project
- QR stickers are printed via the downloaded Avery 5160 PDF on standard label transfer paper
- PM dashboard access requires login; shareable unauthenticated links are not in scope for this build

**Not included in this proposal**

- Email or SMS stage-completion notifications (available as a Phase 4 extension if confirmed)
- GPS coordinate capture on scan events
- Multi-project management UI
- Shareable unauthenticated PM dashboard link
- Ongoing hosting management and infrastructure support post-launch
- Maintenance retainer (available separately)

```proposal-data
{
  "phases": [
    {
      "name": "Phase 1 — Foundation",
      "summary": "Auth, roles, Unit model, CRUD, CSV/Excel import & export, data table",
      "bullets": [
        "Auth0 RBAC with five roles: admin, fabricator, driver, installer, pm",
        "Unit, ScanEvent, and Project data models",
        "Full CRUD API for unit management",
        "Drag-and-drop CSV/Excel bulk import with auto column mapping and validation",
        "Manual single-unit entry form",
        "Admin dashboard with live stat cards, floor progress chart, and activity feed",
        "CSV export for external reporting"
      ],
      "estimatedHours": 30,
      "estimatedCost": 3900,
      "duration": "2–3 weeks"
    },
    {
      "name": "Phase 2 — QR & Scan",
      "summary": "QR code generation, mobile scan handler, role enforcement, audit log",
      "bullets": [
        "Server-side QR code generation (one unique code per unit)",
        "Avery 5160 sticker sheet PDF — 30 labels per sheet, print-ready download",
        "Mobile-first scan handler — role-aware, one-tap stage confirmation",
        "Sequential stage enforcement at the API level (server-side, not just UI)",
        "ScanEvent audit log — timestamp, worker identity, unit reference"
      ],
      "estimatedHours": 24,
      "estimatedCost": 3120,
      "duration": "1–2 weeks"
    },
    {
      "name": "Phase 3 — PDF & Dashboard",
      "summary": "Puppeteer PDF renderer, live dashboard, PM read-only view, CSV export",
      "bullets": [
        "Puppeteer-rendered Avery 5160 PDF with embedded QR codes",
        "Live dashboard with real-time updates as scans come in",
        "Floor, stage, and date range filters across all views",
        "PM read-only view with full audit trail and live indicator",
        "CSV export with all fields, all stage timestamps, and worker identities"
      ],
      "estimatedHours": 20,
      "estimatedCost": 2600,
      "duration": "1–2 weeks"
    },
    {
      "name": "Phase 4 — Polish",
      "summary": "Notifications, activity log, PWA optimisation, brand styling pass",
      "bullets": [
        "Email or SMS notifications on stage completion (if confirmed in scope)",
        "Full chronological activity log view",
        "PWA optimisation — installable on mobile, offline-tolerant scan handler",
        "Final JDP brand styling pass across all screens",
        "Mobile UX review and real-device testing"
      ],
      "estimatedHours": 12,
      "estimatedCost": 1560,
      "duration": "1 week"
    }
  ],
  "investment": {
    "lineItems": [
      { "item": "Development rate", "amount": "$130 / hour" },
      { "item": "Estimated total hours", "amount": "86 hours" }
    ],
    "subtotal": 11180,
    "total": 11180,
    "notes": "Billed per phase on actual hours worked. Ongoing infrastructure estimated at $15–35/month once in production (Vercel, Railway, MongoDB Atlas, Auth0 — all have free or low-cost tiers covering this scale)."
  }
}
```
