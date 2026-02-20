# Ask And Deliver — Setup Instructions

Complete setup guide for running the Ask And Deliver time tracking and invoicing system locally.

---

## Step 1: Prerequisites

Ensure you have the following installed:

```bash
# Check Node.js (need v18+)
node --version

# Check npm
npm --version

# Check Git
git --version
```

**Install if missing:**
- Node.js: https://nodejs.org (recommend LTS version)
- Git: https://git-scm.com

---

## Step 2: Clone and Install

```bash
# Clone the repository
git clone https://github.com/misterlinderman/askanddeliverwebapp.git
cd askanddeliverwebapp

# Install all dependencies (root, client, and server)
npm run install:all
```

This runs `npm install` in the root, client, and server directories.

---

## Step 3: Create a GitHub Repository (Optional)

If you want to push to your own repository:

### Option A: GitHub Web Interface
1. Go to https://github.com/new
2. Name your repository (e.g., `ask-and-deliver`)
3. Keep it private or public as preferred
4. **Do NOT** initialize with README, .gitignore, or license (we have these)
5. Click "Create repository"

### Option B: GitHub CLI
```bash
gh repo create ask-and-deliver --private --source=. --remote=origin
```

### Connect and push:
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/ask-and-deliver.git
git push -u origin main
```

---

## Step 4: Configure MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and sign up or log in
2. Create a new project (e.g., "Ask And Deliver")
3. Build a Database — choose the **FREE** tier
4. Create a cluster (default settings are fine)
5. Set up database access:
   - Security → Database Access → Add New Database User
   - Choose Password authentication
   - Save the username and password
6. Set up network access:
   - Security → Network Access → Add IP Address
   - Click "Allow Access from Anywhere" (for development)
7. Get your connection string:
   - Deployment → Database → Connect → Connect your application
   - Copy the connection string
8. The connection string will look like:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/askanddeliver?retryWrites=true&w=majority
   ```
   Replace `USERNAME` and `PASSWORD` with your database user credentials, and set the database name to `askanddeliver`.

---

## Step 5: Configure Auth0

### Create an Application

