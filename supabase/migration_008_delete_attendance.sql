-- Yuva Parayan 2026 — Phase 2 addition: delete an accidental attendance
-- entry from the Attendee Logs list. Same role set as attendance_mark
-- (scanner/admin/super_admin), since a scanner should be able to undo
-- their own accidental scan without needing an admin.
-- Run once in the Supabase SQL editor (safe to re-run).

create or replace function admin_delete_attendance(p_caller_token uuid, p_attendance_id uuid)
returns void
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

  delete from attendance where id = p_attendance_id;

  if not found then
    raise exception 'Entry not found';
  end if;
end;
$$;

grant execute on function admin_delete_attendance(uuid, uuid) to anon, authenticated;
