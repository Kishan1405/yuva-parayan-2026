-- Yuva Parayan 2026 — Phase 2 addition: log into the same account from any
-- device using name + contact number + a PIN.
-- Everyone's PIN defaults to the last 4 digits of their contact number —
-- no separate setup step. Run once in the Supabase SQL editor (safe to re-run).

alter table users add column if not exists login_pin_hash text;

-- Give every *existing* account a default PIN (last 4 digits of their number).
update users
set login_pin_hash = crypt(right(contact_number, 4), gen_salt('bf'))
where login_pin_hash is null;

-- New signups get the same default PIN automatically from now on.
create or replace function signup_user(p_name text, p_contact_number text, p_mandal_id uuid)
returns users
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user users;
  v_contact text;
begin
  v_contact := trim(p_contact_number);
  insert into users (name, contact_number, mandal_id, login_pin_hash)
  values (trim(p_name), v_contact, p_mandal_id, crypt(right(v_contact, 4), gen_salt('bf')))
  returning * into v_user;
  return v_user;
end;
$$;

-- Change your own PIN later, if ever needed (not wired into the UI yet).
create or replace function set_login_pin(p_device_token uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_pin !~ '^\d{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;

  update users
  set login_pin_hash = crypt(p_pin, gen_salt('bf'))
  where device_token = p_device_token;

  if not found then
    raise exception 'Not found';
  end if;
end;
$$;

-- Log in with name + contact number + PIN on a new device.
create or replace function login_with_pin(p_name text, p_contact_number text, p_pin text)
returns users
language sql
security definer
set search_path = public, extensions
as $$
  select * from users
  where lower(trim(name)) = lower(trim(p_name))
    and contact_number = trim(p_contact_number)
    and login_pin_hash is not null
    and login_pin_hash = crypt(p_pin, login_pin_hash)
  limit 1;
$$;

grant execute on function set_login_pin(uuid, text) to anon, authenticated;
grant execute on function login_with_pin(text, text, text) to anon, authenticated;
