-- Yuva Parayan 2026 — Phase 2 fix: department pages weren't showing
-- admin-assigned members, because they read from the old empty
-- `department_members` placeholder table instead of real assigned users.
-- Run once in the Supabase SQL editor (safe to re-run).

-- Public roster lookup — anyone can see who's in a department (name +
-- contact only, same info level as the old department_members table).
-- Not admin-gated: attendees are meant to see this on the Departments page.
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

grant execute on function get_department_roster(uuid) to anon, authenticated;
