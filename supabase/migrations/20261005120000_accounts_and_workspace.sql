-- Step 3: subscriber accounts.
--
-- Every subscriber sees only their own clients, readings and files. An account
-- works in one session at a time: signing in elsewhere ends the previous one.
-- New devices count against a limit, and too many new devices in 30 days are
-- refused. Admins open, change and suspend accounts. Sensitive actions are
-- written to an audit log.
--
-- Access rules live in the database itself (row level security), so no bug in
-- the app can show one subscriber another's data. Helper functions sit in the
-- `private` schema, which the Data API does not expose.

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

/**
 * Text without control or invisible format characters (so a name cannot hide
 * a right-to-left override in the watermark or on a report), trimmed and cut.
 */
create function private.clean_text(p_text text, p_max int) returns text
language sql immutable set search_path = '' as $$
  select left(trim(regexp_replace(coalesce(p_text, ''), '[\u0001-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]', '', 'g')), p_max)
$$;

-- ───────────────────────── accounts ─────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '' check (length(full_name) <= 120),
  phone text not null default '' check (length(phone) <= 25),
  role text not null default 'subscriber' check (role in ('subscriber', 'admin')),
  status text not null default 'suspended' check (status in ('active', 'suspended')),
  plan text not null default 'pro' check (plan in ('trial', 'basic', 'pro', 'studio', 'founder')),
  device_limit smallint not null default 2 check (device_limit between 1 and 5),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles for select to authenticated using (id = (select auth.uid()));

/**
 * A new account's status: active only when the admin Edge Function made it,
 * which it marks in app_metadata (only the secret key can write that). A user
 * made any other way - a sign-up, an anonymous sign-in - starts suspended.
 */
create function private.initial_status(p_app_meta jsonb) returns text
language sql immutable set search_path = '' as $$
  select case when coalesce(p_app_meta ->> 'provisioned', '') = 'true' then 'active' else 'suspended' end
$$;

/** Every new auth user gets a profile; name and phone come from the metadata the admin set. */
create function private.on_auth_user_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, phone, status)
  values (
    new.id,
    coalesce(new.email, ''),
    private.clean_text(new.raw_user_meta_data ->> 'full_name', 120),
    private.clean_text(new.raw_user_meta_data ->> 'phone', 25),
    private.initial_status(new.raw_app_meta_data)
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.on_auth_user_created();

-- users created before this migration get their profile too, by the same rule
insert into public.profiles (id, email, full_name, phone, status)
  select id, coalesce(email, ''), private.clean_text(raw_user_meta_data ->> 'full_name', 120),
    private.clean_text(raw_user_meta_data ->> 'phone', 25), private.initial_status(raw_app_meta_data)
  from auth.users
  on conflict (id) do nothing;

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_key text not null check (length(device_key) between 16 and 100),
  label text not null default '' check (length(label) <= 200),
  status text not null default 'approved' check (status in ('approved', 'revoked')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, device_key)
);
alter table public.devices enable row level security;
create policy "devices: read own" on public.devices for select to authenticated using (user_id = (select auth.uid()));

/** The one session per account that may use the data: the latest one claimed. */
create table public.active_sessions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  session_id uuid not null,
  device_id uuid references public.devices (id) on delete set null,
  claimed_at timestamptz not null default now()
);
alter table public.active_sessions enable row level security;
-- no policies: only the functions below read or write it

create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  actor_id uuid,
  action text not null,
  detail jsonb not null default '{}',
  at timestamptz not null default now()
);
create index audit_log_user_at on public.audit_log (user_id, at desc);
alter table public.audit_log enable row level security;
-- no policies: admins read it through admin_audit()

create function private.audit(p_user uuid, p_action text, p_detail jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (user_id, actor_id, action, detail) values (p_user, auth.uid(), p_action, coalesce(p_detail, '{}'))
$$;

/**
 * True while the caller's session still exists (signing out deletes it, even
 * though its access token lives on until it expires).
 */
create function private.signed_in() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions a
    where a.id::text = coalesce(auth.jwt() ->> 'session_id', '') and a.user_id = auth.uid()
  )
$$;

/** True when the caller's JWT is their account's active session, still signed in, and the account is active. */
create function private.session_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.signed_in() and exists (
    select 1
    from public.active_sessions s
    join public.profiles p on p.id = s.user_id
    where s.user_id = auth.uid()
      and s.session_id::text = coalesce(auth.jwt() ->> 'session_id', '')
      and p.status = 'active'
  )
$$;

