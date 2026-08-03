# Digest - Personal Bowel Movement Tracker

A personal, single-user bowel movement tracker built with React, TypeScript, and Vite.

## Current Stack

- React + TypeScript + Vite
- React Router
- TanStack Query
- React Hook Form + Zod
- Recharts
- Framer Motion
- Supabase (PostgreSQL + Auth + RLS)

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Start dev server:

```bash
npm run dev
```

## Supabase Setup

1. Create a Supabase project.
2. In Supabase Authentication settings, enable Email provider (email/password).
3. Create your owner account once in Authentication > Users.
3. In your project, run the SQL migration in:

- supabase/migrations/20260803_001_init_bowel_tracker.sql

4. Set environment variables in .env:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_OWNER_EMAIL=you@example.com
```

5. Restart the dev server and sign in with the same owner credentials on every device.

## Data Sync Behavior

- If Supabase environment variables are missing, the app runs local-only.
- If Supabase is configured, the app:
  - requires owner sign-in,
  - hydrates local data from cloud on startup,
  - syncs changes to cloud in the background,
  - mirrors deletions to cloud.

## Notes on Security

- Row Level Security is enabled in SQL migrations.
- Policies isolate data to the current authenticated anonymous user (auth.uid()).
- Use one owner account on every device for a single shared dataset.

## Production Notes

- Use HTTPS only.
- Keep anon key in frontend env only; never expose service role key in client.
- For web hosting, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the deployment environment.

## PWA (Install Prompt + Custom Icon)

- The app now ships with:
  - Web app manifest at public/manifest.webmanifest
  - Custom icons at public/icons/app-icon.svg and public/icons/app-icon-maskable.svg
  - Service worker at public/sw.js
- On supported browsers, an Install app button appears in the top bar when install is available.

## Monitoring

### 1) Uptime Monitoring

- A health endpoint is available at /healthz and returns ok.
- Configure your monitor provider (for example UptimeRobot, Better Stack, or Pingdom) to ping:
  - https://YOUR_DOMAIN/healthz

### 2) Client Error Monitoring

- Optional webhook reporting is available through:
  - VITE_MONITORING_WEBHOOK_URL
- The app reports unhandled window errors and unhandled promise rejections with path, user agent, and timestamp.

## Staging Workflow (Safe Releases)

- netlify.toml now sets:
  - production deploys -> VITE_APP_ENV=production
  - deploy previews + branch deploys -> VITE_APP_ENV=staging
- In the UI, non-production builds show an environment badge.

Recommended flow:

1. Create/use a develop branch for in-progress work.
2. Push develop to GitHub.
3. In Netlify, enable Branch deploys for develop.
4. Test on the develop Netlify URL.
5. Merge develop -> main only when verified.
