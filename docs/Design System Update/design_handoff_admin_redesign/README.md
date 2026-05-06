# Handoff: Ask & Deliver — Admin Redesign

## Overview
A redesigned admin/internal app for Ask & Deliver — a creative-services time-tracking, invoicing, and planning tool. The redesign tightens information density, replaces the wide top-only nav with a 56px icon rail, modernizes the type and color system, and adds a unified breadcrumb topbar with global search.

Eight screens are included:
1. **Dashboard** — welcome, daily/weekly stats, grouped to-dos by client, inline timer, today's blocks
2. **Time Entries** — dense day-grouped list with task-type dots, durations, billable amounts
3. **Block Time** — week calendar with utilization sidebar and current-time indicator
4. **Invoices** — outstanding/collected stat strip, status badges, aging
5. **Team** — members, roles, invite link
6. **Task Types** — 9 categories with hourly rates and color tokens
7. **Site Configuration** — brand info, palette swatches, live preview, saved palettes
8. **Profile** — user info, account details, raw user data

## About the Design Files
The files in this bundle are **design references** created in HTML/JSX as prototypes — they show the intended look and behavior, not production code to ship verbatim. The task is to **recreate these designs in the existing Ask & Deliver codebase** using its established framework, components, routing, and data layer. If portions of the codebase don't yet exist, use the framework already in play.

The JSX uses inline styles + a single shared `styles.css` purely for prototype convenience. In the real app, port the design tokens to your existing token system and the components to your existing component library.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, layout, and component states are intended as the visual target. Implement pixel-perfect using the codebase's existing libraries; data is illustrative.

## Layout System

### App shell
- Two-column grid: `56px` icon rail + flexible workspace
- Rail: white surface, 1px right border (`--border`), 36×36 rounded items, 18px stroke icons
- Active item: `--green-50` bg, `--green-700` icon, 2px left accent rail
- Topbar: 48px tall, sticky, white surface, 1px bottom border. Left: breadcrumbs (`Workspace / Dashboard`, "/" separator in `--text-4`). Right: search pill (220px min, ⌘K kbd), bell icon button, primary action.
- Workspace: scrolls; content gets `padding: 20px 24px`

### Page header pattern
- Title 20px / 600 / -0.015em letter-spacing
- Subtitle 13px / `--text-3`
- Actions group right-aligned

### Stat strip (replaces big stat cards)
- 4-column grid in a single bordered card, dividers between
- Label: 11px uppercase 0.05em letter-spacing, weight 500, `--text-3`
- Value: 20px JetBrains Mono, weight 600, -0.02em
- Delta line: 11.5px, green for positive, red for negative

## Design Tokens

### Colors (paste these into your token file)
```css
/* Neutrals — slate-tinted */
--bg: #f7f8f7;
--surface: #ffffff;
--surface-2: #fafbfa;
--border: #e5e8e5;
--border-strong: #d2d6d2;
--text: #0f1a14;
--text-2: #4a5550;
--text-3: #7a847e;
--text-4: #a8b0aa;

/* Brand — refined green */
--green-50: #f0f7e8;
--green-100: #dcedc4;
--green-200: #b9db8a;
--green-500: #5fa823;
--green-600: #4f8e1c;  /* primary buttons */
--green-700: #3d6f15;  /* active nav */

/* Functional */
--blue-500: #2e6fdb;   --blue-50:  #e8f0fc;
--amber-500: #d4870a;  --amber-50: #fbf2dd;
--red-500:  #c53030;   --red-50:   #fce8e8;
--purple-500: #6b46c1; --purple-50: #ede5fa;

/* Task-type dots (used in Entries + Task Types) */
--task-admin:       #6b7280;
--task-design:      #3b82f6;
--task-development: #10b981;
--task-meeting:     #f59e0b;
--task-research:    #ef6c00;
--task-strategy:    #8b5cf6;
--task-support:     #ec4899;
--task-testing:     #14b8a6;
--task-fixed:       #06b6d4;
```

### Typography
- Sans: **Inter Tight** (400, 450, 500, 600, 700) with `font-feature-settings: 'cv11', 'ss01'`
- Mono: **JetBrains Mono** (400, 500, 600) with `'tnum'` for numbers
- Body 13px / 1.5
- Small 12.5px / 11.5px for metadata
- Labels 11px uppercase 0.05em
- Stat values use mono with tabular numbers