/**
 * An admin in their active session, verified in two steps (aal2): an admin
 * can open, suspend and reset any account, so a password alone is not enough.
 */
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.session_ok()
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

/**
 * Signs an account out for real: Supabase's own session rows (and with them
 * the refresh tokens) and the active session. One session, or all of them.
 */
create function private.end_sessions(p_user uuid, p_session uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.sessions where user_id = p_user and (p_session is null or id = p_session);
  delete from public.active_sessions where user_id = p_user and (p_session is null or session_id = p_session);
end $$;

grant execute on function private.signed_in() to authenticated;
grant execute on function private.session_ok() to authenticated;
grant execute on function private.is_admin() to authenticated;
revoke execute on function private.audit(uuid, text, jsonb) from public;
revoke execute on function private.end_sessions(uuid, uuid) from public;
revoke execute on function private.on_auth_user_created() from public;

-- ───────────────────────── sessions and devices ─────────────────────────

/**
 * Called right after signing in (and when the app opens with a saved login).
 * Registers or recognises this device, then makes this session the account's
 * only active one. Returns {status} - ok, suspended, device_revoked,
 * device_limit or device_changes - and, when ok, the profile and device id.
 */
create function public.claim_session(p_device_key text, p_label text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_session text := coalesce(auth.jwt() ->> 'session_id', '');
  v_profile public.profiles;
  v_device public.devices;
  v_previous text;
  v_approved int;
  v_recent int;
begin
  if v_uid is null or v_session = '' or not private.signed_in() then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p_device_key is null or length(p_device_key) not between 16 and 100 then
    raise exception 'invalid device key' using errcode = '22023';
  end if;
  -- one claim per account at a time: two sign-ins at once must not both slip under the device limit
  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'no profile for this user' using errcode = '28000';
  end if;
  if v_profile.status <> 'active' then
    return jsonb_build_object('status', 'suspended');
  end if;

  select * into v_device from public.devices where user_id = v_uid and device_key = p_device_key;
  if found and v_device.status = 'revoked' then
    return jsonb_build_object('status', 'device_revoked');
  end if;
  if not found then
    -- admins are never locked out by the device rules
    if v_profile.role <> 'admin' then
      select count(*) into v_approved from public.devices where user_id = v_uid and status = 'approved';
      if v_approved >= v_profile.device_limit then
        perform private.audit(v_uid, 'device_refused', jsonb_build_object('reason', 'limit', 'label', left(p_label, 200)));
        return jsonb_build_object('status', 'device_limit', 'limit', v_profile.device_limit);
      end if;
      -- swapping devices again and again is how an account gets shared
      select count(*) into v_recent from public.devices where user_id = v_uid and created_at > now() - interval '30 days';
      if v_recent >= v_profile.device_limit + 3 then
        perform private.audit(v_uid, 'device_refused', jsonb_build_object('reason', 'changes', 'label', left(p_label, 200)));
        return jsonb_build_object('status', 'device_changes');
      end if;
    end if;
    insert into public.devices (user_id, device_key, label)
      values (v_uid, p_device_key, left(coalesce(p_label, ''), 200))
      returning * into v_device;
    perform private.audit(v_uid, 'device_added', jsonb_build_object('device', v_device.id, 'label', v_device.label));
  else
    update public.devices set last_seen_at = now(), label = left(coalesce(p_label, ''), 200)
      where id = v_device.id;
  end if;

  select session_id::text into v_previous from public.active_sessions where user_id = v_uid;
  insert into public.active_sessions (user_id, session_id, device_id, claimed_at)
    values (v_uid, v_session::uuid, v_device.id, now())
    on conflict (user_id) do update
      set session_id = excluded.session_id, device_id = excluded.device_id, claimed_at = excluded.claimed_at;
  update public.profiles set last_seen_at = now() where id = v_uid;
  -- a sign-in, or a takeover from another session; reopening the app in the same session is not news
  if v_previous is distinct from v_session then
    perform private.audit(v_uid, 'session_claimed', jsonb_build_object('device', v_device.id, 'replaced', v_previous is not null));
    -- the log keeps a little over a year per account
    delete from public.audit_log where user_id = v_uid and at < now() - interval '400 days';
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'deviceId', v_device.id,
    'profile', jsonb_build_object(
      'id', v_profile.id, 'email', v_profile.email, 'fullName', v_profile.full_name, 'phone', v_profile.phone,
      'role', v_profile.role, 'plan', v_profile.plan, 'deviceLimit', v_profile.device_limit
    )
  );
end $$;

/** Whether this session may still work: ok, replaced (signed in elsewhere), suspended, device_revoked. */
create function public.session_status(p_device_key text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_active public.active_sessions;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if not found then
    return jsonb_build_object('status', 'signed_out');
  end if;
  -- the reasons first: suspending or revoking also signs the session out, and it should learn why
  if v_profile.status <> 'active' then
    return jsonb_build_object('status', 'suspended');
  end if;
  if p_device_key is not null and exists (
    select 1 from public.devices where user_id = v_profile.id and device_key = p_device_key and status = 'revoked'
  ) then
    return jsonb_build_object('status', 'device_revoked');
  end if;
  select * into v_active from public.active_sessions where user_id = v_profile.id;
  if not private.signed_in() then
    -- gone because another session took over (and signed the others out), or because it signed out itself
    return jsonb_build_object('status', case
      when found and v_active.session_id::text <> coalesce(auth.jwt() ->> 'session_id', '') then 'replaced'
      else 'signed_out' end);
  end if;
  if v_active.user_id is null or v_active.session_id::text <> coalesce(auth.jwt() ->> 'session_id', '') then
    return jsonb_build_object('status', 'replaced');
  end if;
  return jsonb_build_object('status', 'ok');
end $$;

/** The caller's devices, newest first. */
create function public.my_devices() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'label', d.label, 'status', d.status, 'createdAt', d.created_at, 'lastSeenAt', d.last_seen_at,
    'current', d.id = (select device_id from public.active_sessions where user_id = auth.uid())
  ) order by d.created_at desc), '[]'::jsonb)
  from public.devices d
  where d.user_id = auth.uid() and private.session_ok()
