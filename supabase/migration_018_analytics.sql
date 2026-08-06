-- Yuva Parayan 2026 — analytics summary for the new Analytics page.
-- One RPC returns everything pre-aggregated as a single small JSON object
-- (counts only, no per-person rows) so the page loads fast even on a slow
-- connection. Same admin/super_admin gate as the rest of the People/Scan
-- admin functions.
-- Run once in the Supabase SQL editor.

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
