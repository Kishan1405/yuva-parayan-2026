-- Yuva Parayan 2026 — Phase 2 fixes:
-- 1. attendance_mark was raising "column reference day is ambiguous" — its
--    RETURNS TABLE has an output column named `day`, which PL/pgSQL was
--    confusing with attendance.day inside the INSERT ... ON CONFLICT. The
--    #variable_conflict pragma tells it to always prefer the table column.
-- 2. New scan_search_people() for manual attendance entry (people without a
--    phone to show a QR code) — usable by scanner/admin/super_admin, but
--    intentionally returns only id/name/contact (no role/department) and
--    requires at least 2 characters so a scanner account can't browse the
--    full attendee list, only look up someone specific.
-- Run once in the Supabase SQL editor (safe to re-run).

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
#variable_conflict use_column
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

create or replace function scan_search_people(p_caller_token uuid, p_query text)
returns table (id uuid, name text, contact_number text)
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

  if p_query is null or length(trim(p_query)) < 2 then
    return;
  end if;

  return query
    select u.id, u.name, u.contact_number
    from users u
    where u.name ilike '%' || trim(p_query) || '%' or u.contact_number ilike '%' || trim(p_query) || '%'
    order by u.name
    limit 20;
end;
$$;

grant execute on function scan_search_people(uuid, text) to anon, authenticated;
