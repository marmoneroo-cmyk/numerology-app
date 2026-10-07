/*
 * The database's own rules, run against the real migrations in PGlite:
 * isolation between subscribers, one active session per account, device
 * limits, suspension, admin-only functions, atomic batches, file folders and
 * the audit log.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createDatabase, createUser, newSession, endSession, as, rpc, makeAdmin } from "./harness.js";

let db;
beforeAll(async () => {
  db = await createDatabase();
}, 30000);

const deviceKey = (n) => `device-key-${String(n).padStart(8, "0")}-abcdef`;
let keyCounter = 0;
/** A new user, signed in (a session) on a new device, with that session claimed. */
async function signedIn(opts = {}) {
  const id = await createUser(db, opts);
  const user = { id, sessionId: await newSession(db, id), deviceKey: deviceKey(++keyCounter) };
  const claim = await rpc(db, user, "claim_session", { p_device_key: user.deviceKey, p_label: "Chrome · Windows" });
  expect(claim.status).toBe("ok");
  return { ...user, deviceId: claim.deviceId };
}
/** A signed-in admin whose session passed two-step verification (aal2). */
async function signedInAdmin(opts = {}) {
  const admin = await signedIn(opts);
  await makeAdmin(db, admin.id);
  return { ...admin, aal: "aal2" };
}
/** Another session of the same account, on a device of its own (or the given one). */
const otherSession = async (user, key = deviceKey(++keyCounter)) => ({ id: user.id, sessionId: await newSession(db, user.id), deviceKey: key });
const claim = (user) => rpc(db, user, "claim_session", { p_device_key: user.deviceKey, p_label: "Safari · iPhone" });
const put = (store, value) => ({ type: "put", store, value });
const failure = async (promise) => {
  try {
    await promise;
  } catch (e) {
    return e.message;
  }
  return "no error";
};
const auditOf = async (userId) => (await db.query("select action, detail from public.audit_log where user_id = $1 order by id", [userId])).rows;

describe("accounts", () => {
  it("an account opened by the admin function is an active subscriber with the name and phone given", async () => {
    const id = await createUser(db, { email: "dana@example.com", fullName: "דנה לוי", phone: "052-1234567" });
    const { rows } = await db.query("select email, full_name, phone, role, status, plan, device_limit from public.profiles where id = $1", [id]);
    expect(rows[0]).toEqual({ email: "dana@example.com", full_name: "דנה לוי", phone: "052-1234567", role: "subscriber", status: "active", plan: "pro", device_limit: 2 });
  });

  it("a user created any other way (a sign-up, an anonymous sign-in) starts suspended and cannot use anything", async () => {
    const id = await createUser(db, { provisioned: false });
    const user = { id, sessionId: await newSession(db, id), deviceKey: deviceKey(++keyCounter) };
    expect(await claim(user)).toEqual({ status: "suspended" });
    expect(await failure(rpc(db, user, "ws_all", { p_store: "clients" }))).toMatch(/session not active/);
  });

  it("names lose control and direction characters (no hidden right-to-left tricks in the watermark)", async () => {
    const id = await createUser(db, { fullName: "\u202Eדנה\u200B לוי ", phone: "052\u0007-123" });
    const { rows } = await db.query("select full_name, phone from public.profiles where id = $1", [id]);
    expect(rows[0]).toEqual({ full_name: "דנה לוי", phone: "052-123" });
  });

  it("users created before the migration get a profile too: suspended, unless the admin function made them", async () => {
    const early = await createDatabase({
      beforeMigrations: `insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner@example.com', '{"full_name":"הבעלים"}', '{}'),
        ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'made@example.com', '{}', '{"provisioned":true}')`,
    });
    const { rows } = await early.query("select email, full_name, role, status from public.profiles order by email");
    expect(rows).toEqual([
      { email: "made@example.com", full_name: "", role: "subscriber", status: "active" },
      { email: "owner@example.com", full_name: "הבעלים", role: "subscriber", status: "suspended" },
    ]);
  });

  it("a subscriber reads only their own profile", async () => {
    const a = await signedIn();
    await signedIn();
    const rows = await as(db, a, async (tx) => (await tx.query("select id from public.profiles")).rows);
    expect(rows.map((r) => r.id)).toEqual([a.id]);
  });

  it("anonymous visitors can call none of it", async () => {
    expect(await failure(rpc(db, null, "claim_session", { p_device_key: deviceKey(999), p_label: "" }))).toMatch(/permission denied/);
    expect(await failure(rpc(db, null, "ws_all", { p_store: "clients" }))).toMatch(/permission denied/);
    expect(await failure(as(db, null, (tx) => tx.query("select * from public.ws_clients")))).toMatch(/permission denied/);
  });
});

