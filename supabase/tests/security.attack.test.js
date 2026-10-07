/*
 * The database security model, attacked. Every test here plays an adversary
 * against the real migrations in PGlite (see harness.js): a subscriber B after
 * subscriber A's data, sessions that no longer count, a non-admin or half-verified
 * admin after the admin functions, a user after more rights than they hold, and
 * an anonymous caller. A refusal only counts when the data is checked afterwards
 * from the database owner's side: "no error" and "no change" are different things.
 *
 * Fixed on 2026-10-07 (migration 20261007120000_security_fixes.sql and the app): every weakness this file
 * found now runs as a plain `it` that guards its fix; the comment above each test says what it was.
 *
 * `it.fails(...)` marks a weakness this audit found. Its body asserts the SECURE
 * behaviour, so it fails today; the suite stays green and the weakness stays
 * recorded. When a weakness is fixed in the migration, its test starts to pass,
 * vitest reports "Expect test to fail", and the `.fails` goes. To try a fix before
 * touching the migration: SECURITY_FIX_SQL=<file> npx vitest run <this file>
 * applies that SQL after the migrations (then every `it.fails` should be reported).
 *
 * Not here (PGlite has no such layer): JWT signature checking, Supabase Auth
 * settings, Realtime, GraphQL, and Storage's HTTP layer.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { createDatabase, createUser, newSession, endSession, as, rpc, makeAdmin } from "./harness.js";

// PGlite is slow on a busy machine and several attacks make hundreds of calls: a slow run must not look like a failed one
vi.setConfig({ testTimeout: 30000, hookTimeout: 60000 });

let db;
beforeAll(async () => {
  db = await createDatabase();
  if (process.env.SECURITY_FIX_SQL) await db.exec(readFileSync(process.env.SECURITY_FIX_SQL, "utf8"));
}, 60000);

// ------------------------- people and tools -------------------------

let keyCounter = 0;
const newKey = () => `attack-device-${String(++keyCounter).padStart(8, "0")}-abcdef`;
const char = (cp) => String.fromCodePoint(cp);
const codePoints = (from, to = from) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** A subscriber signed in on a new device, holding the active session. */
async function signedIn(opts = {}) {
  const id = await createUser(db, opts);
  const user = { id, sessionId: await newSession(db, id), deviceKey: newKey() };
  const claimed = await rpc(db, user, "claim_session", { p_device_key: user.deviceKey, p_label: "Chrome" });
  expect(claimed.status).toBe("ok");
  return { ...user, deviceId: claimed.deviceId };
}
/** An admin in their active session, verified in two steps (aal2). */
async function signedInAdmin() {
  const admin = await signedIn();
  await makeAdmin(db, admin.id);
  return { ...admin, aal: "aal2" };
}
/** Another session of the same account, on a device of its own (or the given one). */
const otherSession = async (user, key = newKey()) => ({ id: user.id, sessionId: await newSession(db, user.id), deviceKey: key, aal: user.aal });
const claim = (user, label = "Safari") => rpc(db, user, "claim_session", { p_device_key: user.deviceKey, p_label: label });
const put = (store, value) => ({ type: "put", store, value });
const del = (store, id) => ({ type: "delete", store, id });
/** The message of the error a call ends with, or "no error". */
const failure = async (promise) => {
  try {
    await promise;
  } catch (e) {
    return e.message;
  }
  return "no error";
};
/** One statement as `user`, like one PostgREST request. */
const sql = (user, text, args) => as(db, user, (tx) => tx.query(text, args));
const rowsAs = async (user, text, args) => (await sql(user, text, args)).rows;
/** How many rows a write statement changed as `user`: 0 when the database refuses it outright (that is no change either). */
const rowsChanged = async (user, text, args) => {
  try {
    return (await sql(user, text, args)).affectedRows ?? 0;
  } catch (e) {
    if (/row-level security|permission denied/.test(e.message)) return 0;
    throw e;
  }
};
/** The truth, read as the database owner (row level security does not apply). */
const truth = async (text, args) => (await db.query(text, args)).rows;
/** How many rows a statement reaches when row level security is out of the way; the statement is rolled back. */
async function reach(text, args) {
  let hits = 0;
  await db.transaction(async (tx) => {
    hits = (await tx.query(text, args)).affectedRows;
    await tx.rollback();
  });
  return hits;
}
/** A request carrying exactly these claims (a string: it may even be invalid JSON), as the given database role. */
const asClaims = (claims, fn, role = "authenticated") =>
  db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [claims]);
    await tx.exec(`set local role ${role}`);
    return fn(tx);
  });
const claimsOf = (user, extra = {}) => JSON.stringify({ sub: user.id, role: "authenticated", session_id: user.sessionId, aal: user.aal ?? "aal1", ...extra });

const stateOf = async (id) => ({
  profile: await truth("select * from public.profiles where id = $1", [id]),
  devices: await truth("select id, device_key, label, status, revoked_at from public.devices where user_id = $1 order by device_key", [id]),
  active: await truth("select * from public.active_sessions where user_id = $1", [id]),
  sessions: await truth("select id from auth.sessions where user_id = $1 order by id", [id]),
  audit: (await truth("select count(*)::int n from public.audit_log where user_id = $1", [id]))[0].n,
});
const TABLES = { clients: "ws_clients", readings: "ws_readings", attachments: "ws_attachments" };
const rowsOf = (table, owner) => truth(`select id, doc from public.${table} where owner_id = $1 order by id`, [owner]);
const countOf = async (table, owner) => (await truth(`select count(*)::int n from public.${table} where owner_id = $1`, [owner]))[0].n;
const filesOf = async (id) => (await truth("select name from storage.objects where bucket_id = 'ws-files' and name like $1 order by name", [`${id}/%`])).map((r) => r.name);
const workspaceOf = async (id) => ({
  clients: await rowsOf("ws_clients", id),
  readings: await rowsOf("ws_readings", id),
  attachments: await rowsOf("ws_attachments", id),
  files: await filesOf(id),
});
const auditCount = async (id, action) => (await truth("select count(*)::int n from public.audit_log where user_id = $1 and action = $2", [id, action]))[0].n;
/** Records and a file for a user, written by the database owner so the user's own state does not matter. */
async function seedAsOwner(id) {
  await db.query(`insert into public.ws_clients (owner_id, id, doc) values ($1, 'c1', '{"id":"c1","secret":"S-clients"}')`, [id]);
  await db.query(`insert into public.ws_readings (owner_id, id, doc) values ($1, 'r1', '{"id":"r1","secret":"S-readings"}')`, [id]);
  await db.query(`insert into public.ws_attachments (owner_id, id, doc) values ($1, 'f1', '{"id":"f1","secret":"S-attachments"}')`, [id]);
  await db.query("insert into storage.objects (bucket_id, name) values ('ws-files', $1)", [`${id}/f1`]);
}

// ------------------------- inventory, read from the catalog -------------------------

describe("inventory: who may reach what", () => {
  it("row level security is on for every table in public and for storage.objects", async () => {
    const rows = await truth(`select n.nspname || '.' || c.relname as t, c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where (n.nspname = 'public' and c.relkind in ('r', 'p')) or (n.nspname = 'storage' and c.relname = 'objects') order by 1`);
    // a new table has to be added here on purpose: it must not appear without row level security being thought about
    expect(rows.map((r) => r.t)).toEqual([
      "public.active_sessions", "public.audit_log", "public.devices", "public.profiles",
      "public.ws_attachments", "public.ws_clients", "public.ws_readings", "storage.objects",
    ]);
    expect(rows.filter((r) => !r.rls)).toEqual([]);
  });

  it("anon holds no privilege on any table or function in public, and none on schema private", async () => {
    expect(await truth(`select c.relname, p from pg_class c, unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
      where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','v','m','f') and has_table_privilege('anon', c.oid, p)`)).toEqual([]);
    expect(await truth("select proname from pg_proc where pronamespace = 'public'::regnamespace and has_function_privilege('anon', oid, 'EXECUTE')")).toEqual([]);
    expect((await truth("select has_schema_privilege('anon', 'private', 'USAGE') as usage"))[0].usage).toBe(false);
  });

  it("authenticated cannot write the account tables, cannot read active_sessions or audit_log, and holds no TRUNCATE, REFERENCES or TRIGGER anywhere", async () => {
    const held = async (table) => (await truth(`select p from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p where has_table_privilege('authenticated', 'public.${table}', p) order by 1`)).map((r) => r.p);
    expect(await held("active_sessions")).toEqual([]);
    expect(await held("audit_log")).toEqual([]);
    expect(await held("profiles")).toEqual(["SELECT"]);
    expect(await held("devices")).toEqual(["SELECT"]);
    for (const table of Object.values(TABLES)) {
      const privileges = await held(table);
      expect(privileges).toContain("SELECT");
      expect(privileges.filter((p) => !["SELECT", "INSERT", "UPDATE", "DELETE"].includes(p))).toEqual([]);
    }
  });

  it("authenticated can execute only the private helpers that report on the caller, never the ones that write", async () => {
    const reachable = (await truth("select proname from pg_proc where pronamespace = 'private'::regnamespace and has_function_privilege('authenticated', oid, 'EXECUTE') order by 1")).map((r) => r.proname);
    expect(reachable).toEqual(["clean_text", "file_count", "initial_status", "is_admin", "mfa_ok", "require_admin", "require_session", "session_ok", "signed_in"]);
    const victim = await signedIn();
    const caller = await signedIn();
    const before = await stateOf(victim.id);
    for (const [text, args] of [
      ["select private.audit($1, 'device_revoked', '{}')", [victim.id]],
      ["select private.end_sessions($1, null)", [victim.id]],
      ["select private.on_auth_user_created()", []],
    ]) expect(await failure(sql(caller, text, args)), text).toMatch(/permission denied for function/);
    expect(await stateOf(victim.id)).toEqual(before);
  });

  it("authenticated and anon can create or replace nothing: no function or table to shadow or take over a real one", async () => {
    const caller = await signedIn();
    for (const text of [
      "create function public.evil() returns int language sql as 'select 1'", "create table public.evil (i int)", "create function private.evil() returns int language sql as 'select 1'",
      "create table private.evil (i int)", "create schema evil", "create or replace function public.ws_all(text) returns jsonb language sql as $$ select '[]'::jsonb $$",
      "create or replace function private.session_ok() returns boolean language sql as 'select true'", "alter function private.session_ok() set search_path = public",
    ]) {
      expect(await failure(sql(caller, text)), text).toMatch(/permission denied|must be owner/);
      expect(await failure(sql(null, text)), `anon: ${text}`).toMatch(/permission denied|must be owner/);
    }
  });

  it("every function in public and private pins search_path to empty (no search-path hijack)", async () => {
    const loose = await truth(`select n.nspname || '.' || p.proname as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private') and not ('search_path=""' = any (coalesce(p.proconfig, '{}'))) order by 1`);
    expect(loose).toEqual([]);
  });

  it("the ws-files bucket is private and size-limited, and the migration's own statement puts it back that way", async () => {
    const bucket = async () => (await truth("select public, file_size_limit from storage.buckets where id = 'ws-files'"))[0];
    expect(await bucket()).toEqual({ public: false, file_size_limit: 20971520 });
    const migrations = new URL("../migrations/", import.meta.url);
    const all = readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort().map((f) => readFileSync(new URL(f, migrations), "utf8")).join("\n");
    const statement = all.match(/insert into storage\.buckets[\s\S]*?;/)[0];
    await db.query("update storage.buckets set public = true, file_size_limit = 1 where id = 'ws-files'");
    await db.exec(statement);
    expect(await bucket()).toEqual({ public: false, file_size_limit: 20971520 });
  });
});

