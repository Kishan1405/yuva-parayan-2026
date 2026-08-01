-- Yuva Parayan 2026 — schema for Supabase (run once in the SQL editor)
-- Phase 1 (user-side only): RLS policies are intentionally permissive.
-- "Auth" is a random device_token held by the browser, not real login —
-- protection relies on the token being unguessable, not on RLS filtering.
-- Tighten this in phase 2 once Supabase Auth is added for admins.

create extension if not exists pgcrypto;

-- ---------- reference / admin-managed content ----------

create table mandals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  sort_order int not null default 0
);

create table department_members (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references departments(id) on delete cascade,
  name text not null,
  role text not null default 'member', -- 'in-charge' | 'member'
  contact_number text,
  sort_order int not null default 0
);

create table department_tasks (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references departments(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  sort_order int not null default 0
);

create table feedback_questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  question_type text not null default 'rating', -- 'rating' | 'text'
  sort_order int not null default 0
);

-- ---------- user data ----------

create table users (
  id uuid primary key default gen_random_uuid(),
  device_token uuid unique not null default gen_random_uuid(),
  name text not null,
  contact_number text not null,
  mandal_id uuid references mandals(id),
  department_id uuid references departments(id),
  created_at timestamptz not null default now()
);

create table feedback_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  question_id uuid references feedback_questions(id) on delete cascade,
  day smallint not null, -- 1, 2, 3
  rating smallint,
  answer_text text,
  created_at timestamptz not null default now(),
  unique (user_id, question_id, day)
);

create table wall_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- row level security ----------

alter table mandals enable row level security;
alter table departments enable row level security;
alter table department_members enable row level security;
alter table department_tasks enable row level security;
alter table feedback_questions enable row level security;
alter table users enable row level security;
alter table feedback_responses enable row level security;
alter table wall_posts enable row level security;

-- public read-only reference content
create policy "public read mandals" on mandals for select using (true);
create policy "public read departments" on departments for select using (true);
create policy "public read department_members" on department_members for select using (true);
create policy "public read department_tasks" on department_tasks for select using (true);
create policy "public read feedback_questions" on feedback_questions for select using (true);

-- users: app filters by device_token itself; token is the "password"
create policy "anyone can sign up" on users for insert with check (true);
create policy "anyone can read users" on users for select using (true);
create policy "anyone can update users" on users for update using (true);

-- feedback: submit + read own (app filters by user_id client-side)
create policy "anyone can submit feedback" on feedback_responses for insert with check (true);
create policy "anyone can update own feedback" on feedback_responses for update using (true);
create policy "anyone can read feedback" on feedback_responses for select using (true);

-- wall: public feed, anyone can post, no edit/delete from client
create policy "anyone can read wall" on wall_posts for select using (true);
create policy "anyone can post to wall" on wall_posts for insert with check (true);

-- ---------- seed data ----------

insert into mandals (name, sort_order) values
  ('Mandal 1', 1),
  ('Mandal 2', 2),
  ('Mandal 3', 3);

insert into departments (slug, name, description, sort_order) values
  ('sangeet', 'Sangeet', 'Music and bhajan seva', 1),
  ('sabha-vyavastha', 'Sabha Vyavastha', 'Hall and seating arrangements', 2),
  ('parayan-pujan', 'Parayan Pujan', 'Parayan and pujan vidhi', 3),
  ('prasad', 'Prasad', 'Prasad preparation and distribution', 4);

insert into feedback_questions (question_text, question_type, sort_order) values
  ('How would you rate today overall?', 'rating', 1),
  ('How would you rate the Sabha / Parayan session?', 'rating', 2),
  ('How would you rate the Prasad and arrangements?', 'rating', 3),
  ('What did you enjoy most about today?', 'text', 4),
  ('Any suggestions for tomorrow?', 'text', 5);