$$;

/** Removes one of the caller's other devices, freeing its place. */
create function public.revoke_my_device(p_device uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.session_ok() then
    raise exception 'session not active' using errcode = '42501';
  end if;
  if p_device = (select device_id from public.active_sessions where user_id = auth.uid()) then
    raise exception 'this is the device in use' using errcode = '22023';
  end if;
  update public.devices set status = 'revoked', revoked_at = now()
    where id = p_device and user_id = auth.uid() and status = 'approved';
  if not found then
    raise exception 'no such device' using errcode = 'P0002';
  end if;
  perform private.audit(auth.uid(), 'device_revoked', jsonb_build_object('device', p_device));
  return jsonb_build_object('status', 'ok');
end $$;

/** The caller's own name and phone. */
create function public.update_my_profile(p_full_name text, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.session_ok() then
    raise exception 'session not active' using errcode = '42501';
  end if;
  update public.profiles set full_name = private.clean_text(p_full_name, 120), phone = private.clean_text(p_phone, 25)
    where id = auth.uid();
  return jsonb_build_object('status', 'ok');
end $$;

/** Records a sensitive action the app performs on the device (exporting a backup, restoring one). */
create function public.log_event(p_action text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if p_action not in ('backup_exported', 'backup_restored', 'local_data_uploaded', 'signed_out') then
    raise exception 'unknown event' using errcode = '22023';
  end if;
  if not private.session_ok() then
    raise exception 'session not active' using errcode = '42501';
  end if;
  -- the app reports these itself: a flood of them could only fill the log
  if (select count(*) from public.audit_log where user_id = auth.uid() and at > now() - interval '1 hour') >= 200 then
    return jsonb_build_object('status', 'throttled');
  end if;
  perform private.audit(auth.uid(), p_action);
  return jsonb_build_object('status', 'ok');
end $$;

-- ───────────────────────── the workspace ─────────────────────────
-- Each record is stored whole, as the app's store wrote it (`doc`); the app's
-- validation decides what a record may contain, the database who may see it.

create table public.ws_clients (
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_-]{1,100}$'),
  doc jsonb not null check (jsonb_typeof(doc) = 'object' and pg_column_size(doc) <= 131072),
  primary key (owner_id, id),
  check (doc ->> 'id' = id)
);
create table public.ws_readings (
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_-]{1,100}$'),
  doc jsonb not null check (jsonb_typeof(doc) = 'object' and pg_column_size(doc) <= 262144),
  primary key (owner_id, id),
  check (doc ->> 'id' = id)
);
create table public.ws_attachments (
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_-]{1,100}$'),
  doc jsonb not null check (jsonb_typeof(doc) = 'object' and pg_column_size(doc) <= 8192),
  primary key (owner_id, id),
  check (doc ->> 'id' = id)
);