// ------------------------- anon -------------------------

describe("anonymous callers", () => {
  const functionCalls = () => truth(`select p.proname, format('select public.%I(%s)', p.proname,
      coalesce((select string_agg('null::' || format_type(t.typ, null), ', ' order by t.n) from unnest(p.proargtypes::oid[]) with ordinality as t(typ, n)), '')) as call
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' order by 1`);

  it("every function in public is refused", async () => {
    const calls = await functionCalls();
    expect(calls.length).toBeGreaterThanOrEqual(18);
    for (const { proname, call } of calls) {
      expect(await failure(sql(null, call)), proname).toMatch(/permission denied for function/);
    }
  });

  it("every table in public is refused for reading and for every kind of write", async () => {
    const tables = await truth(`select c.relname, (select a.attname from pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped and a.attidentity = '' and a.attgenerated = '' order by a.attnum limit 1) as col
      from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','v','m','f') order by 1`);
    expect(tables.length).toBe(7);
    for (const { relname: t, col } of tables) {
      for (const statement of [`select * from public.${t}`, `insert into public.${t} default values`, `update public.${t} set ${col} = ${col}`, `delete from public.${t}`, `truncate public.${t}`]) {
        expect(await failure(sql(null, statement)), statement).toMatch(/permission denied for table/);
      }
    }
  });

  it("storage.objects shows nothing and takes nothing, and schema private is out of reach", async () => {
    const a = await signedIn();
    await seedAsOwner(a.id);
    const read = await failure(sql(null, "select name from storage.objects"));
    if (read !== "no error") expect(read).toMatch(/permission denied/);
    else expect(await rowsAs(null, "select name from storage.objects")).toEqual([]);
    expect(await failure(sql(null, "insert into storage.objects (bucket_id, name) values ('ws-files', $1)", [`${a.id}/anon`]))).toMatch(/permission denied|row-level security/);
    expect(await failure(sql(null, "select private.session_ok()"))).toMatch(/permission denied for schema private/);
    expect(await filesOf(a.id)).toEqual([`${a.id}/f1`]);
  });

  it("a request in the anon role that carries a real user's claims still gets nothing", async () => {
    const a = await signedIn();
    await seedAsOwner(a.id);
    const forged = claimsOf(a, { role: "anon" });
    expect(await failure(asClaims(forged, (tx) => tx.query("select public.ws_all('clients')"), "anon"))).toMatch(/permission denied for function/);
    expect(await failure(asClaims(forged, (tx) => tx.query("select * from public.ws_clients"), "anon"))).toMatch(/permission denied for table/);
    expect(await failure(asClaims(forged, (tx) => tx.query("select * from public.profiles"), "anon"))).toMatch(/permission denied for table/);
  });
});

// ------------------------- B against A, in the workspace tables -------------------------

describe.each(Object.entries(TABLES))("account B against account A: %s", (store, table) => {
  /** A holds "shared" and "a-only", B holds "shared" (same id, different content) and "b-only". */
  async function pair() {
    const a = await signedIn();
    const b = await signedIn();
    await rpc(db, a, "ws_batch", { p_ops: [put(store, { id: "shared", note: "A-secret" }), put(store, { id: "a-only", note: "A-secret" })] });
    await rpc(db, b, "ws_batch", { p_ops: [put(store, { id: "shared", note: "B-note" }), put(store, { id: "b-only", note: "B-note" })] });
    return { a, b, aRows: await rowsOf(table, a.id), bRows: await rowsOf(table, b.id) };
  }
  const refusedOrNoEffect = /row-level security|permission denied|no error/;

  it("B reads none of A's rows, whatever the filter", async () => {
    const { a, b } = await pair();
    for (const [text, args] of [
      [`select * from public.${table}`, []],
      [`select * from public.${table} where owner_id = $1`, [a.id]],
      [`select * from public.${table} where id = 'a-only'`, []],
      [`select doc from public.${table} where doc ->> 'note' = 'A-secret'`, []],
      [`select doc from public.${table} where owner_id <> $1`, [b.id]],
      [`select count(*)::int as n from public.${table} where owner_id = $1`, [a.id]],
    ]) {
      const seen = await rowsAs(b, text, args);
      expect(JSON.stringify(seen), text).not.toContain("A-secret");
      expect(JSON.stringify(seen), text).not.toContain(a.id);
    }
    expect((await rowsAs(b, `select count(*)::int as n from public.${table}`))[0].n).toBe(2);
  });

  it("B cannot change A's rows (every statement either is refused or reaches nothing of A's)", async () => {
    const { a, b, aRows } = await pair();
    const hack = "doc = jsonb_build_object('id', id, 'note', 'HACKED')";
    for (const [text, args] of [
      [`update public.${table} set ${hack} where owner_id = $1`, [a.id]],
      [`update public.${table} set ${hack} where id = 'a-only'`, []],
      [`update public.${table} set ${hack}`, []],
      [`update public.${table} set ${hack} where owner_id <> $1`, [b.id]],
    ]) {
      expect(await reach(text, args), `the attack must be real: ${text}`).toBeGreaterThan(0);
      expect(await failure(sql(b, text, args)), text).toMatch(refusedOrNoEffect);
    }
    expect(await rowsOf(table, a.id)).toEqual(aRows);
  });

  it("B cannot delete A's rows", async () => {
    const { a, b, aRows } = await pair();
    for (const [text, args] of [
      [`delete from public.${table} where owner_id = $1`, [a.id]],
      [`delete from public.${table} where id = 'a-only'`, []],
      [`delete from public.${table}`, []],
    ]) {
      expect(await reach(text, args), `the attack must be real: ${text}`).toBeGreaterThan(0);
      expect(await failure(sql(b, text, args)), text).toMatch(refusedOrNoEffect);
    }
    expect(await rowsOf(table, a.id)).toEqual(aRows);
  });

  it("B cannot write a row into A's account", async () => {
    const { a, b, aRows } = await pair();
    for (const [text, args] of [
      [`insert into public.${table} (owner_id, id, doc) values ($1, 'planted', '{"id":"planted"}')`, [a.id]],
      [`insert into public.${table} (owner_id, id, doc) values ($1, 'shared', '{"id":"shared","note":"HACKED"}') on conflict (owner_id, id) do update set doc = excluded.doc`, [a.id]],
      [`insert into public.${table} (owner_id, id, doc) values ($1, 'shared', '{"id":"shared"}') on conflict do nothing`, [a.id]],
      [`insert into public.${table} (owner_id, id, doc) values (null, 'planted', '{"id":"planted"}')`, []],
    ]) {
      expect(await failure(sql(b, text, args)), text).toMatch(/row-level security|permission denied/);
    }
    expect(await rowsOf(table, a.id)).toEqual(aRows);
    expect(await countOf(table, b.id)).toBe(2);
  });

  it("B cannot hand a row to A, or take one from A, by changing owner_id", async () => {
    const { a, b, aRows, bRows } = await pair();
    expect(await reach(`update public.${table} set owner_id = $1 where owner_id = $2 and id = 'a-only'`, [b.id, a.id])).toBe(1); // the move is real
    for (const [text, args] of [
      [`update public.${table} set owner_id = $1 where id = 'b-only'`, [a.id]],
      [`update public.${table} set owner_id = $1 where owner_id = $2`, [a.id, b.id]],
    ]) expect(await failure(sql(b, text, args)), text).toMatch(/row-level security|permission denied/);
    expect(await failure(sql(b, `update public.${table} set owner_id = $1 where owner_id = $2 and id = 'a-only'`, [b.id, a.id]))).toMatch(refusedOrNoEffect);
    expect(await rowsOf(table, a.id)).toEqual(aRows);
    expect(await rowsOf(table, b.id)).toEqual(bRows);
  });

  it("the refusal does not tell B which accounts exist, and TRUNCATE is refused", async () => {
    const { a, b } = await pair();
    const ghost = "00000000-0000-4000-8000-0000000000ff";
    const attempt = (owner) => failure(sql(b, `insert into public.${table} (owner_id, id, doc) values ($1, 'z', '{"id":"z"}')`, [owner]));
    expect(await attempt(ghost)).toBe(await attempt(a.id));
    expect(await failure(sql(b, `truncate public.${table}`))).toMatch(/permission denied/);
  });

  it("through the functions B sees only B's records, and the same id in both accounts stays two records", async () => {
    const { a, b } = await pair();
    expect((await rpc(db, b, "ws_all", { p_store: store })).map((d) => d.id).sort()).toEqual(["b-only", "shared"]);
    expect(JSON.stringify(await rpc(db, b, "ws_all", { p_store: store }))).not.toContain("A-secret");
    expect(await rpc(db, a, "ws_all", { p_store: store })).toHaveLength(2);
    expect(await rpc(db, b, "ws_get", { p_store: store, p_id: "a-only" })).toBeNull();
    expect(await rpc(db, b, "ws_get", { p_store: store, p_id: "shared" })).toEqual({ id: "shared", note: "B-note" });
    expect(await rpc(db, a, "ws_get", { p_store: store, p_id: "shared" })).toEqual({ id: "shared", note: "A-secret" });
    expect(JSON.stringify(await rpc(db, b, "ws_snapshot"))).not.toContain("A-secret");
  });

  it("B's batches delete and replace only B's own records, even when they name A's ids", async () => {
    const { a, b, aRows } = await pair();
    await rpc(db, b, "ws_batch", { p_ops: [del(store, "a-only"), del(store, "shared"), put(store, { id: "a-only", note: "B-planted", owner_id: a.id })] });
    expect(await rowsOf(table, a.id)).toEqual(aRows);
    expect(await rowsOf(table, b.id)).toEqual([
      { id: "a-only", doc: { id: "a-only", note: "B-planted", owner_id: a.id } },
      { id: "b-only", doc: { id: "b-only", note: "B-note" } },
    ]);
    await rpc(db, b, "ws_batch", { p_ops: [put(store, { id: "shared", note: "B-rewrite" })] });
    expect(await rpc(db, a, "ws_get", { p_store: store, p_id: "shared" })).toEqual({ id: "shared", note: "A-secret" });
  });
});