describe("one active session per account", () => {
  it("claiming a session returns the profile and lets it use the data", async () => {
    const id = await createUser(db, { fullName: "שני" });
    const user = { id, sessionId: await newSession(db, id), deviceKey: deviceKey(++keyCounter) };
    expect(await failure(rpc(db, user, "ws_all", { p_store: "clients" }))).toMatch(/session not active/);
    const result = await claim(user);
    expect(result).toMatchObject({ status: "ok", profile: { id, fullName: "שני", role: "subscriber", plan: "pro", deviceLimit: 2 } });
    expect(await rpc(db, user, "ws_all", { p_store: "clients" })).toEqual([]);
    expect(await rpc(db, user, "session_status", { p_device_key: user.deviceKey })).toEqual({ status: "ok" });
  });

  it("signing in elsewhere ends the previous session, which learns why", async () => {
    const first = await signedIn();
    await rpc(db, first, "ws_batch", { p_ops: [put("clients", { id: "c1", fullName: "רחל" })] });
    const second = await otherSession(first);
    expect((await claim(second)).status).toBe("ok");
    expect(await rpc(db, first, "session_status", { p_device_key: first.deviceKey })).toEqual({ status: "replaced" });
    expect(await failure(rpc(db, first, "ws_all", { p_store: "clients" }))).toMatch(/session not active/);
    // and directly on the table, row level security hides everything from it
    expect(await as(db, first, async (tx) => (await tx.query("select * from public.ws_clients")).rows)).toEqual([]);
    expect((await rpc(db, second, "ws_all", { p_store: "clients" })).map((c) => c.fullName)).toEqual(["רחל"]);
  });

  it("signing out ends the session at once, though its access token has not expired", async () => {
    const user = await signedIn();
    await rpc(db, user, "ws_batch", { p_ops: [put("clients", { id: "c1" })] });
    await endSession(db, user.sessionId);
    expect(await rpc(db, user, "session_status", { p_device_key: user.deviceKey })).toEqual({ status: "signed_out" });
    expect(await failure(rpc(db, user, "ws_all", { p_store: "clients" }))).toMatch(/session not active/);
    expect(await failure(claim(user))).toMatch(/not signed in/);
  });

  it("a session removed by a sign-in elsewhere learns it was replaced, not signed out", async () => {
    const first = await signedIn();
    const second = await otherSession(first);
    await claim(second);
    await endSession(db, first.sessionId); // the new session signs the others out
    expect(await rpc(db, first, "session_status", { p_device_key: first.deviceKey })).toEqual({ status: "replaced" });
    expect(await rpc(db, second, "session_status", { p_device_key: second.deviceKey })).toEqual({ status: "ok" });
  });

  it("reopening the app in the same session is not logged again", async () => {
    const user = await signedIn();
    await claim(user);
    await claim(user);
    expect((await auditOf(user.id)).filter((a) => a.action === "session_claimed")).toHaveLength(1);
  });
});

describe("devices", () => {
  it("allows the account's device limit and refuses one more, with a log entry", async () => {
    const user = await signedIn();
    expect((await claim(await otherSession(user))).status).toBe("ok");
    expect(await claim(await otherSession(user))).toEqual({ status: "device_limit", limit: 2 });
    expect((await auditOf(user.id)).some((a) => a.action === "device_refused" && a.detail.reason === "limit")).toBe(true);
  });

  it("a removed device frees its place, and can no longer sign in", async () => {
    const user = await signedIn();
    const phone = await otherSession(user);
    const phoneClaim = await claim(phone);
    const desk = await otherSession(user, user.deviceKey);
    await claim(desk); // back on the first device
    expect(await rpc(db, desk, "revoke_my_device", { p_device: phoneClaim.deviceId })).toEqual({ status: "ok" });
    expect((await claim(await otherSession(user))).status).toBe("ok");
    expect(await claim(await otherSession(user, phone.deviceKey))).toEqual({ status: "device_revoked" });
    expect(await rpc(db, phone, "session_status", { p_device_key: phone.deviceKey })).toEqual({ status: "device_revoked" });
  });

  it("cannot remove the device in use", async () => {
    const user = await signedIn();
    expect(await failure(rpc(db, user, "revoke_my_device", { p_device: user.deviceId }))).toMatch(/device in use/);
  });

  it("too many new devices within 30 days are refused, even with a free place", async () => {
    /** From the session in use, removes every other device the account has. */
    const freePlaces = async (current) => {
      const others = (await rpc(db, current, "my_devices")).filter((d) => !d.current && d.status === "approved");
      for (const d of others) await rpc(db, current, "revoke_my_device", { p_device: d.id });
    };
    let current = await signedIn(); // new device 1
    // swapping devices: with a limit of 2, at most 2 + 3 new devices in 30 days
    for (let i = 2; i <= 5; i++) {
      await freePlaces(current);
      const next = await otherSession(current);
      expect((await claim(next)).status).toBe("ok");
      current = next;
    }
    await freePlaces(current);
    expect(await claim(await otherSession(current))).toEqual({ status: "device_changes" });
  });

  it("admins are never locked out by the device rules", async () => {
    const admin = await signedInAdmin();
    for (let i = 0; i < 6; i++) expect((await claim(await otherSession(admin))).status).toBe("ok");
  });
});

