/*
 * The admin Edge Function's request logic, with stand-ins for supabase-js:
 * who may call it, what it checks, and what it asks Supabase to do.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { handleRequest } from "./handler.js";

const URL_ = "https://project.supabase.co";
const ORIGIN = "https://numerology-app-orcin.vercel.app";

/** A supabase-js stand-in: records every call; `isAdmin` decides what am_i_admin answers. */
function fakeSupabase({ isAdmin = true, createError = null } = {}) {
  const calls = [];
  const createClient = (url, key, opts = {}) => {
    const as = opts.global?.headers?.Authorization ? `caller ${opts.global.headers.Authorization}` : `key ${key}`;
    return {
      rpc: async (fn, args) => {
        calls.push({ as, fn, args });
        if (fn === "am_i_admin") return { data: isAdmin, error: null };
        return { data: { status: "ok" }, error: null };
      },
      auth: {
        admin: {
          createUser: async (attrs) => {
            calls.push({ as, fn: "createUser", args: attrs });
            return createError ? { data: null, error: createError } : { data: { user: { id: "new-user-id" } }, error: null };
          },
          updateUserById: async (id, attrs) => {
            calls.push({ as, fn: "updateUserById", args: { id, ...attrs } });
            return { data: { user: { id } }, error: null };
          },
        },
      },
    };
  };
  return { calls, createClient };
}

const env = { url: URL_, publishableKey: "sb_publishable_test", secretKey: "sb_secret_test", allowedOrigins: [ORIGIN] };
const request = (body, { token = "Bearer user-jwt", method = "POST", origin = ORIGIN } = {}) =>
  new Request(`${URL_}/functions/v1/admin-accounts`, {
    method,
    headers: { ...(token ? { Authorization: token } : {}), "Content-Type": "application/json", Origin: origin },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
const call = async (fake, req) => {
  const res = await handleRequest(req, { ...env, createClient: fake.createClient });
  return { status: res.status, body: res.status === 204 ? null : await res.json(), headers: res.headers };
};
const create = { action: "create", email: "dana@example.com", password: "a-good-password", fullName: "דנה לוי", phone: "052-1234567", plan: "founder" };

describe("admin-accounts", () => {
  let fake;
  beforeEach(() => {
    fake = fakeSupabase();
  });

  it("answers the browser's CORS preflight for the app only", async () => {
    const ok = await call(fake, request(null, { method: "OPTIONS" }));
    expect(ok.status).toBe(204);
    expect(ok.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    const other = await call(fake, request(null, { method: "OPTIONS", origin: "https://evil.example" }));
    expect(other.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("needs a signed-in admin, checked by the database as the caller", async () => {
    expect((await call(fake, request(create, { token: null }))).status).toBe(401);
    const notAdmin = fakeSupabase({ isAdmin: false });
    expect(await call(notAdmin, request(create))).toMatchObject({ status: 403, body: { error: "admins only" } });
    expect(notAdmin.calls.map((c) => c.fn)).toEqual(["am_i_admin"]);
    expect(notAdmin.calls[0].as).toBe("caller Bearer user-jwt");
  });

  it("opens an account: confirmed, with name and phone, its plan set and the event logged", async () => {
    expect(await call(fake, request(create))).toEqual(expect.objectContaining({ status: 200, body: { userId: "new-user-id" } }));
    const created = fake.calls.find((c) => c.fn === "createUser");
    expect(created).toEqual({
      as: "key sb_secret_test",
      fn: "createUser",
      args: { email: "dana@example.com", password: "a-good-password", email_confirm: true, user_metadata: { full_name: "דנה לוי", phone: "052-1234567" } },
    });
    // the plan and the log go through the database as the admin, never with the secret key
    expect(fake.calls.filter((c) => c.fn !== "createUser").map((c) => [c.as, c.fn, c.args])).toEqual([
      ["caller Bearer user-jwt", "am_i_admin", undefined],
      ["caller Bearer user-jwt", "admin_update_account", { p_user: "new-user-id", p_patch: { plan: "founder" } }],
      ["caller Bearer user-jwt", "admin_log", { p_user: "new-user-id", p_action: "account_created" }],
    ]);
  });

  it("refuses bad input before touching Supabase", async () => {
    for (const bad of [
      { ...create, email: "not-an-email" },
      { ...create, password: "short" },
      { ...create, fullName: "x".repeat(121) },
      { ...create, plan: "platinum" },
      { action: "set_password", userId: "u1", password: "short" },
      { action: "drop_everything" },
    ]) {
      const f = fakeSupabase();
      expect((await call(f, request(bad))).status).toBe(400);
      expect(f.calls.map((c) => c.fn)).toEqual(["am_i_admin"]);
    }
  });

  it("reports an address that already has an account", async () => {
    const taken = fakeSupabase({ createError: { message: "A user with this email address has already been registered", status: 422 } });
    expect(await call(taken, request(create))).toMatchObject({ status: 409, body: { error: "email_taken" } });
  });

  it("sets a new password (which also ends that account's sessions) and logs it", async () => {
    expect((await call(fake, request({ action: "set_password", userId: "u1", password: "another-good-one" }))).status).toBe(200);
    expect(fake.calls.find((c) => c.fn === "updateUserById")).toEqual({ as: "key sb_secret_test", fn: "updateUserById", args: { id: "u1", password: "another-good-one" } });
    expect(fake.calls.at(-1)).toEqual({ as: "caller Bearer user-jwt", fn: "admin_log", args: { p_user: "u1", p_action: "password_set" } });
  });
});
