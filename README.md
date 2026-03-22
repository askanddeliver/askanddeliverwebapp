# Ask And Deliver — Time Tracking & Invoicing System

A full-featured time tracking, client management, and invoicing application built for freelancers and consultants. Includes a live timer with resume, per-client discount pricing, profit margin tracking, invoice generation with company branding, lead pipeline management, a public-facing portfolio website, theme customization, data backup/export, and multi-user workspace support with role-based access (admin, member, pending).

## Features

### Core Time Tracking
- **Live timer** — Start/stop tracking with one click from the Dashboard
- **Resume timer** — Continue tracking from any previous time entry (preserves accumulated duration)
- **Manual time entry** — Log time after the fact with custom start/end times
- **Quick entry** — Streamlined form for fast time logging
- **Per-project & per-task tracking** — Associate entries with projects, task types, and project tasks
- **Workspace-scoped entries** — Admins see all workspace entries; members see only their own

### Client Management & Discount Pricing
- **Client CRUD** — Manage clients with name, company, email, business entity, address, and payment preference (ACH or mailed check)
- **Per-client, per-task-type discounts** — Each client can have a unique discount percentage for each task type (e.g., Design at 50% off, Strategy at 100% off for pro-bono work)
- **Effective rate calculation** — Base rate minus client-specific discount applied automatically
- **Invoice-ready client data** — Business entity and address fields populate directly into invoice templates

### Project Management
- **Project CRUD** — Create and manage projects tied to specific clients
- **Status tracking** — ACTIVE, PAUSED, COMPLETED, ARCHIVED workflow with status tabs and counts
- **Filtering & search** — Filter by status, client, or search term; sort by date, title, or budget
- **Budget tracking** — Optional budget field per project
- **Rich-text briefs** — WYSIWYG project brief editor powered by Tiptap (bold, italic, lists, undo/redo)
- **Portfolio-aligned fields** — Projects include excerpt, year, categories, disciplines, challenge, solution, and results fields for seamless conversion to portfolio case studies
- **Archive vs. delete** — Soft-archive projects to hide them, or permanently delete
- **Project tasks** — Break projects into individual tasks with status (TODO, IN_PROGRESS, COMPLETED), drag-and-drop ordering, and estimated hours

### Task Type Configuration
- **Task types** — Define billable categories (e.g., Design, Development, Strategy) with hourly rates and color coding
- **Default seeding** — Pre-populate common task types on first use (Design $75, Development $100, Strategy $125, Meeting $50, Admin $0)

### Invoicing & Reports
- **Invoice generation** — Generate invoices with full discount calculations, showing base vs. effective rates; supports single-client or all-clients mode
- **Company branding** — Company name, address, phone, and email appear in invoice headers (configured in Site Config)
- **Client billing details** — Business entity, address, and payment preference (ACH/mailed check) on invoices
- **Fixed-cost line items** — Add third-party costs (plugins, hosting, subcontractors, etc.) as flat-fee charges on invoices, separate from hourly time entries
- **Profit margin tracking** — Per-member earned rates allow tracking billed amount vs. earned amount per task type, with margin calculations and cost breakdown per entry
- **Date range filtering** — Filter entries by date range, client, and project
- **Summary statistics** — Overview of total hours, total billed, and effective rates
- **CSV export** — Export time entries and fixed-cost line items for external accounting
- **Full data backup** — Export entire workspace as JSON (clients, projects, task types, project tasks, time entries, line items)

### Lead Management
- **Public intake form** — Prospective clients submit project inquiries from the public website with confidence level (YES, MAYBE, UNSURE), project type, budget, timeline, and message
- **Lead pipeline** — Track leads through stages: NEW, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST
- **Pipeline statistics** — Aggregated counts per pipeline stage
- **Priority levels** — LOW, MEDIUM, HIGH priority classification
- **Notes system** — Add timestamped internal notes to leads
- **Lead conversion** — Convert a qualified lead directly into a Client and Project (with conversion tracking)

