/*
 * Attacks on the admin-accounts Edge Function, and on the database rules it
 * leans on. Every test asserts the SECURE behaviour.
 *
 * Fixed on 2026-10-07 (migration 20261007120000_security_fixes.sql and the app): every weakness this file
 * found now runs as a plain `it` that guards its fix; the comment above each test says what it was.
 * One stays `it.fails` on purpose, marked OPEN, ACCEPTED: it is handled by procedure, not code.
 *
 * `it.fails(...)` marks a real weakness found by the audit: the secure
 * behaviour does not hold today, so the test is expected to fail. When the fix
 * lands Vitest reports that the test now passes; drop `.fails` then, so the
 * test keeps guarding the fix. The fix is in the VULN comment above each one.
 *
 * Set-up: the same supabase-js stand-in as handler.test.js, with more
 * recording (every client built, with its key and its Authorization), and
 * index.ts is run for real (type-stripped, with a fake `Deno`) so the key
 * parsing and the origin list are the production ones. The database section
 * runs the real migration in PGlite through the repo's own harness.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { transformWithOxc } from "vite";
import { createClient as realCreateClient } from "@supabase/supabase-js";
import { handleRequest } from "./handler.js";
import { createDatabase, createUser, newSession, endSession, rpc } from "../../tests/harness.js";

const URL_ = "https://project.supabase.co";
const ORIGIN = "https://numerology-app-orcin.vercel.app";
const USER = "4f1c2a3b-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const OTHER_ADMIN = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
// obviously fake: these exist only to prove they never come back out of the function
// (the secret-shaped one is joined at run time, so no secret scanner has anything to find in this file)
const SECRET = `${"sb_secret"}_FAKE_for_tests_only_0123456789`;
const PUBLISHABLE = "sb_publishable_FAKE_for_tests_only";
const TOKEN = "Bearer user-jwt";

/**
 * A supabase-js stand-in that records every client built (`clients`: which key,
 * which Authorization) and every call (`calls`: who made it).
 * `adminAnswer` is what am_i_admin returns; `rpcThrows` makes it throw instead.
 */
function fakeSupabase({ adminAnswer = { data: true, error: null }, rpcThrows = null, rpcErrors = {}, createError = null, updateError = null, createThrows = null } = {}) {
  const calls = [];
  const clients = [];
  const createClient = (url, key, opts = {}) => {
    const authorization = opts.global?.headers?.Authorization;
    clients.push({ url, key, authorization });
    const as = authorization ? `caller ${authorization}` : `key ${key}`;
    return {
      rpc: async (fn, args) => {
        calls.push({ as, fn, args });
        if (fn === "am_i_admin") {
          if (rpcThrows) throw rpcThrows;
          return adminAnswer;
        }
        if (rpcErrors[fn]) return { data: null, error: rpcErrors[fn] };
        return { data: { status: "ok" }, error: null };
      },
      auth: {
        admin: {
          createUser: async (attrs) => {
            calls.push({ as, fn: "createUser", args: attrs });
            if (createThrows) throw createThrows;
            return createError ? { data: null, error: createError } : { data: { user: { id: USER } }, error: null };
          },
          updateUserById: async (id, attrs) => {
            calls.push({ as, fn: "updateUserById", args: { id, attrs } });
            return updateError ? { data: null, error: updateError } : { data: { user: { id } }, error: null };
          },
        },
      },
    };
  };
  return { calls, clients, createClient };
}

const env = { url: URL_, publishableKey: PUBLISHABLE, secretKey: SECRET, allowedOrigins: [ORIGIN] };
/** `raw` sends text as it is; `origin: null` sends no Origin header (curl); `token: null` sends no Authorization. */
const request = (body, { token = TOKEN, method = "POST", origin = ORIGIN, raw = null, headers = {} } = {}) =>
  new Request(`${URL_}/functions/v1/admin-accounts`, {
    method,
    headers: { ...(token !== null ? { Authorization: token } : {}), "Content-Type": "application/json", ...(origin !== null ? { Origin: origin } : {}), ...headers },
    body: method === "POST" ? (raw ?? JSON.stringify(body)) : undefined,
  });
const call = async (fake, req, deps = {}) => {
  const res = await handleRequest(req, { ...env, createClient: fake.createClient, ...deps });
  const text = await res.text();
  return { status: res.status, text, body: text ? JSON.parse(text) : null, headers: res.headers };
};
/** A request whose body must not be touched: reading it fails the test. */
const unreadable = (headers) => ({ method: "POST", headers: new Headers(headers), json: () => Promise.reject(new Error("the body was read")) });

const create = { action: "create", email: "dana@example.com", password: "a-good-password", fullName: "דנה לוי", phone: "052-1234567", plan: "founder" };
const setPassword = { action: "set_password", userId: USER, password: "another-good-one" };
const did = (fake, fn) => fake.calls.filter((c) => c.fn === fn);
/** Nothing but the admin check happened, and the secret key was never even put in a client. */
const onlyTheCheck = (fake) => {
  expect(fake.calls.map((c) => c.fn)).toEqual(["am_i_admin"]);
  expect(fake.clients.map((c) => c.key)).toEqual([PUBLISHABLE]);
};

