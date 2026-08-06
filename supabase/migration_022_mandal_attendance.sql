-- Yuva Parayan 2026 — Mandal-aware attendance:
--  1. admin_list_attendance() now also returns each entry's mandal_id, so
--     the Scan page's Attendee Logs can filter by Mandal.
--  2. admin_analytics() gains attendance_by_mandal_and_day, so the
--     Analytics page can chart attendance by Mandal with a per-day toggle.
-- Run once in the Supabase SQL editor.

-- Return-type change (new output column) — CREATE OR REPLACE can't do this,
-- has to drop first.
drop function if exists admin_list_attendance(uuid, smallint);

create or replace function admin_list_attendance(p_caller_token uuid, p_day smallint default null)
returns table (
  attendance_id uuid,
  user_id uuid,
  attendee_name text,
  contact_number text,
  mandal_id uuid,
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
    select a.id, a.user_id, u.name, u.contact_number, u.mandal_id, a.day, a.scanned_at, su.name
    from attendance a
    join users u on u.id = a.user_id
    left join users su on su.id = a.scanned_by
    where p_day is null or a.day = p_day
    order by a.scanned_at desc;
end;
$$;

grant execute on function admin_list_attendance(uuid, smallint) to anon, authenticated;

-- admin_analytics() still returns a bare jsonb scalar, so its signature
-- (and thus the grant) is unchanged — CREATE OR REPLACE is fine here.
create or replace function admin_analytics(p_caller_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_result jsonb;
begin
  select u.role into v_role from users u where u.device_token = p_caller_token;
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'total_people', (select count(*) from users),
    'unique_attendees', (select count(distinct user_id) from attendance),
    'total_checkins', (select count(*) from attendance),

    'attendance_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'count', coalesce(t.cnt, 0)) order by d.day), '[]'::jsonb)
      from generate_series(1, 3) as d(day)
      left join (select day, count(*) cnt from attendance group by day) t on t.day = d.day
    ),

    'people_by_mandal', (
      select coalesce(jsonb_agg(jsonb_build_object('mandal_id', t.mandal_id, 'name', coalesce(m.name, 'No Mandal'), 'count', t.cnt)
               order by coalesce(m.sort_order, 999999)), '[]'::jsonb)
      from (select mandal_id, count(*) cnt from users group by mandal_id) t
      left join mandals m on m.id = t.mandal_id
    ),

    -- Cross-tab of attendance count by Mandal x day, including zero counts,
    -- for the Analytics page's Mandal-wise chart + day toggle.
    'attendance_by_mandal_and_day', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'mandal_id', mm.mandal_id, 'name', mm.name, 'day', d.day, 'count', coalesce(t.cnt, 0)
             ) order by mm.sort_order, d.day), '[]'::jsonb)
      from (
        select m.id as mandal_id, m.name, m.sort_order from mandals m
        union all
        select null::uuid, 'No Mandal', 999999
      ) mm
      cross join generate_series(1, 3) as d(day)
      left join (
        select u.mandal_id, a.day, count(*) cnt
        from attendance a
        join users u on u.id = a.user_id
        group by u.mandal_id, a.day
      ) t on t.mandal_id is not distinct from mm.mandal_id and t.day = d.day
    ),

    'people_by_department', (
      select coalesce(jsonb_agg(jsonb_build_object('department_id', d.id, 'name', d.name, 'count', t.cnt)
               order by t.cnt desc, d.name), '[]'::jsonb)
      from (select department_id, count(*) cnt from users where department_id is not null group by department_id) t
      join departments d on d.id = t.department_id
    ),
    'unassigned_department_count', (select count(*) from users where department_id is null),

    'people_by_role', (
      select coalesce(jsonb_agg(jsonb_build_object('role', t.role, 'count', t.cnt) order by t.ord), '[]'::jsonb)
      from (
        select role, count(*) cnt,
               case role when 'user' then 1 when 'scanner' then 2 when 'admin' then 3 else 4 end ord
        from users group by role
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function admin_analytics(uuid) to anon, authenticated;
