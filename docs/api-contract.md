# API contract (frontend ↔ Laravel)

Covers everything the app talks to: auth, Sabhas (events), attendance,
Mandals, Departments, the People directory, feedback, Analytics, and the
public wall. The frontend's mock backend (`src/lib/api/mockAdapter.ts`)
implements exactly this contract in memory, so it doubles as a runnable
reference implementation — when in doubt about a shape or an edge case,
that file is the tie-breaker.

Base URL: `NEXT_PUBLIC_API_URL` (e.g. `https://api.example.com/api/v1`).
If unset, the frontend runs entirely against the in-memory mock — no Laravel
server needed for frontend-only development.

## Conventions

- All requests: `Accept: application/json`. Bodies are JSON,
  `Content-Type: application/json`.
- Authenticated requests: `Authorization: Bearer <token>`. The token is an
  opaque string (Sanctum personal access token or equivalent) issued by
  `/auth/signup` or `/auth/login`. There is no separate "admin login" — the
  same token carries whatever `role` the account has.
- All IDs (`id`, `user_id`, `mandal_id`, `department_id`, `attendance_id`,
  `scanned_by`) are returned as **strings**, even if the underlying primary
  key is an integer — the frontend treats every ID as an opaque string
  (this matches how it already treats Supabase UUIDs today, so nothing
  downstream needs to change).
- Timestamps are ISO 8601 UTC strings (e.g. `2026-08-06T09:14:32Z`).
- Single-resource success: `{ "data": { ... } }`.
- List success: `{ "data": [ ... ] }`.
- Paginated list success: `{ "data": [ ... ], "meta": { "current_page": 1,
  "per_page": 20, "total": 143, "last_page": 8 } }`. (Laravel's default
  paginator also includes `links`/`from`/`to` — fine to leave those in, the
  frontend only reads `data` and `meta.current_page`/`last_page`/`total`.)
- Validation error (422): `{ "message": "The given data was invalid.",
  "errors": { "field_name": ["Human readable message"] } }` — standard
  Laravel `ValidationException` shape.
- Other errors (401/403/404/409/500): `{ "message": "Human readable
  message." }`.
- No-content success (e.g. delete): `204` with an empty body.

## Roles

`user` (default) → `scanner` → `admin` → `super_admin`. Enforced
server-side on every protected route below — never trust the frontend's own
role check, it's UX only.

## Data shapes

```ts
type Mandal = { id: string; name: string; sort_order: number };

type UserRole = "user" | "scanner" | "admin" | "super_admin";
type DepartmentRole = "member" | "in-charge";

type User = {
  id: string;
  name: string;
  contact_number: string;
  mandal_id: string | null;
  department_id: string | null;
  department_role: DepartmentRole;
  role: UserRole;
  created_at: string;
};
// Never include a login token in any response except signup/login themselves.

// "scheduled" = launched for a future scheduled_at, not live yet.
// "active" = live right now. "ended" = over, or cancelled before it ever
// went live.
type EventStatus = "scheduled" | "active" | "ended";

// A single Yuva Sabha gathering. The real-world schedule is irregular
// (weekly, alternate weeks, or skipped some weeks) — too irregular for a
// recurrence rule, so admins/super_admins schedule or launch each one
// manually. Only one Event may have status "active" at a time.
type Event = {
  id: string;
  title: string;
  scheduled_at: string;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
};

type QuestionType = "rating" | "text";

type FeedbackQuestion = {
  id: string;
  question_text: string;
  question_type: QuestionType;
  sort_order: number;
};

type FeedbackResponse = {
  id: string;
  user_id: string;
  event_id: string;
  question_id: string;
  rating: number | null;
  answer_text: string | null;
  created_at: string;
};

type Department = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type DepartmentTask = {
  id: string;
  department_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
};

type DepartmentRosterEntry = {
  id: string;
  name: string;
  contact_number: string;
  department_role: DepartmentRole;
};

type AnalyticsData = {
  total_people: number;
  unique_attendees: number;
  total_checkins: number;
  // Last ~10 events that actually happened (active/ended), oldest first.
  attendance_by_event: { event_id: string; title: string; scheduled_at: string; count: number }[];
  // Scoped to one event — see GET /analytics's `event_id` query param.
  attendance_by_mandal_for_event: { mandal_id: string | null; name: string; count: number }[];
  people_by_mandal: { mandal_id: string | null; name: string; count: number }[];
  people_by_department: { department_id: string; name: string; count: number }[];
  unassigned_department_count: number;
  people_by_role: { role: UserRole; count: number }[];
};

type Attendance = {
  id: string;
  user_id: string;
  event_id: string;
  scanned_at: string;
  scanned_by: string | null;
};

type AttendanceLogEntry = {
  attendance_id: string;
  user_id: string;
  attendee_name: string;
  contact_number: string;
  mandal_id: string | null;
  event_id: string;
  event_title: string;
  scanned_at: string;
  scanned_by_name: string | null;
};

type AttendanceMarkResult = {
  attendance_id: string;
  user_id: string;
  name: string;
  event_id: string;
  scanned_at: string;
  already_marked: boolean; // true if this was already checked in (idempotent re-scan)
};

type ScanPerson = { id: string; name: string; contact_number: string };

// A User row as returned by the admin People-directory search — adds the
// Mandal's name so the page can group/display without fetching the (large)
// full Mandal list just for that.
type AdminPerson = User & { mandal_name: string | null };

type WallPost = {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};
```

