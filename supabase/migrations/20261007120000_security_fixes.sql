-- Security fixes from the audit of 2026-10-07 (supabase/tests/security.attack.test.js and
-- supabase/functions/admin-accounts/handler.attack.test.js prove each one).
--
-- 1. An account that has an authenticator works only after its code (aal2), on the data
--    itself, not only on the app's screens.
-- 2. Signing in signs the account's other logins out, in the database, so an old or stolen
--    login cannot claim the account back.
-- 3. The workspace is written only through ws_batch, so its quotas hold.
-- 4. The audit log takes at most 200 entries per account and action in an hour.
-- 5. Smaller ones: a signed-out token reads nothing, names and device labels lose every
--    invisible and direction character, the file cap counts every row, and an admin change
--    logs only what it applied.
--
-- No backslash escapes here on purpose: the character class in clean_text is built with chr().

-- ───────────────────────── 1. two-step verification on the data ─────────────────────────

/** True unless the caller's account has a verified authenticator and this session has not passed it. */
create function private.mfa_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
$$;
grant execute on function private.mfa_ok() to authenticated;

/** True when the caller's JWT is their account's active session, still signed in, past its second step, and the account is active. */
create or replace function private.session_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.signed_in() and private.mfa_ok() and exists (
    select 1
    from public.active_sessions s
    join public.profiles p on p.id = s.user_id
    where s.user_id = auth.uid()
      and s.session_id::text = coalesce(auth.jwt() ->> 'session_id', '')
      and p.status = 'active'
  )
$$;

-- ───────────────────────── 5. text cleaning ─────────────────────────

/**
 * Text without control, invisible or direction characters (so a name cannot hide a
 * right-to-left override in a list or on a report), trimmed and cut. The class covers
 * U+0001-001F, U+007F-009F, U+00AD, U+061C, U+180E, U+200B-200F, U+2028-202E,
 * U+2060-206F, U+FEFF, U+FFF9-FFFB and the tag characters U+E0000-E007F.
 */
create or replace function private.clean_text(p_text text, p_max int) returns text
language sql immutable set search_path = '' as $$
  select left(trim(regexp_replace(coalesce(p_text, ''),
    '[' || chr(1) || '-' || chr(31) || chr(127) || '-' || chr(159) || chr(173) || chr(1564) || chr(6158)
        || chr(8203) || '-' || chr(8207) || chr(8232) || '-' || chr(8238) || chr(8288) || '-' || chr(8303)
        || chr(65279) || chr(65529) || '-' || chr(65531) || chr(917504) || '-' || chr(917631) || ']',
    '', 'g')), p_max)
$$;

-- ───────────────────────── 4. the audit log ─────────────────────────

/** One audit entry; at most 200 per account and action in an hour, so a flood cannot bury the rest. */
create or replace function private.audit(p_user uuid, p_action text, p_detail jsonb default '{}') returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_user is not null and (
    select count(*) from public.audit_log where user_id = p_user and action = p_action and at > now() - interval '1 hour'
  ) >= 200 then
    return;
  end if;
  insert into public.audit_log (user_id, actor_id, action, detail) values (p_user, auth.uid(), p_action, coalesce(p_detail, '{}'));
end $$;

-- ───────────────────────── 1, 2 and 5. claiming a session ─────────────────────────

/**
 * Called right after signing in (and when the app opens with a saved login). Registers or
 * recognises this device, then makes this session the account's only active one, and signs
 * every other login of the account out. Returns {status} - ok, mfa_required, suspended,
 * device_revoked, device_limit or device_changes - and, when ok, the profile and device id.
 */
create or replace function public.claim_session(p_device_key text, p_label text default '') returns jsonb
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
  p_label := private.clean_text(p_label, 200); -- a label is shown to the admin and copied into the log
  if v_uid is null or v_session = '' or not private.signed_in() then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  -- an account with an authenticator is claimed only by a session that passed it
  if not private.mfa_ok() then
    return jsonb_build_object('status', 'mfa_required');
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
        perform private.audit(v_uid, 'device_refused', jsonb_build_object('reason', 'limit', 'label', p_label));
        return jsonb_build_object('status', 'device_limit', 'limit', v_profile.device_limit);
      end if;
      -- swapping devices again and again is how an account gets shared
      select count(*) into v_recent from public.devices where user_id = v_uid and created_at > now() - interval '30 days';
      if v_recent >= v_profile.device_limit + 3 then
        perform private.audit(v_uid, 'device_refused', jsonb_build_object('reason', 'changes', 'label', p_label));
        return jsonb_build_object('status', 'device_changes');
      end if;
    end if;
    insert into public.devices (user_id, device_key, label)
      values (v_uid, p_device_key, p_label)
      returning * into v_device;
    perform private.audit(v_uid, 'device_added', jsonb_build_object('device', v_device.id, 'label', v_device.label));
  else
    update public.devices set last_seen_at = now(), label = p_label
      where id = v_device.id;
  end if;

  select session_id::text into v_previous from public.active_sessions where user_id = v_uid;
  insert into public.active_sessions (user_id, session_id, device_id, claimed_at)
    values (v_uid, v_session::uuid, v_device.id, now())
    on conflict (user_id) do update
      set session_id = excluded.session_id, device_id = excluded.device_id, claimed_at = excluded.claimed_at;
  -- every other login of the account ends here, in the database: an app that never signs them out
  -- (or a copied login) does not keep them alive, and none of them can claim the account back
  delete from auth.sessions where user_id = v_uid and id <> v_session::uuid;
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

