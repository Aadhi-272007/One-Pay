# OnePay — Local & Online Server Setup

This project has two parts:

- **Frontend** — React + Vite app (source in `src/`, production build in `dist/`).
- **Backend** — hosted on the Base44 cloud: database (entities), server functions,
  login/auth and file storage. The frontend talks to it over the Base44 API using
  your App ID. You do NOT need to run any database or server yourself.

Your App ID: `6adc65b6a5d2c230a9fbe4b0`

---

## 1. Run on your LOCAL machine

Requirements: Node.js 18+ (https://nodejs.org).

```bash
# 1. Extract this zip and open the folder in a terminal
cd onepay-full-project

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). The `.env` file in the
zip already contains your App ID, so login, data and all features work immediately.

> Note: the first `npm install` can take a few minutes.

---

## 2. Host on YOUR OWN online server (any host: VPS, cPanel, Netlify, Vercel…)

The frontend is a static site — the production build is already included in `dist/`.

### Option A — Static hosting (Netlify, Vercel, Cloudflare Pages, cPanel/htdocs)

1. In `.env`, uncomment and set the server URL so the site can reach the backend:
   ```
   VITE_BASE44_SERVER_URL=https://base44.app
   ```
2. Rebuild if you changed `.env`: `npm install && npm run build`
3. Upload the entire `dist/` folder to your host (for cPanel put it in `public_html`).
4. For an SPA, make all unknown paths serve `index.html`
   (Netlify: add a `_redirects` file in `dist/` with `/*  /index.html  200`;
   Nginx: `try_files $uri /index.html;`).

### Option B — VPS with Node (Nginx + built files)

```bash
npm install && npm run build
# serve dist/ with Nginx (SPA mode) or any static file server
```

### Option C — Single Node command, no Nginx

```bash
npx serve -s dist -l 8080
```

---

## 3. IMPORTANT — Backend data & limits

- Your data, users and backend functions stay on Base44's cloud. This is what makes
  the app "fully functional" anywhere — but it also means the app needs internet
  access to https://base44.app from your local machine or server.
- Login (Google/email), the Gmail sync, calendar sync, AI features and file storage
  all run through that backend and work out of the box.
- Gmail & Google Calendar are connected to the builder's account; syncs act on your
  Base44 app's data.

## 4. Useful commands

| Command          | What it does                       |
| ---------------- | ---------------------------------- |
| `npm run dev`    | Local dev server with hot reload   |
| `npm run build`  | Create production build in dist/   |
| `npm run preview`| Preview the production build locally |
| `npm run lint`   | Check code quality                 |