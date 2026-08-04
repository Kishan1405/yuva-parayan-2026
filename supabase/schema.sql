-- Yuva Parayan 2026 — schema for Supabase (run once in the SQL editor)
--
-- There is no real login (by design — see README). Attendees are
-- identified by a random device_token held in the browser. Admin/scanner
-- privilege checks happen inside the SECURITY DEFINER functions at the
-- bottom of this file, which re-verify the caller's role by their
-- device_token before doing anything — the `users` table itself has zero
-- direct anon access, so a regular attendee can't self-promote or dump
-- everyone's contact info from devtools.
--
-- Fresh install: run this whole file once.
-- Existing project (already ran phase 1 schema): run
-- supabase/migration_002_admin_attendance.sql instead.

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
  department_role text not null default 'member' check (department_role in ('member', 'in-charge')),
  role text not null default 'user' check (role in ('user', 'scanner', 'admin', 'super_admin')),
  login_pin_hash text,
  created_at timestamptz not null default now()
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  day smallint not null check (day in (1, 2, 3)),
  scanned_at timestamptz not null default now(),
  scanned_by uuid references users(id) on delete set null,
  unique (user_id, day)
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
alter table attendance enable row level security;
alter table feedback_responses enable row level security;
alter table wall_posts enable row level security;

-- public read-only reference content
create policy "public read mandals" on mandals for select using (true);
create policy "public read departments" on departments for select using (true);
create policy "public read department_members" on department_members for select using (true);
create policy "public read department_tasks" on department_tasks for select using (true);
create policy "public read feedback_questions" on feedback_questions for select using (true);

-- users & attendance: intentionally NO anon policies here. RLS is enabled
-- with zero grants, so direct table access is fully blocked for the public
-- client. All access goes through the SECURITY DEFINER functions below.

-- feedback: submit + read own (app filters by user_id client-side)
create policy "anyone can submit feedback" on feedback_responses for insert with check (true);
create policy "anyone can update own feedback" on feedback_responses for update using (true);
create policy "anyone can read feedback" on feedback_responses for select using (true);

-- wall: public feed, anyone can post, no edit/delete from client
create policy "anyone can read wall" on wall_posts for select using (true);
create policy "anyone can post to wall" on wall_posts for insert with check (true);

-- ---------- self-service functions (any signed-up user, incl. anonymous signup) ----------

-- PIN defaults to the last 4 digits of the contact number used to sign up —
-- no separate setup step, works the same for every account.
create or replace function signup_user(p_name text, p_contact_number text, p_mandal_id uuid)
returns users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user users;
  v_contact text;
begin
  v_contact := trim(p_contact_number);
  insert into users (name, contact_number, mandal_id, login_pin_hash)
  values (trim(p_name), v_contact, p_mandal_id, crypt(right(v_contact, 4), gen_salt('bf')))
  returning * into v_user;
  return v_user;
end;
$$;

create or replace function get_user_by_token(p_device_token uuid)
returns users
language sql
security definer
set search_path = public
as $$
  select * from users where device_token = p_device_token limit 1;
$$;

create or replace function update_own_profile(
  p_device_token uuid, p_name text, p_contact_number text, p_mandal_id uuid
)
returns users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user users;
begin
  update users
  set name = trim(p_name), contact_number = trim(p_contact_number), mandal_id = p_mandal_id
  where device_token = p_device_token
  returning * into v_user;

  if v_user.id is null then
    raise exception 'Not found';
  end if;
  return v_user;
end;
$$;

create or replace function get_my_attendance(p_device_token uuid)
returns setof attendance
language sql
security definer
set search_path = public
as $$
  select a.* from attendance a
  join users u on u.id = a.user_id
  where u.device_token = p_device_token;
$$;

-- Log into the same account from another device: set/change your own PIN
-- from a device where you're already logged in...
create or replace function set_login_pin(p_device_token uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pin !~ '^\d{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;

  update users
  set login_pin_hash = crypt(p_pin, gen_salt('bf'))
  where device_token = p_device_token;

  if not found then
    raise exception 'Not found';
  end if;
end;
$$;

-- ...then log in with name + contact number + that PIN on the new device.
create or replace function login_with_pin(p_name text, p_contact_number text, p_pin text)
returns users
language sql
security definer
set search_path = public
as $$
  select * from users
  where lower(trim(name)) = lower(trim(p_name))
    and contact_number = trim(p_contact_number)
    and login_pin_hash is not null
    and login_pin_hash = crypt(p_pin, login_pin_hash)
  limit 1;
$$;

-- Public roster lookup — anyone can see who's in a department (name +
-- contact only). Not admin-gated: attendees see this on the Departments page.
create or replace function get_department_roster(p_department_id uuid)
returns table (name text, contact_number text, department_role text)
language sql
security definer
set search_path = public
as $$
  select u.name, u.contact_number, u.department_role
  from users u
  where u.department_id = p_department_id
  order by (u.department_role = 'in-charge') desc, u.name;
$$;

-- ---------- admin-only functions ----------
-- None of these return `device_token` for anyone but the caller themself —
-- returning it for other users would hand out their session credential.

