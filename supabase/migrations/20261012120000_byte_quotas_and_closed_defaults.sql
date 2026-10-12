-- After the security audit of 2026-10-12. Run once in the Supabase SQL editor, after the two earlier migrations.
--
-- 1. (MEDIUM) An account's quota counts bytes as well as rows. Up to now one account could keep 200,000 readings
--    of up to 256 KiB each (about 49 GiB) and 10,000 files of 20 MiB (195 GiB), and the 2 GiB check summed a size
--    the app itself writes. Now: up to 256 MiB of client and reading documents as stored, and no new file once the
--    files kept reach 2 GiB, by the size storage records on upload. Storage records a size only after the file is
--    written, so the last file let in, or a few uploads at the same moment, can pass 2 GiB by up to 20 MiB each.
--    The limits are two small functions, so the tests can lower them.
-- 2. (LOW) A table, sequence or function added to public later starts closed to anon and authenticated (and a
--    function to PUBLIC) until a migration grants it; Supabase's defaults would open it to everyone signed in.
--    From now on every new table or function needs its own grant.

-- ───────────────────────── 1. quotas in bytes ─────────────────────────

/** The most document bytes an account keeps: its clients' and readings' documents, as stored. 256 MiB. */
create function private.doc_quota_bytes() returns bigint
language sql stable set search_path = '' as $$ select 268435456::bigint $$;

/** The most file bytes an account keeps in the ws-files bucket. 2 GiB. */
create function private.file_quota_bytes() returns bigint
language sql stable set search_path = '' as $$ select 2147483648::bigint $$;

/** The bytes of the caller's files, by the size storage recorded on upload. Volatile: counted for every row written. */
create function private.file_bytes() returns bigint
language sql volatile security definer set search_path = '' as $$
  select coalesce(sum(case when metadata ->> 'size' ~ '^[0-9]{1,15}$' then (metadata ->> 'size')::bigint else 0 end), 0)
  from storage.objects where bucket_id = 'ws-files' and name like auth.uid()::text || '/%'
$$;

grant execute on function private.doc_quota_bytes(), private.file_quota_bytes(), private.file_bytes() to authenticated;

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
        from public.ws_attachments where owner_id = v_uid) > 2147483648
    or (select coalesce(sum(pg_column_size(doc)), 0) from public.ws_clients where owner_id = v_uid)
       + (select coalesce(sum(pg_column_size(doc)), 0) from public.ws_readings where owner_id = v_uid) > private.doc_quota_bytes() then
    raise exception 'over the account quota' using errcode = '54000';
  end if;
  return jsonb_build_object('applied', v_n);
end $$;

-- the files: at most 10,000, and no new one past 2 GiB by storage's own count (the file being uploaded is not counted
-- yet: see the top), for uploads made around the app as well
drop policy "ws-files: own folder, active session" on storage.objects;
create policy "ws-files: own folder, active session" on storage.objects for all to authenticated
  using (bucket_id = 'ws-files' and name ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9_-]{1,100}$') and (select private.session_ok()))
  with check (bucket_id = 'ws-files' and name ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9_-]{1,100}$')
    and (select private.session_ok()) and private.file_count() < 10000 and private.file_bytes() < private.file_quota_bytes());

-- ───────────────────────── 2. later objects start closed ─────────────────────────

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
-- everyone's right to run a new function is a global default, which a per-schema revoke cannot undo: it goes
-- globally, so a function added later in any schema (private included) needs its own grant
alter default privileges for role postgres revoke execute on functions from public;
