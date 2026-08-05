-- Yuva Parayan 2026 — remove-person action on the People page. Deletes the
-- account entirely (their attendance and feedback rows cascade-delete;
-- their wall posts stay, just orphaned from any account). Restricted to
-- admin/super_admin, same level as the rest of the People page's actions.
-- Can't be used to delete your own account.
-- Run once in the Supabase SQL editor (safe to re-run).

create or replace function admin_delete_person(p_caller_token uuid, p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_caller_id uuid;
begin
  select u.role, u.id into v_caller_role, v_caller_id from users u where u.device_token = p_caller_token;
  if v_caller_role is null or v_caller_role not in ('admin', 'super_admin') then
    raise exception 'Not authorized';
  end if;

  if v_caller_id = p_target_user_id then
    raise exception 'You cannot remove your own account';
  end if;

  delete from users where id = p_target_user_id;

  if not found then
    raise exception 'Person not found';
  end if;
end;
$$;

grant execute on function admin_delete_person(uuid, uuid) to anon, authenticated;