## Endpoints

### `POST /auth/signup` — public

Passwordless signup. PIN defaults to the last 4 digits of `contact_number`
(bcrypt-hashed server-side) so a second-device login works with zero extra
setup — see `POST /auth/pin` to change it later.

Request: `{ name: string; contact_number: string; mandal_id: string }`
Response `201`: `{ "data": { "token": string, "user": User } }`
`422` — name < 2 chars, contact_number not exactly 10 digits, or
`mandal_id` doesn't exist.

### `POST /auth/login` — public

Request: `{ name: string; contact_number: string; pin: string }`
Response `200`: `{ "data": { "token": string, "user": User } }`
`401` — `{ "message": "Name, contact number, or PIN is incorrect." }`
(name match should be case-insensitive/trimmed, to avoid support headaches.)

### `GET /auth/me` — Bearer

Response `200`: `{ "data": User }`
`401` — missing/invalid/revoked token.

### `PUT /profile` — Bearer

Request: `{ name: string; contact_number: string; mandal_id: string }`
Response `200`: `{ "data": User }` (the caller's own record only — this
endpoint can never target another user).

### `POST /auth/pin` — Bearer

Request: `{ pin: string }` (4–6 digits)
Response `204`.
`422` — pin doesn't match `^\d{4,6}$`.

### `GET /mandals` — public

Query: `search?: string`, `page?: number`, `per_page?: number` (default 20,
max 50). Ordered by `sort_order`, then `name`.
Response `200`: paginated list of `Mandal`.

This is expected to back a live search-as-you-type combobox against a large
table (this app is moving from 3 hardcoded Mandals to "all Mandals" —
hundreds+), so `search` should hit an indexed `ILIKE`/full-text match on
`name`, not a full table scan, and the endpoint should stay fast with no
query at all (first-open, empty search = first page ordered by
`sort_order`).

### `GET /mandals/{id}` — public

Used to display a specific Mandal's name (e.g. on Home/Profile) without
paging through search results to find it.
Response `200`: `{ "data": Mandal | null }`.

### `GET /events/active` — public

No auth required — "visible to all users" means any signed-up account (not
just admins) can see whether a Sabha is currently live, before deciding
whether to open the app looking for a QR code.
Response `200`: `{ "data": Event | null }`.

### `POST /events` — Bearer, role `admin`/`super_admin`

Schedules or immediately launches a Sabha, depending on `scheduled_at`:

- Omitted, or `<= now`: creates it as `status: "active"` immediately —
  also auto-ends whichever Event currently has status `"active"` first
  (there should only ever be one, but don't rely on that invariant holding
  — enforce it here too). This is Scan's "Launch Yuva Sabha" button.
- In the future: creates it as `status: "scheduled"`. Does **not** touch
  any currently-active event — you can schedule next week's Sabha while
  this week's is still running.

