/**
 * Everything the app asks of accounts, in one place: signing in and out,
 * claiming this device's session, the session's status, the subscriber's own
 * profile and devices, and the admin functions. Built over a supabase-js
 * client, so tests can hand it a stand-in.
 */
import { SessionError } from "../data/serverBackend.js";

/** An account action that failed with a known reason (`code`), e.g. "email_taken". */
export class AccountError extends Error {
  constructor(code) {
    super(code);
    this.name = "AccountError";
    this.code = code;
  }
}

function toError(error) {
  if (error.code === "42501" && /session not active/.test(error.message)) return new SessionError();
  const e = new Error(error.message || "request failed");
  e.code = error.code;
  return e;
}

/**
 * @param {{client: object, deviceKey: string, deviceLabel: string}} deps
 */
export function createAccountService({ client, deviceKey, deviceLabel }) {
  const rpc = async (fn, args = {}) => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw toError(error);
    return data;
  };

  /** The admin Edge Function; its refusals come back as AccountError codes. */
  async function adminFunction(body) {
    const { data, error } = await client.functions.invoke("admin-accounts", { body });
    if (!error) return data;
    const answer = error.context && typeof error.context.json === "function" ? await error.context.json().catch(() => ({})) : {};
    throw new AccountError(answer.error || "unavailable");
  }

  return {
    client,
    async savedSession() {
      const { data } = await client.auth.getSession();
      return data.session || null;
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (!error) return { ok: true };
      return { error: error.status === 400 || /invalid login credentials/i.test(error.message || "") ? "invalid_credentials" : "unavailable" };
    },
    /** Makes this the account's only working session; then every other session is signed out. */
    async claim() {
      const result = await rpc("claim_session", { p_device_key: deviceKey, p_label: deviceLabel });
      if (result.status === "ok") await client.auth.signOut({ scope: "others" });
      return result;
    },
    status: () => rpc("session_status", { p_device_key: deviceKey }),
    /** Signs this device out (and logs it while the session still may). */
    async signOut() {
      await rpc("log_event", { p_action: "signed_out" }).catch(() => {});
      await client.auth.signOut({ scope: "local" });
    },
    /** Forgets this device's saved login without asking the server anything (a refused or replaced session). */
    forget: () => client.auth.signOut({ scope: "local" }),
    async changePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw new AccountError(error.code || "unavailable");
    },
    updateProfile: (fullName, phone) => rpc("update_my_profile", { p_full_name: fullName, p_phone: phone }),
    myDevices: () => rpc("my_devices"),
    revokeMyDevice: (id) => rpc("revoke_my_device", { p_device: id }),
    logEvent: (action) => rpc("log_event", { p_action: action }),
    admin: {
      listAccounts: () => rpc("admin_list_accounts"),
      updateAccount: (userId, patch) => rpc("admin_update_account", { p_user: userId, p_patch: patch }),
      listDevices: (userId) => rpc("admin_list_devices", { p_user: userId }),
      revokeDevice: (deviceId) => rpc("admin_revoke_device", { p_device: deviceId }),
      audit: (userId = null, limit = 200) => rpc("admin_audit", { p_user: userId, p_limit: limit }),
      createAccount: (fields) => adminFunction({ action: "create", ...fields }),
      setPassword: (userId, password) => adminFunction({ action: "set_password", userId, password }),
    },
  };
}
