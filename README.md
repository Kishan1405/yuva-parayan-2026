# Yuva Parayan 2026 — Event Companion App

Mobile-first web app for Yuva Parayan 2026 (7–9 August 2026). Built with Next.js
(App Router) + Tailwind CSS + Supabase.

Everyone signs up with name, contact number, and Mandal. There's no password —
the browser holds a private device token that identifies the account (see
"How login works" below).

## Modules (user side, phase 1)

- **Onboarding** — signup (name, contact, Mandal)
- **Home** — greeting, event countdown/day, quick links, "your seva" card
- **Departments** — Sangeet, Sabha Vyavastha, Parayan Pujan, Prasad — in-charge
  list, members, task checklist
- **Reflect** — per-day feedback form (unlocks on that day) + a shared public
  wall for memories/values gained
- **Past Memories** — photo gallery pulled live from a Google Drive folder
- **Profile** — view/edit your own details

Admin module (editing departments, tasks, questions, Mandals) is phase 2 — not
built yet. Until then, edit that content directly in the Supabase table editor.

## One-time setup

### 1. Supabase (accounts, departments, feedback, wall)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql) —
   this creates all tables, RLS policies, and seed data (3 placeholder
   Mandals, the 4 departments, 5 placeholder feedback questions).
3. In **Project Settings → API**, copy the **Project URL** and **anon public
   key**.
4. Copy `.env.local.example` to `.env.local` and paste them in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
5. Once you have the real 3 Mandal names, update the `mandals` table rows
   (Table Editor → mandals) — no redeploy needed.

### 2. Google Drive (Past Memories gallery)

1. In [Google Cloud Console](https://console.cloud.google.com), create a
   project (or reuse one), enable the **Google Drive API**, and create an
   **API key** (Credentials → Create Credentials → API key). You can restrict
   it to the Drive API for safety.
2. Create/choose the Drive folder with your event photos, and share it as
   **"Anyone with the link can view"** — this is required for the API key
   (no OAuth) to list its contents.
3. Get the folder ID from its URL:
   `https://drive.google.com/drive/folders/`**`THIS_PART`**
4. Add both to `.env.local`:
   ```
   GOOGLE_DRIVE_API_KEY=...
   GOOGLE_DRIVE_FOLDER_ID=...
   ```

### 3. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without the env vars
above, the app still runs — signup will show "Loading Mandals…" and Memories
will show a setup message, since there's no data source yet.

## How login works (by design)

Signup creates a random, unguessable `device_token` stored in the browser's
`localStorage` — no password. Returning to the app on the same browser logs
you back in automatically. Clearing browser data or switching devices means
signing up again as a new account. This trade-off was chosen deliberately for
simplicity; a real login system (OTP/PIN) can replace it later if needed.

## Deploying

Push to a Git repo and deploy on [Vercel](https://vercel.com/new) — add the
same env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`GOOGLE_DRIVE_API_KEY`, `GOOGLE_DRIVE_FOLDER_ID`) in the Vercel project
settings.