// ------------------------- sessions that no longer count -------------------------

const DEAD = [
  "replaced by a newer sign-in",
  "signed out",
  "suspended (flag only, session rows kept)",
  "suspended by an admin",
  "device revoked by an admin",
  "signed in but never claimed",
];
async function deadUser(kind) {
  if (kind === "signed in but never claimed") {
    const id = await createUser(db, {});
    await seedAsOwner(id);
    return { id, sessionId: await newSession(db, id), deviceKey: newKey() };
  }
  const user = await signedIn();
  await seedAsOwner(user.id);
  if (kind === "replaced by a newer sign-in") await claim(await otherSession(user));
  if (kind === "signed out") await endSession(db, user.sessionId);
  if (kind === "suspended (flag only, session rows kept)") await db.query("update public.profiles set status = 'suspended' where id = $1", [user.id]);
  if (kind === "suspended by an admin") await rpc(db, await signedInAdmin(), "admin_update_account", { p_user: user.id, p_patch: { status: "suspended" } });
  if (kind === "device revoked by an admin") await rpc(db, await signedInAdmin(), "admin_revoke_device", { p_device: user.deviceId });
  return user;
}

describe.each(DEAD)("a session that is %s", (kind) => {
  let user;
  let before;
  beforeAll(async () => {
    user = await deadUser(kind);
    before = await workspaceOf(user.id);
    expect(before.clients).toHaveLength(1); // there is something to protect
  });

  it("reads nothing through the functions", async () => {
    for (const store of Object.keys(TABLES)) {
      expect(await failure(rpc(db, user, "ws_all", { p_store: store })), store).toMatch(/session not active/);
      expect(await failure(rpc(db, user, "ws_get", { p_store: store, p_id: "c1" })), store).toMatch(/session not active/);
    }
    expect(await failure(rpc(db, user, "ws_snapshot"))).toMatch(/session not active/);
  });

  it("writes nothing through the functions", async () => {
    expect(await failure(rpc(db, user, "ws_batch", { p_ops: [put("clients", { id: "new" })] }))).toMatch(/session not active/);
    expect(await failure(rpc(db, user, "ws_batch", { p_ops: [put("clients", { id: "c1", secret: "CHANGED" })] }))).toMatch(/session not active/);
    expect(await failure(rpc(db, user, "ws_batch", { p_ops: [del("clients", "c1"), del("readings", "r1")] }))).toMatch(/session not active/);
    expect(await workspaceOf(user.id)).toEqual(before);
  });

  it("sees and changes nothing directly in the tables", async () => {
    for (const table of Object.values(TABLES)) {
      expect(await rowsAs(user, `select * from public.${table}`), table).toEqual([]);
      expect(await failure(sql(user, `insert into public.${table} (id, doc) values ('new', '{"id":"new"}')`)), table).toMatch(/row-level security|permission denied/);
      expect(await rowsChanged(user, `update public.${table} set doc = jsonb_build_object('id', id, 'secret', 'CHANGED')`), table).toBe(0);
      expect(await rowsChanged(user, `delete from public.${table}`), table).toBe(0);
    }
    expect(await workspaceOf(user.id)).toEqual(before);
  });

  it("cannot touch files", async () => {
    expect(await rowsAs(user, "select name from storage.objects")).toEqual([]);
    expect(await failure(sql(user, "insert into storage.objects (bucket_id, name) values ('ws-files', $1)", [`${user.id}/new`]))).toMatch(/row-level security/);
    expect((await sql(user, "update storage.objects set name = name || 'x'")).affectedRows).toBe(0);
    expect((await sql(user, "delete from storage.objects")).affectedRows).toBe(0);
    expect(await workspaceOf(user.id)).toEqual(before);
  });

  it("cannot use the account functions", async () => {
    const profile = await truth("select * from public.profiles where id = $1", [user.id]);
    const audit = (await stateOf(user.id)).audit;
    expect(await rpc(db, user, "my_devices")).toEqual([]);
    expect(await failure(rpc(db, user, "revoke_my_device", { p_device: "00000000-0000-4000-8000-0000000000aa" }))).toMatch(/session not active/);
    expect(await failure(rpc(db, user, "update_my_profile", { p_full_name: "Changed", p_phone: "1" }))).toMatch(/session not active/);
    expect(await failure(rpc(db, user, "log_event", { p_action: "backup_exported" }))).toMatch(/session not active/);
    expect(await truth("select * from public.profiles where id = $1", [user.id])).toEqual(profile);
    expect((await stateOf(user.id)).audit).toBe(audit);
  });
});

// ------------------------- profiles -------------------------

describe("profiles", () => {
  it("a subscriber cannot insert, update or delete a profile, so role, plan, status and device limit cannot move", async () => {
    const a = await signedIn();
    const b = await signedIn();
    const before = await truth("select * from public.profiles where id = any($1::uuid[]) order by id", [`{${a.id},${b.id}}`]);
    const attacks = [
      ["update public.profiles set role = 'admin' where id = $1", [a.id]],
      ["update public.profiles set plan = 'founder', device_limit = 5, status = 'active' where id = $1", [a.id]],
      ["update public.profiles set email = 'x@example.com', full_name = 'x' where id = $1", [a.id]],
      ["update public.profiles set id = gen_random_uuid() where id = $1", [a.id]],
      ["update public.profiles set role = 'admin'", []],
      ["update public.profiles set full_name = 'hacked' where id = $1", [b.id]],
      ["insert into public.profiles (id, role, status) values (gen_random_uuid(), 'admin', 'active')", []],
      ["insert into public.profiles (id) values ($1) on conflict (id) do update set role = 'admin'", [a.id]],
      ["delete from public.profiles where id = $1", [a.id]],
      ["delete from public.profiles", []],
      ["truncate public.profiles", []],
      ["select * from public.profiles for update", []],
    ];
    for (const [text, args] of attacks) expect(await failure(sql(a, text, args)), text).toMatch(/permission denied for table profiles/);
    expect(await truth("select * from public.profiles where id = any($1::uuid[]) order by id", [`{${a.id},${b.id}}`])).toEqual(before);
  });

  it("a subscriber reads only their own profile: not by id, not by email, not by count", async () => {
    const a = await signedIn({ fullName: "Alef" });
    const b = await signedIn({ fullName: "Bet" });
    for (const [text, args] of [
      ["select * from public.profiles where id = $1", [b.id]],
      ["select * from public.profiles where full_name = 'Bet'", []],
      ["select * from public.profiles where role = 'admin' or id <> $1", [a.id]],
    ]) expect(await rowsAs(a, text, args), text).toEqual([]);
    expect((await rowsAs(a, "select count(*)::int as n from public.profiles"))[0].n).toBe(1);
  });

  it("update_my_profile changes the name and the phone and nothing else", async () => {
    const a = await signedIn();
    const before = (await truth("select * from public.profiles where id = $1", [a.id]))[0];
    expect(await rpc(db, a, "update_my_profile", { p_full_name: "  New Name  ", p_phone: " 052-1 " })).toEqual({ status: "ok" });
    const after = (await truth("select * from public.profiles where id = $1", [a.id]))[0];
    expect(after).toEqual({ ...before, full_name: "New Name", phone: "052-1" });
  });

  it("update_my_profile truncates to 120 and 25 characters, and a SQL-looking name is plain text", async () => {
    const a = await signedIn();
    await rpc(db, a, "update_my_profile", { p_full_name: "x".repeat(500), p_phone: "9".repeat(500) });
    let [row] = await truth("select full_name, phone from public.profiles where id = $1", [a.id]);
    expect([row.full_name.length, row.phone.length]).toEqual([120, 25]);
    const evil = "Robert'); DROP TABLE public.profiles;--";
    await rpc(db, a, "update_my_profile", { p_full_name: evil, p_phone: "' or 1=1 --" });
    [row] = await truth("select full_name, phone from public.profiles where id = $1", [a.id]);
    expect(row).toEqual({ full_name: evil, phone: "' or 1=1 --" });
    expect((await truth("select count(*)::int n from public.profiles where id = $1", [a.id]))[0].n).toBe(1);
  });

  it("update_my_profile strips every control and direction character the migration lists", async () => {
    const a = await signedIn();
    const listed = [...codePoints(0x01, 0x1f), ...codePoints(0x7f, 0x9f), ...codePoints(0x200b, 0x200f), ...codePoints(0x202a, 0x202e), ...codePoints(0x2060, 0x2069), 0xfeff];
    const everything = listed.map((cp) => `a${char(cp)}`).join("");
    await rpc(db, a, "update_my_profile", { p_full_name: `${everything}z`, p_phone: `0${listed.map(char).join("5")}` });
    const [row] = await truth("select full_name, phone from public.profiles where id = $1", [a.id]);
    expect(row.full_name).toBe(`${"a".repeat(listed.length)}z`.slice(0, 120));
    expect(row.phone).toBe(`0${"5".repeat(listed.length - 1)}`.slice(0, 25));
  });
});

