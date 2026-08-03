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
