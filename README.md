# lwssoapp

A lightweight Node.js web app with Microsoft Entra (Azure AD) SSO, user profiles, an admin control panel, and per-user theme switching.

## Features

- **SSO via Microsoft Entra** – sign in with any Microsoft account (personal or org)
- **Auto profile creation** – first login inserts the user into a SQLite database
- **User dashboard** – displays name, email, phone, and join date
- **Profile editing** – users can update their phone number
- **Theme switcher** – per-user light / dark / system preference, saved to DB
- **Admin panel** – admins can list, edit, and delete all users
- **Docker-ready** – multi-stage image with persistent SQLite volume

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
├── app.js              – Express app entry point
├── auth.js             – MSAL setup + auth/admin middleware
├── db.js               – SQLite schema + query helpers
└── routes/
    ├── auth.js         – /auth/login, /auth/callback, /auth/logout
    ├── user.js         – /dashboard, /profile, /settings/theme
    └── admin.js        – /admin (user management)
views/
├── _header.ejs / _footer.ejs
├── index.ejs           – Landing / login page
├── dashboard.ejs       – User dashboard
├── profile.ejs         – Edit phone number
├── 403.ejs
└── admin/
    ├── users.ejs       – User list table
    └── edit.ejs        – Edit user form
public/
└── style.css           – CSS custom properties, light + dark tokens
Dockerfile
docker-compose.yml
```

## Setup

### 1. Azure App Registration

1. Go to **portal.azure.com → Entra ID → App registrations → New registration**
2. Set **Supported account types** to *Accounts in any organizational directory and personal Microsoft accounts*
3. Add a **Redirect URI** (Web): `http://localhost:3000/auth/callback`
4. Under **Certificates & secrets**, create a client secret

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
AZURE_TENANT_ID=common
SESSION_SECRET=<random-32-byte-hex>
REDIRECT_URI=http://localhost:3000/auth/callback
POST_LOGOUT_REDIRECT_URI=http://localhost:3000

# Comma-separated Entra Object IDs that get admin access
# Find your OID on the dashboard after first login
ADMIN_OIDS=<your-oid>

# Docker only – name of the external network your reverse proxy is on
PROXY_NETWORK=proxy
```

Generate a session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Install & run

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Admin access

Add your Entra **Object ID** (visible on the dashboard after login) to `ADMIN_OIDS` in `.env`, then restart the server. The **Admin** link appears in the nav for admin users.

Admin panel is available at `/admin` and supports:
- Viewing all users
- Editing name, email, phone, and admin flag
- Deleting users (cannot delete yourself)

## Theme switcher

Each logged-in user can choose their preferred appearance via the three buttons in the nav (☀ light / ⊙ system / ☾ dark). The preference is saved per user in the database and applied on every page load without a flash.

## Docker deployment (Portainer)

### Build & run locally with Docker

```bash
docker compose up --build
```

### Deploy via Portainer Stacks

1. SSH into your VPS and create `/opt/lwssoapp/.env` with all variables above, updating the redirect URIs to your domain/IP.
2. In Portainer → **Stacks → Add stack → Repository**
   - URL: `https://github.com/nikluetke/lwssoapp`
   - Compose path: `docker-compose.yml`
3. Load your `.env` file in the **Environment variables** section.
4. Click **Deploy the stack**.

The SQLite database is stored in a named Docker volume (`lwssoapp-data`) and survives container restarts and redeployments.

Set `PROXY_NETWORK` to the name of the Docker network your reverse proxy (e.g. Nginx Proxy Manager, Traefik) uses. Point the reverse proxy upstream to `app:3000`.
