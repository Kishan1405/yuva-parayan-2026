-- Yuva Parayan 2026 — Phase 2 addition: department page needs each member's
-- user id to support removing them from the department (admin_assign_department
-- already supports this via department_id = null; the roster function just
-- never returned the id needed to call it).
-- Run once in the Supabase SQL editor (safe to re-run).

drop function if exists get_department_roster(uuid);

create or replace function get_department_roster(p_department_id uuid)
returns table (id uuid, name text, contact_number text, department_role text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.name, u.contact_number, u.department_role
  from users u
  where u.department_id = p_department_id
  order by (u.department_role = 'in-charge') desc, u.name;
$$;

grant execute on function get_department_roster(uuid) to anon, authenticated;