describe("who may call the function", () => {
  it("answers 401 with no Authorization header, and builds no client at all", async () => {
    const fake = fakeSupabase();
    expect(await call(fake, request(create, { token: null }))).toMatchObject({ status: 401, body: { error: "sign_in_first" } });
    expect(fake.clients).toEqual([]);
    expect(fake.calls).toEqual([]);
  });

  it.each(["", "Bearer", "bearer lower-case-scheme", "Basic dXNlcjpwYXNz", "Token abc", "Bearer\tabc", SECRET])("refuses an Authorization that is not 'Bearer <token>': %j", async (token) => {
    const fake = fakeSupabase();
    expect(await call(fake, request(create, { token }))).toMatchObject({ status: 401, body: { error: "sign_in_first" } });
    expect(fake.clients).toEqual([]);
  });

  it("hands the caller's header, untouched, to the database, and the secret key never goes along with it", async () => {
    const fake = fakeSupabase();
    await call(fake, request(create, { token: "Bearer  header.with.odd-spacing" }));
    expect(fake.clients[0]).toEqual({ url: URL_, key: PUBLISHABLE, authorization: "Bearer  header.with.odd-spacing" });
    // the secret key is put in a client only after the check, and that client carries no caller header
    expect(fake.clients[1]).toEqual({ url: URL_, key: SECRET, authorization: undefined });
    expect(fake.clients).toHaveLength(2);
    expect(fake.calls.findIndex((c) => c.fn === "am_i_admin")).toBe(0);
    expect(fake.calls.filter((c) => c.as === `key ${SECRET}`).map((c) => c.fn)).toEqual(["createUser"]);
  });

  it("says 403 to a signed-in non-admin after one database question, with no Auth admin call and no secret-key client", async () => {
    const fake = fakeSupabase({ adminAnswer: { data: false, error: null } });
    expect(await call(fake, request(create))).toMatchObject({ status: 403, body: { error: "admins only" } });
    onlyTheCheck(fake);
    expect(fake.calls[0].as).toBe(`caller ${TOKEN}`);
  });

  it("reads the body only after the caller is known to be an admin (a flood of bodies from non-admins costs nothing)", async () => {
    const asker = fakeSupabase({ adminAnswer: { data: false, error: null } });
    const res = await handleRequest(unreadable({ Authorization: TOKEN, Origin: ORIGIN }), { ...env, createClient: asker.createClient });
    expect(res.status).toBe(403);
    // and with no Authorization at all, not even the database is asked
    const nobody = fakeSupabase();
    expect((await handleRequest(unreadable({ Origin: ORIGIN }), { ...env, createClient: nobody.createClient })).status).toBe(401);
    expect(nobody.calls).toEqual([]);
  });

  it.each([null, undefined, false, "true", "t", 1, {}, [true], { is_admin: true }])("lets only a boolean true through: am_i_admin answering %j is a refusal", async (answer) => {
    const fake = fakeSupabase({ adminAnswer: { data: answer, error: null } });
    expect((await call(fake, request(create))).status).toBe(403);
    onlyTheCheck(fake);
  });

  it("does not trust an answer that arrives together with an error", async () => {
    const fake = fakeSupabase({ adminAnswer: { data: true, error: { code: "57014", message: "canceling statement" } } });
    expect((await call(fake, request(create))).status).toBe(403);
    onlyTheCheck(fake);
  });

  it("takes who the caller is from the token alone: body fields and headers that claim an identity change nothing", async () => {
    const fake = fakeSupabase();
    const res = await call(fake, request({ ...create, actor: "admin", adminId: OTHER_ADMIN, p_user: OTHER_ADMIN, userId: OTHER_ADMIN, role: "admin" }, {
      headers: { "X-User-Id": OTHER_ADMIN, "X-Admin": "true", "X-Forwarded-User": OTHER_ADMIN, apikey: SECRET },
    }));
    expect(res.status).toBe(200);
    // every database call the function makes is as the caller's own token, and about the account Auth just made
    expect(fake.calls.filter((c) => c.as.startsWith("caller")).every((c) => c.as === `caller ${TOKEN}`)).toBe(true);
    expect(did(fake, "admin_log")[0].args).toEqual({ p_user: USER, p_action: "account_created" });
    expect(did(fake, "admin_update_account")[0].args.p_user).toBe(USER);
    expect(fake.clients.every((c) => c.key === PUBLISHABLE || c.key === SECRET)).toBe(true);
    expect(JSON.stringify(fake.calls)).not.toContain(OTHER_ADMIN);
  });
});

describe("what each failure of the admin check means", () => {
  // the database answered with a reason, or refused the token: a refusal
  const REFUSALS = [
    ["a JWT the database says expired", { code: "PGRST301", message: "JWT expired" }],
    ["a JWT it cannot decode", { code: "PGRST301", message: "Expected 3 parts in JWT; got 1" }],
    ["a token complaint with no code", { message: "invalid token" }],
    ["permission denied (SQLSTATE 42501)", { code: "42501", message: "permission denied for function am_i_admin" }],
    ["invalid authorization (SQLSTATE 28000)", { code: "28000", message: "invalid authorization specification" }],
    ["the function missing for this role (SQLSTATE 42883)", { code: "42883", message: "function public.am_i_admin() does not exist" }],
  ];
  // the database did not answer: an outage, and still not an admin
  const OUTAGES = [
    ["a network failure", { code: "", message: "TypeError: fetch failed" }],
    ["a reset connection", { code: "", message: "FetchError: read ECONNRESET" }],
    ["PostgREST without a database (PGRST000)", { code: "PGRST000", message: "Could not connect with the database." }],
    ["PostgREST's schema cache not ready (PGRST002)", { code: "PGRST002", message: "Could not query the database for the schema cache. Retrying." }],
    ["the function missing from the schema cache (PGRST202)", { code: "PGRST202", message: "Could not find the function public.am_i_admin" }],
    ["a gateway refusing the key", { message: "Invalid API key" }],
    ["an error with nothing in it", {}],
  ];
  // PINNED, not wished for: every 5-character SQLSTATE counts as "the database answered", so a database
  // that is overloaded or timing out also reads as "admins only" (never as admin; only the wording is off)
  const TIMEOUTS = [
    ["a statement timeout (57014)", { code: "57014", message: "canceling statement due to statement timeout" }],
    ["too many connections (53300)", { code: "53300", message: "sorry, too many clients already" }],
    ["a connection failure (08006)", { code: "08006", message: "connection failure" }],
  ];

  it.each([...REFUSALS, ...TIMEOUTS])("%s is a 403 and nothing else happens", async (_label, error) => {
    const fake = fakeSupabase({ adminAnswer: { data: null, error } });
    expect(await call(fake, request(create))).toMatchObject({ status: 403, body: { error: "admins only" } });
    onlyTheCheck(fake);
  });

  it.each(OUTAGES)("%s is a 503, never an admin, and nothing else happens", async (_label, error) => {
    const fake = fakeSupabase({ adminAnswer: { data: null, error } });
    expect(await call(fake, request(create))).toMatchObject({ status: 503, body: { error: "unavailable" } });
    onlyTheCheck(fake);
  });

  it("lets an exception from the check escape (Deno answers a bare 500): nothing is created, nothing is leaked", async () => {
    const fake = fakeSupabase({ rpcThrows: new TypeError(`fetch failed for ${SECRET}`) });
    await expect(handleRequest(request(create), { ...env, createClient: fake.createClient })).rejects.toThrow(TypeError);
    onlyTheCheck(fake);
  });

  // FIXED after the 2026-10-07 audit; was (LOW): handler.js:74. A token PostgREST rejects is told from an outage only by the words "JWT" or
  // "token" in its message. PostgREST's PGRST301 also says "JWSError JWSInvalidSignature" and "No suitable key
  // or wrong key type" (what a token signed with a key it does not know gets, with ES256 signing keys), so a
  // forged or foreign token is answered 503 "unavailable". It fails closed, but an attack looks like an outage
  // in the UI and in the logs. Fix: treat the whole PGRST30x family as a refusal, whatever the message:
  //   const refused = /^[0-9A-Z]{5}$/.test(code) || /^PGRST30\d$/.test(code) || /JWT|token/i.test(message);
  //   if (checkError && !refused) return reply(503, { error: "unavailable" });
  it("a token PostgREST rejects as invalid is a refusal (401/403), whatever the wording of its message", async () => {
    for (const message of ["JWSError JWSInvalidSignature", "No suitable key or wrong key type", "JWSError (CompactDecodeError Invalid number of parts: Expected 3 parts; got 2)"]) {
      const fake = fakeSupabase({ adminAnswer: { data: null, error: { code: "PGRST301", message } } });
      const res = await call(fake, request(create));
      expect([401, 403]).toContain(res.status);
      onlyTheCheck(fake);
    }
  });
});

