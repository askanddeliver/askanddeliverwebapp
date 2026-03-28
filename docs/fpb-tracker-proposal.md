---
title: FPB Tracker — Fan Pipe Box Assembly Tracking System
proposalNumber: PROP-2026-001
client: JDP Mechanical
project: FPB Tracker
date: 2026-03-28
---

## Introduction

FPB Tracker is a purpose-built web application for JDP Mechanical that tracks approximately 700 Fan Pipe Box assemblies through three sequential stages — Fabrication, Delivery, and Installation. Every assembly gets a unique QR code sticker. Workers scan it on their phone to mark their stage complete. Project managers watch a live dashboard update in real time as scans come in.

The system is designed around JDP's workflow: strict role enforcement means each worker can only perform their own stage, and nothing moves forward until the preceding stage is confirmed. The PM view delivers full visibility — who did what, when, on every unit — with export to CSV for external reporting.

The application is branded to JDP — dark navy palette with gold accents — and built to feel like a JDP product. The field-facing scan screen is optimised for mobile: large touch targets, minimal taps, and fast load times on variable job site signal.

## Challenge

JDP is fabricating, delivering, and installing approximately 700 Fan Pipe Box assemblies across a large commercial project with no system in place to track progress across stages. The project management team has no live visibility into how many units have cleared each stage, and field workers have no structured mechanism to log their work. The existing workflow relied on a shared spreadsheet requiring manual updates — unreliable across a multi-site, multi-trade environment where real-time accuracy directly affects scheduling and coordination.

## Solution

A MERN stack web application gives every stakeholder a role-appropriate interface. Admins import the equipment schedule via CSV or Excel, generate QR codes in batch, and download print-ready Avery 5160 sticker sheets. Fabricators, drivers, and installers scan QR stickers on their phone to mark their stage complete in one tap — no manual entry, no ambiguity. Project managers watch a live dashboard as scans come in, with filtering by floor and stage and full CSV export for downstream reporting.

Role enforcement is strict and server-side: each worker can only perform their permitted stage action, and sequential progression is enforced — a unit cannot be marked Delivered until Fabricated is confirmed. Every scan is logged with a timestamp and worker identity, providing a complete audit trail across all 700 units.

The final phase of this engagement is dedicated to the human side of the rollout — sticker format testing in the field, real-device QA with your team, and a structured onboarding walkthrough for each worker role. Getting the technology right matters; getting your people comfortable and confident with it matters just as much.

## Terms

Work is billed at **$130/hour** against actual hours worked per phase. Invoices are issued at the close of each phase. The total estimate assumes scope remains consistent with this proposal — any scope changes are agreed before additional hours are logged. This proposal is valid for 30 days from the date of issue.

**Assumptions**

- JDP provides the equipment schedule in CSV or Excel format prior to Phase 1 completion
- Auth0 account access is available for development setup; no custom auth system will be built
- This build covers a single active project; the data model supports future multi-project use
- QR sticker printing method is confirmed at kickoff — Avery 5160 PDF assumed; alternative formats may affect Phase 2 scope
- PM dashboard access requires login; shareable unauthenticated links are not in scope
- Onboarding timeline assumes reasonable availability of staff representatives from each role for walkthrough sessions

**Not included in this proposal**

- Email or SMS stage-completion notifications (available as an extension if confirmed at kickoff)
- GPS coordinate capture on scan events (can be added on request)
- Multi-project management UI (architecture supports it; not in scope for this build)
- Ongoing hosting management and infrastructure support post-launch
- Maintenance retainer (available separately)

```proposal-data
{
  "phases": [
    {
      "name": "Phase 1 — Foundation",
      "summary": "Auth, roles, data models, API, import & export, admin interface.",
      "bullets": [
        "Auth0 RBAC configured with five roles: admin, fabricator, driver, installer, pm",
        "Unit, ScanEvent, and Project data models",
        "Full units API — list, create, update, delete, bulk import",
        "CSV/Excel import with auto column mapping and validation",
        "CSV export — all fields, all stage timestamps, worker identities per stage",
        "Admin dashboard — stat cards, floor progress, activity feed, filterable unit table",
        "Equipment import screen wired to live data"
      ],
      "estimatedHours": 18,
      "estimatedCost": 2340,
      "duration": "1–2 weeks"
    },
    {
      "name": "Phase 2 — QR & Scan",
      "summary": "QR generation, mobile scan handler, role enforcement, audit logging.",
      "bullets": [
        "Server-side QR generation — codes embedded at PDF render time, no external storage required",
        "Batch QR generation for all units or by floor",
        "Mobile scan handler — role-aware, one-tap stage confirmation, unit detail display",
        "Server-side sequential stage enforcement — skipping and out-of-role actions rejected at the API",
        "ScanEvent audit log on every successful scan",
        "QR Manager screen — generation status, Avery 5160 sticker preview, PDF download"
      ],
      "estimatedHours": 16,
      "estimatedCost": 2080,
      "duration": "1–2 weeks"
    },
    {
      "name": "Phase 3 — PDF & Live Dashboard",
      "summary": "Print-ready sticker PDF, real-time dashboard, PM read-only view.",
      "bullets": [
        "Puppeteer PDF renderer — Avery 5160 spec, 30 labels per sheet, QR code embedded per label",
        "Live dashboard with real-time updates — filterable by floor, stage, equipment number",
        "Full audit columns — fabricated/delivered/installed by, with timestamps",
        "PM read-only view with live indicator and CSV export",
        "Data export structured for Excel and Power BI ingestion"
      ],
      "estimatedHours": 12,
      "estimatedCost": 1560,
      "duration": "1 week"
    },
    {
      "name": "Phase 4 — Testing, Sticker Iteration & Onboarding",
      "summary": "Field testing, sticker format validation, staff onboarding across all roles.",
      "bullets": [
        "End-to-end use case testing across all five roles — admin, fabricator, driver, installer, PM",
        "Real-device QA on the scan handler under field conditions",
        "Sticker format testing — print quality, scan reliability, adhesion and durability review; iteration if format adjustments are needed",
        "Structured onboarding walkthrough for each worker role — scan flow, login, and what to do if something looks wrong",
        "Admin onboarding — import, QR generation, sticker printing, dashboard, and CSV export",
        "Bug fixes and final adjustments identified during testing"
      ],
      "estimatedHours": 10,
      "estimatedCost": 1300,
      "duration": "1–2 weeks"
    }
  ],
  "investment": {
    "fees": 7280,
    "notes": "Billed at $130/hour against actual hours worked per phase. Invoices issued at phase close. Total timeline: 3–6 weeks. The lower end assumes smooth sticker iteration and staff availability for onboarding; the upper end accounts for format adjustments or scheduling across trades. Estimated monthly infrastructure cost once in production: approximately $15–35/month (Vercel, Railway, MongoDB Atlas, Auth0 — all have free tiers covering development and early production)."
  }
}
```
