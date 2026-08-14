# Yuva Sabha — Companion App

Mobile-first web app for Yuva Sabha, built to serve all Mandals on an ongoing
basis (not a single one-off event). Built with Next.js (App Router) +
Tailwind CSS, talking to a Laravel-shaped REST API — see
[`docs/api-contract.md`](docs/api-contract.md). No Supabase involved
anymore; the `supabase/` folder is kept only as a historical reference for
the original schema design, nothing in the app reads from it.

The attendance day model (`src/lib/event.ts`'s `EVENT_DAYS`, currently three
hardcoded Aug 2026 dates) still reflects the original single-event design and
needs a real decision on how a permanent, multi-Mandal Yuva Sabha should
represent event days/dates before that changes.

Everyone signs up with name, contact number, and Mandal. There's no password —
the browser holds a private device token that identifies the account (see
"How login works" below).

## Modules (user side, phase 1)

- **Onboarding** — signup (name, contact, Mandal)
- **Home** — greeting, live-Sabha status (if one's been launched), quick
  links, "your seva" card
- **Departments** — Sangeet, Sabha Vyavastha, Parayan Pujan, Prasad, and 11
  more — in-charge list, members, task checklist
- **Reflect** — one feedback card scoped to whichever Sabha is currently
  live (unlocks when it starts) + a shared public wall for memories/values
  gained
- **Profile** — view/edit your own details, admin panel entry point (if applicable)
- **Attendance** — a personal QR code scoped to whichever Sabha is currently
  live, plus your check-in history

## Modules (admin side, phase 2)

Only visible/usable to accounts with an elevated `role` (see "How admin
access works" below) — never shown for plain `user` accounts, regardless of
Mandal or department assignment.

- **Sabhas** (`/events`, own nav tab) — visible to `admin` and `super_admin`
  only. Schedule a Sabha for a future date/time (or launch one immediately) —
  it goes live on its own once its time arrives, no need to be watching the
  clock. Upcoming (cancellable) and past lists.
- **Scan** (`/scan`, own bottom-nav tab) — visible to `scanner`, `admin`, and
  `super_admin`. `admin`/`super_admin` can also launch/end a Sabha right from
  here for the spontaneous case. While a Sabha is live: camera-based QR
  scanner up top (records a check-in against the scanned person's account,
  scoped to that Sabha), and the live Attendee Logs below it — a running
  count, a Mandal filter, and a search bar that finds anyone in the system
  (checked in or not), auto-refreshing every second.
- **People** (`/people`, own nav tab) — visible to `admin` and `super_admin`
  only. Search everyone by name or contact number, grouped by Mandal (Mandal
  shown on every result too); assign/remove someone's department + seva role
  (member/in-charge); `super_admin` can also set anyone's access level
  (user/scanner/admin/super_admin).
- **Analytics** (`/analytics`, own nav tab) — visible to `admin` and
  `super_admin` only. Attendance per Sabha (bar chart), attendance by Mandal
  for a selected Sabha, people by Mandal (donut), people by department (bar
  chart), and role counts.

Editing the department/task list, feedback question set, and Mandal list
themselves still happens directly in backend seed data (`src/lib/api/mockData.ts`
for the mock; whatever the Laravel equivalent ends up being) — not built
into an admin UI yet.

## Backend (Laravel API, mock included)

Every module talks to a Laravel-shaped REST API — see
[`docs/api-contract.md`](docs/api-contract.md) for the full spec.
`NEXT_PUBLIC_API_URL` unset (the default) runs entirely against an
in-memory mock (`src/lib/api/mockAdapter.ts`), so the frontend works fully
standalone with **no backend running at all** — it seeds ~150 Mandals, all
15 departments, a live Sabha, and a few test logins (see the comment at the
top of `src/lib/api/mockData.ts`). Once a real Laravel server implements
the contract, point `NEXT_PUBLIC_API_URL` at it and nothing else changes.

## One-time setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). That's it — no
external services to configure for local frontend development; everything
runs against the built-in mock. Point `NEXT_PUBLIC_API_URL` (see
`.env.local.example`) at a real Laravel server once one exists.

## How login works (by design)

Signup creates a random, unguessable `device_token` stored in the browser's
`localStorage` — no password. Returning to the app on the same browser logs
you back in automatically. Clearing browser data or switching devices means
signing up again as a new account. This trade-off was chosen deliberately for
simplicity; a real login system (OTP/PIN) can replace it later if needed.

## How admin access works (by design)

Same idea as attendee login — no separate admin login page, no extra
password. Every account has a `role` (`user` / `scanner` / `admin` /
`super_admin`). The catch: a regular attendee's browser can't just claim
`admin` for itself — every privileged action (viewing the full contact
list, assigning departments, changing anyone's role, marking attendance)
re-checks the caller's actual role **server-side** against their bearer
token before doing anything; the frontend's own role checks are UX only.
See the Roles section of [`docs/api-contract.md`](docs/api-contract.md) for
the enforcement contract every endpoint has to follow.

- `user` — everyone, by default
- `scanner` — can only scan attendance (`/scan`), nothing else
- `admin` — scanner + People directory + department/seva assignment
- `super_admin` — admin + can grant/revoke anyone's role (including other
  admins), from the People page in the app

**Bootstrapping the first admin** on a real backend (nobody has admin
rights yet on a fresh install) is a backend-side concern — however the
Laravel side chooses to seed/promote one. The mock sidesteps this
entirely: `src/lib/api/mockData.ts` pre-seeds a `super_admin` test account
(see the login at the top of that file), so there's always at least one
admin to test with locally. Every admin promotion after that happens from
the People page in the app.