-- ───────────────────────── 3. the workspace: written only through ws_batch ─────────────────────────

revoke insert, update, delete on public.ws_clients, public.ws_readings, public.ws_attachments from authenticated;
drop policy "ws_clients: own, active session" on public.ws_clients;
drop policy "ws_readings: own, active session" on public.ws_readings;
drop policy "ws_attachments: own, active session" on public.ws_attachments;
create policy "ws_clients: read own, active session" on public.ws_clients for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.session_ok()));
create policy "ws_readings: read own, active session" on public.ws_readings for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.session_ok()));
create policy "ws_attachments: read own, active session" on public.ws_attachments for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.session_ok()));

/**
 * Applies puts and deletes as one transaction: all of them or none. It runs as its owner,
 * so every statement names the caller's own rows itself, and the quotas below hold: the
 * tables take no writes from anywhere else. One batch per account at a time.
 */
create or replace function public.ws_batch(p_ops jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_op jsonb;
  v_store text;
  v_n int := 0;
begin
  perform private.require_session();
  -- two parallel batches must not each pass the quota check, then both commit
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
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
          insert into public.ws_clients (owner_id, id, doc) values (v_uid, v_op -> 'value' ->> 'id', v_op -> 'value')
            on conflict (owner_id, id) do update set doc = excluded.doc;
        when 'readings' then
          insert into public.ws_readings (owner_id, id, doc) values (v_uid, v_op -> 'value' ->> 'id', v_op -> 'value')
            on conflict (owner_id, id) do update set doc = excluded.doc;
        when 'attachments' then
          insert into public.ws_attachments (owner_id, id, doc) values (v_uid, v_op -> 'value' ->> 'id', v_op -> 'value')
            on conflict (owner_id, id) do update set doc = excluded.doc;
        else raise exception 'unknown collection: %', v_store using errcode = '22023';
      end case;
    elsif v_op ->> 'type' = 'delete' then
      case v_store
        when 'clients' then delete from public.ws_clients where owner_id = v_uid and id = v_op ->> 'id';
        when 'readings' then delete from public.ws_readings where owner_id = v_uid and id = v_op ->> 'id';
        when 'attachments' then delete from public.ws_attachments where owner_id = v_uid and id = v_op ->> 'id';
        else raise exception 'unknown collection: %', v_store using errcode = '22023';
      end case;
    else
      raise exception 'unknown batch operation: %', v_op ->> 'type' using errcode = '22023';
    end if;
    v_n := v_n + 1;
  end loop;
  -- per-account quotas; over them, nothing of the batch is kept
  if (select count(*) from public.ws_clients where owner_id = v_uid) > 20000
    or (select count(*) from public.ws_readings where owner_id = v_uid) > 200000
    or (select count(*) from public.ws_attachments where owner_id = v_uid) > 10000
    or (select coalesce(sum(case when doc ->> 'size' ~ '^[0-9]{1,15}$' then (doc ->> 'size')::bigint else 0 end), 0)
        from public.ws_attachments where owner_id = v_uid) > 2147483648 then
    raise exception 'over the account quota' using errcode = '54000';
  end if;
  return jsonb_build_object('applied', v_n);
end $$;

-- ───────────────────────── 5. smaller ones ─────────────────────────

-- a signed-out token reads nothing, not even its own profile or devices
drop policy "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select to authenticated
  using (id = (select auth.uid()) and (select private.signed_in()));
drop policy "devices: read own" on public.devices;
create policy "devices: read own" on public.devices for select to authenticated
  using (user_id = (select auth.uid()) and (select private.signed_in()));

-- the 10000-file cap is counted for every row of a statement, not once per statement
alter function private.file_count() volatile;
drop policy "ws-files: own folder, active session" on storage.objects;
create policy "ws-files: own folder, active session" on storage.objects for all to authenticated
  using (bucket_id = 'ws-files' and name ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9_-]{1,100}$') and (select private.session_ok()))
  with check (bucket_id = 'ws-files' and name ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9_-]{1,100}$')
    and (select private.session_ok()) and private.file_count() < 10000);

/** Changes an account: name, phone, plan, device limit, role or status (suspending ends its session). */
create or replace function public.admin_update_account(p_user uuid, p_patch jsonb) returns jsonb
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
  -- the log holds what changed, never anything else the patch carried
  perform private.audit(p_user, 'account_updated', jsonb_strip_nulls(jsonb_build_object(
    'plan', p_patch -> 'plan', 'deviceLimit', p_patch -> 'deviceLimit', 'role', p_patch -> 'role', 'status', p_patch -> 'status')));
  return jsonb_build_object('status', 'ok');
end $$;