1. Go to [Auth0](https://auth0.com) and sign up or log in
2. Create a new Application:
   - Applications → Create Application
   - Name: **"Ask And Deliver"**
   - Type: **Single Page Application**
   - Click Create
3. In the application Settings tab, configure:
   - **Allowed Callback URLs:** `http://localhost:5173`
   - **Allowed Logout URLs:** `http://localhost:5173`
   - **Allowed Web Origins:** `http://localhost:5173`
   - Save Changes
4. Note down these values from the Settings tab:
   - **Domain** (e.g., `your-tenant.auth0.com`)
   - **Client ID**

### Create an API

1. Applications → APIs → Create API
2. Name: **"Ask And Deliver API"**
3. Identifier: `http://localhost:3001/api`
4. Click Create

The identifier value becomes your `AUTH0_AUDIENCE`.

---

## Step 6: Configure Cloudinary

Cloudinary handles portfolio image and video uploads.

1. Go to [Cloudinary](https://cloudinary.com) and sign up for a free account
2. From the **Dashboard**, note down:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

That's it — no additional configuration is needed in the Cloudinary console.

---

## Step 7: Set Up Environment Variables

### Copy the template files:
```bash
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env
```

### Configure `client/.env`:
```env
VITE_API_URL=http://localhost:3001/api
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id-from-auth0-settings
VITE_AUTH0_AUDIENCE=http://localhost:3001/api
```

### Configure `server/.env`:
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/askanddeliver?retryWrites=true&w=majority
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=http://localhost:3001/api
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Root `.env` (usually no changes needed):
```env
NODE_ENV=development
```

---

## Step 8: Start Development

```bash
# Start both client and server
npm run dev
```

This will start:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001

You can also run them independently:
```bash
npm run dev:client    # Frontend only
npm run dev:server    # Backend only
```

---

## Step 9: Verify Setup

### 1. Check the public site
Open http://localhost:5173. You should see the Ask And Deliver landing page with navigation to Work (portfolio), About, and Contact pages.

### 2. Test authentication
Click "Login" or navigate to the Dashboard. You'll be redirected to Auth0's login page. After authenticating, you'll land on the Dashboard.

### 3. Set up task types
On your first login, the Dashboard will prompt you to configure task types. Navigate to **Task Types** and either:
- Click "Seed Defaults" to create common task types (Design, Development, Strategy, etc.)
- Or create your own with custom names, hourly rates, and colors

### 4. Create a client and project
- Go to **Clients** → create your first client
- Optionally configure per-task-type discounts for the client
- Go to **Projects** → create a project linked to the client

### 5. Start tracking time
Return to the **Dashboard**. The timer controls will now appear. Select a project and task type, then start the timer.

### 6. Test the public intake form
Navigate to http://localhost:5173/contact and submit a test inquiry. You should see it appear in the **Leads** section of the admin area.

### 7. Customize your theme (optional)
Go to **Site Config** to adjust your brand colors. You can tweak the sage, charcoal, cream, and accent colors, preview changes live, and save named palettes for quick switching.

---

## Step 10: Configure Cursor IDE (Optional)

### Use the `.cursorrules` file
The project includes a `.cursorrules` file that provides context to Cursor's AI about the project structure, conventions, and patterns. It's loaded automatically when you open the project.

### Recommended extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense

---

## Common Issues & Solutions

### "Cannot connect to MongoDB"
- Verify your IP is whitelisted in MongoDB Atlas (Network Access → Allow Access from Anywhere for dev)
- Check the connection string has the correct username and password
- Ensure the database user has read/write permissions
- Make sure the cluster isn't paused (free tier clusters pause after inactivity)

### "Auth0 login redirects to error"
- Verify callback URLs match exactly (no trailing slashes unless you added them)
- Check that `AUTH0_DOMAIN` does **not** include `https://`
- Ensure `AUTH0_AUDIENCE` matches the API identifier exactly on both client and server

### "API returns 401 Unauthorized"
- Make sure you're logged in (check browser console for token errors)
- Verify the `useApiAuth` hook is injecting the token (check Network tab in browser dev tools)
- Confirm `AUTH0_AUDIENCE` is identical in `client/.env` and `server/.env`

### Timer won't start
- You need at least one Task Type and one Project before the timer controls appear
- The Dashboard shows setup prompts if these are missing

### Port already in use
- Kill the process: `lsof -ti:3001 | xargs kill` (macOS/Linux)
- Or change ports in the respective `.env` files and update Auth0 callback URLs to match

### Uploads not working
- Verify your Cloudinary credentials are correct in `server/.env`
- Check that all three Cloudinary variables are set: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Ensure `cloudinary` and `multer` are installed (`npm list cloudinary multer` in the server directory)

---

## Application Workflow

Here's the typical workflow for using Ask And Deliver:

1. **Configure task types** — Set up your billable categories and hourly rates
2. **Add clients** — Create client records with optional per-task-type discounts
3. **Create projects** — Link projects to clients, set budgets, add project tasks
4. **Track time** — Use the live timer, resume a previous entry, or add manual entries from the Dashboard
5. **Add fixed-cost items** — Use the Line Items panel in Reports to add third-party costs (plugins, hosting, subcontractors) as flat-fee charges
6. **Generate invoices** — Use Reports to generate invoices combining time entries and line items with automatic discount calculations
7. **Export data** — Export time entries and line items as CSV for external accounting
8. **Manage leads** — Review intake form submissions, track through your pipeline, convert to clients
9. **Showcase work** — Manage your public portfolio from the Portfolio Admin page (drag-and-drop ordering, publish/feature toggles)
10. **Customize branding** — Use Site Config to adjust theme colors and save named palettes

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development (client + server) |
| `npm run dev:client` | Start only frontend |
| `npm run dev:server` | Start only backend |
| `npm run build` | Build for production |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run install:all` | Install all dependencies |
| `npm run clean` | Remove node_modules and build artifacts |
