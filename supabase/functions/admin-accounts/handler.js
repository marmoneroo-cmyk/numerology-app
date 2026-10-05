/**
 * The admin-accounts Edge Function: opens a subscriber account, or sets an
 * account's password. These need the project's secret key, so they run here
 * and never in the browser.
 *
 * The caller is checked first, by the database itself and as the caller:
 * am_i_admin() is true only for an admin in their account's active session,
 * verified in two steps. The secret key is used only for the Auth admin calls;
 * the plan, ending sessions and the audit entries go through the database as
 * the caller, under its rules. No email is sent: the admin hands the first
 * password to the subscriber.
 */

const PLANS = ["trial", "basic", "pro", "studio", "founder"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_PASSWORD = 10;
const MAX_PASSWORD = 72;

const text = (v) => (typeof v === "string" ? v.trim() : "");
const goodPassword = (p) => typeof p === "string" && p.length >= MIN_PASSWORD && p.length <= MAX_PASSWORD;

/** The request's problem as a plain code, or null when it is fine. */
function validate(body) {
  if (!body || typeof body !== "object") return "invalid_request";
  if (body.action === "create") {
    const email = text(body.email);
    if (email.length > 254 || !EMAIL.test(email)) return "invalid_email";
    if (!goodPassword(body.password)) return "invalid_password";
    if (text(body.fullName).length > 120 || text(body.phone).length > 25) return "invalid_details";
    if (body.plan !== undefined && !PLANS.includes(body.plan)) return "invalid_plan";
    return null;
  }
  if (body.action === "set_password") {
    if (!UUID.test(text(body.userId))) return "invalid_user";
    if (!goodPassword(body.password)) return "invalid_password";
    return null;
  }
  return "invalid_action";
}

/** What Supabase Auth's refusal of a new user means for the admin. */
function createFailure(error) {
  const code = error.code || "";
  if (code === "email_exists" || code === "user_already_exists" || /already (been )?registered|already exists/i.test(error.message || "")) return [409, "email_taken"];
  if (code === "weak_password" || /password/i.test(error.message || "")) return [400, "invalid_password"];
  return [400, "create_failed"];
}

/**
 * @param {Request} req
 * @param {{url: string, publishableKey: string, secretKey: string, allowedOrigins: string[], createClient: Function}} deps
 * @returns {Promise<Response>}
 */
export async function handleRequest(req, { url, publishableKey, secretKey, allowedOrigins, createClient }) {
  const origin = req.headers.get("Origin");
  const cors = {
    ...(origin && allowedOrigins.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return reply(401, { error: "sign_in_first" });

  const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  const asCaller = createClient(url, publishableKey, { ...noSession, global: { headers: { Authorization: authorization } } });
  const { data: isAdmin, error: checkError } = await asCaller.rpc("am_i_admin");
  // a database that answered "no" (or refused the token) is a refusal; one that did not answer is an outage
  if (checkError && !/^[0-9A-Z]{5}$/.test(checkError.code || "") && !/JWT|token/i.test(checkError.message || "")) return reply(503, { error: "unavailable" });
  if (checkError || isAdmin !== true) return reply(403, { error: "admins only" });

  let body;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "invalid_request" });
  }
  const problem = validate(body);
  if (problem) return reply(400, { error: problem });

  /** Runs a database call as the admin; a failure becomes a warning for the reply. */
  const warnings = [];
  const asAdmin = async (fn, args, warning) => {
    const { error } = await asCaller.rpc(fn, args);
    if (error) warnings.push(warning);
  };
  const admin = createClient(url, secretKey, noSession);

  if (body.action === "create") {
    const { data, error } = await admin.auth.admin.createUser({
      email: text(body.email),
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: text(body.fullName), phone: text(body.phone) },
      // only the secret key can write app_metadata: the database opens the account because of it
      app_metadata: { provisioned: true },
    });
    if (error) {
      const [status, code] = createFailure(error);
      return reply(status, { error: code });
    }
    const userId = data.user.id;
    if (body.plan) await asAdmin("admin_update_account", { p_user: userId, p_patch: { plan: body.plan } }, "plan_not_set");
    await asAdmin("admin_log", { p_user: userId, p_action: "account_created" }, "not_logged");
    return reply(200, { userId, warnings });
  }

  // set_password, then every session of the account ends (whatever Supabase does by itself)
  const userId = text(body.userId);
  const { error } = await admin.auth.admin.updateUserById(userId, { password: body.password });
  if (error) return reply(400, { error: /password/i.test(error.message || "") ? "invalid_password" : "update_failed" });
  await asAdmin("admin_end_sessions", { p_user: userId }, "sessions_not_ended");
  await asAdmin("admin_log", { p_user: userId, p_action: "password_set" }, "not_logged");
  return reply(200, { status: "ok", warnings });
}