### Public Portfolio Website
- **Portfolio project management** — Create portfolio case studies with title, client, excerpt, description, categories, disciplines, year, challenge/solution/results, testimonials, and live URL
- **Client logos** — Upload a client logo per portfolio project, displayed on the public detail page
- **Mixed media galleries** — Portfolio images support both images and videos; each media item has a `type` (image/video) and optional `source` (cloudinary/vimeo/youtube)
- **Media uploads** — Upload images (JPEG, PNG, GIF, WebP, SVG) and videos (MP4, MOV, WebM up to 100MB) via Cloudinary
- **Video embeds** — Add videos via Vimeo or YouTube URL (auto-parsed for embed), or direct upload to Cloudinary
- **Image lightbox** — Full-screen image viewer on public portfolio pages
- **Markdown rendering** — Challenge and solution content rendered as Markdown on public detail pages via react-markdown
- **Publish/unpublish** — Control which projects are visible on the public site
- **Featured projects** — Highlight key work on the homepage
- **Drag-and-drop ordering** — Reorder portfolio projects visually
- **Slug-based routing** — Clean URLs for portfolio detail pages
- **Portfolio seeding** — Seed sample portfolio projects from provided data

### Site Theme & Company Configuration
- **Brand color editor** — Customize all brand colors (sage, charcoal, cream, accent warm/cool) with live preview
- **Dynamic CSS variables** — Theme colors generate a full primary-50 through primary-900 scale for the admin UI
- **Color palettes** — Save, load, rename, and delete named color palettes
- **Reset to defaults** — One-click reset to the default color scheme
- **Company info** — Configure company name, address, phone, and email for invoice headers
- **Public API** — Active theme colors are served to the public site automatically

### Team & Workspace
- **Role-based access** — Admin, member, and pending roles control what each user can see and do
- **Workspace model** — Admins own a workspace; members belong to an admin's workspace
- **Add by email** — Admins can add team members by email (requires Auth0 M2M app for lookup)
- **Remove team members** — Admins can remove members from the workspace
- **Invite link** — Share your app URL; new users sign up, then admins add them via email
- **Primary admin** — Set `PRIMARY_ADMIN_EMAIL` in env to ensure the intended owner always has admin (fixes signup-order edge cases)
- **Member permissions** — Members can track time and manage projects; admins manage clients, leads, reports, portfolio, task types, and team
- **Financial privacy** — Members cannot see hourly rates or dollar amounts; only time and descriptions are visible to them
- **Earned rates** — Assign per-task-type earned rates to members for cost/margin tracking on invoices
- **Account deletion** — Users can delete their own account

### Authentication & Security
- **Auth0 integration** — Secure login/logout with Auth0 Single Page Application flow
- **Protected routes** — Admin-only routes redirect non-admins to the dashboard
- **Pending user handling** — New signups see an "Account Pending Approval" message until an admin adds them
- **Multi-tenant data isolation** — Data scoped by workspace (admin + their members)
- **JWT validation** — Server-side token verification via `express-oauth2-jwt-bearer`
- **Token persistence** — Auth tokens stored in localStorage for session persistence across refreshes

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Icons | Lucide React |
| Drag & Drop | dnd-kit |
| Rich Text | Tiptap |
| Markdown | react-markdown |
| Routing | React Router v6 |
| Backend | Express.js + TypeScript |
| Database | MongoDB + Mongoose |
| Authentication | Auth0 (SPA + M2M) |
| File Uploads | Multer + Cloudinary |
| Security | Helmet, CORS |
| Dev Tools | ESLint, Prettier, Nodemon, Concurrently |

---

## Project Structure