// ------------------------- devices, active_sessions, audit_log -------------------------

describe("devices, active_sessions and audit_log", () => {
  it("no direct writes, by anyone: a user cannot un-revoke a device, free a place, take over a session or erase the log", async () => {
    const user = await signedIn();
    const second = await otherSession(user);
    const secondClaim = await claim(second); // device 2, now the active one
    const back = await otherSession(user, user.deviceKey);
    await claim(back); // device 1 again; device 2 is approved and idle
    const admin = await signedInAdmin();
    await rpc(db, admin, "admin_revoke_device", { p_device: secondClaim.deviceId });
    const before = await stateOf(user.id);
    const attacks = [
      "update public.devices set status = 'approved', revoked_at = null",
      "delete from public.devices",
      "insert into public.devices (user_id, device_key) values (auth.uid(), 'forged-device-key-0000001')",
      "update public.active_sessions set session_id = gen_random_uuid()",
      "delete from public.active_sessions",
      "insert into public.active_sessions (user_id, session_id) values (auth.uid(), gen_random_uuid())",
      "delete from public.audit_log",
      "update public.audit_log set action = 'nothing'",
      "insert into public.audit_log (user_id, action) values (auth.uid(), 'backup_exported')",
      "truncate public.devices, public.active_sessions, public.audit_log",
    ];
    for (const text of attacks) expect(await failure(sql(back, text)), text).toMatch(/permission denied for table/);
    expect(await stateOf(user.id)).toEqual(before);
    expect(await claim(await otherSession(user, second.deviceKey))).toEqual({ status: "device_revoked" });
  });

  it("active_sessions and audit_log cannot be read at all by a subscriber", async () => {
    const user = await signedIn();
    for (const table of ["active_sessions", "audit_log"]) {
      expect(await failure(sql(user, `select * from public.${table}`))).toMatch(/permission denied for table/);
      expect(await failure(sql(user, `select count(*) from public.${table}`))).toMatch(/permission denied for table/);
    }
  });

  it("a subscriber's device list holds their own devices only", async () => {
    const a = await signedIn();
    const b = await signedIn();
    expect((await rowsAs(a, "select user_id from public.devices")).map((r) => r.user_id)).toEqual([a.id]);
    expect(await rowsAs(a, "select * from public.devices where user_id = $1", [b.id])).toEqual([]);
    expect(JSON.stringify(await rpc(db, a, "my_devices"))).not.toContain(b.deviceId);
  });

  it("revoke_my_device cannot revoke another account's device, and the refusal looks like a missing device", async () => {
    const a = await signedIn();
    const idle = await otherSession(a);
    const idleClaim = await claim(idle);
    const back = await otherSession(a, a.deviceKey);
    await claim(back); // A is back on the first device, in a new session; the second device is idle
    const b = await signedIn();
    const before = await stateOf(a.id);
    const missing = await failure(rpc(db, b, "revoke_my_device", { p_device: "00000000-0000-4000-8000-0000000000bb" }));
    for (const device of [a.deviceId, idleClaim.deviceId]) {
      expect(await failure(rpc(db, b, "revoke_my_device", { p_device: device }))).toBe(missing);
    }
    expect(missing).toMatch(/no such device/);
    expect(await stateOf(a.id)).toEqual(before);
    expect(await rpc(db, back, "session_status", { p_device_key: a.deviceKey })).toEqual({ status: "ok" });
  });

  it("a subscriber cannot revoke the device in use, so an account cannot sign its own session out of its data", async () => {
    const user = await signedIn();
    const before = await stateOf(user.id);
    expect(await failure(rpc(db, user, "revoke_my_device", { p_device: user.deviceId }))).toMatch(/device in use/);
    expect(await stateOf(user.id)).toEqual(before);
    expect(await rpc(db, user, "ws_all", { p_store: "clients" })).toEqual([]);
  });

  it("a device key counts once per account: the same key cannot be stored twice, so it cannot count twice against the limit", async () => {
    const a = await signedIn();
    expect(await failure(db.query("insert into public.devices (user_id, device_key) values ($1, $2)", [a.id, a.deviceKey]))).toMatch(/duplicate key|unique/);
    expect((await truth("select count(*)::int n from public.devices where user_id = $1", [a.id]))[0].n).toBe(1);
  });

  it("session_status does not reveal whether someone else's device key is revoked", async () => {
    const a = await signedIn();
    const b = await signedIn();
    await rpc(db, await signedInAdmin(), "admin_revoke_device", { p_device: a.deviceId });
    expect(await rpc(db, a, "session_status", { p_device_key: a.deviceKey })).toEqual({ status: "device_revoked" });
    expect(await rpc(db, b, "session_status", { p_device_key: a.deviceKey })).toEqual({ status: "ok" });
  });
});

// ------------------------- admin functions -------------------------

const adminCalls = (victim) => ({
  admin_list_accounts: {},
  admin_update_account: { p_user: victim.id, p_patch: { status: "suspended", role: "admin", plan: "founder", deviceLimit: 5, fullName: "pwned" } },
  admin_end_sessions: { p_user: victim.id },
  admin_list_devices: { p_user: victim.id },
  admin_revoke_device: { p_device: victim.deviceId },
  admin_audit: { p_user: victim.id, p_limit: 1000 },
  admin_log: { p_user: victim.id, p_action: "password_set" },
});
const NOT_ADMINS = [
  "subscriber, aal1",
  "subscriber, aal2",
  "admin, only aal1",
  "admin, session replaced",
  "admin, signed out",
  "admin, suspended (flag only)",
  "admin, suspended by another admin",
  "admin, demoted but holding an old aal2 token",
  "admin, signed in but never claimed",
];

describe("admin functions", () => {
  let cast;
  let victim;
  let boss;
  beforeAll(async () => {
    boss = await signedInAdmin();
    victim = await signedIn();
    const subscriber = await signedIn();
    const replaced = await signedInAdmin();
    await claim(await otherSession(replaced));
    const signedOut = await signedInAdmin();
    await endSession(db, signedOut.sessionId);
    const flagged = await signedInAdmin();
    await db.query("update public.profiles set status = 'suspended' where id = $1", [flagged.id]);
    const suspended = await signedInAdmin();
    await rpc(db, boss, "admin_update_account", { p_user: suspended.id, p_patch: { status: "suspended" } });
    const demoted = await signedInAdmin();
    await db.query("update public.profiles set role = 'subscriber' where id = $1", [demoted.id]);
    const unclaimedId = await createUser(db, {});
    await makeAdmin(db, unclaimedId);
    cast = {
      "subscriber, aal1": subscriber,
      "subscriber, aal2": { ...subscriber, aal: "aal2" },
      "admin, only aal1": { ...(await signedInAdmin()), aal: "aal1" },
      "admin, session replaced": replaced,
      "admin, signed out": signedOut,
      "admin, suspended (flag only)": flagged,
      "admin, suspended by another admin": suspended,
      "admin, demoted but holding an old aal2 token": demoted,
      "admin, signed in but never claimed": { id: unclaimedId, sessionId: await newSession(db, unclaimedId), aal: "aal2" },
    };
  }, 30000);

  it("the test covers every admin function there is", async () => {
    const found = (await truth("select proname from pg_proc where pronamespace = 'public'::regnamespace and (proname like 'admin\\_%' or proname = 'am_i_admin') order by 1")).map((r) => r.proname);
    expect([...Object.keys(adminCalls(victim)), "am_i_admin"].sort()).toEqual(found);
  });

  it("a real admin (active session, two-step verified) is let in with the very same arguments", async () => {
    const admin = await signedInAdmin();
    const target = await signedIn();
    for (const [fn, args] of Object.entries(adminCalls(target))) await rpc(db, admin, fn, args);
    expect((await truth("select role, status, plan, device_limit, full_name from public.profiles where id = $1", [target.id]))[0]).toEqual({
      role: "admin", status: "suspended", plan: "founder", device_limit: 5, full_name: "pwned",
    });
    expect(await rpc(db, admin, "am_i_admin")).toBe(true);
  });

  it.each(NOT_ADMINS)("%s is refused every admin function, and nothing changes", async (who) => {
    const caller = cast[who];
    const before = await stateOf(victim.id);
    for (const [fn, args] of Object.entries(adminCalls(victim))) {
      expect(await failure(rpc(db, caller, fn, args)), `${who} -> ${fn}`).toMatch(/admins only/);
    }
    expect(await rpc(db, caller, "am_i_admin")).toBe(false);
    expect(await stateOf(victim.id)).toEqual(before);
  });

  it("an admin cannot suspend or demote themselves, however the patch is written", async () => {
    const admin = await signedInAdmin();
    const before = await stateOf(admin.id);
    for (const patch of [{ status: "suspended" }, { role: "subscriber" }, { status: "active" }, { role: "admin" }, { status: null }, { status: "suspended", role: "subscriber", plan: "trial" }, ["status"], ["role"]]) {
      expect(await failure(rpc(db, admin, "admin_update_account", { p_user: admin.id, p_patch: patch })), JSON.stringify(patch)).toMatch(/cannot suspend or demote themselves/);
    }
    expect(await stateOf(admin.id)).toEqual(before);
    expect(await rpc(db, admin, "admin_update_account", { p_user: admin.id, p_patch: { plan: "studio" } })).toEqual({ status: "ok" });
    expect(await rpc(db, admin, "am_i_admin")).toBe(true);
  });

  it("admin_update_account rejects a bad plan, role, status or device limit, and applies none of a patch with one bad value", async () => {
    const admin = await signedInAdmin();
    const target = await signedIn();
    const before = await stateOf(target.id);
    const bad = [
      { plan: "gold" }, { plan: "" }, { plan: "PRO" }, { plan: 5 }, { plan: ["pro"] },
      { role: "root" }, { role: "ADMIN" }, { role: "" }, { status: "banned" }, { status: "Active" }, { status: "" },
      { deviceLimit: 0 }, { deviceLimit: 6 }, { deviceLimit: -1 }, { deviceLimit: 99999 }, { deviceLimit: "abc" }, { deviceLimit: 2.5 }, { deviceLimit: true },
      { plan: "studio", deviceLimit: 99 }, { fullName: "kept?", role: "root" },
    ];
    for (const patch of bad) {
      expect(await failure(rpc(db, admin, "admin_update_account", { p_user: target.id, p_patch: patch })), JSON.stringify(patch)).not.toBe("no error");
    }
    expect(await stateOf(target.id)).toEqual(before);
    expect(await failure(rpc(db, admin, "admin_update_account", { p_user: "00000000-0000-4000-8000-0000000000cc", p_patch: { plan: "pro" } }))).toMatch(/no such account/);
  });

  it("unknown keys in the patch change nothing; the known ones change exactly their columns", async () => {
    const admin = await signedInAdmin();
    const target = await signedIn();
    const [before] = await truth("select * from public.profiles where id = $1", [target.id]);
    const junk = {
      id: admin.id, email: "evil@example.com", created_at: "2000-01-01", last_seen_at: "2000-01-01", isAdmin: true, is_admin: true, "role ": "admin",
      Role: "admin", STATUS: "suspended", "profile.role": "admin", full_name: "snake", fullname: "lower", device_limit: 5, deviceLimit_: 5, plan_: "founder", user_id: admin.id,
    };
    await rpc(db, admin, "admin_update_account", { p_user: target.id, p_patch: junk });
    expect((await truth("select * from public.profiles where id = $1", [target.id]))[0]).toEqual(before);
    await rpc(db, admin, "admin_update_account", { p_user: target.id, p_patch: { fullName: `  Dana${char(0x202e)}x`, phone: "052", plan: "studio", deviceLimit: 3, role: "admin", status: "active" } });
    expect((await truth("select * from public.profiles where id = $1", [target.id]))[0]).toEqual({ ...before, full_name: "Danax", phone: "052", plan: "studio", device_limit: 3, role: "admin" });
  });

  it("admin_audit clamps its limit, and admin_log takes only the events the Edge Function reports", async () => {
    const admin = await signedInAdmin();
    const target = await signedIn();
    for (const p_limit of [-5, 0, null]) expect(Array.isArray(await rpc(db, admin, "admin_audit", { p_user: target.id, p_limit })), String(p_limit)).toBe(true);
    expect(await rpc(db, admin, "admin_audit", { p_user: target.id, p_limit: -5 })).toHaveLength(1);
    for (const action of ["backup_exported", "anything", "", "Password_Set", "password_set ", null]) {
      expect(await failure(rpc(db, admin, "admin_log", { p_user: target.id, p_action: action })), String(action)).not.toBe("no error");
    }
    expect(await auditCount(target.id, "backup_exported")).toBe(0);
  });
});

