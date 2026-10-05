/*
 * The account service over a supabase-js stand-in: which calls it makes, and
 * how it reports what comes back.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAccountService, AccountError } from "../service.js";
import { SessionError } from "../../data/serverBackend.js";

function fakeClient({ signInError = null, rpcResults = {}, rpcErrors = {}, invokeResult = { data: { userId: "u9" }, error: null } } = {}) {
  const calls = [];
  const client = {
    calls,
    auth: {
      signInWithPassword: async (creds) => {
        calls.push(["signIn", creds]);
        return signInError ? { data: {}, error: signInError } : { data: { session: { access_token: "jwt" } }, error: null };
      },
      signOut: async (opts) => {
        calls.push(["signOut", opts]);
        return { error: null };
      },
      getSession: async () => ({ data: { session: { access_token: "jwt" } }, error: null }),
      updateUser: async (attrs) => {
        calls.push(["updateUser", attrs]);
        return { data: {}, error: null };
      },
    },
    rpc: async (fn, args) => {
      calls.push(["rpc", fn, args]);
      if (rpcErrors[fn]) return { data: null, error: rpcErrors[fn] };
      return { data: rpcResults[fn] ?? { status: "ok" }, error: null };
    },
    functions: {
      invoke: async (name, opts) => {
        calls.push(["invoke", name, opts.body]);
        return invokeResult;
      },
    },
  };
  return client;
}

const make = (client) => createAccountService({ client, deviceKey: "k".repeat(32), deviceLabel: "Chrome · Windows" });

describe("account service", () => {
  let client;
  beforeEach(() => {
    client = fakeClient();
  });

  it("signs in with the trimmed email, and tells a wrong password from an outage", async () => {
    expect(await make(client).signIn("  dana@example.com ", "secret-pass")).toEqual({ ok: true });
    expect(client.calls[0]).toEqual(["signIn", { email: "dana@example.com", password: "secret-pass" }]);
    const wrong = fakeClient({ signInError: { status: 400, message: "Invalid login credentials" } });
    expect(await make(wrong).signIn("dana@example.com", "nope")).toEqual({ error: "invalid_credentials" });
    const down = fakeClient({ signInError: { status: 0, message: "Failed to fetch" } });
    expect(await make(down).signIn("dana@example.com", "x")).toEqual({ error: "unavailable" });
  });

  it("claims the session for this device, then signs every other session out", async () => {
    client = fakeClient({ rpcResults: { claim_session: { status: "ok", profile: { id: "u1" }, deviceId: "d1" } } });
    expect(await make(client).claim()).toEqual({ status: "ok", profile: { id: "u1" }, deviceId: "d1" });
    expect(client.calls).toEqual([
      ["rpc", "claim_session", { p_device_key: "k".repeat(32), p_label: "Chrome · Windows" }],
      ["signOut", { scope: "others" }],
    ]);
  });

  it("leaves other sessions alone when the claim is refused", async () => {
    client = fakeClient({ rpcResults: { claim_session: { status: "device_limit", limit: 2 } } });
    expect(await make(client).claim()).toEqual({ status: "device_limit", limit: 2 });
    expect(client.calls.map((c) => c[0])).toEqual(["rpc"]);
  });

  it("asks for the session's status with this device's key", async () => {
    client = fakeClient({ rpcResults: { session_status: { status: "replaced" } } });
    expect(await make(client).status()).toEqual({ status: "replaced" });
    expect(client.calls[0]).toEqual(["rpc", "session_status", { p_device_key: "k".repeat(32) }]);
  });

  it("signs out of this device only, logging it first", async () => {
    await make(client).signOut();
    expect(client.calls).toEqual([["rpc", "log_event", { p_action: "signed_out" }], ["signOut", { scope: "local" }]]);
  });

  it("still signs out when the log entry cannot be written", async () => {
    client = fakeClient({ rpcErrors: { log_event: { code: "42501", message: "session not active" } } });
    await make(client).signOut();
    expect(client.calls.at(-1)).toEqual(["signOut", { scope: "local" }]);
  });

  it("turns a refused session into SessionError, and other failures into errors with a code", async () => {
    client = fakeClient({ rpcErrors: { my_devices: { code: "42501", message: "session not active" }, admin_list_accounts: { code: "42501", message: "admins only" } } });
    const service = make(client);
    await expect(service.myDevices()).rejects.toBeInstanceOf(SessionError);
    await expect(service.admin.listAccounts()).rejects.toMatchObject({ message: "admins only", code: "42501" });
  });

  it("calls the admin function for new accounts and passwords, and reports its error codes", async () => {
    expect(await make(client).admin.createAccount({ email: "a@b.co", password: "long-enough-1", fullName: "א", phone: "", plan: "pro" })).toEqual({ userId: "u9" });
    expect(client.calls[0]).toEqual(["invoke", "admin-accounts", { action: "create", email: "a@b.co", password: "long-enough-1", fullName: "א", phone: "", plan: "pro" }]);
    const taken = fakeClient({ invokeResult: { data: null, error: { name: "FunctionsHttpError", context: new Response(JSON.stringify({ error: "email_taken" }), { status: 409 }) } } });
    await expect(make(taken).admin.setPassword("u1", "long-enough-1")).rejects.toEqual(new AccountError("email_taken"));
    const down = fakeClient({ invokeResult: { data: null, error: { name: "FunctionsFetchError", message: "Failed to send a request" } } });
    await expect(make(down).admin.createAccount({})).rejects.toEqual(new AccountError("unavailable"));
  });

  it("changes the password through Auth", async () => {
    await make(client).changePassword("a-new-password");
    expect(client.calls[0]).toEqual(["updateUser", { password: "a-new-password" }]);
  });

  it("tells whoever watches when the server no longer accepts this login", async () => {
    for (const error of [
      { code: "42501", message: "session not active" }, // replaced, signed out or suspended
      { code: "42501", message: "permission denied for function my_devices" }, // the login lapsed: requests go out anonymous
      { code: "PGRST301", message: "JWT expired" },
    ]) {
      const lost = vi.fn();
      const service = make(fakeClient({ rpcErrors: { my_devices: error } }));
      service.watch(lost);
      await expect(service.myDevices()).rejects.toBeInstanceOf(SessionError);
      expect(lost).toHaveBeenCalledTimes(1);
    }
    const lost = vi.fn();
    const service = make(fakeClient({ rpcErrors: { my_devices: { code: "57014", message: "canceling statement due to statement timeout" } } }));
    service.watch(lost);
    await expect(service.myDevices()).rejects.toMatchObject({ code: "57014" });
    expect(lost).not.toHaveBeenCalled();
  });

  it("reports whether this login still needs its second step, and runs the two-step calls", async () => {
    const mfa = {
      getAuthenticatorAssuranceLevel: vi.fn(async () => ({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null })),
      listFactors: vi.fn(async () => ({ data: { totp: [{ id: "f1", status: "verified" }] }, error: null })),
      enroll: vi.fn(async () => ({ data: { id: "f2", totp: { qr_code: "data:image/svg+xml;utf-8,<svg/>", secret: "ABC123" } }, error: null })),
      challengeAndVerify: vi.fn(async () => ({ data: {}, error: null })),
      unenroll: vi.fn(async () => ({ data: {}, error: null })),
    };
    const service = make({ ...fakeClient(), auth: { ...fakeClient().auth, mfa } });
    expect(await service.mfaState()).toEqual({ level: "aal1", needsCode: true, factorId: "f1" });
    expect(await service.mfaEnroll()).toEqual({ factorId: "f2", qr: "data:image/svg+xml;utf-8,<svg/>", secret: "ABC123" });
    await service.mfaVerify("f1", "123456");
    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: "f1", code: "123456" });
    mfa.challengeAndVerify.mockResolvedValueOnce({ data: null, error: { code: "mfa_verification_failed", message: "Invalid TOTP code entered" } });
    await expect(service.mfaVerify("f1", "000000")).rejects.toEqual(new AccountError("wrong_code"));
  });
});