```
askanddeliverwebapp/
├── client/                       # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── clients/          # Client cards, list, modal, task discounts
│   │   │   ├── entries/          # Time entry list, row, modal
│   │   │   ├── leads/            # Lead detail modal, convert modal
│   │   │   ├── portfolio/        # Portfolio project list, modal, media upload (images + video embeds)
│   │   │   ├── projects/         # Project cards, list, modal, brief editor (Tiptap)
│   │   │   ├── projectTasks/     # Project task list, modal
│   │   │   ├── invoices/         # Invoice detail, create modal, status badge
│   │   │   ├── public/           # Public layout, navbar, footer, lightbox, portfolio media
│   │   │   ├── reports/          # Invoice preview, filters, export, line items, member contributions
│   │   │   ├── taskTypes/        # Task type list, modal
│   │   │   ├── timer/            # Timer display, controls, quick entry
│   │   │   ├── users/            # User edit modal, add-by-email modal
│   │   │   ├── Layout.tsx        # Admin layout shell (sidebar, topbar, theme)
│   │   │   ├── AdminRoute.tsx    # Admin-only route guard
│   │   │   ├── Sidebar.tsx       # Admin sidebar navigation
│   │   │   ├── TopBar.tsx        # Admin top bar
│   │   │   ├── Navbar.tsx        # Admin navigation bar
│   │   │   ├── ProtectedRoute.tsx # Auth guard (waits for token)
│   │   │   └── Loading.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx          # Public landing page
│   │   │   ├── Work.tsx          # Public portfolio listing
│   │   │   ├── WorkDetail.tsx    # Public portfolio project detail
│   │   │   ├── About.tsx         # Public about page
│   │   │   ├── Contact.tsx       # Public intake/contact form
│   │   │   ├── Dashboard.tsx     # Admin dashboard with timer
│   │   │   ├── Clients.tsx       # Client management
│   │   │   ├── Projects.tsx      # Project management
│   │   │   ├── TaskTypes.tsx     # Task type configuration
│   │   │   ├── TimeEntries.tsx   # Time entry list and management
│   │   │   ├── Reports.tsx       # Invoice generation and reports
│   │   │   ├── Invoices.tsx      # Invoice list, detail, status management
│   │   │   ├── Leads.tsx         # Lead pipeline management
│   │   │   ├── PortfolioAdmin.tsx # Portfolio project management
│   │   │   ├── SiteConfig.tsx    # Theme colors + company info
│   │   │   ├── Users.tsx         # Team management (admin)
│   │   │   └── Profile.tsx       # User profile
│   │   ├── contexts/
│   │   │   ├── ApiAuthContext.tsx # Token lifecycle + readiness flag
│   │   │   ├── UserContext.tsx    # User role/workspace context
│   │   │   └── AdminThemeContext.tsx # Dynamic CSS variable theming
│   │   ├── services/
│   │   │   └── api.ts            # Axios API service layer (auth + public instances)
│   │   ├── hooks/
│   │   │   ├── useApiAuth.ts     # Auth token injection hook
│   │   │   └── usePublicPortfolio.ts
│   │   ├── types/                # TypeScript type definitions
│   │   ├── utils/
│   │   │   ├── calculations.ts   # Duration formatting, discount math, date helpers
│   │   │   └── videoEmbed.ts     # Vimeo/YouTube URL parsing, embed URLs, thumbnails
│   │   ├── data/
│   │   │   └── portfolioProjects.ts
│   │   └── styles/               # Global styles + Tailwind config
│   └── public/
│       └── brand/                # Logo SVGs (header, footer, favicon, standard)
├── server/                       # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── users.ts          # User profile, team management, add-by-email, account deletion
│   │   │   ├── clients.ts        # Client CRUD (with business entity, address, payment pref)
│   │   │   ├── projects.ts       # Project CRUD + archive + counts
│   │   │   ├── taskTypes.ts      # Task type CRUD + seeding
│   │   │   ├── timeEntries.ts    # Timer start/stop/continue, manual entry, CRUD
│   │   │   ├── projectTasks.ts   # Project task CRUD + reorder
│   │   │   ├── reports.ts        # Invoice generation + summary + margin tracking
│   │   │   ├── export.ts         # CSV export + full JSON backup
│   │   │   ├── lineItems.ts      # Fixed-cost line item CRUD
│   │   │   ├── portfolio.ts      # Portfolio CRUD + publish/feature/reorder/seed
│   │   │   ├── leads.ts          # Lead pipeline + notes + conversion
│   │   │   ├── uploads.ts        # Media upload endpoints (Cloudinary)
│   │   │   ├── siteConfig.ts     # Theme colors + palettes + company info
│   │   │   └── health.ts         # Health check + detailed status
│   │   ├── models/
│   │   │   ├── User.ts           # Auth0-linked user with role, workspace, earnedRates
│   │   │   ├── Client.ts         # Client with task discounts, business entity, payment pref
│   │   │   ├── Project.ts        # Project with client ref and status
│   │   │   ├── TaskType.ts       # Billable task categories with rate and color
│   │   │   ├── TimeEntry.ts      # Time records with timer support
│   │   │   ├── ProjectTask.ts    # Project sub-tasks with ordering
│   │   │   ├── LineItem.ts       # Fixed-cost billing items
│   │   │   ├── Lead.ts           # Lead pipeline with notes + conversion tracking
│   │   │   ├── PortfolioProject.ts # Portfolio case studies with media
│   │   │   └── SiteConfig.ts     # Theme colors + palettes + company info
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT validation, extractUserId, requireAdmin, getWorkspaceOwnerId
│   │   │   └── errorHandler.ts   # Error handling + async wrapper
│   │   ├── config/
│   │   │   ├── database.ts       # MongoDB connection
│   │   │   └── cloudinary.ts     # Cloudinary media upload config
│   │   ├── lib/
│   │   │   └── auth0Management.ts # Auth0 Management API (add-by-email lookup)
│   │   ├── utils/
│   │   │   └── calculations.ts   # Discount rate, amount, duration, currency utilities
│   │   └── types/                # TypeScript type definitions
├── docs/
│   ├── SHOPIFY_AUTH.md           # Auth adaptation guide for Shopify embedded apps
│   └── PAYMENT_LINKS_BUILD_PLAN.md  # Build plan for online invoice payment links (Stripe)
├── .env.example
├── package.json
├── SETUP.md
├── ARCHITECTURE.md
└── README.md
```