// ------------------------- privilege escalation -------------------------

describe("privilege escalation", () => {
  const rawUser = async ({ meta = {}, app = {}, anonymous = false } = {}) =>
    (await truth("insert into auth.users (email, raw_user_meta_data, raw_app_meta_data, is_anonymous) values ($1, $2, $3, $4) returning id", [`raw${++keyCounter}@example.com`, JSON.stringify(meta), JSON.stringify(app), anonymous]))[0].id;
  const profileOf = async (id) => (await truth("select role, status, plan, device_limit from public.profiles where id = $1", [id]))[0];
  const GRAB = { role: "admin", status: "active", plan: "founder", device_limit: 5, deviceLimit: 5, provisioned: true, is_admin: true };

  it("metadata the user can write never sets role, status, plan or device limit", async () => {
    expect(await profileOf(await rawUser({ meta: GRAB }))).toEqual({ role: "subscriber", status: "suspended", plan: "pro", device_limit: 2 });
  });

  it("app_metadata.provisioned opens the account and does nothing else", async () => {
    expect(await profileOf(await rawUser({ meta: GRAB, app: { provisioned: true } }))).toEqual({ role: "subscriber", status: "active", plan: "pro", device_limit: 2 });
    expect(await profileOf(await rawUser({ app: { provisioned: true, role: "admin", plan: "founder", device_limit: 5 } }))).toEqual({ role: "subscriber", status: "active", plan: "pro", device_limit: 2 });
  });

  it("only the exact value true opens an account", async () => {
    for (const provisioned of [false, "false", "TRUE", " true", "yes", 1, 0, null, [], {}, "1"]) {
      expect((await profileOf(await rawUser({ app: { provisioned } }))).status, JSON.stringify(provisioned)).toBe("suspended");
    }
    expect((await profileOf(await rawUser({ app: {} }))).status).toBe("suspended");
    expect((await profileOf(await rawUser({ app: { provisioned: true } }))).status).toBe("active");
  });

  it("an anonymous auth user starts suspended and can use nothing", async () => {
    const id = await rawUser({ app: { provider: "anonymous", providers: ["anonymous"] }, anonymous: true });
    expect((await profileOf(id)).status).toBe("suspended");
    const user = { id, sessionId: await newSession(db, id), deviceKey: newKey() };
    expect(await claim(user)).toEqual({ status: "suspended" });
    expect(await failure(rpc(db, user, "ws_all", { p_store: "clients" }))).toMatch(/session not active/);
    expect(await rpc(db, user, "am_i_admin")).toBe(false);
    expect(await truth("select count(*)::int n from public.devices where user_id = $1", [id])).toEqual([{ n: 0 }]);
  });

  it("editing one's own metadata later changes nothing, and a suspended user cannot reopen their account that way", async () => {
    const id = await rawUser({ meta: { full_name: "Original" } });
    await db.query("update auth.users set raw_user_meta_data = $2 where id = $1", [id, JSON.stringify({ ...GRAB, full_name: "Changed" })]);
    expect(await profileOf(id)).toEqual({ role: "subscriber", status: "suspended", plan: "pro", device_limit: 2 });
    expect((await truth("select full_name from public.profiles where id = $1", [id]))[0].full_name).toBe("Original");
    const user = { id, sessionId: await newSession(db, id), deviceKey: newKey() };
    expect(await claim(user)).toEqual({ status: "suspended" });
  });

  it("a token with forged role, aal and metadata claims gains nothing", async () => {
    const user = await signedIn();
    const victim = await signedIn();
    const before = await stateOf(victim.id);
    const forged = claimsOf(user, {
      role: "service_role", aal: "aal2", user_role: "admin", is_admin: true, admin: true,
      app_metadata: { role: "admin", provisioned: true }, user_metadata: { role: "admin", is_admin: true }, amr: [{ method: "totp" }],
    });
    const call = (text, args) => asClaims(forged, async (tx) => (await tx.query(text, args)).rows);
    expect((await call("select public.am_i_admin() as v"))[0].v).toBe(false);
    for (const [fn, args] of Object.entries(adminCalls(victim))) {
      const [params, values] = [Object.keys(args).map((k, i) => `${k} => $${i + 1}`).join(", "), Object.values(args).map((v) => (v !== null && typeof v === "object" ? JSON.stringify(v) : v))];
      expect(await failure(call(`select public.${fn}(${params})`, values)), fn).toMatch(/admins only/);
    }
    expect(await stateOf(victim.id)).toEqual(before);
    expect((await call("select role, plan from public.profiles"))).toEqual([{ role: "subscriber", plan: "pro" }]);
  });

  it("an admin's token is two-step verified only when its aal claim is exactly aal2", async () => {
    const admin = await signedInAdmin();
    const isAdmin = (aal) => asClaims(claimsOf(admin, { aal }), async (tx) => (await tx.query("select public.am_i_admin() as v")).rows[0].v);
    for (const aal of [undefined, "aal1", "AAL2", "aal2 ", "aal3", 2, ["aal2"], null, ""]) expect(await isAdmin(aal), String(aal)).toBe(false);
    expect(await isAdmin("aal2")).toBe(true);
  });

  it("tokens that name no user, no session, a stranger's session or garbage do nothing", async () => {
    const a = await signedIn();
    const b = await signedIn();
    await seedAsOwner(a.id);
    const aActive = await truth("select * from public.active_sessions where user_id = $1", [a.id]);
    const tokens = {
      "no claims at all": "{}",
      "a role and nothing else": JSON.stringify({ role: "authenticated" }),
      "a user but no session": JSON.stringify({ sub: a.id, role: "authenticated" }),
      "a user and someone else's session": claimsOf({ id: a.id, sessionId: b.sessionId }),
      "a session of a user that does not exist": claimsOf({ id: "00000000-0000-4000-8000-0000000000dd", sessionId: a.sessionId }),
    };
    for (const [name, claims] of Object.entries(tokens)) {
      const run = (text, args) => asClaims(claims, (tx) => tx.query(text, args));
      expect(await failure(run("select public.ws_all('clients')")), name).toMatch(/session not active/);
      expect(await failure(run("select public.ws_batch('[]'::jsonb)")), name).toMatch(/session not active/);
      expect(await failure(run("select public.claim_session($1, 'x')", [newKey()])), name).toMatch(/not signed in/);
      expect((await run("select * from public.ws_clients")).rows, name).toEqual([]);
      expect((await run("select public.am_i_admin() as v")).rows[0].v, name).toBe(false);
    }
    expect(await truth("select * from public.active_sessions where user_id = $1", [a.id])).toEqual(aActive);
    expect(await truth("select count(*)::int n from public.devices where user_id = $1", [b.id])).toEqual([{ n: 1 }]);
  });

  it("claims that are not valid JSON, or whose sub is not a uuid, fail closed: an error or nothing, never data", async () => {
    const a = await signedIn();
    await seedAsOwner(a.id);
    for (const claims of ["not json", JSON.stringify({ sub: "nope", role: "authenticated" }), JSON.stringify({ sub: a.id.toUpperCase().replace(/-/g, "_") })]) {
      const run = (text) => asClaims(claims, async (tx) => (await tx.query(text)).rows).then((rows) => ({ rows }), (e) => ({ error: e.message }));
      expect(await failure(asClaims(claims, (tx) => tx.query("select public.ws_all('clients')"))), claims).toMatch(/invalid input syntax|session not active/);
      for (const text of ["select * from public.ws_clients", "select * from public.profiles"]) {
        const outcome = await run(text);
        if (outcome.error) expect(outcome.error, `${claims} ${text}`).toMatch(/invalid input syntax/);
        else expect(outcome.rows, `${claims} ${text}`).toEqual([]);
      }
      const admin = await run("select public.am_i_admin() as v");
      if (admin.error) expect(admin.error, `${claims} am_i_admin`).toMatch(/invalid input syntax/);
      else expect(admin.rows, `${claims} am_i_admin`).toEqual([{ v: false }]);
    }
  });
});