alter table public.ws_clients enable row level security;
alter table public.ws_readings enable row level security;
alter table public.ws_attachments enable row level security;
create policy "ws_clients: own, active session" on public.ws_clients for all to authenticated
  using (owner_id = (select auth.uid()) and (select private.session_ok()))
  with check (owner_id = (select auth.uid()) and (select private.session_ok()));
create policy "ws_readings: own, active session" on public.ws_readings for all to authenticated
  using (owner_id = (select auth.uid()) and (select private.session_ok()))
  with check (owner_id = (select auth.uid()) and (select private.session_ok()));
create policy "ws_attachments: own, active session" on public.ws_attachments for all to authenticated
  using (owner_id = (select auth.uid()) and (select private.session_ok()))
  with check (owner_id = (select auth.uid()) and (select private.session_ok()));

/**
 * Deleting a client file is recorded (its id only: the log holds no personal
 * details). Not when the whole account is being deleted: nothing to keep then.
 */
create function private.on_ws_client_deleted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles where id = old.owner_id) then
    perform private.audit(old.owner_id, 'client_deleted', jsonb_build_object('client', old.id));
  end if;
  return old;
end $$;
create trigger ws_client_deleted after delete on public.ws_clients
  for each row execute function private.on_ws_client_deleted();

create function private.require_session() returns void
language plpgsql stable set search_path = '' as $$
begin
  if not private.session_ok() then
    raise exception 'session not active' using errcode = '42501', hint = 'session_replaced';
  end if;
end $$;

/** Every record of one collection: clients, readings or attachments. */
create function public.ws_all(p_store text) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v jsonb;
begin
  perform private.require_session();
  case p_store
    when 'clients' then select coalesce(jsonb_agg(doc), '[]'::jsonb) into v from public.ws_clients;
    when 'readings' then select coalesce(jsonb_agg(doc), '[]'::jsonb) into v from public.ws_readings;
    when 'attachments' then select coalesce(jsonb_agg(doc), '[]'::jsonb) into v from public.ws_attachments;
    else raise exception 'unknown collection: %', p_store using errcode = '22023';
  end case;
  return v;
end $$;

/** One record, or null. */
create function public.ws_get(p_store text, p_id text) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v jsonb;
begin
  perform private.require_session();
  case p_store
    when 'clients' then select doc into v from public.ws_clients where id = p_id;
    when 'readings' then select doc into v from public.ws_readings where id = p_id;
    when 'attachments' then select doc into v from public.ws_attachments where id = p_id;
    else raise exception 'unknown collection: %', p_store using errcode = '22023';
  end case;
  return v;
end $$;

/** All three collections, read in one statement: one consistent moment, for backups. */
create function public.ws_snapshot() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  perform private.require_session();
  return jsonb_build_object(
    'clients', (select coalesce(jsonb_agg(doc), '[]'::jsonb) from public.ws_clients),
    'readings', (select coalesce(jsonb_agg(doc), '[]'::jsonb) from public.ws_readings),
    'attachments', (select coalesce(jsonb_agg(doc), '[]'::jsonb) from public.ws_attachments)
  );
end $$;

/**
 * Applies puts and deletes as one transaction: all of them or none. File bytes
 * are not here: the app stores them in Storage around this call.
 */