Request: `{ title?: string; scheduled_at?: string }` (both optional —
default `title` to `"Yuva Sabha"`, default `scheduled_at` to now).
Response `201`: `{ "data": Event }`.
`403` not authorized.

**A scheduled Sabha must go live on its own once `scheduled_at` arrives** —
in the mock this is done lazily (whichever client polls `GET /events/active`
first after that moment triggers the promotion), which is good enough for a
frontend-only dev mock but is **not** an acceptable design for the real
backend: Laravel needs an actual scheduled job (`schedule:run` / queued
job checking every minute or so) that promotes due `"scheduled"` events to
`"active"` (ending any other still-`"active"` one first) independent of
whether anyone happens to be polling.

### `POST /events/{id}/end` — Bearer, role `admin`/`super_admin`

Response `204`. `404` if the id doesn't exist.

### `GET /events` — Bearer, role `admin`/`super_admin`

Query: `page?: number` (default `per_page` 20). Ordered by `created_at` desc.
Response `200`: paginated list of `Event` — past-Sabha history.

### `GET /attendance/me` — Bearer

The caller's own check-ins, across all events.
Response `200`: `{ "data": Attendance[] }`.

### `POST /attendance/mark` — Bearer, role `scanner`/`admin`/`super_admin`

Request: `{ user_id: string; event_id: string }`
Response `200`: `{ "data": AttendanceMarkResult }`. Idempotent — re-marking
the same person+event returns the existing row with `already_marked: true`
rather than erroring or duplicating.

**Must re-validate server-side that `event_id` still refers to an Event
with `status: "active"`** before recording anything — this is the whole
point of scoping the QR to an event: a screenshot of last week's (now
`"ended"`) QR must be rejected here even if the scanning device's own UI
happens to be stale. Reject with `422` and a clear message
(`"This QR is for a Sabha that isn't currently live."`) rather than
silently accepting it.

`403` not authorized. `404` person not found. `422` invalid/inactive event.

### `GET /attendance/logs` — Bearer, role `scanner`/`admin`/`super_admin`

Query: `event_id?: string`, `mandal_id?: string`, `page?: number`,
`per_page?: number` (default 50, max 100). Ordered by `scanned_at` desc.
Response `200`: paginated list of `AttendanceLogEntry`.

The current UI polls this once a second while the Scan page is open, always
scoped to the currently active event (plus whatever Mandal filter is
selected) — keep it indexed on `event_id` and on `users.mandal_id` (join)
so that stays cheap once there are many Mandals and a lot of history, not
"fetch every row every second."

### `DELETE /attendance/logs/{id}` — Bearer, role `scanner`/`admin`/`super_admin`

Removes one attendance entry (undo an accidental scan).
Response `204`. `404` if the id doesn't exist.

### `GET /people/search` — Bearer, role `scanner`/`admin`/`super_admin`

Query: `query: string`. If `query` is missing or under 2 characters, return
an empty list rather than erroring (guards against scanner accounts being
able to browse the full directory — this is deliberately not a general
People-directory endpoint).
Response `200`: `{ "data": ScanPerson[] }`, capped at 20 results, matching
name or contact number.

### `POST /people/register` — Bearer, role `scanner`/`admin`/`super_admin`

Registers someone not yet in the system (used from the Scan page for
walk-ins without a QR code yet). Does **not** log the caller in as this
person — it's creating an account on someone else's behalf.

Request: `{ name: string; contact_number: string; mandal_id: string }`
Response `201`: `{ "data": User }`.
`409` — `contact_number` already registered (frontend checks via
`/people/search` first and shows a friendlier message, but the server must
still enforce this — never trust the client-side check alone).

### `GET /departments` — public

Ordered by `sort_order`.
Response `200`: `{ "data": Department[] }`.

### `GET /departments/{slug}` — public

Response `200`: `{ "data": Department | null }`.

### `GET /departments/{id}/roster` — public

Everyone with `department_id` equal to this department, in-charge first
then name. `{id}` is the department's `id`, not its slug.
Response `200`: `{ "data": DepartmentRosterEntry[] }`.

