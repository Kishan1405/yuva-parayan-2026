-- Yuva Parayan 2026 — Phase 2: admin roles, department assignment, attendance
-- Run once in the Supabase SQL editor (safe to re-run — uses IF EXISTS/OR REPLACE).
--
-- Design note: there is still no real login for admins (by choice — see chat).
-- Every privileged action below is a Postgres function that re-checks the
-- caller's role by their device_token *inside the database* before doing
-- anything, so a regular attendee can't grant themselves admin or read the
-- full contact list by calling Supabase directly from devtools. The `users`
-- table itself is locked to zero direct anon access — everything goes
-- through these functions instead.

-- ---------- schema changes ----------

alter table users add column if not exists role text not null default 'user';
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('user','scanner','admin','super_admin'));

alter table users add column if not exists department_role text not null default 'member';
alter table users drop constraint if exists users_department_role_check;
alter table users add constraint users_department_role_check check (department_role in ('member','in-charge'));

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  day smallint not null check (day in (1,2,3)),
  scanned_at timestamptz not null default now(),
  scanned_by uuid references users(id) on delete set null,
  unique (user_id, day)
);

alter table attendance enable row level security;
-- No anon policies on purpose — attendance is reachable only through the
-- functions below (or directly by you in the Supabase table editor).

-- ---------- lock down direct anon access to `users` ----------
-- Phase 1 had "anyone can read/update users" policies. That let any browser
-- dump every attendee's name+phone, or self-promote their own role, via
-- devtools. Remove them; RLS stays enabled with zero anon policies, so the
-- table itself becomes unreachable directly. All access below goes through
-- SECURITY DEFINER functions, which run as the table owner and bypass RLS
-- internally, but only ever return the specific fields each is written to.

drop policy if exists "anyone can sign up" on users;
drop policy if exists "anyone can read users" on users;
drop policy if exists "anyone can update users" on users;

-- ---------- self-service functions (any signed-up user, incl. anonymous signup) ----------

create or replace function signup_user(p_name text, p_contact_number text, p_mandal_id uuid)
returns users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user users;
begin
  insert into users (name, contact_number, mandal_id)
  values (trim(p_name), trim(p_contact_number), p_mandal_id)
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

-- ---------- allow the public client (anon key) to call these ----------

grant execute on function signup_user(text, text, uuid) to anon, authenticated;
grant execute on function get_user_by_token(uuid) to anon, authenticated;
grant execute on function update_own_profile(uuid, text, text, uuid) to anon, authenticated;
grant execute on function get_my_attendance(uuid) to anon, authenticated;
grant execute on function admin_search_people(uuid, text) to anon, authenticated;
grant execute on function admin_assign_department(uuid, uuid, uuid, text) to anon, authenticated;
grant execute on function admin_set_role(uuid, uuid, text) to anon, authenticated;
grant execute on function attendance_mark(uuid, uuid, smallint) to anon, authenticated;

-- ---------- bootstrap your own account as the first super_admin ----------
-- Run this ONE TIME after you've signed up in the app normally (so your row
-- already exists). Replace the number with the exact contact number you
-- used to sign up. After this, do all further admin promotions from inside
-- the app (People page -> toggle) — you won't need SQL again.
--
update users set role = 'super_admin' where contact_number = '9033092446';