### Spacing & shape
- Radius: `--radius: 8px`, `--radius-sm: 6px`, `--radius-lg: 12px`
- Shadow-sm: `0 1px 2px rgba(15,26,20,0.04)`
- Shadow: `0 1px 3px rgba(15,26,20,0.06), 0 1px 2px rgba(15,26,20,0.04)`
- Page padding: 20px 24px
- Panel padding: 10px 14px header / 16px body
- Card gap: 16px between major panels, 12px in tighter groups

### Components (used throughout)

**Button**
- Default: 30px tall, 12px padding, 6px radius, `--surface` bg, `--border` border, 12.5px / 500
- Primary: `--green-600` bg + border, white text; hover `--green-700`
- Ghost: transparent, `--text-2`; hover `--bg`
- Sizes: `btn-sm` (26px tall, 12px font), `btn-icon` (30×30 square)
- All icons 14px stroke 2 (Feather-style), inherits color

**Badge / pill**
- 19px tall, 6px padding, 4px radius, 10.5px / 600 / uppercase 0.02em
- Variants: `green` / `blue` / `amber` / `red` / `purple` (each pairs --x-50 bg + --x-500 text)
- Default: `--bg` / `--text-2` with border

**Tabs (segmented control)**
- 3px padding, 7px radius, `--bg` track with border
- Tab: 5px 11px, 5px radius, 12.5px / 500
- Active: `--surface` with shadow-sm
- Optional `.num` suffix (mono 11px) for counts: `All 99`

**Panel**
- White surface, 1px `--border`, 8px radius, overflow hidden
- Header: 10px 14px, `--surface-2` bg, 1px bottom border
- Title: 13px / 600, optional `.count` chip (mono, 11px, bordered)

**Avatar**
- 22×22 circle, gradient fill, white initials 9.5px / 600
- Color variants: `green`, `blue`, `purple`, `amber`, `pink`
- `lg` modifier: 28×28, 11px font

**Input**
- 30px tall, 10px padding, 6px radius, white bg, 1px border
- Focus: `--green-500` border + `0 0 0 3px --green-50` ring

**Dot (task-type indicator)**
- 8×8 circle, used inline before task names

## Screen Specs

### 1. Dashboard
- **Header**: "Welcome back, Matt" + day/active-projects subtitle
- **Stat strip**: Today (0h 00m / Goal 6h) · This week (14h 34m, +12% delta) · Active projects (14, 3 paused) · Outstanding ($1,633)
- **2-col grid** (`1fr 320px`):
  - **Left — To-do panel**: header with tabs (By client / By project / By due) + Filter button. List grouped by client (avatar + name + count chip in `--surface-2` group header). Each task: 18px checkbox + 2-line text (name 13px / 450, project 11.5px muted) + optional "In progress" blue badge + play-icon button. Indent tasks 8px past group header.
  - **Right — Stack**: (a) Active timer panel — uppercase label, 32px mono timer in green when running, 3 selects + textarea + start/pause primary button. (b) Today's blocks — 5 rows, each `time / 3px color bar / label+client`, completed rows 0.55 opacity.

### 2. Time Entries
- **Stat-less** — header + filter row only
- **Filter row**: tabs (All 99 / Unbilled 12 / Billed 87) + Filters + Export buttons
- **Table** (single panel, custom grid `14px 1fr 240px 140px 90px 80px 60px`):
  - Header row in `--surface-2`, 11px uppercase
  - Day separator rows: bold date, mono total, green billable amount
  - Entry rows: task-type dot, task name (13px/500) + description (11.5px muted), project (12px muted), assignee avatar+name, duration (mono right), amount (mono right, green if billable), `B` purple badge for entries from blocks, more menu

### 3. Block Time (calendar)
- **2-col layout**: 220px sidebar + calendar
- **Sidebar**: "Week of May 4" label, "32h / 40h" mono with progress bar, then Calendars list (per-client dot + name + hours), then Other (Personal / Downtime / Meeting)
- **Calendar header**: Today button + prev/next + date range; right: Day/Week/Month tabs
- **Grid**: `48px repeat(5, 1fr)` for time gutter + 5 weekdays. Each row 30px = 1 hour. Day columns separated by `--border`. Blocks absolutely positioned, colored by client, 5px radius, 4px 6px padding, white text 11px / 600 with 10px subtitle.
- **Current time line**: 1px `--green-500` with 7px circle dot at left

### 4. Invoices
- **Stat strip**: Drafts (0) · Outstanding ($1,633.30, 32d aging, amber) · Collected YTD ($4,015.34, green) · Avg time to pay (11 days)
- **Filter row**: tabs (All 9 / Draft 0 / Sent 1 / Paid 8) + client select + search input
- **Table** grid `110px 70px 1fr 220px 170px 120px 110px`:
  - Invoice # (mono 12 / 500), status badge, description, client (avatar + name + company), period (11px mono muted), amount (mono 13 / 600 right), date (11.5px mono muted right)

