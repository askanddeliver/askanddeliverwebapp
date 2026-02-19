# Ask And Deliver — Time Tracking & Invoicing System

A full-featured time tracking, client management, and invoicing application built for freelancers and consultants. Includes a live timer with resume, per-client discount pricing, invoice generation, lead pipeline management, a public-facing portfolio website, and theme customization.

## Features

### Core Time Tracking
- **Live timer** — Start/stop tracking with one click from the Dashboard
- **Resume timer** — Continue tracking from any previous time entry
- **Manual time entry** — Log time after the fact with custom start/end times
- **Quick entry** — Streamlined form for fast time logging
- **Per-project & per-task tracking** — Associate entries with projects, task types, and project tasks

### Client Management & Discount Pricing
- **Client CRUD** — Manage clients with name, company, and email
- **Per-client, per-task-type discounts** — Each client can have a unique discount percentage for each task type (e.g., Design at 50% off, Strategy at 100% off for pro-bono work)
- **Effective rate calculation** — Base rate minus client-specific discount applied automatically

### Project Management
- **Project CRUD** — Create and manage projects tied to specific clients
- **Status tracking** — ACTIVE, PAUSED, COMPLETED, ARCHIVED workflow with status tabs and counts
- **Filtering & search** — Filter by status, client, or search term; sort by date or title
- **Budget tracking** — Optional budget field per project
- **Project tasks** — Break projects into individual tasks with status (TODO, IN_PROGRESS, COMPLETED), drag-and-drop ordering, and estimated hours

### Task Type Configuration
- **Task types** — Define billable categories (e.g., Design, Development, Strategy) with hourly rates and color coding
- **Default seeding** — Pre-populate common task types on first use

### Invoicing & Reports
- **Invoice generation** — Generate invoices with full discount calculations, showing base vs. effective rates
- **Date range filtering** — Filter entries by date range, client, and project
- **Summary statistics** — Overview of total hours, total billed, and effective rates
- **CSV export** — Export time and billing data for external use

### Lead Management
- **Public intake form** — Prospective clients submit project inquiries from the public website
- **Lead pipeline** — Track leads through stages: NEW, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST
- **Priority levels** — LOW, MEDIUM, HIGH priority classification
- **Notes system** — Add internal notes to leads
- **Lead conversion** — Convert a qualified lead directly into a Client and Project

### Public Portfolio Website
- **Portfolio project management** — Create portfolio case studies with title, client, description, categories, disciplines, challenge/solution/results, and testimonials
- **Media uploads** — Upload images and videos (MP4, MOV, WebM) for portfolio projects via Cloudinary
- **Image lightbox** — Full-screen image viewer on public portfolio pages
- **Publish/unpublish** — Control which projects are visible on the public site
- **Featured projects** — Highlight key work on the homepage
- **Drag-and-drop ordering** — Reorder portfolio projects visually
- **Slug-based routing** — Clean URLs for portfolio detail pages

### Site Theme Customization
- **Brand color editor** — Customize all brand colors (sage, charcoal, cream, accent warm/cool) with live preview
- **Color palettes** — Save, load, rename, and delete named color palettes
- **Reset to defaults** — One-click reset to the default color scheme
- **Public API** — Active theme colors are served to the public site automatically

