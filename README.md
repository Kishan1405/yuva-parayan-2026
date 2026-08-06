# Yuva Parayan 2026 — Event Companion App

Mobile-first web app for Yuva Parayan 2026 (6–8 August 2026). Built with Next.js
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
- **Profile** — view/edit your own details, admin panel entry point (if applicable)
- **Attendance** — a personal QR code, plus your own per-day check-in status

## Modules (admin side, phase 2)

Only visible/usable to accounts with an elevated `role` (see "How admin
access works" below) — never shown for plain `user` accounts, regardless of
Mandal or department assignment.

- **Scan** (`/scan`, own bottom-nav tab) — visible to `scanner`, `admin`, and
  `super_admin`. One page: camera-based QR scanner up top (per-day, records a
  check-in against the scanned person's account), and the live Attendee Logs
  (per-day counts + full scan history, auto-refreshing every second) below it.
- **People** (`/people`, own nav tab) — visible to `admin` and `super_admin`
  only. Search everyone by name or contact number, grouped by Mandal (Mandal
  shown on every result too); assign/remove someone's department + seva role
  (member/in-charge); `super_admin` can also set anyone's access level
  (user/scanner/admin/super_admin).
- **Analytics** (`/analytics`, own nav tab) — visible to `admin` and
  `super_admin` only. Daily attendance (bar chart), people by Mandal (donut),
  people by department (bar chart), and role counts — all pulled from one
  pre-aggregated `admin_analytics()` RPC so the page stays fast on a slow
  connection.

Editing departments/tasks/feedback questions/Mandals themselves still happens
directly in the Supabase table editor — not built into the admin UI yet.

## One-time setup

### 1. Supabase (accounts, departments, feedback, wall)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql) —
   this creates all tables, RLS policies, seed data (3 placeholder Mandals,
   the 4 departments, 5 placeholder feedback questions), the roles/attendance
   schema, and the admin functions.
   - Already ran phase 1's `schema.sql` on an existing project? Run
     [`supabase/migration_002_admin_attendance.sql`](supabase/migration_002_admin_attendance.sql)
     instead — it adds only what's new.
3. In **Project Settings → API**, copy the **Project URL** and **anon public
   key** (also called "Publishable key" in newer Supabase projects).
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

## How admin access works (by design)

Same idea as attendee login — no separate admin login page, no extra
password. Every account has a `role` column (`user` / `scanner` / `admin` /
`super_admin`). The catch: a regular attendee's browser can't just set its
own `role` to `admin` via devtools, because the `users` table has **zero**
direct read/write access for the public client — every privileged action
(viewing the full contact list, assigning departments, changing anyone's
role, marking attendance) goes through a Postgres function that re-checks
the caller's actual role, server-side, before doing anything. See the
comments at the top of `supabase/migration_002_admin_attendance.sql` for the
full design rationale.

- `user` — everyone, by default
- `scanner` — can only scan attendance (`/scan`), nothing else
- `admin` — scanner + People directory + department/seva assignment
- `super_admin` — admin + can grant/revoke anyone's role (including other
  admins), from the People page in the app

**Bootstrapping the first admin** is the one piece that still needs raw SQL,
since nobody has admin rights yet on a fresh project — see the commented-out
`update users set role = 'super_admin' where contact_number = '...'` line at
the bottom of the migration file. Run it once, with your own number, after
you've signed up in the app. Every admin promotion after that happens from
the People page — no more SQL needed.

## Deploying

Push to a Git repo and deploy on [Vercel](https://vercel.com/new) — add the
same env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`GOOGLE_DRIVE_API_KEY`, `GOOGLE_DRIVE_FOLDER_ID`) in the Vercel project
settings.