describe("the workspace data", () => {
  it("each subscriber sees only their own records, even with the same ids", async () => {
    const a = await signedIn();
    const b = await signedIn();
    await rpc(db, a, "ws_batch", { p_ops: [put("clients", { id: "c1", fullName: "של א" }), put("readings", { id: "r1", clientId: "c1" })] });
    await rpc(db, b, "ws_batch", { p_ops: [put("clients", { id: "c1", fullName: "של ב" })] });
    expect(await rpc(db, a, "ws_get", { p_store: "clients", p_id: "c1" })).toEqual({ id: "c1", fullName: "של א" });
    expect(await rpc(db, b, "ws_get", { p_store: "clients", p_id: "c1" })).toEqual({ id: "c1", fullName: "של ב" });
    expect(await rpc(db, b, "ws_all", { p_store: "readings" })).toEqual([]);
    expect(await rpc(db, b, "ws_get", { p_store: "readings", p_id: "r1" })).toBeNull();
  });

  it("a batch applies all of its operations or none", async () => {
    const a = await signedIn();
    await rpc(db, a, "ws_batch", { p_ops: [put("clients", { id: "keep", fullName: "נשאר" })] });
    const bad = [{ type: "delete", store: "clients", id: "keep" }, put("clients", { id: "new", fullName: "חדש" }), put("nonsense", { id: "x" })];
    expect(await failure(rpc(db, a, "ws_batch", { p_ops: bad }))).toMatch(/unknown collection/);
    expect((await rpc(db, a, "ws_all", { p_store: "clients" })).map((c) => c.id)).toEqual(["keep"]);
  });

  it("refuses records written for someone else, or whose id does not match", async () => {
    const a = await signedIn();
    const b = await signedIn();
    const direct = (sql, args) => as(db, a, (tx) => tx.query(sql, args));
    // the tables take no writes of their own: everything goes through ws_batch, which names the caller's rows itself
    expect(await failure(direct("insert into public.ws_clients (owner_id, id, doc) values ($1, 'x', jsonb_build_object('id', 'x'))", [b.id]))).toMatch(/permission denied/);
    expect(await failure(direct("insert into public.ws_clients (id, doc) values ('x', jsonb_build_object('id', 'x'))"))).toMatch(/permission denied/);
    expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put("clients", { id: "" })] }))).toMatch(/needs a value with an id/);
    // and the table itself still refuses a document whose id is not its row's
    expect(await failure(db.query("insert into public.ws_clients (owner_id, id, doc) values ($1, 'x', jsonb_build_object('id', 'y'))", [a.id]))).toMatch(/check constraint/);
  });

  it("reads all three collections as one snapshot", async () => {
    const a = await signedIn();
    await rpc(db, a, "ws_batch", { p_ops: [put("clients", { id: "c" }), put("readings", { id: "r" }), put("attachments", { id: "f" })] });
    expect(await rpc(db, a, "ws_snapshot")).toEqual({ clients: [{ id: "c" }], readings: [{ id: "r" }], attachments: [{ id: "f" }] });
  });

  it("logs a deleted client by id only, and deleting a whole account leaves nothing behind", async () => {
    const a = await signedIn();
    await rpc(db, a, "ws_batch", { p_ops: [put("clients", { id: "c9", fullName: "פרטי מאוד" })] });
    await rpc(db, a, "ws_batch", { p_ops: [{ type: "delete", store: "clients", id: "c9" }] });
    const entry = (await auditOf(a.id)).find((x) => x.action === "client_deleted");
    expect(entry.detail).toEqual({ client: "c9" });
    await rpc(db, a, "ws_batch", { p_ops: [put("clients", { id: "c10" })] });
    await db.query("delete from auth.users where id = $1", [a.id]);
    const left = await db.query("select (select count(*) from public.ws_clients where owner_id = $1)::int as n", [a.id]);
    expect(left.rows[0].n).toBe(0);
  });
});