describe("methods", () => {
  it.each(["GET", "PUT", "DELETE", "PATCH", "HEAD"])("%s is 405 before anything else, even with an admin's token", async (method) => {
    const fake = fakeSupabase();
    const res = await call(fake, request(create, { method }));
    expect(res.status).toBe(405);
    expect(res.body).toEqual({ error: "method_not_allowed" });
    expect(fake.clients).toEqual([]);
  });

  it("answers the preflight (and only the preflight) without a token, with POST and OPTIONS as the only methods", async () => {
    const fake = fakeSupabase();
    const res = await call(fake, request(null, { method: "OPTIONS", token: null }));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
    expect(fake.clients).toEqual([]);
  });
});

describe("CORS", () => {
  const HOSTILE = [
    "https://evil.example",
    "http://numerology-app-orcin.vercel.app", // the wrong scheme
    "https://numerology-app-orcin.vercel.app.evil.example", // a longer host
    "https://evil-numerology-app-orcin.vercel.app", // a prefix
    "https://numerology-app-orcin.vercel.app:8443", // another port
    "https://numerology-app-orcin.vercel.app/", // a trailing slash
    "HTTPS://NUMEROLOGY-APP-ORCIN.VERCEL.APP", // another case
    "null",
    "*",
    "",
  ];

  it("gives a disallowed origin no Access-Control-Allow-Origin on any answer: preflight, 401, 403, 405, 400, 200", async () => {
    for (const origin of HOSTILE) {
      const answers = [
        await call(fakeSupabase(), request(null, { method: "OPTIONS", origin })),
        await call(fakeSupabase(), request(create, { origin, token: null })),
        await call(fakeSupabase({ adminAnswer: { data: false, error: null } }), request(create, { origin })),
        await call(fakeSupabase(), request(create, { origin, method: "GET" })),
        await call(fakeSupabase(), request({ action: "nope" }, { origin })),
        await call(fakeSupabase(), request(create, { origin })),
      ];
      for (const res of answers) {
        expect(res.headers.get("Access-Control-Allow-Origin"), `origin ${JSON.stringify(origin)}`).toBeNull();
        expect(res.headers.get("Access-Control-Allow-Credentials")).toBeNull();
      }
    }
  });

  it("gives no CORS origin to a caller that sends none (curl), and never a wildcard", async () => {
    const res = await call(fakeSupabase(), request(create, { origin: null }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("echoes only the exact allowed origin, varies on it, and sets no credentials header (auth is a bearer header, not a cookie)", async () => {
    for (const req of [request(null, { method: "OPTIONS" }), request(create)]) {
      const res = await call(fakeSupabase(), req);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
      expect(res.headers.get("Vary")).toBe("Origin");
      expect(res.headers.get("Access-Control-Allow-Credentials")).toBeNull();
      expect(res.headers.get("Access-Control-Allow-Headers")).toBe("authorization, x-client-info, apikey, content-type");
    }
  });
});

describe("what the production entry (index.ts) hands the function", () => {
  /** index.ts as it runs under Deno: types stripped, imports supplied, `Deno` faked. Returns the deps it builds. */
  async function loadIndex(denoEnv) {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    const { code } = await transformWithOxc(source, "index.ts", { lang: "ts", target: "es2022" });
    let serve;
    let deps;
    const Deno = { env: { get: (name) => denoEnv[name] }, serve: (fn) => (serve = fn) };
    new Function("Deno", "createClient", "handleRequest", code.replace(/^import .*$/gm, ""))(Deno, realCreateClient, (req, built) => {
      deps = built;
      return new Response(null, { status: 204 });
    });
    await serve(new Request(`${URL_}/functions/v1/admin-accounts`));
    return deps;
  }
  const full = { SUPABASE_URL: URL_, SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: PUBLISHABLE }), SUPABASE_SECRET_KEYS: JSON.stringify({ default: SECRET }) };

  it("reads the new key sets (JSON with a default), the project URL, and keeps the two keys apart", async () => {
    const deps = await loadIndex(full);
    expect(deps).toMatchObject({ url: URL_, publishableKey: PUBLISHABLE, secretKey: SECRET });
    expect(deps.createClient).toBe(realCreateClient);
  });

  it("falls back to the legacy variables only for the matching key, and never lends one key's value to the other", async () => {
    const legacy = await loadIndex({ SUPABASE_URL: URL_, SUPABASE_ANON_KEY: "legacy-anon", SUPABASE_SERVICE_ROLE_KEY: "legacy-service" });
    expect(legacy).toMatchObject({ publishableKey: "legacy-anon", secretKey: "legacy-service" });
    const onlyPublic = await loadIndex({ SUPABASE_URL: URL_, SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: PUBLISHABLE }) });
    expect(onlyPublic.secretKey).toBe("");
    const onlySecret = await loadIndex({ SUPABASE_URL: URL_, SUPABASE_SECRET_KEYS: JSON.stringify({ default: SECRET }) });
    expect(onlySecret.publishableKey).toBe("");
  });

  it.each(["not json", "null", "[]", "\"just a string\"", "42", "{}", "{\"other\":\"key\"}"])("a key variable that is %s falls back to the legacy value instead of throwing", async (value) => {
    const deps = await loadIndex({ SUPABASE_URL: URL_, SUPABASE_SECRET_KEYS: value, SUPABASE_SERVICE_ROLE_KEY: "legacy-service", SUPABASE_PUBLISHABLE_KEYS: value, SUPABASE_ANON_KEY: "legacy-anon" });
    expect(deps).toMatchObject({ publishableKey: "legacy-anon", secretKey: "legacy-service" });
  });

  it("fails closed when the keys are missing: the answer is an error, the request does nothing", async () => {
    const deps = await loadIndex({});
    expect(deps).toMatchObject({ url: "", publishableKey: "", secretKey: "" });
    // the real supabase-js refuses to build a client with no key, before any request leaves
    await expect(handleRequest(request(create), deps)).rejects.toThrow(/is required/);
    // the cheap refusals need no keys at all
    expect((await handleRequest(request(create, { token: null }), deps)).status).toBe(401);
    expect((await handleRequest(request(create, { method: "GET" }), deps)).status).toBe(405);
  });

  it("allows the production app's origin", async () => {
    expect((await loadIndex(full)).allowedOrigins).toContain(ORIGIN);
  });

  // FIXED after the 2026-10-07 audit; was (LOW): supabase/functions/admin-accounts/index.ts:18. The production function also trusts
  // http://localhost:5273. A browser origin is shared by everything that listens on that port on the machine
  // (another dev server there reads the same localStorage as this app's dev server, including an admin login
  // made against the real project), so this widens CORS and the reach of a stolen dev session for nothing in
  // production. Fix: allow localhost only when the deploy says so:
  //   allowedOrigins: ["https://numerology-app-orcin.vercel.app", ...(Deno.env.get("ALLOW_LOCALHOST") === "1" ? ["http://localhost:5273"] : [])],
  // (set ALLOW_LOCALHOST=1 only on a development project).
  it("the production origin list holds no localhost origin", async () => {
    const origins = (await loadIndex(full)).allowedOrigins;
    expect(origins.filter((o) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(o))).toEqual([]);
  });

  it("uses the secret key in exactly one place in handler.js: the Auth admin client built after the check", () => {
    const source = readFileSync(new URL("./handler.js", import.meta.url), "utf8");
    const code = source.split("\n").filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));
    const uses = code.filter((line) => line.includes("secretKey"));
    expect(uses).toHaveLength(2); // the destructured parameter, and the one client
    expect(uses.some((line) => line.includes("createClient(url, secretKey, noSession)"))).toBe(true);
    // and it is not logged, templated or returned anywhere
    expect(code.join("\n")).not.toMatch(/console\.|`[^`]*secretKey|JSON\.stringify\([^)]*secretKey/);
    const entry = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(entry).not.toMatch(/console\.|sb_secret_|eyJ[A-Za-z0-9_-]{10,}/);
  });
});