---

## Prerequisites

- **Node.js 18+** (recommend using nvm)
- **MongoDB Atlas** account (or local MongoDB)
- **Auth0** account (free tier works)
- **Cloudinary** account (free tier works — for portfolio media uploads)
- **Git**
- **Cursor IDE** (recommended)

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/misterlinderman/askanddeliverwebapp.git
cd askanddeliverwebapp

# Install all dependencies (root, client, and server)
npm run install:all

# Copy environment templates
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env

# Configure your .env files (see Environment Variables below)

# Start development
npm run dev
```

The frontend runs at **http://localhost:5173** and the backend at **http://localhost:3001**.

---

## Environment Variables

### Root `.env`
```env
NODE_ENV=development
```

### Client `.env`
```env
VITE_API_URL=http://localhost:3001/api
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=http://localhost:3001/api
```

### Server `.env`
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/askanddeliver?retryWrites=true&w=majority
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=http://localhost:3001/api
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Optional: Primary admin (always gets admin role, fixes signup-order edge cases)
# PRIMARY_ADMIN_EMAIL=your-email@example.com

# Optional: For "Add by Email" — create M2M app in Auth0, authorize read:users
# AUTH0_M2M_CLIENT_ID=
# AUTH0_M2M_CLIENT_SECRET=
```

See [SETUP.md](SETUP.md) for detailed MongoDB Atlas, Auth0, and Cloudinary configuration. For "Add by Email," see [server/AUTH0_M2M_SETUP.md](server/AUTH0_M2M_SETUP.md).

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both client and server in development mode |
| `npm run dev:client` | Start only the frontend (Vite on port 5173) |
| `npm run dev:server` | Start only the backend (Express on port 3001) |
| `npm run build` | Build both client and server for production |
| `npm run start` | Start the production server |
| `npm run install:all` | Install dependencies for root, client, and server |
| `npm run lint` | Run ESLint on both projects |
| `npm run format` | Run Prettier on both projects |
| `npm run clean` | Remove all node_modules and build artifacts |

---

## API Endpoints

### Public Routes (no authentication required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/health/detailed` | Detailed health (MongoDB state, memory usage) |
| `GET` | `/api/portfolio/public` | Published portfolio projects |
| `GET` | `/api/portfolio/public/featured` | Featured portfolio projects |
| `GET` | `/api/portfolio/public/:slug` | Portfolio project by slug |
| `GET` | `/api/site-config/public` | Active theme colors |
| `POST` | `/api/leads/public` | Submit intake form |

### Protected Routes (require Auth0 JWT)

#### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/me` | Get current user profile (auto-creates on first login) |
| `PUT` | `/api/users/me` | Update current user profile |
| `DELETE` | `/api/users/me` | Delete current user account |
| `GET` | `/api/users` | List workspace users (admin only) |
| `POST` | `/api/users/add-by-email` | Add user to workspace by email (admin only) |
| `PUT` | `/api/users/:id` | Update user role/status/earnedRates (admin only) |
| `DELETE` | `/api/users/:id` | Remove user from workspace (admin only) |

#### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/clients` | List all clients |
| `GET` | `/api/clients/:id` | Get single client |
| `POST` | `/api/clients` | Create client (name, company, email, businessEntity, address, paymentPreference, taskDiscounts) |
| `PUT` | `/api/clients/:id` | Update client |
| `DELETE` | `/api/clients/:id` | Delete client |

#### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List projects (filters: status, search, sort, clientId) |
| `GET` | `/api/projects/counts` | Project counts by status |
| `GET` | `/api/projects/client/:clientId` | Projects by client |
| `POST` | `/api/projects` | Create project |
| `PUT` | `/api/projects/:id` | Update project |
| `PUT` | `/api/projects/:id/archive` | Archive project |
| `DELETE` | `/api/projects/:id` | Delete project |

#### Task Types
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/task-types` | List all task types |
| `POST` | `/api/task-types` | Create task type |
| `POST` | `/api/task-types/seed` | Seed default task types |
| `PUT` | `/api/task-types/:id` | Update task type |
| `DELETE` | `/api/task-types/:id` | Delete task type |

#### Time Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/time-entries` | List entries (filters: startDate, endDate, projectId, projectIds, billingStatus) |
| `POST` | `/api/time-entries/by-ids` | Get entries by ID array (for invoice detail) |
| `GET` | `/api/time-entries/active` | Get active timer |
| `POST` | `/api/time-entries/start` | Start timer (auto-stops any running timer) |
| `POST` | `/api/time-entries/stop` | Stop timer |
| `POST` | `/api/time-entries/:id/continue` | Resume a previous entry as new timer |
| `POST` | `/api/time-entries` | Create manual entry |
| `PUT` | `/api/time-entries/:id` | Update entry |
| `DELETE` | `/api/time-entries/:id` | Delete entry |

#### Project Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/project-tasks` | List project tasks (query: projectId) |
| `GET` | `/api/project-tasks/:id` | Get single project task |
| `POST` | `/api/project-tasks` | Create project task |
| `PUT` | `/api/project-tasks/reorder` | Reorder tasks within a project |
| `PUT` | `/api/project-tasks/:id` | Update project task |
| `PATCH` | `/api/project-tasks/:id/status` | Toggle task status |
| `DELETE` | `/api/project-tasks/:id` | Delete project task |

#### Reports & Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reports/generate-invoice` | Generate invoice with discount + margin calculations |
| `GET` | `/api/reports/summary` | Summary statistics |
| `POST` | `/api/export/csv` | Export time entries and line items as CSV |
| `POST` | `/api/export/backup` | Full workspace JSON backup download |

#### Line Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/line-items` | List line items (filters: clientId, projectId, projectIds, startDate, endDate) |
| `POST` | `/api/line-items` | Create fixed-cost line item |
| `PUT` | `/api/line-items/:id` | Update line item |
| `DELETE` | `/api/line-items/:id` | Delete line item |

#### Portfolio (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/portfolio` | List portfolio projects |
| `GET` | `/api/portfolio/:id` | Get single portfolio project |
| `POST` | `/api/portfolio` | Create portfolio project |
| `PUT` | `/api/portfolio/reorder` | Reorder projects |
| `PUT` | `/api/portfolio/:id` | Update portfolio project |
| `PATCH` | `/api/portfolio/:id/publish` | Toggle publish status |
| `PATCH` | `/api/portfolio/:id/feature` | Toggle featured status |
| `POST` | `/api/portfolio/seed` | Seed sample projects |
| `DELETE` | `/api/portfolio/:id` | Delete portfolio project |

#### Leads (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/leads` | List leads (filters: status, priority, search, sort) |
| `GET` | `/api/leads/stats` | Lead pipeline statistics |
| `GET` | `/api/leads/:id` | Get lead detail |
| `PUT` | `/api/leads/:id` | Update lead |
| `POST` | `/api/leads/:id/notes` | Add note to lead |
| `POST` | `/api/leads/:id/convert` | Convert lead to client + project |
| `DELETE` | `/api/leads/:id` | Delete lead |

#### Uploads (Cloudinary)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/uploads/portfolio/:slug/single` | Upload single file (image or video, up to 100MB) |
| `POST` | `/api/uploads/portfolio/:slug` | Upload multiple files (max 10) |
| `GET` | `/api/uploads/portfolio/:slug` | List uploaded files |
| `DELETE` | `/api/uploads/portfolio/:slug/:filename` | Delete uploaded file |

