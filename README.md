# Bus Driver App

A web app for bus drivers to view their upcoming duty schedule and check where vehicles are parked in the depot. Authentication is handled via Microsoft Entra (Azure AD) SSO — drivers sign in with their existing company account.

## Features

- **SSO via Microsoft Entra** – sign in with any Microsoft organisational or personal account
- **Duty schedule** – weekly view of assigned duties (route, time, bus, start/end stop) with prev/next week navigation
- **Live duty status** – duties are automatically marked as scheduled, active, or completed based on current time
- **Depot map** – visual overview of all buses in the depot with their current status (available / in service / maintenance)
- **Dashboard** – shows the next 3 upcoming duties at a glance
- **Driver assignment** – admins can link any Entra user to a mock driver profile via the admin panel
- **Admin panel** – manage users, assign drivers, view all duties across all drivers, update bus status
- **Theme switcher** – per-user light / dark / system preference, saved to the database
- **Localisation** – per-user language preference (English / German), saved to the database; all UI strings translated

## Tech stack

| Layer | Technology |
|---|---|
| Server | Node.js + Express |
| Auth | MSAL Node (`@azure/msal-node`) |
| Database | SQLite via `better-sqlite3` |
| Templates | EJS |
| Session | `express-session` |

## Project structure

```
src/
├── app.js              – Express entry point
├── auth.js             – MSAL setup + requireAuth / requireAdmin middleware
├── db.js               – SQLite schema, mock data seed, query helpers
└── routes/
    ├── auth.js         – /auth/login, /auth/callback, /auth/logout
    ├── i18n.js         – English / German translation strings
    ├── user.js         – /dashboard, /profile, /settings/theme, /settings/locale
    ├── duties.js       – /duties (weekly schedule)
    ├── depot.js        – /depot, /depot/:id/status
    └── admin.js        – /admin (users + duties management)
views/
├── _header.ejs / _footer.ejs
├── index.ejs           – Landing / login page
├── dashboard.ejs       – Dashboard with upcoming duties widget
├── duties.ejs          – Weekly duty schedule
├── depot.ejs           – Depot map + fleet table
├── profile.ejs         – Edit phone number
├── 403.ejs
└── admin/
    ├── users.ejs       – User list
    ├── edit.ejs        – Edit user + assign driver profile
    └── duties.ejs      – All duties across all drivers
public/
└── style.css
Dockerfile
docker-compose.yml
```

## Mock data

On first start the app seeds the database with:

**5 bus drivers**

| Name | Email |
|---|---|
| Anna Schmidt | anna.schmidt@buscompany.de |
| Thomas Müller | thomas.mueller@buscompany.de |
| Sarah Weber | sarah.weber@buscompany.de |
| Michael Bauer | michael.bauer@buscompany.de |
| Lisa Fischer | lisa.fischer@buscompany.de |

**5 buses** (B-HVG 101 – 105) across depot rows A, B, C

**7 days** of duties from the day the app is first started, with 2–3 duties per driver per day across 5 routes (Linie 7, 8, 15, 23, 42).

## Setup

### 1. Azure App Registration

1. Go to **portal.azure.com → Entra ID → App registrations → New registration**
2. Set **Supported account types** as needed (single tenant or multi-tenant)
3. Add a **Redirect URI** under the **Web** platform: `http://localhost:3000/auth/callback`
4. Under **Certificates & secrets**, create a client secret
5. Note the **Application (client) ID**, **Directory (tenant) ID**, and the secret value

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
AZURE_CLIENT_ID=<application-client-id>
AZURE_CLIENT_SECRET=<client-secret-value>
AZURE_TENANT_ID=<tenant-id-or-common>
SESSION_SECRET=<random-32-byte-hex>
REDIRECT_URI=http://localhost:3000/auth/callback
POST_LOGOUT_REDIRECT_URI=http://localhost:3000

# Comma-separated Entra Object IDs that receive admin access on login
# Your OID is visible on the dashboard after your first sign-in
ADMIN_OIDS=<your-oid>

# Docker only – Docker network name of your reverse proxy
PROXY_NETWORK=proxy
```

Generate a session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use `AZURE_TENANT_ID=common` for multi-tenant / personal Microsoft accounts, or paste in your specific Directory (tenant) ID for single-tenant deployments.

### 3. Install & run

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Assigning drivers to users

Because drivers sign in with their real Entra account (not the mock email addresses), duties must be linked manually:

1. A driver signs in for the first time — their account appears in **Admin → Users**
2. An admin clicks **Edit** on that user
3. Select a driver from the **Assigned driver** dropdown (lists all mock driver profiles)
4. Click **Save** — the driver immediately sees their duties on the dashboard and schedule page

## Localisation

The app ships with **English** (default) and **German** translations. Every user can switch language independently via the **EN | DE** buttons in the nav bar. The preference is saved per user in the database and applied on every page load.

| Feature | Detail |
|---|---|
| Languages | English (`en`), German (`de`) |
| Scope | All UI strings, status labels, date formatting |
| Storage | `users.locale` column (defaults to `en`) |
| Switching | Nav bar toggle → `POST /settings/locale` → page reload |

To add another language, add a new key block to `src/i18n.js` matching the structure of the existing `en` entry, then add the locale code to the allowlist in `src/routes/user.js`.

## Admin access

Add your Entra **Object ID** to `ADMIN_OIDS` in `.env` and restart. Your OID is shown on the dashboard after your first login.

Admin capabilities:

| Area | Actions |
|---|---|
| Users (`/admin`) | View, edit, delete users; assign driver profile |
| All duties (`/admin/duties`) | Read-only table of all 82 duty records across all drivers |
| Depot (`/depot`) | Update bus status via inline dropdown |

## Docker deployment

### Build & run locally

```bash
docker compose up --build
```

### Deploy via Portainer Stacks

1. Create `/opt/busdriver-app/.env` on your server with all variables above, updating the redirect URIs to your domain.
2. In Portainer → **Stacks → Add stack → Repository**
   - URL: your repository URL
   - Compose path: `docker-compose.yml`
3. Load the `.env` file in the **Environment variables** section.
4. Click **Deploy the stack**.

The SQLite database is stored in the `busdriver-data` named volume and persists across restarts and redeployments.

Set `PROXY_NETWORK` to the Docker network name of your reverse proxy (e.g. Nginx Proxy Manager, Traefik) and point its upstream to `busdriver-app:3000`.