describe("what a create request may carry into Auth", () => {
  const FIELDS = ["app_metadata", "email", "email_confirm", "password", "user_metadata"];
  const expectedCreate = {
    email: "dana@example.com",
    password: "a-good-password",
    email_confirm: true,
    user_metadata: { full_name: "דנה לוי", phone: "052-1234567" },
    app_metadata: { provisioned: true },
  };

  it("passes exactly the email, the password, a confirmed address, the name and phone, and the provisioned mark", async () => {
    const fake = fakeSupabase();
    expect((await call(fake, request(create))).status).toBe(200);
    const [created] = did(fake, "createUser");
    expect(created.args).toEqual(expectedCreate);
    expect(Object.keys(created.args).sort()).toEqual(FIELDS);
    expect(Object.keys(created.args.user_metadata).sort()).toEqual(["full_name", "phone"]);
    expect(Object.keys(created.args.app_metadata)).toEqual(["provisioned"]);
  });

  it("ignores every extra field: role, app_metadata, email_confirm, user_metadata overrides, ids, bans, patches", async () => {
    const fake = fakeSupabase();
    const hostile = {
      ...create,
      role: "admin",
      app_metadata: { role: "admin", provisioned: false, provider: "google" },
      user_metadata: { full_name: "Evil", role: "admin", phone: "999" },
      email_confirm: false,
      phone_confirm: true,
      ban_duration: "none",
      userId: OTHER_ADMIN,
      id: OTHER_ADMIN,
      aud: "service_role",
      deviceLimit: 5,
      status: "suspended",
      p_patch: { role: "admin", status: "active" },
    };
    expect((await call(fake, request(hostile))).status).toBe(200);
    const [created] = did(fake, "createUser");
    expect(created.args).toEqual(expectedCreate);
    expect(Object.keys(created.args).sort()).toEqual(FIELDS);
    // the plan is the only thing that goes to the database as a patch, and as that one key
    expect(did(fake, "admin_update_account").map((c) => c.args)).toEqual([{ p_user: USER, p_patch: { plan: "founder" } }]);
    expect(JSON.stringify(fake.calls)).not.toContain(OTHER_ADMIN);
  });

  it("an '__proto__' or 'constructor' member in the body pollutes nothing and reaches nothing", async () => {
    const fake = fakeSupabase();
    const raw = `{"action":"create","email":"dana@example.com","password":"a-good-password","fullName":"x","phone":"y",` +
      `"__proto__":{"role":"admin","plan":"studio","email_confirm":false,"app_metadata":{"role":"admin"}},` +
      `"constructor":{"prototype":{"polluted":true}}}`;
    expect((await call(fake, request(null, { raw }))).status).toBe(200);
    const [created] = did(fake, "createUser");
    expect(Object.keys(created.args).sort()).toEqual(FIELDS);
    expect(created.args.app_metadata).toEqual({ provisioned: true });
    expect(created.args.email_confirm).toBe(true);
    expect(Object.getPrototypeOf(created.args)).toBe(Object.prototype);
    // a plan smuggled through the prototype is not a plan: no patch is sent
    expect(did(fake, "admin_update_account")).toEqual([]);
    expect({}.role).toBeUndefined();
    expect({}.polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "plan")).toBe(false);
  });

  it("sends a plan only when it is one of the five, as a patch with that single key", async () => {
    for (const plan of ["trial", "basic", "pro", "studio", "founder"]) {
      const fake = fakeSupabase();
      expect((await call(fake, request({ ...create, plan }))).status).toBe(200);
      expect(did(fake, "admin_update_account").map((c) => c.args)).toEqual([{ p_user: USER, p_patch: { plan } }]);
    }
    const none = fakeSupabase();
    await call(none, request({ ...create, plan: undefined }));
    expect(did(none, "admin_update_account")).toEqual([]);
  });

  it.each(["platinum", "", "PRO", "pro ", " pro", null, 0, false, ["pro"], { plan: "pro" }, "__proto__", "admin"])("refuses the plan %j before touching Auth", async (plan) => {
    const fake = fakeSupabase();
    expect(await call(fake, request({ ...create, plan }))).toMatchObject({ status: 400, body: { error: "invalid_plan" } });
    onlyTheCheck(fake);
  });

  it("keeps a name or phone that is not text out of Auth as empty text, not as an object or array", async () => {
    const fake = fakeSupabase();
    expect((await call(fake, request({ ...create, fullName: ["A", "B"], phone: { n: 1 } }))).status).toBe(200);
    expect(did(fake, "createUser")[0].args.user_metadata).toEqual({ full_name: "", phone: "" });
  });

  it("trims names and phones before the length check, and refuses one character too many", async () => {
    const ok = fakeSupabase();
    expect((await call(ok, request({ ...create, fullName: `  ${"x".repeat(120)}  `, phone: ` ${"1".repeat(25)} ` }))).status).toBe(200);
    expect(did(ok, "createUser")[0].args.user_metadata).toEqual({ full_name: "x".repeat(120), phone: "1".repeat(25) });
    for (const bad of [{ fullName: "x".repeat(121) }, { phone: "1".repeat(26) }]) {
      const fake = fakeSupabase();
      expect(await call(fake, request({ ...create, ...bad }))).toMatchObject({ status: 400, body: { error: "invalid_details" } });
      onlyTheCheck(fake);
    }
  });

  it.each(["", "   ", "no-at-sign", "a@b", "a b@example.com", "@example.com", "a@@example.com", `${"a".repeat(250)}@example.com`, 123, ["a@example.com"], { a: "b@example.com" }, null])(
    "refuses the email %j before touching Auth",
    async (email) => {
      const fake = fakeSupabase();
      expect(await call(fake, request({ ...create, email }))).toMatchObject({ status: 400, body: { error: "invalid_email" } });
      onlyTheCheck(fake);
    },
  );

  it("PINNED: the email check is deliberately loose (shape only); Auth is the real validator", async () => {
    for (const email of ["a@b.c", "a@b..c", "a@example..", "<x>@example.com", "o'neil+tag@example.com"]) {
      const fake = fakeSupabase();
      expect((await call(fake, request({ ...create, email }))).status).toBe(200);
      expect(did(fake, "createUser")[0].args.email).toBe(email);
    }
  });

  it("enforces the password length (10 to 72) on text only", async () => {
    for (const [password, status] of [["x".repeat(9), 400], ["x".repeat(10), 200], ["x".repeat(72), 200], ["x".repeat(73), 400]]) {
      const fake = fakeSupabase();
      expect((await call(fake, request({ ...create, password }))).status).toBe(status);
      if (status === 400) onlyTheCheck(fake);
    }
    for (const password of [1234567890123, ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"], { length: 20 }, true, null, undefined]) {
      const fake = fakeSupabase();
      expect(await call(fake, request({ ...create, password }))).toMatchObject({ status: 400, body: { error: "invalid_password" } });
      onlyTheCheck(fake);
    }
  });

  it("PINNED: nothing but length is checked, so '          ' or '0000000000' is a password here (strength is Auth's job)", async () => {
    for (const password of [" ".repeat(10), "0000000000", "aaaaaaaaaa", "password12"]) {
      const fake = fakeSupabase();
      expect((await call(fake, request({ ...create, password }))).status).toBe(200);
      expect(did(fake, "createUser")[0].args.password).toBe(password);
    }
  });

  it("answers what Auth says with a short code, and never with its message", async () => {
    const taken = fakeSupabase({ createError: { message: `already registered ${SECRET}`, code: "email_exists", status: 422 } });
    expect(await call(taken, request(create))).toMatchObject({ status: 409, body: { error: "email_taken" } });
    const weak = fakeSupabase({ createError: { message: `Password is known to be weak ${SECRET}`, code: "weak_password", status: 422 } });
    expect(await call(weak, request(create))).toMatchObject({ status: 400, body: { error: "invalid_password" } });
    const other = fakeSupabase({ createError: { message: `database error saving new user ${SECRET}`, code: "unexpected_failure", status: 500 } });
    expect(await call(other, request(create))).toMatchObject({ status: 400, body: { error: "create_failed" } });
    for (const fake of [taken, weak, other]) {
      expect(did(fake, "admin_update_account")).toEqual([]);
      expect(did(fake, "admin_log")).toEqual([]);
    }
  });
});