create function public.ws_batch(p_ops jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_op jsonb;
  v_store text;
  v_n int := 0;
begin
  perform private.require_session();
  if jsonb_typeof(p_ops) <> 'array' or jsonb_array_length(p_ops) > 20000 then
    raise exception 'invalid batch' using errcode = '22023';
  end if;
  for v_op in select * from jsonb_array_elements(p_ops) loop
    v_store := v_op ->> 'store';
    if v_op ->> 'type' = 'put' then
      if jsonb_typeof(v_op -> 'value') <> 'object' or coalesce(v_op -> 'value' ->> 'id', '') = '' then
        raise exception 'put needs a value with an id' using errcode = '22023';
      end if;
      case v_store
        when 'clients' then
          insert into public.ws_clients (id, doc) values (v_op -> 'value' ->> 'id', v_op -> 'value')
            on conflict (owner_id, id) do update set doc = excluded.doc;
        when 'readings' then
          insert into public.ws_readings (id, doc) values (v_op -> 'value' ->> 'id', v_op -> 'value')
            on conflict (owner_id, id) do update set doc = excluded.doc;
        when 'attachments' then
          insert into public.ws_attachments (id, doc) values (v_op -> 'value' ->> 'id', v_op -> 'value')
            on conflict (owner_id, id) do update set doc = excluded.doc;
        else raise exception 'unknown collection: %', v_store using errcode = '22023';
      end case;
    elsif v_op ->> 'type' = 'delete' then
      case v_store
        when 'clients' then delete from public.ws_clients where id = v_op ->> 'id';
        when 'readings' then delete from public.ws_readings where id = v_op ->> 'id';
        when 'attachments' then delete from public.ws_attachments where id = v_op ->> 'id';
        else raise exception 'unknown collection: %', v_store using errcode = '22023';
      end case;
    else
      raise exception 'unknown batch operation: %', v_op ->> 'type' using errcode = '22023';
    end if;
    v_n := v_n + 1;
  end loop;
  -- per-account quotas (the rows counted are the caller's own: row level security); over them, nothing is kept
  if (select count(*) from public.ws_clients) > 20000
    or (select count(*) from public.ws_readings) > 200000
    or (select count(*) from public.ws_attachments) > 10000
    or (select coalesce(sum(case when doc ->> 'size' ~ '^[0-9]{1,15}$' then (doc ->> 'size')::bigint else 0 end), 0)
        from public.ws_attachments) > 2147483648 then
    raise exception 'over the account quota' using errcode = '54000';
  end if;
  return jsonb_build_object('applied', v_n);
end $$;

-- File bytes: a private bucket, one folder per user, readable only by its owner's active session.
-- A file is named exactly <user id>/<record id>; nothing else (no sub-folders, no "..").
insert into storage.buckets (id, name, public, file_size_limit)
  values ('ws-files', 'ws-files', false, 20971520)
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

/** How many files the caller keeps in the bucket (a cap even for uploads made around the app). */
create function private.file_count() returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from storage.objects where bucket_id = 'ws-files' and name like auth.uid()::text || '/%'
$$;
grant execute on function private.file_count() to authenticated;

create policy "ws-files: own folder, active session" on storage.objects for all to authenticated
  using (bucket_id = 'ws-files' and name ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9_-]{1,100}$') and (select private.session_ok()))
  with check (bucket_id = 'ws-files' and name ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9_-]{1,100}$') and (select private.session_ok())
    and (select private.file_count()) < 10000);

-- ───────────────────────── administration ─────────────────────────

create function private.require_admin() returns void
language plpgsql stable set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admins only' using errcode = '42501';
  end if;
end $$;

/** Every account with its numbers: devices, clients, readings, last seen. */
create function public.admin_list_accounts() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'email', p.email, 'fullName', p.full_name, 'phone', p.phone, 'role', p.role,
      'status', p.status, 'plan', p.plan, 'deviceLimit', p.device_limit,
      'createdAt', p.created_at, 'lastSeenAt', p.last_seen_at,
      'devices', (select count(*) from public.devices d where d.user_id = p.id and d.status = 'approved'),
      'clients', (select count(*) from public.ws_clients c where c.owner_id = p.id),
      'readings', (select count(*) from public.ws_readings r where r.owner_id = p.id)
    ) order by p.created_at desc), '[]'::jsonb)
    from public.profiles p
  );
end $$;

/** Changes an account: name, phone, plan, device limit, role or status (suspending ends its session). */
create function public.admin_update_account(p_user uuid, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_before public.profiles;
  v_after public.profiles;
begin
  perform private.require_admin();
  select * into v_before from public.profiles where id = p_user;
  if not found then
    raise exception 'no such account' using errcode = 'P0002';
  end if;
  if p_user = auth.uid() and (p_patch ? 'status' or p_patch ? 'role') then
    raise exception 'admins cannot suspend or demote themselves' using errcode = '22023';
  end if;
  update public.profiles set
    full_name = case when p_patch ? 'fullName' then private.clean_text(p_patch ->> 'fullName', 120) else full_name end,
    phone = case when p_patch ? 'phone' then private.clean_text(p_patch ->> 'phone', 25) else phone end,
    plan = coalesce(p_patch ->> 'plan', plan),
    device_limit = coalesce((p_patch ->> 'deviceLimit')::smallint, device_limit),
    role = coalesce(p_patch ->> 'role', role),
    status = coalesce(p_patch ->> 'status', status)
  where id = p_user
  returning * into v_after;
  if v_after.status = 'suspended' then
    perform private.end_sessions(p_user); -- signed out everywhere, for good
  end if;
  perform private.audit(p_user, 'account_updated', p_patch - 'fullName' - 'phone');
  return jsonb_build_object('status', 'ok');
end $$;

/** Signs every session of an account out (the admin function calls this after setting a password). */
create function public.admin_end_sessions(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  perform private.end_sessions(p_user);
  perform private.audit(p_user, 'sessions_ended');
  return jsonb_build_object('status', 'ok');
end $$;

/** An account's devices. */
create function public.admin_list_devices(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id, 'label', d.label, 'status', d.status, 'createdAt', d.created_at,
      'lastSeenAt', d.last_seen_at, 'revokedAt', d.revoked_at,
      'current', d.id = (select device_id from public.active_sessions where user_id = p_user)
    ) order by d.created_at desc), '[]'::jsonb)
    from public.devices d where d.user_id = p_user
  );
