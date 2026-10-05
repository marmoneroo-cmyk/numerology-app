/**
 * The admin-accounts Edge Function: opens a subscriber account, or sets an
 * account's password. These need the project's secret key, so they run here
 * and never in the browser.
 *
 * The caller is checked first, by the database itself and as the caller:
 * am_i_admin() is true only for an admin in their account's active session.
 * The secret key is used only for the Auth admin calls; the plan and the
 * audit entries go through the database as the caller, under its rules.
 * No email is sent: the admin hands the first password to the subscriber.
 */

const PLANS = ["trial", "basic", "pro", "studio", "founder"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 10;

const text = (v) => (typeof v === "string" ? v.trim() : "");

/** The request's problems in plain codes, or null when it is fine. */
function validate(body) {
  if (!body || typeof body !== "object") return "invalid_request";
  if (body.action === "create") {
    if (!EMAIL.test(text(body.email)) || text(body.email).length > 254) return "invalid_email";
    if (typeof body.password !== "string" || body.password.length < MIN_PASSWORD || body.password.length > 72) return "invalid_password";
    if (text(body.fullName).length > 120 || text(body.phone).length > 25) return "invalid_details";
    if (body.plan !== undefined && !PLANS.includes(body.plan)) return "invalid_plan";
    return null;
  }
  if (body.action === "set_password") {
    if (!text(body.userId)) return "invalid_user";
    if (typeof body.password !== "string" || body.password.length < MIN_PASSWORD || body.password.length > 72) return "invalid_password";
    return null;
  }
  return "invalid_action";
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
  if (checkError || isAdmin !== true) return reply(403, { error: "admins only" });

  let body;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "invalid_request" });
  }
  const problem = validate(body);
  if (problem) return reply(400, { error: problem });

  const admin = createClient(url, secretKey, noSession);
  if (body.action === "create") {
    const { data, error } = await admin.auth.admin.createUser({
      email: text(body.email),
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: text(body.fullName), phone: text(body.phone) },
    });
    if (error) {
      const taken = error.status === 422 || /already been registered|already exists/i.test(error.message || "");
      return reply(taken ? 409 : 400, { error: taken ? "email_taken" : "create_failed" });
    }
    const userId = data.user.id;
    if (body.plan) await asCaller.rpc("admin_update_account", { p_user: userId, p_patch: { plan: body.plan } });
    await asCaller.rpc("admin_log", { p_user: userId, p_action: "account_created" });
    return reply(200, { userId });
  }

  // set_password: Supabase also ends every session of that account
  const { error } = await admin.auth.admin.updateUserById(text(body.userId), { password: body.password });
  if (error) return reply(400, { error: "update_failed" });
  await asCaller.rpc("admin_log", { p_user: text(body.userId), p_action: "password_set" });
  return reply(200, { status: "ok" });
}
