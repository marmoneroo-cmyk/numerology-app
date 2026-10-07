/**
 * Everything the app asks of accounts, in one place: signing in and out,
 * two-step verification, claiming this device's session, the session's
 * status, the subscriber's own profile and devices, and the admin functions.
 * Built over a supabase-js client, so tests can hand it a stand-in.
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

/**
 * The server no longer takes this login: the session was replaced, signed
 * out or suspended - or the login itself lapsed (an expired or dropped token
 * makes requests anonymous, which every function here refuses).
 */
function loginLost(error) {
  if (error.code === "42501" && /session not active|permission denied/.test(error.message || "")) return true;
  return /^PGRST30[0-9]$/.test(error.code || "") || /JWT/.test(error.message || "");
}

function toError(error) {
  if (loginLost(error)) return new SessionError();
  const e = new Error(error.message || "request failed");
  e.code = error.code;
  return e;
}

/**
 * @param {{client: object, deviceKey: string, deviceLabel: string}} deps
 */
export function createAccountService({ client, deviceKey, deviceLabel }) {
  const watchers = new Set();
  const rpc = async (fn, args = {}) => {
    const { data, error } = await client.rpc(fn, args);
    if (!error) return data;
    const e = toError(error);
    if (e instanceof SessionError) watchers.forEach((w) => w());
    throw e;
  };

  /** The admin Edge Function; its refusals come back as AccountError codes. */
  async function adminFunction(body) {
    const { data, error } = await client.functions.invoke("admin-accounts", { body });
    if (!error) return data;
    const answer = error.context && typeof error.context.json === "function" ? await error.context.json().catch(() => ({})) : {};
    throw new AccountError(answer.error || "unavailable");
  }
  const mfa = () => client.auth.mfa;

  return {
    client,
    /** `onLost()` runs whenever the server refuses this login; returns a function that stops it. */
    watch(onLost) {
      watchers.add(onLost);
      return () => watchers.delete(onLost);
    },
    async savedSession() {
      const { data } = await client.auth.getSession();
      return data.session || null;
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (!error) return { ok: true };
      return { error: error.status === 400 || /invalid login credentials/i.test(error.message || "") ? "invalid_credentials" : "unavailable" };
    },
    /** Where this login stands on two-step verification: its level, and whether a code is still needed. */
    async mfaState() {
      const [{ data: level }, { data: factors }] = await Promise.all([mfa().getAuthenticatorAssuranceLevel(), mfa().listFactors()]);
      const verified = (factors?.totp || []).find((f) => f.status === "verified");
      return { level: level?.currentLevel || "aal1", needsCode: level?.currentLevel === "aal1" && level?.nextLevel === "aal2", factorId: verified?.id || null };
    },
    /**
     * Starts adding an authenticator app: its QR code, link and key, to confirm
     * with a code. A setup left unconfirmed is removed first (Supabase keeps
     * them, and they count against the account's factors).
     */
    async mfaEnroll() {
      const { data: factors } = await mfa().listFactors();
      const unconfirmed = (factors?.all || []).filter((f) => f.factor_type === "totp" && f.status === "unverified");
      // best effort: every setup gets a name of its own, so a leftover cannot block the new one
      await Promise.all(unconfirmed.map((f) => mfa().unenroll({ factorId: f.id }).catch(() => null)));
      const friendlyName = `Studio ${new Date().toISOString().slice(0, 19).replace("T", " ")}`;
      const { data, error } = await mfa().enroll({ factorType: "totp", friendlyName });
      if (error) throw new AccountError("unavailable");
      return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri };
    },
    async mfaVerify(factorId, code) {
      const { error } = await mfa().challengeAndVerify({ factorId, code: code.trim() });
      if (!error) return;
      // a setup removed meanwhile (one started on another device clears it)
      if (error.code === "mfa_factor_not_found") throw new AccountError("setup_expired");
      throw new AccountError(/invalid|verification/i.test(`${error.code} ${error.message}`) ? "wrong_code" : "unavailable");
    },
    /**
     * Emails a code for choosing a new password (Supabase's "Reset password"
     * email). The answer is the same whether or not the address has an account.
     */
    async requestPasswordReset(email) {
      const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase());
      if (error) throw new AccountError(error.status === 429 ? "rate_limited" : "unavailable");
    },
    /** Signs in with the emailed code; the new password comes next, with changePassword. */
    async verifyResetCode(email, code) {
      const { error } = await client.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "recovery" });
      if (!error) return;
      if (error.status === 429) throw new AccountError("rate_limited");
      throw new AccountError(/expired|invalid/i.test(`${error.code} ${error.message}`) ? "wrong_code" : "unavailable");
    },
    async mfaRemove(factorId) {
      const { error } = await mfa().unenroll({ factorId });
      if (error) throw new AccountError("unavailable");
    },
    /**
     * Makes this the account's only working session. The database signs the account's other
     * logins out; this asks Auth to as well, and a failure there is not passed off as "ok".
     */
    async claim() {
      const result = await rpc("claim_session", { p_device_key: deviceKey, p_label: deviceLabel });
      if (result.status === "ok") {
        const { error } = await client.auth.signOut({ scope: "others" });
        if (error) throw new AccountError("unavailable");
      }
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
    /** Runs `onSignedOut()` when supabase-js drops the login by itself (a refresh the server refused). */
    onSignedOut(onSignedOut) {
      const { data } = client.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") onSignedOut();
      });
      return () => data.subscription.unsubscribe();
    },
    /**
     * A new password, then every other login of the account is signed out: one made with the old
     * password, or a copied one, must not go on working. "sessions_not_ended" means the password
     * changed but the others may still be signed in.
     */
    async changePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw new AccountError(error.code || "unavailable");
      const { error: others } = await client.auth.signOut({ scope: "others" });
      if (others) throw new AccountError("sessions_not_ended");
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