// ------------------------- storage -------------------------

describe("storage: bucket ws-files", () => {
  const insertObject = (user, name) => sql(user, "insert into storage.objects (bucket_id, name) values ('ws-files', $1)", [name]);
  const visibleTo = async (user) => (await rowsAs(user, "select name from storage.objects where bucket_id = 'ws-files' order by name")).map((r) => r.name);
  async function pair() {
    const a = await signedIn();
    const b = await signedIn();
    await seedAsOwner(a.id);
    await db.query("insert into storage.objects (bucket_id, name) values ('ws-files', $1), ('ws-files', $2)", [`${b.id}/mine`, `${b.id}/f1`]);
    return { a, b, aFiles: await filesOf(a.id), bFiles: await filesOf(b.id) };
  }

  it("B cannot read A's files, by name, by pattern or by count", async () => {
    const { a, b } = await pair();
    expect(await visibleTo(b)).toEqual([`${b.id}/f1`, `${b.id}/mine`].sort());
    for (const [text, args] of [
      ["select * from storage.objects where name = $1", [`${a.id}/f1`]],
      ["select * from storage.objects where name like $1", [`${a.id}/%`]],
      ["select * from storage.objects where bucket_id = 'ws-files' and name <> all($1::text[])", [`{${b.id}/f1,${b.id}/mine}`]],
    ]) expect(await rowsAs(b, text, args), text).toEqual([]);
  });

  it("B cannot write under A/, by creating a file or by renaming his own into it", async () => {
    const { a, b, aFiles, bFiles } = await pair();
    expect(await failure(insertObject(b, `${a.id}/planted`))).toMatch(/row-level security/);
    expect(await failure(insertObject(b, `${a.id}/f1`))).toMatch(/row-level security/); // A's name exists: the answer is the same
    expect(await failure(sql(b, "update storage.objects set name = $1 where name = $2", [`${a.id}/planted`, `${b.id}/mine`]))).toMatch(/row-level security/);
    expect(await filesOf(a.id)).toEqual(aFiles);
    expect(await filesOf(b.id)).toEqual(bFiles);
  });

  it("B cannot delete or rename A's files", async () => {
    const { a, b, aFiles } = await pair();
    expect(await reach("delete from storage.objects where name like $1", [`${a.id}/%`])).toBeGreaterThan(0);
    expect((await sql(b, "delete from storage.objects where name like $1", [`${a.id}/%`])).affectedRows).toBe(0);
    expect((await sql(b, "delete from storage.objects")).affectedRows).toBe(2); // only his own
    expect((await sql(b, "update storage.objects set name = $1 where name = $2", [`${b.id}/x`, `${a.id}/f1`])).affectedRows).toBe(0);
    expect(await filesOf(a.id)).toEqual(aFiles);
  });

  it("the same file name in two accounts stays two files", async () => {
    const { a, b } = await pair();
    await sql(b, "delete from storage.objects where name = $1", [`${b.id}/f1`]);
    expect(await filesOf(a.id)).toContain(`${a.id}/f1`);
    await insertObject(b, `${b.id}/f1`);
    expect((await truth("select count(*)::int n from storage.objects where name like '%/f1' and name like any($1::text[])", [`{${a.id}/%,${b.id}/%}`]))[0].n).toBe(2);
  });

  it("only <own id>/<plain id> is accepted: every other name is refused as a new file and as a rename", async () => {
    const { a, b } = await pair();
    const refused = [
      `${a.id}/../${b.id}/x`, `${b.id}/../${a.id}/x`, `${b.id}/sub/x`, "x", `${b.id}/`, `${b.id}/a b`, `${b.id}/x\n`, `${b.id}/x/`, `${b.id}//x`, `${b.id}/./x`, `${b.id}/..`,
      `${b.id}/${"x".repeat(101)}`, `${b.id.toUpperCase()}/x`, `/${b.id}/x`, ` ${b.id}/x`, `${b.id}/${char(0xe9)}`, `${b.id}/x.png`, `${b.id}/x%2Fy`, `${b.id}/x\\y`,
      `${b.id.replace(/-/g, "")}/x`, `${b.id}x/y`, `${b.id}`, `${a.id}/x`, `${b.id}/${char(0xff21)}`, `${b.id}/${char(0x663)}`,
    ];
    for (const name of refused) {
      expect(await failure(insertObject(b, name)), JSON.stringify(name)).toMatch(/row-level security/);
      expect(await failure(sql(b, "update storage.objects set name = $1 where name = $2", [name, `${b.id}/mine`])), `rename to ${JSON.stringify(name)}`).toMatch(/row-level security/);
    }
    expect(await filesOf(b.id)).toEqual([`${b.id}/f1`, `${b.id}/mine`]);
    for (const name of [`${b.id}/x`, `${b.id}/${"x".repeat(100)}`, `${b.id}/A_b-9`]) expect(await failure(insertObject(b, name)), name).toBe("no error");
  });

  it("files are only in the ws-files bucket, and cannot be moved out of it", async () => {
    const { b } = await pair();
    await db.query("insert into storage.buckets (id, name, public) values ('other', 'other', true) on conflict do nothing");
    await db.query("insert into storage.objects (bucket_id, name) values ('other', $1)", [`${b.id}/theirs`]);
    expect(await failure(sql(b, "insert into storage.objects (bucket_id, name) values ('other', $1)", [`${b.id}/x`]))).toMatch(/row-level security/);
    expect(await failure(sql(b, "update storage.objects set bucket_id = 'other' where name = $1", [`${b.id}/mine`]))).toMatch(/row-level security/);
    expect(await rowsAs(b, "select * from storage.objects where bucket_id = 'other'")).toEqual([]);
  });

  it("holds the cap of 10000 files: the 10000th is accepted, the 10001st refused, other accounts are not affected, and deleting frees a place", async () => {
    const a = await signedIn();
    const b = await signedIn();
    await db.query("insert into storage.objects (bucket_id, name) select 'ws-files', $1 || '/seed' || g from generate_series(1, 9999) g", [a.id]);
    expect(await failure(insertObject(a, `${a.id}/tenthousandth`))).toBe("no error");
    expect(await failure(insertObject(a, `${a.id}/one-more`))).toMatch(/row-level security/);
    expect(await filesOf(a.id)).toHaveLength(10000);
    expect(await failure(insertObject(b, `${b.id}/mine`))).toBe("no error");
    await sql(a, "delete from storage.objects where name = $1", [`${a.id}/seed1`]);
    expect(await failure(insertObject(a, `${a.id}/one-more`))).toBe("no error");
  }, 60000);
});

// ------------------------- claim_session -------------------------

describe("claim_session", () => {
  it("enforces the device limit the admin set, for subscribers, and a lowered limit keeps the old devices working", async () => {
    const admin = await signedInAdmin();
    const user = await signedIn();
    await rpc(db, admin, "admin_update_account", { p_user: user.id, p_patch: { deviceLimit: 1 } });
    expect(await claim(await otherSession(user))).toEqual({ status: "device_limit", limit: 1 });
    expect(await claim(await otherSession(user, user.deviceKey))).toMatchObject({ status: "ok" }); // the device it has still works
    await rpc(db, admin, "admin_update_account", { p_user: user.id, p_patch: { deviceLimit: 3 } });
    expect((await claim(await otherSession(user))).status).toBe("ok");
    expect((await claim(await otherSession(user))).status).toBe("ok");
    expect(await claim(await otherSession(user))).toEqual({ status: "device_limit", limit: 3 });
    expect((await truth("select count(*)::int n from public.devices where user_id = $1", [user.id]))[0].n).toBe(3);
  });

  it("refuses a revoked device, even with a fresh session, and the refusal changes nothing", async () => {
    const user = await signedIn();
    const idle = await otherSession(user);
    const idleClaim = await claim(idle);
    const back = await otherSession(user, user.deviceKey);
    await claim(back);
    await rpc(db, back, "revoke_my_device", { p_device: idleClaim.deviceId });
    const before = await stateOf(user.id);
    expect(await claim(await otherSession(user, idle.deviceKey))).toEqual({ status: "device_revoked" });
    expect((await stateOf(user.id)).devices).toEqual(before.devices);
    expect((await stateOf(user.id)).active).toEqual(before.active);
  });

  it("refuses a suspended account and leaves no device and no active session behind", async () => {
    const id = await createUser(db, { provisioned: false });
    const user = { id, sessionId: await newSession(db, id), deviceKey: newKey() };
    const before = await stateOf(id);
    expect(await claim(user)).toEqual({ status: "suspended" });
    expect(await rpc(db, user, "session_status", { p_device_key: user.deviceKey })).toEqual({ status: "suspended" });
    expect(await stateOf(id)).toEqual(before);
    expect(await truth("select count(*)::int n from public.devices where user_id = $1", [id])).toEqual([{ n: 0 }]);
  });

  it("a second claim takes the account over at once: the first session loses data and files, and the takeover is logged", async () => {
    const first = await signedIn();
    await seedAsOwner(first.id);
    const second = await otherSession(first);
    expect((await claim(second)).status).toBe("ok");
    expect(await failure(rpc(db, first, "ws_all", { p_store: "clients" }))).toMatch(/session not active/);
    expect(await rowsAs(first, "select * from public.ws_clients")).toEqual([]);
    expect(await rowsAs(first, "select * from storage.objects")).toEqual([]);
    expect(await rpc(db, first, "session_status", { p_device_key: first.deviceKey })).toEqual({ status: "replaced" });
    expect((await rpc(db, second, "ws_all", { p_store: "clients" })).map((c) => c.id)).toEqual(["c1"]);
    expect((await truth("select detail from public.audit_log where user_id = $1 and action = 'session_claimed' order by id desc limit 1", [first.id]))[0].detail.replaced).toBe(true);
  });

  it("refuses a token whose session belongs to someone else, and leaves that someone's session alone", async () => {
    const a = await signedIn();
    const b = await signedIn();
    const before = await stateOf(a.id);
    const stolen = { id: b.id, sessionId: a.sessionId, deviceKey: newKey() }; // B's identity, A's session id
    expect(await failure(claim(stolen))).toMatch(/not signed in/);
    const reverse = { id: a.id, sessionId: b.sessionId, deviceKey: newKey() };
    expect(await failure(claim(reverse))).toMatch(/not signed in/);
    expect(await stateOf(a.id)).toEqual(before);
    expect(await rpc(db, a, "ws_all", { p_store: "clients" })).toEqual([]);
  });

  it("device keys: 16 to 100 characters, and the same key in two accounts is two independent devices", async () => {
    const a = await signedIn();
    const short = { ...(await otherSession(a)), deviceKey: "x".repeat(15) };
    const long = { ...(await otherSession(a)), deviceKey: "x".repeat(101) };
    expect(await failure(claim(short))).toMatch(/invalid device key/);
    expect(await failure(claim(long))).toMatch(/invalid device key/);
    expect(await failure(rpc(db, a, "claim_session", { p_device_key: null, p_label: "x" }))).toMatch(/invalid device key/);
    const b = await createUser(db, {});
    const sharing = { id: b, sessionId: await newSession(db, b), deviceKey: a.deviceKey };
    expect((await claim(sharing)).status).toBe("ok");
    await rpc(db, await signedInAdmin(), "admin_revoke_device", { p_device: a.deviceId });
    expect(await rpc(db, sharing, "session_status", { p_device_key: a.deviceKey })).toEqual({ status: "ok" });
  });
});