create or replace function admin_search_people(p_caller_token uuid, p_query text default null)
returns table (
  id uuid, name text, contact_number text, mandal_id uuid,
  department_id uuid, department_role text, role text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select u.role into v_role from users u where u.device_token = p_caller_token;
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select u.id, u.name, u.contact_number, u.mandal_id,
           u.department_id, u.department_role, u.role, u.created_at
    from users u
    where p_query is null or p_query = '' or u.name ilike '%' || p_query || '%'
    order by u.mandal_id, u.name;
end;
$$;

create or replace function admin_assign_department(
  p_caller_token uuid, p_target_user_id uuid, p_department_id uuid, p_department_role text
)
returns table (
  id uuid, name text, contact_number text, mandal_id uuid,
  department_id uuid, department_role text, role text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select u.role into v_role from users u where u.device_token = p_caller_token;
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'Not authorized';
  end if;

  if p_department_role not in ('member', 'in-charge') then
    raise exception 'Invalid department role';
  end if;

  update users u
  set department_id = p_department_id,
      department_role = case when p_department_id is null then 'member' else p_department_role end
  where u.id = p_target_user_id;

  if not found then
    raise exception 'User not found';
  end if;

  return query
    select u.id, u.name, u.contact_number, u.mandal_id,
           u.department_id, u.department_role, u.role, u.created_at
    from users u where u.id = p_target_user_id;
end;
$$;

create or replace function admin_set_role(p_caller_token uuid, p_target_user_id uuid, p_role text)
returns table (
  id uuid, name text, contact_number text, mandal_id uuid,
  department_id uuid, department_role text, role text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
begin
  select u.role into v_caller_role from users u where u.device_token = p_caller_token;
  if v_caller_role is null or v_caller_role <> 'super_admin' then
    raise exception 'Not authorized';
  end if;

  if p_role not in ('user', 'scanner', 'admin', 'super_admin') then
    raise exception 'Invalid role';
  end if;

  update users u set role = p_role where u.id = p_target_user_id;

  if not found then
    raise exception 'User not found';
  end if;

  return query
    select u.id, u.name, u.contact_number, u.mandal_id,
           u.department_id, u.department_role, u.role, u.created_at
    from users u where u.id = p_target_user_id;
end;
$$;

create or replace function attendance_mark(p_caller_token uuid, p_target_user_id uuid, p_day smallint)
returns table (
  attendance_id uuid,
  target_user_id uuid,
  target_name text,
  day smallint,
  scanned_at timestamptz,
  already_marked boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_caller_id uuid;
  v_target_name text;
  v_existing attendance;
  v_row attendance;
begin
  select u.role, u.id into v_caller_role, v_caller_id from users u where u.device_token = p_caller_token;
  if v_caller_role is null or v_caller_role not in ('admin', 'super_admin', 'scanner') then
    raise exception 'Not authorized';
  end if;

  if p_day not in (1,2,3) then
    raise exception 'Invalid day';
  end if;

  select u.name into v_target_name from users u where u.id = p_target_user_id;
  if v_target_name is null then
    raise exception 'Person not found';
  end if;

  select * into v_existing from attendance a where a.user_id = p_target_user_id and a.day = p_day;

  insert into attendance (user_id, day, scanned_by)
  values (p_target_user_id, p_day, v_caller_id)
  on conflict (user_id, day) do update set scanned_at = attendance.scanned_at
  returning * into v_row;

  return query select v_row.id, v_row.user_id, v_target_name, v_row.day, v_row.scanned_at, (v_existing.id is not null);
end;
$$;

create or replace function admin_list_attendance(p_caller_token uuid, p_day smallint default null)
returns table (
  attendance_id uuid,
  user_id uuid,
  attendee_name text,
  contact_number text,
  day smallint,
  scanned_at timestamptz,
  scanned_by_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select u.role into v_role from users u where u.device_token = p_caller_token;
  if v_role is null or v_role not in ('admin', 'super_admin', 'scanner') then
    raise exception 'Not authorized';
  end if;

  return query
    select a.id, a.user_id, u.name, u.contact_number, a.day, a.scanned_at, su.name
    from attendance a
    join users u on u.id = a.user_id
    left join users su on su.id = a.scanned_by
    where p_day is null or a.day = p_day
    order by a.scanned_at desc;
end;
$$;

-- ---------- allow the public client (anon key) to call these ----------

grant execute on function signup_user(text, text, uuid) to anon, authenticated;
grant execute on function get_user_by_token(uuid) to anon, authenticated;
grant execute on function update_own_profile(uuid, text, text, uuid) to anon, authenticated;
grant execute on function get_my_attendance(uuid) to anon, authenticated;
grant execute on function set_login_pin(uuid, text) to anon, authenticated;
grant execute on function login_with_pin(text, text, text) to anon, authenticated;
grant execute on function get_department_roster(uuid) to anon, authenticated;
grant execute on function admin_search_people(uuid, text) to anon, authenticated;
grant execute on function admin_assign_department(uuid, uuid, uuid, text) to anon, authenticated;
grant execute on function admin_set_role(uuid, uuid, text) to anon, authenticated;
grant execute on function attendance_mark(uuid, uuid, smallint) to anon, authenticated;
grant execute on function admin_list_attendance(uuid, smallint) to anon, authenticated;

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
