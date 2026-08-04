-- Yuva Parayan 2026 — Phase 2 addition: attendance log for admin/scanner
-- Run once in the Supabase SQL editor (safe to re-run).

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

grant execute on function admin_list_attendance(uuid, smallint) to anon, authenticated;
