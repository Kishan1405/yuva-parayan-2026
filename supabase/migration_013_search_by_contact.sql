-- Yuva Parayan 2026 — People search now also matches contact number, not
-- just name (useful for finding someone by phone number instantly).
-- Run once in the Supabase SQL editor (safe to re-run).

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
    where p_query is null or p_query = ''
       or u.name ilike '%' || p_query || '%'
       or u.contact_number ilike '%' || p_query || '%'
    order by u.mandal_id, u.name;
end;
$$;

grant execute on function admin_search_people(uuid, text) to anon, authenticated;