### Authentication & Security
- **Auth0 integration** — Secure login/logout with Auth0 Single Page Application flow
- **Protected routes** — All admin routes require authentication
- **Multi-tenant data isolation** — Every database record is scoped to the authenticated user's ID
- **JWT validation** — Server-side token verification via `express-oauth2-jwt-bearer`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Icons | Lucide React |
| Drag & Drop | dnd-kit |
| Routing | React Router v6 |
| Backend | Express.js + TypeScript |
| Database | MongoDB + Mongoose |
| Authentication | Auth0 |
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
│   │   │   ├── portfolio/        # Portfolio project list, modal, image upload
│   │   │   ├── projects/         # Project cards, list, modal
│   │   │   ├── projectTasks/     # Project task list, modal
│   │   │   ├── public/           # Public layout, navbar, footer, lightbox
│   │   │   ├── reports/          # Invoice preview, report filters, export buttons
│   │   │   ├── taskTypes/        # Task type list, modal
│   │   │   ├── timer/            # Timer display, controls, quick entry
│   │   │   ├── Layout.tsx        # Admin layout shell
│   │   │   ├── Sidebar.tsx       # Admin sidebar navigation
│   │   │   ├── TopBar.tsx        # Admin top bar
│   │   │   ├── Navbar.tsx        # Admin navigation bar
│   │   │   ├── ProtectedRoute.tsx
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
│   │   │   ├── Leads.tsx         # Lead pipeline management
│   │   │   ├── PortfolioAdmin.tsx # Portfolio project management
│   │   │   ├── SiteConfig.tsx    # Theme color customization
│   │   │   └── Profile.tsx       # User profile
│   │   ├── services/
│   │   │   └── api.ts            # Axios API service layer
│   │   ├── hooks/
│   │   │   ├── useApiAuth.ts     # Auth token injection hook
│   │   │   └── usePublicPortfolio.ts
│   │   ├── types/                # TypeScript type definitions
│   │   ├── utils/
│   │   │   └── calculations.ts   # Duration formatting, discount math
│   │   ├── data/
│   │   │   └── portfolioProjects.ts
│   │   └── styles/               # Global styles
│   └── public/
├── server/                       # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── users.ts          # User profile + account deletion
│   │   │   ├── clients.ts        # Client CRUD
│   │   │   ├── projects.ts       # Project CRUD + archive + counts
│   │   │   ├── taskTypes.ts      # Task type CRUD + seeding
│   │   │   ├── timeEntries.ts    # Timer start/stop/continue, manual entry, CRUD
│   │   │   ├── projectTasks.ts   # Project task CRUD + reorder
│   │   │   ├── reports.ts        # Invoice generation + summary
│   │   │   ├── export.ts         # CSV export
│   │   │   ├── portfolio.ts      # Portfolio CRUD + publish/feature
│   │   │   ├── leads.ts          # Lead pipeline + conversion
│   │   │   ├── uploads.ts        # Media upload endpoints (Cloudinary)
│   │   │   ├── siteConfig.ts     # Theme colors + palette management
│   │   │   ├── health.ts         # Health check + detailed status
│   │   │   └── items.ts          # (legacy template route)
│   │   ├── models/
│   │   │   ├── User.ts           # Auth0-linked user profile
│   │   │   ├── Client.ts         # Client with task discount map
│   │   │   ├── Project.ts        # Project with client ref and status
│   │   │   ├── TaskType.ts       # Billable task categories
│   │   │   ├── TimeEntry.ts      # Time records with timer support
│   │   │   ├── ProjectTask.ts    # Project sub-tasks
│   │   │   ├── Lead.ts           # Lead pipeline with notes
│   │   │   ├── PortfolioProject.ts # Portfolio case studies
│   │   │   └── SiteConfig.ts     # Theme colors + saved palettes
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT validation, user ID extraction
│   │   │   └── errorHandler.ts   # Error handling + async wrapper
│   │   ├── config/
│   │   │   ├── database.ts       # MongoDB connection
│   │   │   └── cloudinary.ts     # Cloudinary media upload config
│   │   ├── utils/
│   │   │   └── calculations.ts   # Discount and rate calculations
│   │   └── types/                # TypeScript type definitions
├── docs/
│   └── SHOPIFY_AUTH.md
├── .env.example
├── package.json
├── SETUP.md
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
```

See [SETUP.md](SETUP.md) for detailed MongoDB Atlas, Auth0, and Cloudinary configuration instructions.

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
| `GET` | `/api/health/detailed` | Detailed health check with MongoDB status |
| `GET` | `/api/portfolio/public` | Published portfolio projects |
| `GET` | `/api/portfolio/public/featured` | Featured portfolio projects |
| `GET` | `/api/portfolio/public/:slug` | Portfolio project by slug |
| `GET` | `/api/site-config/public` | Active theme colors |
| `POST` | `/api/leads/public` | Submit intake form |

### Protected Routes (require Auth0 JWT)

#### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/me` | Get current user profile |
| `PUT` | `/api/users/me` | Update current user profile |
| `DELETE` | `/api/users/me` | Delete current user account |

#### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/clients` | List all clients |
| `GET` | `/api/clients/:id` | Get single client |
| `POST` | `/api/clients` | Create client |
| `PUT` | `/api/clients/:id` | Update client |
| `DELETE` | `/api/clients/:id` | Delete client |

#### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects (filters: status, search, sort, clientId) |
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
| `GET` | `/api/time-entries` | List entries (filters: startDate, endDate, projectId) |
| `GET` | `/api/time-entries/active` | Get active timer |
| `POST` | `/api/time-entries/start` | Start timer |
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
| `POST` | `/api/reports/generate-invoice` | Generate invoice with discount calculations |
| `GET` | `/api/reports/summary` | Summary statistics |
| `POST` | `/api/export/csv` | Export data as CSV |

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
| `POST` | `/api/uploads/portfolio/:slug/single` | Upload single file (image or video) |
| `POST` | `/api/uploads/portfolio/:slug` | Upload multiple files (max 10) |
| `GET` | `/api/uploads/portfolio/:slug` | List uploaded files |
| `DELETE` | `/api/uploads/portfolio/:slug/:filename` | Delete uploaded file |

#### Site Config (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/site-config` | Get site configuration |
| `PUT` | `/api/site-config/colors` | Update active theme colors |
| `PUT` | `/api/site-config/reset` | Reset colors to defaults |
| `POST` | `/api/site-config/palettes` | Save current colors as named palette |
| `PUT` | `/api/site-config/palettes/:paletteId` | Rename a saved palette |
| `DELETE` | `/api/site-config/palettes/:paletteId` | Delete a saved palette |

---

## Data Models

### User
Auth0-linked user profile with `auth0Id`, `email`, `name`, and `picture`.

### Client
Client record with `name`, `company`, `email`, and a `taskDiscounts` map — a `Map<string, number>` where each key is a TaskType ID and the value is a discount percentage (0–100).

### Project
Linked to a Client. Tracks `title`, `description`, `status` (ACTIVE / PAUSED / COMPLETED / ARCHIVED), and optional `budget`.

### TaskType
Billable categories (e.g., "Design", "Development") with `name`, `rate` (hourly), and `color`.

### TimeEntry
Time records with `startTime`, `endTime`, `duration` (seconds), and `isRunning` flag for live timer support. Linked to Project, TaskType, and optionally a ProjectTask.

### ProjectTask
Sub-tasks within a Project. Tracks `title`, `description`, `status` (TODO / IN_PROGRESS / COMPLETED), `order`, and `estimatedHours`.

### Lead
Intake form submissions with pipeline management. Tracks `projectType`, `budget`, `timeline`, contact info, `status` (NEW through WON/LOST), `priority`, `notes`, and conversion references.

### PortfolioProject
Case study entries for the public website with `title`, `client`, `description`, `categories`, `disciplines`, challenge/solution/results, `testimonial`, image fields, and publish/feature controls.

### SiteConfig
Per-user theme configuration. Stores `colors` (an object with 10 brand color values: brandSage, brandSageLight, brandSageDark, brandCharcoal, brandCream, brandCreamDark, accentWarm, accentWarmLight, accentCool, accentCoolLight) and `palettes` (an array of named color presets).

---

## Authentication Flow

1. User clicks "Login" on the public site
2. Redirected to Auth0 Universal Login
3. Auth0 authenticates and returns to the app with an access token
4. Frontend stores the token and injects it into all API requests via the `useApiAuth` hook
5. Backend validates the token using `express-oauth2-jwt-bearer`
6. All protected database queries are scoped to the authenticated user's `auth0Id`

---

## Deployment

### Frontend (Vercel / Netlify)
```bash
cd client
npm run build
# Deploy the dist/ folder
```

### Backend (Railway / Render / Fly.io)
```bash
cd server
npm run build
# Deploy with start command: npm start
```

### Production Environment Variables
- Update all URLs from `localhost` to production domains
- Set `NODE_ENV=production`
- Use production MongoDB connection string
- Configure Auth0 callback/logout/web origin URLs for your production domain
- Cloudinary credentials remain the same across environments

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

---

## License

MIT