end $$;

/** Revokes a device; if it holds the account's active session, that session is signed out for real. */
create function public.admin_revoke_device(p_device uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_session uuid;
begin
  perform private.require_admin();
  update public.devices set status = 'revoked', revoked_at = now()
    where id = p_device and status = 'approved'
    returning user_id into v_user;
  if v_user is null then
    raise exception 'no such device' using errcode = 'P0002';
  end if;
  select session_id into v_session from public.active_sessions where user_id = v_user and device_id = p_device;
  if v_session is not null then
    perform private.end_sessions(v_user, v_session);
  end if;
  perform private.audit(v_user, 'device_revoked', jsonb_build_object('device', p_device));
  return jsonb_build_object('status', 'ok');
end $$;

/** Recent audit entries, for one account or for all. */
create function public.admin_audit(p_user uuid default null, p_limit int default 200) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'userId', a.user_id, 'actorId', a.actor_id, 'action', a.action, 'detail', a.detail, 'at', a.at
    ) order by a.at desc, a.id desc), '[]'::jsonb)
    from (
      select * from public.audit_log
      where p_user is null or user_id = p_user
      order by at desc, id desc
      limit least(greatest(coalesce(p_limit, 200), 1), 1000)
    ) a
  );
end $$;

/** Records what the admin Edge Function did for an account (it acts with the secret key, so it reports here). */
create function public.admin_log(p_user uuid, p_action text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if p_action not in ('account_created', 'password_set') then
    raise exception 'unknown event' using errcode = '22023';
  end if;
  perform private.audit(p_user, p_action);
  return jsonb_build_object('status', 'ok');
end $$;

/** Whether the caller is an admin in their active session (the admin Edge Function asks this). */
create function public.am_i_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin()
$$;

-- ───────────────────────── who may call what ─────────────────────────
-- Functions are callable by PUBLIC (which anon belongs to) unless revoked, and
-- Supabase grants new tables to anon and authenticated by default: everything
-- here is for signed-in users only, as narrowly as it can be, and the helpers
-- for no one.

revoke execute on function
  public.claim_session(text, text), public.session_status(text), public.my_devices(),
  public.revoke_my_device(uuid), public.update_my_profile(text, text), public.log_event(text),
  public.ws_all(text), public.ws_get(text, text), public.ws_snapshot(), public.ws_batch(jsonb),
  public.admin_list_accounts(), public.admin_update_account(uuid, jsonb), public.admin_list_devices(uuid),
  public.admin_revoke_device(uuid), public.admin_audit(uuid, int), public.admin_log(uuid, text),
  public.admin_end_sessions(uuid), public.am_i_admin()
  from public, anon;
grant execute on function
  public.claim_session(text, text), public.session_status(text), public.my_devices(),
  public.revoke_my_device(uuid), public.update_my_profile(text, text), public.log_event(text),
  public.ws_all(text), public.ws_get(text, text), public.ws_snapshot(), public.ws_batch(jsonb),
  public.admin_list_accounts(), public.admin_update_account(uuid, jsonb), public.admin_list_devices(uuid),
  public.admin_revoke_device(uuid), public.admin_audit(uuid, int), public.admin_log(uuid, text),
  public.admin_end_sessions(uuid), public.am_i_admin()
  to authenticated;
revoke execute on function private.on_ws_client_deleted() from public;

-- the account tables are read through the functions above; nobody writes them directly
revoke all on public.profiles, public.devices, public.active_sessions, public.audit_log from anon, authenticated;
grant select on public.profiles, public.devices to authenticated;
-- the workspace tables: rows only, and only one's own (row level security)
revoke all on public.ws_clients, public.ws_readings, public.ws_attachments from anon, authenticated;
grant select, insert, update, delete on public.ws_clients, public.ws_readings, public.ws_attachments to authenticated;