describe("file storage", () => {
  const insertObject = (user, name) => as(db, user, (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('ws-files', $1)", [name]));
  const visibleTo = (user) => as(db, user, async (tx) => (await tx.query("select name from storage.objects where bucket_id = 'ws-files' order by name")).rows.map((r) => r.name));

  it("each subscriber may use only their own folder, in their active session", async () => {
    const a = await signedIn();
    const b = await signedIn();
    await insertObject(a, `${a.id}/f1`);
    expect(await failure(insertObject(a, `${b.id}/f1`))).toMatch(/row-level security/);
    await insertObject(b, `${b.id}/f2`);
    expect(await visibleTo(a)).toEqual([`${a.id}/f1`]);
    await claim(await otherSession(a)); // a signs in elsewhere: the old session loses its files
    expect(await visibleTo(a)).toEqual([]);
  });
});

describe("administration", () => {
  it("is for admins only", async () => {
    const user = await signedIn();
    expect(await rpc(db, user, "am_i_admin")).toBe(false);
    for (const [name, args] of [["admin_list_accounts", {}], ["admin_audit", {}], ["admin_update_account", { p_user: user.id, p_patch: { plan: "studio" } }]]) {
      expect(await failure(rpc(db, user, name, args))).toMatch(/admins only/);
    }
  });

  it("lists accounts with their numbers, and suspending one ends its session", async () => {
    const admin = await signedInAdmin();
    expect(await rpc(db, admin, "am_i_admin")).toBe(true);
    const sub = await signedIn({ fullName: "מנויה" });
    await rpc(db, sub, "ws_batch", { p_ops: [put("clients", { id: "c1" }), put("clients", { id: "c2" })] });
    const row = (await rpc(db, admin, "admin_list_accounts")).find((x) => x.id === sub.id);
    expect(row).toMatchObject({ fullName: "מנויה", status: "active", devices: 1, clients: 2, readings: 0 });

    await rpc(db, admin, "admin_update_account", { p_user: sub.id, p_patch: { status: "suspended", plan: "studio" } });
    expect(await rpc(db, sub, "session_status", {})).toEqual({ status: "suspended" });
    expect(await failure(rpc(db, sub, "ws_all", { p_store: "clients" }))).toMatch(/session not active/);
    expect(await claim(await otherSession(sub))).toEqual({ status: "suspended" });

    await rpc(db, admin, "admin_update_account", { p_user: sub.id, p_patch: { status: "active" } });
    // suspending signed it out for real; reactivating does not revive it: it has to sign in again
    expect(await rpc(db, sub, "session_status", {})).toEqual({ status: "signed_out" });
    expect((await claim(await otherSession(sub, sub.deviceKey))).status).toBe("ok");
    expect((await auditOf(sub.id)).some((a) => a.action === "account_updated" && a.detail.status === "suspended")).toBe(true);
  });

  it("an admin cannot suspend or demote themselves", async () => {
    const admin = await signedInAdmin();
    expect(await failure(rpc(db, admin, "admin_update_account", { p_user: admin.id, p_patch: { status: "suspended" } }))).toMatch(/cannot suspend or demote themselves/);
    expect(await failure(rpc(db, admin, "admin_update_account", { p_user: admin.id, p_patch: { role: "subscriber" } }))).toMatch(/cannot suspend or demote themselves/);
  });

  it("revoking a device ends the session on it, and shows in the audit", async () => {
    const admin = await signedInAdmin();
    const sub = await signedIn();
    const devices = await rpc(db, admin, "admin_list_devices", { p_user: sub.id });
    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({ status: "approved", current: true });
    await rpc(db, admin, "admin_revoke_device", { p_device: sub.deviceId });
    expect(await rpc(db, sub, "session_status", { p_device_key: sub.deviceKey })).toEqual({ status: "device_revoked" });
    const audit = await rpc(db, admin, "admin_audit", { p_user: sub.id });
    expect(audit.map((a) => a.action)).toContain("device_revoked");
  });

  it("records what the admin function did, for admins only and known events only", async () => {
    const admin = await signedInAdmin();
    const sub = await signedIn();
    expect(await rpc(db, admin, "admin_log", { p_user: sub.id, p_action: "password_set" })).toEqual({ status: "ok" });
    expect((await auditOf(sub.id)).find((a) => a.action === "password_set")).toBeTruthy();
    expect(await failure(rpc(db, admin, "admin_log", { p_user: sub.id, p_action: "anything" }))).toMatch(/unknown event/);
    expect(await failure(rpc(db, sub, "admin_log", { p_user: sub.id, p_action: "password_set" }))).toMatch(/admins only/);
  });

  it("logs only the events the app may report", async () => {
    const user = await signedIn();
    expect(await rpc(db, user, "log_event", { p_action: "backup_exported" })).toEqual({ status: "ok" });
    expect(await failure(rpc(db, user, "log_event", { p_action: "anything" }))).toMatch(/unknown event/);
  });
});

describe("hardening", () => {
  it("signed-in users can change nothing in the account tables directly", async () => {
    const user = await signedIn();
    const direct = (sql) => failure(as(db, user, (tx) => tx.query(sql)));
    expect(await direct("update public.profiles set role = 'admin'")).toMatch(/permission denied/);
    expect(await direct("truncate public.audit_log")).toMatch(/permission denied/);
    expect(await direct("delete from public.active_sessions")).toMatch(/permission denied/);
    expect(await direct("insert into public.devices (user_id, device_key) values (gen_random_uuid(), 'x')")).toMatch(/permission denied/);
  });

  it("admin functions need two-step verification, even for an admin", async () => {
    const admin = await signedInAdmin();
    const unverified = { ...admin, aal: "aal1" };
    expect(await rpc(db, unverified, "am_i_admin")).toBe(false);
    expect(await failure(rpc(db, unverified, "admin_list_accounts"))).toMatch(/admins only/);
    expect(Array.isArray(await rpc(db, admin, "admin_list_accounts"))).toBe(true);
  });

  it("suspending, revoking the device in use, or ending the sessions signs the account out for real", async () => {
    const admin = await signedInAdmin();
    const sessionsOf = async (id) => (await db.query("select count(*)::int as n from auth.sessions where user_id = $1", [id])).rows[0].n;
    const a = await signedIn();
    await rpc(db, admin, "admin_update_account", { p_user: a.id, p_patch: { status: "suspended" } });
    expect(await sessionsOf(a.id)).toBe(0);
    const b = await signedIn();
    await rpc(db, admin, "admin_revoke_device", { p_device: b.deviceId });
    expect(await sessionsOf(b.id)).toBe(0);
    const c = await signedIn();
    await newSession(db, c.id); // another login of the same account, not claimed yet
    expect(await rpc(db, admin, "admin_end_sessions", { p_user: c.id })).toEqual({ status: "ok" });
    expect(await sessionsOf(c.id)).toBe(0);
    expect(await rpc(db, c, "session_status", {})).toEqual({ status: "signed_out" });
    expect(await failure(rpc(db, c, "admin_end_sessions", { p_user: a.id }))).toMatch(/admins only/);
  });

  it("files may only be named <own id>/<plain id>", async () => {
    const a = await signedIn();
    const upload = (name) => failure(as(db, a, (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('ws-files', $1)", [name])));
    expect(await upload(`${a.id}/../other`)).toMatch(/row-level security/);
    expect(await upload(`${a.id}/sub/dir`)).toMatch(/row-level security/);
    expect(await upload(`${a.id}/ok-id_1`)).toBe("no error");
  });

  it("a record id is a plain id", async () => {
    const a = await signedIn();
    expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put("clients", { id: "../x" })] }))).toMatch(/check constraint/);
  });

  it("an account's files have a quota", async () => {
    const a = await signedIn();
    const big = (id) => put("attachments", { id, size: 1500 * 1024 * 1024 });
    await rpc(db, a, "ws_batch", { p_ops: [big("f1")] });
    expect(await failure(rpc(db, a, "ws_batch", { p_ops: [big("f2")] }))).toMatch(/quota/);
    expect((await rpc(db, a, "ws_all", { p_store: "attachments" })).map((f) => f.id)).toEqual(["f1"]);
  });

  it("a client record has room for the longest notes the app allows, in any script", async () => {
    const a = await signedIn();
    const longest = { id: "c1", fullName: "ש".repeat(120), birthName: "ש".repeat(120), notes: "✨".repeat(20000), tags: Array.from({ length: 12 }, () => "ת".repeat(30)) };
    await rpc(db, a, "ws_batch", { p_ops: [put("clients", longest)] });
    expect((await rpc(db, a, "ws_get", { p_store: "clients", p_id: "c1" })).notes).toHaveLength(20000);
  });

  it("the app's own log entries are throttled", async () => {
    const a = await signedIn();
    const statuses = [];
    for (let i = 0; i < 205; i++) statuses.push((await rpc(db, a, "log_event", { p_action: "backup_exported" })).status);
    expect(statuses.filter((s) => s === "ok").length).toBeLessThan(205);
    expect(statuses.at(-1)).toBe("throttled");
  });
});