// ------------------------- injection and abuse -------------------------

describe("injection and abuse", () => {
  const SQLISH = ["x'); drop table public.ws_clients; --", "' or '1'='1", "\"; select pg_sleep(30); --", "$$; delete from public.profiles; $$", "x' union select doc from public.ws_clients --", "%", "_", "\\"];
  const tablesIntact = async () => expect((await truth("select count(*)::int n from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'"))[0].n).toBe(7);

  it("SQL-looking collection names are refused, and nothing is dropped or run", async () => {
    const a = await signedIn();
    for (const store of [...SQLISH, "clients ", "CLIENTS", "client", "", "clients;", "clients/**/"]) {
      expect(await failure(rpc(db, a, "ws_all", { p_store: store })), store).toMatch(/unknown collection/);
      expect(await failure(rpc(db, a, "ws_get", { p_store: store, p_id: "x" })), store).toMatch(/unknown collection/);
      expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put(store, { id: "x" })] })), store).toMatch(/unknown collection/);
      expect(await failure(rpc(db, a, "ws_batch", { p_ops: [del(store, "x")] })), store).toMatch(/unknown collection/);
    }
    await tablesIntact();
  });

  it("SQL-looking ids find nothing, and are refused as record ids", async () => {
    const a = await signedIn();
    await rpc(db, a, "ws_batch", { p_ops: [put("clients", { id: "c1" })] });
    for (const id of SQLISH) {
      expect(await rpc(db, a, "ws_get", { p_store: "clients", p_id: id }), id).toBeNull();
      expect(await rpc(db, a, "ws_batch", { p_ops: [del("clients", id)] }), id).toEqual({ applied: 1 });
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put("clients", { id })] })), id).toMatch(/check constraint/);
    }
    expect((await rpc(db, a, "ws_all", { p_store: "clients" })).map((c) => c.id)).toEqual(["c1"]);
    await tablesIntact();
  });

  it("SQL-looking record content, names, labels and device keys are stored and returned as plain text", async () => {
    const a = await signedIn();
    const record = { id: "c1", fullName: SQLISH[0], notes: SQLISH.join(" | "), tags: SQLISH };
    await rpc(db, a, "ws_batch", { p_ops: [put("clients", record)] });
    expect(await rpc(db, a, "ws_get", { p_store: "clients", p_id: "c1" })).toEqual(record);
    const second = { ...(await otherSession(a)), deviceKey: `${SQLISH[0]} ${SQLISH[1]}`.padEnd(20, "k") };
    await claim(second, SQLISH[2]);
    expect((await truth("select label from public.devices where device_key = $1", [second.deviceKey]))[0].label).toBe(SQLISH[2]);
    expect((await rpc(db, second, "my_devices")).map((d) => d.label)).toContain(SQLISH[2]);
    await tablesIntact();
  });

  it("an id must match ^[A-Za-z0-9_-]{1,100}$: every other shape is refused, in a batch and directly", async () => {
    const a = await signedIn();
    const bad = ["", "a b", "a/b", "../x", "a.b", "a\n", "a\tb", "\na", " a", "a ", `a${char(0xe9)}`, "x".repeat(101), "a;b", "a'b", 'a"b', "a%", "a*", "a\\b", "a,b", "a:b", `${char(0x202e)}a`, `a${char(0x200b)}`];
    for (const id of bad) {
      expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put("clients", { id })] })), JSON.stringify(id)).toMatch(/check constraint|needs a value with an id/);
      expect(await failure(sql(a, "insert into public.ws_clients (id, doc) values ($1::text, jsonb_build_object('id', $1::text))", [id])), JSON.stringify(id)).toMatch(/check constraint|permission denied/);
    }
    // an id that is not a string must not turn into a stored record with a bad id
    for (const id of [[1], { a: 1 }, null, ["a"]]) expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put("clients", { id })] })), JSON.stringify(id)).not.toBe("no error");
    expect(await countOf("ws_clients", a.id)).toBe(0);
    for (const id of ["a", "A_b-9", "x".repeat(100), "0", "-", "_", 7, true]) expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put("clients", { id })] })), String(id)).toBe("no error");
    expect((await rpc(db, a, "ws_all", { p_store: "clients" })).map((c) => String(c.id)).sort()).toEqual(["-", "0", "7", "A_b-9", "_", "a", "true", "x".repeat(100)].sort());
  });

  it("a record over its size limit is refused, and its batch is rolled back whole", async () => {
    const a = await signedIn();
    for (const [store, limit] of [["clients", 131072], ["readings", 262144], ["attachments", 8192]]) {
      const big = { id: "big", pad: "x".repeat(limit + 1000) };
      const small = { id: "small", pad: "x".repeat(limit - 3000) };
      expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put(store, { id: "before" }), put(store, big)] })), store).toMatch(/check constraint/);
      expect(await rpc(db, a, "ws_get", { p_store: store, p_id: "before" }), store).toBeNull();
      expect(await rpc(db, a, "ws_batch", { p_ops: [put(store, small)] }), store).toEqual({ applied: 1 });
    }
  });

  it("a record must be a JSON object", async () => {
    const a = await signedIn();
    for (const doc of ["[]", "[{\"id\":\"x\"}]", "\"x\"", "5", "null", "true"]) {
      expect(await failure(sql(a, "insert into public.ws_clients (id, doc) values ('x', $1)", [doc])), doc).toMatch(/check constraint|violates|permission denied/);
    }
    expect(await failure(rpc(db, a, "ws_batch", { p_ops: [{ type: "put", store: "clients", value: [1] }] }))).toMatch(/needs a value with an id/);
    expect(await failure(rpc(db, a, "ws_batch", { p_ops: [{ type: "put", store: "clients", value: "x" }] }))).toMatch(/needs a value with an id/);
    expect(await countOf("ws_clients", a.id)).toBe(0);
  });

  it("a batch of more than 20000 operations is refused whole; 20000 are accepted", async () => {
    const a = await signedIn();
    const filler = (n) => Array.from({ length: n }, (_, i) => del("clients", `n${i}`));
    expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put("clients", { id: "first" }), ...filler(20000)] }))).toMatch(/invalid batch/);
    expect(await rpc(db, a, "ws_get", { p_store: "clients", p_id: "first" })).toBeNull();
    expect(await rpc(db, a, "ws_batch", { p_ops: filler(20000) })).toEqual({ applied: 20000 });
  }, 60000);

  it("a batch that is not a list of known operations is refused", async () => {
    const a = await signedIn();
    for (const p_ops of ["{}", "\"x\"", "5", "true", "{\"type\":\"put\"}"]) expect(await failure(rpc(db, a, "ws_batch", { p_ops })), p_ops).toMatch(/invalid batch/);
    for (const op of [1, "x", null, [], {}, { type: "drop" }, { type: "PUT", store: "clients", value: { id: "x" } }, { type: "put", store: "clients" }, { type: SQLISH[0] }]) {
      expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put("clients", { id: "kept?" }), op] })), JSON.stringify(op)).not.toBe("no error");
    }
    expect(await countOf("ws_clients", a.id)).toBe(0);
  });

  describe("per-account quotas", () => {
    const seed = (table, owner, n, prefix = "s") =>
      db.query(`insert into public.${table} (owner_id, id, doc) select $1, $2 || g, jsonb_build_object('id', $2 || g) from generate_series(1, ${n}) g`, [owner, prefix]);

    it.each([["clients", "ws_clients", 20000], ["attachments", "ws_attachments", 10000]])("%s (%s): %i rows are allowed, one more is refused whole, and other accounts are unaffected", async (store, table, limit) => {
      const a = await signedIn();
      const b = await signedIn();
      await seed(table, a.id, limit - 1);
      expect(await rpc(db, a, "ws_batch", { p_ops: [put(store, { id: "last" })] })).toEqual({ applied: 1 });
      expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put(store, { id: "one-more" }), put(store, { id: "another" })] }))).toMatch(/over the account quota/);
      expect(await countOf(table, a.id)).toBe(limit);
      expect(await rpc(db, b, "ws_batch", { p_ops: [put(store, { id: "mine" })] })).toEqual({ applied: 1 });
      expect(await rpc(db, a, "ws_batch", { p_ops: [del(store, "last"), put(store, { id: "swapped" })] })).toEqual({ applied: 2 });
    }, 60000);

    it("readings: 200000 are allowed, one more is refused", async () => {
      const a = await signedIn();
      await seed("ws_readings", a.id, 200000);
      expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put("readings", { id: "one-more" })] }))).toMatch(/over the account quota/);
      expect(await rpc(db, a, "ws_batch", { p_ops: [del("readings", "s1"), put("readings", { id: "swapped" })] })).toEqual({ applied: 2 });
      expect(await countOf("ws_readings", a.id)).toBe(200000);
    }, 120000);

    it("attachment bytes: 2 GiB are allowed, one byte more is refused", async () => {
      const a = await signedIn();
      const half = 1073741824;
      expect(await rpc(db, a, "ws_batch", { p_ops: [put("attachments", { id: "f1", size: half }), put("attachments", { id: "f2", size: half })] })).toEqual({ applied: 2 });
      expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put("attachments", { id: "f3", size: 1 })] }))).toMatch(/over the account quota/);
      expect(await rpc(db, a, "ws_batch", { p_ops: [put("attachments", { id: "f2", size: half - 1 }), put("attachments", { id: "f3", size: 1 })] })).toEqual({ applied: 2 });
    });
  });

  describe("log_event", () => {
    it("throttles at 200 an hour per account, writes nothing when it throttles, and is per account", async () => {
      const a = await signedIn();
      const b = await signedIn();
      let last;
      for (let i = 0; i < 230 && last?.status !== "throttled"; i++) last = await rpc(db, a, "log_event", { p_action: "backup_exported" });
      expect(last).toEqual({ status: "throttled" });
      const inHour = async () => (await truth("select count(*)::int n from public.audit_log where user_id = $1 and at > now() - interval '1 hour'", [a.id]))[0].n;
      expect(await inHour()).toBe(200);
      expect(await rpc(db, a, "log_event", { p_action: "signed_out" })).toEqual({ status: "throttled" });
      expect(await inHour()).toBe(200);
      expect(await rpc(db, b, "log_event", { p_action: "backup_exported" })).toEqual({ status: "ok" });
      await db.query("update public.audit_log set at = at - interval '2 hours' where user_id = $1", [a.id]);
      expect(await rpc(db, a, "log_event", { p_action: "backup_restored" })).toEqual({ status: "ok" });
    });

    it("refuses every action that is not one of the four, and records nothing for them", async () => {
      const a = await signedIn();
      const before = (await stateOf(a.id)).audit;
      for (const p_action of ["", "anything", "Backup_Exported", "backup_exported ", "device_revoked", "account_updated", "client_deleted", "password_set", "session_claimed", SQLISH[0], null]) {
        expect(await failure(rpc(db, a, "log_event", { p_action })), String(p_action)).not.toBe("no error");
      }
      expect((await stateOf(a.id)).audit).toBe(before);
      for (const p_action of ["backup_exported", "backup_restored", "local_data_uploaded", "signed_out"]) expect(await rpc(db, a, "log_event", { p_action })).toEqual({ status: "ok" });
    });
  });
});