### 5. Team
- Header + "Add by email" primary
- **Invite link banner**: green tinted (--green-50 bg, --green-200 border) panel with send icon, label, copyable readonly input, Copy button
- **Member table** grid `1fr 120px 90px 80px`: avatar (lg) + name+email, role badge (Admin=green, Member=blue), status badge (Active=green), edit/more icon buttons

### 6. Task Types
- 9 rows in a single panel. Grid `18px 1fr 100px 90px 60px`:
  - 10px task-type dot, name (13.5 / 500), `$N/hr` mono right, "N entries" muted right, settings/more buttons
- Dots use `--task-*` color tokens

### 7. Site Configuration
- 2-col `1fr 320px`
- **Left col stack**: Company information panel (4-input grid: Company name, Email, Phone, Address) + Brand palette panel (2-col: Primary swatches / Surfaces & accents — each row is 36px swatch + label + mono hex)
- **Right col stack**: Live preview (mini website chrome with brand colors applied) + Saved palettes (list with 4-dot palette previews, current marked with check)

### 8. Profile
- Max-width 880px
- Hero panel: 56px circle gradient avatar + name (18/600) + email + role/verified/SSO badges + Change photo button
- Display name panel: muted helper + input + Save primary
- Account details panel: 3-col grid — User ID (mono in inset chip), Nickname, Last updated
- Raw user data panel: dark code block (#0d1916 bg, #86efac green text), 11.5px mono with full Auth0 JSON

## Interactions & Behavior
- **Active timer** (Dashboard): clicking Start → 1s interval, format `HH:MM:SS`, value text turns `--green-600` while running. Pause stops interval but preserves elapsed.
- **Rail item**: hover bg `--bg`, active bg `--green-50` with 2px left accent rail
- **List rows**: hover bg `--surface-2`, cursor pointer, 1px bottom border between rows
- **Tabs**: active state has `--surface` bg + shadow-sm; click switches segment
- **Inputs**: focus shows green ring (`0 0 0 3px --green-50`)
- All transitions 120ms ease for hover, 100ms for backgrounds

## Iconography
The prototype uses Feather-style 24px viewBox icons inlined as SVG (see `shell.jsx` `Icon` component). All have `stroke-width: 1.75`, `stroke-linecap: round`, `stroke-linejoin: round`. Names used: `dashboard, entries, block, reports, invoices, proposals, clients, workspace, projects, leads, portfolio, team, tag, settings, palette, user, play, plus, search, chevdown, chevright, arrowup, arrowdown, clock, timer, pause, filter, download, send, dollar, sparkle, inbox, more, folder, cmd, bell, check, star, flag, pin`.

In your codebase, swap to whichever icon library is already in use (Lucide is Feather-compatible — direct 1:1 swap works for nearly all of these).

## Files in this bundle
- `Revised Admin Design.html` — review index that embeds each screen in its own scrollable iframe
- `styles.css` — all design tokens + component classes
- `shell.jsx` — shared shell: `Icon`, `Avatar`, `Rail`, `Topbar`, `Shell`
- `screens/dashboard.jsx` + `dashboard.html` — Dashboard
- `screens/entries.jsx` + `entries.html` — Time Entries
- `screens/block.jsx` + `block.html` — Block Time calendar
- `screens/invoices.jsx` + `invoices.html` — Invoices
- `screens/team.jsx` + `team.html` — Team
- `screens/tasktypes.jsx` + `tasktypes.html` — Task Types
- `screens/siteconfig.jsx` + `siteconfig.html` — Site Configuration
- `screens/profile.jsx` + `profile.html` — Profile

Open `Revised Admin Design.html` in a browser for the full review experience.

## Implementation Notes for Claude Code
- The icon rail belongs in a top-level layout component shared across all admin routes
- Stat strip is reusable — extract as a component taking an array of `{label, value, delta, deltaColor}` objects
- Panel + panel-header pattern repeats — extract as a `<Panel title="…" headerActions={…}>` wrapper
- Task-type colors should live in your DB or a shared enum, not hard-coded per-component
- The dashboard "active timer" needs to be a global piece of state (probably a context/store) so it persists across route changes — the prototype's local state is illustrative only
- Block-time calendar absolutely-positioned blocks need a real time→y math helper; in the prototype this is `(start - 7) * 30`
