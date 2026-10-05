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
  it("every new user gets an active subscriber profile with the name and phone given", async () => {
    const id = await createUser(db, { email: "dana@example.com", fullName: "דנה לוי", phone: "052-1234567" });
    const { rows } = await db.query("select email, full_name, phone, role, status, plan, device_limit from public.profiles where id = $1", [id]);
    expect(rows[0]).toEqual({ email: "dana@example.com", full_name: "דנה לוי", phone: "052-1234567", role: "subscriber", status: "active", plan: "pro", device_limit: 2 });
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
    const admin = await signedIn();
    await makeAdmin(db, admin.id);
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
    expect(await failure(direct("insert into public.ws_clients (owner_id, id, doc) values ($1, 'x', '{\"id\":\"x\"}')", [b.id]))).toMatch(/row-level security/);
    expect(await failure(rpc(db, a, "ws_batch", { p_ops: [put("clients", { id: "" })] }))).toMatch(/needs a value with an id/);
    expect(await failure(direct("insert into public.ws_clients (id, doc) values ('x', '{\"id\":\"y\"}')"))).toMatch(/check constraint/);
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
    const admin = await signedIn();
    await makeAdmin(db, admin.id);
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
    // reactivating does not revive the old session: it has to sign in again
    expect(await rpc(db, sub, "session_status", {})).toEqual({ status: "replaced" });
    expect((await claim(await otherSession(sub, sub.deviceKey))).status).toBe("ok");
    expect((await auditOf(sub.id)).some((a) => a.action === "account_updated" && a.detail.status === "suspended")).toBe(true);
  });

  it("an admin cannot suspend or demote themselves", async () => {
    const admin = await signedIn();
    await makeAdmin(db, admin.id);
    expect(await failure(rpc(db, admin, "admin_update_account", { p_user: admin.id, p_patch: { status: "suspended" } }))).toMatch(/cannot suspend or demote themselves/);
    expect(await failure(rpc(db, admin, "admin_update_account", { p_user: admin.id, p_patch: { role: "subscriber" } }))).toMatch(/cannot suspend or demote themselves/);
  });

  it("revoking a device ends the session on it, and shows in the audit", async () => {
    const admin = await signedIn();
    await makeAdmin(db, admin.id);
    const sub = await signedIn();
    const devices = await rpc(db, admin, "admin_list_devices", { p_user: sub.id });
    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({ status: "approved", current: true });
    await rpc(db, admin, "admin_revoke_device", { p_device: sub.deviceId });
    expect(await rpc(db, sub, "session_status", { p_device_key: sub.deviceKey })).toEqual({ status: "device_revoked" });
    const audit = await rpc(db, admin, "admin_audit", { p_user: sub.id });
    expect(audit.map((a) => a.action)).toContain("device_revoked");
  });

  it("logs only the events the app may report", async () => {
    const user = await signedIn();
    expect(await rpc(db, user, "log_event", { p_action: "backup_exported" })).toEqual({ status: "ok" });
    expect(await failure(rpc(db, user, "log_event", { p_action: "anything" }))).toMatch(/unknown event/);
  });
});