describe("set_password", () => {
  const SQL_ISH = ["'; drop table auth.users;--", "1 OR 1=1", USER + "' OR '1'='1", "../../admin/users", USER + "/../" + OTHER_ADMIN, USER + "?role=admin", USER + "#", "x" + USER, `{${USER}}`, "00000000-0000-0000-0000-00000000000g", "", "null", "undefined"];
  const NOT_TEXT = [123, [USER], { id: USER }, true, null];

  it("needs a well-formed UUID, and nothing else gets near Auth", async () => {
    for (const userId of [...SQL_ISH, ...NOT_TEXT]) {
      const fake = fakeSupabase();
      expect(await call(fake, request({ ...setPassword, userId })), `userId ${JSON.stringify(userId)}`).toMatchObject({ status: 400, body: { error: "invalid_user" } });
      onlyTheCheck(fake);
    }
    const missing = fakeSupabase();
    expect((await call(missing, request({ action: "set_password", password: "another-good-one" }))).status).toBe(400);
    onlyTheCheck(missing);
  });

  it("hands Auth the validated id exactly (trimmed of spaces and newlines), and only the password", async () => {
    for (const [sent, used] of [[USER, USER], [` ${USER}\n`, USER], [USER.toUpperCase(), USER.toUpperCase()]]) {
      const fake = fakeSupabase();
      expect((await call(fake, request({ ...setPassword, userId: sent }))).status).toBe(200);
      const [updated] = did(fake, "updateUserById");
      expect(updated.args.id).toBe(used);
      expect(updated.args.id).toMatch(/^[0-9a-fA-F-]{36}$/);
      expect(Object.keys(updated.args.attrs)).toEqual(["password"]);
    }
  });

  it("ignores every extra field: email, role, metadata, bans, confirmation flags", async () => {
    const fake = fakeSupabase();
    const hostile = { ...setPassword, email: "evil@example.com", role: "admin", app_metadata: { role: "admin" }, user_metadata: { x: 1 }, email_confirm: true, ban_duration: "none", phone: "1", id: OTHER_ADMIN };
    expect((await call(fake, request(hostile))).status).toBe(200);
    expect(did(fake, "updateUserById")).toEqual([{ as: `key ${SECRET}`, fn: "updateUserById", args: { id: USER, attrs: { password: "another-good-one" } } }]);
  });

  it("checks the password like create does, and refuses before touching Auth", async () => {
    for (const password of ["short", "x".repeat(73), 1234567890123, ["x".repeat(12)], null]) {
      const fake = fakeSupabase();
      expect(await call(fake, request({ ...setPassword, password }))).toMatchObject({ status: 400, body: { error: "invalid_password" } });
      onlyTheCheck(fake);
    }
  });

  it("ends the account's sessions and logs it as the caller, and says so if either did not happen", async () => {
    const fake = fakeSupabase();
    expect(await call(fake, request(setPassword))).toMatchObject({ status: 200, body: { status: "ok", warnings: [] } });
    const afterCheck = fake.calls.filter((c) => c.as === `caller ${TOKEN}`).slice(1);
    expect(afterCheck.map((c) => [c.fn, c.args]).sort()).toEqual([
      ["admin_end_sessions", { p_user: USER }],
      ["admin_log", { p_user: USER, p_action: "password_set" }],
    ]);
    const half = fakeSupabase({ rpcErrors: { admin_end_sessions: { code: "57014", message: "timeout" }, admin_log: { code: "42501", message: "admins only" } } });
    expect(await call(half, request(setPassword))).toMatchObject({ status: 200, body: { warnings: expect.arrayContaining(["sessions_not_ended", "not_logged"]) } });
  });

  // FIXED after the 2026-10-07 audit; was (LOW): handler.js:117-118. The account's sessions are ended first and the audit entry written second, as
  // the caller. An admin who sets THEIR OWN password (the screen offers it) ends the very session the second call
  // needs: admin_log is refused ("admins only"), no password_set entry is ever written, the reply says "not_logged",
  // and the admin is signed out in the middle of the hand-over (see the database section for the proof).
  // Fix: swap the two awaits, so the entry is written while the caller is still signed in:
  //   await asAdmin("admin_log", { p_user: userId, p_action: "password_set" }, "not_logged");
  //   await asAdmin("admin_end_sessions", { p_user: userId }, "sessions_not_ended");
  it("the audit entry is written before the sessions are ended, so a self-reset is still logged", async () => {
    const fake = fakeSupabase();
    await call(fake, request({ ...setPassword, userId: USER }));
    const order = fake.calls.map((c) => c.fn);
    expect(order.indexOf("admin_log")).toBeGreaterThan(-1);
    expect(order.indexOf("admin_log")).toBeLessThan(order.indexOf("admin_end_sessions"));
  });

  it("answers an Auth refusal with a short code only", async () => {
    const fake = fakeSupabase({ updateError: { message: `User not found ${SECRET}`, status: 404, code: "user_not_found" } });
    expect(await call(fake, request(setPassword))).toMatchObject({ status: 400, body: { error: "update_failed" } });
    expect(did(fake, "admin_end_sessions")).toEqual([]);
  });

  it("PINNED (design): any UUID is a valid target, an admin's included, because the function cannot see roles", async () => {
    // So one admin can set another admin's password and sign in as them with the first factor; their admin powers
    // still need that account's second step, but the account's own workspace does not (see the database section).
    const fake = fakeSupabase();
    expect((await call(fake, request({ ...setPassword, userId: OTHER_ADMIN }))).status).toBe(200);
    expect(did(fake, "updateUserById")[0].args.id).toBe(OTHER_ADMIN);
  });
});

