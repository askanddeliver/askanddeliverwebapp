# Block Time — UI/UX design prototype (Claude Design)

This folder is a **standalone visual/UX prototype** for the Block Time feature. It was produced in collaboration with **Claude Design** and is **not** part of the production React app (`askanddeliverwebapp/client/`). Use it as the **interaction and visual target** when implementing the real feature.

## How to view

1. Open `Block Time.html` in a desktop browser (local file is fine; it loads React, ReactDOM, and Babel from a CDN).
2. Scripts load in order: `tweaks-panel.jsx` → `bt-data.jsx` → `bt-calendar.jsx` → `bt-modals.jsx` → `bt-app.jsx`.

> **Note:** The floating **Tweaks** panel (theme: Daylight / Studio / Warm) is for design iteration in Claude Design’s edit mode. The production app should map these ideas to your existing design tokens and settings—not ship the tweaks protocol as-is.

## Files

| File | Role |
|------|------|
| `Block Time.html` | Shell, DM Sans, scrollbar/focus styles, script tags |
| `tweaks-panel.jsx` | Theme panel (design-tool plumbing) |
| `bt-data.jsx` | Sample clients, projects, block kinds, color helpers, grid constants |
| `bt-calendar.jsx` | `WeekView`, `MonthView`, `DayView`, block rendering, resize |
| `bt-modals.jsx` | `CreateModal`, `DetailPopover`, `TimerToast` |
| `bt-app.jsx` | Sidebar, header, `CalHeader`, app state, `App` root |

## UX decisions captured here (align production with this)

- **Client-first colors:** Each client has a fixed color; block fill uses `getBlockColor` → client color when `clientId` is set, else kind color (`KIND_META`). Internal client uses a **neutral** swatch (e.g. slate). Matches the “one color per client for scanability” direction in the product concept.
- **Kind legend + client legend:** Sidebar **Calendars** lists each client (with **Internal** callout) plus fixed colors for **Personal**, **Downtime**, **Meeting**, **Admin** (distinct from work-by-client when no client is attached).
- **Non-work blocks:** `PERSONAL` / `DOWNTIME` clear client + project; **Type** is chosen via **kind pills** (not only radio in the concept doc—same data model).
- **Work / Admin / Meeting:** Show **Client** and **Project**; client `<select>` labels include `(Internal)` where applicable; project disabled until client is chosen.
- **Week + day grid:** `HOUR_START` 7, `HOUR_END` 21, `PX_PER_HR` 64; hour lines + dashed half-hour; **today** column/background tint; **red “now” line** + dot on current day; initial scroll around **8:00** (one hour of padding via `scrollTop = PX_PER_HR`).
- **Block chrome:** Rounded block, optional **kind** pill (non-compact) top-right, title, client name, time range; **compact** mode when block height is small (hides some lines). Bottom **resize** affordance (ns-resize), **15-minute** snap on resize.
- **Month view:** 6×7 grid, out-of-month days muted, up to **3** block chips per day, click day → **day view**.
- **Create modal:** Title, kind pills, conditional client/project, time row (15-minute increments), notes, validation (“End time must be after start time”), primary **Save Block**.
- **Detail popover:** Click-positioned, viewport-clamped, **color band** header with kind + client/project, duration pill, **Start Timer** as primary, **Edit** / **Delete** secondary (delete styled as destructive).
- **Timer affordance (prototype only):** `TimerToast` shows a running state with the block’s color—wire the real app to the **global timer** and `POST /api/time-blocks/:id/launch` per `Internal_Workspace_and_Block_Time_Concept.md`.

## Themes (Daylight / Studio / Warm)

The prototype uses inline **theme objects** (`THEMES` in `bt-app.jsx`: accent, text, border, calendar background, today band, etc.). In production, prefer **CSS variables** or your Tailwind/theme layer so Block Time matches Dashboard/Projects.

## Gaps vs full product spec

The prototype does not include: **recurrence** UI, **filter chips** in the header, **task type** / **project task** fields, **API** integration, **timezone/DST** edge cases, or **member** views. Add those in the app per `Internal_Workspace_and_Block_Time_Concept.md` and [BLOCK_TIME_AND_INTERNAL_WORKSPACE_BUILD_PLAN.md](../BLOCK_TIME_AND_INTERNAL_WORKSPACE_BUILD_PLAN.md).

## Link to build plan

Implementation order and API prompts: [../BLOCK_TIME_AND_INTERNAL_WORKSPACE_BUILD_PLAN.md](../BLOCK_TIME_AND_INTERNAL_WORKSPACE_BUILD_PLAN.md)
