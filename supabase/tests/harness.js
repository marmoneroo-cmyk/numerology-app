/**
 * Runs the real Supabase migrations in PGlite (Postgres in WebAssembly), over
 * a small stand-in for what Supabase provides itself: the anon and
 * authenticated roles, auth.users with auth.uid() and auth.jwt() (same
 * definitions as Supabase), and the storage tables the policies use. Each
 * call `as(user)` runs like a PostgREST request: one transaction, the
 * `authenticated` role, the user's JWT claims.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const MIGRATIONS = new URL("../migrations/", import.meta.url);

const SUPABASE_STAND_IN = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}', -- the user can change this one
    raw_app_meta_data jsonb not null default '{}',  -- only the server (secret key) can
    is_anonymous boolean not null default false
  );
  -- one row per signed-in session; Supabase deletes it on sign-out
  create table auth.sessions (
    id uuid primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
  );
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(auth.jwt() ->> 'sub', '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text not null,
    owner uuid default auth.uid(),
    unique (bucket_id, name)
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to authenticated;
  grant execute on all functions in schema storage to anon, authenticated, service_role;

  -- Supabase grants new public tables and functions to these roles by default
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
`;

/**
 * A fresh database with every migration applied.
 * @param {{beforeMigrations?: string}} [opts] SQL to run first, e.g. users that existed before
 */
export async function createDatabase({ beforeMigrations } = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE_STAND_IN);
  if (beforeMigrations) await db.exec(beforeMigrations);
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) await db.exec(readFileSync(new URL(f, MIGRATIONS), "utf8"));
  return db;
}

let sessionCounter = 0;
/** Signs `userId` in: a new row in auth.sessions, whose id Supabase puts in the JWT's `session_id` claim. */
export async function newSession(db, userId) {
  const id = `00000000-0000-4000-8000-${String(++sessionCounter).padStart(12, "0")}`;
  await db.query("insert into auth.sessions (id, user_id) values ($1, $2)", [id, userId]);
  return id;
}

/** Signs a session out, the way Supabase does: its row goes (its access token still exists). */
export async function endSession(db, sessionId) {
  await db.query("delete from auth.sessions where id = $1", [sessionId]);
}

/**
 * Creates a user the way Supabase Auth does (the profile comes from the trigger).
 * `provisioned` is what the admin Edge Function marks in the server-only app_metadata.
 */
export async function createUser(db, { email, fullName = "", phone = "", provisioned = true } = {}) {
  const { rows } = await db.query(
    "insert into auth.users (email, raw_user_meta_data, raw_app_meta_data) values ($1, $2, $3) returning id",
    [email ?? `user${++sessionCounter}@example.com`, JSON.stringify({ full_name: fullName, phone }), JSON.stringify(provisioned ? { provisioned: true } : {})],
  );
  return rows[0].id;
}

/**
 * Runs `fn(tx)` as `user` in session `sessionId`, like one PostgREST request.
 * `user.aal` is the session's assurance level: "aal2" after two-step verification.
 * @param {{id: string, sessionId: string, aal?: string} | null} user null = an anonymous request
 */
export function as(db, user, fn) {
  return db.transaction(async (tx) => {
    const claims = user ? { sub: user.id, role: "authenticated", session_id: user.sessionId, aal: user.aal ?? "aal1" } : { role: "anon" };
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await tx.exec(`set local role ${user ? "authenticated" : "anon"}`);
    return fn(tx);
  });
}

/** Calls a public function as `user`, like supabase.rpc(): resolves its JSON result. */
export async function rpc(db, user, name, args = {}) {
  const keys = Object.keys(args);
  const params = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
  const values = keys.map((k) => (args[k] !== null && typeof args[k] === "object" ? JSON.stringify(args[k]) : args[k]));
  return as(db, user, async (tx) => {
    const { rows } = await tx.query(`select to_jsonb(public.${name}(${params})) as result`, values);
    return rows[0].result;
  });
}

/** Makes `id` an admin directly in the database (what the owner does once, in the SQL editor). */
export async function makeAdmin(db, id) {
  await db.query("update public.profiles set role = 'admin' where id = $1", [id]);
}