describe("what comes back", () => {
  it("never holds a body that is not an object, text that is not JSON, or an action it does not know", async () => {
    for (const raw of ["not json", "", "{", "[1,2", "{'a':1}", "undefined", String.fromCodePoint(0)]) {
      const fake = fakeSupabase();
      expect(await call(fake, request(null, { raw })), `body ${JSON.stringify(raw)}`).toMatchObject({ status: 400, body: { error: "invalid_request" } });
      onlyTheCheck(fake);
    }
    for (const raw of ["null", "42", "\"create\"", "true", "false"]) {
      const fake = fakeSupabase();
      expect(await call(fake, request(null, { raw })), `body ${raw}`).toMatchObject({ status: 400, body: { error: "invalid_request" } });
      onlyTheCheck(fake);
    }
    for (const raw of ["[]", "[{\"action\":\"create\"}]"]) {
      const fake = fakeSupabase();
      expect((await call(fake, request(null, { raw }))).status).toBe(400);
      onlyTheCheck(fake);
    }
  });

  it.each(["delete", "CREATE", "Create", " create", "create ", "set_password ", "setPassword", "set-password", "", "update", "list", "__proto__", "constructor", null, 0, true, ["create"], { name: "create" }])(
    "refuses the action %j",
    async (action) => {
      const fake = fakeSupabase();
      expect(await call(fake, request({ ...create, action }))).toMatchObject({ status: 400, body: { error: "invalid_action" } });
      onlyTheCheck(fake);
    },
  );

  it("refuses a body with no action at all", async () => {
    const fake = fakeSupabase();
    expect((await call(fake, request({ email: "a@example.com", password: "a-good-password" }))).status).toBe(400);
    onlyTheCheck(fake);
  });

  it("never lets the secret key (or the publishable one) into a response body or header, however Auth, the database or the caller misbehave", async () => {
    const leaky = (extra = {}) => fakeSupabase({
      rpcErrors: { admin_update_account: { message: `timeout ${SECRET}`, code: "57014" }, admin_log: { message: `bad ${SECRET} ${PUBLISHABLE}`, code: "42501" }, admin_end_sessions: { message: SECRET, code: "42501" } },
      ...extra,
    });
    const scenarios = [
      [leaky(), request(create)],
      [leaky(), request(setPassword)],
      [leaky({ createError: { message: `already registered ${SECRET}`, code: "email_exists" } }), request(create)],
      [leaky({ createError: { message: `boom ${SECRET}`, code: "unexpected" } }), request(create)],
      [leaky({ updateError: { message: `boom ${SECRET}` } }), request(setPassword)],
      [leaky({ adminAnswer: { data: null, error: { message: `down ${SECRET} ${PUBLISHABLE}`, code: "" } } }), request(create)],
      [leaky({ adminAnswer: { data: null, error: { message: `JWT ${SECRET}`, code: "PGRST301" } } }), request(create)],
      [leaky({ adminAnswer: { data: false, error: null } }), request(create)],
      [leaky(), request(create, { token: null })],
      [leaky(), request(create, { method: "GET" })],
      [leaky(), request(null, { method: "OPTIONS" })],
      [leaky(), request({ action: "nope" })],
      [leaky(), request(null, { raw: "{" })],
    ];
    for (const [fake, req] of scenarios) {
      const res = await call(fake, req);
      const everything = JSON.stringify([res.status, res.text, [...res.headers]]);
      expect(everything).not.toContain(SECRET);
      expect(everything).not.toContain("sb_secret_");
      expect(everything).not.toContain(PUBLISHABLE);
    }
  });

  it("lets an exception from Auth escape as an exception, never as a response that could carry it", async () => {
    const fake = fakeSupabase({ createThrows: new Error(`socket hang up ${SECRET}`) });
    await expect(handleRequest(request(create), { ...env, createClient: fake.createClient })).rejects.toThrow(/socket hang up/);
    expect(did(fake, "admin_update_account")).toEqual([]);
  });
});

