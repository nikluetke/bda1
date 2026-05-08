# lwssoapp

A lightweight Node.js web app with Microsoft Entra (Azure AD) SSO, user profiles, and an admin control panel.

## Features

- **SSO via Microsoft Entra** – sign in with any Microsoft account (personal or org)
- **Auto profile creation** – first login inserts the user into a SQLite database
- **User dashboard** – displays name, email, phone, and join date
- **Profile editing** – users can update their phone number
- **Admin panel** – admins can list, edit, and delete all users

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
    ├── user.js         – /dashboard, /profile
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
└── style.css
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