#### Site Config (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/site-config` | Get site configuration |
| `PUT` | `/api/site-config/colors` | Update active theme colors |
| `PUT` | `/api/site-config/reset` | Reset colors to defaults |
| `PUT` | `/api/site-config/company` | Update company info (name, address, phone, email) |
| `POST` | `/api/site-config/palettes` | Save current colors as named palette |
| `PUT` | `/api/site-config/palettes/:paletteId` | Rename a saved palette |
| `DELETE` | `/api/site-config/palettes/:paletteId` | Delete a saved palette |

---

## Data Models

### User
Auth0-linked user profile with `auth0Id`, `email`, `name`, `picture`, and `nickname`. Supports workspace/team model: `role` (admin | member | pending), `status` (active | pending | disabled), `workspaceOwnerId` (admin who owns this user's workspace), `invitedBy`, and `earnedRates` (optional `Record<string, number>` mapping task type IDs to per-member earned rates for margin tracking).

### Client
Client record with `name`, `company`, `email`, `businessEntity` (official entity name for invoices), `address` (for invoices), `paymentPreference` (ACH | MAILED, defaults to MAILED), and a `taskDiscounts` map — a `Map<string, number>` where each key is a TaskType ID and the value is a discount percentage (0–100).

### Project
Linked to a Client. Tracks `title`, `description`, `brief` (rich-text HTML from Tiptap editor), `status` (ACTIVE / PAUSED / COMPLETED / ARCHIVED), and optional `budget`. Includes portfolio-aligned fields for easier conversion to case studies: `excerpt`, `year`, `categories`, `disciplines`, `challenge`, `solution`, and `results` (string array).

### TaskType
Billable categories (e.g., "Design", "Development") with `name`, `rate` (hourly), and `color`.

### TimeEntry
Time records with `startTime`, `endTime`, `duration` (seconds), and `isRunning` flag for live timer support. Linked to Project, TaskType, and optionally a ProjectTask. Duration accumulates across pause/resume cycles.

### ProjectTask
Sub-tasks within a Project. Tracks `title`, `description`, `status` (TODO / IN_PROGRESS / COMPLETED), `order` (for drag-and-drop), and `estimatedHours`.

### LineItem
Fixed-cost billing entries for non-hourly charges. Linked to a Client and optionally a Project. Tracks `description`, `amount`, `category` (e.g., Software/Plugin, Hosting, Subcontractor), and `date`. Included alongside time entries in invoices and CSV exports.

### Lead
Intake form submissions with pipeline management. Captures `confidence` (YES / MAYBE / UNSURE), `projectType`, `budget`, `timeline`, contact info (`name`, `email`, `company`, `message`), `description`, pipeline `status` (NEW through WON/LOST), `priority`, timestamped `notes` (with `createdBy`), and conversion references (`convertedClientId`, `convertedProjectId`).

### PortfolioProject
Case study entries for the public website with `slug`, `title`, `client`, `excerpt`, `description`, `categories`, `disciplines`, `year`, `featuredImage`, `clientLogo`, `images` (url, caption, type: image/video, source: cloudinary/vimeo/youtube), `challenge`, `solution`, `results` (string array), `testimonial` (quote, author, role), `liveUrl`, `color`, `order`, and `published`/`featured` controls.

### SiteConfig
Per-user configuration. Stores `colors` (8 brand color values: brandSage, brandSageLight, brandSageDark, brandCharcoal, brandCream, brandCreamDark, accentWarm, accentCool), `palettes` (array of named color presets), and company info (`companyName`, `companyAddress`, `companyPhone`, `companyEmail`) used in invoice headers.

---

## Authentication Flow

1. User clicks "Login" on the public site
2. Redirected to Auth0 Universal Login
3. Auth0 authenticates and returns to the app with an access token
4. Frontend stores the token in localStorage and injects it into all API requests via the API auth context
5. Backend validates the token using `express-oauth2-jwt-bearer`
6. `GET /api/users/me` auto-creates the user record on first login, syncing Auth0 profile data
7. Role assignment: `PRIMARY_ADMIN_EMAIL` match → admin; first user in DB → admin; all others → pending
8. Pending users see "Account Pending Approval" until an admin adds them to the workspace
9. Protected data is scoped by workspace (admin + their members) via `getWorkspaceOwnerId`

---

## Deployment

The application is deployed as two separate services:

### Frontend — Vercel
- **Live at**: [https://www.askanddeliver.com](https://www.askanddeliver.com)
- **Source**: `client/` directory (set as Vercel root directory)
- **Framework**: Vite (auto-detected)
- **Build command**: `npm run build` → outputs to `dist/`
- **SPA routing**: `client/vercel.json` rewrites all paths to `index.html`
- **Security headers**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **Asset caching**: Vite-hashed assets served with `Cache-Control: public, max-age=31536000, immutable`

### Backend — Railway
- **Source**: `server/` directory
- **Runtime**: Node.js with `npm start` (`node dist/index.js`)
- **CORS**: `CLIENT_URL` env var supports comma-separated origins (e.g., `https://askanddeliver.com,https://www.askanddeliver.com`)

### Production Environment Variables

**Vercel (client)**:
```env
VITE_API_URL=https://<your-railway-url>/api
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-production-client-id
VITE_AUTH0_AUDIENCE=https://<your-railway-url>/api
```

**Railway (server)**:
```env
NODE_ENV=production
CLIENT_URL=https://askanddeliver.com,https://www.askanddeliver.com
MONGODB_URI=<production connection string>
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://<your-railway-url>/api
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
PRIMARY_ADMIN_EMAIL=your-email@example.com
```

**Auth0** — Add production URLs to Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins (keep `http://localhost:5173` for local dev).

### DNS (Network Solutions → Vercel)
| Type | Host | Value |
|------|------|-------|
| A | `@` | Vercel IP (shown in Vercel Domains settings) |
| CNAME | `www` | Vercel DNS target (shown in Vercel Domains settings) |

---

## Troubleshooting

### MongoDB Connection Issues
- Ensure your IP is whitelisted in MongoDB Atlas (Network Access)
- Verify username/password in the connection string
- Check that the cluster is active and not paused

### Auth0 Issues
- Callback URLs must match exactly (including trailing slashes)
- The `AUTH0_DOMAIN` should not include `https://`
- The `AUTH0_AUDIENCE` must match the API identifier on both client and server

### Port Conflicts
- Kill existing processes: `lsof -ti:3001 | xargs kill` (macOS/Linux)
- Or change ports in the respective `.env` files and update CORS/callback URLs

### Timer Not Starting
- Ensure at least one Task Type and one Project exist before starting the timer
- The Dashboard displays setup prompts if these are missing

### Uploads Not Working
- Verify your Cloudinary credentials are correct in `server/.env`
- Check that all three Cloudinary variables are set: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Ensure `cloudinary` and `multer` are installed (`npm list cloudinary multer` in the server directory)

### "Add by Email" Fails
- Ensure `AUTH0_M2M_CLIENT_ID` and `AUTH0_M2M_CLIENT_SECRET` are set in `server/.env`
- Follow [server/AUTH0_M2M_SETUP.md](server/AUTH0_M2M_SETUP.md) to create a Machine-to-Machine app with `read:users` permission
- The user must have signed up in Auth0 first (share the invite link; they create an account, then you add them)

### Date Filters Off by One Day
The server runs in UTC (Railway). If date range results appear shifted by a day, the date boundaries are not being converted to the user's local timezone before querying.
- **Frontend must send UTC-adjusted bounds**: use `toUTCStartOfDay(dateStr)` / `toUTCEndOfDay(dateStr)` from `client/src/utils/calculations.ts` before passing dates to any API call
- **Server must parse with**: `parseDateStart()` / `parseDateEnd()` from `server/src/utils/calculations.ts` — never use raw `new Date(dateStr + 'T00:00:00')` in route handlers
- **Date-only fields** (e.g. `LineItem.date`) should also be stored via `parseDateStart()` so queries and storage use consistent boundaries
- **Default date helpers** (`getTodayString`, `getDaysAgoString`) must use local date components, not `.toISOString().split('T')[0]` which silently converts to UTC

### GET Request with Large Array Params Returns 500
Express uses the `qs` library for query string parsing with a default `arrayLimit` of 20. When a GET request sends more than 20 array items (e.g. `projectIds[]=...`), `qs` silently converts the array to a plain object. Code that calls `.split()` or uses `Array.isArray()` will fail.
- Any route accepting array query params must handle three shapes: array (`Array.isArray()`), string (`typeof === 'string'`), and object (`typeof === 'object'` → use `Object.values()`)
- See `timeEntries.ts` and `lineItems.ts` for the reference pattern
- POST routes with JSON bodies are not affected

---

## License

MIT