describe("abuse volume", () => {
  it("has no rate limit: each bad-token request costs one database question, never an Auth admin call or the secret key", async () => {
    // EXPOSURE, stated rather than fixed here: with "Verify JWT" off at the gateway, anyone can make the
    // function boot and ask PostgREST once per request. Valid admin tokens are not guessable, so this is
    // cost (invocations, one RPC each), not access. A stolen admin token has no limit at all: see the report.
    const fake = fakeSupabase({ adminAnswer: { data: null, error: { code: "PGRST301", message: "JWT expired" } } });
    for (let i = 0; i < 300; i++) {
      expect((await call(fake, request(create, { token: `Bearer forged-${i}` }))).status).toBe(403);
    }
    expect(fake.calls).toHaveLength(300);
    expect(new Set(fake.calls.map((c) => c.fn))).toEqual(new Set(["am_i_admin"]));
    expect(fake.clients.every((c) => c.key === PUBLISHABLE)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The database's side of the same attacks: the real migration in PGlite (the repo's harness), as PostgREST
// would call it. `auth.mfa_factors` is created first, as Supabase has it, so rules that look at it can be tried.
// ---------------------------------------------------------------------------------------------------------

const MFA_FACTORS = `
  create table if not exists auth.mfa_factors (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    factor_type text not null default 'totp',
    status text not null default 'unverified',
    created_at timestamptz not null default now()
  );`;
const HIDDEN = [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x2060, 0x2066, 0x2067, 0x2068, 0x2069, 0xfeff].map((c) => String.fromCodePoint(c));
const hasHidden = (text) => HIDDEN.some((ch) => text.includes(ch));

describe("the database side of the same attacks (the real migration, in PGlite)", () => {
  let db;
  beforeAll(async () => {
    db = await createDatabase({ beforeMigrations: MFA_FACTORS });
  }, 60000);

  let n = 0;
  const key = () => `attack-device-key-${String(++n).padStart(8, "0")}`;
  const asUser = async (id, aal = "aal1", deviceKey = key()) => ({ id, sessionId: await newSession(db, id), deviceKey, aal });
  const claim = (user, label = "Chrome") => rpc(db, user, "claim_session", { p_device_key: user.deviceKey, p_label: label });
  const failure = async (promise) => {
    try {
      await promise;
    } catch (e) {
      return e;
    }
    return null;
  };
  /** An account whose session has been claimed (no second step on the account yet). */
  const signedIn = async (opts = {}) => {
    const id = await createUser(db, { email: `attack${++n}@example.com`, ...opts });
    const user = await asUser(id);
    expect((await claim(user)).status).toBe("ok");
    return user;
  };
  const addFactor = (id, { status = "verified", ago = "1 day" } = {}) =>
    db.query(`insert into auth.mfa_factors (user_id, status, created_at) values ($1, $2, now() - interval '${ago}')`, [id, status]);
  const promote = (id) => db.query("update public.profiles set role = 'admin' where id = $1", [id]);
  /** An admin as the owner makes one: promoted, with an authenticator set up a day ago (before any sign-in made here). */
  const makeAdmin = async (id) => {
    await promote(id);
    await addFactor(id, { ago: "1 day" });
  };

  it("admin work needs the second step: a password-only admin is not an admin, and the function's one gate says so", async () => {
    const admin = await signedIn();
    await makeAdmin(admin.id);
    expect(await rpc(db, { ...admin, aal: "aal1" }, "am_i_admin")).toBe(false);
    expect(await rpc(db, { ...admin, aal: "aal2" }, "am_i_admin")).toBe(true);
    const sub = await signedIn();
    expect(await rpc(db, { ...sub, aal: "aal2" }, "am_i_admin")).toBe(false);
    // an ended session is no admin either, whatever its token still says
    await endSession(db, admin.sessionId);
    expect(await rpc(db, { ...admin, aal: "aal2" }, "am_i_admin")).toBe(false);
  });

  // FIXED after the 2026-10-07 audit; was (HIGH): supabase/migrations/20261005120000_accounts_and_workspace.sql:130-140 (session_ok) and :190-192
  // (claim_session). Only private.is_admin() looks at the assurance level. claim_session and private.session_ok() (which every
  // workspace policy and function uses) accept a password-only login (aal1) even for an account that has a
  // verified authenticator: the code screen exists only in the browser, so anyone with the password calls
  // claim_session and the ws_* functions directly and never meets it. The same login can also take the
  // account's one active session away from its owner (and from an admin) again and again.
  // Fix: in private.session_ok(), and the same test in claim_session before it changes anything, add
  //   and (coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
  //        or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'))
  // (add auth.mfa_factors to the harness' stand-in, as created at the top of this section).
  it("a password-only login (aal1) cannot claim the session of an account that has a verified authenticator", async () => {
    const id = await createUser(db, { email: `mfa${++n}@example.com` });
    await addFactor(id);
    const passwordOnly = await asUser(id, "aal1");
    expect((await claim(passwordOnly)).status).not.toBe("ok");
  });

  it("and a session that was claimed before the authenticator was set up stops working at aal1 once it exists", async () => {
    const early = await signedIn(); // claimed with the password alone, while there was no second step
    await rpc(db, early, "ws_batch", { p_ops: [{ type: "put", store: "clients", value: { id: "c1", fullName: "x" } }] });
    await addFactor(early.id, { ago: "1 minute" }); // the owner now turns two-step on
    const failed = await failure(rpc(db, early, "ws_all", { p_store: "clients" }));
    expect(failed).not.toBeNull();
  });

  it("control: the same account's verified second step (aal2) opens it and reads its data", async () => {
    const id = await createUser(db, { email: `mfa${++n}@example.com` });
    await addFactor(id);
    const verified = await asUser(id, "aal2");
    expect((await claim(verified)).status).toBe("ok");
    expect(await rpc(db, verified, "ws_all", { p_store: "clients" })).toEqual([]);
  });

  // OPEN, ACCEPTED (MEDIUM; handled by procedure: accounts start as subscribers and become admins only after setting their own password and authenticator): migration :146-151. is_admin() trusts the token's aal claim, and the token cannot tell
  // WHEN the authenticator was set up. For a new admin (or any admin before their first enrolment) whoever
  // holds the password can enrol their own authenticator first and is then "aal2": the first password is
  // handed over in a chat, and an admin with no factor yet is open to anyone who has it. Where Auth allows
  // enrolling a further factor at aal1, the same works against an admin who has one (Not verified: live Auth).
  // Fix: count only a factor that existed before this sign-in began:
  //   and exists (select 1 from auth.mfa_factors f join auth.sessions s on s.id::text = coalesce(auth.jwt() ->> 'session_id', '')
  //               where f.user_id = auth.uid() and f.status = 'verified' and f.created_at < s.created_at)
  // (the admin who has just enrolled signs in again to use the admin screens), and refuse role = 'admin' in
  // admin_update_account for an account with no verified factor.
  it.fails("VULN: an admin whose authenticator was set up during this very sign-in is not yet an admin", async () => {
    const admin = await signedIn();
    await promote(admin.id); // an admin with no authenticator yet: the password is all that guards the account
    await addFactor(admin.id, { ago: "-1 minute" }); // enrolled AFTER this session began (the attacker's own, at aal1)
    expect(await rpc(db, { ...admin, aal: "aal2" }, "am_i_admin")).toBe(false);
  });

  it("control: an admin whose authenticator predates the sign-in is an admin at aal2", async () => {
    const id = await createUser(db, { email: `admin${++n}@example.com` });
    await addFactor(id, { ago: "1 day" });
    const admin = await asUser(id, "aal2");
    await claim(admin);
    await promote(id);
    expect(await rpc(db, admin, "am_i_admin")).toBe(true);
  });

  // FIXED after the 2026-10-07 audit; was (MEDIUM): migration :233-237 (the only thing claim_session does to the previous session is stop
  // treating it as the active one). Ending it for real is left to the browser that won (service.js:123
  // calls signOut({scope:'others'}) and drops its error). Until that call lands, or if it never does, the
  // replaced login still exists in Supabase (its refresh token works) and can claim the account straight
  // back: a login that survives a password change, or one copied from a browser, keeps taking the session
  // from its owner. Fix, inside claim_session, right after the insert ... on conflict statement:
  //   delete from auth.sessions where user_id = v_uid and id <> v_session::uuid;
  it("a replaced login is ended by the claim that replaced it, so it cannot claim the account back", async () => {
    const owner = await signedIn();
    const thief = await asUser(owner.id, "aal1");
    expect((await claim(thief, "Other browser")).status).toBe("ok");
    const comeback = await failure(claim(owner));
    expect(comeback).not.toBeNull();
    expect(comeback.message).toMatch(/not signed in/);
  });

  it("control: once the other logins really are gone (what the browser's sign-out of the others does), the old one is locked out", async () => {
    const owner = await signedIn();
    const second = await asUser(owner.id);
    await claim(second);
    await endSession(db, owner.sessionId);
    expect((await failure(claim(owner))).message).toMatch(/not signed in/);
    expect(await rpc(db, owner, "session_status", { p_device_key: owner.deviceKey })).toEqual({ status: "replaced" });
    expect(await failure(rpc(db, owner, "ws_all", { p_store: "clients" }))).not.toBeNull();
  });

  it("rejects an extra parameter outright (SQLSTATE 42883) instead of applying or ignoring it", async () => {
    const user = await signedIn();
    const victim = await signedIn();
    for (const [fn, args] of [
      ["claim_session", { p_device_key: user.deviceKey, p_label: "x", p_status: "active", p_role: "admin" }],
      ["session_status", { p_device_key: user.deviceKey, p_user: victim.id }],
      ["my_devices", { p_user: victim.id }],
      ["revoke_my_device", { p_device: victim.id, p_user: victim.id }],
      ["update_my_profile", { p_full_name: "x", p_phone: "1", p_role: "admin", p_user: victim.id }],
      ["log_event", { p_action: "signed_out", p_user: victim.id }],
      ["ws_all", { p_store: "clients", p_owner: victim.id }],
    ]) {
      expect((await failure(rpc(db, user, fn, args)))?.code, fn).toBe("42883");
    }
    const { rows } = await db.query("select role, status, full_name from public.profiles where id = $1", [user.id]);
    expect(rows[0]).toMatchObject({ role: "subscriber", status: "active" });
  });

  it("unknown keys in an admin's patch change nothing about the account", async () => {
    const admin = await signedIn();
    await makeAdmin(admin.id);
    const target = await signedIn();
    const before = (await db.query("select id, email, role, status, device_limit, created_at from public.profiles where id = $1", [target.id])).rows[0];
    await rpc(db, { ...admin, aal: "aal2" }, "admin_update_account", { p_user: target.id, p_patch: { plan: "studio", id: admin.id, email: "evil@example.com", is_admin: true, created_at: "2000-01-01", owner: admin.id } });
    const after = (await db.query("select id, email, role, status, device_limit, created_at, plan from public.profiles where id = $1", [target.id])).rows[0];
    expect(after).toMatchObject({ id: before.id, email: before.email, role: "subscriber", status: "active", device_limit: before.device_limit, plan: "studio" });
    expect(after.created_at).toEqual(before.created_at);
  });

  // FIXED after the 2026-10-07 audit; was (LOW): migration :582. private.audit(..., p_patch - 'fullName' - 'phone') copies every OTHER key of the
  // patch into the audit entry, known or not, whatever its size: the log can be stuffed (an admin session is
  // needed, so a stolen one can bury its tracks in noise). Fix: log only the keys the function applies:
  //   perform private.audit(p_user, 'account_updated', jsonb_strip_nulls(jsonb_build_object(
  //     'plan', p_patch -> 'plan', 'deviceLimit', p_patch -> 'deviceLimit', 'role', p_patch -> 'role', 'status', p_patch -> 'status')));
  it("the audit entry of an admin patch holds only the changes the function applies", async () => {
    const admin = await signedIn();
    await makeAdmin(admin.id);
    const target = await signedIn();
    await rpc(db, { ...admin, aal: "aal2" }, "admin_update_account", { p_user: target.id, p_patch: { plan: "basic", noise: "x".repeat(3000), nested: { a: [1, 2, 3] } } });
    const { rows } = await db.query("select detail from public.audit_log where user_id = $1 and action = 'account_updated'", [target.id]);
    expect(Object.keys(rows[0].detail).sort()).toEqual(["plan"]);
  });

  // FIXED after the 2026-10-07 audit; was (LOW): migration :225 and :229 (and the audit label at :214, :220). A device label is stored as the
  // browser sent it, while names go through private.clean_text (the file's own reason: no right-to-left tricks).
  // The label is shown in the admin's device list and in the audit log, so a subscriber can reorder or hide text
  // there. React escapes it (no script), so this is spoofing, not injection.
  // Fix: left(private.clean_text(p_label, 200), 200) in both statements and in the two audit details.
  it("a device label carries no direction or invisible characters", async () => {
    const id = await createUser(db, { email: `label${++n}@example.com` });
    const user = await asUser(id);
    await claim(user, `Chrome${String.fromCodePoint(0x202e)}${String.fromCodePoint(0x200b)} Windows`);
    const devices = await rpc(db, user, "my_devices");
    expect(devices.some((d) => hasHidden(d.label))).toBe(false);
  });

  it("PINNED: ending your own sessions ends the session the next call needs (why the function must write its audit entry first)", async () => {
    const admin = await signedIn();
    await makeAdmin(admin.id);
    const verified = { ...admin, aal: "aal2" };
    expect(await rpc(db, verified, "admin_end_sessions", { p_user: admin.id })).toEqual({ status: "ok" });
    expect((await failure(rpc(db, verified, "admin_log", { p_user: admin.id, p_action: "password_set" }))).message).toMatch(/admins only/);
    const { rows } = await db.query("select action from public.audit_log where user_id = $1 and action in ('password_set', 'sessions_ended')", [admin.id]);
    expect(rows.map((r) => r.action)).toEqual(["sessions_ended"]);
  });

  it("PINNED (design): a copied device key is the same device, so the device limit does not bind copies; the one-session rule still does", async () => {
    // The key is a random string the browser invents and keeps in localStorage: not a credential, and not bound to
    // hardware. Copying it to another computer, or inventing keys, only moves the account between those places one
    // at a time; each hand-over is logged as a replaced session. It limits accidents, not a determined sharer.
    const id = await createUser(db, { email: `share${++n}@example.com` });
    const shared = "0123456789abcdef0123456789abcdef";
    const a = await asUser(id, "aal1", shared);
    expect((await claim(a, "Computer A")).status).toBe("ok");
    const b = await asUser(id, "aal1", shared); // another computer signs in later, with the copied key
    expect((await claim(b, "Computer B")).status).toBe("ok");
    expect((await db.query("select count(*)::int as n from public.devices where user_id = $1", [id])).rows[0].n).toBe(1);
    expect(await rpc(db, a, "session_status", { p_device_key: shared })).toEqual({ status: "replaced" });
    const handovers = (await db.query("select detail from public.audit_log where user_id = $1 and action = 'session_claimed'", [id])).rows;
    expect(handovers.map((r) => r.detail.replaced)).toEqual([false, true]);
  });

  it("PINNED: revoking a device does not revoke the person: the same password on a fresh key is a new device while a place is free", async () => {
    const owner = await signedIn(); // device 1
    const phone = await asUser(owner.id);
    expect((await claim(phone, "Phone")).status).toBe("ok"); // device 2, now the one in use
    const first = (await rpc(db, phone, "my_devices")).find((d) => !d.current);
    await rpc(db, phone, "revoke_my_device", { p_device: first.id }); // device 1 is revoked
    expect((await claim(await asUser(owner.id, "aal1", owner.deviceKey))).status).toBe("device_revoked");
    expect((await claim(await asUser(owner.id, "aal1", key()))).status).toBe("ok");
  });
});