// ------------------------- weaknesses this audit found -------------------------
// Each body asserts the secure behaviour and fails today (it.fails). Severity and the fix are in the audit report.

describe("weaknesses found by this audit (each asserts the secure behaviour)", () => {
  // FIXED after the 2026-10-07 audit; was: HIGH. the quotas live only in ws_batch. The three tables accept direct INSERTs from `authenticated` (grant + a `for all` policy),
  // and a direct INSERT skips the quota, so one subscriber can store unlimited rows of up to 128 KiB / 256 KiB / 8 KiB each.
  for (const [table, limit] of [["ws_clients", 20000], ["ws_attachments", 10000]]) {
    it(`a subscriber cannot go past the ${table} quota of ${limit} by inserting into the table directly`, async () => {
      const a = await signedIn();
      await db.query(`insert into public.${table} (owner_id, id, doc) select $1, 's' || g, jsonb_build_object('id', 's' || g) from generate_series(1, ${limit}) g`, [a.id]);
      const extra = await failure(sql(a, `insert into public.${table} (id, doc) select 'extra' || g, jsonb_build_object('id', 'extra' || g) from generate_series(1, 50) g`));
      expect(extra).not.toBe("no error");
      expect(await countOf(table, a.id)).toBeLessThanOrEqual(limit);
    }, 60000);
  }

  // FIXED after the 2026-10-07 audit; was: MEDIUM. private.audit has no limit. Three paths let a subscriber write unlimited audit rows (log_event alone is throttled): a refused claim_session
  // (device_refused), the client_deleted trigger of ws_batch (10000 rows per call), and switching between two live sessions (session_claimed).
  // It fills the shared database and, with the admin's 200-row view, buries the entries that matter. The migration itself treats 200 an hour as a flood.
  it("refused device claims cannot flood the audit log", async () => {
    const user = await signedIn();
    const second = await otherSession(user);
    await claim(second); // two devices: the limit
    for (let i = 0; i < 250; i++) await rpc(db, second, "claim_session", { p_device_key: newKey(), p_label: "flood" });
    expect(await auditCount(user.id, "device_refused")).toBeLessThanOrEqual(200);
  }, 60000);

  it("deleting many clients cannot flood the audit log", async () => {
    const user = await signedIn();
    const ids = Array.from({ length: 250 }, (_, i) => `c${i}`);
    await rpc(db, user, "ws_batch", { p_ops: [...ids.map((id) => put("clients", { id })), ...ids.map((id) => del("clients", id))] });
    expect(await auditCount(user.id, "client_deleted")).toBeLessThanOrEqual(200);
  }, 60000);

  it("switching between two live sessions cannot flood the audit log", async () => {
    const one = await signedIn();
    const two = await otherSession(one, one.deviceKey);
    for (let i = 0; i < 125; i++) {
      await failure(claim(two)); // once the database signs the replaced session out, the next claim is refused: no flood
      await failure(claim(one));
    }
    expect(await auditCount(one.id, "session_claimed")).toBeLessThanOrEqual(200);
  }, 60000);

  // FIXED after the 2026-10-07 audit; was: LOW. private.clean_text lists some invisible characters and misses others: U+061C ARABIC LETTER MARK is a Unicode bidi control,
  // and U+2028/2029, U+00AD, U+180E, U+206A-206F, U+FFF9-FFFB and the language tags survive in names that go on reports.
  it("names lose every Unicode bidi control character", async () => {
    const bidi = codePoints(0, 0x2069).filter((cp) => /\p{Bidi_Control}/u.test(char(cp)));
    expect(bidi).toContain(0x061c);
    const a = await signedIn();
    const left = [];
    for (const cp of bidi) {
      await rpc(db, a, "update_my_profile", { p_full_name: `a${char(cp)}b`, p_phone: "" });
      if ((await truth("select full_name from public.profiles where id = $1", [a.id]))[0].full_name !== "ab") left.push(cp.toString(16));
    }
    expect(left).toEqual([]);
  });

  it("names lose invisible separators and format characters (line and paragraph separators, soft hyphen, deprecated formats, language tags)", async () => {
    const missed = [0x00ad, 0x180e, 0x2028, 0x2029, ...codePoints(0x206a, 0x206f), ...codePoints(0xfff9, 0xfffb), 0xe0001, 0xe0041];
    const a = await signedIn();
    const left = [];
    for (const cp of missed) {
      await rpc(db, a, "update_my_profile", { p_full_name: `a${char(cp)}b`, p_phone: "" });
      if ((await truth("select full_name from public.profiles where id = $1", [a.id]))[0].full_name !== "ab") left.push(cp.toString(16));
    }
    expect(left).toEqual([]);
  });

  // FIXED after the 2026-10-07 audit; was: LOW. a device label is stored (and copied into audit entries) as sent, control and direction characters included; the admin reads it.
  it("a device label loses control and direction characters", async () => {
    const user = await signedIn();
    const evil = `Chrome${char(0x202e)}${char(0x07)}${char(0x200b)}`;
    const second = await otherSession(user);
    await claim(second, evil);
    const third = await otherSession(user);
    await claim(third, evil); // refused at the limit: the label goes into the audit entry
    const stored = (await truth("select label from public.devices where user_id = $1", [user.id])).map((r) => r.label);
    const logged = (await truth("select detail ->> 'label' as label from public.audit_log where user_id = $1 and detail ? 'label'", [user.id])).map((r) => r.label);
    const hidden = [...stored, ...logged].filter((label) => /[\p{Cc}\p{Cf}]/u.test(label));
    expect(hidden).toEqual([]);
  });

  // FIXED after the 2026-10-07 audit; was: LOW. the profile and devices tables are readable by `authenticated` without the session check the functions make, so the access token of a
  // signed-out session (valid until it expires) still reads the account's name, phone, email, plan and device keys.
  it("a signed-out session cannot read the profile or the devices directly", async () => {
    const user = await signedIn();
    await endSession(db, user.sessionId);
    expect(await rowsAs(user, "select id from public.profiles")).toEqual([]);
    expect(await rowsAs(user, "select id from public.devices")).toEqual([]);
  });

  // FIXED after the 2026-10-07 audit; was: LOW. the 10000-file cap is a count taken once per statement (the policy wraps it in a sub-select), so one multi-row INSERT, or uploads racing
  // each other, go past it. Storage's HTTP API inserts one row per upload, so the practical form is a race that PGlite cannot show.
  it("one multi-row insert cannot take an account past the 10000-file cap", async () => {
    const a = await signedIn();
    await db.query("insert into storage.objects (bucket_id, name) select 'ws-files', $1 || '/seed' || g from generate_series(1, 9990) g", [a.id]);
    await failure(sql(a, "insert into storage.objects (bucket_id, name) select 'ws-files', $1 || '/new' || g from generate_series(1, 100) g", [a.id]));
    expect(await filesOf(a.id)).toHaveLength(9990 + (await filesOf(a.id)).filter((n) => n.includes("/new")).length);
    expect((await filesOf(a.id)).length).toBeLessThanOrEqual(10000);
  }, 60000);

  // FIXED after the 2026-10-07 audit; was: LOW. claim_session does not sign the replaced sessions out; the app does it from the browser (client.auth.signOut({ scope: "others" })).
  // A modified client keeps the old session alive, and it can take the account back with claim_session whenever it likes.
  it("a session replaced by a newer sign-in is signed out by the database, not only by the client", async () => {
    const first = await signedIn();
    const second = await otherSession(first);
    await claim(second);
    expect((await truth("select count(*)::int n from auth.sessions where id = $1", [first.sessionId]))[0].n).toBe(0);
    expect(await failure(claim(first))).toMatch(/not signed in/);
  });
});
