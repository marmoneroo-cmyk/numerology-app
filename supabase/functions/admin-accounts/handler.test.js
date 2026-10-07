/*
 * The admin Edge Function's request logic, with stand-ins for supabase-js:
 * who may call it, what it checks, and what it asks Supabase to do.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { handleRequest } from "./handler.js";

const URL_ = "https://project.supabase.co";
const ORIGIN = "https://numerology-app-orcin.vercel.app";
const USER = "4f1c2a3b-5d6e-4f70-8a9b-0c1d2e3f4a5b";

/**
 * A supabase-js stand-in that records every call. `isAdmin` is what am_i_admin answers;
 * `rpcErrors` fails the named database functions; `createError` fails createUser.
 */
function fakeSupabase({ isAdmin = true, rpcErrors = {}, createError = null } = {}) {
  const calls = [];
  const createClient = (url, key, opts = {}) => {
    const as = opts.global?.headers?.Authorization ? `caller ${opts.global.headers.Authorization}` : `key ${key}`;
    return {
      rpc: async (fn, args) => {
        calls.push({ as, fn, args });
        if (rpcErrors[fn]) return { data: null, error: rpcErrors[fn] };
        if (fn === "am_i_admin") return { data: isAdmin, error: null };
        return { data: { status: "ok" }, error: null };
      },
      auth: {
        admin: {
          createUser: async (attrs) => {
            calls.push({ as, fn: "createUser", args: attrs });
            return createError ? { data: null, error: createError } : { data: { user: { id: USER } }, error: null };
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
const asCaller = (fake) => fake.calls.filter((c) => c.as === "caller Bearer user-jwt").map((c) => [c.fn, c.args]);

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
    expect(notAdmin.calls.map((c) => [c.as, c.fn])).toEqual([["caller Bearer user-jwt", "am_i_admin"]]);
  });

  it("tells an outage from a refusal", async () => {
    const down = fakeSupabase({ rpcErrors: { am_i_admin: { message: "upstream timeout", code: "" } } });
    expect(await call(down, request(create))).toMatchObject({ status: 503, body: { error: "unavailable" } });
  });

  it("opens an account: confirmed, marked as made by the admin, with name and phone, its plan set and logged", async () => {
    expect(await call(fake, request(create))).toEqual(expect.objectContaining({ status: 200, body: { userId: USER, warnings: [] } }));
    expect(fake.calls.find((c) => c.fn === "createUser")).toEqual({
      as: "key sb_secret_test",
      fn: "createUser",
      args: {
        email: "dana@example.com", password: "a-good-password", email_confirm: true,
        user_metadata: { full_name: "דנה לוי", phone: "052-1234567" },
        app_metadata: { provisioned: true },
      },
    });
    // the plan and the log go through the database as the admin, never with the secret key
    expect(asCaller(fake)).toEqual([
      ["am_i_admin", undefined],
      ["admin_update_account", { p_user: USER, p_patch: { plan: "founder" } }],
      ["admin_log", { p_user: USER, p_action: "account_created" }],
    ]);
  });

  it("says when the account opened but its plan or log entry did not stick", async () => {
    const partial = fakeSupabase({ rpcErrors: { admin_update_account: { message: "timeout", code: "57014" }, admin_log: { message: "timeout", code: "57014" } } });
    expect(await call(partial, request(create))).toMatchObject({ status: 200, body: { userId: USER, warnings: ["plan_not_set", "not_logged"] } });
  });

  it("refuses bad input before touching Supabase", async () => {
    for (const bad of [
      { ...create, email: "not-an-email" },
      { ...create, email: `${"a".repeat(250)}@example.com` },
      { ...create, password: "short" },
      { ...create, fullName: "x".repeat(121) },
      { ...create, plan: "platinum" },
      { action: "set_password", userId: USER, password: "short" },
      { action: "set_password", userId: "../not-a-uuid", password: "long-enough-pass" },
      { action: "drop_everything" },
    ]) {
      const f = fakeSupabase();
      expect((await call(f, request(bad))).status).toBe(400);
      expect(f.calls.map((c) => c.fn)).toEqual(["am_i_admin"]);
    }
  });

  it("tells an address already in use from a password Supabase finds too weak", async () => {
    const taken = fakeSupabase({ createError: { message: "A user with this email address has already been registered", status: 422, code: "email_exists" } });
    expect(await call(taken, request(create))).toMatchObject({ status: 409, body: { error: "email_taken" } });
    const weak = fakeSupabase({ createError: { message: "Password is known to be weak", status: 422, code: "weak_password" } });
    expect(await call(weak, request(create))).toMatchObject({ status: 400, body: { error: "invalid_password" } });
  });

  it("sets a new password, logs it, then signs every session of that account out", async () => {
    expect(await call(fake, request({ action: "set_password", userId: USER, password: "another-good-one" }))).toMatchObject({ status: 200, body: { status: "ok", warnings: [] } });
    expect(fake.calls.find((c) => c.fn === "updateUserById")).toEqual({ as: "key sb_secret_test", fn: "updateUserById", args: { id: USER, password: "another-good-one" } });
    // logged first: for an admin's own password, ending the sessions ends this request's session too
    expect(asCaller(fake).slice(1)).toEqual([
      ["admin_log", { p_user: USER, p_action: "password_set" }],
      ["admin_end_sessions", { p_user: USER }],
    ]);
  });
});