### `GET /departments/{id}/tasks` — public

Ordered by `sort_order`.
Response `200`: `{ "data": DepartmentTask[] }`.

### `PUT /people/{id}/department` — Bearer, role `admin`/`super_admin`

Assigns or removes (`department_id: null`) a department + seva role for
one person. This is the same underlying action as Supabase's
`admin_assign_department` used to be — kept separate from any future
People-directory endpoints since Departments and People migrated on
different tracks.

Request: `{ department_id: string | null; department_role: DepartmentRole }`
Response `204`.
`403` not authorized. `404` person not found.

### `GET /feedback/questions` — public

Fixed/seeded question set — editing it is a backend-side job for now, same
as Mandals/Departments, not built into an admin UI.
Response `200`: `{ "data": FeedbackQuestion[] }`.

### `GET /feedback/me` — Bearer

The caller's own responses, across all events.
Response `200`: `{ "data": FeedbackResponse[] }`.

### `POST /feedback` — Bearer

Request: `{ event_id: string; answers: { question_id: string; rating?:
number | null; answer_text?: string | null }[] }`
Response `200`: `{ "data": FeedbackResponse[] }`. Upsert per
`(user_id, event_id, question_id)` — resubmitting the same event updates
the existing rows rather than duplicating them.

### `GET /analytics` — Bearer, role `admin`/`super_admin`

Query: `event_id?: string` — scopes `attendance_by_mandal_for_event`;
omit to default to the most recent event that's happened.
Response `200`: `{ "data": AnalyticsData }`. Pre-aggregate server-side (one
query per field, not N+1) so the page stays fast on a slow connection —
same rationale as the old `admin_analytics()` Supabase RPC this replaces.

### `GET /people` — Bearer, role `admin`/`super_admin`

The full People-directory search — distinct from `GET /people/search`
(Scan's minimal, capped, scanner-accessible lookup). This one is
admin/super_admin only, has no result cap, returns every field (role,
department, mandal name), and can list everyone with no query at all.

Query: `query?: string` — matches name or contact number; omit to return
everyone.
Response `200`: `{ "data": AdminPerson[] }`.

### `PUT /people/{id}/role` — Bearer, role `super_admin`

Grants or revokes anyone's access level. Restricted to `super_admin` (not
just `admin`) — matches the People page's own gate, enforced here too.
Reject if `{id}` is the caller's own id (nobody can change their own role).

Request: `{ role: UserRole }`
Response `200`: `{ "data": AdminPerson }`.
`403` not authorized (including self-targeting). `404` person not found.

### `DELETE /people/{id}` — Bearer, role `admin`/`super_admin`

Permanently removes an account, cascading to their attendance and feedback
records too (the frontend's confirm dialog says as much — the backend must
actually do it). Reject if `{id}` is the caller's own id.

Response `204`. `403` not authorized (including self-targeting). `404` person
not found.

### `GET /wall` — public

Ordered by `created_at` desc.
Response `200`: `{ "data": WallPost[] }`.

### `POST /wall` — Bearer

`author_name`/`user_id` are derived from the caller's own token
server-side, never trusted from the request body — the original Supabase
version of this trusted client-supplied `user_id`/`author_name` directly,
which let anyone post as anyone; don't repeat that here.

Request: `{ content: string }` (min 3 chars)
Response `201`: `{ "data": WallPost }`.
`422` — content too short.

## QR code format

Each user's personal QR encodes `YUVASABHA:<user_id>:<event_id>` for the
*currently active* event — the Attendance page always renders it from a
live `GET /events/active` fetch, so the QR effectively changes every time
the active event changes (a new Sabha, or the same person re-opening the
page after last week's Sabha ended and a new one started). No API
involvement in generating it — it's rendered client-side.

The Scan page strips the prefix, splits on `:` into `user_id` and
`event_id`, and calls `POST /attendance/mark` with both. It also rejects a
mismatched `event_id` client-side before even calling the API (faster
feedback), but that is a UX nicety only — `POST /attendance/mark`'s
server-side active-event check (above) is what actually secures this
against a replayed/stale QR.
